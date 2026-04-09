import { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import { GAME_W, GAME_H } from '../game/renderer';
import { createInitialState, stepPhase, getPhaseDuration } from '../simulation';
import type { SimulationState, Warrior, Domain, LogEntry } from '../types';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '../types';

const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

// ── Notification ─────────────────────────────────────────────
interface Toast {
  id: number;
  text: string;
  type: string;
  time: number;
}
let _toastId = 0;

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<SimulationState>(createInitialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [popup, setPopup] = useState<{ warrior: Warrior; x: number; y: number } | null>(null);
  const prevLogLen = useRef(0);

  // Init engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.start();
    return () => engine.stop();
  }, []);

  // Sync state to engine
  useEffect(() => {
    engineRef.current?.syncState(state);
  }, [state]);

  // Auto-advance
  useEffect(() => {
    if (!state.running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    const dur = getPhaseDuration(state.phase, state.speed);
    timerRef.current = setTimeout(() => {
      setState(prev => prev.running ? stepPhase(prev) : prev);
    }, dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state.running, state.phase, state.speed, state.taskIndex]);

  // Toasts from event log
  useEffect(() => {
    if (state.eventLog.length > prevLogLen.current) {
      const newEntries = state.eventLog.slice(prevLogLen.current);
      const newToasts = newEntries.map(e => ({
        id: ++_toastId,
        text: e.text,
        type: e.type,
        time: Date.now(),
      }));
      setToasts(prev => [...prev, ...newToasts].slice(-5));
    }
    prevLogLen.current = state.eventLog.length;
  }, [state.eventLog.length]);

  // Expire toasts
  useEffect(() => {
    const interval = setInterval(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.time < 4000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_W / rect.width;
    const scaleY = GAME_H / rect.height;
    const gx = (e.clientX - rect.left) * scaleX;
    const gy = (e.clientY - rect.top) * scaleY;

    const entity = engine.getEntityAt(gx, gy);
    if (entity && entity.type === 'warrior') {
      const warrior = state.warriors.find(w => w.id === entity.id);
      if (warrior) {
        setPopup({ warrior, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setPopup(null);
  }, [state.warriors]);

  const toggleRun = useCallback(() => setState(p => ({ ...p, running: !p.running })), []);
  const step = useCallback(() => setState(p => stepPhase(p)), []);
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    engineRef.current?.entities.clear();
    setState(createInitialState());
    prevLogLen.current = 0;
  }, []);
  const setSpeed = useCallback((s: number) => setState(p => ({ ...p, speed: s })), []);

  const { poolStats: ps } = state;
  const winRate = ps.totalTasks > 0
    ? Math.round((ps.totalWins / ps.totalTasks) * 100) : 0;

  return (
    <div className="game-wrapper">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_W}
        height={GAME_H}
        className="game-canvas"
        onClick={handleClick}
      />

      {/* Title */}
      <div className="game-title">
        <span className="title-evo">Evo</span>Pool
        <span className="title-sub"> Village</span>
      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="control-bar">
        <button className={`ctrl-btn ${state.running ? 'btn-stop' : 'btn-play'}`} onClick={toggleRun}>
          {state.running ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={step} disabled={state.running}>⏭</button>
        <div className="speed-control">
          <span>🐢</span>
          <input
            type="range" min={30} max={200} value={state.speed}
            onChange={e => setSpeed(Number(e.target.value))}
          />
          <span>🐇</span>
        </div>
        <button className="ctrl-btn" onClick={reset}>↻</button>

        <div className="stat-divider" />

        <div className="stat-group">
          <span className="stat-label">Task</span>
          <span className="stat-value">#{state.taskIndex}</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Win</span>
          <span className="stat-value stat-win">{ps.totalWins}</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Lose</span>
          <span className="stat-value stat-lose">{ps.totalLosses}</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Rate</span>
          <span className="stat-value">{winRate}%</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Warriors</span>
          <span className="stat-value">{state.warriors.filter(w => w.alive).length}</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-group">
          <span className="stat-label">Phase</span>
          <span className={`phase-tag phase-${state.phase}`}>{phaseLabel(state.phase)}</span>
        </div>

        <div className="lifecycle-counts">
          🔀{ps.forks} 🔗{ps.merges} 💀{ps.prunes} 🌟{ps.geneses}
        </div>
      </div>

      {/* Warrior popup */}
      {popup && (
        <div
          className="popup-overlay"
          onClick={() => setPopup(null)}
        >
          <div
            className="warrior-popup"
            style={{ left: Math.min(popup.x, window.innerWidth - 250), top: Math.max(popup.y - 200, 10) }}
            onClick={e => e.stopPropagation()}
          >
            <WarriorDetail warrior={popup.warrior} />
          </div>
        </div>
      )}
    </div>
  );
}

function WarriorDetail({ warrior: w }: { warrior: Warrior }) {
  const primary = DOMAINS.reduce((best, d) =>
    w.skills[d] > w.skills[best] ? d : best, DOMAINS[0]);

  return (
    <div className="wd">
      <div className="wd-header">
        <span className="wd-emoji">{w.emoji}</span>
        <div>
          <div className="wd-name">{w.name} <span className="wd-level">Lv.{w.level}</span></div>
          <div className="wd-class" style={{ color: DOMAIN_COLORS[primary] }}>
            {DOMAIN_LABELS[primary]} Specialist
          </div>
        </div>
      </div>

      <div className="wd-skills">
        {DOMAINS.map(d => (
          <div key={d} className="wd-skill-row">
            <span className="wd-skill-label">{DOMAIN_LABELS[d]}</span>
            <div className="wd-bar">
              <div
                className="wd-bar-fill"
                style={{ width: `${w.skills[d] * 100}%`, background: DOMAIN_COLORS[d] }}
              />
            </div>
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
          <div className="wd-insights-title">Recent Insights</div>
          {w.insights.slice(-3).map((ins, i) => (
            <div key={i} className="wd-insight">{ins}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    idle: 'Ready', demon_spawn: 'Demon!', team_select: 'Assembling',
    battle: 'Battle!', battle_win: 'Victory!', battle_lose: 'Defeat',
    codream: 'CoDream', stats_update: 'Evolving', lifecycle: 'Lifecycle',
  };
  return labels[phase] ?? phase;
}
