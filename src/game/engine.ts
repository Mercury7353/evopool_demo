// ============================================================
// Game Engine — battle sequencer + effects system
// ============================================================
import {
  GAME_W, GAME_H, TILE, TC, P,
  renderTilemap,
  drawWarrior, drawMonster, drawNameTag, drawDreamBubble, drawSparkles,
  drawSlashTrail, drawMagicBolt, drawImpactFlash, drawDamageNum, drawParticleBurst,
  type DomainKey, type WarriorDrawOpts,
} from './renderer';
import type { SimulationState, Warrior } from '../types';

// ── Village map (32×20) ──────────────────────────────────────
const CM: Record<string,number> = {
  '.':TC.GRASS,'p':TC.PATH,'T':TC.TREE,'w':TC.WALL,'r':TC.ROOF,'d':TC.DOOR,
  's':TC.WINDOW,'v':TC.WELL,'f':TC.FLOWER,'b':TC.BUSH,'G':TC.GATE,
  'a':TC.WATER,'c':TC.COBBLE,'k':TC.CROP,'x':TC.FENCE,
};
const MS = [
  'T.T..T..f..f.pp.f..T..f..T.T..T',
  '.f.T.rrrrr..pp..rrrrr.T.....aa.',
  '....Twswsw..pp..wswsw.....f.aa.',
  '.f...wdddw..pp..wdddw......aa..',
  '.....b...bf.pp.f.b.b.b.........',
  'pppppppppppppppppppppppppppp.f..',
  '.pp..f.pp..cccccc..pp.f..pp...T.',
  '.pp....pp..ccvvcc..pp....pp.....',
  '.pp....pp..ccvvcc..pp....pp.....',
  '.pp..f.pp..cccccc..pp.f..pp.....',
  'pppppppppppppppppppppppppppp.....',
  '.f...b.b..f.pp.f..b.b.f..T.....',
  '..rrrrr.....pp.....rrrrr..f.....',
  '..wswsw.....pp.....wswsw........',
  '..wdddw.....pp.....wdddw........',
  '.f....f..f..pp..f....f..x.kkkk.',
  '..kkkk......pp......kk..x.kkkk.',
  '..kkkk..f...pp..f...kk..x.kkkk.',
  '.........G..pppp..G..............',
  'T.T..T...G........G....T..T..T.T',
];
const MAP = MS.map(s=>[...s.padEnd(32,'.')].slice(0,32).map(ch=>CM[ch]??TC.GRASS));

// ── Locations ────────────────────────────────────────────────
const LOC = {
  tavern:  {x:7*TILE+8, y:4*TILE},
  barracks:{x:17*TILE+8,y:4*TILE},
  well:    {x:13*TILE,  y:8*TILE},
  gate:    {x:14*TILE,  y:19*TILE},
  battle:  {x:14*TILE,  y:17*TILE+8},
};
const BPOS = [
  {x:LOC.battle.x-24, y:LOC.battle.y-4},
  {x:LOC.battle.x,    y:LOC.battle.y+8},
  {x:LOC.battle.x+24, y:LOC.battle.y-4},
];
const MPOS = {x:LOC.gate.x, y:LOC.gate.y+4};
const CODREAM = [
  {x:LOC.tavern.x-14, y:LOC.tavern.y+14},
  {x:LOC.tavern.x,    y:LOC.tavern.y+20},
  {x:LOC.tavern.x+14, y:LOC.tavern.y+14},
];
const HOMES = [
  {x:40,y:100},{x:64,y:120},{x:32,y:160},{x:130,y:100},{x:150,y:140},
  {x:110,y:168},{x:220,y:100},{x:260,y:120},{x:300,y:168},{x:180,y:100},
  {x:180,y:168},{x:56,y:180},{x:300,y:180},{x:220,y:168},{x:240,y:100},
  {x:100,y:140},{x:320,y:100},{x:160,y:140},{x:200,y:140},{x:280,y:140},
];

// ── Entity ───────────────────────────────────────────────────
interface Ent {
  id:string; type:'warrior'|'monster';
  x:number; y:number; tx:number; ty:number;
  homeX:number; homeY:number; speed:number;
  state:'idle'|'walking'|'selected'|'fighting'|'celebrating'|'dreaming'|'dying'|'dead'|'attacking';
  domain:DomainKey; walkFrame:number; walkTimer:number;
  idleTimer:number; fightTimer:number; effectTimer:number;
  name:string; level:number; dreamText?:string;
  // battle: saved position to return to
  battleHomeX?:number; battleHomeY?:number;
}

// ── Active visual effect ─────────────────────────────────────
interface FX {
  type: 'slash'|'magic'|'flash'|'damage'|'particles'|'shake';
  x:number; y:number; tx:number; ty:number;
  timer:number; dur:number;
  value:number; color:string;
}

// ── Battle step ──────────────────────────────────────────────
interface BStep {
  time: number;
  action: 'dash'|'attack_fx'|'retreat'|'monster_hit'|'monster_retreat';
  entityId: string;
  damage?: number;
  fxType?: 'slash'|'magic'|'arrow';
}

// ── Engine ───────────────────────────────────────────────────
export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement|null = null;
  entities = new Map<string, Ent>();
  monster: Ent|null = null;
  sim: SimulationState|null = null;
  prevPhase=''; prevTask=-1;
  rafId=0; lastTime=0; gFrame=0;

  // Battle sequencer
  battleSteps: BStep[] = [];
  battleTimer = 0;
  battleStepIdx = 0;
  battleActive = false;

  // Effects pool
  effects: FX[] = [];
  shakeX = 0; shakeY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.bgCanvas = renderTilemap(MAP);
  }

  getEntityAt(gx:number,gy:number):Ent|null {
    for(const e of this.entities.values()){if(e.state==='dead')continue;if(Math.abs(gx-e.x)<10&&Math.abs(gy-(e.y-11))<12)return e;}
    if(this.monster&&this.monster.state!=='dead'&&Math.abs(gx-this.monster.x)<10&&Math.abs(gy-(this.monster.y-7))<10)return this.monster;
    return null;
  }

  // ── Sync ───────────────────────────────────────────────────
  syncState(state: SimulationState) {
    const changed = state.phase!==this.prevPhase || state.taskIndex!==this.prevTask;
    this.sim = state;
    if(!changed) return;
    this.prevPhase = state.phase;
    this.prevTask = state.taskIndex;

    const alive = state.warriors.filter(w=>w.alive);

    // Ensure entities
    for(let i=0;i<alive.length;i++){
      const w=alive[i];
      if(!this.entities.has(w.id)){const h=HOMES[i%HOMES.length];this.entities.set(w.id,mkEnt(w,h));}
      else{const e=this.entities.get(w.id)!;e.domain=pDom(w);e.name=w.name;e.level=w.level;}
    }
    for(const[id,e]of this.entities){if(e.type!=='warrior')continue;const w=state.warriors.find(w2=>w2.id===id);if(!w||!w.alive){e.state='dying';e.effectTimer=0;}}

    switch(state.phase){
      case 'idle':
        this.monster=null; this.battleActive=false; this.effects=[];
        for(const e of this.entities.values()){
          if(e.state!=='dying'&&e.state!=='dead'){e.state='walking';e.tx=e.homeX+(Math.random()-0.5)*28;e.ty=e.homeY+(Math.random()-0.5)*18;e.dreamText=undefined;}
        }
        break;

      case 'demon_spawn':
        if(state.currentDemon){
          const d=state.currentDemon;
          this.monster={id:d.id,type:'monster',x:MPOS.x,y:GAME_H+24,tx:MPOS.x,ty:MPOS.y,homeX:MPOS.x,homeY:MPOS.y,speed:45,state:'walking',domain:d.domain as DomainKey,walkFrame:0,walkTimer:0,idleTimer:0,fightTimer:0,effectTimer:0,name:d.name,level:d.difficulty};
        }
        break;

      case 'team_select':
        for(let i=0;i<state.selectedTeam.length;i++){
          const e=this.entities.get(state.selectedTeam[i]);
          if(e){e.state='selected';e.tx=BPOS[i].x;e.ty=BPOS[i].y;e.battleHomeX=BPOS[i].x;e.battleHomeY=BPOS[i].y;}
        }
        break;

      case 'battle':
        this.startBattle(state);
        break;

      case 'battle_win':
        this.battleActive=false;
        for(const id of state.selectedTeam){const e=this.entities.get(id);if(e){e.state='celebrating';e.effectTimer=0;}}
        if(this.monster){this.monster.state='dying';this.monster.effectTimer=0;}
        // Big explosion effect
        if(this.monster) this.effects.push({type:'flash',x:this.monster.x,y:this.monster.y-7,tx:0,ty:0,timer:0,dur:0.5,value:0,color:P.gold});
        this.effects.push({type:'particles',x:MPOS.x,y:MPOS.y-7,tx:0,ty:0,timer:0,dur:0.8,value:0,color:P.gold});
        break;

      case 'battle_lose':
        this.battleActive=false;
        for(const id of state.selectedTeam){const e=this.entities.get(id);if(e){e.state='walking';e.tx=e.homeX;e.ty=e.homeY;}}
        // Red flash
        this.effects.push({type:'shake',x:0,y:0,tx:0,ty:0,timer:0,dur:0.3,value:4,color:''});
        break;

      case 'codream':
        for(let i=0;i<state.selectedTeam.length;i++){
          const e=this.entities.get(state.selectedTeam[i]);
          if(e){e.state='dreaming';e.tx=CODREAM[i%3].x;e.ty=CODREAM[i%3].y;
            const ins=state.codreamInsights.find(ci=>ci.warriorId===e.id);
            e.dreamText=ins?.insight.slice(0,18)??'💭';
          }
        }
        this.monster=null;
        break;

      case 'stats_update':
        for(const id of state.selectedTeam){const e=this.entities.get(id);if(e)e.effectTimer=0;}
        break;

      case 'lifecycle':{
        const evt=state.lifecycleEvent;
        if(evt?.newWarriorId){
          const nw=alive.find(w=>w.id===evt.newWarriorId);
          if(nw&&!this.entities.has(nw.id)){
            const idx=alive.findIndex(w=>w.id===nw.id);
            const h=HOMES[idx>=0?idx%HOMES.length:0];
            const e=mkEnt(nw,h);e.x=LOC.well.x;e.y=LOC.well.y;e.tx=h.x;e.ty=h.y;e.state='walking';
            this.entities.set(nw.id,e);
            this.effects.push({type:'flash',x:LOC.well.x,y:LOC.well.y,tx:0,ty:0,timer:0,dur:0.6,value:0,color:P.green});
          }
        }
        break;
      }
    }
  }

  // ── Start battle sequence ──────────────────────────────────
  startBattle(state: SimulationState) {
    this.battleActive = true;
    this.battleTimer = 0;
    this.battleStepIdx = 0;
    this.battleSteps = [];
    this.effects = [];

    const team = state.selectedTeam;
    const scores = state.battleResult?.teamScores ?? {};
    let t = 0.3;

    for (let i = 0; i < team.length; i++) {
      const wId = team[i];
      const score = scores[wId] ?? 0.5;
      const dmg = Math.round(score * 25 + 5);
      const domain = this.entities.get(wId)?.domain ?? 'math';
      const fxType = domain === 'math' ? 'magic' : domain === 'code' ? 'slash' : 'slash';

      // Dash toward monster
      this.battleSteps.push({time:t, action:'dash', entityId:wId});
      t += 0.2;
      // Attack effect
      this.battleSteps.push({time:t, action:'attack_fx', entityId:wId, damage:dmg, fxType});
      t += 0.25;
      // Retreat
      this.battleSteps.push({time:t, action:'retreat', entityId:wId});
      t += 0.2;
    }

    // Monster counter-attack
    this.battleSteps.push({time:t, action:'monster_hit', entityId:this.monster?.id??''});
    t += 0.25;
    this.battleSteps.push({time:t, action:'monster_retreat', entityId:this.monster?.id??''});

    // Set all to fighting initially
    for (const id of team) {
      const e = this.entities.get(id);
      if (e) e.state = 'fighting';
    }
    if (this.monster) this.monster.state = 'fighting';
  }

  // ── Update ─────────────────────────────────────────────────
  update(dt: number) {
    this.gFrame++;
    const move = (e: Ent) => {
      const dx=e.tx-e.x,dy=e.ty-e.y,dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>1&&e.state!=='dead'){
        const spd = e.state==='attacking' ? e.speed*3 : e.speed;
        const s=Math.min(spd*dt,dist);e.x+=(dx/dist)*s;e.y+=(dy/dist)*s;
      } else if(e.state==='walking'||e.state==='selected'||e.state==='attacking'){
        e.x=e.tx;e.y=e.ty;
        if(e.state==='walking'&&e.type==='warrior')e.state='idle';
        if(e.state==='attacking')e.state='fighting';
      }
      if(dist>1){e.walkTimer+=dt;if(e.walkTimer>0.2){e.walkFrame^=1;e.walkTimer=0;}}else e.walkFrame=0;
      if(e.state==='idle'&&e.type==='warrior'){e.idleTimer-=dt;if(e.idleTimer<=0){e.tx=e.homeX+(Math.random()-0.5)*32;e.ty=e.homeY+(Math.random()-0.5)*20;e.state='walking';e.idleTimer=2.5+Math.random()*4;}}
      if(e.state==='fighting')e.fightTimer+=dt;
      e.effectTimer+=dt;
      if(e.state==='dying'&&e.effectTimer>1.5)e.state='dead';
    };

    for(const e of this.entities.values()) move(e);
    if(this.monster) move(this.monster);

    // Battle sequencer
    if(this.battleActive) {
      this.battleTimer += dt;
      while(this.battleStepIdx < this.battleSteps.length && this.battleSteps[this.battleStepIdx].time <= this.battleTimer) {
        this.executeBattleStep(this.battleSteps[this.battleStepIdx]);
        this.battleStepIdx++;
      }
    }

    // Update effects
    for(const fx of this.effects) {
      fx.timer += dt;
      if(fx.type==='shake') {
        if(fx.timer < fx.dur) {
          this.shakeX = (Math.random()-0.5)*fx.value*2*(1-fx.timer/fx.dur);
          this.shakeY = (Math.random()-0.5)*fx.value*(1-fx.timer/fx.dur);
        } else { this.shakeX=0; this.shakeY=0; }
      }
    }
    this.effects = this.effects.filter(fx => fx.timer < fx.dur);

    // Clean dead
    for(const[id,e]of this.entities){if(e.state==='dead')this.entities.delete(id);}
  }

  executeBattleStep(step: BStep) {
    const e = this.entities.get(step.entityId) ?? this.monster;
    if (!e) return;

    switch(step.action) {
      case 'dash':
        // Warrior dashes toward monster
        e.state = 'attacking';
        e.battleHomeX = e.battleHomeX ?? e.x;
        e.battleHomeY = e.battleHomeY ?? e.y;
        if (this.monster) {
          e.tx = this.monster.x - 14;
          e.ty = this.monster.y;
        }
        break;

      case 'attack_fx': {
        if (!this.monster) break;
        const mx = this.monster.x, my = this.monster.y - 7;
        // Slash/magic trail from warrior to monster
        if (step.fxType === 'magic') {
          this.effects.push({type:'magic', x:e.x, y:e.y-12, tx:mx, ty:my, timer:0, dur:0.3, value:0, color:D_CLR[e.domain][2]});
        } else {
          this.effects.push({type:'slash', x:e.x+6, y:e.y-14, tx:mx, ty:my, timer:0, dur:0.25, value:0, color:''});
        }
        // Impact flash on monster
        this.effects.push({type:'flash', x:mx, y:my, tx:0, ty:0, timer:0, dur:0.3, value:0, color:''});
        // Damage number
        this.effects.push({type:'damage', x:mx, y:my-8, tx:0, ty:0, timer:0, dur:0.8, value:step.damage??0, color:P.white});
        // Particle burst
        this.effects.push({type:'particles', x:mx, y:my, tx:0, ty:0, timer:0, dur:0.4, value:0, color:D_CLR[e.domain][1]});
        // Screen shake
        this.effects.push({type:'shake', x:0, y:0, tx:0, ty:0, timer:0, dur:0.15, value:3, color:''});
        break;
      }

      case 'retreat':
        e.state = 'attacking'; // will become fighting when arrives
        e.tx = e.battleHomeX ?? e.homeX;
        e.ty = e.battleHomeY ?? e.homeY;
        break;

      case 'monster_hit':
        if (!this.monster) break;
        this.monster.tx = this.monster.homeX - 20;
        // Red flash on all warriors
        for (const id of (this.sim?.selectedTeam ?? [])) {
          const w = this.entities.get(id);
          if (w) {
            this.effects.push({type:'flash', x:w.x, y:w.y-8, tx:0, ty:0, timer:0, dur:0.2, value:0, color:P.red});
            this.effects.push({type:'damage', x:w.x, y:w.y-16, tx:0, ty:0, timer:0, dur:0.6, value:Math.round(Math.random()*10+5), color:'#f87171'});
          }
        }
        this.effects.push({type:'shake', x:0, y:0, tx:0, ty:0, timer:0, dur:0.2, value:4, color:''});
        break;

      case 'monster_retreat':
        if (this.monster) { this.monster.tx = this.monster.homeX; this.monster.ty = this.monster.homeY; }
        break;
    }
  }

  // ── Render ─────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.shakeX), Math.round(this.shakeY));

    if(this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0);

    // Depth sort
    const draw: Ent[] = [...this.entities.values()].filter(e=>e.state!=='dead');
    if(this.monster&&this.monster.state!=='dead') draw.push(this.monster);
    draw.sort((a,b)=>a.y-b.y);

    for(const e of draw) {
      const rx=Math.round(e.x), ry=Math.round(e.y);
      if(e.type==='warrior') {
        const ox = e.state==='fighting'? Math.round(Math.sin(e.fightTimer*15)*1.5) : 0;
        const oy = e.state==='celebrating'? -Math.abs(Math.round(Math.sin(e.effectTimer*8)*5)) : 0;

        drawWarrior(ctx, rx+ox, ry+oy, {
          domain:e.domain, frame:e.walkFrame,
          selected:e.state==='selected',
          fighting:e.state==='fighting',
          dreaming:e.state==='dreaming',
          celebrating:e.state==='celebrating',
          dying:e.state==='dying',
        });

        if(['selected','fighting','dreaming','celebrating','attacking'].includes(e.state))
          drawNameTag(ctx, rx, ry-26, `${e.name} L${e.level}`);
        if(e.state==='dreaming'&&e.dreamText)
          drawDreamBubble(ctx, rx, ry-16, e.dreamText);
        if(this.sim?.phase==='stats_update'&&this.sim.selectedTeam.includes(e.id))
          drawSparkles(ctx, rx, ry, this.gFrame);

      } else {
        const demon = this.sim?.currentDemon;
        drawMonster(ctx, rx, ry, {
          domain:e.domain, frame:this.gFrame,
          dying:e.state==='dying', hp:demon?.hp, maxHp:demon?.maxHp,
        });
        if(e.state!=='dying') drawNameTag(ctx, rx, ry-22, e.name);
      }
    }

    // Render effects
    for(const fx of this.effects) {
      const prog = Math.min(1, fx.timer / fx.dur);
      switch(fx.type) {
        case 'slash':
          drawSlashTrail(ctx, fx.x, fx.y, fx.tx, fx.ty, prog);
          break;
        case 'magic': {
          const mx = fx.x + (fx.tx-fx.x)*prog;
          const my = fx.y + (fx.ty-fx.y)*prog;
          drawMagicBolt(ctx, mx, my, prog, fx.color);
          break;
        }
        case 'flash':
          drawImpactFlash(ctx, fx.x, fx.y, prog);
          break;
        case 'damage':
          drawDamageNum(ctx, fx.x, fx.y, fx.value, prog, fx.color);
          break;
        case 'particles':
          drawParticleBurst(ctx, fx.x, fx.y, prog, fx.color);
          break;
      }
    }

    // Phase tints
    const ph = this.sim?.phase;
    if(ph==='battle_win'){ctx.fillStyle='#fbbf2406';ctx.fillRect(0,0,GAME_W,GAME_H);}
    if(ph==='battle_lose'){ctx.fillStyle='#ef44440a';ctx.fillRect(0,0,GAME_W,GAME_H);}
    if(ph==='codream'){ctx.fillStyle='#6b21a80a';ctx.fillRect(0,0,GAME_W,GAME_H);}

    ctx.restore();
  }

  // ── Loop ───────────────────────────────────────────────────
  private tick = (time: number) => {
    const dt=Math.min((time-this.lastTime)/1000,0.1);
    this.lastTime=time;this.update(dt);this.render();
    this.rafId=requestAnimationFrame(this.tick);
  };
  start(){this.lastTime=performance.now();this.rafId=requestAnimationFrame(this.tick);}
  stop(){cancelAnimationFrame(this.rafId);}
}

// ── Helpers ──────────────────────────────────────────────────
function pDom(w:Warrior):DomainKey{
  const ds:DomainKey[]=['math','code','reasoning'];
  return ds.reduce((b,d)=>w.skills[d]>w.skills[b]?d:b,ds[0]);
}
function mkEnt(w:Warrior,h:{x:number,y:number}):Ent{
  return{id:w.id,type:'warrior',x:h.x+Math.random()*10-5,y:h.y+Math.random()*10-5,tx:h.x,ty:h.y,homeX:h.x,homeY:h.y,speed:28+Math.random()*15,state:'idle',domain:pDom(w),walkFrame:0,walkTimer:0,idleTimer:Math.random()*3,fightTimer:0,effectTimer:0,name:w.name,level:w.level};
}

// Domain colors for battle effects (imported from renderer)
const D_CLR:Record<DomainKey,[string,string,string]>={
  math:['#1d4ed8','#3b82f6','#93c5fd'],
  code:['#15803d','#22c55e','#86efac'],
  reasoning:['#b45309','#f59e0b','#fde68a'],
};
