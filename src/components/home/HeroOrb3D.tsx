import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Three.js hero orb — faithful port of the `HERO 3D ORB` block from
 * `public/delirio.html`. Keeps the same parts:
 *
 *   - Icosahedron with a simplex-noise-displaced vertex shader and a color
 *     gradient + fresnel + iridescence fragment shader
 *   - Wireframe overlay
 *   - Torus ring, 4 orbital "planet" spheres, a cassette, a vinyl disk
 *   - 180-point particle field in the background
 *   - Drag with spring physics (return-to-center)
 *   - Camera parallax driven by the mouse position
 *   - Click-to-cycle through 6 color palettes
 *   - Exposes `window.__orb = { boost, on, palette, setPalette, pulse }`
 *     so other parts of the page can pulse/mute it (same as the static home)
 *
 * The React component owns one `<canvas>` that fills its parent (`.hero-canvas-wrap`),
 * spins up a single Three.js scene on mount, and tears it all down on unmount
 * so hot-reload in dev doesn't leak GPU contexts.
 */

declare global {
  interface Window {
    __orb?: {
      boost: number;
      on: boolean;
      palette: number;
      setPalette: ((idx: number) => void) | null;
      pulse: (() => void) | null;
    };
  }
}

const PALETTES: Array<[string, string, string, string]> = [
  ['#FA5D29', '#F02E65', '#7C3FFF', '#18D2C4'],
  ['#18D2C4', '#FA5D29', '#F02E65', '#7C3FFF'],
  ['#7C3FFF', '#18D2C4', '#FA5D29', '#FFB83D'],
  ['#F02E65', '#FFB83D', '#7C3FFF', '#18D2C4'],
  ['#FFB83D', '#FA5D29', '#F02E65', '#7C3FFF'],
  ['#0a0908', '#FA5D29', '#F02E65', '#FFB83D'],
];

const VERT_SHADER = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uStrength;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0,i1.z,i2.z,1.0)) + i.y + vec4(0.0,i1.y,i2.y,1.0)) + i.x + vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vNormal = normal;
    float n1 = snoise(position * 1.1 + vec3(uTime * 0.18));
    float n2 = snoise(position * 2.4 + vec3(uTime * 0.35));
    float n3 = snoise(position * 5.0 + vec3(uTime * 0.6));
    float displ = n1 * 0.75 + n2 * 0.35 + n3 * 0.12;
    vec3 pos = position + normal * displ * uStrength * (1.0 + uMouse.x * 0.6);
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG_SHADER = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  void main() {
    float t = vPos.y * 0.5 + 0.5;
    float s = vPos.x * 0.5 + 0.5;
    vec3 a = mix(uC1, uC2, t);
    vec3 b = mix(uC3, uC4, t);
    vec3 col = mix(a, b, s);
    float fres = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.8);
    col += fres * 0.9;
    float iri = 0.12 * sin(uTime * 0.8 + vPos.x * 3.0 + vPos.y * 2.0);
    col += vec3(iri * 0.8, iri * 0.3, -iri);
    float mx = max(max(col.r, col.g), col.b);
    col = mix(vec3(mx), col, 1.12);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const WIRE_FRAG_SHADER = /* glsl */ `
  void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, 0.12); }
`;

export default function HeroOrb3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;

    const w = () => wrap.clientWidth;
    const h = () => wrap.clientHeight;

    // Expose the same global hooks the static home did so other modules can
    // poke at it (pulse from easter eggs, mute/on toggle, palette cycling).
    window.__orb = window.__orb ?? { boost: 0, on: true, palette: 0, setPalette: null, pulse: null };

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h(), false);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, w() / h(), 0.1, 100);
    cam.position.z = 3.6;

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: 0.4 },
      uC1: { value: new THREE.Color(PALETTES[0][0]) },
      uC2: { value: new THREE.Color(PALETTES[0][1]) },
      uC3: { value: new THREE.Color(PALETTES[0][2]) },
      uC4: { value: new THREE.Color(PALETTES[0][3]) },
    };

    const geo = new THREE.IcosahedronGeometry(1, 42);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const wireMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT_SHADER,
      fragmentShader: WIRE_FRAG_SHADER,
      wireframe: true,
      transparent: true,
    });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    mesh.add(wireMesh);

    // Torus ring
    const torusGeo = new THREE.TorusGeometry(2.2, 0.05, 8, 128);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x18d2c4, transparent: true, opacity: 0.55 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI * 0.4;
    scene.add(torus);

    // 4 orbital planets
    const planetColors = [0xfa5d29, 0xf02e65, 0xffb83d, 0x7c3fff];
    const planets: Array<{
      mesh: THREE.Mesh;
      baseR: number;
      baseAngle: number;
      speed: number;
      tilt: number;
    }> = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 24, 24);
      const m = new THREE.MeshBasicMaterial({ color: planetColors[i] });
      const s = new THREE.Mesh(g, m);
      const baseAngle = (i / 4) * Math.PI * 2;
      const baseR = 2.0 + Math.random() * 0.8;
      scene.add(s);
      planets.push({
        mesh: s,
        baseR,
        baseAngle,
        speed: 0.35 + Math.random() * 0.45,
        tilt: Math.random() * 0.5 - 0.25,
      });
    }

    // Cassette
    const cassGroup = new THREE.Group();
    const cassBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x0a0908 }),
    );
    const cassLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xfa5d29 }),
    );
    cassLabel.position.set(0, 0.08, 0.061);
    const reelL = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0xf3efe6 }),
    );
    const reelR = new THREE.Mesh(
      new THREE.CircleGeometry(0.06, 16),
      new THREE.MeshBasicMaterial({ color: 0xf3efe6 }),
    );
    reelL.position.set(-0.16, -0.08, 0.061);
    reelR.position.set(0.16, -0.08, 0.061);
    cassGroup.add(cassBody, cassLabel, reelL, reelR);
    cassGroup.position.set(2.3, 1.0, 0.5);
    cassGroup.rotation.z = -0.3;
    scene.add(cassGroup);

    // Vinyl disk
    const diskGroup = new THREE.Group();
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 48),
      new THREE.MeshBasicMaterial({ color: 0x0a0908 }),
    );
    const diskCenter = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 32),
      new THREE.MeshBasicMaterial({ color: 0xf02e65 }),
    );
    diskCenter.position.z = 0.001;
    const diskHole = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 16),
      new THREE.MeshBasicMaterial({ color: 0xf3efe6 }),
    );
    diskHole.position.z = 0.002;
    diskGroup.add(disk, diskCenter, diskHole);
    diskGroup.position.set(-2.5, -0.8, 0.3);
    scene.add(diskGroup);

    // Background particles
    const partGeo = new THREE.BufferGeometry();
    const partCount = 180;
    const pPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 8;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.025,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // Drag physics + mouse-parallax state
    const phys = {
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      lastTime: 0,
    };
    let tMouseX = 0;
    let tMouseY = 0;
    let cMouseX = 0;
    let cMouseY = 0;
    let pulse = 0;
    let paletteIdx = 0;

    function screenToWorld(sx: number, sy: number) {
      const nx = (sx / w()) * 2 - 1;
      const ny = -((sy / h()) * 2 - 1);
      const fov = (cam.fov * Math.PI) / 180;
      const dist = cam.position.z;
      const halfH = Math.tan(fov / 2) * dist;
      const halfW = halfH * cam.aspect;
      return { x: nx * halfW, y: ny * halfH };
    }

    function applyPalette(idx: number) {
      paletteIdx = idx % PALETTES.length;
      const p = PALETTES[paletteIdx];
      uniforms.uC1.value.set(p[0]);
      uniforms.uC2.value.set(p[1]);
      uniforms.uC3.value.set(p[2]);
      uniforms.uC4.value.set(p[3]);
      pulse = 1;
      if (window.__orb) window.__orb.palette = paletteIdx;
    }

    if (window.__orb) {
      window.__orb.setPalette = applyPalette;
      window.__orb.pulse = () => {
        pulse = 1;
      };
    }

    const onMouseDown = (e: MouseEvent) => {
      if (!window.__orb?.on) return;
      const rect = canvas.getBoundingClientRect();
      const wpos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const dx = wpos.x - phys.px;
      const dy = wpos.y - phys.py;
      if (Math.hypot(dx, dy) < 1.6) {
        phys.dragging = true;
        phys.dragOffsetX = dx;
        phys.dragOffsetY = dy;
        phys.lastTime = performance.now();
        canvas.setAttribute('data-cursor', 'SUJETO');
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Window-level so drags keep working when the cursor leaves the canvas
      tMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      tMouseY = -((e.clientY / window.innerHeight) * 2 - 1);
      if (!phys.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const wpos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const now = performance.now();
      const dt = Math.max(1, now - phys.lastTime) / 1000;
      const newX = wpos.x - phys.dragOffsetX;
      const newY = wpos.y - phys.dragOffsetY;
      phys.vx = (newX - phys.px) / dt;
      phys.vy = (newY - phys.py) / dt;
      phys.px = newX;
      phys.py = newY;
      phys.lastTime = now;
    };

    const onMouseUp = () => {
      if (phys.dragging) {
        phys.dragging = false;
        canvas.setAttribute('data-cursor', 'TOCAME');
      }
    };

    const onClick = () => {
      if (!window.__orb?.on) return;
      // Don't cycle palette if this was the end of a drag
      if (Math.hypot(phys.px, phys.py) > 0.3) return;
      applyPalette(paletteIdx + 1);
    };

    const onResize = () => {
      renderer.setSize(w(), h(), false);
      cam.aspect = w() / h();
      cam.updateProjectionMatrix();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    canvas.setAttribute('data-cursor', 'TOCAME');
    canvas.style.cursor = 'none';

    // Observe the wrap so the orb resizes cleanly when the hero box shifts
    // (layout changes, font-load shifts, etc.) — setSize on every frame is
    // overkill but a ResizeObserver covers everything except window-resize.
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = (now - start) / 1000;
      uniforms.uTime.value = t;

      cMouseX += (tMouseX - cMouseX) * 0.08;
      cMouseY += (tMouseY - cMouseY) * 0.08;

      cam.position.x = cMouseX * 0.35;
      cam.position.y = cMouseY * 0.25;
      cam.lookAt(0, 0, 0);

      if (!phys.dragging) {
        const k = 0.08;
        const damp = 0.88;
        phys.vx += -phys.px * k;
        phys.vy += -phys.py * k;
        phys.vx *= damp;
        phys.vy *= damp;
        phys.px += phys.vx * 0.016;
        phys.py += phys.vy * 0.016;
      }
      mesh.position.set(phys.px, phys.py, 0);

      const vMag = Math.hypot(phys.vx, phys.vy);
      const velBoost = Math.min(0.8, vMag * 0.04);

      mesh.rotation.y = cMouseX * 0.6 + t * 0.12 + phys.vx * 0.01;
      mesh.rotation.x = cMouseY * 0.5 + phys.vy * 0.01;
      uniforms.uMouse.value.set(cMouseX, cMouseY);

      const dist = Math.hypot(cMouseX, cMouseY);
      pulse *= 0.94;
      const boost = window.__orb?.boost ?? 0;
      const onMul = window.__orb?.on === false ? 0.15 : 1;
      uniforms.uStrength.value =
        (0.42 +
          (1 - Math.min(dist, 1)) * 0.32 +
          Math.sin(t * 1.3) * 0.08 +
          pulse * 0.85 +
          boost * 0.6 +
          velBoost) *
        onMul;

      torus.rotation.z = t * 0.35;
      torus.rotation.y = Math.sin(t * 0.4) * 0.3;
      torus.scale.setScalar(1 + Math.sin(t * 1.1) * 0.04);

      planets.forEach((p) => {
        const a = p.baseAngle + t * p.speed;
        p.mesh.position.set(
          Math.cos(a) * p.baseR,
          Math.sin(a) * p.baseR * 0.55 + p.tilt,
          Math.sin(a * 1.3) * 0.5,
        );
      });

      cassGroup.rotation.y = Math.sin(t * 0.6) * 0.4;
      cassGroup.position.y = 1.0 + Math.sin(t * 0.9) * 0.08;
      if (cassGroup.children.length > 2) {
        cassGroup.children[2].rotation.z = t * 3;
        cassGroup.children[3].rotation.z = t * 3;
      }

      diskGroup.rotation.z = -t * 1.8;
      diskGroup.position.y = -0.8 + Math.sin(t * 0.7 + 1) * 0.1;

      particles.rotation.y = t * 0.02;
      particles.rotation.z = Math.sin(t * 0.15) * 0.1;

      renderer.render(scene, cam);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      ro.disconnect();

      geo.dispose();
      mat.dispose();
      wireMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      partGeo.dispose();
      partMat.dispose();
      planets.forEach((p) => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      [cassBody, cassLabel, reelL, reelR, disk, diskCenter, diskHole].forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();

      if (window.__orb) {
        window.__orb.setPalette = null;
        window.__orb.pulse = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} id="orb-canvas" />;
}
