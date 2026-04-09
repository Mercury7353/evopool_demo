// ============================================================
// Game Engine — village scene + entity management + anim loop
// ============================================================
import {
  GAME_W, GAME_H, TILE, TILE_CODES, PAL,
  renderTilemap,
  drawWarrior, drawMonster, drawNameTag, drawDreamBubble,
  drawSlash, drawSparkles, drawHealthBar,
  type DomainKey, type WarriorDrawOpts,
} from './renderer';
import type { SimulationState, Domain, Warrior, Demon } from '../types';

// ── Village map (24×16) ──────────────────────────────────────
const _ = TILE_CODES.GRASS;
const P = TILE_CODES.PATH;
const T = TILE_CODES.TREE;
const W = TILE_CODES.WALL;
const R = TILE_CODES.ROOF;
const D = TILE_CODES.DOOR;
const S = TILE_CODES.WINDOW;
const V = TILE_CODES.WELL;
const F = TILE_CODES.FLOWER;
const B = TILE_CODES.BUSH;
const G = TILE_CODES.GATE;

const MAP: number[][] = [
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
  [T,_,_,B,_,_,_,_,_,_,P,P,_,_,_,_,_,_,B,_,_,_,_,T],
  [T,_,R,R,R,R,_,_,_,_,P,P,_,_,_,_,R,R,R,R,R,_,_,T],
  [T,_,W,S,S,W,_,_,_,_,P,P,_,_,_,_,W,S,S,S,W,_,_,T],
  [T,_,W,D,D,W,_,_,_,_,P,P,_,_,_,_,W,D,D,D,W,_,_,T],
  [T,_,_,_,_,_,F,_,_,_,P,P,_,_,_,F,_,_,_,_,_,_,_,T],
  [T,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,_,T],
  [T,P,_,_,F,_,_,P,_,_,V,V,_,_,P,_,_,F,_,_,P,_,_,T],
  [T,P,_,_,_,_,_,P,_,_,V,V,_,_,P,_,_,_,_,_,P,_,_,T],
  [T,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,_,T],
  [T,_,_,_,_,_,F,_,_,_,P,P,_,_,_,F,_,_,_,_,_,_,_,T],
  [T,_,R,R,R,R,_,_,_,_,P,P,_,_,_,_,R,R,R,R,_,_,_,T],
  [T,_,W,S,S,W,_,_,_,_,P,P,_,_,_,_,W,S,S,W,_,_,_,T],
  [T,_,W,D,D,W,_,_,_,_,P,P,_,_,_,_,W,D,D,W,_,_,_,T],
  [T,_,_,_,B,_,_,_,_,G,P,P,P,P,G,_,_,_,B,_,_,_,_,T],
  [T,T,T,T,T,T,T,T,T,T,_,_,_,_,T,T,T,T,T,T,T,T,T,T],
];

// ── Locations (pixel coords) ────────────────────────────────
const LOC = {
  tavernDoor:  { x: 4 * TILE,  y: 5 * TILE },
  barracksDoor:{ x: 18 * TILE, y: 5 * TILE },
  well:        { x: 11 * TILE, y: 8 * TILE },
  gate:        { x: 12 * TILE, y: 15 * TILE },
  battleField: { x: 12 * TILE, y: 14 * TILE },
};

// Battle formation: 3 positions for team warriors
const BATTLE_POS = [
  { x: LOC.battleField.x - 16, y: LOC.battleField.y },
  { x: LOC.battleField.x,      y: LOC.battleField.y + 4 },
  { x: LOC.battleField.x + 16, y: LOC.battleField.y },
];
const MONSTER_POS = { x: LOC.gate.x, y: LOC.gate.y + 4 };

// CoDream positions near tavern
const CODREAM_POS = [
  { x: LOC.tavernDoor.x - 10, y: LOC.tavernDoor.y + 10 },
  { x: LOC.tavernDoor.x,      y: LOC.tavernDoor.y + 14 },
  { x: LOC.tavernDoor.x + 10, y: LOC.tavernDoor.y + 10 },
];

// Home positions for warriors (scattered on paths)
const HOME_SLOTS = [
  { x: 56,  y: 104 }, { x: 72,  y: 120 }, { x: 40,  y: 152 },
  { x: 120, y: 104 }, { x: 136, y: 136 }, { x: 104, y: 152 },
  { x: 200, y: 104 }, { x: 248, y: 120 }, { x: 280, y: 152 },
  { x: 168, y: 104 }, { x: 168, y: 152 }, { x: 56,  y: 168 },
  { x: 280, y: 168 }, { x: 200, y: 152 }, { x: 232, y: 104 },
  { x: 88,  y: 136 }, { x: 312, y: 120 }, { x: 152, y: 136 },
  { x: 216, y: 136 }, { x: 264, y: 136 },
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
  prevPhase: string = '';
  rafId = 0;
  lastTime = 0;
  globalFrame = 0;
  clickCb: ((entity: Entity | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.bgCanvas = renderTilemap(MAP);
  }

  // ── Click detection ────────────────────────────────────────
  onEntityClick(cb: (entity: Entity | null) => void) { this.clickCb = cb; }

  getEntityAt(gx: number, gy: number): Entity | null {
    // Check all entities — hitbox is ~8×12 around (x, y-6)
    for (const e of this.entities.values()) {
      if (e.state === 'dead') continue;
      if (Math.abs(gx - e.x) < 8 && Math.abs(gy - (e.y - 6)) < 8) return e;
    }
    if (this.monsterEntity) {
      const m = this.monsterEntity;
      if (Math.abs(gx - m.x) < 10 && Math.abs(gy - (m.y - 5)) < 8) return m;
    }
    return null;
  }

  // ── Sync simulation state → visual entities ────────────────
  syncState(state: SimulationState) {
    const phaseChanged = state.phase !== this.prevPhase || state.taskIndex !== (this.simState?.taskIndex ?? -1);
    this.simState = state;

    if (!phaseChanged) return;
    this.prevPhase = state.phase;

    const aliveWarriors = state.warriors.filter(w => w.alive);

    // Ensure entities exist for all alive warriors
    for (let i = 0; i < aliveWarriors.length; i++) {
      const w = aliveWarriors[i];
      if (!this.entities.has(w.id)) {
        const home = HOME_SLOTS[i % HOME_SLOTS.length];
        this.entities.set(w.id, {
          id: w.id, type: 'warrior',
          x: home.x + Math.random() * 10 - 5,
          y: home.y + Math.random() * 10 - 5,
          tx: home.x, ty: home.y,
          homeX: home.x, homeY: home.y,
          speed: 30 + Math.random() * 15,
          state: 'idle',
          domain: getPrimaryDomain(w),
          walkFrame: 0, walkTimer: 0,
          idleTimer: Math.random() * 3,
          fightTimer: 0, effectTimer: 0,
          name: w.name, level: w.level,
        });
      } else {
        const e = this.entities.get(w.id)!;
        e.domain = getPrimaryDomain(w);
        e.name = w.name;
        e.level = w.level;
      }
    }

    // Mark dead warriors
    for (const [id, e] of this.entities) {
      if (e.type !== 'warrior') continue;
      const w = state.warriors.find(w => w.id === id);
      if (!w || !w.alive) {
        e.state = 'dying';
        e.effectTimer = 0;
      }
    }

    // Phase-specific actions
    switch (state.phase) {
      case 'idle': {
        this.monsterEntity = null;
        for (const e of this.entities.values()) {
          if (e.state !== 'dying' && e.state !== 'dead') {
            e.state = 'walking';
            e.tx = e.homeX + (Math.random() - 0.5) * 24;
            e.ty = e.homeY + (Math.random() - 0.5) * 16;
            e.dreamText = undefined;
          }
        }
        break;
      }

      case 'demon_spawn': {
        if (state.currentDemon) {
          const d = state.currentDemon;
          this.monsterEntity = {
            id: d.id, type: 'monster',
            x: MONSTER_POS.x, y: GAME_H + 20, // start off screen
            tx: MONSTER_POS.x, ty: MONSTER_POS.y,
            homeX: MONSTER_POS.x, homeY: MONSTER_POS.y,
            speed: 40,
            state: 'walking',
            domain: d.domain as DomainKey,
            walkFrame: 0, walkTimer: 0,
            idleTimer: 0, fightTimer: 0, effectTimer: 0,
            name: d.name, level: d.difficulty,
          };
        }
        break;
      }

      case 'team_select': {
        for (let i = 0; i < state.selectedTeam.length; i++) {
          const e = this.entities.get(state.selectedTeam[i]);
          if (e) {
            e.state = 'selected';
            e.tx = BATTLE_POS[i].x;
            e.ty = BATTLE_POS[i].y;
          }
        }
        break;
      }

      case 'battle': {
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'fighting'; e.fightTimer = 0; }
        }
        if (this.monsterEntity) this.monsterEntity.state = 'fighting';
        break;
      }

      case 'battle_win': {
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'celebrating'; e.effectTimer = 0; }
        }
        if (this.monsterEntity) {
          this.monsterEntity.state = 'dying';
          this.monsterEntity.effectTimer = 0;
        }
        break;
      }

      case 'battle_lose': {
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.state = 'walking'; e.tx = e.homeX; e.ty = e.homeY; }
        }
        break;
      }

      case 'codream': {
        for (let i = 0; i < state.selectedTeam.length; i++) {
          const e = this.entities.get(state.selectedTeam[i]);
          if (e) {
            e.state = 'dreaming';
            e.tx = CODREAM_POS[i % CODREAM_POS.length].x;
            e.ty = CODREAM_POS[i % CODREAM_POS.length].y;
            const insight = state.codreamInsights.find(ci => ci.warriorId === e.id);
            e.dreamText = insight?.insight.slice(0, 20) ?? '...';
          }
        }
        this.monsterEntity = null;
        break;
      }

      case 'stats_update': {
        for (const id of state.selectedTeam) {
          const e = this.entities.get(id);
          if (e) { e.effectTimer = 0; }
        }
        break;
      }

      case 'lifecycle': {
        const evt = state.lifecycleEvent;
        if (evt?.type === 'genesis' && evt.newWarriorId) {
          // New warrior spawns at well with flash
          const idx = aliveWarriors.findIndex(w => w.id === evt.newWarriorId);
          const home = HOME_SLOTS[idx >= 0 ? idx % HOME_SLOTS.length : 0];
          const nw = aliveWarriors.find(w => w.id === evt.newWarriorId);
          if (nw && !this.entities.has(nw.id)) {
            this.entities.set(nw.id, {
              id: nw.id, type: 'warrior',
              x: LOC.well.x, y: LOC.well.y,
              tx: home.x, ty: home.y,
              homeX: home.x, homeY: home.y,
              speed: 30, state: 'walking',
              domain: getPrimaryDomain(nw),
              walkFrame: 0, walkTimer: 0,
              idleTimer: 0, fightTimer: 0, effectTimer: 0,
              name: nw.name, level: nw.level,
            });
          }
        }
        break;
      }
    }
  }

  // ── Update (per frame) ─────────────────────────────────────
  update(dt: number) {
    this.globalFrame++;

    const updateEntity = (e: Entity) => {
      // Movement
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1 && e.state !== 'fighting' && e.state !== 'dead') {
        const step = Math.min(e.speed * dt, dist);
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      } else if (e.state === 'walking' || e.state === 'selected') {
        e.x = e.tx;
        e.y = e.ty;
        if (e.state === 'walking' && e.type === 'warrior') {
          e.state = 'idle';
        }
      }

      // Walk animation
      if (dist > 1) {
        e.walkTimer += dt;
        if (e.walkTimer > 0.22) {
          e.walkFrame = (e.walkFrame + 1) % 2;
          e.walkTimer = 0;
        }
      } else {
        e.walkFrame = 0;
      }

      // Idle wandering
      if (e.state === 'idle' && e.type === 'warrior') {
        e.idleTimer -= dt;
        if (e.idleTimer <= 0) {
          e.tx = e.homeX + (Math.random() - 0.5) * 28;
          e.ty = e.homeY + (Math.random() - 0.5) * 18;
          e.state = 'walking';
          e.idleTimer = 2 + Math.random() * 4;
        }
      }

      // Fight animation timer
      if (e.state === 'fighting') {
        e.fightTimer += dt;
      }

      // Effect timer
      e.effectTimer += dt;

      // Dying → dead
      if (e.state === 'dying' && e.effectTimer > 1.5) {
        e.state = 'dead';
      }
    };

    for (const e of this.entities.values()) updateEntity(e);
    if (this.monsterEntity) updateEntity(this.monsterEntity);

    // Remove fully dead entities
    for (const [id, e] of this.entities) {
      if (e.state === 'dead') this.entities.delete(id);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;

    // Background tilemap
    if (this.bgCanvas) {
      ctx.drawImage(this.bgCanvas, 0, 0);
    }

    // Collect all drawable entities sorted by y
    const toDraw: Entity[] = [];
    for (const e of this.entities.values()) {
      if (e.state !== 'dead') toDraw.push(e);
    }
    if (this.monsterEntity && this.monsterEntity.state !== 'dead') {
      toDraw.push(this.monsterEntity);
    }
    toDraw.sort((a, b) => a.y - b.y);

    // Draw entities
    for (const e of toDraw) {
      const rx = Math.round(e.x);
      const ry = Math.round(e.y);

      if (e.type === 'warrior') {
        const opts: WarriorDrawOpts = {
          domain: e.domain,
          frame: e.walkFrame,
          selected: e.state === 'selected',
          fighting: e.state === 'fighting',
          dreaming: e.state === 'dreaming',
          celebrating: e.state === 'celebrating',
          dying: e.state === 'dying',
        };

        // Fighting: shake
        const ox = e.state === 'fighting'
          ? Math.round(Math.sin(e.fightTimer * 20) * 2) : 0;
        const oy = e.state === 'celebrating'
          ? -Math.abs(Math.round(Math.sin(e.effectTimer * 8) * 3)) : 0;

        drawWarrior(ctx, rx + ox, ry + oy, opts);

        // Name tag (only for selected / dreaming / fighting)
        if (['selected','fighting','dreaming','celebrating'].includes(e.state)) {
          drawNameTag(ctx, rx, ry - 15, `${e.name} L${e.level}`);
        }

        // Dream bubble
        if (e.state === 'dreaming' && e.dreamText) {
          drawDreamBubble(ctx, rx, ry - 8, e.dreamText);
        }

        // Sparkle for stats update phase
        if (this.simState?.phase === 'stats_update'
            && this.simState.selectedTeam.includes(e.id)) {
          drawSparkles(ctx, rx, ry, this.globalFrame);
        }

      } else if (e.type === 'monster') {
        const demon = this.simState?.currentDemon;
        drawMonster(ctx, rx, ry, {
          domain: e.domain,
          frame: this.globalFrame,
          dying: e.state === 'dying',
          hp: demon?.hp,
          maxHp: demon?.maxHp,
        });

        // Name tag
        if (e.state !== 'dying') {
          drawNameTag(ctx, rx, ry - 16, `${e.name}`);
        }
      }

      // Fight effects
      if (e.state === 'fighting' && e.type === 'warrior') {
        const slashPhase = Math.floor(e.fightTimer * 5) % 3;
        if (Math.floor(e.fightTimer * 3) % 2 === 0) {
          drawSlash(ctx, rx + 8, ry - 12, slashPhase);
        }
      }
    }

    // Phase-specific global effects
    const phase = this.simState?.phase;

    // Battle win: gold shimmer
    if (phase === 'battle_win') {
      ctx.fillStyle = PAL.gold + '08';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // Battle lose: red flash
    if (phase === 'battle_lose') {
      ctx.fillStyle = PAL.red + '0a';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // CoDream: purple tint
    if (phase === 'codream') {
      ctx.fillStyle = '#6b21a8' + '0c';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // Lifecycle event: themed tint
    if (phase === 'lifecycle' && this.simState?.lifecycleEvent) {
      const tints: Record<string, string> = {
        fork: '#3b82f608', merge: '#a855f708',
        prune: '#ef444410', genesis: '#22c55e10',
        specialize: '#fbbf2408',
      };
      ctx.fillStyle = tints[this.simState.lifecycleEvent.type] ?? '#00000000';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
  }

  // ── Game loop ──────────────────────────────────────────────
  private tick = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };

  start() {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() { cancelAnimationFrame(this.rafId); }
}

// ── Helpers ──────────────────────────────────────────────────
function getPrimaryDomain(w: Warrior): DomainKey {
  const domains: DomainKey[] = ['math', 'code', 'reasoning'];
  return domains.reduce((best, d) =>
    w.skills[d] > w.skills[best] ? d : best, domains[0]);
}

