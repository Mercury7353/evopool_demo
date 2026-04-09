// === Domain & Task Types ===

export type Domain = 'math' | 'code' | 'reasoning';

export const DOMAIN_COLORS: Record<Domain, string> = {
  math: '#3b82f6',      // blue
  code: '#22c55e',      // green
  reasoning: '#f59e0b', // amber
};

export const DOMAIN_ICONS: Record<Domain, string> = {
  math: '🔢',
  code: '💻',
  reasoning: '🧠',
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  math: 'Math',
  code: 'Code',
  reasoning: 'Reasoning',
};

// === Warrior (Agent) ===

export interface Warrior {
  id: string;
  name: string;
  emoji: string;
  skills: Record<Domain, number>;    // 0-1 per domain
  level: number;
  tasksCompleted: number;
  wins: number;
  losses: number;
  experiences: Experience[];
  insights: string[];
  alive: boolean;
  spawnedAt: number;                  // task index when created
  parentId?: string;                  // if forked
  consecutiveUnderperformance: number;
}

export interface Experience {
  taskDomain: Domain;
  won: boolean;
  lesson: string;
  fromCoDream: boolean;
}

// === Demon (Task) ===

export interface Demon {
  id: string;
  domain: Domain;
  difficulty: number;   // 1-5
  name: string;
  emoji: string;
  hp: number;           // for battle animation
  maxHp: number;
}

// === Battle ===

export interface BattleResult {
  won: boolean;
  teamScores: Record<string, number>;  // warrior id -> contribution
  teamAvgScore: number;
  demon: Demon;
}

// === Lifecycle Events ===

export type LifecycleEventType = 'fork' | 'merge' | 'prune' | 'genesis' | 'specialize';

export interface LifecycleEvent {
  type: LifecycleEventType;
  description: string;
  involvedWarriors: string[];    // warrior ids
  newWarriorId?: string;
  removedWarriorId?: string;
}

// === Simulation State Machine ===

export type Phase =
  | 'idle'
  | 'demon_spawn'
  | 'team_select'
  | 'battle'
  | 'battle_win'
  | 'battle_lose'
  | 'codream'
  | 'stats_update'
  | 'lifecycle';

export interface SimulationState {
  phase: Phase;
  taskIndex: number;
  warriors: Warrior[];
  currentDemon: Demon | null;
  selectedTeam: string[];         // warrior ids
  battleResult: BattleResult | null;
  codreamInsights: CoDreamInsight[];
  lifecycleEvent: LifecycleEvent | null;
  eventLog: LogEntry[];
  poolStats: PoolStats;
  speed: number;                  // ms per phase
  running: boolean;
}

export interface CoDreamInsight {
  warriorId: string;
  insight: string;
  skillDelta: Partial<Record<Domain, number>>;
  fromWarriorId?: string;
}

export interface LogEntry {
  taskIndex: number;
  text: string;
  type: 'info' | 'battle' | 'win' | 'lose' | 'codream' | 'lifecycle' | 'evolution';
  timestamp: number;
}

export interface PoolStats {
  totalTasks: number;
  totalWins: number;
  totalLosses: number;
  avgSkills: Record<Domain, number>;
  poolSize: number;
  forks: number;
  merges: number;
  prunes: number;
  geneses: number;
  winRateHistory: number[];       // rolling window
}

// === Demon Name Templates ===

export const DEMON_NAMES: Record<Domain, string[]> = {
  math: [
    'Integral Fiend', 'Fractal Wraith', 'Prime Devourer', 'Equation Hydra',
    'Matrix Phantom', 'Calculus Golem', 'Algebra Shade', 'Geometry Basilisk',
  ],
  code: [
    'Null Pointer Horror', 'Stack Overflow Titan', 'Deadlock Demon',
    'Memory Leak Specter', 'Recursive Abyss', 'Bug Swarm', 'Syntax Serpent',
    'Race Condition Beast',
  ],
  reasoning: [
    'Paradox Dragon', 'Logic Maze Hydra', 'Inference Shadow',
    'Causality Wraith', 'Syllogism Sphinx', 'Fallacy Chimera',
    'Abstraction Void', 'Deduction Revenant',
  ],
};

export const WARRIOR_NAMES = [
  'Axiom', 'Binary', 'Cipher', 'Delta', 'Epoch', 'Flux',
  'Glyph', 'Helix', 'Infer', 'Jolt', 'Kappa', 'Lambda',
  'Morph', 'Nexus', 'Omega', 'Pixel', 'Qubit', 'Rune',
  'Sigma', 'Theta', 'Unity', 'Vex', 'Warp', 'Xenon',
  'Yield', 'Zeta', 'Aura', 'Blaze', 'Crest', 'Drift',
];

export const WARRIOR_EMOJIS = [
  '⚔️', '🗡️', '🛡️', '🏹', '🔮', '⚡', '🌟', '💎',
  '🔥', '❄️', '🌊', '🌪️', '☀️', '🌙', '⭐', '💫',
];
