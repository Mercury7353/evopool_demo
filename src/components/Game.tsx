// ══════════════════════════════════════════════════════════════
// EvoPool Village — complete ecosystem simulation
// Monsters attack → Team selects leader → Battle → CoDream at night
// → Evolution → Lifecycle (fork/merge/prune/genesis)
// ══════════════════════════════════════════════════════════════
import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage } from '@pixi/react';
import { type MapData } from './PixiStaticMap';
import PixiScene, { type WEntity, type MonsterEntity } from './PixiScene';
import { characters } from '../data/characters';
import * as mapData from '../data/gentle.js';
import { createInitialState, stepPhase, getPhaseDuration } from '../simulation';
import type { SimulationState, Warrior, Domain } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS, DOMAIN_ICONS } from '../types';

const T = mapData.tiledim;                  // 32
const WORLD_W = mapData.screenxtiles * T;   // 1440
const WORLD_H = mapData.screenytiles * T;   // 1024
const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

const worldMap: MapData = {
  tileSetUrl: '/assets/gentle-obj.png',
  tileSetDimX: mapData.tilesetpxw, tileSetDimY: mapData.tilesetpxh,
  tileDim: T,
  bgTiles: mapData.bgtiles, objectTiles: mapData.objmap,
  animatedSprites: mapData.animatedsprites ?? [],
};

// ── Locations (tile coords) ──────────────────────────────────
const HOME_TILES = [
  {x:10,y:14},{x:12,y:16},{x:8,y:18},{x:14,y:12},{x:16,y:14},
  {x:18,y:16},{x:20,y:14},{x:22,y:12},{x:24,y:18},{x:26,y:14},
  {x:11,y:20},{x:13,y:22},{x:15,y:20},{x:17,y:22},{x:19,y:20},
  {x:21,y:22},{x:23,y:20},{x:25,y:22},{x:9,y:22},{x:27,y:18},
];

// Battle area — open field
const BATTLE = { x: 22, y: 9 };
const BATTLE_POS = [
  { x: (BATTLE.x - 2) * T, y: (BATTLE.y - 1) * T },
  { x: (BATTLE.x - 2) * T, y: (BATTLE.y + 1) * T },
  { x: (BATTLE.x - 3) * T, y:  BATTLE.y * T },
];
const MONSTER_POS = { x: (BATTLE.x + 2) * T, y: BATTLE.y * T };

// Tavern / CoDream hall — building at top of village
const TAVERN = { x: 6, y: 10 };
const CODREAM_POS = [
  { x: (TAVERN.x) * T,     y: (TAVERN.y + 2) * T },
  { x: (TAVERN.x + 1) * T, y: (TAVERN.y + 3) * T },
  { x: (TAVERN.x + 2) * T, y: (TAVERN.y + 2) * T },
];

// ── Toasts ───────────────────────────────────────────────────
interface Toast { id: number; text: string; type: string; time: number; }
let _tid = 0;

// Night phases
const NIGHT_PHASES = new Set(['codream', 'stats_update', 'lifecycle']);
const isNight = (phase: string) => NIGHT_PHASES.has(phase);

// CoDream sub-phases (cycle through during codream)
const CODREAM_STEPS = [
  { name: 'REFLECT', icon: '💭', desc: 'Each warrior diagnoses what went wrong' },
  { name: 'CONTRAST', icon: '🔍', desc: 'Compare approaches with the best performer' },
  { name: 'IMAGINE', icon: '💡', desc: 'Propose specific technique improvements' },
  { name: 'DEBATE', icon: '⚖️', desc: 'Challenge ideas — only from stronger peers' },
  { name: 'CRYSTALLIZE', icon: '✨', desc: 'Distill private insights — preserve diversity' },
];

// ══════════════════════════════════════════════════════════════
export default function Game() {
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sim, setSim] = useState<SimulationState>(createInitialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entities, setEntities] = useState<WEntity[]>([]);
  const [monster, setMonster] = useState<MonsterEntity | undefined>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLogLen = useRef(0);
  const [popup, setPopup] = useState<Warrior | null>(null);
  const [codreamStep, setCodreamStep] = useState(0);

  // Resize
  useEffect(() => {
    const fn = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!sim.running) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    const dur = getPhaseDuration(sim.phase, sim.speed);
    timerRef.current = setTimeout(() => setSim(p => p.running ? stepPhase(p) : p), dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sim.running, sim.phase, sim.speed, sim.taskIndex]);

  // CoDream sub-phase cycling
  useEffect(() => {
    if (sim.phase !== 'codream') { setCodreamStep(0); return; }
    const interval = setInterval(() => {
      setCodreamStep(s => (s + 1) % CODREAM_STEPS.length);
    }, 500);
    return () => clearInterval(interval);
  }, [sim.phase]);

  // ── Sync monster ───────────────────────────────────────────
  useEffect(() => {
    const d = sim.currentDemon;
    if (d && ['demon_spawn', 'team_select', 'battle', 'battle_win', 'battle_lose'].includes(sim.phase)) {
      setMonster({
        x: MONSTER_POS.x, y: MONSTER_POS.y,
        name: d.name,
        domain: d.domain,
        difficulty: d.difficulty,
        visible: true,
        dying: sim.phase === 'battle_win',
        hp: d.hp, maxHp: d.maxHp,
      });
    } else {
      setMonster(undefined);
    }
  }, [sim.phase, sim.currentDemon, sim.taskIndex]);

  // ── Sync warrior entities ──────────────────────────────────
  useEffect(() => {
    const alive = sim.warriors.filter(w => w.alive);
    const phase = sim.phase;
    // Find team leader (highest affinity for current demon)
    const leaderId = sim.selectedTeam.length > 0 && sim.currentDemon
      ? sim.selectedTeam.reduce((best, id) => {
          const wb = sim.warriors.find(w => w.id === best);
          const wi = sim.warriors.find(w => w.id === id);
          if (!wb || !wi || !sim.currentDemon) return best;
          return wi.skills[sim.currentDemon.domain] > wb.skills[sim.currentDemon.domain] ? id : best;
        }, sim.selectedTeam[0])
      : null;

    const newEnts: WEntity[] = alive.map((w, i) => {
      const home = HOME_TILES[i % HOME_TILES.length];
      const prev = entities.find(e => e.id === w.id);
      const hx = home.x * T, hy = home.y * T;
      const isOnTeam = sim.selectedTeam.includes(w.id);
      const isLeader = w.id === leaderId;

      const base: WEntity = {
        id: w.id, charIdx: i % characters.length,
        x: prev?.x ?? hx, y: prev?.y ?? hy,
        tx: hx + (Math.random() - 0.5) * 64,
        ty: hy + (Math.random() - 0.5) * 48,
        homeX: hx, homeY: hy,
        orientation: prev?.orientation ?? 90,
        isMoving: true, emoji: '', label: '',
        isThinking: false, isSpeaking: false, isSelected: false,
      };

      // --- Phase overrides ---
      if (phase === 'team_select' && isOnTeam) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = BATTLE_POS[ti].x; base.ty = BATTLE_POS[ti].y;
        base.isSelected = true;
        base.label = `${isLeader ? '👑 ' : ''}${w.name} L${w.level}`;
        base.orientation = 0; // face right (toward monster)
      }
      if (['battle', 'battle_win', 'battle_lose'].includes(phase) && isOnTeam) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = BATTLE_POS[ti].x; base.ty = BATTLE_POS[ti].y;
        base.x = prev?.x ?? BATTLE_POS[ti].x;
        base.y = prev?.y ?? BATTLE_POS[ti].y;
        base.isSelected = true;
        base.label = `${isLeader ? '👑 ' : ''}${w.name}`;
        base.orientation = 0;
        if (phase === 'battle') base.emoji = '⚔️';
        if (phase === 'battle_win') base.emoji = '🎉';
        if (phase === 'battle_lose') base.emoji = '😣';
      }
      // CoDream: warriors gather at tavern
      if (phase === 'codream' && isOnTeam) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = CODREAM_POS[ti % CODREAM_POS.length].x;
        base.ty = CODREAM_POS[ti % CODREAM_POS.length].y;
        base.isThinking = codreamStep < 2; // REFLECT, CONTRAST
        base.isSpeaking = codreamStep >= 2 && codreamStep < 4; // IMAGINE, DEBATE
        base.emoji = codreamStep === 4 ? '✨' : ''; // CRYSTALLIZE
        base.label = w.name;
      }
      // Stats update: show skill gains
      if (phase === 'stats_update' && isOnTeam) {
        base.emoji = '⬆️';
        base.label = w.name;
      }
      // Lifecycle
      if (phase === 'lifecycle' && sim.lifecycleEvent) {
        const evt = sim.lifecycleEvent;
        if (evt.involvedWarriors.includes(w.id) || evt.newWarriorId === w.id) {
          const icons: Record<string, string> = { fork: '🔀', merge: '🔗', prune: '💀', genesis: '🌟', specialize: '⭐' };
          base.emoji = icons[evt.type] ?? '';
          base.label = w.name;
        }
      }
      return base;
    });
    setEntities(newEnts);
  }, [sim.phase, sim.taskIndex, sim.warriors, codreamStep]);

  // Animate movement
  useEffect(() => {
    const iv = setInterval(() => {
      setEntities(prev => prev.map(e => {
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2) return { ...e, isMoving: false };
        const spd = 2;
        const nx = e.x + (dx / dist) * Math.min(spd, dist);
        const ny = e.y + (dy / dist) * Math.min(spd, dist);
        let orient = e.orientation;
        if (Math.abs(dx) > Math.abs(dy)) orient = dx > 0 ? 0 : 180;
        else orient = dy > 0 ? 90 : 270;
        return { ...e, x: nx, y: ny, orientation: orient, isMoving: true };
      }));
    }, 33);
    return () => clearInterval(iv);
  }, []);

  // Toasts
  useEffect(() => {
    if (sim.eventLog.length > prevLogLen.current) {
      const fresh = sim.eventLog.slice(prevLogLen.current);
      setToasts(prev => [...prev, ...fresh.map(e => ({ id: ++_tid, text: e.text, type: e.type, time: Date.now() }))].slice(-5));
    }
    prevLogLen.current = sim.eventLog.length;
  }, [sim.eventLog.length]);
  useEffect(() => {
    const iv = setInterval(() => setToasts(p => p.filter(t => Date.now() - t.time < 5000)), 500);
    return () => clearInterval(iv);
  }, []);

  const toggleRun = useCallback(() => setSim(p => ({ ...p, running: !p.running })), []);
  const step = useCallback(() => setSim(p => stepPhase(p)), []);
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSim(createInitialState()); prevLogLen.current = 0; setEntities([]);
  }, []);
  const setSpeed = useCallback((s: number) => setSim(p => ({ ...p, speed: s })), []);
  const onWarriorClick = useCallback((wId: string) => {
    const w = sim.warriors.find(w2 => w2.id === wId);
    if (w) setPopup(w);
  }, [sim.warriors]);

  const ps = sim.poolStats;
  const wr = ps.totalTasks > 0 ? Math.round((ps.totalWins / ps.totalTasks) * 100) : 0;
  const gameH = dims.h - 42;
  const night = isNight(sim.phase);

  return (
    <div className="game-wrapper">
      {/* PixiJS Stage */}
      <Stage width={dims.w} height={gameH} options={{ backgroundColor: night ? 0x0a0a2e : 0x7ab5ff, antialias: false }}>
        <PixiScene
          width={dims.w} height={gameH}
          worldWidth={WORLD_W} worldHeight={WORLD_H}
          map={worldMap} entities={entities} monster={monster}
          onWarriorClick={onWarriorClick}
        />
      </Stage>

      {/* ── Night overlay ─────────────────────────────────── */}
      <div className={`night-overlay ${night ? 'active' : ''}`}>
        {night && <>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="star" style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 70}%`,
              animationDelay: `${i * 0.3}s`,
            }} />
          ))}
        </>}
      </div>

      {/* ── Phase banner ──────────────────────────────────── */}
      {sim.phase !== 'idle' && (
        <div className={`phase-banner phase-banner-${sim.phase}`}>
          {phaseBanner(sim)}
        </div>
      )}

      {/* ── CoDream panel (shows 5 phases) ────────────────── */}
      {sim.phase === 'codream' && (
        <div className="codream-panel">
          <div className="codream-title">🌙 CoDream Session — Tavern</div>
          <div className="codream-subtitle">Warriors share failure insights asymmetrically</div>
          <div className="codream-phases">
            {CODREAM_STEPS.map((s, i) => (
              <div key={i} className={`codream-phase ${i === codreamStep ? 'active' : i < codreamStep ? 'done' : ''}`}>
                <span className="cdp-icon">{s.icon}</span>
                <div>
                  <div className="cdp-name">{s.name}</div>
                  <div className="cdp-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {sim.codreamInsights.length > 0 && (
            <div className="codream-insights">
              <div className="ci-title">Insights Crystallized:</div>
              {sim.codreamInsights.map((ins, i) => {
                const w = sim.warriors.find(w2 => w2.id === ins.warriorId);
                const from = ins.fromWarriorId ? sim.warriors.find(w2 => w2.id === ins.fromWarriorId) : null;
                return (
                  <div key={i} className="ci-item">
                    <span className="ci-arrow">{from ? `${from.name} → ${w?.name}` : w?.name}</span>
                    <span className="ci-text">{ins.insight}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Lifecycle event overlay ───────────────────────── */}
      {sim.phase === 'lifecycle' && sim.lifecycleEvent && (
        <div className="lifecycle-panel">
          <div className="lc-icon">
            {{ fork: '🔀', merge: '🔗', prune: '💀', genesis: '🌟', specialize: '⭐' }[sim.lifecycleEvent.type]}
          </div>
          <div className="lc-type">{sim.lifecycleEvent.type.toUpperCase()}</div>
          <div className="lc-desc">{sim.lifecycleEvent.description}</div>
        </div>
      )}

      {/* Title */}
      <div className="game-title">
        <span className="title-evo">Evo</span>Pool
        <span className="title-sub"> — Warriors of Evolution</span>
      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
        ))}
      </div>

      {/* Bottom control bar */}
      <div className="control-bar">
        <button className={`ctrl-btn ${sim.running ? 'btn-stop' : 'btn-play'}`} onClick={toggleRun}>
          {sim.running ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={step} disabled={sim.running}>⏭</button>
        <div className="speed-control">
          <span>🐢</span>
          <input type="range" min={30} max={200} value={sim.speed} onChange={e => setSpeed(Number(e.target.value))} />
          <span>🐇</span>
        </div>
        <button className="ctrl-btn" onClick={reset}>↻</button>
        <div className="stat-divider" />
        <SB label="Task" value={`#${sim.taskIndex}`} />
        <SB label="Win" value={String(ps.totalWins)} cls="stat-win" />
        <SB label="Lose" value={String(ps.totalLosses)} cls="stat-lose" />
        <SB label="Rate" value={`${wr}%`} />
        <SB label="Pool" value={String(sim.warriors.filter(w => w.alive).length)} />
        <div className="stat-divider" />
        <div className="stat-group">
          <span className="stat-label">Phase</span>
          <span className={`phase-tag phase-${sim.phase}`}>{phaseLabel(sim.phase)}</span>
        </div>
        <div className="lifecycle-counts">🔀{ps.forks} 🔗{ps.merges} 💀{ps.prunes} 🌟{ps.geneses}</div>
      </div>

      {/* Warrior popup */}
      {popup && (
        <div className="popup-overlay" onClick={() => setPopup(null)}>
          <div className="warrior-popup" onClick={e => e.stopPropagation()}>
            <WD warrior={popup} onClose={() => setPopup(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function SB({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return <div className="stat-group"><span className="stat-label">{label}</span><span className={`stat-value ${cls ?? ''}`}>{value}</span></div>;
}

function phaseBanner(sim: SimulationState): string {
  const d = sim.currentDemon;
  switch (sim.phase) {
    case 'demon_spawn': return `${DOMAIN_ICONS[d?.domain ?? 'math']} ${d?.name ?? 'Monster'} (${DOMAIN_LABELS[d?.domain ?? 'math']} Lv.${d?.difficulty ?? 1}) approaches the village!`;
    case 'team_select': return `👑 Leader selects the best team to fight!`;
    case 'battle': return `⚔️ Battle in progress!`;
    case 'battle_win': return `🎉 Victory! The monster is defeated!`;
    case 'battle_lose': return `😣 Defeat... Time to learn from failure.`;
    case 'codream': return `🌙 Night falls — CoDream session at the Tavern`;
    case 'stats_update': return `📈 Warriors evolve — skills growing stronger`;
    case 'lifecycle': {
      const e = sim.lifecycleEvent;
      if (!e) return '🔄 Pool restructuring check...';
      return `${e.type === 'fork' ? '🔀 FORK' : e.type === 'merge' ? '🔗 MERGE' : e.type === 'prune' ? '💀 PRUNE' : e.type === 'genesis' ? '🌟 GENESIS' : '⭐ SPECIALIZE'}: ${e.description}`;
    }
    default: return '';
  }
}

function WD({ warrior: w, onClose }: { warrior: Warrior; onClose: () => void }) {
  const primary = DOMAINS.reduce((b, d) => w.skills[d] > w.skills[b] ? d : b, DOMAINS[0]);
  return (
    <div className="wd">
      <div className="wd-header">
        <span className="wd-emoji">{w.emoji}</span>
        <div>
          <div className="wd-name">{w.name} <span className="wd-level">Lv.{w.level}</span></div>
          <div className="wd-class" style={{ color: DOMAIN_COLORS[primary] }}>{DOMAIN_LABELS[primary]} Specialist</div>
        </div>
        <button className="wd-close" onClick={onClose}>✕</button>
      </div>
      <div className="wd-skills">
        {DOMAINS.map(d => (
          <div key={d} className="wd-skill-row">
            <span className="wd-skill-label">{DOMAIN_LABELS[d]}</span>
            <div className="wd-bar"><div className="wd-bar-fill" style={{ width: `${w.skills[d] * 100}%`, background: DOMAIN_COLORS[d] }} /></div>
            <span className="wd-skill-val">{(w.skills[d] * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="wd-stats">
        <span className="wd-stat-win">{w.wins}W</span>
        <span className="wd-stat-lose">{w.losses}L</span>
        <span className="wd-stat-tasks">{w.tasksCompleted} tasks</span>
      </div>
      {w.insights.length > 0 && (
        <div className="wd-insights">
          <div className="wd-insights-title">Recent CoDream Insights</div>
          {w.insights.slice(-3).map((ins, i) => <div key={i} className="wd-insight">💡 {ins}</div>)}
        </div>
      )}
    </div>
  );
}

function phaseLabel(p: string): string {
  return { idle: '☀️ Day', demon_spawn: '👹 Alert!', team_select: '👑 Assemble', battle: '⚔️ Battle!', battle_win: '🎉 Victory!', battle_lose: '😣 Defeat', codream: '🌙 CoDream', stats_update: '📈 Evolve', lifecycle: '🔄 Lifecycle' }[p] ?? p;
}
