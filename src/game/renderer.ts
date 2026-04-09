// ============================================================
// Pixel Art Renderer — Stardew Valley–style, western fantasy
// ============================================================

export const GAME_W = 512;   // 32 tiles
export const GAME_H = 320;   // 20 tiles
export const TILE   = 16;

type C2D = CanvasRenderingContext2D;

// ── Palette ──────────────────────────────────────────────────
export const PAL = {
  outline:    '#1a1a2e',
  skin:       '#e8b87a',
  skinShade:  '#c68642',
  skinHi:     '#f5d4a8',
  eyeWhite:   '#f8fafc',
  blush:      '#d4916a',
  hair:       '#6b4c38',
  hairHi:     '#8a6a50',
  mouth:      '#c27070',

  grass:      '#5cb85c', grassDk: '#3d8c3d', grassLt: '#7dd87d', grassBase: '#4aa54a',
  path:       '#c4a373', pathDk:  '#a88a5e', pathLt:  '#dcc49a',
  cobble:     '#8a8a9a', cobbleDk:'#6a6a7a', cobbleLt:'#aaaabc',

  treeDk:     '#1a6e2e', tree:    '#2d8b42', treeLt:  '#4aaa5c',
  trunk:      '#6b4226', trunkDk: '#4a2e18', trunkLt: '#8a6040',

  roofDk:     '#7a2e0c', roof:    '#b84010', roofLt:  '#d06030',
  wallDk:     '#8b7355', wall:    '#d4b896', wallLt:  '#ecdcc4',
  doorDk:     '#4a2e12', door:    '#7a5830', doorLt:  '#9a7848',

  stoneDk:    '#4a4a5c', stone:   '#6a6a7c', stoneLt: '#8a8a9c',
  waterDk:    '#1a50a0', water:   '#3070c0', waterLt: '#60a0e8', waterHi: '#90c8ff',

  fence:      '#9a7040', fenceDk: '#6a4820',
  crop:       '#7ab830', cropDk:  '#508018', cropSoil:'#6a4a28',

  mathDk: '#1d4ed8', math: '#3b82f6', mathLt: '#93c5fd',
  codeDk: '#15803d', code: '#22c55e', codeLt: '#86efac',
  rsnDk:  '#b45309', rsn:  '#f59e0b', rsnLt:  '#fde68a',
  genDk:  '#7e22ce', gen:  '#a855f7', genLt:  '#d8b4fe',

  gold: '#fbbf24', red: '#ef4444', green: '#22c55e', white: '#ffffff',
  pants: '#3a3a5a', boots: '#2a2a3a', belt: '#4a3a2a',
} as const;

// ── Domain colors ────────────────────────────────────────────
export type DomainKey = 'math' | 'code' | 'reasoning';

const D_HAT:   Record<DomainKey,[string,string]> = {
  math: [PAL.math, PAL.mathLt], code: [PAL.code, PAL.codeLt], reasoning: [PAL.rsn, PAL.rsnLt],
};
const D_ARMOR: Record<DomainKey,[string,string]> = {
  math: [PAL.mathDk, PAL.math], code: [PAL.codeDk, PAL.code], reasoning: [PAL.rsnDk, PAL.rsn],
};
const D_MON: Record<DomainKey,[string,string,string]> = {
  math: ['#7f1d1d','#dc2626','#f87171'],
  code: ['#14532d','#16a34a','#4ade80'],
  reasoning: ['#78350f','#d97706','#fbbf24'],
};

// ── Sprite helper ────────────────────────────────────────────
function spr(ctx: C2D, rows: string[], x: number, y: number, cm: Record<string,string>) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const clr = cm[ch];
      if (!clr) continue;
      ctx.fillStyle = clr;
      ctx.fillRect(Math.round(x + c), Math.round(y + r), 1, 1);
    }
  }
}

// ── Warrior sprites (10 wide × 16 tall) ─────────────────────
//  '0'=outline '1'=skin '2'=skinShade '3'=hair '4'=hairHi
//  'e'=eyeWhite 'm'=mouth  'H'/'h'=hat  'A'/'a'=armor  'B'=belt 'L'=pants 'S'=boots
const W_STAND: string[] = [
  '..00000...',   // 0  hat tip
  '.0HHHHH0..',   // 1  hat
  '.0HhHhH0..',   // 2  hat band
  '.034111430',   // 3  hair + forehead
  '.01e11e10.',   // 4  eyes
  '.011221100',   // 5  cheeks
  '..011m10..',   // 6  chin+mouth
  '..0ABBA0..',   // 7  collar+belt accent
  '.0AAAAAA0.',   // 8  shoulders
  '.0AaAAaA0.',   // 9  chest
  '.0AAAAAA0.',   // 10 body
  '..0ABBA0..',   // 11 belt
  '..0L00L0..',   // 12 hips
  '..0L..L0..',   // 13 legs
  '..0S..S0..',   // 14 boots
  '..00..00..',   // 15 soles
];
const W_WALK: string[] = [
  '..00000...',
  '.0HHHHH0..',
  '.0HhHhH0..',
  '.034111430',
  '.01e11e10.',
  '.011221100',
  '..011m10..',
  '..0ABBA0..',
  '.0AAAAAA0.',
  '.0AaAAaA0.',
  '.0AAAAAA0.',
  '..0ABBA0..',
  '..0L00L0..',
  '...0LL0...',   // legs together
  '...0SS0...',   // boots together
  '...0000...',   // soles together
];

export interface WarriorDrawOpts {
  domain: DomainKey;
  frame: number;
  selected?: boolean;
  fighting?: boolean;
  dreaming?: boolean;
  celebrating?: boolean;
  dying?: boolean;
}

export function drawWarrior(ctx: C2D, x: number, y: number, opts: WarriorDrawOpts) {
  const [hat, hatH] = D_HAT[opts.domain];
  const [arm, armH] = D_ARMOR[opts.domain];
  const cm: Record<string,string> = {
    '0': PAL.outline, '1': PAL.skin,   '2': PAL.blush,
    '3': PAL.hair,    '4': PAL.hairHi, 'e': PAL.eyeWhite,
    'm': PAL.mouth,   'H': hat, 'h': hatH,
    'A': arm, 'a': armH, 'B': PAL.belt, 'L': PAL.pants, 'S': PAL.boots,
  };
  const sprite = opts.frame === 1 ? W_WALK : W_STAND;
  const dx = x - 5, dy = y - 16;

  // Selection glow
  if (opts.selected) {
    ctx.fillStyle = '#fbbf2444';
    ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (opts.dreaming) ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.25;
  if (opts.dying) ctx.globalAlpha = Math.max(0.1, 1 - (Date.now() % 2000) / 1800);

  spr(ctx, sprite, dx, dy, cm);
  ctx.globalAlpha = 1;

  if (opts.celebrating) {
    const t = Date.now() / 180;
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(Math.round(x - 2 + Math.sin(t) * 4), Math.round(dy - 3 + Math.cos(t) * 2), 1, 1);
    ctx.fillRect(Math.round(x + 2 + Math.cos(t) * 3), Math.round(dy - 2 + Math.sin(t) * 3), 1, 1);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(Math.round(x + Math.sin(t + 1) * 3), Math.round(dy - 4 + Math.cos(t + 1) * 2), 1, 1);
  }
}

// ── Monster sprites (12 wide × 14 tall) ─────────────────────
const MON_S: string[] = [
  '0..0....0..0',  // 0  horns
  '0M00....00M0',  // 1  horn base
  '00MMMMMMMM00',  // 2  head top
  '0MMMMMMMMMM0',  // 3  head
  '0MMe0MM0eMM0',  // 4  eyes
  '0MMMMMMMMMM0',  // 5  face
  '0MMM0ee0MMM0',  // 6  fangs
  '0MMMMMMMMMM0',  // 7  neck/body
  '0MmMMMMMmMM0',  // 8  body detail
  '0MMMMMMMMMM0',  // 9  body
  '.0MMMMMMMM0.',  // 10 narrow
  '..0MM00MM0..',  // 11 legs
  '..0MM..MM0..',  // 12 feet
  '..00....00..',  // 13 ground
];

export interface MonsterDrawOpts {
  domain: DomainKey;
  frame: number;
  dying?: boolean;
  hp?: number;
  maxHp?: number;
}

export function drawMonster(ctx: C2D, x: number, y: number, opts: MonsterDrawOpts) {
  const [dk, md, lt] = D_MON[opts.domain];
  const cm: Record<string,string> = {
    '0': PAL.outline, 'M': md, 'm': lt, 'e': PAL.eyeWhite,
  };
  const dx = x - 6, dy = y - 14;
  if (opts.dying) ctx.globalAlpha = Math.max(0, 1 - (Date.now() % 1200) / 1000);

  const bob = Math.round(Math.sin(Date.now() / 400 + opts.frame) * 1.5);
  spr(ctx, MON_S, dx, dy + bob, cm);
  ctx.globalAlpha = 1;

  if (opts.hp != null && opts.maxHp) {
    drawHealthBar(ctx, x - 10, dy - 4, 20, opts.hp, opts.maxHp);
  }
}

// ── Health bar ───────────────────────────────────────────────
export function drawHealthBar(ctx: C2D, x: number, y: number, w: number, hp: number, max: number) {
  const pct = Math.max(0, Math.min(1, hp / max));
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = pct > 0.5 ? PAL.green : pct > 0.25 ? PAL.gold : PAL.red;
  ctx.fillRect(x, y, Math.round(w * pct), 2);
}

// ── Name tag ─────────────────────────────────────────────────
export function drawNameTag(ctx: C2D, x: number, y: number, name: string) {
  const w = name.length * 3.5 + 4;
  ctx.fillStyle = '#0a0a15cc';
  ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 7);
  ctx.fillStyle = '#ddd';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, Math.round(x), Math.round(y + 5.5));
}

// ── Dream bubble ─────────────────────────────────────────────
export function drawDreamBubble(ctx: C2D, x: number, y: number, text: string) {
  const bob = Math.sin(Date.now() / 500) * 2;
  const bx = Math.round(x - 14), by = Math.round(y - 26 + bob);
  ctx.fillStyle = '#4c1d95aa';
  ctx.fillRect(bx, by, 28, 12);
  ctx.fillRect(bx + 1, by - 1, 26, 14);
  ctx.fillRect(Math.round(x) - 1, by + 12, 2, 3);
  ctx.fillStyle = '#c4b5fd';
  ctx.fillRect(bx + 2, by + 1, 1, 1);
  ctx.fillRect(bx + 22, by + 3, 1, 1);
  ctx.fillRect(bx + 8, by + 8, 1, 1);
  ctx.fillStyle = '#e9d5ff';
  ctx.font = '4px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text.slice(0, 7), Math.round(x), by + 8);
}

// ── Effects ──────────────────────────────────────────────────
export function drawSlash(ctx: C2D, x: number, y: number, f: number) {
  const c = [PAL.white, PAL.gold, PAL.red];
  ctx.fillStyle = c[f % 3];
  for (let i = 0; i < 7; i++) ctx.fillRect(x - 3 + i, y - 3 + i, 2, 2);
}

export function drawSparkles(ctx: C2D, x: number, y: number, f: number) {
  const t = f * 0.12;
  const cc = [PAL.gold, PAL.white, PAL.genLt];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t;
    const r = 7 + Math.sin(t * 2 + i) * 3;
    ctx.fillStyle = cc[i % 3];
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 8 + Math.sin(a) * r), 1, 1);
  }
}

// ── Hash for seeded variation ────────────────────────────────
function H(a: number, b: number): number {
  return ((a * 2654435761) ^ (b * 2246822519)) >>> 0;
}

// ── Tile drawing ─────────────────────────────────────────────

function tGrass(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.grassBase;
  ctx.fillRect(x, y, 16, 16);
  const h = H(x, y);
  // darker grass tufts
  ctx.fillStyle = PAL.grassDk;
  ctx.fillRect(x + (h % 6) * 2 + 1, y + ((h >> 4) % 5) * 3 + 1, 1, 2);
  ctx.fillRect(x + ((h >> 8) % 12) + 2, y + ((h >> 12) % 10) + 3, 1, 2);
  // lighter accents
  ctx.fillStyle = PAL.grassLt;
  if ((h & 0xf) > 8) ctx.fillRect(x + ((h >> 16) % 11) + 2, y + ((h >> 20) % 10) + 3, 1, 1);
  if ((h & 0xf0) > 0x90) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x + ((h >> 24) % 10) + 3, y + ((h >> 28) % 8) + 4, 2, 1);
  }
}

function tPath(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.path;
  ctx.fillRect(x, y, 16, 16);
  const h = H(x + 99, y + 77);
  ctx.fillStyle = PAL.pathDk;
  ctx.fillRect(x + (h % 5) * 3 + 1, y + ((h >> 4) % 4) * 4, 2, 1);
  ctx.fillRect(x + ((h >> 8) % 10) + 3, y + ((h >> 12) % 10) + 3, 1, 1);
  ctx.fillStyle = PAL.pathLt;
  ctx.fillRect(x + ((h >> 16) % 12) + 2, y + ((h >> 20) % 12) + 2, 2, 1);
  ctx.fillRect(x + ((h >> 24) % 8) + 4, y + ((h >> 28) % 8) + 4, 1, 1);
}

function tCobble(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.cobble;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = PAL.cobbleDk;
  // Stone grid pattern
  ctx.fillRect(x, y + 4, 16, 1);
  ctx.fillRect(x, y + 10, 16, 1);
  ctx.fillRect(x + 5, y, 1, 4);
  ctx.fillRect(x + 11, y, 1, 4);
  ctx.fillRect(x + 3, y + 5, 1, 5);
  ctx.fillRect(x + 8, y + 5, 1, 5);
  ctx.fillRect(x + 13, y + 5, 1, 5);
  ctx.fillRect(x + 5, y + 11, 1, 5);
  ctx.fillRect(x + 11, y + 11, 1, 5);
  ctx.fillStyle = PAL.cobbleLt;
  ctx.fillRect(x + 2, y + 1, 2, 2);
  ctx.fillRect(x + 9, y + 2, 1, 1);
  ctx.fillRect(x + 5, y + 7, 2, 1);
  ctx.fillRect(x + 1, y + 12, 2, 2);
  ctx.fillRect(x + 8, y + 13, 2, 1);
}

function tTree(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  // Trunk
  ctx.fillStyle = PAL.trunkDk;
  ctx.fillRect(x + 5, y + 10, 6, 6);
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x + 6, y + 10, 4, 6);
  ctx.fillStyle = PAL.trunkLt;
  ctx.fillRect(x + 7, y + 11, 1, 4);
  // Shadow under canopy
  ctx.fillStyle = PAL.treeDk;
  ctx.fillRect(x + 1, y + 2, 14, 9);
  ctx.fillRect(x + 2, y + 1, 12, 11);
  // Canopy body
  ctx.fillStyle = PAL.tree;
  ctx.fillRect(x + 2, y + 2, 12, 8);
  ctx.fillRect(x + 3, y + 1, 10, 10);
  // Highlights
  ctx.fillStyle = PAL.treeLt;
  ctx.fillRect(x + 4, y + 2, 5, 3);
  ctx.fillRect(x + 3, y + 4, 3, 2);
  ctx.fillRect(x + 5, y + 1, 3, 1);
  // Dark detail
  ctx.fillStyle = PAL.treeDk;
  ctx.fillRect(x + 9, y + 7, 4, 2);
  ctx.fillRect(x + 3, y + 8, 3, 2);
  ctx.fillRect(x + 7, y + 9, 2, 1);
}

function tRoof(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.roofDk;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = PAL.roof;
  ctx.fillRect(x, y + 2, 16, 12);
  ctx.fillStyle = PAL.roofLt;
  ctx.fillRect(x + 1, y + 3, 6, 2);
  ctx.fillRect(x + 1, y + 7, 6, 2);
  ctx.fillRect(x + 1, y + 11, 6, 2);
  // Shingle texture
  ctx.fillStyle = PAL.roofDk;
  ctx.fillRect(x + 8, y + 5, 7, 1);
  ctx.fillRect(x, y + 9, 7, 1);
  // Eave
  ctx.fillStyle = PAL.roofDk;
  ctx.fillRect(x, y + 14, 16, 2);
  ctx.fillStyle = '#5a2a0a';
  ctx.fillRect(x, y + 15, 16, 1);
}

function tWall(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(x, y, 16, 16);
  // Brick/timber lines
  ctx.fillStyle = PAL.wallDk;
  ctx.fillRect(x, y + 5, 16, 1);
  ctx.fillRect(x, y + 11, 16, 1);
  ctx.fillRect(x + 8, y, 1, 5);
  ctx.fillRect(x + 4, y + 6, 1, 5);
  ctx.fillRect(x + 12, y + 6, 1, 5);
  ctx.fillRect(x + 8, y + 12, 1, 4);
  // Light mortar
  ctx.fillStyle = PAL.wallLt;
  ctx.fillRect(x + 1, y + 1, 3, 1);
  ctx.fillRect(x + 10, y + 7, 1, 1);
  ctx.fillRect(x + 2, y + 13, 2, 1);
}

function tWindow(ctx: C2D, x: number, y: number) {
  tWall(ctx, x, y);
  // Window frame
  ctx.fillStyle = PAL.wallDk;
  ctx.fillRect(x + 4, y + 2, 8, 8);
  // Glass
  ctx.fillStyle = '#3a5a8a';
  ctx.fillRect(x + 5, y + 3, 6, 6);
  // Highlight
  ctx.fillStyle = '#6a9acc';
  ctx.fillRect(x + 5, y + 3, 3, 3);
  ctx.fillStyle = '#90c0ee';
  ctx.fillRect(x + 5, y + 3, 1, 2);
  // Cross frame
  ctx.fillStyle = PAL.wallDk;
  ctx.fillRect(x + 4, y + 5, 8, 1);
  ctx.fillRect(x + 7, y + 2, 1, 8);
  // Sill
  ctx.fillStyle = PAL.wallLt;
  ctx.fillRect(x + 4, y + 10, 8, 1);
}

function tDoor(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = PAL.wallDk;
  ctx.fillRect(x, y, 16, 1);
  // Door frame
  ctx.fillStyle = PAL.doorDk;
  ctx.fillRect(x + 3, y + 1, 10, 15);
  // Door body
  ctx.fillStyle = PAL.door;
  ctx.fillRect(x + 4, y + 2, 8, 14);
  // Panels
  ctx.fillStyle = PAL.doorLt;
  ctx.fillRect(x + 5, y + 3, 3, 4);
  ctx.fillRect(x + 5, y + 9, 3, 4);
  ctx.fillStyle = PAL.doorDk;
  ctx.fillRect(x + 5, y + 7, 6, 1);
  // Handle
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(x + 10, y + 8, 1, 2);
  // Step
  ctx.fillStyle = PAL.stoneLt;
  ctx.fillRect(x + 3, y + 15, 10, 1);
}

function tWell(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  // Stone ring
  ctx.fillStyle = PAL.stoneDk;
  ctx.fillRect(x + 1, y + 4, 14, 11);
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(x + 2, y + 5, 12, 9);
  ctx.fillStyle = PAL.stoneLt;
  ctx.fillRect(x + 3, y + 5, 3, 2);
  ctx.fillRect(x + 10, y + 6, 2, 1);
  // Water inside
  ctx.fillStyle = PAL.waterDk;
  ctx.fillRect(x + 3, y + 7, 10, 5);
  ctx.fillStyle = PAL.water;
  ctx.fillRect(x + 4, y + 8, 6, 3);
  ctx.fillStyle = PAL.waterHi;
  ctx.fillRect(x + 5, y + 9, 2, 1);
  // Wooden posts
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x + 3, y + 1, 2, 6);
  ctx.fillRect(x + 11, y + 1, 2, 6);
  // Crossbeam
  ctx.fillStyle = PAL.trunkLt;
  ctx.fillRect(x + 2, y + 1, 12, 2);
  ctx.fillStyle = PAL.trunkDk;
  ctx.fillRect(x + 2, y + 0, 12, 1);
  // Rope + bucket
  ctx.fillStyle = PAL.wallDk;
  ctx.fillRect(x + 7, y + 2, 1, 5);
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x + 6, y + 6, 3, 2);
}

function tFlower(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  const h = H(x + 33, y + 44);
  const colors = ['#f472b6', '#fb923c', '#facc15', '#a78bfa', '#f87171', '#34d399'];
  for (let i = 0; i < 3; i++) {
    const fx = x + 2 + ((h >> (i * 5)) % 9);
    const fy = y + 3 + ((h >> (i * 5 + 2)) % 8);
    const c = colors[(h >> (i * 3)) % colors.length];
    // Petals
    ctx.fillStyle = c;
    ctx.fillRect(fx, fy, 3, 3);
    ctx.fillRect(fx - 1, fy + 1, 1, 1);
    ctx.fillRect(fx + 3, fy + 1, 1, 1);
    ctx.fillRect(fx + 1, fy - 1, 1, 1);
    // Center
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(fx + 1, fy + 1, 1, 1);
    // Stem
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(fx + 1, fy + 3, 1, 3);
    // Leaf
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(fx + 2, fy + 4, 1, 1);
  }
}

function tBush(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  ctx.fillStyle = PAL.treeDk;
  ctx.fillRect(x + 2, y + 5, 12, 10);
  ctx.fillRect(x + 3, y + 4, 10, 12);
  ctx.fillStyle = PAL.tree;
  ctx.fillRect(x + 3, y + 5, 10, 9);
  ctx.fillRect(x + 4, y + 4, 8, 11);
  ctx.fillStyle = PAL.treeLt;
  ctx.fillRect(x + 4, y + 5, 4, 3);
  ctx.fillRect(x + 5, y + 4, 2, 1);
  // Berries
  const h = H(x, y);
  if (h % 3 === 0) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 8, y + 7, 2, 2);
    ctx.fillRect(x + 5, y + 10, 2, 2);
  }
}

function tGate(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  // Stone pillar
  ctx.fillStyle = PAL.stoneDk;
  ctx.fillRect(x + 2, y, 12, 16);
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(x + 3, y + 1, 10, 14);
  ctx.fillStyle = PAL.stoneLt;
  ctx.fillRect(x + 4, y + 2, 4, 3);
  ctx.fillRect(x + 4, y + 8, 3, 2);
  // Torch holder
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(x + 5, y, 6, 1);
  // Flame
  const t = (Date.now() / 200) % 3;
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(x + 6 + Math.round(t % 2), y - 2, 3, 2);
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(x + 7, y - 3, 2, 2);
  ctx.fillStyle = '#fff8';
  ctx.fillRect(x + 7, y - 3, 1, 1);
}

function tWater(ctx: C2D, x: number, y: number) {
  ctx.fillStyle = PAL.waterDk;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = PAL.water;
  const t = (Date.now() / 700 + x * 0.08 + y * 0.04) % 1;
  for (let i = 0; i < 4; i++) {
    const wx = x + ((i * 4 + Math.floor(t * 16)) % 14) + 1;
    const wy = y + i * 4 + 1;
    ctx.fillRect(wx, wy, 3, 1);
  }
  ctx.fillStyle = PAL.waterLt;
  ctx.fillRect(x + 3 + Math.floor(t * 8), y + 5, 3, 1);
  ctx.fillRect(x + 8 + Math.floor((1 - t) * 5), y + 11, 2, 1);
  ctx.fillStyle = PAL.waterHi;
  ctx.fillRect(x + 6 + Math.floor(t * 4), y + 3, 1, 1);
  ctx.fillRect(x + 2 + Math.floor((1 - t) * 6), y + 9, 1, 1);
}

function tFence(ctx: C2D, x: number, y: number) {
  tGrass(ctx, x, y);
  // Horizontal rails
  ctx.fillStyle = PAL.fenceDk;
  ctx.fillRect(x, y + 5, 16, 3);
  ctx.fillRect(x, y + 11, 16, 3);
  ctx.fillStyle = PAL.fence;
  ctx.fillRect(x, y + 5, 16, 2);
  ctx.fillRect(x, y + 11, 16, 2);
  // Vertical post
  ctx.fillStyle = PAL.fenceDk;
  ctx.fillRect(x + 7, y + 3, 3, 12);
  ctx.fillStyle = PAL.fence;
  ctx.fillRect(x + 7, y + 3, 2, 11);
  // Post cap
  ctx.fillStyle = PAL.fenceDk;
  ctx.fillRect(x + 6, y + 2, 4, 2);
}

function tCrop(ctx: C2D, x: number, y: number) {
  // Soil base
  ctx.fillStyle = PAL.cropSoil;
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x, y + 4, 16, 1);
  ctx.fillRect(x, y + 9, 16, 1);
  ctx.fillRect(x, y + 14, 16, 1);
  // Crops
  ctx.fillStyle = PAL.cropDk;
  const h = H(x + 55, y + 66);
  for (let i = 0; i < 3; i++) {
    const cx = x + 1 + i * 5;
    const cy = y + 1;
    ctx.fillStyle = PAL.crop;
    ctx.fillRect(cx, cy, 1, 3);
    ctx.fillRect(cx + 2, cy + 1, 1, 2);
    ctx.fillStyle = PAL.cropDk;
    ctx.fillRect(cx + 1, cy, 1, 2);
    // Fruit/flower top
    if ((h >> (i * 4)) % 3 > 0) {
      ctx.fillStyle = ['#ef4444', '#fbbf24', '#fb923c'][(h >> (i * 2)) % 3];
      ctx.fillRect(cx, cy - 1, 2, 1);
    }
  }
  // Second row
  for (let i = 0; i < 3; i++) {
    const cx = x + 2 + i * 5;
    const cy = y + 6;
    ctx.fillStyle = PAL.crop;
    ctx.fillRect(cx, cy, 1, 2);
    ctx.fillRect(cx + 1, cy, 1, 3);
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(cx - 1, cy + 1, 1, 1);
  }
}

// ── Tile code constants ──────────────────────────────────────
export const TC = {
  GRASS: 0, PATH: 1, TREE: 2, WALL: 3, ROOF: 4,
  DOOR: 5, WINDOW: 6, WELL: 7, FLOWER: 8, BUSH: 9,
  GATE: 10, WATER: 11, COBBLE: 12, CROP: 13, FENCE: 14,
} as const;

const TILE_FN: Record<number,(ctx:C2D,x:number,y:number)=>void> = {
  [TC.GRASS]:  tGrass,  [TC.PATH]:   tPath,   [TC.TREE]:   tTree,
  [TC.WALL]:   tWall,   [TC.ROOF]:   tRoof,   [TC.DOOR]:   tDoor,
  [TC.WINDOW]: tWindow, [TC.WELL]:   tWell,   [TC.FLOWER]: tFlower,
  [TC.BUSH]:   tBush,   [TC.GATE]:   tGate,   [TC.WATER]:  tWater,
  [TC.COBBLE]: tCobble, [TC.CROP]:   tCrop,   [TC.FENCE]:  tFence,
};

export function drawTile(ctx: C2D, code: number, gx: number, gy: number) {
  (TILE_FN[code] ?? tGrass)(ctx, gx, gy);
}

// ── Render full tilemap ──────────────────────────────────────
export function renderTilemap(map: number[][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = GAME_W; c.height = GAME_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < map.length; r++)
    for (let c2 = 0; c2 < map[r].length; c2++)
      drawTile(ctx, map[r][c2], c2 * TILE, r * TILE);
  return c;
}
