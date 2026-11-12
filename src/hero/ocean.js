// BOIL THE OCEAN — warm coral water (C2 with the warm palette)
// A vast, light, glassy sea rendered live. Palette shifted from the reference into the brand: blush and coral
// water, mint light running through it, white sky. Big swells travel at real deep-water speed, while quick
// currents run across them in different directions. The sculpture is carried by it: pushed left and right by the
// flow, rotating with that flow, rising and leaning on each swell. Steam lifts where it boils.
import { runHero, THREE, clamp, lerp, smooth, rng } from './core.js';
import { HUB } from './wheel.js';

const AMP = 10.5, MEAN = .46;
const WATERLINE = .42, S = 1.15;   // S: the sculpture's display scale          // hub height above the local water surface

// ----- Waves: sharp-crested, phase-coupled swell with deep-water dispersion (ω = √(g·k)) -----------------------------
const calm = (x, z) => lerp(.26, 1, smooth(4, 30, Math.hypot(x, z)));
function seaW(x, z, t, N = 10) {
  let a = 1, f = .085, sp = .91, w = 0, sum = 0, it = 0, px = x, pz = z, gx = 0, gz = 0;
  for (let i = 0; i < N; i++) {
    const dx = Math.sin(it), dz = Math.cos(it), ph = (dx * px + dz * pz) * f + t * sp, e = Math.exp(Math.sin(ph) - 1), de = e * Math.cos(ph);
    w += e * a; sum += a; gx += dx * de * f * a; gz += dz * de * f * a;
    px -= dx * de * a; pz -= dz * de * a;
    a *= .66; f *= 1.28; sp *= 1.1314; it += 1232.399963;
  }
  const k = AMP * calm(x, z);
  return { h: (w / sum - MEAN) * k, gx: gx / sum * k, gz: gz / sum * k };
}
const GLSL_SEA = /* glsl */`
uniform float uT;
float calm(vec2 p){return mix(.26,1.,smoothstep(4.,30.,length(p)));}
vec3 seaHG(vec2 p,int N,float px){
  float a=1.,f=.085,sp=.91,w=0.,s=0.,it=0.;vec2 g=vec2(0.);vec2 q=p;
  for(int i=0;i<N;i++){vec2 d=vec2(sin(it),cos(it));float ph=dot(d,q)*f+uT*sp;float e=exp(sin(ph)-1.);float de=e*cos(ph);
    float aa=a*clamp(1.5-f*px*9.,0.,1.);
    w+=e*aa;s+=a;g+=d*(de*f*aa);q-=d*de*a;a*=.66;f*=1.28;sp*=1.1314;it+=1232.399963;}
  float k=${AMP.toFixed(2)}*calm(p);
  return vec3((w/s-${MEAN.toFixed(2)})*k,g/s*k);}
float hsh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float boilCell(vec2 p,float scale,float rate){vec2 q=p*scale,id=floor(q),f=fract(q)-.5;float r=hsh(id);
  float ph=fract(uT*rate*(.55+.9*r)+r*9.);vec2 c=(vec2(hsh(id+3.1),hsh(id+7.7))-.5)*.36;float d=length(f-c);
  float dome=smoothstep(0.,.55,ph)*(1.-smoothstep(.55,.72,ph))*(1.-smoothstep(.0,.26,d));
  float rr=smoothstep(.62,1.,ph)*.42,ring=(1.-smoothstep(.0,.05,abs(d-rr)))*(1.-smoothstep(.72,1.,ph));
  return dome-ring*.3;}
`;

// Light palette (sRGB): the reference's lilac, violet and cyan, turned toward the brand's coral and red.
// Cool family from the brand palette: Tide Cyan #42CDD7, Marine #103746, Sea Foam #CDF5F0. The warm brand
// colours stay on the sculpture and in small glints, so the logo is the only warm thing on the water.
// Warm palette: blush, rose and coral water from the sculpture's own colours, with mint light running through it.
const P = {
  sky: [.984, .972, .965], haze: [.985, .93, .915], blush: [.99, .88, .85], rose: [.985, .75, .74],
  lilac: [.96, .72, .82], coral: [.965, .53, .5], deep: [.9, .33, .34], red: [.886, .11, .07],
  brand: [1, .369, .333], mint: [.52, .93, .79], mintHi: [.8, 1, .92], white: [1, 1, 1],
};
const v3 = c => `vec3(${c.map(x => x.toFixed(3)).join(',')})`;

function bakeLogoMask(meshes) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.clearRect(0, 0, S, S);
  const X = v => (v + 1.25) / 2.5 * S, Y = v => (1 - (v + .1) / 2.5) * S;
  for (const m of meshes) {
    const p = m.geometry.attributes.position, idx = m.geometry.index, red = /Red/.test(m.name);
    x.fillStyle = x.strokeStyle = red ? '#e21c12' : '#ff5b54'; x.lineWidth = 1;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), d = idx.getX(i + 2);
      if (Math.abs(p.getZ(a) - p.getZ(b)) > .001 || Math.abs(p.getZ(a) - p.getZ(d)) > .001) continue;
      x.beginPath(); x.moveTo(X(p.getX(a)), Y(p.getY(a))); x.lineTo(X(p.getX(b)), Y(p.getY(b))); x.lineTo(X(p.getX(d)), Y(p.getY(d))); x.closePath(); x.fill(); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  return t;
}

function bakeNoise() {
  const S = 256, R = rng(41), d = new Uint8Array(S * S), out = new Float32Array(S * S);
  for (const [period, amp] of [[6, .5], [13, .28], [29, .15], [64, .07]]) {
    const g = new Float32Array(period * period); for (let i = 0; i < g.length; i++) g[i] = R();
    for (let y = 0; y < S; y++) { const gy = y / S * period, iy = Math.floor(gy); let fy = gy - iy; fy = fy * fy * (3 - 2 * fy); const y0 = iy % period, y1 = (iy + 1) % period;
      for (let x = 0; x < S; x++) { const gx = x / S * period, ix = Math.floor(gx); let fx = gx - ix; fx = fx * fx * (3 - 2 * fx); const x0 = ix % period, x1 = (ix + 1) % period;
        const a = g[y0 * period + x0], b = g[y0 * period + x1], c = g[y1 * period + x0], e = g[y1 * period + x1];
        out[y * S + x] += amp * ((a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy); } }
  }
  for (let i = 0; i < d.length; i++) d[i] = clamp(out[i], 0, 1) * 255;
  const t = new THREE.DataTexture(d, S, S, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

runHero({
  endless: true, reducedSpeed: .55, wheel: true, float: true, duration: 1000, background: '#fbf8f6', exposure: .92, fov: 31,
  domWordmark: true, targetY: HUB.y * S, follow: .6, followX: .3, mobileFollowX: 1, mobileDistanceScale: 1.5, followY: .45, mobileRaise: .3,
  wordmark: { color: '#2C1412', depth: 11.5 },
  camera(p, out, q) {
    out.yaw = Math.sin(q * .041) * .05;
    out.el = .12;
    out.distance = 9.8;
    out.lift = .1;
  },
  async build({ scene, rig, camera, renderer, meshes, model, wheel }) {
    camera.near = .3; camera.far = 1600; camera.updateProjectionMatrix();

    scene.add(new THREE.HemisphereLight('#f6f4f4', '#e8c8c4', 2.1));       // neutral, so the sculpture keeps its own colours
    const key = new THREE.DirectionalLight('#fff7f0', 2.9);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -2, near: 1, far: 30 }); key.shadow.normalBias = .012; key.shadow.radius = 3;
    scene.add(key, key.target);

    const SUN = new THREE.Vector3(-.3, .34, -.89).normalize();
    const uniforms = {
      uT: { value: 0 }, uPxAng: { value: .001 }, uSun: { value: SUN }, uNoise: { value: bakeNoise() }, uMask: { value: bakeLogoMask(meshes) },
      uInv: { value: new THREE.Matrix4() }, uObj: { value: new THREE.Vector3() }, uPtr: { value: new THREE.Vector4() }, uRing: { value: new THREE.Vector4(0, 0, -100, 0) },
    };

    // A fan-shaped grid fixed in the world: ±120° around the view and 1.1 km deep, so turning or dragging the view never
    // reaches an edge. Vertices never move in x/z, so the surface doesn't swim.
    const SEG = 900, RINGS = 470, RMAX = 1100, K = 6.2, SPAN = 2.1, CZ = 10.5;
    const pos = new Float32Array((SEG + 1) * (RINGS + 1) * 3), idx = new Uint32Array(SEG * RINGS * 6);
    for (let j = 0, o = 0; j <= RINGS; j++) {
      const r = .05 + (Math.exp(j / RINGS * K) - 1) / (Math.exp(K) - 1) * RMAX;
      for (let i = 0; i <= SEG; i++) { const a = -Math.PI / 2 + (i / SEG - .5) * 2 * SPAN; pos[o++] = Math.cos(a) * r; pos[o++] = 0; pos[o++] = CZ + Math.sin(a) * r; }
    }
    for (let j = 0, o = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) { const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));

    const SEA_VS = `${GLSL_SEA}
        uniform vec3 uObj;uniform vec4 uPtr,uRing;varying vec3 vW;varying float vH;
        void main(){
          vec2 p=(modelMatrix*vec4(position,1.)).xz;float dist=length(p-cameraPosition.xz);
          float h=seaHG(p,dist<40.?10:(dist<160.?8:6),0.).x;
          float dObj=length(p-uObj.xz);
          float heat=.18+.85*exp(-dObj*dObj/14.)+uPtr.w*.9*exp(-dot(p-uPtr.xy,p-uPtr.xy)/5.);
          if(dist<40.)h+=(boilCell(p,1.1,.5)*.13+boilCell(p+7.,2.3,.72)*.05)*heat*(1.-smoothstep(22.,40.,dist));
          float rd=length(p-uRing.xy),age=uT-uRing.z;
          if(age>0.&&age<4.)h+=sin((rd-age*2.6)*7.)*.05*exp(-pow(rd-age*2.6,2.)*1.4)*(1.-age/4.);
          vH=h;vec3 w=vec3(p.x,h,p.y);vW=w;
          gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`;
    const sea = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms, side: THREE.DoubleSide,
      vertexShader: SEA_VS,
      fragmentShader: `${GLSL_SEA}
        uniform float uPxAng;uniform vec3 uSun,uObj;uniform sampler2D uMask,uNoise;uniform mat4 uInv;
        varying vec3 vW;varying float vH;
        vec4 logoAt(vec2 q,float lod){return textureLod(uMask,vec2((q.x+1.25)/2.5,(q.y+.1)/2.5),lod);}
        float caustic(vec2 uv,float t){
          vec2 p=mod(uv*6.2832,6.2832)-250.,i=p;float c=1.,inten=.005;
          for(int n=0;n<4;n++){float tt=t*(1.-3.5/float(n+1));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
            c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
          c/=4.;c=1.17-pow(c,1.4);return clamp(pow(abs(c),6.),0.,1.);}
        vec2 nG(vec2 uv){float e=1./256.;float h=texture2D(uNoise,uv).r;return vec2(texture2D(uNoise,uv+vec2(e,0.)).r-h,texture2D(uNoise,uv+vec2(0.,e)).r-h)*256.;}
        // Bubble field: x = height, y = foam. Two sizes; live mostly within ~3 m of the sculpture.
        vec2 bub(vec2 p){
          float dO=length(p-uObj.xz),heat=exp(-dO*dO/16.),h=0.,fo=0.;
          for(int k=0;k<2;k++){float sc=k==0?1.15:2.2;vec2 q=p*sc+float(k)*17.,id=floor(q),f=fract(q)-.5;float r=hsh(id);
            float ph=fract(uT*(.32+.45*r)*(1.+float(k)*.5)+r*7.3);vec2 c=(vec2(hsh(id+1.7),hsh(id+4.3))-.5)*.5;float d=length(f-c)/sc;
            float live=step(hsh(id+9.1),heat*(k==0?.8:.9));
            float Rb=(k==0?.27:.15)*smoothstep(0.,.5,ph);
            float x=clamp(d/max(Rb,1e-3),0.,1.);
            float on=1.-step(.55,ph);float dome=sqrt(max(1.-x*x,0.))*Rb*.9*on;
            float rr=(ph-.55)*(k==0?.85:.5),a=1.-smoothstep(.55,1.,ph);
            float ring=step(.55,ph)*exp(-pow((d-rr)/.035,2.))*a;
            h+=(dome+ring*.016)*live;
            fo+=on*step(x,.999)*(smoothstep(.72,.97,x)*.45+(1.-smoothstep(0.,.22,length((f-c)/sc+vec2(Rb*.35,-Rb*.35))/max(Rb,1e-3)))*.5)*smoothstep(.1,.4,ph)*live;
            fo+=(ring*.9+step(.53,ph)*(1.-step(.58,ph))*(1.-smoothstep(0.,.18,d))*.8)*live;}
          float fade=1.-smoothstep(6.,7.5,dO);
          return vec2(h,fo)*fade;}
        vec2 ripG(vec2 p){return nG(p*.31)*.31+nG(p*.9+.3)*.9*.35;}
        void main(){
          float dist=length(cameraPosition-vW);
          float px=dist*uPxAng;
          vec3 hg=seaHG(vW.xz,dist<30.?17:(dist<140.?13:9),px);
          vec2 grad=hg.yz;
          float near=1.-smoothstep(14.,80.,dist);

          // Quick currents: surface detail carried along a slowly turning flow field in different directions.
          // Two phases cross-fade, so the flow runs on forever without the pattern stretching or popping.
          vec2 fl=(vec2(texture2D(uNoise,vW.xz*.011+vec2(uT*.004,0.)).r,texture2D(uNoise,vW.xz*.011+vec2(.37,.71)-uT*.0035).r)-.5)*3.6;
          fl+=vec2(.6,-.45);
          float ph0=fract(uT*.4),ph1=fract(uT*.4+.5),wB=abs(ph0-.5)*2.;
          vec2 o0=fl*ph0*2.6,o1=fl*ph1*2.6+vec2(.43,.17);
          vec2 rg=mix(ripG(vW.xz-o0),ripG(vW.xz-o1),wB);
          grad+=rg*.085*near;

          // Visible boil: bubbles swell as small glassy domes around the sculpture, burst, and leave a quick ring.
          float bubFoam=0.;
          { float dO=length(vW.xz-uObj.xz);
            if(dO<7.5&&dist<40.){
              vec2 e=vec2(.012,0.);
              vec2 b0=bub(vW.xz),bx=bub(vW.xz+e.xy),bz=bub(vW.xz+e.yx);
              grad+=vec2(bx.x-b0.x,bz.x-b0.x)/e.x;
              bubFoam=b0.y;}}
          vec3 N=normalize(vec3(-grad.x,1.,-grad.y));
          vec3 V=normalize(cameraPosition-vW);
          float NV=max(dot(N,V),0.);
          float F=.02+.98*pow(1.-NV,5.);
          vec3 R=reflect(-V,N);R.y=abs(R.y);

          // Body: pale where light passes through thin water, deeper coral where you look down into it.
          float look=smoothstep(.04,.55,NV);
          float trough=1.-smoothstep(-3.,2.6,vH);
          float drift=texture2D(uNoise,vW.xz*.018-o0*.02+uT*.006).r;
          float deep=clamp(look*.42+trough*.3+(drift-.5)*.5+(1.-smoothstep(5.,30.,dist))*.32-smoothstep(30.,200.,dist)*.4,0.,1.);
          vec3 body=mix(${v3(P.blush)},${v3(P.rose)},smoothstep(.08,.42,deep));
          body=mix(body,${v3(P.coral)},smoothstep(.4,.78,deep));
          body=mix(body,${v3(P.deep)},smoothstep(.76,1.,deep)*.85);
          body=mix(body,${v3(P.lilac)},smoothstep(.55,.85,drift)*.38*look);

          // Mint light running through the water, carried by the same currents.
          vec2 cu=vW.xz*.42+grad*.16;
          float cs=mix(caustic(cu-o0*.42,uT*.9),caustic(cu-o1*.42,uT*.9),wB)*(1.-smoothstep(20.,95.,dist));
          float cs2=caustic(cu*1.9+3.1-o0*.8,uT*1.2)*(1.-smoothstep(8.,36.,dist));
          body=mix(body,${v3(P.mint)},clamp(cs*1.6,0.,.92)*(.45+.55*look));
          body=mix(body,${v3(P.mintHi)},clamp(cs2*.75,0.,1.)*look);

          // Small coral and red glints, like the pink flecks in the reference.
          float spot=smoothstep(.76,.84,texture2D(uNoise,vW.xz*.05+grad*.3-o1*.03).r)*(1.-smoothstep(10.,55.,dist));
          body=mix(body,mix(${v3(P.brand)},${v3(P.red)},.3),spot*.18);

          // Back-lit crests glow.
          float sss=pow(max(dot(V,-uSun),0.),3.)*smoothstep(.6,4.,vH);
          body=mix(body,${v3(P.white)},clamp(sss*.7,0.,.6));

          // The submerged part of the sculpture, seen through the water.
          vec3 Rt=refract(-V,N,1./1.33);
          vec3 O=(uInv*vec4(vW,1.)).xyz,Dt=(uInv*vec4(Rt,0.)).xyz;
          if(abs(Dt.z)>.001){float t=-O.z/Dt.z;if(t>0.&&t<3.){vec2 q=O.xy+Dt.xy*t;vec4 m=logoAt(q,1.+t*2.);
            body=mix(body,m.rgb,m.a*.8*exp(-t*1.2));}}

          // Reflection: bright sky, and the sculpture itself, wavering in the surface.
          vec3 refl=mix(${v3(P.sky)},${v3(P.blush)},.5);
          vec3 Dr=(uInv*vec4(R,0.)).xyz;
          if(abs(Dr.z)>.001){float t=-O.z/Dr.z;if(t>0.&&t<7.){vec2 q=O.xy+Dr.xy*t;vec4 m=logoAt(q,t*.7);
            refl=mix(refl,m.rgb,m.a*(1.-smoothstep(.8,6.,t)));}}
          vec3 col=mix(body,refl,clamp(F*.8,0.,.6));

          float sd=max(dot(R,uSun),0.);
          col+=vec3(1.)*(pow(sd,700.)*2.2+pow(sd,90.)*.08)*(.4+.6*near);
          col+=step(.994,hsh(floor(gl_FragCoord.xy*.5)+floor(uT*11.)))*smoothstep(.96,.998,sd)*near*1.6;

          // Boiling: bubbles surface in clusters near the sculpture, dome, burst, and leave a brief ring of foam.
          float boilF=0.;
          { float dO=length(vW.xz-uObj.xz),heatF=exp(-dO*dO/16.)*.9+.12;
            for(int k=0;k<2;k++){float sc=k==0?2.6:5.2;vec2 q=vW.xz*sc+float(k)*17.,id=floor(q),f=fract(q)-.5;float r=hsh(id);
              float ph=fract(uT*(.45+.7*r)*(1.+float(k)*.6)+r*7.3);vec2 c=(vec2(hsh(id+1.7),hsh(id+4.3))-.5)*.5;float d=length(f-c);
              float live=step(r,heatF*(k==0?.55:.75));
              float dome=(1.-smoothstep(.0,.1+.08*ph,d))*smoothstep(.0,.3,ph)*(1.-smoothstep(.3,.36,ph));
              float rr=(ph-.36)*.55,ring=(1.-smoothstep(.0,.035,abs(d-rr)))*step(.36,ph)*(1.-smoothstep(.55,1.,ph));
              boilF+=(dome*.55+ring)*live;}
            boilF*=1.-smoothstep(10.,24.,dist);}
          col=mix(col,${v3(P.white)},clamp(boilF*.6+bubFoam,0.,.9));
          float steep=length(grad);
          float lace=smoothstep(3.2,4.4,vH)*smoothstep(.5,.85,steep)*smoothstep(.45,.62,texture2D(uNoise,vW.xz*.6-o0*.3).r);
          float foam=0.;
          if(abs(O.z)<.45){float nr=logoAt(O.xy,3.2).a;foam=smoothstep(.12,.5,nr)*(1.-smoothstep(.06,.3,abs(O.z)));
            foam*=.6+.4*texture2D(uNoise,vW.xz*2.4+uT*.12).r;}
          col=mix(col,${v3(P.white)},clamp(lace*.85+foam*.9,0.,1.));

          float haze=1.-exp(-dist*.0026);
          col=mix(col,mix(${v3(P.haze)},${v3(P.sky)},smoothstep(.6,1.,haze)),clamp(haze,0.,1.));
          col+=(hsh(gl_FragCoord.xy+fract(uT)*91.)-.5)*.022;
          gl_FragColor=vec4(clamp(col,0.,1.),1.);
        }`,
    }));
    sea.frustumCulled = false; scene.add(sea);
    const occ = new THREE.Mesh(new THREE.PlaneGeometry(18, 18, 240, 240).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms, vertexShader: SEA_VS, fragmentShader: 'void main(){gl_FragColor=vec4(0.);}', colorWrite: false, side: THREE.DoubleSide,
    }));
    occ.frustumCulled = false; occ.renderOrder = -1; scene.add(occ);

    const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT;varying vec3 vD;
        float hsh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
        void main(){vec3 d=normalize(vD);
          vec3 c=mix(${v3(P.haze)},${v3(P.sky)},smoothstep(0.,.12,max(d.y,0.)));
          c+=(hsh(gl_FragCoord.xy+fract(uT)*91.)-.5)*.02;
          gl_FragColor=vec4(c,1.);}`,
    }));
    sky.renderOrder = -10; scene.add(sky);

    // Steam lifting off the hot water.
    const PLUMES = 64, R = rng(19), quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(PLUMES * 4);
    for (let i = 0; i < PLUMES; i++) {
      const near = i < 32, side = R() < .5 ? -1 : 1;
      seed[i * 4] = near ? side * (1.6 + R() * 5) : (R() - .5) * 70;
      seed[i * 4 + 1] = near ? -.6 - R() * 6 : -10 - R() * 70;
      seed[i * 4 + 2] = R(); seed[i * 4 + 3] = near ? .7 + R() * .6 : 1.4 + R() * 2.2;
    }
    quad.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    quad.instanceCount = PLUMES;
    const steam = new THREE.Mesh(quad, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `${GLSL_SEA}
        attribute vec4 aSeed;varying vec2 vUv;varying float vLife;varying float vId;
        void main(){float rate=.09+.07*fract(aSeed.z*7.3);float life=fract(uT*rate+aSeed.z);vLife=life;vId=aSeed.z;vUv=position.xy;
          vec2 b=aSeed.xy;float base=seaHG(b,5,0.).x;
          vec3 c=vec3(b.x+sin(uT*.35+aSeed.z*40.)*.3*life+life*life*1.6,base+.03+life*(1.1+1.2*aSeed.w),b.y);
          float size=aSeed.w*(.3+.95*life);
          vec4 mv=viewMatrix*vec4(c,1.);mv.xy+=position.xy*vec2(size,size*1.3);
          gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float uT;uniform sampler2D uNoise;varying vec2 vUv;varying float vLife,vId;
        void main(){float r=length(vUv);if(r>1.)discard;
          vec2 q=vUv*vec2(.2,.15)+vec2(vId*7.,vId*3.-uT*.04);
          float n=texture2D(uNoise,q).r*.65+texture2D(uNoise,q*2.7+.3).r*.35;
          float den=clamp((n-.32)*2.6,0.,1.)*(1.-smoothstep(.1,1.,r))*smoothstep(0.,.16,vLife)*(1.-smoothstep(.45,1.,vLife));
          if(den<.004)discard;
          gl_FragColor=vec4(.96,1.,.995,den*.5);}`,
    }));
    steam.frustumCulled = false; steam.renderOrder = 4; scene.add(steam);

    // ----- The sculpture afloat ---------------------------------------------------------------------------------
    const b = { x: 0, vx: 0, y: 0, vy: 0, th: 0, om: 0, pitch: 0, vp: 0 };
    const current = t => .62 * Math.sin(t * .11 + .4) + .3 * Math.sin(t * .23 + 1.3) + .12 * Math.sin(t * .47 + 2.1);
    const step = (t, dt) => {
      const s0 = seaW(b.x, 0, t), sl = seaW(b.x - .8, 0, t), sr = seaW(b.x + .8, 0, t), sf = seaW(b.x, .7, t), sb = seaW(b.x, -.7, t);
      const mean = (s0.h * 2 + sl.h + sr.h + sf.h + sb.h) / 6;
      b.vy += (18 * (mean - b.y) - 6 * b.vy) * dt; b.y += b.vy * dt;
      const surge = -s0.gx * 1.6;
      b.vx += (1.15 * (current(t) + surge - b.vx) - .16 * b.x - .04 * b.x * b.x * b.x) * dt;
      b.x += b.vx * dt;
      const slopeAngle = Math.atan((sr.h - sl.h) / 1.6);
      b.om += (2.2 * (b.vx / .9 * .85 - b.om) + 1.9 * Math.sin(slopeAngle)) * dt;
      b.th += b.om * dt;
      b.vp += (12 * (Math.atan((sf.h - sb.h) / 1.4) * .5 - b.pitch) - 4.5 * b.vp) * dt; b.pitch += b.vp * dt;
    };
    let tNow = null;

    const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ptrGoal = new THREE.Vector3();
    let ptrGoalS = 0, ptrS = 0;
    const toWater = (x, y) => { ndc.set(x, -y); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hit) ? hit : null; };

    return {
      pose(t) {
        if (tNow === null) { for (let i = 0; i < 600; i++) step(t - (600 - i) / 60, 1 / 60); }
        else { const dj = t - tNow; if (dj > 0 && dj < .2) { const n = Math.ceil(dj * 120); for (let i = 0; i < n; i++) step(t - dj + dj * (i + 1) / n, dj / n); } }
        tNow = t;
        rig.scale.setScalar(S);
        rig.position.set(b.x, b.y + WATERLINE * S - HUB.y * S, 0);
        rig.rotation.order = 'YXZ';
        rig.rotation.y = Math.sin(t * .11) * .06 + b.vx * .05;
        rig.rotation.x = b.pitch;
        rig.rotation.z = 0;
        wheel.theta = b.th; wheel.d = 0;
      },
      frame(t, p, dt) {
        uniforms.uT.value = t;
        rig.updateMatrixWorld(true); model.updateMatrixWorld(true);
        uniforms.uInv.value.copy(model.matrixWorld).invert();
        uniforms.uObj.value.set(rig.position.x, 0, rig.position.z);
        occ.position.set(Math.round(rig.position.x * 13.33) / 13.33, 0, 0);
        ptrGoalS *= Math.exp(-dt * .9); ptrS += (ptrGoalS - ptrS) * (1 - Math.exp(-dt * 3));
        const u = uniforms.uPtr.value; u.w = ptrS; u.x += (ptrGoal.x - u.x) * (1 - Math.exp(-dt * 4)); u.y += (ptrGoal.z - u.y) * (1 - Math.exp(-dt * 4));
        sky.position.copy(camera.position);
        key.target.position.copy(rig.position); key.position.set(rig.position.x - 4, rig.position.y + 7, 8); key.target.updateMatrixWorld();
      },
      pointer(x, y) { const h = toWater(x, y); if (h) { ptrGoal.copy(h); ptrGoalS = 1; } },
      tap(x, y) { const h = toWater(x, y); if (h) uniforms.uRing.value.set(h.x, h.z, tNow ?? 0, 0); },
      // Keep the camera above the water, and above every swell between it and the sculpture, so no wave can wall it off.
      constrain(pos) {
        const t = tNow ?? 0; let need = -Infinity;
        for (const k of [0, .25, .5, .75]) { const x = lerp(pos.x, rig.position.x, k), z = lerp(pos.z, rig.position.z, k); need = Math.max(need, seaW(x, z, t, 6).h + lerp(1.1, .9, k) - k * (pos.y - rig.position.y - 1) * 0); }
        if (pos.y < need) pos.y = need;
      },
      resize(w, h, pr) { uniforms.uPxAng.value = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (h * pr); },
      // Very slight sway for the wordmark, taken from a swell far out: a few pixels of lift and a hair of tilt.
      occluders: [occ],
      // Each letter rides the swell under it, a few pixels and under a degree: the wave runs across the name.
      letterSway(t, u) { const s = seaW(-26 + u * 52, -58, t, 4); return { x: clamp(s.gx * 9, -2.5, 2.5), y: s.h * 1.75, r: clamp(s.gx * .02, -.017, .017) }; },
      wordmarkSway(t) { const s = seaW(-6, -60, t, 4); return { x: Math.sin(t * .23) * 1.2, y: s.h * 1.1, r: clamp(s.gx * .005, -.0035, .0035) }; },
      buoy: b,
    };
  },
});
