// v5 hero: the Vimaksh mark in a quiet photo studio.
// What makes it sit in its space rather than float on top of a page:
//  - a real seamless backdrop (floor curving up into a wall) built in 3D, lit by the same lights as the mark;
//  - image-based lighting from a soft studio room, so the arrows pick up gentle reflections;
//  - one large soft key light casting a blurred shadow on the floor, plus a contact-shadow decal right under the mark;
//  - fog in the backdrop colour, so the sweep dissolves into the page with no visible edge;
//  - colours that ease between the light and dark themes.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const HUB = { x: -.0002, y: .8988 };            // centre of the six arrows in the GLB
const THEMES = {
  light: { bg: '#EEEBE5', floor: '#F1EEE8', hemiSky: '#ffffff', hemiGround: '#d9d2c8', hemi: .55, key: 2.4, keyCol: '#fff3e6', fill: .45, rim: .7, rimCol: '#ffffff', env: .55, shadow: .2, ao: .4, exposure: 1.02 },
  dark:  { bg: '#101123', floor: '#14162B', hemiSky: '#c9cdff', hemiGround: '#0b0c1a', hemi: .35, key: 2.0, keyCol: '#ffe9dc', fill: .3, rim: 1.6, rimCol: '#4b4dff', env: .32, shadow: .4, ao: .6, exposure: 1.0 },
};

// still: { dark, bg, floor, main, accent, angle, fill } renders one fixed product shot (used to make the service images).
export function startHero(canvas, { reduced = false, still = null } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));   // full sharpness for the mark
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;      // soft, blurred penumbra like a big studio softbox
  renderer.shadowMap.autoUpdate = false;             // perf: re-drawn only every other frame (see frame())

  const isDark = () => still ? !!still.dark : document.documentElement.dataset.theme === 'dark';
  const cur = {}; const target = {};
  const setTarget = () => { const t = { ...THEMES[isDark() ? 'dark' : 'light'], ...(still ? { bg: still.bg, floor: still.floor } : {}) }; for (const k in t) target[k] = t[k]; };
  setTarget(); for (const k in target) cur[k] = target[k];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cur.bg);
  scene.fog = new THREE.Fog(cur.bg, 16, 44);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = cur.env;

  const camera = new THREE.PerspectiveCamera(26, 1, .1, 100);

  // ---- Seamless backdrop: floor → quarter-circle cove → wall, swept along x ----
  const profile = [];
  for (let z = 16; z >= -2; z -= 1) profile.push([0, z]);
  const R = 6, cz = -2;
  for (let i = 1; i <= 24; i++) { const a = i / 24 * Math.PI / 2; profile.push([R - R * Math.cos(a), cz - R * Math.sin(a)]); }
  for (let y = R + 2; y <= 34; y += 4) profile.push([y, cz - R]);
  const XS = [-60, -20, 0, 20, 60];
  const pos = [], idx = [];
  profile.forEach(([y, z]) => XS.forEach(x => pos.push(x, y, z)));
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < XS.length - 1; j++) {
    const a = i * XS.length + j, b = a + 1, c = a + XS.length, d = c + 1; idx.push(a, b, c, b, d, c);
  }
  const sweepGeo = new THREE.BufferGeometry();
  sweepGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sweepGeo.setIndex(idx); sweepGeo.computeVertexNormals();
  // perf: the backdrop is fully matte, so Lambert shading looks the same as PBR at a fraction of the per-pixel cost.
  // Lambert ignores the studio environment light, so that light is added back as a matching emissive term.
  const ENV_K = .16;
  const sweepMat = new THREE.MeshStandardMaterial({ color: cur.floor, roughness: .96, metalness: 0 });
  const sweep = new THREE.Mesh(sweepGeo, sweepMat); sweep.receiveShadow = true; scene.add(sweep);
  // Shadows are drawn on a separate catcher so their strength can follow the theme.
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 9).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: cur.shadow, color: 0x1a120c }));
  catcher.position.set(1.5, .003, -.5); catcher.receiveShadow = true; scene.add(catcher);
  sweep.receiveShadow = false;

  // Contact shadow: a soft dark ellipse right under the mark, where the key light's shadow alone looks too thin.
  const aoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.45, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: cur.ao, color: 0x2a1a10 }));
  ao.position.y = .006; scene.add(ao);

  // ---- Lights: large warm key (casts the shadow), cool fill, rim from behind to lift the mark off the wall ----
  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.hemi); scene.add(hemi);
  const key = new THREE.DirectionalLight(cur.keyCol, cur.key);
  key.position.set(-3, 12, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 26; key.shadow.blurSamples = 24; key.shadow.bias = -.0004;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 2, far: 30 });
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#e3e7ff', cur.fill); fill.position.set(6, 3, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(cur.rimCol, cur.rim); rim.position.set(1.5, 4.5, -7); scene.add(rim);

  // ---- The mark ----
  const pivot = new THREE.Group(); scene.add(pivot);
  const BASE_Y = 1.8, SIZE = 2.7;
  let model = null, ready = false;
  new GLTFLoader().load('/logo_sculpture.glb', g => {
    model = g.scene;
    model.traverse(c => {
      if (!c.isMesh) return;
      c.geometry.computeVertexNormals();
      const o = c.material;
      // Satin painted finish: soft highlights, a faint clear coat that catches the studio light at grazing angles.
      const tint = still && (/Red/.test(c.name) ? still.accent : still.main);
      c.material = new THREE.MeshPhysicalMaterial({ map: tint ? null : (o.map ?? null), color: tint ? new THREE.Color(tint) : (o.color ?? 0xffffff), roughness: .48, metalness: 0,
        clearcoat: .35, clearcoatRoughness: .42, side: THREE.DoubleSide, envMapIntensity: 1 });
      c.castShadow = true; c.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    model.position.set(-HUB.x, -HUB.y, -(box.min.z + box.max.z) / 2);
    const holder = new THREE.Group(); holder.scale.setScalar(SIZE / Math.max(size.x, size.y)); holder.add(model);
    pivot.add(holder); pivot.position.set(0, BASE_Y, 0);
    ready = true; canvas.classList.add('ready'); window.__hero = true;
  }, undefined, () => { document.querySelector('.hero')?.classList.add('no-gl'); });

  // ---- Motion: rest in the brand pose, turn a little clockwise and back (screen plane only), breathe ----
  const REST = -25 * Math.PI / 180, TURN = (reduced ? 10 : 16) * Math.PI / 180, CYCLE = reduced ? 8 : 6.5, MOVE = 4.2;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  addEventListener('themechange', setTarget);

  let w = 0, h = 0, visible = true, last = performance.now(), t = 0, shadowTick = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!still && (!visible || document.hidden || scrollY > innerHeight * 1.05)) return;   // covered by the sections above it
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (W !== w || H !== h) {
      w = W; h = H; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    // Frame the mark: about half the screen height, or 72% of the width on narrow screens.
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const narrow = !still && camera.aspect < .9;
    const dist = Math.max((SIZE / (still?.fill ?? .5)) / 2 / tanH, (SIZE / (narrow ? .6 : .72)) / 2 / (tanH * camera.aspect));
    // On phones the copy fills the top, so the camera aims higher and the mark sits in the lower half.
    const lookY = narrow ? BASE_Y + dist * tanH * .42 : BASE_Y - .15;
    if (still) { ptr.x = ptr.y = 0; }
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 2.2)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 2.2));
    camera.position.set(ptr.sx * .45, lookY + dist * .2 - ptr.sy * .18, dist);
    camera.lookAt(0, lookY, 0);

    // Ease colours toward the current theme.
    const k = 1 - Math.exp(-dt * 3);
    const k2 = still ? 1 : k;
    for (const key2 in target) if (typeof target[key2] === 'number') cur[key2] += (target[key2] - cur[key2]) * k2;
    const lerpCol = (obj, to) => obj.lerp(new THREE.Color(to), k2);
    lerpCol(scene.background, target.bg); lerpCol(scene.fog.color, target.bg); lerpCol(sweepMat.color, target.floor);
    lerpCol(hemi.color, target.hemiSky); lerpCol(hemi.groundColor, target.hemiGround); lerpCol(key.color, target.keyCol); lerpCol(rim.color, target.rimCol);
    hemi.intensity = cur.hemi; key.intensity = cur.key; fill.intensity = cur.fill; rim.intensity = cur.rim;
    scene.environmentIntensity = cur.env; catcher.material.opacity = cur.shadow; renderer.toneMappingExposure = cur.exposure;

    if (ready && still) {
      pivot.rotation.z = (still.angle ?? -25) * Math.PI / 180; pivot.position.y = BASE_Y; still.frames = (still.frames || 0) + 1;
      if (still.frames === 30) window.__done = true;
    } else if (ready) {
      t += dt;
      const c = (t % CYCLE) - (CYCLE - MOVE), s = c > 0 ? Math.sin(Math.PI * c / MOVE) ** 2 : 0;
      pivot.rotation.z = REST - TURN * s;
      const bob = Math.sin(t * (reduced ? .4 : .7)) * .07;
      pivot.position.y = BASE_Y + bob;
      // The contact shadow tightens and darkens as the mark dips toward the floor.
      const near = 1 - (bob + .07) / .14;
      ao.material.opacity = cur.ao * (.75 + .35 * near); ao.scale.setScalar(1.08 - .12 * near);
    }
    key.target.position.set(0, 0, 0);
    // The mark turns slowly, so its floor shadow can update at half rate without any visible lag.
    if ((++shadowTick & 1) || still) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
  return true;
}
