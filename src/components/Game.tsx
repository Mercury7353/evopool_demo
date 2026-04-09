// Main game — PixiJS scene with ai-town visual layer + EvoPool simulation
import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage } from '@pixi/react';
import { type MapData } from './PixiStaticMap';
import PixiScene from './PixiScene';
import { characters } from '../data/characters';
import * as mapData from '../data/gentle.js';
import { createInitialState, stepPhase, getPhaseDuration } from '../simulation';
import type { SimulationState, Warrior, Domain } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';

const TILE_DIM = mapData.tiledim;       // 32
const MAP_W = mapData.screenxtiles;     // 45
const MAP_H = mapData.screenytiles;     // 32
const WORLD_W = MAP_W * TILE_DIM;       // 1440
const WORLD_H = MAP_H * TILE_DIM;      // 1024
const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

// Build MapData from gentle.js for PixiStaticMap
const worldMap: MapData = {
  tileSetUrl: '/assets/gentle-obj.png',
  tileSetDimX: mapData.tilesetpxw,
  tileSetDimY: mapData.tilesetpxh,
  tileDim: TILE_DIM,
  bgTiles: mapData.bgtiles,
  objectTiles: mapData.objmap,
  animatedSprites: mapData.animatedsprites ?? [],
};

// ── Entity state for warriors ────────────────────────────────
interface WEntity {
  id: string;
  charIdx: number;  // index into characters[] (f1-f8)
  x: number;
  y: number;
  tx: number;
  ty: number;
  homeX: number;
  homeY: number;
  orientation: number; // degrees: 0=right, 90=down, 180=left, 270=up
  isMoving: boolean;
  emoji: string;
  label: string;
  isThinking: boolean;
  isSpeaking: boolean;
  isSelected: boolean;
}

// Home positions in tile coords spread around the ai-town village
const HOME_TILES = [
  {x:10,y:14},{x:12,y:16},{x:8,y:18},{x:14,y:12},{x:16,y:14},
  {x:18,y:16},{x:20,y:14},{x:22,y:12},{x:24,y:18},{x:26,y:14},
  {x:11,y:20},{x:13,y:22},{x:15,y:20},{x:17,y:22},{x:19,y:20},
  {x:21,y:22},{x:23,y:20},{x:25,y:22},{x:9,y:22},{x:27,y:18},
];

// Battle formation positions
const BATTLE_AREA = { x: 20, y: 8 }; // tile coords — open area on the map
const BATTLE_POS = [
  {x: (BATTLE_AREA.x-1)*TILE_DIM, y: (BATTLE_AREA.y)*TILE_DIM},
  {x: (BATTLE_AREA.x)*TILE_DIM,   y: (BATTLE_AREA.y+1)*TILE_DIM},
  {x: (BATTLE_AREA.x+1)*TILE_DIM, y: (BATTLE_AREA.y)*TILE_DIM},
];
const MONSTER_POS = {x: (BATTLE_AREA.x+4)*TILE_DIM, y: (BATTLE_AREA.y)*TILE_DIM};
const CODREAM_AREA = {x: 8*TILE_DIM, y: 10*TILE_DIM};

// ── Notifications ────────────────────────────────────────────
interface Toast { id: number; text: string; type: string; time: number; }
let _tid = 0;

// ══════════════════════════════════════════════════════════════
export default function Game() {
  const [dims, setDims] = useState({w: window.innerWidth, h: window.innerHeight});
  const [sim, setSim] = useState<SimulationState>(createInitialState);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [entities, setEntities] = useState<WEntity[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLogLen = useRef(0);
  const [popup, setPopup] = useState<Warrior|null>(null);

  // Responsive resize
  useEffect(() => {
    const onResize = () => setDims({w: window.innerWidth, h: window.innerHeight});
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-advance simulation
  useEffect(() => {
    if (!sim.running) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    const dur = getPhaseDuration(sim.phase, sim.speed);
    timerRef.current = setTimeout(() => setSim(p => p.running ? stepPhase(p) : p), dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [sim.running, sim.phase, sim.speed, sim.taskIndex]);

  // Sync entities from simulation
  useEffect(() => {
    const alive = sim.warriors.filter(w => w.alive);
    const phase = sim.phase;

    const newEnts: WEntity[] = alive.map((w, i) => {
      const home = HOME_TILES[i % HOME_TILES.length];
      const prev = entities.find(e => e.id === w.id);
      const hx = home.x * TILE_DIM;
      const hy = home.y * TILE_DIM;

      const base: WEntity = {
        id: w.id,
        charIdx: i % characters.length,
        x: prev?.x ?? hx,
        y: prev?.y ?? hy,
        tx: hx + (Math.random()-0.5)*64,
        ty: hy + (Math.random()-0.5)*48,
        homeX: hx, homeY: hy,
        orientation: prev?.orientation ?? 90,
        isMoving: true,
        emoji: '',
        label: '',
        isThinking: false,
        isSpeaking: false,
        isSelected: false,
      };

      // Phase overrides
      if (phase === 'team_select' && sim.selectedTeam.includes(w.id)) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = BATTLE_POS[ti].x;
        base.ty = BATTLE_POS[ti].y;
        base.isSelected = true;
        base.label = `${w.name} L${w.level}`;
      }
      if ((phase === 'battle' || phase === 'battle_win' || phase === 'battle_lose') && sim.selectedTeam.includes(w.id)) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = BATTLE_POS[ti].x;
        base.ty = BATTLE_POS[ti].y;
        base.x = BATTLE_POS[ti].x;
        base.y = BATTLE_POS[ti].y;
        base.isMoving = false;
        base.isSelected = true;
        base.label = `${w.name} L${w.level}`;
        if (phase === 'battle') base.emoji = '⚔️';
        if (phase === 'battle_win') base.emoji = '🎉';
        if (phase === 'battle_lose') base.emoji = '😔';
      }
      if (phase === 'codream' && sim.selectedTeam.includes(w.id)) {
        const ti = sim.selectedTeam.indexOf(w.id);
        base.tx = CODREAM_AREA.x + ti * 40;
        base.ty = CODREAM_AREA.y;
        base.isThinking = true;
        base.label = w.name;
        const ins = sim.codreamInsights.find(ci => ci.warriorId === w.id);
        if (ins) base.isSpeaking = true;
      }
      if (phase === 'stats_update' && sim.selectedTeam.includes(w.id)) {
        base.emoji = '⬆️';
      }
      if (phase === 'lifecycle' && sim.lifecycleEvent?.involvedWarriors.includes(w.id)) {
        base.emoji = sim.lifecycleEvent.type === 'prune' ? '💀' :
                     sim.lifecycleEvent.type === 'fork' ? '🔀' :
                     sim.lifecycleEvent.type === 'genesis' ? '🌟' :
                     sim.lifecycleEvent.type === 'specialize' ? '⬆️' : '🔗';
        base.label = w.name;
      }

      return base;
    });

    setEntities(newEnts);
  }, [sim.phase, sim.taskIndex, sim.warriors]);

  // Animate entity movement
  useEffect(() => {
    const interval = setInterval(() => {
      setEntities(prev => prev.map(e => {
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 2) return {...e, isMoving: false};
        const speed = 1.5; // pixels per tick
        const nx = e.x + (dx/dist)*Math.min(speed, dist);
        const ny = e.y + (dy/dist)*Math.min(speed, dist);
        // Calculate orientation: 0=right, 90=down, 180=left, 270=up
        let orient = e.orientation;
        if (Math.abs(dx) > Math.abs(dy)) orient = dx > 0 ? 0 : 180;
        else orient = dy > 0 ? 90 : 270;
        return {...e, x: nx, y: ny, orientation: orient, isMoving: true};
      }));
    }, 33); // ~30fps movement
    return () => clearInterval(interval);
  }, []);

  // Toasts
  useEffect(() => {
    if (sim.eventLog.length > prevLogLen.current) {
      const fresh = sim.eventLog.slice(prevLogLen.current);
      setToasts(prev => [...prev, ...fresh.map(e => ({id: ++_tid, text: e.text, type: e.type, time: Date.now()}))].slice(-5));
    }
    prevLogLen.current = sim.eventLog.length;
  }, [sim.eventLog.length]);

  useEffect(() => {
    const iv = setInterval(() => setToasts(p => p.filter(t => Date.now()-t.time < 5000)), 500);
    return () => clearInterval(iv);
  }, []);

  const toggleRun = useCallback(() => setSim(p => ({...p, running: !p.running})), []);
  const step = useCallback(() => setSim(p => stepPhase(p)), []);
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSim(createInitialState());
    prevLogLen.current = 0;
    setEntities([]);
  }, []);
  const setSpeed = useCallback((s: number) => setSim(p => ({...p, speed: s})), []);

  const ps = sim.poolStats;
  const winRate = ps.totalTasks > 0 ? Math.round((ps.totalWins/ps.totalTasks)*100) : 0;

  // Warrior popup on click
  const onWarriorClick = useCallback((wId: string) => {
    const w = sim.warriors.find(w => w.id === wId);
    if (w) setPopup(w);
  }, [sim.warriors]);

  const gameH = dims.h - 42; // minus control bar

  return (
    <div className="game-wrapper">
      {/* PixiJS Stage */}
      <Stage
        width={dims.w}
        height={gameH}
        options={{ backgroundColor: 0x7ab5ff, antialias: false }}
      >
        <PixiScene
          width={dims.w}
          height={gameH}
          worldWidth={WORLD_W}
          worldHeight={WORLD_H}
          map={worldMap}
          entities={entities}
          onWarriorClick={onWarriorClick}
        />
      </Stage>

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
        <StatBox label="Task" value={`#${sim.taskIndex}`} />
        <StatBox label="Win" value={String(ps.totalWins)} cls="stat-win" />
        <StatBox label="Lose" value={String(ps.totalLosses)} cls="stat-lose" />
        <StatBox label="Rate" value={`${winRate}%`} />
        <StatBox label="Warriors" value={String(sim.warriors.filter(w=>w.alive).length)} />
        <div className="stat-divider" />
        <div className="stat-group">
          <span className="stat-label">Phase</span>
          <span className={`phase-tag phase-${sim.phase}`}>{phaseLabel(sim.phase)}</span>
        </div>
        <div className="lifecycle-counts">
          🔀{ps.forks} 🔗{ps.merges} 💀{ps.prunes} 🌟{ps.geneses}
        </div>
      </div>

      {/* Warrior popup */}
      {popup && (
        <div className="popup-overlay" onClick={() => setPopup(null)}>
          <div className="warrior-popup" onClick={e => e.stopPropagation()}>
            <WarriorDetail warrior={popup} onClose={() => setPopup(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────
function StatBox({label, value, cls}: {label: string; value: string; cls?: string}) {
  return <div className="stat-group"><span className="stat-label">{label}</span><span className={`stat-value ${cls??''}`}>{value}</span></div>;
}

function WarriorDetail({warrior: w, onClose}: {warrior: Warrior; onClose: () => void}) {
  const primary = DOMAINS.reduce((b, d) => w.skills[d] > w.skills[b] ? d : b, DOMAINS[0]);
  return (
    <div className="wd">
      <div className="wd-header">
        <span className="wd-emoji">{w.emoji}</span>
        <div>
          <div className="wd-name">{w.name} <span className="wd-level">Lv.{w.level}</span></div>
          <div className="wd-class" style={{color: DOMAIN_COLORS[primary]}}>{DOMAIN_LABELS[primary]} Specialist</div>
        </div>
        <button className="wd-close" onClick={onClose}>✕</button>
      </div>
      <div className="wd-skills">
        {DOMAINS.map(d => (
          <div key={d} className="wd-skill-row">
            <span className="wd-skill-label">{DOMAIN_LABELS[d]}</span>
            <div className="wd-bar"><div className="wd-bar-fill" style={{width:`${w.skills[d]*100}%`, background: DOMAIN_COLORS[d]}} /></div>
            <span className="wd-skill-val">{(w.skills[d]*100).toFixed(0)}</span>
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
          <div className="wd-insights-title">Recent Insights</div>
          {w.insights.slice(-3).map((ins, i) => <div key={i} className="wd-insight">{ins}</div>)}
        </div>
      )}
    </div>
  );
}

function phaseLabel(p: string): string {
  const m: Record<string,string> = {
    idle:'Ready', demon_spawn:'Demon!', team_select:'Assembling',
    battle:'Battle!', battle_win:'Victory!', battle_lose:'Defeat',
    codream:'CoDream', stats_update:'Evolving', lifecycle:'Lifecycle',
  };
  return m[p] ?? p;
}
