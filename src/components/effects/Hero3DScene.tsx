/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Hero3DScene — hero "isométrico" hecho con un plano 3D al que le levantamos
 * los vértices usando un depth map (más claro = más cerca de la cámara,
 * más oscuro = más lejos). Con una sola foto + un depth map ganás una
 * sensación 2.5D convincente: la cara queda perfecta (es literalmente la
 * foto) pero reacciona al mouse con paralaje real.
 *
 * ¿Por qué así y no un mesh 3D generado por AI?
 * - Un mesh generado de una sola foto inventa los laterales y la identidad
 *   se rompe en cuanto rotás ±20°. Este approach, en cambio, preserva la
 *   foto intacta y sólo cede a pequeños ángulos, que es exactamente lo
 *   que necesita un hero.
 *
 * Depth map:
 * - Si le pasás `depthSrc`, lo usa directo (ideal: lo generás con MiDaS/
 *   ZoeDepth offline y lo dejás en /public/uploads/...).
 * - Si NO, lo inventa en runtime con un heurístico: radial centrado en
 *   la cara + aporte de luminancia. No es tan bueno como un modelo real
 *   pero alcanza para validar la dirección sin esperar generación.
 *
 * Interacción:
 * - Paralaje suave con el mouse (desktop) y con deviceorientation (mobile).
 * - Tilt base "isométrico" ajustable desde afuera.
 *
 * Uso:
 * ```
 * <Hero3DScene photoSrc="/uploads/thumbs/balosky-portrait-frente.jpg" />
 * ```
 */

interface Hero3DSceneProps {
  /** Foto color (ideal: portrait frontal, buena res). */
  photoSrc: string;
  /** Depth map pre-generado (grayscale). Si no lo pasás, se genera heurístico. */
  depthSrc?: string;
  /** 0..1 — cuánto se separan los "picos" del plano (fuerza de paralaje 3D). */
  displacement?: number;
  /** 0..1 — fuerza del seguimiento de mouse/tilt. */
  parallax?: number;
  /** 0..1 — oscurecimiento de los bordes (ayuda a vender la profundidad). */
  edgeFade?: number;
  /** Grados de tilt base "isométrico". 0 = cámara de frente. */
  tilt?: number;
  /** Color del fondo detrás del plano (lo vas a ver cuando la geometría se curva). */
  background?: string;
  /** Clase CSS del wrapper — debe tener size definido (width/height). */
  className?: string;
}

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  plane: THREE.Mesh;
  material: THREE.ShaderMaterial;
  targetMouse: THREE.Vector2;
  currentMouse: THREE.Vector2;
  tiltRad: number;
  parallax: number;
}

/**
 * Genera un depth map heurístico a partir de una foto portrait.
 * Asume que la cara está arriba-centro. Combina:
 *   - Falloff radial centrado en la cara (driver principal).
 *   - Aporte de luminancia (detalle fino).
 * Devuelve un canvas listo para usar como textura.
 */
function generateHeuristicDepth(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height);
  const { data: px, width, height } = data;

  // Centro de la cara asumido: arriba-centro (típico de portraits).
  const cx = width * 0.5;
  const cy = height * 0.40;
  const maxR = Math.sqrt(
    Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2,
  );

  for (let i = 0; i < px.length; i += 4) {
    const idx = i >> 2;
    const x = idx % width;
    const y = (idx / width) | 0;

    // Distancia normalizada al centro de la cara (0..1).
    const dx = (x - cx) / maxR;
    const dy = (y - cy) / maxR;
    const r = Math.sqrt(dx * dx + dy * dy);

    // Radial falloff: cerca=1 (cara adelante), lejos=0 (fondo lejos).
    // Curva cuadrática para que la transición sea más dramática.
    const radial = Math.max(0, 1 - Math.min(1, r * 1.4));
    const radialCurved = radial * radial;

    // Luminancia normalizada (0..1). En portraits con fondo oscuro,
    // la cara brilla más que el fondo → aporta detalle.
    const lum =
      (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;

    // 70% radial + 30% luminancia. El radial domina para evitar que
    // el pelo oscuro se "hunda" (porque tiene luminancia baja).
    const d = Math.max(0, Math.min(1, radialCurved * 0.7 + lum * 0.3));

    const out = (d * 255) | 0;
    px[i] = out;
    px[i + 1] = out;
    px[i + 2] = out;
    px[i + 3] = 255;
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

const VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDisplacement;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    // Sample depth. Tomamos el canal rojo (son grayscale).
    float d = texture2D(uDepth, uv).r;
    vDepth = d;
    vec3 pos = position;
    // Centramos alrededor de 0.5 para que el "fondo" vaya hacia -z
    // y la "cara" venga hacia +z. El 1.8 amplifica la diferencia.
    pos.z += (d - 0.4) * uDisplacement * 1.8;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uPhoto;
  uniform float uEdgeFade;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec4 col = texture2D(uPhoto, vUv);
    // Viñeta suave que oscurece los bordes del plano — ayuda a que la
    // silueta se funda con el fondo y no se vea el rectángulo.
    float edgeX = min(vUv.x, 1.0 - vUv.x);
    float edgeY = min(vUv.y, 1.0 - vUv.y);
    float edge = min(edgeX, edgeY);
    float fade = smoothstep(0.0, uEdgeFade, edge);
    col.rgb *= mix(0.35, 1.0, fade);
    // Alpha sigue la misma viñeta para que el fondo se filtre en los
    // extremos — así el "recorte" del plano no es duro.
    col.a *= mix(0.0, 1.0, fade);
    gl_FragColor = col;
  }
`;

export default function Hero3DScene({
  photoSrc,
  depthSrc,
  displacement = 0.55,
  parallax = 0.6,
  edgeFade = 0.08,
  tilt = 6,
  background = '#0a0908',
  className,
}: Hero3DSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SceneState | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Setup — se corre cuando cambia la foto (recrea la scene).
  // No lo rehacemos por cambios de displacement / parallax / tilt,
  // esos se aplican por uniforms/refs en el segundo effect.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0, 4.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    // Plano con mucha subdivisión para que el displacement se vea fluido.
    // Ratio 3:4 para portraits verticales. El material se ajusta al cover.
    const geometry = new THREE.PlaneGeometry(2.4, 3.2, 240, 320);

    // Texturas
    const loader = new THREE.TextureLoader();
    const photoTex = loader.load(photoSrc, () => {
      // re-render al terminar
      renderer.render(scene, camera);
    });
    photoTex.colorSpace = THREE.SRGBColorSpace;
    photoTex.minFilter = THREE.LinearFilter;
    photoTex.magFilter = THREE.LinearFilter;

    // Depth: o bien cargamos uno real, o generamos heurístico desde la foto.
    const depthTex = new THREE.Texture();
    depthTex.minFilter = THREE.LinearFilter;
    depthTex.magFilter = THREE.LinearFilter;

    if (depthSrc) {
      loader.load(depthSrc, (loaded) => {
        depthTex.image = loaded.image;
        depthTex.needsUpdate = true;
      });
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const depthCanvas = generateHeuristicDepth(img);
        depthTex.image = depthCanvas;
        depthTex.needsUpdate = true;
      };
      img.src = photoSrc;
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPhoto: { value: photoTex },
        uDepth: { value: depthTex },
        uDisplacement: { value: displacement },
        uEdgeFade: { value: edgeFade },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const state: SceneState = {
      scene,
      camera,
      renderer,
      plane,
      material,
      targetMouse: new THREE.Vector2(0, 0),
      currentMouse: new THREE.Vector2(0, 0),
      tiltRad: THREE.MathUtils.degToRad(tilt),
      parallax,
    };
    stateRef.current = state;

    // Resize observer — sigue el tamaño del container.
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Mouse parallax (desktop).
    // IMPORTANTE: clampeamos a ±1 aunque el mouse esté fuera del mount.
    // Sin esto, cuando el cursor está arriba de la barra de tareas o al
    // costado, la normalización da valores ±3+ y la rotación explota —
    // el plano termina cruzando su propio eje y se ve la cara estirada
    // (el "taffy effect" típico del 2.5D).
    const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.targetMouse.set(clamp1(x), clamp1(y));
    };
    window.addEventListener('mousemove', onMouseMove);

    // DeviceOrientation parallax (mobile). Ya clampeaba antes, lo
    // explicitamos con la misma helper.
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const x = clamp1((e.gamma || 0) / 25);
      const y = clamp1(((e.beta || 0) - 40) / 30);
      state.targetMouse.set(x, y);
    };
    window.addEventListener('deviceorientation', onOrient);

    // Loop
    let raf = 0;
    const tick = () => {
      state.currentMouse.lerp(state.targetMouse, 0.07);

      // Base isométrico + offset al mouse.
      // Los multiplicadores están calibrados para que, incluso con el
      // mouse en ±1 (borde del frame) y parallax=2 (máximo del panel),
      // la rotación total no pase de ±0.28 rad ≈ ±16°. Más que eso
      // rompe la ilusión del 2.5D porque el plano no tiene "costado".
      const baseX = state.tiltRad * 0.45;
      const baseY = -state.tiltRad * 0.30;
      plane.rotation.x = baseX - state.currentMouse.y * 0.08 * state.parallax;
      plane.rotation.y = baseY + state.currentMouse.x * 0.12 * state.parallax;
      // Micro-traslación para efecto "asomo" en el eje Z.
      plane.position.x = state.currentMouse.x * 0.04 * state.parallax;
      plane.position.y = state.currentMouse.y * 0.03 * state.parallax;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('deviceorientation', onOrient);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      photoTex.dispose();
      depthTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      stateRef.current = null;
    };
    // Sólo rehacemos la scene si cambia la foto o el depth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSrc, depthSrc]);

  // ─────────────────────────────────────────────────────────────────
  // Props live-update — aplican sin rebuildar la scene.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.material.uniforms.uDisplacement.value = displacement;
    s.material.uniforms.uEdgeFade.value = edgeFade;
    s.parallax = parallax;
    s.tiltRad = THREE.MathUtils.degToRad(tilt);
  }, [displacement, parallax, edgeFade, tilt]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%', background }}
    />
  );
}
