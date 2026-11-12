// Shared hero engine. The interaction model (pointer parallax, drag orbit, nudge, keyboard,
// reset, reduced motion) and the sculpture's material treatment are carried over unchanged
// from the finalized index.html. Geometry is never edited: only the rigid whole is moved.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HUB, RED_AXIS, collectHull } from './wheel.js';

export { THREE };
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function lerpDamp(v, target, rate, dt) { return lerp(v, target, 1 - Math.exp(-rate * dt)); }

/** Small seeded PRNG so every simulated journey is identical between visits and on scrubbing. */
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Fixed-rate table of simulated channels; the whole journey is precomputed so it can be scrubbed. */
export class SimTable {
  constructor(rate, channels) { this.rate = rate; this.names = channels; this.data = Object.fromEntries(channels.map(n => [n, []])); this.length = 0; }
  push(row) { for (const n of this.names) this.data[n].push(row[n] ?? 0); this.length++; }
  get(name, t) {
    const a = this.data[name], x = clamp(t * this.rate, 0, this.length - 1), i = Math.floor(x), f = x - i;
    return i + 1 < this.length ? a[i] + (a[i + 1] - a[i]) * f : a[i];
  }
  get duration() { return (this.length - 1) / this.rate; }
}

/** Soft dust/spray: CPU-driven ring buffer of points. */
export function createDust(scene, { count = 260, color = '#d8c3a5', size = 1, opacity = .34, drag = 1.4, gravity = -.12 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 2), vel = new Float32Array(count * 3), life = new Float32Array(count), max = new Float32Array(count);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uOpacity: { value: opacity }, uPx: { value: 1 } },
    vertexShader: `attribute vec2 aSeed;uniform float uSize,uPx;varying float vA;
      void main(){float k=clamp(aSeed.x,0.,1.);vA=k<=0.?0.:sin(k*3.1416)*sqrt(k)*(.6+.4*aSeed.y);
      vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=uSize*uPx*(.5+1.5*(1.-k))*(.5+aSeed.y)/-mv.z;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uOpacity;varying float vA;
      void main(){float d=length(gl_PointCoord-.5)*2.;float a=1.-smoothstep(.15,1.,d);if(vA*a<.004)discard;gl_FragColor=vec4(uColor,a*vA*uOpacity);
      #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(g, m); points.frustumCulled = false; scene.add(points);
  let head = 0;
  return {
    points,
    emit(x, y, z, n, { spread = .3, up = .25, speed = .35, dir = null, lifeMin = 1.1, lifeMax = 2.6 } = {}) {
      for (let i = 0; i < n; i++) {
        const j = head; head = (head + 1) % count;
        pos[j * 3] = x + (Math.random() - .5) * spread; pos[j * 3 + 1] = y + Math.random() * .05; pos[j * 3 + 2] = z + (Math.random() - .5) * spread;
        const a = Math.random() * 6.283, s = speed * (.3 + Math.random());
        vel[j * 3] = Math.cos(a) * s + (dir ? dir[0] : 0); vel[j * 3 + 1] = up * (.3 + Math.random()); vel[j * 3 + 2] = Math.sin(a) * s + (dir ? dir[2] : 0);
        max[j] = life[j] = lifeMin + Math.random() * (lifeMax - lifeMin); seed[j * 2 + 1] = Math.random();
      }
    },
    update(dt) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) { seed[i * 2] = 0; continue; }
        life[i] -= dt; const d = Math.exp(-drag * dt);
        vel[i * 3] *= d; vel[i * 3 + 2] *= d; vel[i * 3 + 1] = vel[i * 3 + 1] * d + gravity * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        seed[i * 2] = 1 - life[i] / max[i];
      }
      g.attributes.position.needsUpdate = true; g.attributes.aSeed.needsUpdate = true;
    },
    clear() { life.fill(0); seed.fill(0); },
    setPx(px) { m.uniforms.uPx.value = px; },
  };
}

const ICON = {
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m8 5 12 7-12 7z"/></svg>',
};

/**
 * cfg: {
 *   duration, hold, background, exposure, fov, wordmark:{color, behind},
 *   camera(p, out) -> sets out.yaw / out.el / out.distance / out.lift,
 *   build(ctx) -> Promise|{ pose(t,p,dt), frame(t,p,dt), constrain(pos), stage(p), render?(), resize?(w,h) }
 * }
 */
export function runHero(cfg) {
  const $ = id => document.getElementById(id);
  const hero = $('hero'), canvas = $('stageCanvas'), hint = $('hint'), veil = $('veil'), scrub = $('scrub');
  const motionButton = $('motionButton'), resetButton = $('resetButton'), replayButton = $('replayButton');
  // ?motion=full previews the full motion on a machine set to reduce it.
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches && new URLSearchParams(location.search).get('motion') !== 'full';
  const params = new URLSearchParams(location.search);
  const fail = (err) => { console.error(err); hero.classList.add('no-gl'); hint.textContent = '3D unavailable — showing the static logo'; veil.classList.add('clear'); };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, stencil: !!cfg.stencil, powerPreference: 'high-performance' });
  } catch (e) { fail(e); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.exposure ?? 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Layered mode: environment on the back canvas, a crisp per-letter wordmark in the page, the sculpture on a
  // transparent front canvas. Type then stays sharp at full screen resolution whatever the 3D resolution is.
  let renderer2 = null, wmLayer = null;
  if (cfg.domWordmark) {
    wmLayer = document.createElement('div');
    wmLayer.setAttribute('aria-hidden', 'true');
    wmLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden';
    const c2 = document.createElement('canvas');
    c2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
    canvas.after(wmLayer, c2);
    renderer2 = new THREE.WebGLRenderer({ canvas: c2, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    renderer2.setClearColor(0x000000, 0);
    renderer2.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer2.outputColorSpace = THREE.SRGBColorSpace;
    renderer2.toneMapping = THREE.ACESFilmicToneMapping;
    renderer2.toneMappingExposure = cfg.exposure ?? 1;
    renderer2.shadowMap.enabled = true; renderer2.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.background);
  const camera = new THREE.PerspectiveCamera(cfg.fov ?? 33, 1, .05, 600);
  scene.add(camera);

  // rig = where the world puts the sculpture. group = the original interaction transform.
  const rig = new THREE.Group(), group = new THREE.Group();
  rig.add(group); scene.add(rig);

  let model, env, wheel = null, loaded = false, activeDrag = false;
  let ambientMotion = !reduced, engaged = false;
  let dragging = { x: 0, y: 0, dist: 0, id: null };
  const state = { yaw: 0, pitch: 0, cameraYaw: 0, cameraPitch: 0, roll: 0, nudge: 0 };
  const goal = { yaw: 0, pitch: 0, cameraYaw: 0, cameraPitch: 0 };
  const lowerPts = [];

  const journey = { t: 0, scrubbing: false, loopAt: 0, heldUntil: 0 };
  const camT = new THREE.Vector3(); let camSnap = true;
  const base = { yaw: .19, el: .13, distance: 6, lift: 0 };

  function setButton() {
    motionButton.title = ambientMotion ? 'Pause the journey' : 'Resume the journey';
    motionButton.setAttribute('aria-label', motionButton.title);
    motionButton.innerHTML = ambientMotion ? ICON.pause : ICON.play;
  }
  setButton();

  // ---- Brand name: drawn on a plane that sits behind the sculpture so the object passes in front of it.
  const wm = { mesh: null, tex: null, ready: false, letters: [] };
  function layoutDomWordmark() {
    const vw = hero.clientWidth, vh = hero.clientHeight;
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || Math.max(18, Math.min(44, vw * .028));
    // Drawn well above screen resolution and scaled down by the browser: sharper, and it avoids the stray slivers
    // Chrome's canvas leaves on this variable font's overlapping contours at small sizes.
    const text = 'Vimaksh', track = -.04, pairFix = { Vi: .018 };
    const x0 = document.createElement('canvas').getContext('2d');
    const font = s => `${cfg.wordmark.weight ?? 450} ${s}px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif`;
    x0.font = font(1000);
    const adv = []; let w1000 = 0;
    for (let i = 0; i < text.length; i++) {
      const pair = i + 1 < text.length ? x0.measureText(text.slice(i, i + 2)).width - x0.measureText(text[i + 1]).width : x0.measureText(text[i]).width;
      adv.push(pair + (track + (pairFix[text.slice(i, i + 2)] || 0)) * 1000); w1000 += adv[i];
    }
    w1000 -= track * 1000;
    const capEm = x0.measureText('V').actualBoundingBoxAscent / 1000;
    let px = Math.max(40, Math.round((vw - 2 * pad) * 1000 / w1000));
    const maxCap = vh * (vw < 700 ? .2 : (cfg.wordmark.maxCap ?? .265));
    if (px * capEm > maxCap) px = Math.floor(maxCap / capEm);
    x0.font = font(px);
    // Measure every glyph's real extent (the dot of the i rises above the capitals) so nothing is clipped.
    const ms = [...text].map(ch => x0.measureText(ch));
    const asc = Math.max(...ms.map(m => m.actualBoundingBoxAscent)), desc = Math.max(0, ...ms.map(m => m.actualBoundingBoxDescent));
    const capPx = px * capEm, M = Math.ceil(px * .03) + 2;
    const topPx = (vw < 700 ? 44 : Math.max(44, pad + 16));
    // Real text, one span per letter: vector-sharp at any size or zoom, rendered by the browser like the rest of the page.
    const fm = x0.measureText('Vimaksh'), A = fm.fontBoundingBoxAscent, D = fm.fontBoundingBoxDescent;
    const baseFromTop = (px - (A + D)) / 2 + A;
    const top = topPx + capPx - baseFromTop;
    wmLayer.textContent = ''; wm.letters = [];
    let pen = pad;
    for (let i = 0; i < text.length; i++) {
      const el = document.createElement('span'), aw = adv[i] / 1000 * px;
      el.textContent = text[i];
      el.style.cssText = `position:absolute;left:${pen.toFixed(2)}px;top:${top.toFixed(2)}px;font:${cfg.wordmark.weight ?? 450} ${px}px/${px}px 'Inter Tight','Helvetica Neue',Arial,sans-serif;`
        + `color:${cfg.wordmark.color};white-space:pre;font-kerning:none;font-feature-settings:'kern' 0;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;`
        + `will-change:transform;transform-origin:${(aw / 2).toFixed(1)}px ${baseFromTop.toFixed(1)}px`;
      wmLayer.appendChild(el);
      wm.letters.push({ el, u: (pen + aw / 2) / vw });
      pen += aw;
    }
  }
  function layoutWordmark() {
    if (!wm.ready) return;
    if (cfg.domWordmark) return layoutDomWordmark();
    const vw = hero.clientWidth, vh = hero.clientHeight;
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || Math.max(18, Math.min(44, vw * .028));
    const dpr = Math.min(devicePixelRatio, 2);
    const text = 'Vimaksh', track = -.04, pairFix = { Vi: .018 };
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = s => `${cfg.wordmark.weight ?? 450} ${s}px 'Inter Tight', 'Helvetica Neue', Arial, sans-serif`;
    x.font = font(1000);
    const adv = []; let w1000 = 0;
    for (let i = 0; i < text.length; i++) {
      const pair = i + 1 < text.length ? x.measureText(text.slice(i, i + 2)).width - x.measureText(text[i + 1]).width : x.measureText(text[i]).width;
      adv.push(pair + (track + (pairFix[text.slice(i, i + 2)] || 0)) * 1000); w1000 += adv[i];
    }
    w1000 -= track * 1000;
    const m = x.measureText('V'), capEm = (m.actualBoundingBoxAscent) / 1000;
    let px = Math.max(40, Math.round((vw - 2 * pad) * 1000 / w1000));
    const maxCap = vh * (vw < 700 ? .2 : (cfg.wordmark.maxCap ?? .265));
    if (px * capEm > maxCap) px = Math.floor(maxCap / capEm);
    const M = cfg.wordmark.halo ? Math.ceil(px * .08) : 4, W = Math.ceil(w1000 / 1000 * px) + 2 * M, H = Math.ceil(px * capEm) + 2 * M;
    c.width = W * dpr; c.height = H * dpr;
    x.scale(dpr, dpr); x.font = font(px); x.fillStyle = cfg.wordmark.color; x.textBaseline = 'alphabetic';
    if (cfg.wordmark.halo) { x.shadowColor = cfg.wordmark.halo; x.shadowBlur = px * .028 * dpr; }
    let pen = M - 2; const baseline = H - M;
    const passes = cfg.wordmark.halo ? 2 : 1;
    for (let n = 0; n < passes - 1; n++) { let q = pen; for (let i = 0; i < text.length; i++) { x.fillText(text[i], q, baseline); q += adv[i] / 1000 * px; } }
    for (let i = 0; i < text.length; i++) { x.fillText(text[i], pen, baseline); pen += adv[i] / 1000 * px; }
    if (wm.tex) wm.tex.dispose();
    wm.tex = new THREE.CanvasTexture(c); wm.tex.colorSpace = THREE.SRGBColorSpace; wm.tex.anisotropy = 4; wm.tex.generateMipmaps = false; wm.tex.minFilter = THREE.LinearFilter;
    if (!wm.mesh) {
      wm.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, toneMapped: false }));
      wm.mesh.renderOrder = cfg.wordmark.renderOrder ?? 5; wm.mesh.frustumCulled = false; camera.add(wm.mesh);
    }
    wm.mesh.material.map = wm.tex; wm.mesh.material.needsUpdate = true;
    const D = cfg.wordmark.depth ?? 9, worldH = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), perPx = worldH / vh;
    wm.mesh.scale.set(W * perPx, H * perPx, 1);
    const topPx = (vw < 700 ? 44 : Math.max(44, pad + 16));
    const left = pad;
    wm.mesh.position.set((left - (M - 4) + W / 2 - vw / 2) * perPx, (vh / 2 - topPx + (M - 4) - H / 2) * perPx, -D);
    wm.base = wm.mesh.position.clone(); wm.perPx = perPx;
  }

  function updateCamera(yaw, pitch) {
    const vw = hero.clientWidth, mobile = vw < 700;
    const ay = base.yaw + yaw, el = base.el + pitch;
    const distance = base.distance * (mobile ? (cfg.mobileDistanceScale ?? 1.18) : 1);
    const tx = camT.x, ty = camT.y + base.lift - (mobile ? (cfg.mobileRaise ?? .42) : 0), tz = camT.z;
    camera.position.set(tx + Math.sin(ay) * Math.cos(el) * distance, ty + Math.sin(el) * distance, tz + Math.cos(ay) * Math.cos(el) * distance);
    env?.constrain?.(camera.position);
    camera.lookAt(tx, ty, tz);
    if (cfg.lookUp) camera.rotateX(cfg.lookUp);   // aim a little above the subject: it sits low, the sea runs back to the top
  }

  let laidOut = '';
  function onResize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false); renderer2?.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = (w < 700 ? (cfg.mobileFov ?? (cfg.fov ?? 33) + 5) : (cfg.fov ?? 33)); camera.updateProjectionMatrix();
    env?.resize?.(w, h, renderer.getPixelRatio());
    if (laidOut !== w + 'x' + h) { laidOut = w + 'x' + h; layoutWordmark(); }   // resolution changes alone don't redraw it
  }

  const fmtStage = s => { const e = $('stage'); if (e.textContent !== s) e.textContent = s; };
  function syncHud(p) {
    const el = env?.readout?.(journey.t);
    if (el) { $('elev').textContent = el.text1 ?? (el.elevation.toFixed(2) + ' m'); $('dist').textContent = el.text2 ?? (el.distance.toFixed(1) + ' m'); }
    if (env?.stage) fmtStage(env.stage(p));
    if (cfg.endless) return;
    if (!journey.scrubbing) scrub.value = String(Math.round(p * 1000));
    scrub.style.setProperty('--fill', (p * 100).toFixed(2) + '%');
  }

  function restart(fade = true) {
    const go = () => { journey.t = 0; camSnap = true; env?.reset?.(); };
    if (fade && !reduced) { veil.classList.remove('clear'); setTimeout(() => { go(); veil.classList.add('clear'); }, 1100); } else go();
    journey.heldUntil = 0;
  }

  let lastFrame = performance.now();
  // Adaptive resolution: holds frame rate on integrated GPUs instead of dropping into a slideshow.
  const perf = { sum: 0, n: 0, fps: 0, ratio: Math.min(devicePixelRatio, 1.7), floor: .75 };
  function governor(rawDt) {
    if (rawDt > .25) return;           // tab was hidden; ignore
    perf.sum += rawDt; perf.n++;
    if (perf.n < 40) return;
    const avg = perf.sum / perf.n; perf.fps = 1 / avg; perf.sum = perf.n = 0;
    if (params.has('still')) return;
    let next = perf.ratio;
    if (avg > 1 / 40) next = Math.max(perf.floor, perf.ratio * .88);
    else if (avg < 1 / 57 && perf.ratio < Math.min(devicePixelRatio, 1.7)) next = Math.min(Math.min(devicePixelRatio, 1.7), perf.ratio * 1.08);
    if (Math.abs(next - perf.ratio) > .01) { perf.ratio = next; renderer.setPixelRatio(next); renderer2?.setPixelRatio(next); onResize(); }
  }
  // Below the fold the hero stops drawing entirely; it resumes when scrolled back into view.
  let heroVisible = true;
  new IntersectionObserver(e => { heroVisible = e[e.length - 1].isIntersecting; }, { threshold: 0 }).observe(hero);
  function animate(now) {
    requestAnimationFrame(animate);
    if (!heroVisible) { lastFrame = now; return; }
    const raw = (now - lastFrame) / 1000, dt = clamp(raw, 0, .05); lastFrame = now;   // rAF time can precede lastFrame after a blocking first frame
    if (!loaded) return;
    governor(raw);
    frame(now / 1000, dt);
  }

  function frame(t, dt) {
    const T = cfg.duration;
    const idleIntensity = ambientMotion && !engaged && !activeDrag && !reduced ? 1 : 0;
    if (cfg.endless) {
      // An endless scene is the hero itself: with reduced motion it slows down rather than freezing.
      const speed = ambientMotion ? 1 : (reduced ? (cfg.reducedSpeed ?? 0) : 0);
      if (speed && !journey.frozen) journey.t += dt * speed;
    }
    else if (ambientMotion && !journey.scrubbing && !journey.frozen) {
      journey.t = Math.min(journey.t + dt, T);
      if (journey.t >= T) {
        if (!journey.heldUntil) journey.heldUntil = t + (cfg.hold ?? 12);
        else if (t > journey.heldUntil && !reduced) restart(true);
      } else journey.heldUntil = 0;
    }
    const q = journey.t, p = q / T;

    const slowYaw = Math.sin(t * .36) * .023 * idleIntensity;
    const slowPitch = Math.cos(t * .31) * .008 * idleIntensity;
    state.cameraYaw = lerpDamp(state.cameraYaw, goal.cameraYaw + slowYaw, 2.5, dt);
    state.cameraPitch = lerpDamp(state.cameraPitch, goal.cameraPitch + slowPitch, 2.5, dt);
    state.yaw = lerpDamp(state.yaw, goal.yaw, 5, dt);
    state.pitch = lerpDamp(state.pitch, goal.pitch, 5, dt);

    const rollTarget = Math.sin(state.nudge) * .042;
    state.nudge = lerpDamp(state.nudge, 0, 4, dt);
    state.roll = lerpDamp(state.roll, rollTarget, 10, dt);
    group.rotation.order = 'YXZ'; group.rotation.set(state.pitch, state.yaw, state.roll);
    // Physically grounded correction: only translate the rigid whole, never edit an arrow's mesh.
    const s = Math.sin(state.roll), c = Math.cos(state.roll), cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);

    env.pose(q, p, dt);
    let minY = Infinity;
    if (wheel) {
      // Whole sculpture turns about its hub; the red arrow travels along its own axis. Rigid moves only.
      wheel.pivot.rotation.z = -wheel.theta;
      wheel.red.position.set(-RED_AXIS[0] * wheel.d, -RED_AXIS[1] * wheel.d, 0);
      const ct = Math.cos(wheel.theta), st = Math.sin(wheel.theta), ox = -RED_AXIS[0] * wheel.d, oy = -RED_AXIS[1] * wheel.d;
      const test = (px, py) => { const X = px * ct + py * st, Y = -px * st + py * ct + HUB.y; for (const z of [-.1, .1]) { const yy = (s * X + c * Y) * cp - sp * z; if (yy < minY) minY = yy; } };
      for (const q2 of wheel.hull.coral) test(q2[0], q2[1]);
      for (const q2 of wheel.hull.red) test(q2[0] + ox, q2[1] + oy);
      group.position.y = cfg.float ? 0 : -minY;   // afloat, the water holds it, not the ground
    } else {
      for (const pt of lowerPts) { const yy = (s * pt.x + c * pt.y) * cp - sp * pt.z; if (yy < minY) minY = yy; }
      group.position.y = (lowerPts.length ? Math.max(0, -minY) : 0);
    }
    rig.updateMatrixWorld(true);

    cfg.camera(p, base, q);
    const fp = env.focus?.() ?? rig.position;
    const gx = fp.x * (hero.clientWidth < 700 ? (cfg.mobileFollowX ?? cfg.followX ?? 1) : (cfg.followX ?? 1)), gy = fp.y * (cfg.followY ?? 1) + (cfg.targetY ?? 1), gz = fp.z;
    const follow = cfg.follow ?? 3.2;
    if (camSnap) { camT.set(gx, gy, gz); camSnap = false; }
    camT.x = lerpDamp(camT.x, gx, follow, dt); camT.y = lerpDamp(camT.y, gy, follow * .8, dt); camT.z = lerpDamp(camT.z, gz, follow, dt);
    updateCamera(state.cameraYaw, state.cameraPitch);

    env.frame?.(q, p, dt, t);
    if (wm.letters.length && env.letterSway) for (const L of wm.letters) { const s = env.letterSway(q, L.u); L.el.style.transform = `translate3d(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px,0) rotate(${s.r.toFixed(4)}rad)`; }
    if (wm.mesh && wm.base && env.wordmarkSway) { const s = env.wordmarkSway(q); wm.mesh.position.set(wm.base.x + s.x * wm.perPx, wm.base.y + s.y * wm.perPx, wm.base.z); wm.mesh.rotation.z = s.r; }
    syncHud(p);
    if (env.render) env.render();
    else if (renderer2) { camera.layers.set(0); renderer.render(scene, camera); camera.layers.set(1); const bg = scene.background; scene.background = null; renderer2.render(scene, camera); scene.background = bg; camera.layers.set(0); }
    else renderer.render(scene, camera);
  }

  function pointerState(ev) { const r = canvas.getBoundingClientRect(); return { x: clamp(((ev.clientX - r.left) / r.width) * 2 - 1, -1, 1), y: clamp(((ev.clientY - r.top) / r.height) * 2 - 1, -1, 1) }; }
  canvas.addEventListener('pointerleave', () => { if (!activeDrag && !engaged) { goal.cameraYaw = 0; goal.cameraPitch = 0; } });
  canvas.addEventListener('pointermove', ev => {
    if (!loaded) return;
    if (activeDrag && ev.pointerId === dragging.id) {
      const dx = ev.clientX - dragging.x, dy = ev.clientY - dragging.y;
      dragging.dist += Math.hypot(dx, dy); dragging.x = ev.clientX; dragging.y = ev.clientY;
      goal.cameraYaw = clamp(goal.cameraYaw - dx * .0038, -.53, .53);
      goal.cameraPitch = clamp(goal.cameraPitch + dy * .0025, -.17, .22);
      engaged = true; hint.textContent = 'Release to settle · reset ↗';
    } else if (!engaged) {
      const pt = pointerState(ev);
      goal.cameraYaw = pt.x * .12; goal.cameraPitch = -pt.y * .035;
      env?.pointer?.(pt.x, pt.y);
    }
  });
  canvas.addEventListener('pointerdown', ev => {
    if (!loaded) return;
    activeDrag = true; dragging = { x: ev.clientX, y: ev.clientY, dist: 0, id: ev.pointerId };
    canvas.classList.add('dragging'); canvas.setPointerCapture(ev.pointerId);
  });
  function endDrag(ev) {
    if (!activeDrag || ev.pointerId !== dragging.id) return;
    activeDrag = false; canvas.classList.remove('dragging');
    if (dragging.dist < 7 && !reduced) { state.nudge = 1; const pt = pointerState(ev); env?.tap?.(pt.x, pt.y); }
    hint.textContent = 'Drag to explore · tap to nudge';
  }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', ev => {
    const d = .11;
    if (ev.key === 'ArrowLeft') goal.cameraYaw = clamp(goal.cameraYaw - d, -.53, .53);
    else if (ev.key === 'ArrowRight') goal.cameraYaw = clamp(goal.cameraYaw + d, -.53, .53);
    else if (ev.key === 'ArrowUp') goal.cameraPitch = clamp(goal.cameraPitch - d, -.17, .22);
    else if (ev.key === 'ArrowDown') goal.cameraPitch = clamp(goal.cameraPitch + d, -.17, .22);
    else if (ev.key === 'Enter' || ev.key === ' ') { if (!reduced) state.nudge = 1; }
    else if (ev.key === 'Escape') reset();
    else return;
    ev.preventDefault(); engaged = true;
  });
  function reset() { goal.cameraYaw = goal.cameraPitch = goal.yaw = goal.pitch = 0; engaged = false; state.nudge = 0; hint.textContent = 'Move / drag to explore'; }
  resetButton.addEventListener('click', reset);
  motionButton.addEventListener('click', () => { ambientMotion = !ambientMotion; setButton(); });
  replayButton.addEventListener('click', () => { if (!ambientMotion) { ambientMotion = true; setButton(); } restart(true); });

  const seek = v => { journey.t = clamp(v, 0, 1) * cfg.duration; journey.heldUntil = 0; camSnap = true; env?.seeked?.(journey.t); };
  scrub.addEventListener('pointerdown', () => { journey.scrubbing = true; });
  scrub.addEventListener('input', () => { journey.scrubbing = true; seek(scrub.value / 1000); });
  const endScrub = () => { journey.scrubbing = false; };
  scrub.addEventListener('pointerup', endScrub); scrub.addEventListener('pointercancel', endScrub);
  scrub.addEventListener('change', endScrub);

  // Boot: load the GLB exactly as the original did, from bytes embedded in this page.
  (async () => {
    try {
      const mark = (k) => { perf.stages = perf.stages || []; perf.stages.push([k, Math.round(performance.now())]); };
      mark('start');
      await Promise.race([document.fonts.load("500 100px 'Inter Tight'", 'Vimaksh'), new Promise(r => setTimeout(r, 1500))]);
      // Single-file builds embed the model; the source project loads it as a normal file.
      let bytes;
      if (window.__GLB) { const bin = atob(window.__GLB); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); window.__GLB = null; }
      else bytes = new Uint8Array(await (await fetch(cfg.glbUrl ?? 'logo_sculpture.glb')).arrayBuffer());
      // Decode via <img>, not fetch(): fetching blob URLs is unreliable when the page is opened from file://.
      const parseOnce = () => new Promise((res, rej) => {
        const loader = new GLTFLoader();
        loader.register(parser => { parser.textureLoader = new THREE.TextureLoader(parser.options.manager); return { name: 'img_decode' }; });
        loader.parse(bytes.buffer.slice(0), '', res, rej);
      });
      const texturesOk = g => { let ok = true; g.scene.traverse(o => { if (o.isMesh && !(o.material?.map?.image)) ok = false; }); return ok; };
      let gltf = await parseOnce();
      for (let i = 0; i < 3 && !texturesOk(gltf); i++) gltf = await parseOnce();
      if (!texturesOk(gltf)) throw new Error('Sculpture textures failed to decode');
      model = gltf.scene; group.add(model);
      const meshes = [];
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true; child.receiveShadow = true;
          child.geometry.computeVertexNormals();
          if (child.material) { child.material.side = THREE.DoubleSide; child.material.roughness = Math.max(.80, child.material.roughness ?? .9); child.material.metalness = 0; child.material.needsUpdate = true; }
          const pa = child.geometry.attributes.position;
          child.updateMatrix();
          for (let i = 0; i < pa.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(child.matrix); if (v.y < .19) lowerPts.push(v); }
          meshes.push(child);
        }
      });
      if (cfg.wheel) {
        // group > pivot (at the hub) > model. The GLB's meshes and their vertices stay exactly as supplied.
        const pivot = new THREE.Group(); pivot.position.set(0, HUB.y, 0);
        group.add(pivot); pivot.add(model); model.position.set(-HUB.x, -HUB.y, 0);
        wheel = { pivot, red: meshes.find(m => /Red/.test(m.name)), hull: collectHull(meshes), theta: 0, d: 0 };
      }
      mark('glb parsed');
      env = await cfg.build({ THREE, scene, camera, renderer, rig, group, model, meshes, hero, reduced, wheel });
      mark('scene built');
      if (renderer2) {
        model.traverse(o => o.layers.set(1));
        scene.traverse(o => { if (o.isLight) o.layers.enableAll(); });
        env.occluders?.forEach(o => o.layers.set(1));
      }
      wm.ready = true;
      onResize(); new ResizeObserver(onResize).observe(hero);
      const start = parseFloat(params.get('p'));
      if (!isNaN(start)) { seek(start); journey.frozen = params.has('still'); }
      if (reduced) { ambientMotion = false; setButton(); }
      loaded = true;
      // Compile off the main thread where the browser allows, so a busy machine sees a responsive page, not a freeze.
      try { await Promise.race([renderer.compileAsync(scene, camera), new Promise(r => setTimeout(r, 45000))]); } catch (e) { console.warn('compileAsync', e); }
      mark('shaders ready');
      const tc = performance.now(); frame(tc / 1000, 0); perf.firstFrameMs = performance.now() - tc; mark('first frame');
      hint.textContent = matchMedia('(pointer:coarse)').matches ? 'Drag to explore · tap to nudge' : 'Move / drag to explore';
      veil.classList.add('clear');
      lastFrame = performance.now();
      requestAnimationFrame(animate);
      // Test hook: render a chosen moment deterministically, with `settle` seconds of simulated time before it.
      window.__hero = { seek: (v, settle = 0) => { seek(v); const q = journey.t, ft = journey.frozen; journey.frozen = true; for (let i = 0; i < settle * 30; i++) { journey.t = Math.max(0, q - settle + i / 30); frame(journey.t, 1 / 30); } journey.t = q; frame(q, 1 / 30); journey.frozen = ft; }, frozen: v => { journey.frozen = v; }, perf, renderer, scene, camera, state, goal, base, camT, env, wheel };
    } catch (e) { fail(e); }
  })();
}
