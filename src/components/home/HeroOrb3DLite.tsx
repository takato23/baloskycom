import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Mobile-optimised variant of HeroOrb3D — v2, aggressive.
 *
 * Anterior iteración (simplex noise + wireframe + torus + DPR 1.0 + 30fps)
 * todavía laggueaba en teléfonos medios. Esta versión baja el costo a la
 * mitad otra vez, manteniendo el look 3D.
 *
 * Qué se mantuvo (lo lindo):
 *   · Esfera 3D con displacement real
 *   · Torus ring detrás (ancla la composición, ~1 draw call)
 *   · Fresnel (borde brillante — lo que lo hace parecer vidrio)
 *   · 6 paletas Delirio + tap para ciclar
 *   · Pulse hook para easter eggs
 *
 * Qué se cortó / bajó:
 *   · Simplex noise (3D, ~40 ALU ops/vertex) → displacement analítico con
 *     3 senos (3–5 ALU ops/vertex). Invisible a simple vista, gigante en perf.
 *   · Wireframe overlay → fuera. Era la 2da pasada de draw del mesh; ahora
 *     una sola draw call por frame para el orb. El look es "esfera de vidrio
 *     líquido" en vez de "esfera facetada", pero sigue siendo 3D.
 *   · Iridiscencia sin → fuera (1 sin/fragment ahorrado)
 *   · Sub-div 6 → 4 (162 verts, básicamente indistinguible al tamaño del orb)
 *   · FPS cap 30 → 24. La rotación es lenta, 24fps es suficiente y baja el
 *     trabajo del GPU 20%.
 *   · DPR cap 1.0 → 0.85. Sobre una retina 3x esto ya era 9x menos
 *     fragments; ahora son ~12x menos.
 *   · Pausa RAF completa (no solo el render) cuando está off-screen o
 *     pestaña oculta — libera el hilo para el resto del scroll.
 */

const PALETTES: Array<[string, string, string, string]> = [
  ['#FA5D29', '#F02E65', '#7C3FFF', '#18D2C4'],
  ['#18D2C4', '#FA5D29', '#F02E65', '#7C3FFF'],
  ['#7C3FFF', '#18D2C4', '#FA5D29', '#FFB83D'],
  ['#F02E65', '#FFB83D', '#7C3FFF', '#18D2C4'],
  ['#FFB83D', '#FA5D29', '#F02E65', '#7C3FFF'],
  ['#0a0908', '#FA5D29', '#F02E65', '#FFB83D'],
];

// Displacement analítico con 3 senos — muchísimo más barato que simplex 3D.
// La fase cruzada (x, y, z) rompe la simetría así no se ve "anillos".
const VERT_SHADER = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uStrength;

  void main() {
    vNormal = normal;
    // 3 senos en ejes distintos con fases distintas → "ruido" barato
    float d =
        sin(position.x * 3.1 + uTime * 0.7) * 0.33
      + sin(position.y * 2.4 + uTime * 0.9 + 1.3) * 0.33
      + sin(position.z * 2.8 + uTime * 0.5 + 2.1) * 0.33;
    vec3 pos = position + normal * d * uStrength;
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader mínimo: gradiente 4-color + fresnel. Nada más.
// El fresnel es lo que lo hace parecer vidrio — si lo sacás, el orb se ve
// plano. Lo demás se puede simplificar.
const FRAG_SHADER = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
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
    // Fresnel rápido: dot con eje Z, sin pow (usamos *).
    float ndotv = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    col += ndotv * ndotv * 0.7;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HeroOrb3DLite() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;

    window.__orb = window.__orb ?? {
      boost: 0,
      on: true,
      palette: 0,
      setPalette: null,
      pulse: null,
    };

    const w = () => wrap.clientWidth;
    const h = () => wrap.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
    // DPR 0.85 — imperceptible sobre un orb de 62vmin en retina, pero ~30%
    // menos fragments vs DPR 1.0. Si en algún dispositivo se ve pixelado
    // después, subí a 1.0.
    renderer.setPixelRatio(Math.min(0.85, window.devicePixelRatio || 1));
    renderer.setSize(w(), h(), false);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, w() / h(), 0.1, 100);
    cam.position.z = 3.6;

    const uniforms = {
      uTime: { value: 0 },
      uStrength: { value: 0.3 },
      uC1: { value: new THREE.Color(PALETTES[0][0]) },
      uC2: { value: new THREE.Color(PALETTES[0][1]) },
      uC3: { value: new THREE.Color(PALETTES[0][2]) },
      uC4: { value: new THREE.Color(PALETTES[0][3]) },
    };

    // Sub-div 4 = 162 vértices. A este tamaño, indistinguible de 6.
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Un solo torus detrás. ~128 verts, MeshBasicMaterial (sin luz/shader
    // custom), básicamente gratis.
    const torusGeo = new THREE.TorusGeometry(2.1, 0.03, 6, 48);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x18d2c4,
      transparent: true,
      opacity: 0.4,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI * 0.4;
    scene.add(torus);

    let paletteIdx = 0;
    let pulse = 0;
    let tMouseX = 0;
    let tMouseY = 0;
    let cMouseX = 0;
    let cMouseY = 0;

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

    const onTap = () => {
      if (!window.__orb?.on) return;
      applyPalette(paletteIdx + 1);
    };
    canvas.addEventListener('click', onTap);

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      tMouseX = (t.clientX / window.innerWidth) * 2 - 1;
      tMouseY = -((t.clientY / window.innerHeight) * 2 - 1);
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    const onResize = () => {
      renderer.setSize(w(), h(), false);
      cam.aspect = w() / h();
      cam.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    // Pausa COMPLETA cuando no se ve o la pestaña está oculta — no seguimos
    // haciendo RAF ticks. Cancelamos el frame y lo reiniciamos cuando vuelve
    // a ser visible. El ahorro de CPU es mayor que solo saltar el render.
    let visible = true;
    let pageVisible = !document.hidden;
    let raf = 0;
    const start = performance.now();
    const FRAME_INTERVAL_MS = 1000 / 24; // 24 FPS cap
    let lastRender = 0;

    const tick = () => {
      const now = performance.now();
      if (!visible || !pageVisible) {
        raf = 0;
        return;
      }

      if (now - lastRender >= FRAME_INTERVAL_MS) {
        lastRender = now;
        const t = (now - start) / 1000;
        uniforms.uTime.value = t;

        cMouseX += (tMouseX - cMouseX) * 0.08;
        cMouseY += (tMouseY - cMouseY) * 0.08;
        cam.position.x = cMouseX * 0.25;
        cam.position.y = cMouseY * 0.2;
        cam.lookAt(0, 0, 0);

        pulse *= 0.94;
        const boost = window.__orb?.boost ?? 0;
        const onMul = window.__orb?.on === false ? 0.15 : 1;
        uniforms.uStrength.value =
          (0.3 + Math.sin(t * 1.1) * 0.06 + pulse * 0.6 + boost * 0.4) * onMul;

        mesh.rotation.y = t * 0.18 + cMouseX * 0.4;
        mesh.rotation.x = cMouseY * 0.35;

        torus.rotation.z = t * 0.3;
        torus.scale.setScalar(1 + Math.sin(t * 1.1) * 0.03);

        renderer.render(scene, cam);
      }

      raf = requestAnimationFrame(tick);
    };

    const resume = () => {
      if (raf === 0 && visible && pageVisible) {
        raf = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
        });
        if (visible) resume();
      },
      { threshold: 0.01 },
    );
    io.observe(wrap);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) resume();
    };
    document.addEventListener('visibilitychange', onVisibility);

    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener('click', onTap);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      mat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      renderer.dispose();
      if (window.__orb) {
        window.__orb.setPalette = null;
        window.__orb.pulse = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} id="orb-canvas" />;
}
