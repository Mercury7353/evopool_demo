import {
  type Warrior, type Demon, type Domain, type BattleResult,
  type CoDreamInsight, type LifecycleEvent, type SimulationState,
  type LogEntry, type PoolStats, type Phase,
  DEMON_NAMES, WARRIOR_NAMES, WARRIOR_EMOJIS,
  DOMAIN_LABELS,
} from './types';

// === Random Utilities ===

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

let _nextId = 0;
const uid = () => `w_${++_nextId}`;

// === Warrior Creation ===

const DOMAINS: Domain[] = ['math', 'code', 'reasoning'];

export function createWarrior(
  taskIndex: number,
  bias?: Domain,
  parentId?: string,
): Warrior {
  const name = pick(WARRIOR_NAMES) + randInt(1, 99);
  const emoji = pick(WARRIOR_EMOJIS);

  const skills: Record<Domain, number> = { math: 0.3, code: 0.3, reasoning: 0.3 };
  if (bias) {
    skills[bias] = rand(0.5, 0.75);
    // Slight secondary skill
    const others = DOMAINS.filter(d => d !== bias);
    skills[pick(others)] = rand(0.3, 0.5);
  } else {
    // Generalist
    for (const d of DOMAINS) skills[d] = rand(0.3, 0.55);
  }

  return {
    id: uid(),
    name,
    emoji,
    skills,
    level: 1,
    tasksCompleted: 0,
    wins: 0,
    losses: 0,
    experiences: [],
    insights: [],
    alive: true,
    spawnedAt: taskIndex,
    parentId,
    consecutiveUnderperformance: 0,
  };
}

export function createInitialPool(): Warrior[] {
  const pool: Warrior[] = [];
  // 2 specialists per domain + 2 generalists = 8
  for (const d of DOMAINS) {
    pool.push(createWarrior(0, d));
    pool.push(createWarrior(0, d));
  }
  pool.push(createWarrior(0));
  pool.push(createWarrior(0));
  return pool;
}

// === Demon Creation ===

let _demonId = 0;

export function createDemon(taskIndex: number): Demon {
  const domain = pick(DOMAINS);
  // Difficulty ramps up slightly over time
  const baseDiff = Math.min(1 + Math.floor(taskIndex / 8), 5);
  const difficulty = clamp(baseDiff + randInt(-1, 1), 1, 5);
  const name = pick(DEMON_NAMES[domain]);
  const emojis = { math: '👹', code: '🐛', reasoning: '🐉' };
  const hp = difficulty * 20;

  return {
    id: `d_${++_demonId}`,
    domain,
    difficulty,
    name,
    emoji: emojis[domain],
    hp,
    maxHp: hp,
  };
}

// === Team Selection ===
// Selects top-k warriors by affinity to task domain + diversity bonus

export function selectTeam(warriors: Warrior[], demon: Demon, k = 3): string[] {
  const alive = warriors.filter(w => w.alive);
  if (alive.length <= k) return alive.map(w => w.id);

  const scored = alive.map(w => {
    const affinity = w.skills[demon.domain];
    // Diversity: prefer mixing specialists
    const primaryDomain = DOMAINS.reduce((best, d) =>
      w.skills[d] > w.skills[best] ? d : best, DOMAINS[0]);
    const diversityBonus = primaryDomain !== demon.domain ? 0.1 : 0;
    // Experience bonus
    const expBonus = Math.min(w.tasksCompleted * 0.01, 0.15);
    return { id: w.id, score: affinity + diversityBonus + expBonus + rand(0, 0.05) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.id);
}

// === Battle Resolution ===

export function resolveBattle(
  warriors: Warrior[],
  teamIds: string[],
  demon: Demon,
): BattleResult {
  const team = warriors.filter(w => teamIds.includes(w.id));
  const teamScores: Record<string, number> = {};

  // Each warrior contributes based on skill + randomness
  let totalPower = 0;
  for (const w of team) {
    const skill = w.skills[demon.domain];
    // Experience boost: warriors with relevant experience get a bonus
    const expBoost = w.experiences.filter(
      e => e.taskDomain === demon.domain && e.won
    ).length * 0.03;
    // Insight boost from CoDream
    const insightBoost = w.insights.length * 0.015;
    const power = clamp(skill + expBoost + insightBoost + rand(-0.15, 0.15), 0, 1);
    teamScores[w.id] = power;
    totalPower += power;
  }

  const teamAvg = totalPower / team.length;
  // Win threshold scales with difficulty
  const threshold = 0.3 + demon.difficulty * 0.08;
  const won = teamAvg >= threshold;

  return { won, teamScores, teamAvgScore: teamAvg, demon };
}

// === Individual Update ===

export function updateWarriorAfterBattle(
  warrior: Warrior,
  result: BattleResult,
  poolAvgScore: number,
): Warrior {
  const score = result.teamScores[warrior.id] ?? 0;
  const domain = result.demon.domain;
  const w = { ...warrior };

  // Skill update with adaptive learning rate
  const alpha = Math.max(0.1, 0.5 / (1 + w.tasksCompleted * 0.2));
  w.skills = { ...w.skills };
  w.skills[domain] = clamp(
    w.skills[domain] * (1 - alpha) + score * alpha,
    0.05, 0.99
  );

  // Minor cross-domain learning
  if (result.won) {
    for (const d of DOMAINS) {
      if (d !== domain) w.skills[d] = clamp(w.skills[d] + 0.005, 0.05, 0.99);
    }
  }

  w.tasksCompleted++;
  if (result.won) { w.wins++; w.consecutiveUnderperformance = 0; }
  else { w.losses++; }

  // Track underperformance
  if (score < poolAvgScore * 0.8) {
    w.consecutiveUnderperformance++;
  } else {
    w.consecutiveUnderperformance = Math.max(0, w.consecutiveUnderperformance - 1);
  }

  // Level up every 5 tasks
  w.level = 1 + Math.floor(w.tasksCompleted / 5);

  // Add experience
  const lessons = result.won
    ? [`Defeated ${result.demon.name} using ${DOMAIN_LABELS[domain]} tactics`]
    : [`Lost to ${result.demon.name} - need stronger ${DOMAIN_LABELS[domain]} approach`];

  w.experiences = [
    ...w.experiences,
    { taskDomain: domain, won: result.won, lesson: lessons[0], fromCoDream: false },
  ].slice(-20); // keep last 20

  return w;
}

// === CoDream ===

const CODREAM_INSIGHTS: Record<Domain, string[]> = {
  math: [
    'Break complex equations into sub-problems first',
    'Verify by substituting the answer back',
    'Look for symmetry and patterns before brute-forcing',
    'Check edge cases: zero, negative, infinity',
    'Use dimensional analysis to validate results',
  ],
  code: [
    'Write test cases before implementing the solution',
    'Consider time complexity before choosing algorithm',
    'Handle boundary conditions explicitly',
    'Use divide-and-conquer for recursive structures',
    'Trace through the algorithm with a small example first',
  ],
  reasoning: [
    'Map the causal chain before drawing conclusions',
    'Consider the contrapositive of each statement',
    'Eliminate impossible options systematically',
    'Check for hidden assumptions in the premise',
    'Break multi-hop reasoning into single-hop steps',
  ],
};

export function runCoDream(
  warriors: Warrior[],
  teamIds: string[],
  result: BattleResult,
): { warriors: Warrior[]; insights: CoDreamInsight[] } {
  const domain = result.demon.domain;
  const team = warriors.filter(w => teamIds.includes(w.id));
  const insights: CoDreamInsight[] = [];

  // Find best performer on team
  const bestId = teamIds.reduce((best, id) =>
    (result.teamScores[id] ?? 0) > (result.teamScores[best] ?? 0) ? id : best,
    teamIds[0]
  );

  const updatedWarriors = warriors.map(w => {
    if (!teamIds.includes(w.id)) return w;

    const updated = { ...w, skills: { ...w.skills }, insights: [...w.insights], experiences: [...w.experiences] };

    // REFLECT + CONTRAST: weaker warriors learn from best performer
    if (w.id !== bestId) {
      const best = team.find(t => t.id === bestId)!;
      const skillGap = best.skills[domain] - w.skills[domain];
      const boost = clamp(skillGap * rand(0.2, 0.4), 0.01, 0.08);

      updated.skills[domain] = clamp(updated.skills[domain] + boost, 0.05, 0.99);

      const insight = pick(CODREAM_INSIGHTS[domain]);
      updated.insights = [...updated.insights, insight].slice(-10);
      updated.experiences.push({
        taskDomain: domain,
        won: false,
        lesson: `[CoDream] Learned from ${best.name}: ${insight}`,
        fromCoDream: true,
      });

      insights.push({
        warriorId: w.id,
        insight,
        skillDelta: { [domain]: boost },
        fromWarriorId: bestId,
      });
    } else {
      // Best performer: self-reflection, smaller boost
      const boost = rand(0.01, 0.03);
      updated.skills[domain] = clamp(updated.skills[domain] + boost, 0.05, 0.99);

      const insight = pick(CODREAM_INSIGHTS[domain]);
      updated.insights = [...updated.insights, insight].slice(-10);

      insights.push({
        warriorId: w.id,
        insight: `Self-reflected: ${insight}`,
        skillDelta: { [domain]: boost },
      });
    }

    return updated;
  });

  return { warriors: updatedWarriors, insights };
}

// === Lifecycle Events ===

export function checkLifecycle(
  warriors: Warrior[],
  taskIndex: number,
): { warriors: Warrior[]; event: LifecycleEvent | null } {
  // Only check every 10 tasks
  if (taskIndex % 10 !== 0 || taskIndex === 0) return { warriors, event: null };

  const alive = warriors.filter(w => w.alive);

  // 1. PRUNE: remove chronically underperforming warriors
  const pruneCandidate = alive.find(w =>
    w.consecutiveUnderperformance >= 6 && w.tasksCompleted >= 8
  );
  if (pruneCandidate && alive.length > 5) {
    return {
      warriors: warriors.map(w =>
        w.id === pruneCandidate.id ? { ...w, alive: false } : w
      ),
      event: {
        type: 'prune',
        description: `${pruneCandidate.name} ${pruneCandidate.emoji} was too weak and faded away...`,
        involvedWarriors: [pruneCandidate.id],
        removedWarriorId: pruneCandidate.id,
      },
    };
  }

  // 2. FORK: split a strong generalist into specialists
  const forkCandidate = alive.find(w => {
    if (w.tasksCompleted < 8) return false;
    const vals = DOMAINS.map(d => w.skills[d]);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    // Generalist with decent skills
    return (max - min) < 0.15 && max > 0.5;
  });
  if (forkCandidate && alive.length < 15) {
    // Find two most-used domains
    const domainCounts: Record<Domain, number> = { math: 0, code: 0, reasoning: 0 };
    for (const e of forkCandidate.experiences) domainCounts[e.taskDomain]++;
    const sorted = DOMAINS.slice().sort((a, b) => domainCounts[b] - domainCounts[a]);

    const child = createWarrior(taskIndex, sorted[1], forkCandidate.id);
    // Child inherits some parent skills
    for (const d of DOMAINS) {
      child.skills[d] = clamp(forkCandidate.skills[d] * 0.8, 0.1, 0.9);
    }
    child.skills[sorted[1]] = clamp(forkCandidate.skills[sorted[1]] + 0.1, 0.1, 0.95);
    child.level = Math.max(1, forkCandidate.level - 1);

    // Parent specializes in their strongest domain
    const parent = { ...forkCandidate, skills: { ...forkCandidate.skills } };
    parent.skills[sorted[0]] = clamp(parent.skills[sorted[0]] + 0.1, 0.1, 0.95);

    return {
      warriors: [
        ...warriors.map(w => w.id === parent.id ? parent : w),
        child,
      ],
      event: {
        type: 'fork',
        description: `${forkCandidate.name} split into two specialists! ${child.name} ${child.emoji} was born!`,
        involvedWarriors: [forkCandidate.id],
        newWarriorId: child.id,
      },
    };
  }

  // 3. MERGE: combine two very similar warriors
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      if (a.tasksCompleted < 6 || b.tasksCompleted < 6) continue;
      const similarity = 1 - DOMAINS.reduce((sum, d) =>
        sum + Math.abs(a.skills[d] - b.skills[d]), 0) / DOMAINS.length;
      if (similarity > 0.93) {
        // Merge: keep the stronger one, boost with the other's strengths
        const [keeper, absorbed] = a.tasksCompleted >= b.tasksCompleted ? [a, b] : [b, a];
        const merged = { ...keeper, skills: { ...keeper.skills } };
        for (const d of DOMAINS) {
          merged.skills[d] = clamp(Math.max(keeper.skills[d], absorbed.skills[d]) + 0.02, 0.05, 0.99);
        }
        return {
          warriors: warriors.map(w => {
            if (w.id === keeper.id) return merged;
            if (w.id === absorbed.id) return { ...w, alive: false };
            return w;
          }),
          event: {
            type: 'merge',
            description: `${keeper.name} absorbed ${absorbed.name}'s power! Combined strength!`,
            involvedWarriors: [keeper.id, absorbed.id],
            removedWarriorId: absorbed.id,
          },
        };
      }
    }
  }

  // 4. GENESIS: spawn new warrior for uncovered domain
  const domainCoverage: Record<Domain, number> = { math: 0, code: 0, reasoning: 0 };
  for (const w of alive) {
    const best = DOMAINS.reduce((bd, d) => w.skills[d] > w.skills[bd] ? d : bd, DOMAINS[0]);
    domainCoverage[best]++;
  }
  const weakDomain = DOMAINS.find(d => domainCoverage[d] === 0);
  if (weakDomain && alive.length < 15) {
    const newWarrior = createWarrior(taskIndex, weakDomain);
    newWarrior.skills[weakDomain] = rand(0.55, 0.7);
    return {
      warriors: [...warriors, newWarrior],
      event: {
        type: 'genesis',
        description: `A new ${DOMAIN_LABELS[weakDomain]} specialist ${newWarrior.name} ${newWarrior.emoji} materialized!`,
        involvedWarriors: [],
        newWarriorId: newWarrior.id,
      },
    };
  }

  // 5. SPECIALIZE: reward a consistent high performer
  const specCandidate = alive.find(w => {
    if (w.tasksCompleted < 10) return false;
    const recentWins = w.experiences.slice(-8).filter(e => e.won).length;
    return recentWins >= 6;
  });
  if (specCandidate) {
    const bestDomain = DOMAINS.reduce((bd, d) =>
      specCandidate.skills[d] > specCandidate.skills[bd] ? d : bd, DOMAINS[0]);
    const boosted = {
      ...specCandidate,
      skills: { ...specCandidate.skills },
      level: specCandidate.level + 1,
    };
    boosted.skills[bestDomain] = clamp(boosted.skills[bestDomain] + 0.05, 0.05, 0.99);
    return {
      warriors: warriors.map(w => w.id === specCandidate.id ? boosted : w),
      event: {
        type: 'specialize',
        description: `${specCandidate.name} mastered ${DOMAIN_LABELS[bestDomain]}! Level up!`,
        involvedWarriors: [specCandidate.id],
      },
    };
  }

  return { warriors, event: null };
}

// === Pool Stats ===

export function computePoolStats(state: SimulationState): PoolStats {
  const alive = state.warriors.filter(w => w.alive);
  const avgSkills: Record<Domain, number> = { math: 0, code: 0, reasoning: 0 };

  for (const w of alive) {
    for (const d of DOMAINS) avgSkills[d] += w.skills[d];
  }
  for (const d of DOMAINS) avgSkills[d] /= Math.max(alive.length, 1);

  const prev = state.poolStats;
  const recentWins = state.eventLog
    .filter(e => e.type === 'win' || e.type === 'lose')
    .slice(-20);
  const winRate = recentWins.length > 0
    ? recentWins.filter(e => e.type === 'win').length / recentWins.length
    : 0;

  return {
    totalTasks: state.taskIndex,
    totalWins: prev.totalWins + (state.battleResult?.won ? 1 : 0),
    totalLosses: prev.totalLosses + (state.battleResult?.won === false ? 1 : 0),
    avgSkills,
    poolSize: alive.length,
    forks: prev.forks + (state.lifecycleEvent?.type === 'fork' ? 1 : 0),
    merges: prev.merges + (state.lifecycleEvent?.type === 'merge' ? 1 : 0),
    prunes: prev.prunes + (state.lifecycleEvent?.type === 'prune' ? 1 : 0),
    geneses: prev.geneses + (state.lifecycleEvent?.type === 'genesis' ? 1 : 0),
    winRateHistory: [...prev.winRateHistory, winRate].slice(-50),
  };
}

// === Phase Transitions ===

const PHASE_ORDER: Phase[] = [
  'idle', 'demon_spawn', 'team_select', 'battle',
  // branch: battle_win or battle_lose
  // if lose: codream
  'stats_update', 'lifecycle',
];

export function getNextPhase(state: SimulationState): Phase {
  switch (state.phase) {
    case 'idle': return 'demon_spawn';
    case 'demon_spawn': return 'team_select';
    case 'team_select': return 'battle';
    case 'battle': return state.battleResult?.won ? 'battle_win' : 'battle_lose';
    case 'battle_win': return 'stats_update';
    case 'battle_lose': return 'codream';
    case 'codream': return 'stats_update';
    case 'stats_update': return state.taskIndex % 10 === 0 && state.taskIndex > 0 ? 'lifecycle' : 'idle';
    case 'lifecycle': return 'idle';
    default: return 'idle';
  }
}

// === Phase Duration (ms) ===

export function getPhaseDuration(phase: Phase, speed: number): number {
  const base: Record<Phase, number> = {
    idle: 600,
    demon_spawn: 1200,
    team_select: 1200,
    battle: 2000,
    battle_win: 1200,
    battle_lose: 1200,
    codream: 2500,
    stats_update: 800,
    lifecycle: 2000,
  };
  return (base[phase] ?? 1000) * (speed / 100);
}

// === Step Simulation ===

export function stepPhase(state: SimulationState): SimulationState {
  const next = getNextPhase(state);
  let s = { ...state, phase: next };

  switch (next) {
    case 'demon_spawn': {
      const demon = createDemon(s.taskIndex);
      s.currentDemon = demon;
      s.taskIndex++;
      s.eventLog = [...s.eventLog, {
        taskIndex: s.taskIndex,
        text: `${demon.emoji} ${demon.name} (${DOMAIN_LABELS[demon.domain]} Lv.${demon.difficulty}) appeared!`,
        type: 'info',
        timestamp: Date.now(),
      }];
      break;
    }

    case 'team_select': {
      if (!s.currentDemon) break;
      const teamIds = selectTeam(s.warriors, s.currentDemon);
      s.selectedTeam = teamIds;
      const names = teamIds.map(id => s.warriors.find(w => w.id === id)!.name).join(', ');
      s.eventLog = [...s.eventLog, {
        taskIndex: s.taskIndex,
        text: `Team assembled: ${names}`,
        type: 'info',
        timestamp: Date.now(),
      }];
      break;
    }

    case 'battle': {
      if (!s.currentDemon) break;
      const result = resolveBattle(s.warriors, s.selectedTeam, s.currentDemon);
      s.battleResult = result;
      break;
    }

    case 'battle_win': {
      s.eventLog = [...s.eventLog, {
        taskIndex: s.taskIndex,
        text: `Victory! ${s.currentDemon?.name} was defeated!`,
        type: 'win',
        timestamp: Date.now(),
      }];
      break;
    }

    case 'battle_lose': {
      s.eventLog = [...s.eventLog, {
        taskIndex: s.taskIndex,
        text: `Defeat... ${s.currentDemon?.name} was too strong.`,
        type: 'lose',
        timestamp: Date.now(),
      }];
      break;
    }

    case 'codream': {
      if (!s.battleResult) break;
      const { warriors: updated, insights } = runCoDream(s.warriors, s.selectedTeam, s.battleResult);
      s.warriors = updated;
      s.codreamInsights = insights;
      s.eventLog = [...s.eventLog, {
        taskIndex: s.taskIndex,
        text: `CoDream: Warriors shared insights and grew stronger!`,
        type: 'codream',
        timestamp: Date.now(),
      }];
      break;
    }

    case 'stats_update': {
      if (!s.battleResult) break;
      const poolAvg = s.battleResult.teamAvgScore;
      s.warriors = s.warriors.map(w => {
        if (!s.selectedTeam.includes(w.id) || !w.alive) return w;
        return updateWarriorAfterBattle(w, s.battleResult!, poolAvg);
      });
      s.poolStats = computePoolStats(s);
      break;
    }

    case 'lifecycle': {
      const { warriors: updated, event } = checkLifecycle(s.warriors, s.taskIndex);
      s.warriors = updated;
      s.lifecycleEvent = event;
      if (event) {
        s.eventLog = [...s.eventLog, {
          taskIndex: s.taskIndex,
          text: `[${event.type.toUpperCase()}] ${event.description}`,
          type: 'lifecycle',
          timestamp: Date.now(),
        }];
      }
      s.poolStats = computePoolStats(s);
      break;
    }

    case 'idle': {
      // Reset transient state
      s.currentDemon = null;
      s.selectedTeam = [];
      s.battleResult = null;
      s.codreamInsights = [];
      s.lifecycleEvent = null;
      break;
    }
  }

  // Keep event log manageable
  if (s.eventLog.length > 100) s.eventLog = s.eventLog.slice(-80);

  return s;
}

// === Initial State ===

export function createInitialState(): SimulationState {
  return {
    phase: 'idle',
    taskIndex: 0,
    warriors: createInitialPool(),
    currentDemon: null,
    selectedTeam: [],
    battleResult: null,
    codreamInsights: [],
    lifecycleEvent: null,
    eventLog: [{
      taskIndex: 0,
      text: 'The EvoPool awakens... Warriors stand ready!',
      type: 'info',
      timestamp: Date.now(),
    }],
    poolStats: {
      totalTasks: 0,
      totalWins: 0,
      totalLosses: 0,
      avgSkills: { math: 0.4, code: 0.4, reasoning: 0.4 },
      poolSize: 8,
      forks: 0,
      merges: 0,
      prunes: 0,
      geneses: 0,
      winRateHistory: [],
    },
    speed: 100,
    running: false,
  };
}
