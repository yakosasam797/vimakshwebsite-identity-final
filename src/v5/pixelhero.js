// v7 hero: a living pixel surface. A slow flowing field sweeps a two-tone texture across the hero, like the
// threshold video reference: one tone is open paper, the other a texture of tiny pixel chevrons (the "> <" of
// the mark) in Electric Blue on Mist. The Vimaksh mark itself is built from the same square pixels, coral with
// its red arrow, assembling pixel by pixel on load; its edge pixels keep shimmering as the field moves past.
// Everything is computed per grid cell in one fragment shader, so every square stays crisp at any size.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision highp float;
uniform vec2 uRes;        // canvas size in device px
uniform float uCell;      // cell size in device px
uniform float uT, uReveal, uDpr;
uniform vec4 uMark;       // mark box: x, y (top-left, device px), size, 0
uniform vec3 uPtr;        // pointer x, y (device px, top-left origin), strength
uniform vec4 uCopy;       // copy-safe box: x0, y0, x1, y1 (device px)
uniform sampler2D uMask;  // r = coral arrows, g = red arrow
uniform vec3 cMist, cGlyph, cCoral, cRed, cCoralD, cRedD;
uniform float uDark;

float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.3);a*=.5;}return v;}

// 5x5 glyphs, row-major from the top: ">" and "<"
float glyph(vec2 s, bool right){
  vec2 g=floor(s*5.);
  float x=right?g.x:4.-g.x, y=g.y;
  float d=x-min(y,4.-y);
  return (d>=0.&&d<2.)?1.:0.;   // two-pixel strokes so the chevrons read at small sizes
}

void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 cell=floor(px/uCell), cc=(cell+.5)*uCell, sub=(px-cell*uCell)/uCell;

  // ---- the flowing field (domain-warped noise, stretched horizontally like scan lines) ----
  vec2 p=cc/uRes.y*vec2(1.6,4.2);
  float t=uT;
  vec2 q=vec2(fbm(p+vec2(0.,t*.06)),fbm(p+vec2(5.2,1.3)-vec2(t*.05,0.)));
  float v=fbm(p+2.2*q+vec2(t*.04,-t*.02));
  // the pointer stirs it
  float dp=length((cc-uPtr.xy)/uRes.y);
  v+=uPtr.z*.28*exp(-dp*dp*28.);
  // keep the copy readable: the field thins out under the headline
  vec2 inC=step(uCopy.xy,cc)*step(cc,uCopy.zw);
  float copyFade=inC.x*inC.y;
  float edgeL=smoothstep(uCopy.z+uRes.x*.08,uCopy.z,cc.x)*smoothstep(uCopy.w+uRes.y*.12,uCopy.w,cc.y);
  v-=max(copyFade,edgeL)*.42;
  // a cell flips with a little per-cell jitter so the boundary is pixel-crisp and alive
  float thr=.56+(hash(cell+floor(t*6.))-.5)*.035;
  float onB=step(thr,v);

  // ---- the mark, built of the same cells ----
  vec2 muv=(cc-uMark.xy)/uMark.z;
  vec4 m=vec4(0.);
  float halo=0.;
  if(muv.x>-.1&&muv.y>-.1&&muv.x<1.1&&muv.y<1.1){
    vec2 uv=clamp(muv,0.,1.);
    if(muv==uv) m=texture2D(uMask,uv);   // only inside the mark box: no edge pixels repeated outside it
    // clear margin: is any part of the mark within ~2.5 cells?
    float r=2.5*uCell/uMark.z;
    for(int k=0;k<8;k++){float an=float(k)*.7854;vec4 hb=texture2D(uMask,clamp(uv+vec2(cos(an),sin(an))*r,0.,1.));halo=max(halo,max(hb.r,hb.g));}
  }
  float cov=max(m.r,m.g);
  // edge cells shimmer with the field; the body is solid
  float edge=(cov>.05&&cov<.95)?1.:0.;
  float jit=(noise(cell*.7+vec2(t*1.3,0.))-.5)*.55*edge;
  float rv=step(hash(cell*1.37+3.1),uReveal*1.15-.05);  // pixel-by-pixel assembly on load
  float onM=step(.5,cov+jit)*rv;
  bool isRed=m.g>m.r;

  vec3 col=vec3(0.); float a=0.;
  if(onM>.5){
    // solid brand colour, with a hairline between cells so the mark reads as pixels
    float gap=(sub.x<1./uCell*uDpr||sub.y<1./uCell*uDpr)?1.:0.;
    col=isRed?mix(cRed,cRedD,gap*.6):mix(cCoral,cCoralD,gap*.6); a=1.;
  } else if(onB>.5 && halo<.25){
    // chevron texture: rows alternate > and <, glyphs inset in each cell
    bool right=mod(cell.y,2.)<1.;
    vec2 s=(sub-.14)/.72;
    float g=(s.x>=0.&&s.y>=0.&&s.x<1.&&s.y<1.)?glyph(s,right):0.;
    col=mix(cMist,cGlyph,g); a=1.;
  }
  gl_FragColor=vec4(col*a,a);
}`;

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const THEMES = {
  light: { cMist: '#DDE4FF', cGlyph: '#2D36FF', cCoral: '#FF5E55', cRed: '#E42114', cCoralD: '#E14A42', cRedD: '#B5180E', uDark: 0 },
  dark:  { cMist: '#1A1D45', cGlyph: '#5D6BFF', cCoral: '#FF5E55', cRed: '#E42114', cCoralD: '#C7423B', cRedD: '#8F130B', uDark: 1 },
};

// The mark rasterised into a mask texture: coral arrows in red channel, the red arrow in green.
async function maskCanvas() {
  const svg = await (await fetch('/marks/vimaksh-mark.svg')).text();
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  const vb = [115, 131, 350, 318.7];                    // tight box of the six arrows in the 580 artboard
  const sc = S / Math.max(vb[2], vb[3]), ox = (S - vb[2] * sc) / 2, oy = (S - vb[3] * sc) / 2;
  g.setTransform(sc, 0, 0, sc, ox - vb[0] * sc, oy - vb[1] * sc);
  doc.querySelectorAll('path').forEach(p => {
    const red = /E32112/i.test(p.getAttribute('fill'));
    g.fillStyle = red ? '#00ff00' : '#ff0000'; g.fill(new Path2D(p.getAttribute('d')));
  });
  return c;
}

export async function startPixelHero(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);

  const mc = await maskCanvas();
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U('uMask'), 0);

  const setTheme = () => {
    const t = THEMES[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'];
    for (const k of ['cMist', 'cGlyph', 'cCoral', 'cRed', 'cCoralD', 'cRedD']) gl.uniform3fv(U(k), hex(t[k]));
    gl.uniform1f(U('uDark'), t.uDark); dirty = true;
  };
  let dirty = true; setTheme(); addEventListener('themechange', setTheme);

  const ptr = { x: -1e4, y: -1e4, s: 0, gs: 0 };
  addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); ptr.x = (e.clientX - r.left) * d; ptr.y = (e.clientY - r.top) * d; ptr.gs = 1; }, { passive: true });

  const copyEl = document.querySelector('.hero-copy');
  let w = 0, h = 0, dpr = 1, visible = true, last = performance.now(), t = 12, acc = 0, reveal = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  const layout = () => {
    dpr = Math.min(devicePixelRatio, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight; w = W; h = H;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // the mark: centred-right on wide screens, lower centre on narrow ones; snapped to the cell grid
    const narrow = W / H < .9, size = (narrow ? Math.min(W * .78, H * .4) : Math.min(H * .64, W * .42)) * dpr;
    // pixel size follows the mark, so the mark is always ~56 cells across: crisp detail at any screen size
    const cell = Math.max(5 * dpr, Math.round(size / 56));
    gl.uniform2f(U('uRes'), canvas.width, canvas.height); gl.uniform1f(U('uCell'), cell); gl.uniform1f(U('uDpr'), dpr);
    let mx = narrow ? (canvas.width - size) / 2 : canvas.width * .6 - size / 2, my = narrow ? canvas.height * .47 : (canvas.height - size) / 2 + canvas.height * .02;
    mx = Math.round(mx / cell) * cell; my = Math.round(my / cell) * cell;
    gl.uniform4f(U('uMark'), mx, my, Math.round(size / cell) * cell, 0);
    if (copyEl) { const r = copyEl.getBoundingClientRect(), c = canvas.getBoundingClientRect(); gl.uniform4f(U('uCopy'), (r.left - c.left - 24) * dpr, (r.top - c.top - 24) * dpr, (r.right - c.left + 24) * dpr, (r.bottom - c.top + 24) * dpr); }
    dirty = true;
  };
  layout(); addEventListener('resize', layout);
  canvas.classList.add('ready'); window.__hero = true;

  const speed = reduced ? .5 : 1, STEP = 1 / 30;      // the field ticks at 30 fps: a calm pixel cadence, half the GPU work
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!visible || document.hidden || scrollY > innerHeight * 1.05) return;
    acc += dt; if (acc < STEP && !dirty) return;
    const step = Math.min(acc, .1); acc = 0; dirty = false;
    t += step * speed; reveal = Math.min(1, reveal + step / (reduced ? 1.2 : 2.2));
    ptr.gs *= Math.exp(-step * 1.2); ptr.s += (ptr.gs - ptr.s) * (1 - Math.exp(-step * 4));
    gl.uniform1f(U('uT'), t); gl.uniform1f(U('uReveal'), 1 - Math.pow(1 - reveal, 3));
    gl.uniform3f(U('uPtr'), ptr.x, ptr.y, ptr.s);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  requestAnimationFrame(frame);
  return true;
}
