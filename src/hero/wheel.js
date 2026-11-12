// The sculpture as a heavy wheel. Measured from the GLB: all five coral arrows sit on one 0.9015 circle about the
// hub; the red arrow reaches 0.233 beyond it and can travel inward about 0.19 before nearing its neighbours.
// Arrows are moved as rigid wholes, so no mesh is ever edited.
export const HUB = { x: -.0002, y: .8988 }, R_C = .9015, RED_AXIS = [.0298, .9996], D_MAX = .19;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hull2D(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Outline points relative to the hub: [x, y, arrowIndex]. Red kept separate because it moves. */
export function collectHull(meshes) {
  const coral = [], red = [];
  meshes.forEach((m, idx) => {
    const p = m.geometry.attributes.position, isRed = /Red/.test(m.name), out = isRed ? red : coral;
    for (let i = 0; i < p.count; i++) out.push([p.getX(i) - HUB.x, p.getY(i) - HUB.y, idx]);
  });
  return { coral: hull2D(coral), red: hull2D(red) };
}

/** Lowest point of the rotating outline. depth = hub height above the ground; rx = contact x relative to the hub. */
export function support(hull, th, d, out = {}) {
  const c = Math.cos(th), s = Math.sin(th);
  let depth = -Infinity, rx = 0, x0 = 0, y0 = 0, arrow = -1, isRed = false;
  for (const p of hull.coral) { const y = -p[0] * s + p[1] * c; if (-y > depth) { depth = -y; x0 = p[0]; y0 = p[1]; arrow = p[2]; isRed = false; } }
  const ox = -RED_AXIS[0] * d, oy = -RED_AXIS[1] * d;
  for (const p of hull.red) { const px = p[0] + ox, py = p[1] + oy, y = -px * s + py * c; if (-y > depth) { depth = -y; x0 = px; y0 = py; arrow = p[2]; isRed = true; } }
  rx = x0 * c + y0 * s;
  out.depth = depth; out.rx = rx; out.x0 = x0; out.y0 = y0; out.arrow = arrow; out.isRed = isRed;
  return out;
}

/** How far the ground must press the red arrow in at this angle (0 when it's clear of the ground). */
export function pressAt(hull, th) {
  const c = Math.cos(th), s = Math.sin(th);
  let depth = -Infinity; for (const p of hull.red) { const y = -p[0] * s + p[1] * c; if (-y > depth) depth = -y; }
  return clamp(depth - R_C, 0, D_MAX);
}

/** Quasi-static roll: x(θ) and hub height h(θ), used to choose stable stopping angles. */
export function kinematics(hull, thEnd, step = .002) {
  const n = Math.ceil(thEnd / step), th = new Float64Array(n + 1), xs = new Float64Array(n + 1), hs = new Float64Array(n + 1), sp = {};
  let x = 0;
  for (let i = 0; i <= n; i++) {
    const t = i * step; th[i] = t;
    support(hull, t, pressAt(hull, t), sp); hs[i] = sp.depth; xs[i] = x;
    const t2 = t + step, c = Math.cos(t2), s = Math.sin(t2); x += sp.rx - (sp.x0 * c + sp.y0 * s);
  }
  return { th, xs, hs, step, total: x };
}

/**
 * Rolling dynamics, integrated once at load so the journey can be scrubbed.
 * ref(t) -> {th, om}: where the (unseen) drive wants the wheel. It is tracked through a soft coupling, so the weight
 * of the sculpture shows: it labours climbing onto an arrow and drops off the far side.
 * Red arrow: the ground presses it in (a hard constraint); on release a damped spring returns it, with only a trace
 * of overshoot, so it reads as a mechanical return and not a rubbery one.
 */
export function simulateRoll(hull, ref, duration, { rate = 60, k = 22, c = 8.5, g = 2.6, redW = 11, redZ = .74, slopeAt = null } = {}) {
  const dt = 1 / 240, every = Math.round(240 / rate), names = ['theta', 'x', 'd', 'om', 'v', 'cx', 'head', 'depth'];
  const data = Object.fromEntries(names.map(n => [n, []])), events = [];
  let th = ref(0).th, om = 0, x = 0, d = 0, vd = 0, head = -Infinity, lastArrow = -1, pressed = false, xPrev = 0, n = 0;
  const s0 = {}, a = {}, b = {};
  for (let t = 0; t <= duration + 1e-6; t += dt, n++) {
    const r = ref(t), target = pressAt(hull, th);
    if (target >= d) { vd = 0; d = target; } else { vd += (-redW * redW * (d - target) - 2 * redZ * redW * vd) * dt; d += vd * dt; }
    if (target > .004 && !pressed) { pressed = true; events.push({ t, type: 'press', x, cx: s0.rx ?? 0 }); }
    if (target <= .002 && pressed) { pressed = false; events.push({ t, type: 'release', x, cx: s0.rx ?? 0 }); }
    support(hull, th + .01, d, a); support(hull, th - .01, d, b);
    const dh = (a.depth - b.depth) / .02, slope = slopeAt ? slopeAt(x) : 0;
    om += (k * (r.th - th) + c * (r.om - om) - g * dh - g * slope * R_C) * dt;
    support(hull, th, d, s0);
    const th2 = th + om * dt, co = Math.cos(th2), si = Math.sin(th2), rx2 = s0.x0 * co + s0.y0 * si;
    x += s0.rx - rx2; th = th2;
    head = Math.max(head, x + rx2);
    if (s0.arrow !== lastArrow) { events.push({ t, type: 'foot', x, cx: rx2, red: s0.isRed, arrow: s0.arrow }); lastArrow = s0.arrow; }
    if (n % every === 0) {
      data.theta.push(th); data.x.push(x); data.d.push(d); data.om.push(om); data.v.push((x - xPrev) * rate); data.cx.push(rx2); data.head.push(head); data.depth.push(s0.depth);
      xPrev = x;
    }
  }
  const len = data.x.length;
  return { data, rate, length: len, events, get: (name, t) => { const arr = data[name], f0 = clamp(t * rate, 0, len - 1), i = Math.floor(f0), f = f0 - i; return i + 1 < len ? arr[i] + (arr[i + 1] - arr[i]) * f : arr[i]; } };
}
