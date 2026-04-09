// ============================================================
// Pixel Art Renderer — Octopath-inspired, class-based warriors
// ============================================================

export const GAME_W = 512;
export const GAME_H = 320;
export const TILE   = 16;
type C2D = CanvasRenderingContext2D;

// shorthand
function r(c: C2D, x: number, y: number, w: number, h: number, clr: string) {
  c.fillStyle = clr; c.fillRect(Math.round(x), Math.round(y), w, h);
}

// ── Palette ──────────────────────────────────────────────────
export const P = {
  ol: '#1a1a2e',
  skin: '#e8b87a', skinSh: '#c68642', skinHi: '#f5d4a8',
  eye: '#f8fafc', blush: '#d4916a', mouth: '#c27070',
  hair: '#6b4c38', hairHi: '#8a6a50',

  grassB: '#4aa54a', grassD: '#3d8c3d', grassL: '#7dd87d', grass: '#5cb85c',
  path: '#c4a373', pathD: '#a88a5e', pathL: '#dcc49a',
  cobble: '#8a8a9a', cobbleD: '#6a6a7a', cobbleL: '#aaaabc',
  treeD: '#1a6e2e', tree: '#2d8b42', treeL: '#4aaa5c',
  trunk: '#6b4226', trunkD: '#4a2e18', trunkL: '#8a6040',
  roofD: '#7a2e0c', roof: '#b84010', roofL: '#d06030',
  wallD: '#8b7355', wall: '#d4b896', wallL: '#ecdcc4',
  doorD: '#4a2e12', door: '#7a5830', doorL: '#9a7848',
  stoneD: '#4a4a5c', stone: '#6a6a7c', stoneL: '#8a8a9c',
  waterD: '#1a50a0', water: '#3070c0', waterL: '#60a0e8', waterH: '#90c8ff',
  fence: '#9a7040', fenceD: '#6a4820',
  crop: '#7ab830', cropD: '#508018', cropSoil: '#6a4a28',

  // domain
  mathD: '#1d4ed8', math: '#3b82f6', mathL: '#93c5fd',
  codeD: '#15803d', code: '#22c55e', codeL: '#86efac',
  rsnD:  '#b45309', rsn:  '#f59e0b', rsnL:  '#fde68a',

  gold: '#fbbf24', red: '#ef4444', green: '#22c55e', white: '#ffffff',
  pants: '#3a3a5a', boots: '#2a2a3a', belt: '#4a3a2a',
  metal: '#8899aa', metalD: '#556677', metalL: '#aabbcc',
  cape: '#2a4a2a',
} as const;

export type DomainKey = 'math' | 'code' | 'reasoning';
type Clr3 = [string, string, string]; // dark, mid, light

const D_CLR: Record<DomainKey, Clr3> = {
  math:      [P.mathD,  P.math,  P.mathL],
  code:      [P.codeD,  P.code,  P.codeL],
  reasoning: [P.rsnD,   P.rsn,   P.rsnL],
};
const D_MON: Record<DomainKey, Clr3> = {
  math:      ['#7f1d1d','#dc2626','#f87171'],
  code:      ['#14532d','#16a34a','#4ade80'],
  reasoning: ['#78350f','#d97706','#fbbf24'],
};

// ── Sprite helper ────────────────────────────────────────────
function spr(ctx: C2D, rows: string[], x: number, y: number, cm: Record<string,string>) {
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry];
    for (let cx = 0; cx < row.length; cx++) {
      const ch = row[cx];
      if (ch === '.') continue;
      const clr = cm[ch];
      if (clr) { ctx.fillStyle = clr; ctx.fillRect(Math.round(x + cx), Math.round(y + ry), 1, 1); }
    }
  }
}

// ======= MAGE sprite (14×22) — math domain =================
const MAGE_S = [
  '......00......',  //  0 hat tip
  '.....0HH0.....',  //  1
  '....0HHHH0....',  //  2
  '...0HHHHHH0...',  //  3
  '..0HhHhHhHh0..',  //  4 band
  '..0000000000..',  //  5 brim
  '..0331111330..',  //  6 hair+face
  '..031e11e130..',  //  7 eyes
  '..0311mm1130..',  //  8 mouth
  '...01111110...',  //  9 chin
  '...0AAAAAA0...',  // 10 collar
  '..0AAAAAAAA0..',  // 11 robe
  '..0AaAAAAaA0..',  // 12 detail
  '.0AAAAAAAAAA0.',  // 13 robe wide
  '.0AaAaAAaAaA0.',  // 14 pattern
  '.0AAAAAAAAAA0.',  // 15
  '..0AAAAAAAA0..',  // 16
  '..0AaAAAAaA0..',  // 17
  '...0AAAAAA0...',  // 18 hem
  '...0L0..0L0...',  // 19 feet
  '...00....00...',  // 20
  '..............',  // 21
];
const MAGE_W = [...MAGE_S.slice(0,19), '....0LL0......', '....0000......', '..............'];

// ======= ROGUE sprite (14×22) — code domain =================
const ROGUE_S = [
  '..............',  //  0
  '...000000.....',  //  1 hood top
  '..0HHHHHH0....',  //  2 hood
  '..0HhHhHh0....',  //  3 detail
  '..0H011110H...',  //  4 hood+face
  '..001e11e100..',  //  5 eyes shadow
  '...0112m110...',  //  6 face
  '...01111110...',  //  7 chin
  '...00AAAA00...',  //  8 collar
  '..0AAAAAAAA0..',  //  9 chest
  '..0AaAAAAaA0..',  // 10 leather
  '..0AABBBBAA0..',  // 11 belt
  '..0AAAAAAAA0..',  // 12 body
  '...0AAAAAA0...',  // 13 waist
  '...0LL00LL0...',  // 14 legs
  '...0L0..0L0...',  // 15
  '...0L0..0L0...',  // 16
  '...0S0..0S0...',  // 17 boots
  '...000..000...',  // 18
  '..............',  // 19
  '..............',  // 20
  '..............',  // 21
];
const ROGUE_W = [...ROGUE_S.slice(0,14), '...0L00LL0....', '....0LL00.....', '....0L00L0....', '....0SS0S0....', '....000000....', '..............', '..............', '..............'];

// ======= KNIGHT sprite (14×22) — reasoning domain ===========
const KNIGHT_S = [
  '....0RR0......',  //  0 plume
  '...0RRRR0.....',  //  1 plume
  '...000000.....',  //  2 helm top
  '..0HHHHHH0....',  //  3 helm
  '..0HHHHHH0....',  //  4
  '..0H0000H0....',  //  5 visor
  '..0HHHHHH0....',  //  6 chin guard
  '..000AAA000...',  //  7 gorget
  '.0AAAAAAAAA0..',  //  8 pauldrons
  '.0AaAAAAAaA0..',  //  9 chest
  '..0AAAAAAA0...',  // 10
  '..0AABBBAA0...',  // 11 belt
  '..0AAAAAAA0...',  // 12
  '..0AAAAAAA0...',  // 13 tassets
  '...0LL0LL0....',  // 14 legs
  '...0L0.0L0....',  // 15
  '...0S0.0S0....',  // 16 greaves
  '...000.000....',  // 17
  '..............',  // 18-21
  '..............',
  '..............',
  '..............',
];
const KNIGHT_W = [...KNIGHT_S.slice(0,14), '...0L00L0.....', '....0LL0......', '....0SS0......', '....0000......', '..............', '..............', '..............', '..............'];

// ── Warrior draw ─────────────────────────────────────────────
export interface WarriorDrawOpts {
  domain: DomainKey;
  frame: number;
  selected?: boolean;
  fighting?: boolean;
  dreaming?: boolean;
  celebrating?: boolean;
  dying?: boolean;
  attackProgress?: number; // 0-1 for attack animation
}

export function drawWarrior(ctx: C2D, x: number, y: number, opts: WarriorDrawOpts) {
  const [dk, md, lt] = D_CLR[opts.domain];
  const base: Record<string,string> = {
    '0': P.ol, '1': P.skin, '2': P.blush, '3': P.hair, '4': P.hairHi,
    'e': P.eye, 'm': P.mouth, 'H': md, 'h': lt, 'A': dk, 'a': md,
    'B': P.belt, 'L': P.pants, 'S': P.boots, 'R': '#c44', 'P': '#e66',
  };

  // Pick class sprite by domain
  const stand = opts.domain === 'math' ? MAGE_S : opts.domain === 'code' ? ROGUE_S : KNIGHT_S;
  const walk  = opts.domain === 'math' ? MAGE_W : opts.domain === 'code' ? ROGUE_W : KNIGHT_W;
  const sprite = opts.frame === 1 ? walk : stand;
  const dx = x - 7, dy = y - 22;

  if (opts.selected) { ctx.fillStyle = '#fbbf2444'; ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0, 0, Math.PI*2); ctx.fill(); }
  if (opts.dreaming) ctx.globalAlpha = 0.7 + Math.sin(Date.now()/300)*0.25;
  if (opts.dying) ctx.globalAlpha = Math.max(0.1, 1 - (Date.now()%2000)/1800);

  spr(ctx, sprite, dx, dy, base);

  // ── WEAPON OVERLAYS ──
  if (opts.domain === 'math') {
    // Staff
    const sx = x + 5;
    r(ctx, sx, dy + 2, 1, 18, P.trunk);
    r(ctx, sx, dy + 2, 1, 1, P.trunkD);
    // Gem glow
    const glow = Math.sin(Date.now()/200) * 0.3 + 0.7;
    ctx.globalAlpha = glow;
    r(ctx, sx - 1, dy, 3, 2, lt);
    r(ctx, sx, dy - 1, 1, 1, P.white);
    ctx.globalAlpha = 1;
  } else if (opts.domain === 'code') {
    // Dual daggers
    r(ctx, x - 8, dy + 10, 1, 5, P.metalL);
    r(ctx, x - 8, dy + 9, 1, 2, P.metal);
    r(ctx, x + 7, dy + 10, 1, 5, P.metalL);
    r(ctx, x + 7, dy + 9, 1, 2, P.metal);
    // Cape
    r(ctx, x - 6, dy + 6, 2, 10, dk);
    r(ctx, x - 5, dy + 7, 1, 8, md);
  } else {
    // Shield (left)
    r(ctx, x - 8, dy + 8, 4, 7, dk);
    r(ctx, x - 7, dy + 9, 2, 5, md);
    r(ctx, x - 7, dy + 11, 2, 1, lt);
    // Sword (right)
    r(ctx, x + 6, dy + 3, 1, 11, P.metalL);
    r(ctx, x + 6, dy + 2, 1, 2, P.metalD);
    r(ctx, x + 5, dy + 13, 3, 2, P.belt); // hilt
    r(ctx, x + 6, dy + 15, 1, 1, P.gold);  // pommel
  }

  ctx.globalAlpha = 1;

  if (opts.celebrating) {
    const t = Date.now()/160;
    for (let i = 0; i < 4; i++) {
      const a = t + i * 1.57;
      ctx.fillStyle = i%2===0 ? P.gold : P.white;
      r(ctx, x + Math.round(Math.cos(a)*5), dy - 4 + Math.round(Math.sin(a)*3), 1, 1, ctx.fillStyle);
    }
  }
}

// ── Monster (12×14) ──────────────────────────────────────────
const MON_S = [
  '0..0....0..0',  '00MMMMMMMM00',  '0MMMMMMMMMM0',
  '0MMe0MM0eMM0',  '0MMMMMMMMMM0',  '0MMM0ee0MMM0',
  '0MMMMMMMMMM0',  '0MmMMMMMmMM0',  '0MMMMMMMMMM0',
  '.0MMMMMMMM0.',  '..0MM00MM0..',  '..0MM..MM0..',
  '..00....00..',  '............',
];

export interface MonsterDrawOpts {
  domain: DomainKey; frame: number; dying?: boolean;
  hp?: number; maxHp?: number;
}

export function drawMonster(ctx: C2D, x: number, y: number, opts: MonsterDrawOpts) {
  const [dk,md,lt] = D_MON[opts.domain];
  const cm: Record<string,string> = { '0': P.ol, 'M': md, 'm': lt, 'e': P.eye };
  if (opts.dying) ctx.globalAlpha = Math.max(0, 1-(Date.now()%1200)/1000);
  const bob = Math.round(Math.sin(Date.now()/400+opts.frame)*1.5);
  spr(ctx, MON_S, x-6, y-14+bob, cm);
  // Horns extra detail
  r(ctx, x-6, y-16+bob, 2, 2, dk);
  r(ctx, x+4, y-16+bob, 2, 2, dk);
  // Aura glow
  ctx.globalAlpha = 0.15 + Math.sin(Date.now()/300)*0.1;
  r(ctx, x-8, y-16+bob, 16, 16, md);
  ctx.globalAlpha = 1;
  if (opts.hp!=null && opts.maxHp) drawHP(ctx, x-12, y-18, 24, opts.hp, opts.maxHp);
}

// ── HP bar ───────────────────────────────────────────────────
export function drawHP(ctx: C2D, x: number, y: number, w: number, hp: number, mx: number) {
  const p = Math.max(0, Math.min(1, hp/mx));
  r(ctx, x-1, y-1, w+2, 5, P.ol);
  r(ctx, x, y, w, 3, '#222');
  r(ctx, x, y, Math.round(w*p), 3, p>0.5?P.green:p>0.25?P.gold:P.red);
  r(ctx, x, y, Math.round(w*p), 1, p>0.5?'#4ade80':p>0.25?'#fde68a':'#fca5a5');
}

// ── Name tag ─────────────────────────────────────────────────
export function drawNameTag(ctx: C2D, x: number, y: number, name: string) {
  const w = name.length*3.5+4;
  r(ctx, Math.round(x-w/2), Math.round(y), Math.round(w), 7, '#0a0a15cc');
  ctx.fillStyle='#ddd'; ctx.font='5px monospace'; ctx.textAlign='center';
  ctx.fillText(name, Math.round(x), Math.round(y+5.5));
}

// ── Dream bubble ─────────────────────────────────────────────
export function drawDreamBubble(ctx: C2D, x: number, y: number, text: string) {
  const bob = Math.sin(Date.now()/500)*2, bx=Math.round(x-16), by=Math.round(y-30+bob);
  r(ctx, bx, by, 32, 14, '#4c1d95aa');
  r(ctx, bx+1, by-1, 30, 16, '#4c1d9588');
  r(ctx, Math.round(x)-1, by+14, 2, 3, '#4c1d95aa');
  // Stars
  for (let i=0;i<4;i++) { ctx.fillStyle=['#c4b5fd','#e9d5ff','#fff'][i%3]; r(ctx,bx+2+i*8,by+2+((i*3)%5),1,1,ctx.fillStyle); }
  ctx.fillStyle='#e9d5ff'; ctx.font='4px monospace'; ctx.textAlign='center';
  ctx.fillText(text.slice(0,8), Math.round(x), by+10);
}

// ══════════════════════════════════════════════════════════════
// BATTLE EFFECTS
// ══════════════════════════════════════════════════════════════

// Slash trail: curved white arc from attacker to target
export function drawSlashTrail(ctx: C2D, x1: number, y1: number, x2: number, y2: number, progress: number) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    if (t > progress) break;
    const px = x1 + (x2-x1)*t + Math.sin(t*Math.PI)*10;
    const py = y1 + (y2-y1)*t - Math.sin(t*Math.PI)*14;
    const alpha = Math.max(0, (1-t*0.7) * Math.min(1, progress*3));
    ctx.globalAlpha = alpha;
    const sz = 2 - t;
    r(ctx, Math.round(px), Math.round(py), Math.ceil(sz), Math.ceil(sz), P.white);
    r(ctx, Math.round(px)+1, Math.round(py)+1, 1, 1, P.gold);
  }
  ctx.globalAlpha = 1;
}

// Magic bolt: blue/purple energy ball
export function drawMagicBolt(ctx: C2D, x: number, y: number, progress: number, color: string) {
  const sz = 3 + Math.sin(progress*Math.PI)*2;
  ctx.globalAlpha = Math.min(1, (1-progress)*2);
  r(ctx, Math.round(x-sz/2), Math.round(y-sz/2), Math.ceil(sz), Math.ceil(sz), color);
  r(ctx, Math.round(x-1), Math.round(y-1), 2, 2, P.white);
  // Trail particles
  for (let i=0;i<3;i++) {
    const t = Math.max(0, progress - i*0.1);
    const px = x - (x>200?1:-1)*i*4, py = y + Math.sin(t*10+i)*3;
    r(ctx, Math.round(px), Math.round(py), 1, 1, color);
  }
  ctx.globalAlpha = 1;
}

// Impact flash: expanding white circle
export function drawImpactFlash(ctx: C2D, x: number, y: number, progress: number) {
  const radius = 3 + progress*14;
  ctx.globalAlpha = Math.max(0, (1-progress)*0.8);
  ctx.fillStyle = P.white;
  ctx.beginPath(); ctx.arc(Math.round(x),Math.round(y),radius,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = Math.max(0, (1-progress)*0.4);
  ctx.fillStyle = P.gold;
  ctx.beginPath(); ctx.arc(Math.round(x),Math.round(y),radius*1.3,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}

// Damage number: floating upward
export function drawDamageNum(ctx: C2D, x: number, y: number, value: number, progress: number, color = '#fff') {
  const yOff = progress * 24;
  ctx.globalAlpha = Math.max(0, 1-progress);
  ctx.fillStyle = P.ol;
  ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(String(value), Math.round(x)+1, Math.round(y-yOff)+1);
  ctx.fillStyle = color;
  ctx.fillText(String(value), Math.round(x), Math.round(y-yOff));
  ctx.globalAlpha = 1;
}

// Particle burst: small dots radiating outward
export function drawParticleBurst(ctx: C2D, x: number, y: number, progress: number, color: string) {
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i/count)*Math.PI*2 + progress*0.5;
    const dist = progress * 18;
    const px = x + Math.cos(angle)*dist;
    const py = y + Math.sin(angle)*dist;
    ctx.globalAlpha = Math.max(0, 1-progress);
    const c = i%2===0 ? color : P.white;
    r(ctx, Math.round(px), Math.round(py), 1, 1, c);
  }
  ctx.globalAlpha = 1;
}

export function drawSparkles(ctx: C2D, x: number, y: number, f: number) {
  const t=f*0.12; const cc=[P.gold,P.white,'#d8b4fe'];
  for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2+t,rv=7+Math.sin(t*2+i)*3;
    ctx.fillStyle=cc[i%3]; r(ctx,Math.round(x+Math.cos(a)*rv),Math.round(y-8+Math.sin(a)*rv),1,1,ctx.fillStyle);}
}

// ══════════════════════════════════════════════════════════════
// TILES (same as before, keeping for completeness)
// ══════════════════════════════════════════════════════════════
function H(a:number,b:number):number{return((a*2654435761)^(b*2246822519))>>>0;}

function tGrass(c:C2D,x:number,y:number){r(c,x,y,16,16,P.grassB);const h=H(x,y);r(c,x+(h%6)*2+1,y+((h>>4)%5)*3+1,1,2,P.grassD);r(c,x+((h>>8)%12)+2,y+((h>>12)%10)+3,1,2,P.grassD);if((h&0xf)>8)r(c,x+((h>>16)%11)+2,y+((h>>20)%10)+3,1,1,P.grassL);if((h&0xf0)>0x90)r(c,x+((h>>24)%10)+3,y+((h>>28)%8)+4,2,1,P.grass);}
function tPath(c:C2D,x:number,y:number){r(c,x,y,16,16,P.path);const h=H(x+99,y+77);r(c,x+(h%5)*3+1,y+((h>>4)%4)*4,2,1,P.pathD);r(c,x+((h>>8)%10)+3,y+((h>>12)%10)+3,1,1,P.pathD);r(c,x+((h>>16)%12)+2,y+((h>>20)%12)+2,2,1,P.pathL);r(c,x+((h>>24)%8)+4,y+((h>>28)%8)+4,1,1,P.pathL);}
function tCobble(c:C2D,x:number,y:number){r(c,x,y,16,16,P.cobble);r(c,x,y+4,16,1,P.cobbleD);r(c,x,y+10,16,1,P.cobbleD);r(c,x+5,y,1,4,P.cobbleD);r(c,x+11,y,1,4,P.cobbleD);r(c,x+3,y+5,1,5,P.cobbleD);r(c,x+8,y+5,1,5,P.cobbleD);r(c,x+13,y+5,1,5,P.cobbleD);r(c,x+5,y+11,1,5,P.cobbleD);r(c,x+11,y+11,1,5,P.cobbleD);r(c,x+2,y+1,2,2,P.cobbleL);r(c,x+9,y+2,1,1,P.cobbleL);r(c,x+5,y+7,2,1,P.cobbleL);r(c,x+1,y+12,2,2,P.cobbleL);r(c,x+8,y+13,2,1,P.cobbleL);}
function tTree(c:C2D,x:number,y:number){tGrass(c,x,y);r(c,x+5,y+10,6,6,P.trunkD);r(c,x+6,y+10,4,6,P.trunk);r(c,x+7,y+11,1,4,P.trunkL);r(c,x+1,y+2,14,9,P.treeD);r(c,x+2,y+1,12,11,P.treeD);r(c,x+2,y+2,12,8,P.tree);r(c,x+3,y+1,10,10,P.tree);r(c,x+4,y+2,5,3,P.treeL);r(c,x+3,y+4,3,2,P.treeL);r(c,x+5,y+1,3,1,P.treeL);r(c,x+9,y+7,4,2,P.treeD);r(c,x+3,y+8,3,2,P.treeD);r(c,x+7,y+9,2,1,P.treeD);}
function tRoof(c:C2D,x:number,y:number){r(c,x,y,16,16,P.roofD);r(c,x,y+2,16,12,P.roof);r(c,x+1,y+3,6,2,P.roofL);r(c,x+1,y+7,6,2,P.roofL);r(c,x+1,y+11,6,2,P.roofL);r(c,x+8,y+5,7,1,P.roofD);r(c,x,y+9,7,1,P.roofD);r(c,x,y+14,16,2,P.roofD);r(c,x,y+15,16,1,'#5a2a0a');}
function tWall(c:C2D,x:number,y:number){r(c,x,y,16,16,P.wall);r(c,x,y+5,16,1,P.wallD);r(c,x,y+11,16,1,P.wallD);r(c,x+8,y,1,5,P.wallD);r(c,x+4,y+6,1,5,P.wallD);r(c,x+12,y+6,1,5,P.wallD);r(c,x+8,y+12,1,4,P.wallD);r(c,x+1,y+1,3,1,P.wallL);r(c,x+10,y+7,1,1,P.wallL);r(c,x+2,y+13,2,1,P.wallL);}
function tWindow(c:C2D,x:number,y:number){tWall(c,x,y);r(c,x+4,y+2,8,8,P.wallD);r(c,x+5,y+3,6,6,'#3a5a8a');r(c,x+5,y+3,3,3,'#6a9acc');r(c,x+5,y+3,1,2,'#90c0ee');r(c,x+4,y+5,8,1,P.wallD);r(c,x+7,y+2,1,8,P.wallD);r(c,x+4,y+10,8,1,P.wallL);}
function tDoor(c:C2D,x:number,y:number){r(c,x,y,16,16,P.wall);r(c,x,y,16,1,P.wallD);r(c,x+3,y+1,10,15,P.doorD);r(c,x+4,y+2,8,14,P.door);r(c,x+5,y+3,3,4,P.doorL);r(c,x+5,y+9,3,4,P.doorL);r(c,x+5,y+7,6,1,P.doorD);r(c,x+10,y+8,1,2,P.gold);r(c,x+3,y+15,10,1,P.stoneL);}
function tWell(c:C2D,x:number,y:number){tGrass(c,x,y);r(c,x+1,y+4,14,11,P.stoneD);r(c,x+2,y+5,12,9,P.stone);r(c,x+3,y+5,3,2,P.stoneL);r(c,x+10,y+6,2,1,P.stoneL);r(c,x+3,y+7,10,5,P.waterD);r(c,x+4,y+8,6,3,P.water);r(c,x+5,y+9,2,1,P.waterH);r(c,x+3,y+1,2,6,P.trunk);r(c,x+11,y+1,2,6,P.trunk);r(c,x+2,y+1,12,2,P.trunkL);r(c,x+2,y+0,12,1,P.trunkD);r(c,x+7,y+2,1,5,P.wallD);r(c,x+6,y+6,3,2,P.trunk);}
function tFlower(c:C2D,x:number,y:number){tGrass(c,x,y);const h=H(x+33,y+44),cl=['#f472b6','#fb923c','#facc15','#a78bfa','#f87171','#34d399'];for(let i=0;i<3;i++){const fx=x+2+((h>>(i*5))%9),fy=y+3+((h>>(i*5+2))%8),co=cl[(h>>(i*3))%cl.length];r(c,fx,fy,3,3,co);r(c,fx-1,fy+1,1,1,co);r(c,fx+3,fy+1,1,1,co);r(c,fx+1,fy-1,1,1,co);r(c,fx+1,fy+1,1,1,P.gold);r(c,fx+1,fy+3,1,3,P.grassD);r(c,fx+2,fy+4,1,1,P.grass);}}
function tBush(c:C2D,x:number,y:number){tGrass(c,x,y);r(c,x+2,y+5,12,10,P.treeD);r(c,x+3,y+4,10,12,P.treeD);r(c,x+3,y+5,10,9,P.tree);r(c,x+4,y+4,8,11,P.tree);r(c,x+4,y+5,4,3,P.treeL);r(c,x+5,y+4,2,1,P.treeL);const h=H(x,y);if(h%3===0){r(c,x+8,y+7,2,2,'#ef4444');r(c,x+5,y+10,2,2,'#ef4444');}}
function tGate(c:C2D,x:number,y:number){tGrass(c,x,y);r(c,x+2,y,12,16,P.stoneD);r(c,x+3,y+1,10,14,P.stone);r(c,x+4,y+2,4,3,P.stoneL);r(c,x+4,y+8,3,2,P.stoneL);r(c,x+5,y,6,1,P.trunk);const t=(Date.now()/200)%3;r(c,x+6+Math.round(t%2),y-2,3,2,'#ff6b35');r(c,x+7,y-3,2,2,P.gold);r(c,x+7,y-3,1,1,'#fff8');}
function tWater(c:C2D,x:number,y:number){r(c,x,y,16,16,P.waterD);const t=(Date.now()/700+x*0.08+y*0.04)%1;for(let i=0;i<4;i++){r(c,x+((i*4+Math.floor(t*16))%14)+1,y+i*4+1,3,1,P.water);}r(c,x+3+Math.floor(t*8),y+5,3,1,P.waterL);r(c,x+8+Math.floor((1-t)*5),y+11,2,1,P.waterL);r(c,x+6+Math.floor(t*4),y+3,1,1,P.waterH);r(c,x+2+Math.floor((1-t)*6),y+9,1,1,P.waterH);}
function tFence(c:C2D,x:number,y:number){tGrass(c,x,y);r(c,x,y+5,16,3,P.fenceD);r(c,x,y+11,16,3,P.fenceD);r(c,x,y+5,16,2,P.fence);r(c,x,y+11,16,2,P.fence);r(c,x+7,y+3,3,12,P.fenceD);r(c,x+7,y+3,2,11,P.fence);r(c,x+6,y+2,4,2,P.fenceD);}
function tCrop(c:C2D,x:number,y:number){r(c,x,y,16,16,P.cropSoil);r(c,x,y+4,16,1,'#5a3a1a');r(c,x,y+9,16,1,'#5a3a1a');r(c,x,y+14,16,1,'#5a3a1a');const h=H(x+55,y+66);for(let i=0;i<3;i++){const cx2=x+1+i*5,cy=y+1;r(c,cx2,cy,1,3,P.crop);r(c,cx2+2,cy+1,1,2,P.crop);r(c,cx2+1,cy,1,2,P.cropD);if((h>>(i*4))%3>0){r(c,cx2,cy-1,2,1,['#ef4444','#fbbf24','#fb923c'][(h>>(i*2))%3]);}}for(let i=0;i<3;i++){const cx2=x+2+i*5,cy=y+6;r(c,cx2,cy,1,2,P.crop);r(c,cx2+1,cy,1,3,P.crop);r(c,cx2-1,cy+1,1,1,P.grassD);}}

export const TC = {
  GRASS:0,PATH:1,TREE:2,WALL:3,ROOF:4,DOOR:5,WINDOW:6,WELL:7,
  FLOWER:8,BUSH:9,GATE:10,WATER:11,COBBLE:12,CROP:13,FENCE:14,
} as const;

const TFN:Record<number,(c:C2D,x:number,y:number)=>void>={
  [TC.GRASS]:tGrass,[TC.PATH]:tPath,[TC.TREE]:tTree,[TC.WALL]:tWall,[TC.ROOF]:tRoof,
  [TC.DOOR]:tDoor,[TC.WINDOW]:tWindow,[TC.WELL]:tWell,[TC.FLOWER]:tFlower,[TC.BUSH]:tBush,
  [TC.GATE]:tGate,[TC.WATER]:tWater,[TC.COBBLE]:tCobble,[TC.CROP]:tCrop,[TC.FENCE]:tFence,
};
export function drawTile(c:C2D,code:number,gx:number,gy:number){(TFN[code]??tGrass)(c,gx,gy);}

export function renderTilemap(map:number[][]):HTMLCanvasElement{
  const cv=document.createElement('canvas');cv.width=GAME_W;cv.height=GAME_H;
  const c=cv.getContext('2d')!;c.imageSmoothingEnabled=false;
  for(let r2=0;r2<map.length;r2++)for(let c2=0;c2<map[r2].length;c2++)drawTile(c,map[r2][c2],c2*TILE,r2*TILE);
  return cv;
}
