// Pixel graphics, the second identity element (the first is the heat gradient).
// Everything is drawn on a small grid and scaled up with image-rendering: pixelated, so every square stays crisp.
const BLUES = ['#DDE4FF', '#B9C3FF', '#7C8DFF', '#2D36FF', '#1A18FF'];
const hash = (x, y, s = 0) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));

function grid(canvas, W, H) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
  return { ctx, px };
}
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };

// ---------- Edge: a static band of squares that joins two areas (e.g. a section to the one under it) ----------
export function pixelEdge(canvas, { color, cell = 14, seed = 3, rows = 7 } = {}) {
  const W = Math.ceil(canvas.clientWidth / cell), H = rows;
  const { px } = grid(canvas, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y + 1) / H;                                     // 0 at the far edge, 1 where it meets the solid area
    const n = hash(Math.floor(x / 3), y, seed) * .45 + hash(x, y, seed + 1) * .55;
    if (n < k * k * 1.05) px(x, y, color);
  }
}

// ---------- Portrait: an upper-body pixel figure, generated from a seed (dummy team photos) ----------
const SKIN = ['#F2C9A8', '#E0AC84', '#C98E63', '#A86D47', '#7A4B2F', '#5B3722'];
const HAIR = ['#1B1412', '#3A2418', '#6B3E22', '#B5713D', '#D9B07A', '#2C1412', '#6B6F82'];
const SHIRT = ['#1A18FF', '#E42114', '#2C1412', '#F4F2EE', '#7C8DFF', '#FF5E55', '#16a34a'];
const BG = ['#DDE4FF', '#F3E5DF', '#E8E9F0', '#EAE7E0', '#FFE3DE', '#E2E6F6'];
export function portrait(canvas, seed) {
  const W = 40, H = 50, r = k => hash(seed, k, 91);
  const { px } = grid(canvas, W, H);
  const bg = BG[Math.floor(r(1) * BG.length)], skin = SKIN[Math.floor(r(2) * SKIN.length)], hair = HAIR[Math.floor(r(3) * HAIR.length)];
  const shirt = SHIRT[Math.floor(r(4) * SHIRT.length)], style = Math.floor(r(5) * 5), glasses = r(6) > .6, collar = r(7) > .5;
  // background with a dithered band of blue squares at the bottom, the brand's pixel field
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    px(x, y, bg);
    const k = (y - 30) / 20; if (k > 0 && k > BAYER[y & 3][x & 3] * 1.6 && hash(x, y, seed) > .55) px(x, y, BLUES[(x + y + seed) % 3 + 1]);
  }
  const cx = 20;
  // shoulders and torso
  for (let y = 34; y < H; y++) { const half = Math.min(17, 8 + (y - 34) * 1.6); for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) px(x, y, x > cx + half * .45 ? shade(shirt, .82) : shirt); }
  if (collar) { for (let i = 0; i < 4; i++) { px(cx - 3 + i, 34 + i, shade(shirt, .6)); px(cx + 2 - i, 34 + i, shade(shirt, .6)); } }
  // neck
  for (let y = 29; y < 36; y++) for (let x = cx - 3; x < cx + 3; x++) px(x, y, y < 32 ? shade(skin, .82) : skin);
  // head
  for (let y = 10; y < 31; y++) for (let x = 9; x < 31; x++) {
    const dx = (x + .5 - cx) / 8.2, dy = (y + .5 - 20) / 10.4;
    if (dx * dx + dy * dy < 1) px(x, y, dx > .45 ? shade(skin, .88) : skin);
  }
  // ears
  px(11, 19, shade(skin, .85), 1, 3); px(28, 19, shade(skin, .8), 1, 3);
  // hair styles: 0 short, 1 long, 2 bun, 3 curly, 4 buzz
  const hairCell = (x, y) => px(x, y, hash(x, y, seed + 5) > .85 ? shade(hair, 1.25) : hair);
  for (let y = 7; y < 31; y++) for (let x = 7; x < 33; x++) {
    const dx = (x + .5 - cx) / 9, dy = (y + .5 - 18) / 10.8, d = dx * dx + dy * dy;
    const top = y < 15 - (style === 4 ? -1 : 0) + Math.abs(x - cx) * .18;
    if (style === 1 && d < 1.12 && (top || (y > 13 && Math.abs(x - cx) > 7))) hairCell(x, y);
    else if (style === 3 && d < 1.2 && (top || (y < 20 && Math.abs(x - cx) > 7)) && hash(x, y, seed) > .12) hairCell(x, y);
    else if ((style === 0 || style === 2 || style === 4) && d < 1.02 && top) hairCell(x, y);
  }
  if (style === 2) for (let y = 3; y < 8; y++) for (let x = cx - 3; x < cx + 3; x++) if ((x - cx + .5) ** 2 + (y - 5.5) ** 2 < 8) hairCell(x, y);
  // face
  const eyeY = 20; px(cx - 4, eyeY, '#1B1412', 2, 2); px(cx + 2, eyeY, '#1B1412', 2, 2);
  px(cx - 4, eyeY - 2, shade(hair, .9), 3, 1); px(cx + 2, eyeY - 2, shade(hair, .9), 3, 1);
  if (glasses) { for (const ox of [-6, 1]) { px(cx + ox, eyeY - 1, '#2C1412', 5, 1); px(cx + ox, eyeY + 2, '#2C1412', 5, 1); px(cx + ox, eyeY - 1, '#2C1412', 1, 4); px(cx + ox + 4, eyeY - 1, '#2C1412', 1, 4); } px(cx - 1, eyeY, '#2C1412', 2, 1); }
  px(cx - 1, 23, shade(skin, .78), 2, 2);
  px(cx - 2, 26, shade(skin, .6), 4, 1);
}

// ---------- Honourable mentions: two characters, drawn by hand, with a little life in them ----------
// ChatGPT: a calm green figure with an interlocking-loop head, mid-thought (typing bubble).
// Claude: a warm terracotta figure with a sunburst head and a mug of coffee at 2 a.m.
export function bot(canvas, kind) {
  const W = 40, H = 50;
  const { ctx, px } = grid(canvas, W, H);
  const C = kind === 'gpt'
    ? { bg: '#DDF5EC', band: ['#10A37F', '#0B7A60', '#7FD6B8'], body: '#0B7A60', head: '#10A37F', hi: '#7FE3C2', ink: '#06382C' }
    : { bg: '#F6E4D8', band: ['#D97757', '#B65A3E', '#F0A887'], body: '#B65A3E', head: '#D97757', hi: '#F6B696', ink: '#4A2416' };
  let t = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      px(x, y, C.bg);
      const k = (y - 32) / 18; if (k > 0 && k > BAYER[y & 3][x & 3] * 1.5 && hash(x, y, 7) > .5) px(x, y, C.band[(x + y) % 3]);
    }
    // body
    for (let y = 35; y < H; y++) { const half = Math.min(16, 8 + (y - 35) * 1.5); px(20 - half, y, C.body, half * 2, 1); }
    px(17, 31, C.body, 6, 5);
    const blink = (t % 46) < 2;
    if (kind === 'gpt') {
      // head: six overlapping rounded loops (a knot of thought)
      for (let a = 0; a < 6; a++) {
        const ang = a / 6 * Math.PI * 2 + Math.PI / 6, ox = 20 + Math.cos(ang) * 4.2, oy = 20 + Math.sin(ang) * 4.2;
        for (let y = 9; y < 32; y++) for (let x = 8; x < 32; x++) { const d = Math.hypot(x + .5 - ox, y + .5 - oy); if (d > 5.2 && d < 6.6) px(x, y, a % 2 ? C.head : C.hi); }
      }
      for (let y = 15; y < 26; y++) for (let x = 15; x < 26; x++) if (Math.hypot(x + .5 - 20.5, y + .5 - 20.5) < 5) px(x, y, C.head);
      if (!blink) { px(17, 19, '#fff', 2, 2); px(22, 19, '#fff', 2, 2); } else { px(17, 20, '#fff', 2, 1); px(22, 20, '#fff', 2, 1); }
      // speech bubble with typing dots
      px(28, 3, '#fff', 11, 7); px(28, 10, '#fff', 2, 2);
      for (let i = 0; i < 3; i++) px(30 + i * 3, 6 - (Math.floor(t / 4) % 3 === i ? 1 : 0), C.body, 2, 2);
    } else {
      // head: a sunburst of twelve rays around a warm core
      for (let a = 0; a < 12; a++) {
        const ang = a / 12 * Math.PI * 2 + t * .01, len = a % 2 ? 9 : 11;
        for (let s = 3; s < len; s += .5) px(20 + Math.cos(ang) * s, 20 + Math.sin(ang) * s, a % 3 ? C.head : C.hi);
      }
      for (let y = 15; y < 26; y++) for (let x = 15; x < 26; x++) if (Math.hypot(x + .5 - 20.5, y + .5 - 20.5) < 4.6) px(x, y, C.hi);
      if (!blink) { px(18, 20, C.ink, 2, 2); px(22, 20, C.ink, 2, 2); } else { px(18, 21, C.ink, 2, 1); px(22, 21, C.ink, 2, 1); }
      // mug and steam
      px(27, 37, '#F4F2EE', 7, 8); px(34, 39, '#F4F2EE', 2, 4); px(28, 38, '#2C1412', 5, 1);
      for (let i = 0; i < 3; i++) { const sy = 34 - ((t / 3 + i * 3) % 9); px(29 + i * 2 + (Math.floor(sy) % 2), sy, 'rgba(255,255,255,.85)'); }
      // 2 a.m. clock
      px(2, 3, C.ink, 13, 7); ctx.fillStyle = '#FF5E55';
      const seg = [[3, 4], [4, 4], [5, 4], [5, 5], [5, 6], [4, 6], [3, 6], [3, 7], [3, 8], [4, 8], [5, 8]]; seg.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
      if (Math.floor(t / 8) % 2) ctx.fillRect(7, 5, 1, 1), ctx.fillRect(7, 7, 1, 1);
      [[9, 4], [10, 4], [11, 4], [9, 5], [11, 5], [9, 6], [10, 6], [11, 6], [9, 7], [11, 7], [9, 8], [11, 8]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
      [[12, 4], [13, 4], [14, 4], [12, 5], [12, 6], [13, 6], [14, 6], [12, 7], [14, 5], [14, 7], [12, 8], [14, 8]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    }
  };
  draw();
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches || true) setInterval(() => { t++; if (canvas.isConnected) draw(); }, 140);
}

// ---------- Scenes for the about page (dummy images until real photos arrive) ----------
// Bengaluru at dusk: a heat-gradient sky quantised into dithered bands, the skyline in pixels with lit windows.
export function skyline(canvas) {
  const W = 168, H = 64;
  const { px } = grid(canvas, W, H);
  const sky = ['#2D36FF', '#7C3BB8', '#C3307A', '#E42114', '#FF5E55', '#FF9A7A', '#FFD3C2'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = y / (H * .78) * (sky.length - 1), i = Math.floor(v), f = v - i;
    px(x, y, sky[Math.min(sky.length - 1, i + (f > BAYER[y & 3][x & 3] ? 1 : 0))]);
  }
  // sun
  for (let y = 30; y < 46; y++) for (let x = 112; x < 128; x++) if (Math.hypot(x + .5 - 120, y + .5 - 38) < 7.5 && (y % 3 || y < 36)) px(x, y, '#FFE9DF');
  // skyline: three depths
  const layers = [['#5A1C3A', 40, 7, 11], ['#30122A', 46, 5, 9], ['#160C1E', 52, 4, 7]];
  layers.forEach(([col, base, minW, maxW], li) => {
    let x = -2, k = 0;
    while (x < W) {
      const w = minW + Math.floor(hash(k, li, 4) * (maxW - minW)), h = 6 + Math.floor(hash(k, li, 9) * (li === 0 ? 22 : 16));
      for (let yy = base - h; yy < H; yy++) px(x, yy, col, w, 1);
      if (li === 2) for (let yy = base - h + 2; yy < base + 6; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (hash(xx, yy, 2) > .62) px(xx, yy, hash(xx, yy, 3) > .5 ? '#FFC9A8' : '#FFE9A8');
      if (hash(k, li, 13) > .86) px(x + (w >> 1), base - h - 4, col, 1, 4);   // antenna
      x += w + (hash(k, li, 5) > .7 ? 1 : 0); k++;
    }
  });
  // ground
  for (let x = 0; x < W; x++) px(x, H - 3, '#0D0E1C', 1, 3);
}

// The studio desk: a laptop showing the mark's "> <", a mug, a sticky note.
export function desk(canvas) {
  const W = 84, H = 64;
  const { px } = grid(canvas, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(x, y, y < 40 ? (BAYER[y & 3][x & 3] > .5 ? '#E8E9F0' : '#DDE4FF') : '#C9B49C');
  for (let x = 0; x < W; x++) px(x, 40, '#A88F76');
  // window light
  for (let y = 4; y < 30; y++) for (let x = 54; x < 78; x++) if ((x - 54) % 12 && (y - 4) % 13) px(x, y, '#F7F8FF');
  // laptop
  px(18, 18, '#1C1D2E', 34, 20); px(20, 20, '#0D0E1C', 30, 16);
  [[28, 26], [29, 27], [30, 28], [29, 29], [28, 30]].forEach(([x, y]) => px(x, y, '#FF5E55'));
  [[42, 26], [41, 27], [40, 28], [41, 29], [42, 30]].forEach(([x, y]) => px(x, y, '#FF5E55'));
  px(14, 38, '#3A3B52', 42, 3); px(30, 38, '#5B5C78', 10, 1);
  // mug
  px(60, 31, '#E42114', 7, 9); px(67, 33, '#E42114', 2, 4); px(61, 32, '#FF5E55', 2, 7);
  for (let i = 0; i < 3; i++) px(61 + i * 2, 27 - i, 'rgba(255,255,255,.8)');
  // sticky note
  px(6, 24, '#FFE97A', 9, 9); px(7, 26, '#B59A2A', 6, 1); px(7, 28, '#B59A2A', 5, 1); px(7, 30, '#B59A2A', 6, 1);
  // plant
  px(70, 44, '#2C1412', 6, 6); for (let i = 0; i < 9; i++) px(68 + (i % 5) * 2, 36 + Math.floor(i / 5) * 3 - (i % 2), '#16a34a', 2, 3);
}

// Pixel field for a stat cell: blue squares rising from the bottom, one or two coral.
export function field(canvas, seed = 1) {
  const W = 30, H = 22;
  const { px } = grid(canvas, W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y / H, n = hash(x, y, seed);
    if (n < k * k * k * 1.15) px(x, y, n < .012 ? '#FF5E55' : BLUES[Math.min(4, 1 + Math.floor(hash(x, y, seed + 3) * 4))]);
  }
}
