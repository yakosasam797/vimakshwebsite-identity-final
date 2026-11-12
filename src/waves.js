// The Vimaksh line-wave identity: six thin contours of one long swell, drawn as SVG.
// y_i(u) = H/2 + A sin(2π(0.85u − 0.10) + φ + 0.045n) + n·s + n·B sin(2π(u + 0.08) + φ) + 1.5 sin(πu) sin(2πu + 0.28n)
// See DESIGN.md §8. Deterministic: the same shape on every load. Decorative only (aria-hidden).

const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const VARIANTS = {
  horizon: { N: 6, d: { H: 144, A: 24, s: 4, B: 3.5 }, m: { H: 88, A: 12, s: 2.5, B: 2 }, scroll: true },
  chapter: { N: 6, d: { H: 112, A: 18, s: 3, B: 2.5 }, m: { H: 64, A: 9, s: 2, B: 1.5 }, scroll: true },
  divider: { N: 3, d: { H: 32, A: 3, s: 3, B: 0.5 }, m: { H: 24, A: 2, s: 2.5, B: 0 } },
  studio: { N: 6, d: { H: 96, A: 14, s: 3, B: 2 }, m: { H: 64, A: 8, s: 2, B: 1 }, scroll: true },
  frame: { N: 6, d: { H: 24, A: 2, s: 2, B: 0 }, m: { H: 24, A: 2, s: 2, B: 0 } },
};

function lineY(u, n, p, phi) {
  const { H, A, s, B } = p, TAU = Math.PI * 2;
  return H / 2 + A * Math.sin(TAU * (0.85 * u - 0.10) + phi + 0.045 * n) + n * s + n * B * Math.sin(TAU * (u + 0.08) + phi)
    + 1.5 * Math.sin(Math.PI * u) * Math.sin(TAU * u + 0.28 * n);
}

// Catmull-Rom through evenly spaced samples, written as cubic Béziers (no overshoot at this low curvature).
function pathFor(W, n, p, phi, step) {
  const pad = 24, x0 = -pad, x1 = W + pad, count = Math.max(4, Math.ceil((x1 - x0) / step));
  const pts = [];
  for (let k = 0; k <= count; k++) { const x = x0 + (x1 - x0) * k / count; pts.push([x, lineY((x + pad) / (W + 2 * pad), n, p, phi)]); }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(2)}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[k], c = pts[k + 1], e = pts[Math.min(pts.length - 1, k + 2)];
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(1)} ${c[1].toFixed(2)}`;
  }
  return d;
}

// Never clip a crest: reduce amplitude until every line stays 12px inside the band (4px for small bands).
function fitParams(W, N, base, phi) {
  const p = { ...base }, margin = p.H >= 60 ? 12 : Math.min(4, p.H / 4);
  for (let tries = 0; tries < 12; tries++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) { const n = i - (N - 1) / 2; for (let k = 0; k <= 60; k++) { const y = lineY(k / 60, n, p, phi); lo = Math.min(lo, y); hi = Math.max(hi, y); } }
    if (lo >= margin && hi <= p.H - margin) break;
    p.A *= 0.9; p.B *= 0.95;
  }
  return p;
}

class Wave {
  constructor(el) {
    this.el = el; this.name = el.dataset.wave; this.v = VARIANTS[this.name];
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('aria-hidden', 'true'); this.svg.setAttribute('focusable', 'false');
    this.svg.classList.add('wave-svg');
    el.appendChild(this.svg); el.setAttribute('aria-hidden', 'true');
    this.paths = [];
    for (let i = 0; i < this.v.N; i++) { const path = document.createElementNS(NS, 'path'); path.setAttribute('vector-effect', 'non-scaling-stroke'); this.svg.appendChild(path); this.paths.push(path); }
    this.progress = 0.5; this.W = 0;
    new ResizeObserver(() => this.layout()).observe(el);
  }
  params() { return innerWidth < 768 ? this.v.m : this.v.d; }
  layout() {
    const W = Math.round(this.el.clientWidth); if (!W) return;
    const base = this.params();
    this.W = W; this.H = base.H; this.base = fitParams(W, this.v.N, base, 0.12);
    this.svg.setAttribute('viewBox', `0 0 ${W} ${base.H}`);
    this.svg.setAttribute('width', W); this.svg.setAttribute('height', base.H);
    this.el.style.height = base.H + 'px';
    this.draw();
  }
  draw() {
    if (!this.W) return;
    const t = reduced || !this.v.scroll ? 0.5 : this.progress;
    const phi = -0.12 + 0.24 * t, p = { ...this.base, A: this.base.A * (0.9 + 0.2 * t) };
    const step = innerWidth < 768 ? 6 : 8;
    this.paths.forEach((path, i) => path.setAttribute('d', pathFor(this.W, i - (this.v.N - 1) / 2, p, phi, step)));
  }
  updateFromScroll(vh) {
    const r = this.el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));   // 0 entering at the bottom, 1 leaving at the top
    if (Math.abs(t - this.progress) > 0.002) { this.progress = t; this.draw(); }
  }
}

// Link underline: flat at rest, one low wavelength on hover or focus (CSS transitions the `d` property).
function underline(a) {
  if (a.querySelector('.uline')) return;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'uline'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '0 0 100 8'); svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(NS, 'path'); path.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(path); a.appendChild(svg);
}

export function initWaves() {
  const waves = [...document.querySelectorAll('[data-wave]')].map(el => new Wave(el));
  document.querySelectorAll('.wlink').forEach(underline);
  const scrolling = waves.filter(w => w.v.scroll);
  if (!reduced && scrolling.length) {
    const visible = new Set();
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target.__wave) : visible.delete(e.target.__wave)));
    scrolling.forEach(w => { w.el.__wave = w; io.observe(w.el); });
    let queued = false;
    const tick = () => { queued = false; const vh = innerHeight; visible.forEach(w => w.updateFromScroll(vh)); };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
    tick();
  }
  return waves;
}
