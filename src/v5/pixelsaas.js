// Pixel graphics for the home page: the footer's pixel-edge mask, one graphic per kind of software we build,
// and the About teaser's mark that assembles step by step. Same grid-and-scale method as pixelart.js.
const hash = (x, y, s = 0) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
function grid(canvas, W, H) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
  return { ctx, px };
}
const mix = (a, b, t) => {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

// ---------- Pixel edge as a mask, drawn at display size so every square stays crisp ----------
// Opaque where the area below is solid, squares thinning out toward the top. Used as a CSS mask, so the
// footer's own background (pattern included) shows through the gaps: no flat band of a different shade.
export function pixelMask(width, { cell = 14, rows = 7, seed = 3 } = {}) {
  const c = document.createElement('canvas'), W = Math.ceil(width / cell);
  c.width = W * cell; c.height = rows * cell;
  const g = c.getContext('2d'); g.fillStyle = '#000';
  for (let y = 0; y < rows; y++) for (let x = 0; x < W; x++) {
    const k = (y + 1) / rows, n = hash(Math.floor(x / 3), y, seed) * .45 + hash(x, y, seed + 1) * .55;
    if (n < k * k * 1.05) g.fillRect(x * cell, y * cell, cell, cell);
  }
  return { url: c.toDataURL(), w: W * cell, h: rows * cell };
}

// ---------- What we build: one pixel graphic per kind of software, each in its own colour ----------
export function saas(canvas, kind, c) {
  const W = 48, H = 36, dark = document.documentElement.dataset.theme === 'dark';
  const { px } = grid(canvas, W, H);
  const bg = dark ? mix(c, '#0D0E1C', .78) : mix(c, '#FFFFFF', .84), bg2 = dark ? mix(c, '#0D0E1C', .62) : mix(c, '#FFFFFF', .68);
  const d = mix(c, '#0D0E1C', .45), l = mix(c, '#FFFFFF', .55), W1 = dark ? '#E9EBFA' : '#FFFFFF', ink = dark ? '#05060E' : mix(c, '#0D0E1C', .72);
  const rect = (x, y, w, h, col) => px(x, y, col, w, h);
  const line = (x0, y0, x1, y1, col, dash = 0) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) if (!dash || i % dash < dash - 1) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
  };
  const disc = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * .6) px(cx + x, cy + y, col); };

  // ground: tint, a dithered band rising from the bottom, a few loose squares
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    px(x, y, bg);
    const k = (y - 22) / 14; if (k > 0 && k > BAYER[y & 3][x & 3] * 1.4) px(x, y, bg2);
  }
  for (let i = 0; i < 7; i++) px(Math.floor(hash(i, 3, kind.length) * W), Math.floor(hash(i, 5, kind.length) * 12), i % 3 ? bg2 : l, 1, 1);
  rect(10, 31, 28, 1, bg2); rect(13, 32, 22, 1, bg2);

  if (kind === 'extension') {
    // a browser window with a puzzle piece docked in it
    rect(8, 6, 32, 24, d); rect(9, 10, 30, 19, W1); rect(9, 7, 30, 2, d);
    px(10, 7, '#FF5E55'); px(12, 7, '#FFC93C'); px(14, 7, '#2BD47D');
    rect(18, 7, 17, 2, mix(c, '#0D0E1C', .2)); rect(36, 7, 2, 2, c);
    rect(19, 15, 10, 10, c); rect(22, 13, 4, 2, c); rect(29, 18, 2, 4, c);
    rect(19, 15, 10, 1, l); rect(19, 24, 10, 1, d);
    rect(11, 12, 5, 1, l); rect(11, 14, 4, 1, l); rect(11, 16, 5, 1, l);
  } else if (kind === 'saas') {
    // a sawtooth-roof works with a live chart on its wall: software made for one industry
    rect(8, 15, 32, 15, c);
    for (let i = 0; i < 4; i++) for (let y = 0; y < 6; y++) { const w = 8 - Math.ceil(y * 1.3); if (w > 0) rect(8 + i * 8, 14 - y, w, 1, i % 2 ? c : mix(c, '#0D0E1C', .18)); }
    rect(33, 3, 4, 12, d); px(34, 1, l, 2, 1); px(37, 0, l, 1, 1);
    for (let i = 0; i < 4; i++) rect(11 + i * 7, 18, 4, 3, W1);
    rect(11, 23, 26, 5, d);
    [26, 25, 26, 24, 25, 23, 24, 24, 23, 24, 24].forEach((y, i) => rect(12 + i * 2, y, 2, 1, '#2BD47D'));
  } else if (kind === 'ai') {
    // nodes passing a spark: an agent at work
    const N = [[10, 9], [10, 25], [24, 17], [38, 9], [38, 25]];
    [[0, 2], [1, 2], [2, 3], [2, 4]].forEach(([a, b]) => line(N[a][0], N[a][1], N[b][0], N[b][1], l));
    N.forEach(([x, y], i) => { if (i !== 2) disc(x, y, 2, i % 2 ? d : c); });
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
      const ax = Math.abs(x), ay = Math.abs(y);
      if (ax * ay <= 2 && ax + ay <= 8) px(24 + x, 17 + y, ax + ay < 3 ? W1 : c);
    }
    for (const [x, y] of [[36, 17], [37, 16], [37, 18], [38, 17], [37, 17]]) px(x, y, d);
  } else if (kind === 'crm') {
    // a contact card beside a pipeline of leads
    rect(6, 6, 24, 17, W1); rect(6, 6, 24, 1, d); rect(6, 22, 24, 1, mix(c, '#0D0E1C', .3));
    disc(12, 12, 3, c); rect(9, 17, 7, 4, c);
    rect(18, 10, 10, 1, d); rect(18, 13, 8, 1, l); rect(18, 16, 9, 1, l); rect(18, 19, 6, 1, l);
    for (let y = 0; y < 14; y++) { const w = Math.max(2, 12 - Math.floor(y * .75)); rect(37 - (w >> 1), 7 + y, w, 1, y % 4 === 3 ? bg : y < 4 ? l : y < 8 ? c : d); }
    rect(10, 26, 26, 3, d); rect(11, 27, 16, 1, '#2BD47D');
  } else if (kind === 'erp') {
    // stacked crates and a gear: stock, orders, operations
    const box = (x, y, col) => { rect(x, y, 11, 8, col); rect(x, y, 11, 1, mix(col, '#FFFFFF', .35)); rect(x + 4, y, 3, 8, mix(col, '#FFFFFF', .45)); rect(x, y + 7, 11, 1, mix(col, '#0D0E1C', .35)); };
    box(8, 22, c); box(20, 22, d); box(14, 14, mix(c, '#FFFFFF', .2));
    const gx = 36, gy = 11;
    for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; rect(Math.round(gx + Math.cos(an) * 6) - 1, Math.round(gy + Math.sin(an) * 6) - 1, 3, 3, ink); }
    disc(gx, gy, 5, ink); disc(gx, gy, 2, bg);
    rect(33, 22, 8, 8, W1); rect(34, 24, 6, 1, l); rect(34, 26, 4, 1, c); rect(34, 28, 5, 1, l);
  } else if (kind === 'dashboard') {
    // an admin panel: sidebar and a bar chart, one bar in red
    rect(6, 5, 36, 25, d); rect(7, 8, 34, 21, W1); rect(7, 6, 34, 1, mix(c, '#0D0E1C', .2));
    rect(8, 9, 7, 19, mix(c, '#FFFFFF', .8)); for (let i = 0; i < 5; i++) rect(9, 11 + i * 3, 5, 1, i ? l : c);
    [6, 9, 7, 12, 10, 15].forEach((h, i) => rect(18 + i * 4, 26 - h, 3, h, i === 5 ? '#FF5E55' : i % 2 ? c : d));
    rect(17, 26, 23, 1, l);
  } else if (kind === 'integrations') {
    // two systems joined by a live connection
    rect(5, 9, 13, 15, c); rect(5, 9, 13, 1, l); for (let i = 0; i < 3; i++) rect(8, 13 + i * 3, 7, 1, W1);
    rect(30, 9, 13, 15, d); rect(30, 9, 13, 1, l); for (let i = 0; i < 3; i++) rect(33, 13 + i * 3, 7, 1, W1);
    rect(18, 15, 3, 3, ink); rect(27, 15, 3, 3, ink); line(21, 16, 26, 16, ink);
    rect(22, 15, 4, 3, '#FFC93C');
    line(11, 24, 11, 28, ink, 2); line(11, 28, 36, 28, ink, 2); line(36, 24, 36, 28, ink, 2);
  } else if (kind === 'mobile') {
    // a phone running an app, with signal
    rect(16, 3, 16, 29, ink); rect(17, 6, 14, 22, W1); rect(21, 4, 6, 1, mix(ink, '#FFFFFF', .3)); rect(22, 29, 4, 1, mix(ink, '#FFFFFF', .4));
    for (let i = 0; i < 6; i++) rect(18 + (i % 3) * 4, 8 + Math.floor(i / 3) * 5, 3, 3, i === 4 ? '#FF5E55' : i % 2 ? d : c);
    rect(18, 19, 11, 2, l); rect(18, 23, 8, 2, l);
    for (let r = 3; r <= 9; r += 3) for (let a = -.8; a <= .8; a += .1) px(Math.round(34 + Math.cos(a) * r), Math.round(10 + Math.sin(a) * r), r === 9 ? l : c);
  }
}
