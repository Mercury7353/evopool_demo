// ============================================================
// Pixel Art Renderer — Stardew Valley–style western fantasy
// ============================================================

export const GAME_W = 384;   // 24 tiles
export const GAME_H = 256;   // 16 tiles
export const TILE   = 16;

// ── Palette ──────────────────────────────────────────────────
export const PAL = {
  outline:    '#1a1a2e',
  skin:       '#e8b87a',
  skinShade:  '#c68642',
  eyeWhite:   '#f8fafc',
  hair:       '#6b4c38',

  grass1:     '#5cb85c',
  grass2:     '#4a9e4a',
  grass3:     '#6fd06f',

  path1:      '#c4a373',
  path2:      '#b39363',
  path3:      '#d4b383',

  treeDark:   '#1a6e2e',
  tree:       '#2d8b42',
  treeLight:  '#4aaa5c',
  trunk:      '#6b4226',
  trunkDark:  '#4a2e18',

  roofDark:   '#8b3a0f',
  roof:       '#c2510c',
  roofLight:  '#e06820',

  wallDark:   '#8b7355',
  wall:       '#d4b896',
  wallLight:  '#e8d4b8',

  doorDark:   '#5a3a1a',
  door:       '#8b6b3a',
  doorLight:  '#a08050',

  stoneDark:  '#5a5a6a',
  stone:      '#7a7a8a',
  stoneLight: '#9a9aaa',

  waterDark:  '#2563a0',
  water:      '#3b82c6',
  waterLight: '#7bb8e8',

  mathDark:   '#1d4ed8', math:    '#3b82f6', mathLight:   '#93c5fd',
  codeDark:   '#15803d', code:    '#22c55e', codeLight:   '#86efac',
  reasonDark: '#b45309', reason:  '#f59e0b', reasonLight: '#fde68a',
  genDark:    '#7e22ce', gen:     '#a855f7', genLight:    '#d8b4fe',

  monsterBody:'#dc2626', monsterDark:'#991b1b', monsterLight:'#f87171',

  gold:       '#fbbf24',
  red:        '#ef4444',
  green:      '#22c55e',
  white:      '#ffffff',
  black:      '#000000',
  pants:      '#3a3a5a',
  boots:      '#2a2a3a',
} as const;

type C2D = CanvasRenderingContext2D;

// ── Domain→color maps ────────────────────────────────────────
export type DomainKey = 'math'|'code'|'reasoning';

export const DOMAIN_HAT: Record<DomainKey, [string,string]> = {
  math:      [PAL.math,      PAL.mathLight],
  code:      [PAL.code,      PAL.codeLight],
  reasoning: [PAL.reason,    PAL.reasonLight],
};
export const DOMAIN_ARMOR: Record<DomainKey, [string,string]> = {
  math:      [PAL.mathDark,  PAL.math],
  code:      [PAL.codeDark,  PAL.code],
  reasoning: [PAL.reasonDark,PAL.reason],
};
const MONSTER_CLR: Record<DomainKey, [string,string,string]> = {
  math:      ['#991b1b','#dc2626','#f87171'],
  code:      ['#14532d','#16a34a','#4ade80'],
  reasoning: ['#78350f','#d97706','#fbbf24'],
};

// ── Sprite helper ────────────────────────────────────────────
function drawSprite(
  ctx: C2D, rows: string[], x: number, y: number,
  colorMap: Record<string, string>,
) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const clr = colorMap[ch];
      if (!clr) continue;
      ctx.fillStyle = clr;
      ctx.fillRect(Math.round(x + c), Math.round(y + r), 1, 1);
    }
  }
}

// ── Warrior sprite (8 × 11) ─────────────────────────────────
const W_STAND = [
  '..0000..',
  '.0HHHH0.',
  '.0HhhH0.',
  '.011110.',
  '.0e1e10.',
  '.011110.',
  '..0AA0..',
  '.0AaaA0.',
  '..0LL0..',
  '.0L..L0.',
  '.00..00.',
];
const W_WALK = [
  '..0000..',
  '.0HHHH0.',
  '.0HhhH0.',
  '.011110.',
  '.0e1e10.',
  '.011110.',
  '..0AA0..',
  '.0AaaA0.',
  '..0LL0..',
  '..0LL0..',
  '..0BB0..',
];

export interface WarriorDrawOpts {
  domain: DomainKey;
  frame: number;       // 0 = stand, 1 = walk
  selected?: boolean;
  fighting?: boolean;
  dreaming?: boolean;
  celebrating?: boolean;
  dying?: boolean;
  highlight?: string;
}

export function drawWarrior(ctx: C2D, x: number, y: number, opts: WarriorDrawOpts) {
  const [hat, hatH]     = DOMAIN_HAT[opts.domain];
  const [armor, armorH] = DOMAIN_ARMOR[opts.domain];
  const cmap: Record<string, string> = {
    '0': PAL.outline, '1': PAL.skin, 'e': PAL.eyeWhite,
    'H': hat, 'h': hatH, 'A': armor, 'a': armorH,
    'L': PAL.pants, 'B': PAL.boots,
  };
  const sprite = opts.frame === 1 ? W_WALK : W_STAND;
  const dx = x - 4;          // center horizontally
  const dy = y - 11;         // origin = feet

  // Selection glow
  if (opts.selected) {
    ctx.fillStyle = PAL.gold + '55';
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dream shimmer
  if (opts.dreaming) {
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300) * 0.3;
  }

  // Dying fade
  if (opts.dying) {
    ctx.globalAlpha = 0.35;
  }

  drawSprite(ctx, sprite, dx, dy, cmap);

  ctx.globalAlpha = 1;

  // Celebration: little sparkle above head
  if (opts.celebrating) {
    const t = (Date.now() / 200) % 4;
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(x - 1 + Math.round(Math.sin(t) * 3), dy - 3 + Math.round(Math.cos(t) * 2), 1, 1);
    ctx.fillRect(x + 1 + Math.round(Math.cos(t) * 2), dy - 2 + Math.round(Math.sin(t) * 3), 1, 1);
  }
}

// ── Monster sprite (10 × 10) ────────────────────────────────
const MONSTER_S = [
  '0..0..0..0',
  '00MMMMMM00',
  '0MMMMMMMM0',
  '0Me0MM0eM0',
  '0MMMMMMMM0',
  '0MM0ee0MM0',
  '0MMMMMMMM0',
  '.0mMMMMm0.',
  '..0M..M0..',
  '..00..00..',
];

export interface MonsterDrawOpts {
  domain: DomainKey;
  frame: number;
  dying?: boolean;
  hp?: number;
  maxHp?: number;
}

export function drawMonster(ctx: C2D, x: number, y: number, opts: MonsterDrawOpts) {
  const [dark, mid, light] = MONSTER_CLR[opts.domain];
  const cmap: Record<string, string> = {
    '0': PAL.outline, 'M': mid, 'm': light, 'e': PAL.eyeWhite,
  };
  const dx = x - 5;
  const dy = y - 10;

  if (opts.dying) {
    ctx.globalAlpha = Math.max(0, 1 - (Date.now() % 1000) / 800);
  }

  // Idle bob
  const bob = Math.round(Math.sin(Date.now() / 400 + opts.frame) * 1.5);
  drawSprite(ctx, MONSTER_S, dx, dy + bob, cmap);

  ctx.globalAlpha = 1;

  // HP bar
  if (opts.hp != null && opts.maxHp) {
    drawHealthBar(ctx, x - 8, dy - 4, 16, opts.hp, opts.maxHp);
  }
}

// ── Health bar ───────────────────────────────────────────────
export function drawHealthBar(ctx: C2D, x: number, y: number, w: number, hp: number, max: number) {
  const pct = Math.max(0, Math.min(1, hp / max));
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = pct > 0.5 ? PAL.green : pct > 0.25 ? PAL.gold : PAL.red;
  ctx.fillRect(x, y, Math.round(w * pct), 2);
}

// ── Name tag ─────────────────────────────────────────────────
export function drawNameTag(ctx: C2D, x: number, y: number, name: string) {
  ctx.fillStyle = PAL.outline + 'aa';
  const w = name.length * 4 + 2;
  ctx.fillRect(x - w / 2, y, w, 7);
  ctx.fillStyle = PAL.white;
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y + 5.5);
}

// ── Dream bubble ─────────────────────────────────────────────
export function drawDreamBubble(ctx: C2D, x: number, y: number, text: string) {
  const bob = Math.sin(Date.now() / 600) * 2;
  const bx = x - 12;
  const by = y - 22 + bob;
  // Bubble body
  ctx.fillStyle = '#6b21a8' + '88';
  ctx.fillRect(bx, by, 24, 10);
  ctx.fillRect(bx + 1, by - 1, 22, 12);
  // Tail
  ctx.fillRect(x - 1, by + 10, 2, 3);
  // Sparkle
  ctx.fillStyle = PAL.genLight;
  ctx.fillRect(bx + 2, by + 1, 1, 1);
  ctx.fillRect(bx + 6, by + 3, 1, 1);
  ctx.fillRect(bx + 18, by + 2, 1, 1);
  // Text hint
  ctx.fillStyle = '#e9d5ff';
  ctx.font = '4px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text.slice(0, 6), x, by + 7);
}

// ── Battle slash effect ──────────────────────────────────────
export function drawSlash(ctx: C2D, x: number, y: number, frame: number) {
  const clr = [PAL.white, PAL.gold, PAL.red];
  ctx.fillStyle = clr[frame % 3];
  // Diagonal slash
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x - 3 + i, y - 3 + i, 2, 2);
  }
}

// ── Sparkle / level-up effect ────────────────────────────────
export function drawSparkles(ctx: C2D, x: number, y: number, frame: number) {
  const t = frame * 0.15;
  const colors = [PAL.gold, PAL.white, PAL.genLight];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + t;
    const r = 6 + Math.sin(t * 2 + i) * 3;
    const px = x + Math.cos(angle) * r;
    const py = y - 6 + Math.sin(angle) * r;
    ctx.fillStyle = colors[i % 3];
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
}

// ── Tiles ────────────────────────────────────────────────────

function hash(a: number, b: number): number {
  return ((a * 2654435761) ^ (b * 2246822519)) >>> 0;
}

export function drawGrassTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.grass1;
  ctx.fillRect(gx, gy, TILE, TILE);
  const h = hash(gx, gy);
  ctx.fillStyle = PAL.grass2;
  ctx.fillRect(gx + (h % 7) * 2, gy + ((h >> 4) % 5) * 3, 1, 2);
  ctx.fillRect(gx + ((h >> 8) % 13) + 1, gy + ((h >> 12) % 11) + 2, 1, 2);
  if ((h & 0xf) > 10) {
    ctx.fillStyle = PAL.grass3;
    ctx.fillRect(gx + ((h >> 16) % 12) + 2, gy + ((h >> 20) % 10) + 3, 1, 1);
  }
}

export function drawPathTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.path1;
  ctx.fillRect(gx, gy, TILE, TILE);
  const h = hash(gx + 99, gy + 77);
  ctx.fillStyle = PAL.path2;
  ctx.fillRect(gx + (h % 6) * 2 + 1, gy + ((h >> 4) % 5) * 3, 2, 1);
  ctx.fillStyle = PAL.path3;
  ctx.fillRect(gx + ((h >> 8) % 12) + 2, gy + ((h >> 12) % 12) + 2, 1, 1);
}

export function drawTreeTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.grass2;
  ctx.fillRect(gx, gy, TILE, TILE);
  // Trunk
  ctx.fillStyle = PAL.trunkDark;
  ctx.fillRect(gx + 6, gy + 10, 4, 6);
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(gx + 7, gy + 10, 3, 6);
  // Canopy shadow
  ctx.fillStyle = PAL.treeDark;
  ctx.fillRect(gx + 2, gy + 3, 12, 8);
  ctx.fillRect(gx + 3, gy + 2, 10, 10);
  // Canopy body
  ctx.fillStyle = PAL.tree;
  ctx.fillRect(gx + 3, gy + 3, 10, 7);
  ctx.fillRect(gx + 4, gy + 2, 8, 9);
  // Canopy highlight
  ctx.fillStyle = PAL.treeLight;
  ctx.fillRect(gx + 4, gy + 3, 4, 3);
  ctx.fillRect(gx + 5, gy + 2, 3, 1);
}

export function drawRoofTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.roofDark;
  ctx.fillRect(gx, gy, TILE, TILE);
  ctx.fillStyle = PAL.roof;
  ctx.fillRect(gx + 1, gy + 1, 14, 13);
  ctx.fillStyle = PAL.roofLight;
  ctx.fillRect(gx + 2, gy + 2, 5, 2);
  ctx.fillRect(gx + 2, gy + 6, 5, 2);
  ctx.fillRect(gx + 2, gy + 10, 5, 2);
  // Eave
  ctx.fillStyle = PAL.roofDark;
  ctx.fillRect(gx, gy + 14, TILE, 2);
}

export function drawWallTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(gx, gy, TILE, TILE);
  ctx.fillStyle = PAL.wallDark;
  ctx.fillRect(gx, gy + 5, TILE, 1);
  ctx.fillRect(gx, gy + 11, TILE, 1);
  ctx.fillRect(gx + 8, gy, 1, 5);
  ctx.fillRect(gx + 4, gy + 6, 1, 5);
  ctx.fillRect(gx + 12, gy + 6, 1, 5);
  ctx.fillRect(gx + 8, gy + 12, 1, 4);
}

export function drawWindowTile(ctx: C2D, gx: number, gy: number) {
  drawWallTile(ctx, gx, gy);
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(gx + 5, gy + 3, 6, 7);
  ctx.fillStyle = '#4a6a9a';
  ctx.fillRect(gx + 6, gy + 4, 4, 5);
  ctx.fillStyle = '#7aadda';
  ctx.fillRect(gx + 6, gy + 4, 2, 2);
  ctx.fillStyle = PAL.wallLight;
  ctx.fillRect(gx + 5, gy + 6, 6, 1);
  ctx.fillRect(gx + 8, gy + 3, 1, 7);
}

export function drawDoorTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(gx, gy, TILE, TILE);
  ctx.fillStyle = PAL.wallDark;
  ctx.fillRect(gx, gy, TILE, 1);
  // Door
  ctx.fillStyle = PAL.doorDark;
  ctx.fillRect(gx + 4, gy + 2, 8, 14);
  ctx.fillStyle = PAL.door;
  ctx.fillRect(gx + 5, gy + 3, 6, 13);
  ctx.fillStyle = PAL.doorLight;
  ctx.fillRect(gx + 6, gy + 4, 2, 3);
  // Handle
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(gx + 9, gy + 9, 1, 1);
}

export function drawWellTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.grass1;
  ctx.fillRect(gx, gy, TILE, TILE);
  // Stone ring
  ctx.fillStyle = PAL.stoneDark;
  ctx.fillRect(gx + 2, gy + 4, 12, 10);
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(gx + 3, gy + 5, 10, 8);
  // Water
  ctx.fillStyle = PAL.waterDark;
  ctx.fillRect(gx + 4, gy + 6, 8, 6);
  ctx.fillStyle = PAL.water;
  ctx.fillRect(gx + 5, gy + 7, 5, 3);
  // Beam
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(gx + 1, gy + 2, 14, 2);
  ctx.fillStyle = PAL.trunkDark;
  ctx.fillRect(gx + 7, gy + 0, 2, 4);
  // Bucket hint
  ctx.fillStyle = PAL.trunk;
  ctx.fillRect(gx + 8, gy + 4, 2, 2);
}

export function drawFlowerTile(ctx: C2D, gx: number, gy: number) {
  drawGrassTile(ctx, gx, gy);
  const h = hash(gx + 33, gy + 44);
  const colors = ['#f472b6', '#fb923c', '#facc15', '#a78bfa'];
  // 2-3 small flowers
  for (let i = 0; i < 3; i++) {
    const fx = gx + 2 + ((h >> (i * 5)) % 10);
    const fy = gy + 3 + ((h >> (i * 5 + 2)) % 9);
    ctx.fillStyle = colors[(h >> (i * 3)) % 4];
    ctx.fillRect(fx, fy, 2, 2);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(fx, fy + 1, 1, 1);
    // Stem
    ctx.fillStyle = PAL.grass2;
    ctx.fillRect(fx, fy + 2, 1, 3);
  }
}

export function drawBushTile(ctx: C2D, gx: number, gy: number) {
  drawGrassTile(ctx, gx, gy);
  ctx.fillStyle = PAL.treeDark;
  ctx.fillRect(gx + 3, gy + 6, 10, 8);
  ctx.fillRect(gx + 4, gy + 5, 8, 10);
  ctx.fillStyle = PAL.tree;
  ctx.fillRect(gx + 4, gy + 6, 8, 7);
  ctx.fillRect(gx + 5, gy + 5, 6, 9);
  ctx.fillStyle = PAL.treeLight;
  ctx.fillRect(gx + 5, gy + 6, 3, 3);
}

export function drawGateTile(ctx: C2D, gx: number, gy: number) {
  drawGrassTile(ctx, gx, gy);
  // Stone pillar
  ctx.fillStyle = PAL.stoneDark;
  ctx.fillRect(gx + 3, gy, 10, TILE);
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(gx + 4, gy + 1, 8, TILE - 2);
  ctx.fillStyle = PAL.stoneLight;
  ctx.fillRect(gx + 5, gy + 2, 3, 4);
  // Torch on top
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(gx + 6, gy, 4, 2);
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(gx + 7, gy - 1, 2, 2);
}

export function drawWaterTile(ctx: C2D, gx: number, gy: number) {
  ctx.fillStyle = PAL.waterDark;
  ctx.fillRect(gx, gy, TILE, TILE);
  ctx.fillStyle = PAL.water;
  const phase = (Date.now() / 800 + gx * 0.1) % 1;
  for (let i = 0; i < 3; i++) {
    const wx = gx + ((i * 5 + Math.floor(phase * 16)) % 14) + 1;
    const wy = gy + i * 5 + 2;
    ctx.fillRect(wx, wy, 3, 1);
  }
  ctx.fillStyle = PAL.waterLight;
  ctx.fillRect(gx + 4 + Math.floor(phase * 6), gy + 6, 2, 1);
}

// ── Tile dispatcher ──────────────────────────────────────────
// Tile codes from world map
export const TILE_CODES = {
  GRASS: 0, PATH: 1, TREE: 2, WALL: 3, ROOF: 4,
  DOOR: 5, WINDOW: 6, WELL: 7, FLOWER: 8, BUSH: 9,
  GATE: 10, WATER: 11,
} as const;

const TILE_DRAW: Record<number, (ctx: C2D, gx: number, gy: number) => void> = {
  [TILE_CODES.GRASS]:  drawGrassTile,
  [TILE_CODES.PATH]:   drawPathTile,
  [TILE_CODES.TREE]:   drawTreeTile,
  [TILE_CODES.WALL]:   drawWallTile,
  [TILE_CODES.ROOF]:   drawRoofTile,
  [TILE_CODES.DOOR]:   drawDoorTile,
  [TILE_CODES.WINDOW]: drawWindowTile,
  [TILE_CODES.WELL]:   drawWellTile,
  [TILE_CODES.FLOWER]: drawFlowerTile,
  [TILE_CODES.BUSH]:   drawBushTile,
  [TILE_CODES.GATE]:   drawGateTile,
  [TILE_CODES.WATER]:  drawWaterTile,
};

export function drawTile(ctx: C2D, code: number, gx: number, gy: number) {
  const fn = TILE_DRAW[code] ?? drawGrassTile;
  fn(ctx, gx, gy);
}

// ── Render full tilemap to off-screen canvas ─────────────────
export function renderTilemap(map: number[][]): HTMLCanvasElement {
  const cvs = document.createElement('canvas');
  cvs.width = GAME_W;
  cvs.height = GAME_H;
  const ctx = cvs.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      drawTile(ctx, map[row][col], col * TILE, row * TILE);
    }
  }
  return cvs;
}
