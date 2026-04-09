import { type SimulationState, DOMAIN_COLORS, DOMAIN_LABELS, type Domain } from '../types';

const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

interface ArenaProps {
  state: SimulationState;
}

export default function Arena({ state }: ArenaProps) {
  const { phase, currentDemon, selectedTeam, warriors, battleResult, codreamInsights, lifecycleEvent } = state;
  const teamWarriors = warriors.filter(w => selectedTeam.includes(w.id));

  return (
    <div className="arena w-full h-full flex flex-col items-center justify-center p-6 relative">
      {/* Phase Label */}
      <div className="absolute top-4 left-4 z-20">
        <PhaseIndicator phase={phase} />
      </div>

      {/* Task Counter */}
      <div className="absolute top-4 right-4 text-sm text-gray-400 z-20">
        Task #{state.taskIndex}
      </div>

      {/* Main Arena Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-6 relative">

        {/* IDLE: Show pool overview */}
        {phase === 'idle' && (
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-3">
              {warriors.filter(w => w.alive).map(w => (
                <span key={w.id} className="inline-block mx-1 animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                  {w.emoji}
                </span>
              ))}
            </div>
            <p className="text-gray-400 text-sm">Warriors await the next challenge...</p>
          </div>
        )}

        {/* DEMON SPAWN */}
        {(phase === 'demon_spawn' || phase === 'team_select' || phase === 'battle' ||
          phase === 'battle_win' || phase === 'battle_lose') && currentDemon && (
          <div className="flex flex-col items-center gap-8 w-full">
            {/* Demon */}
            <div className={`demon-container flex flex-col items-center ${
              phase === 'battle_win' ? 'opacity-0 scale-150 transition-all duration-700' : ''
            }`}>
              <div className={`demon-body ${phase === 'battle_win' ? 'dead' : ''} ${
                phase === 'battle' ? 'animate-float' : 'animate-spawn'
              }`}>
                {currentDemon.emoji}
              </div>
              <div className="mt-2 text-center">
                <div className="font-bold text-red-400 text-lg">{currentDemon.name}</div>
                <div className="flex items-center gap-2 justify-center mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: `${DOMAIN_COLORS[currentDemon.domain]}22`,
                    color: DOMAIN_COLORS[currentDemon.domain],
                    border: `1px solid ${DOMAIN_COLORS[currentDemon.domain]}44`,
                  }}>
                    {DOMAIN_LABELS[currentDemon.domain]}
                  </span>
                  <span className="text-xs text-yellow-400">
                    {'⭐'.repeat(currentDemon.difficulty)}
                  </span>
                </div>
                {/* HP Bar */}
                {phase === 'battle' && (
                  <div className="mt-2 w-32 mx-auto">
                    <div className="skill-bar" style={{ height: 8 }}>
                      <div className="skill-bar-fill bg-red-500" style={{
                        width: `${(currentDemon.hp / currentDemon.maxHp) * 100}%`,
                      }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VS divider */}
            {(phase === 'battle' || phase === 'battle_win' || phase === 'battle_lose') && (
              <div className="text-2xl font-black text-yellow-400 animate-glow-pulse" style={{ color: '#fbbf24' }}>
                ⚔️ VS ⚔️
              </div>
            )}

            {/* Team */}
            {selectedTeam.length > 0 && (
              <div className="flex gap-6 items-end">
                {teamWarriors.map((w, i) => (
                  <div key={w.id} className={`battle-warrior flex flex-col items-center ${
                    phase === 'battle' ? 'animate-float' : 'animate-bounce-in'
                  } ${phase === 'battle_lose' ? 'animate-shake' : ''}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    <div className="text-4xl mb-1">{w.emoji}</div>
                    <div className="text-sm font-semibold">{w.name}</div>
                    <div className="text-xs text-gray-400">Lv.{w.level}</div>
                    {/* Skill relevant to this demon */}
                    {currentDemon && (
                      <div className="mt-1 flex items-center gap-1">
                        <div className="w-16 skill-bar">
                          <div className="skill-bar-fill" style={{
                            width: `${w.skills[currentDemon.domain] * 100}%`,
                            background: DOMAIN_COLORS[currentDemon.domain],
                          }} />
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {(w.skills[currentDemon.domain] * 100).toFixed(0)}
                        </span>
                      </div>
                    )}
                    {/* Battle score */}
                    {battleResult && battleResult.teamScores[w.id] !== undefined && (
                      <div className={`mt-1 text-xs font-bold ${
                        battleResult.won ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(battleResult.teamScores[w.id] * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Result banner */}
            {phase === 'battle_win' && (
              <div className="animate-bounce-in text-center">
                <div className="text-3xl font-black text-green-400 drop-shadow-lg">VICTORY!</div>
                <div className="text-sm text-green-300 mt-1">Warriors grow stronger!</div>
              </div>
            )}
            {phase === 'battle_lose' && (
              <div className="animate-bounce-in text-center">
                <div className="text-3xl font-black text-red-400 drop-shadow-lg">DEFEAT</div>
                <div className="text-sm text-red-300 mt-1">Time to CoDream and learn...</div>
              </div>
            )}
          </div>
        )}

        {/* CODREAM OVERLAY */}
        {phase === 'codream' && (
          <div className="codream-overlay">
            <div className="text-3xl mb-4">💭✨🌙</div>
            <div className="text-lg font-bold text-purple-300 mb-4">CoDream Session</div>
            <div className="text-xs text-purple-400 mb-3">Warriors share insights from failure...</div>
            <div className="flex flex-col gap-2 max-w-md">
              {codreamInsights.map((insight, i) => {
                const w = warriors.find(w => w.id === insight.warriorId);
                const fromW = insight.fromWarriorId ? warriors.find(w => w.id === insight.fromWarriorId) : null;
                return (
                  <div key={i} className="codream-bubble" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{w?.emoji}</span>
                      <span className="font-semibold text-purple-200">{w?.name}</span>
                      {fromW && (
                        <span className="text-purple-400 text-[10px]">
                          ← learned from {fromW.emoji} {fromW.name}
                        </span>
                      )}
                    </div>
                    <div className="text-purple-200 text-xs">{insight.insight}</div>
                    <div className="mt-1 text-[10px] text-green-400">
                      {Object.entries(insight.skillDelta).map(([d, v]) =>
                        `${DOMAIN_LABELS[d as Domain]} +${((v as number) * 100).toFixed(1)}%`
                      ).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATS UPDATE */}
        {phase === 'stats_update' && (
          <div className="text-center animate-fade-in">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-lg font-semibold text-blue-300">Stats Updated</div>
            <div className="text-sm text-gray-400 mt-2">
              Warriors: {warriors.filter(w => w.alive).length} |
              Win Rate: {state.poolStats.winRateHistory.length > 0
                ? `${(state.poolStats.winRateHistory[state.poolStats.winRateHistory.length - 1] * 100).toFixed(0)}%`
                : 'N/A'
              }
            </div>
          </div>
        )}

        {/* LIFECYCLE EVENT */}
        {phase === 'lifecycle' && lifecycleEvent && (
          <div className={`lifecycle-overlay ${lifecycleEvent.type}`}>
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4">
                {lifecycleEvent.type === 'fork' && '🔀'}
                {lifecycleEvent.type === 'merge' && '🔗'}
                {lifecycleEvent.type === 'prune' && '💀'}
                {lifecycleEvent.type === 'genesis' && '🌟'}
                {lifecycleEvent.type === 'specialize' && '⬆️'}
              </div>
              <div className="text-xl font-black mb-2" style={{
                color: lifecycleEvent.type === 'fork' ? '#3b82f6' :
                  lifecycleEvent.type === 'merge' ? '#a855f7' :
                  lifecycleEvent.type === 'prune' ? '#ef4444' :
                  lifecycleEvent.type === 'genesis' ? '#22c55e' : '#fbbf24'
              }}>
                {lifecycleEvent.type.toUpperCase()}
              </div>
              <div className="text-sm text-gray-300">{lifecycleEvent.description}</div>
              {/* Show involved warriors */}
              <div className="flex gap-3 justify-center mt-4">
                {lifecycleEvent.involvedWarriors.map(id => {
                  const w = warriors.find(w => w.id === id);
                  return w ? (
                    <div key={id} className={`text-center ${
                      lifecycleEvent.type === 'prune' ? 'animate-prune' :
                      lifecycleEvent.type === 'fork' ? 'animate-fork-left' : ''
                    }`}>
                      <div className="text-3xl">{w.emoji}</div>
                      <div className="text-xs mt-1">{w.name}</div>
                    </div>
                  ) : null;
                })}
                {lifecycleEvent.newWarriorId && (() => {
                  const nw = warriors.find(w => w.id === lifecycleEvent.newWarriorId);
                  return nw ? (
                    <div className={`text-center ${
                      lifecycleEvent.type === 'fork' ? 'animate-fork-right' : 'animate-genesis'
                    }`}>
                      <div className="text-3xl">{nw.emoji}</div>
                      <div className="text-xs mt-1">{nw.name}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        )}

        {phase === 'lifecycle' && !lifecycleEvent && (
          <div className="text-center animate-fade-in">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm text-gray-400">Lifecycle check... Pool is stable.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    idle: { label: 'Ready', color: '#94a3b8', bg: '#1e293b' },
    demon_spawn: { label: 'Demon Appears!', color: '#ef4444', bg: '#450a0a' },
    team_select: { label: 'Team Selection', color: '#fbbf24', bg: '#451a03' },
    battle: { label: 'Battle!', color: '#f97316', bg: '#431407' },
    battle_win: { label: 'Victory!', color: '#22c55e', bg: '#052e16' },
    battle_lose: { label: 'Defeat...', color: '#ef4444', bg: '#450a0a' },
    codream: { label: 'CoDream', color: '#a855f7', bg: '#2e1065' },
    stats_update: { label: 'Evolving', color: '#3b82f6', bg: '#172554' },
    lifecycle: { label: 'Lifecycle', color: '#fbbf24', bg: '#451a03' },
  };

  const c = config[phase] || config.idle;

  return (
    <div className="phase-badge" style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}33` }}>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.color }} />
      {c.label}
    </div>
  );
}
