import { type SimulationState, type Warrior, type Domain, DOMAIN_COLORS, DOMAIN_LABELS } from '../types';

const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

interface SidebarProps {
  state: SimulationState;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function Sidebar({ state, onToggleRun, onStep, onReset, onSpeedChange }: SidebarProps) {
  const alive = state.warriors.filter(w => w.alive);
  const dead = state.warriors.filter(w => !w.alive);

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e] border-l border-[#2a2a4a]">
      {/* Header + Controls */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <h1 className="text-lg font-black tracking-tight mb-2">
          <span className="text-yellow-400">Evo</span>Pool
          <span className="text-gray-500 text-xs ml-2 font-normal">Warriors of Evolution</span>
        </h1>

        <div className="flex gap-2 mb-2">
          <button
            onClick={onToggleRun}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              state.running
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            }`}
          >
            {state.running ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={onStep}
            disabled={state.running}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 disabled:opacity-30"
          >
            ⏭ Step
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30"
          >
            ↻
          </button>
        </div>

        {/* Speed slider */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>🐢</span>
          <input
            type="range"
            min={30}
            max={200}
            value={state.speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className="flex-1 h-1 accent-purple-500"
          />
          <span>🐇</span>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="p-3 border-b border-[#2a2a4a]">
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <StatBox label="Tasks" value={state.poolStats.totalTasks} color="#3b82f6" />
          <StatBox label="Wins" value={state.poolStats.totalWins} color="#22c55e" />
          <StatBox label="Losses" value={state.poolStats.totalLosses} color="#ef4444" />
        </div>

        {/* Win Rate Sparkline */}
        {state.poolStats.winRateHistory.length > 1 && (
          <div className="mb-2">
            <div className="text-[10px] text-gray-500 mb-1">Win Rate Trend</div>
            <div className="sparkline">
              {state.poolStats.winRateHistory.slice(-30).map((wr, i) => (
                <div
                  key={i}
                  className="sparkline-bar"
                  style={{
                    height: `${Math.max(2, wr * 100)}%`,
                    background: wr > 0.6 ? '#22c55e' : wr > 0.3 ? '#fbbf24' : '#ef4444',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Avg Skills */}
        <div className="space-y-1.5">
          {DOMAINS.map(d => (
            <div key={d} className="flex items-center gap-2">
              <span className="text-[10px] w-16 text-gray-500">{DOMAIN_LABELS[d]}</span>
              <div className="flex-1 stat-bar">
                <div className="stat-bar-fill" style={{
                  width: `${state.poolStats.avgSkills[d] * 100}%`,
                  background: DOMAIN_COLORS[d],
                }}>
                  {(state.poolStats.avgSkills[d] * 100).toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lifecycle counters */}
        <div className="flex gap-3 mt-2 text-[10px] text-gray-500 justify-center">
          <span>🔀 {state.poolStats.forks}</span>
          <span>🔗 {state.poolStats.merges}</span>
          <span>💀 {state.poolStats.prunes}</span>
          <span>🌟 {state.poolStats.geneses}</span>
        </div>
      </div>

      {/* Warrior Roster */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs text-gray-500 px-1 mb-1">
          Warriors ({alive.length} active)
        </div>
        <div className="space-y-1.5">
          {alive
            .sort((a, b) => b.level - a.level || b.tasksCompleted - a.tasksCompleted)
            .map(w => (
              <WarriorCard
                key={w.id}
                warrior={w}
                isSelected={state.selectedTeam.includes(w.id)}
                isInBattle={state.selectedTeam.includes(w.id) &&
                  ['battle', 'battle_win', 'battle_lose'].includes(state.phase)}
              />
            ))}
          {dead.length > 0 && (
            <>
              <div className="text-xs text-gray-600 px-1 mt-3 mb-1">
                Fallen ({dead.length})
              </div>
              {dead.map(w => (
                <WarriorCard key={w.id} warrior={w} isSelected={false} isInBattle={false} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div className="h-44 border-t border-[#2a2a4a] overflow-y-auto p-2">
        <div className="text-xs text-gray-500 px-1 mb-1">Event Log</div>
        <div className="space-y-0">
          {[...state.eventLog].reverse().slice(0, 30).map((entry, i) => (
            <div key={i} className={`log-entry ${entry.type}`}>
              <span className="text-gray-600 mr-1">#{entry.taskIndex}</span>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarriorCard({ warrior: w, isSelected, isInBattle }: {
  warrior: Warrior;
  isSelected: boolean;
  isInBattle: boolean;
}) {
  const primaryDomain = DOMAINS.reduce((best, d) =>
    w.skills[d] > w.skills[best] ? d : best, DOMAINS[0]);

  return (
    <div className={`warrior-card ${isSelected ? 'selected' : ''} ${isInBattle ? 'in-battle' : ''} ${!w.alive ? 'dead' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{w.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{w.name}</span>
            <span className="text-[10px] text-gray-500">Lv.{w.level}</span>
            <span className="text-[10px] px-1 rounded" style={{
              background: `${DOMAIN_COLORS[primaryDomain]}22`,
              color: DOMAIN_COLORS[primaryDomain],
            }}>
              {DOMAIN_LABELS[primaryDomain]}
            </span>
          </div>
          <div className="flex gap-1 mt-1">
            {DOMAINS.map(d => (
              <div key={d} className="flex-1">
                <div className="skill-bar">
                  <div className="skill-bar-fill" style={{
                    width: `${w.skills[d] * 100}%`,
                    background: DOMAIN_COLORS[d],
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right text-[10px] text-gray-500 whitespace-nowrap">
          <div className="text-green-500">{w.wins}W</div>
          <div className="text-red-500">{w.losses}L</div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-1.5" style={{ background: `${color}11`, border: `1px solid ${color}22` }}>
      <div className="text-base font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
