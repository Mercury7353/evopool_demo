// ============================================================
// Game Engine — village scene, entities, animation, state sync
// ============================================================
import {
  GAME_W, GAME_H, TILE, TC, PAL,
  renderTilemap,
  drawWarrior, drawMonster, drawNameTag, drawDreamBubble,
  drawSlash, drawSparkles,
  type DomainKey, type WarriorDrawOpts,
} from './renderer';
import type { SimulationState, Warrior } from '../types';

// ── Village map (32 × 20)  ──────────────────────────────────
// Parsed from string for readability
const CHAR_MAP: Record<string, number> = {
  '.': TC.GRASS, 'p': TC.PATH,   'T': TC.TREE,   'w': TC.WALL,
  'r': TC.ROOF,  'd': TC.DOOR,   's': TC.WINDOW, 'v': TC.WELL,
  'f': TC.FLOWER,'b': TC.BUSH,   'G': TC.GATE,   'a': TC.WATER,
  'c': TC.COBBLE,'k': TC.CROP,   'x': TC.FENCE,
};

const MAP_STR: string[] = [
  'T.T..T..f..f.pp.f..T..f..T.T..T',  //  0  north edge
  '.f.T.rrrrr..pp..rrrrr.T.....aa.',  //  1  tavern & barracks roofs
  '....Twswsw..pp..wswsw.....f.aa.',  //  2  walls
  '.f...wdddw..pp..wdddw......aa..',  //  3  doors
  '.....b...bf.pp.f.b.b.b.........',  //  4  decorations
  'pppppppppppppppppppppppppppp.f..',  //  5  main E-W road
  '.pp..f.pp..cccccc..pp.f..pp...T.',  //  6  plaza approach
  '.pp....pp..ccvvcc..pp....pp.....',  //  7  fountain
  '.pp....pp..ccvvcc..pp....pp.....',  //  8  fountain
  '.pp..f.pp..cccccc..pp.f..pp.....',  //  9  plaza south
  'pppppppppppppppppppppppppppp.....',  // 10  main road S
  '.f...b.b..f.pp.f..b.b.f..T.....',  // 11  decorations
  '..rrrrr.....pp.....rrrrr..f.....',  // 12  houses
  '..wswsw.....pp.....wswsw........',  // 13  house walls
  '..wdddw.....pp.....wdddw........',  // 14  house doors
  '.f....f..f..pp..f....f..x.kkkk.',  // 15  farms begin
  '..kkkk......pp......kk..x.kkkk.',  // 16  crops
  '..kkkk..f...pp..f...kk..x.kkkk.',  // 17  crops
  '.........G..pppp..G..............',  // 18  gate
  'T.T..T...G........G....T..T..T.T',  // 19  outside
];

const MAP: number[][] = MAP_STR.map(row =>
  [...row.padEnd(32, '.')].slice(0, 32).map(ch => CHAR_MAP[ch] ?? TC.GRASS)
);

// ── Locations (pixel coords, center of tile) ─────────────────
const LOC = {
  tavernDoor:   { x:  7 * TILE + 8, y:  4 * TILE },
  barracksDoor: { x: 17 * TILE + 8, y:  4 * TILE },
  well:         { x: 13 * TILE,     y:  8 * TILE },
  gate:         { x: 14 * TILE,     y: 19 * TILE },
  battleField:  { x: 14 * TILE,     y: 18 * TILE },
  houseL:       { x:  4 * TILE + 8, y: 15 * TILE },
  houseR:       { x: 19 * TILE + 8, y: 15 * TILE },
};

const BATTLE_POS = [
  { x: LOC.battleField.x - 20, y: LOC.battleField.y },
  { x: LOC.battleField.x,      y: LOC.battleField.y + 6 },
  { x: LOC.battleField.x + 20, y: LOC.battleField.y },
];
const MONSTER_POS = { x: LOC.gate.x, y: LOC.gate.y + 4 };

const CODREAM_POS = [
  { x: LOC.tavernDoor.x - 14, y: LOC.tavernDoor.y + 14 },
  { x: LOC.tavernDoor.x,      y: LOC.tavernDoor.y + 20 },
  { x: LOC.tavernDoor.x + 14, y: LOC.tavernDoor.y + 14 },
];

// Home positions spread across paths
const HOMES = [
  { x:  40, y: 100 }, { x:  64, y: 120 }, { x:  32, y: 160 },
  { x: 130, y: 100 }, { x: 150, y: 140 }, { x: 110, y: 168 },
  { x: 220, y: 100 }, { x: 260, y: 120 }, { x: 300, y: 168 },
  { x: 180, y: 100 }, { x: 180, y: 168 }, { x:  56, y: 180 },
  { x: 300, y: 180 }, { x: 220, y: 168 }, { x: 240, y: 100 },
  { x: 100, y: 140 }, { x: 320, y: 100 }, { x: 160, y: 140 },
  { x: 200, y: 140 }, { x: 280, y: 140 },
];

// ── Entity ───────────────────────────────────────────────────
interface Entity {
  id: string;
  type: 'warrior' | 'monster';
  x: number; y: number;
  tx: number; ty: number;
  homeX: number; homeY: number;
  speed: number;
  state: 'idle'|'walking'|'selected'|'fighting'|'celebrating'|'dreaming'|'dying'|'dead';
  domain: DomainKey;
  walkFrame: number;
  walkTimer: number;
  idleTimer: number;
  fightTimer: number;
  effectTimer: number;
  name: string;
  level: number;
  dreamText?: string;
}

// ── Engine ───────────────────────────────────────────────────
export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement | null = null;
  entities = new Map<string, Entity>();
  monsterEntity: Entity | null = null;
  simState: SimulationState | null = null;
  prevPhase = '';
  prevTask = -1;
  rafId = 0;
  lastTime = 0;
  globalFrame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.bgCanvas = renderTilemap(MAP);
  }

  getEntityAt(gx: number, gy: number): Entity | null {
    for (const e of this.entities.values()) {
      if (e.state === 'dead') continue;
      if (Math.abs(gx - e.x) < 8 && Math.abs(gy - (e.y - 8)) < 10) return e;
    }
    if (this.monsterEntity && this.monsterEntity.state !== 'dead') {
      const m = this.monsterEntity;
      if (Math.abs(gx - m.x) < 10 && Math.abs(gy - (m.y - 7)) < 10) return m;
    }
    return null;
  }

  // ── Sync simulation → entities ─────────────────────────────
  syncState(state: SimulationState) {
    const changed = state.phase !== this.prevPhase || state.taskIndex !== this.prevTask;
    this.simState = state;
    if (!changed) return;
    this.prevPhase = state.phase;
    this.prevTask = state.taskIndex;

    const alive = state.warriors.filter(w => w.alive);

    // Create / update warrior entities
    for (let i = 0; i < alive.length; i++) {
      const w = alive[i];
      if (!this.entities.has(w.id)) {
        const h = HOMES[i % HOMES.length];
        this.entities.set(w.id, mkEntity(w, h));
      } else {
        const e = this.entities.get(w.id)!;
        e.domain = primaryDomain(w);
        e.name = w.name;
        e.level = w.level;
      }
    }

    // Mark dead
    for (const [id, e] of this.entities) {
      if (e.type !== 'warrior') continue;
      const w = state.warriors.find(w => w.id === id);
      if (!w || !w.alive) { e.state = 'dying'; e.effectTimer = 0; }
    }

    // Phase transitions
    switch (state.phase) {
      case 'idle':
        this.monsterEntity = null;
        for (const e of this.entities.values()) {
          if (e.state !== 'dying' && e.state !== 'dead') {
            e.state = 'walking';
            e.tx = e.homeX + (Math.random() - 0.5) * 28;
            e.ty = e.homeY + (Math.random() - 0.5) * 18;
            e.dreamText = undefined;
          }
        }
        break;

      case 'demon_spawn':
        if (state.currentDemon) {
          const d = state.currentDemon;
          this.monsterEntity = {
            id: d.id, type: 'monster',
            x: MONSTER_POS.x, y: GAME_H + 24,
            tx: MONSTER_POS.x, ty: MONSTER_POS.y,
            homeX: MONSTER_POS.x, homeY: MONSTER_POS.y,
            speed: 45, state: 'walking',
            domain: d.domain as DomainKey,
            walkFrame: 0, walkTimer: 0,
            idleTimer: 0, fightTimer: 0, effectTimer: 0,
            name: d.name, level: d.difficulty,
          };
        }
        break;

      case 'team_select':
        for (let i = 0; i < state.selectedTeam.length; i++) {
          const e = this.entities.get(state.selectedTeam[i]);
          if (e) {
            e.state = 'selected';
            e.tx = BATTLE_POS[i].x;
            e.ty = BATTLE_POS[i].y;
          }
        }
        break;

      case 'battle':
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'fighting'; e.fightTimer = 0; }
        }
        if (this.monsterEntity) this.monsterEntity.state = 'fighting';
        break;

      case 'battle_win':
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'celebrating'; e.effectTimer = 0; }
        }
        if (this.monsterEntity) { this.monsterEntity.state = 'dying'; this.monsterEntity.effectTimer = 0; }
        break;

      case 'battle_lose':
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'walking'; e.tx = e.homeX; e.ty = e.homeY; }
        }
        break;

      case 'codream':
        for (let i = 0; i < state.selectedTeam.length; i++) {
          const e = this.entities.get(state.selectedTeam[i]);
          if (e) {
            e.state = 'dreaming';
            e.tx = CODREAM_POS[i % 3].x;
            e.ty = CODREAM_POS[i % 3].y;
            const ins = state.codreamInsights.find(ci => ci.warriorId === e.id);
            e.dreamText = ins?.insight.slice(0, 18) ?? '💭';
          }
        }
        this.monsterEntity = null;
        break;

      case 'stats_update':
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) e.effectTimer = 0;
        }
        break;

      case 'lifecycle': {
        const evt = state.lifecycleEvent;
        if (evt?.newWarriorId) {
          const nw = alive.find(w => w.id === evt.newWarriorId);
          if (nw && !this.entities.has(nw.id)) {
            const idx = alive.findIndex(w => w.id === nw.id);
            const h = HOMES[idx >= 0 ? idx % HOMES.length : 0];
            const e = mkEntity(nw, h);
            e.x = LOC.well.x; e.y = LOC.well.y;
            e.tx = h.x; e.ty = h.y;
            e.state = 'walking';
            this.entities.set(nw.id, e);
          }
        }
        break;
      }
    }
  }

  // ── Per-frame update ───────────────────────────────────────
  update(dt: number) {
    this.globalFrame++;
    const step = (e: Entity) => {
      const dx = e.tx - e.x, dy = e.ty - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1 && e.state !== 'fighting' && e.state !== 'dead') {
        const s = Math.min(e.speed * dt, dist);
        e.x += (dx / dist) * s;
        e.y += (dy / dist) * s;
      } else if (e.state === 'walking' || e.state === 'selected') {
        e.x = e.tx; e.y = e.ty;
        if (e.state === 'walking' && e.type === 'warrior') e.state = 'idle';
      }

      // Walk anim
      if (dist > 1) { e.walkTimer += dt; if (e.walkTimer > 0.2) { e.walkFrame ^= 1; e.walkTimer = 0; } }
      else e.walkFrame = 0;

      // Idle wander
      if (e.state === 'idle' && e.type === 'warrior') {
        e.idleTimer -= dt;
        if (e.idleTimer <= 0) {
          e.tx = e.homeX + (Math.random() - 0.5) * 32;
          e.ty = e.homeY + (Math.random() - 0.5) * 20;
          e.state = 'walking';
          e.idleTimer = 2.5 + Math.random() * 4;
        }
      }

      if (e.state === 'fighting') e.fightTimer += dt;
      e.effectTimer += dt;
      if (e.state === 'dying' && e.effectTimer > 1.5) e.state = 'dead';
    };

    for (const e of this.entities.values()) step(e);
    if (this.monsterEntity) step(this.monsterEntity);

    for (const [id, e] of this.entities) { if (e.state === 'dead') this.entities.delete(id); }
  }

  // ── Render ─────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0);

    // Collect + depth sort
    const draw: Entity[] = [...this.entities.values()].filter(e => e.state !== 'dead');
    if (this.monsterEntity && this.monsterEntity.state !== 'dead') draw.push(this.monsterEntity);
    draw.sort((a, b) => a.y - b.y);

    for (const e of draw) {
      const rx = Math.round(e.x), ry = Math.round(e.y);

      if (e.type === 'warrior') {
        const ox = e.state === 'fighting' ? Math.round(Math.sin(e.fightTimer * 20) * 2) : 0;
        const oy = e.state === 'celebrating' ? -Math.abs(Math.round(Math.sin(e.effectTimer * 8) * 4)) : 0;

        drawWarrior(ctx, rx + ox, ry + oy, {
          domain: e.domain, frame: e.walkFrame,
          selected: e.state === 'selected',
          fighting: e.state === 'fighting',
          dreaming: e.state === 'dreaming',
          celebrating: e.state === 'celebrating',
          dying: e.state === 'dying',
        });

        if (['selected','fighting','dreaming','celebrating'].includes(e.state)) {
          drawNameTag(ctx, rx, ry - 20, `${e.name} L${e.level}`);
        }
        if (e.state === 'dreaming' && e.dreamText) {
          drawDreamBubble(ctx, rx, ry - 12, e.dreamText);
        }
        if (this.simState?.phase === 'stats_update' && this.simState.selectedTeam.includes(e.id)) {
          drawSparkles(ctx, rx, ry, this.globalFrame);
        }

        // Fighting slash
        if (e.state === 'fighting' && Math.floor(e.fightTimer * 3) % 2 === 0) {
          drawSlash(ctx, rx + 10, ry - 14, Math.floor(e.fightTimer * 5) % 3);
        }

      } else {
        const demon = this.simState?.currentDemon;
        drawMonster(ctx, rx, ry, {
          domain: e.domain, frame: this.globalFrame,
          dying: e.state === 'dying',
          hp: demon?.hp, maxHp: demon?.maxHp,
        });
        if (e.state !== 'dying') drawNameTag(ctx, rx, ry - 20, e.name);
      }
    }

    // Phase tints
    const phase = this.simState?.phase;
    if (phase === 'battle_win')  { ctx.fillStyle = '#fbbf2408'; ctx.fillRect(0,0,GAME_W,GAME_H); }
    if (phase === 'battle_lose') { ctx.fillStyle = '#ef44440c'; ctx.fillRect(0,0,GAME_W,GAME_H); }
    if (phase === 'codream')     { ctx.fillStyle = '#6b21a80c'; ctx.fillRect(0,0,GAME_W,GAME_H); }
    if (phase === 'lifecycle' && this.simState?.lifecycleEvent) {
      const t: Record<string,string> = {
        fork:'#3b82f608', merge:'#a855f708', prune:'#ef444410',
        genesis:'#22c55e10', specialize:'#fbbf2408',
      };
      ctx.fillStyle = t[this.simState.lifecycleEvent.type] ?? '';
      ctx.fillRect(0,0,GAME_W,GAME_H);
    }
  }

  // ── Loop ───────────────────────────────────────────────────
  private tick = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
  start() { this.lastTime = performance.now(); this.rafId = requestAnimationFrame(this.tick); }
  stop()  { cancelAnimationFrame(this.rafId); }
}

// ── Helpers ──────────────────────────────────────────────────
function primaryDomain(w: Warrior): DomainKey {
  const ds: DomainKey[] = ['math','code','reasoning'];
  return ds.reduce((b, d) => w.skills[d] > w.skills[b] ? d : b, ds[0]);
}

function mkEntity(w: Warrior, home: {x:number,y:number}): Entity {
  return {
    id: w.id, type: 'warrior',
    x: home.x + Math.random() * 10 - 5,
    y: home.y + Math.random() * 10 - 5,
    tx: home.x, ty: home.y,
    homeX: home.x, homeY: home.y,
    speed: 28 + Math.random() * 15,
    state: 'idle',
    domain: primaryDomain(w),
    walkFrame: 0, walkTimer: 0,
    idleTimer: Math.random() * 3,
    fightTimer: 0, effectTimer: 0,
    name: w.name, level: w.level,
  };
}
