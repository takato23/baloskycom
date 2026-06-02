/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Head3D — cabeza 3D de Santi renderizada con Three.js.
 *
 * El modelo es un mesh estático (sin huesos ni morph targets) generado con
 * Meshy AI desde foto. Vive en /public/models/santi-head.glb.
 *
 * Como no hay rig facial posible, la vitalidad es 100% procedural —
 * movimiento de la cabeza entera. Cuatro comportamientos combinados:
 *
 *  1) RESPIRACIÓN — escala Y sube y baja con un sine de ~4s. Aplicado
 *     sobre un inner group para no interferir con la rotación.
 *
 *  2) LOOK-AT-CURSOR — la cabeza rota activamente hacia donde está el
 *     mouse (no sólo tilt). Rango ±25° en Y, ±15° en X. Lerp suave.
 *
 *  3) GESTOS RANDOM — cada 8-15 segundos dispara un micro-gesto: nod
 *     ("sí"), shake ("no"), o glance (mira al costado). Dura ~800ms,
 *     envolvente ease-in-out para que no se vea robótico. Entre gestos
 *     la cabeza vuelve al look-at-cursor.
 *
 *  4) CLICK → BIG NOD — clic sobre el canvas dispara un nod fuerte
 *     inmediato (como asentir "dale"). Convierte la cabeza en un punto
 *     de interacción, no sólo decoración.
 *
 * Cuando el mouse está inactivo (>3s sin moverse) la cabeza hace un
 * idle swing lento — rota en Y con un sine amplio — para no quedar
 * pegada mirando a donde quedó el cursor por última vez.
 *
 * Importante: esta escena renderiza la cabeza central junto con las
 * 6 cabecitas orbitales en el mismo scene. Así pueden pasar por atrás
 * del busto y quedar ocluidas por profundidad de verdad.
 */

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { TOKENS } from '../tokens';

export interface Head3DProps {
  src?: string;
  style?: CSSProperties;
  className?: string;
  /** Rango máximo del look-at Y, en radianes. Default 0.44 (≈25°). */
  lookAtYawMax?: number;
  /** Rango máximo del look-at X, en radianes. Default 0.26 (≈15°). */
  lookAtPitchMax?: number;
  /**
   * Offset Y aplicado al modelo después de centrarlo, en unidades del
   * bounding box (0.06 = sube 6% del alto).
   */
  yOffsetRatio?: number;
  /** Desactivar gestos random (p.ej. en prefers-reduced-motion). */
  disableRandomGestures?: boolean;
  /** Desactivar las 6 cabecitas orbitales. */
  disablePlanets?: boolean;
  /**
   * Desactivar el pestañeo fake (squash Y de 100ms cada 3-7s). En algunos
   * mounts se lee como "temblequeo" del busto (Santi: "mi cuerpo deje de
   * hacer como un temblequeo"). Sin esto la cabeza sólo respira y rota.
   */
  disableBlink?: boolean;
  /**
   * Atenuar la amplitud de la respiración (±1.8% default). Pasá 0 para
   * apagarla. Default: 1.
   */
  breathAmpScale?: number;
  /**
   * Override del Z de la cámara (distancia al busto). Si se pasa, ignora
   * el auto-adjust por aspect ratio. Útil en mounts donde el stage ya
   * tiene su propio aspect/proporción y querés un zoom específico — por
   * ejemplo el HeroRedesign usa ~2.7 para que el busto llene el stage
   * después de sacar los elementos decorativos del alrededor.
   */
  cameraZ?: number;
  onReady?: () => void;
  onError?: (err: unknown) => void;
}

// Tipos de gesto y función que computa el offset de rotación dado el
// progreso local t en [0,1].
type GestureKind = 'nod' | 'shake' | 'glance' | 'bigNod';

interface Gesture {
  kind: GestureKind;
  duration: number;
  compute: (t: number) => { x: number; y: number };
}

type SatelliteDef = {
  url: string;
  baseAngle: number;
  scale: number;
  speed: number;
  radiusX: number;
  radiusZ: number;
  tiltX: number;
  tiltZ: number;
  yOffset: number;
  eccentricity: number;
  precession: number;
  verticalAmp: number;
  verticalSpeed: number;
  phase: number;
};

// Envelope ease-in-out (smoothstep) — el gesto arranca y termina suave.
const envelope = (t: number) => {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
};

const GESTURES: Record<GestureKind, Gesture> = {
  // "Sí" sutil — chin up-down una vez.
  nod: {
    kind: 'nod',
    duration: 700,
    compute: (t) => ({
      x: Math.sin(t * Math.PI) * 0.14 * envelope(Math.min(1, t * 1.2)),
      y: 0,
    }),
  },
  // "No" — cabeza gira lado a lado con amortiguación.
  shake: {
    kind: 'shake',
    duration: 850,
    compute: (t) => ({
      x: 0,
      y: Math.sin(t * Math.PI * 2.3) * 0.18 * envelope(1 - Math.abs(t * 2 - 1)),
    }),
  },
  // Glance — mira al costado (izq o der random), vuelve.
  glance: {
    kind: 'glance',
    duration: 900,
    compute: (t) => ({
      x: Math.sin(t * Math.PI) * -0.04,
      y: Math.sin(t * Math.PI) * 0.28,
    }),
  },
  // Big nod — el del click, más pronunciado.
  bigNod: {
    kind: 'bigNod',
    duration: 620,
    compute: (t) => ({
      x: Math.sin(t * Math.PI * 1.4) * 0.26 * envelope(Math.min(1, t * 1.5)),
      y: 0,
    }),
  },
};

const pickRandomGesture = (): GestureKind => {
  // Glances son más frecuentes (siente más natural), shakes raros.
  const roll = Math.random();
  if (roll < 0.5) return 'glance';
  if (roll < 0.85) return 'nod';
  return 'shake';
};

// Iteración abril 2026 — v4: Santi reportó que en desktop las cabecitas
// desaparecían ("en modo desktop no están mis cabecitas"). Diagnóstico:
// con stage aspect 5/6 + cameraZ=3.15 + FOV=35°, el ancho visible en
// el plano de las órbitas (z≈0.22) es ~±0.77 unidades world. Los
// radiusX anteriores (0.86-1.02) llevaban a los satélites más allá del
// encuadre horizontal casi toda la órbita — sólo asomaban cuando
// cruzaban el centro (x≈0). Fix v4: bajamos radiusX a 0.55-0.72 y
// radiusZ proporcional (mantenemos el ratio X/Z ~1.2 para que siga
// leyéndose como elipse electron, no como círculo plano).
// ORBIT_CENTER sigue en z=+0.22 así el frontal queda delante de la
// nariz del busto (heredado de v3).
const SATELLITES: SatelliteDef[] = [
  { url: '/models/planets/planet-01.glb', baseAngle: 0.10,           scale: 0.20, speed: 0.57, radiusX: 0.72, radiusZ: 0.58, tiltX: 0.52,  tiltZ: 0.34, yOffset: 0.10, eccentricity: 0.10, precession: 0.06, verticalAmp: 0.014, verticalSpeed: 0.72, phase: 0.2 },
  { url: '/models/planets/planet-02.glb', baseAngle: Math.PI - 0.2,  scale: 0.20, speed: 0.47, radiusX: 0.68, radiusZ: 0.54, tiltX: -0.50, tiltZ: -0.30, yOffset: 0.08, eccentricity: 0.08, precession: -0.05, verticalAmp: 0.012, verticalSpeed: 0.90, phase: 1.1 },
  { url: '/models/planets/planet-03.glb', baseAngle: Math.PI / 2,    scale: 0.19, speed: 0.41, radiusX: 0.64, radiusZ: 0.50, tiltX: 0.88,  tiltZ: -0.18, yOffset: 0.06, eccentricity: 0.12, precession: 0.05, verticalAmp: 0.014, verticalSpeed: 0.82, phase: 2.4 },
  { url: '/models/planets/planet-04.glb', baseAngle: Math.PI * 1.5,  scale: 0.19, speed: 0.36, radiusX: 0.62, radiusZ: 0.48, tiltX: -0.86, tiltZ: 0.20, yOffset: 0.06, eccentricity: 0.10, precession: -0.07, verticalAmp: 0.012, verticalSpeed: 1.04, phase: 3.5 },
  { url: '/models/planets/planet-05.glb', baseAngle: Math.PI / 3,    scale: 0.18, speed: 0.33, radiusX: 0.58, radiusZ: 0.46, tiltX: 0.66,  tiltZ: 0.48, yOffset: 0.09, eccentricity: 0.14, precession: 0.08, verticalAmp: 0.013, verticalSpeed: 0.78, phase: 4.6 },
  { url: '/models/planets/planet-06.glb', baseAngle: Math.PI * 1.33, scale: 0.18, speed: 0.51, radiusX: 0.60, radiusZ: 0.44, tiltX: -0.62, tiltZ: -0.46, yOffset: 0.09, eccentricity: 0.09, precession: -0.09, verticalAmp: 0.012, verticalSpeed: 0.96, phase: 5.3 },
];

export default function Head3D({
  src = '/models/santi-head.glb',
  style,
  className,
  lookAtYawMax = 0.44,
  lookAtPitchMax = 0.26,
  yOffsetRatio = 0.06,
  disableRandomGestures = false,
  disablePlanets = false,
  disableBlink = false,
  breathAmpScale = 1,
  cameraZ,
  onReady,
  onError,
}: Head3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─────────────────────────────────────────────────────────
    // Scene / Camera / Renderer
    // ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    // Distancia base a la cabeza. Se recalcula en resize() según aspect ratio
    // para que en portrait (mobile) la cámara se aleje y la cabeza no ocupe
    // toda la pantalla tragándose título, stickers y stats.
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'pointer';

    // ─────────────────────────────────────────────────────────
    // Luces — paleta chocolate cálida
    // ─────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffe0c4, 0.32);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffb38a, 1.35);
    key.position.set(1.8, 2.0, 2.2);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xa0b8d0, 0.45);
    fill.position.set(-2.2, 0.6, 1.4);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xff9e5c, 0.9);
    rim.position.set(-0.6, 2.4, -2.6);
    scene.add(rim);

    // ─────────────────────────────────────────────────────────
    // Grupos: outer (rotación) > inner (respiración) > model
    // ─────────────────────────────────────────────────────────
    const rotationGroup = new THREE.Group();
    const breathGroup = new THREE.Group();
    rotationGroup.add(breathGroup);
    scene.add(rotationGroup);

    // ─────────────────────────────────────────────────────────
    // Estado de animación (mutable refs en closures)
    // ─────────────────────────────────────────────────────────
    let mounted = true;

    type SatelliteInstance = {
      pivot: THREE.Group;
      visual: THREE.Group;
      materialTargets: THREE.MeshStandardMaterial[];
      def: SatelliteDef;
    };
    const satellites: SatelliteInstance[] = [];
    const satelliteRoot = new THREE.Group();
    scene.add(satelliteRoot);
    const satelliteLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    // ORBIT_CENTER: desplazado +0.22 en Z respecto al busto. Esto mueve
    // el sistema entero de órbitas hacia adelante del modelo, así el
    // hemisferio frontal nunca choca con la cara. El back-half se acerca
    // al busto pero queda ocluido por z-buffer (el busto tapa al planet
    // cuando pasa por detrás).
    const ORBIT_CENTER = new THREE.Vector3(0, 0.56, 0.22);

    if (!disablePlanets) {
      // (Se probaron trazas elípticas tipo "electron trails" siguiendo
      // el mockup que Santi bajó de ChatGPT. Santi: "el borraría las
      // líneas de órbita". Quedan las cabecitas moviéndose pero sin
      // anillo visible — más limpio, leerse como planetitas libres en
      // vez de sistema solar con carriles.)
      SATELLITES.forEach((def) => {
        satelliteLoader.load(
          def.url,
          (gltf) => {
            if (!mounted) return;
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;

            model.position.sub(center);

            const visual = new THREE.Group();
            visual.add(model);
            visual.scale.setScalar((def.scale * 2) / maxDim);
            visual.rotation.set(0, 0, 0);

            const pivot = new THREE.Group();
            pivot.add(visual);
            pivot.position.copy(ORBIT_CENTER);
            satelliteRoot.add(pivot);

            const materialTargets: THREE.MeshStandardMaterial[] = [];
            model.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.transparent = true;
                  mat.roughness = Math.min(1, (mat.roughness ?? 0.5) + 0.08);
                  mat.envMapIntensity = 0.7;
                  mat.needsUpdate = true;
                  materialTargets.push(mat);
                }
              });
            });

            satellites.push({ pivot, visual, materialTargets, def });
          },
          undefined,
          (err) => {
            console.warn('[Head3D] satellite failed to load', def.url, err);
          },
        );
      });
    }

    // Mouse (normalizado viewport [-1,1]).
    const mouseTarget = { x: 0, y: 0 };
    let mouseLastActive = performance.now();

    // Rotación actual aplicada (se lerpea hacia target).
    const currentRot = { x: 0, y: 0 };

    // Gesto activo.
    let activeGesture: Gesture | null = null;
    let gestureStart = 0;

    // Próximo gesto random: se programa aleatoriamente entre 8-15s.
    let nextRandomGestureAt = performance.now() + (8 + Math.random() * 7) * 1000;

    // Próximo pestañeo fake (squash Y rápido): 3-7s.
    let nextBlinkAt = performance.now() + (3 + Math.random() * 4) * 1000;
    let blinking = false;
    let blinkStart = 0;

    // Flags para perf — pausamos el loop cuando no se ve o el tab está hidden.
    let inViewport = true;
    let tabVisible = !document.hidden;

    // ─────────────────────────────────────────────────────────
    // Load GLB
    // ─────────────────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (!mounted) return;
        const model = gltf.scene;
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 1.6;
        const scale = targetHeight / maxDim;
        model.position.sub(center);
        model.position.y += size.y * yOffsetRatio * (1 / scale);
        model.scale.setScalar(scale);

        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const mat = mesh.material;
            const tuneMat = (m: THREE.Material) => {
              const pbr = m as THREE.MeshStandardMaterial;
              if (pbr.isMeshStandardMaterial) {
                pbr.roughness = Math.min(1, (pbr.roughness ?? 0.5) + 0.15);
                pbr.envMapIntensity = 0.8;
                pbr.needsUpdate = true;
              }
            };
            if (Array.isArray(mat)) mat.forEach(tuneMat);
            else if (mat) tuneMat(mat);
          }
        });

        breathGroup.add(model);
        setLoaded(true);
        onReady?.();
      },
      undefined,
      (err) => {
        if (!mounted) return;
        console.error('[Head3D] failed to load', src, err);
        setErrored(true);
        onError?.(err);
      },
    );

    // ─────────────────────────────────────────────────────────
    // Listeners
    // ─────────────────────────────────────────────────────────
    const onPointerMove = (e: PointerEvent) => {
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseLastActive = performance.now();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Click sobre el canvas → big nod (no interrumpe un gesto en curso
    // para no acumular jitter; si querés "stackearlo" sacá el guard).
    const onClick = () => {
      if (activeGesture && activeGesture.kind === 'bigNod') return;
      activeGesture = GESTURES.bigNod;
      gestureStart = performance.now();
    };
    renderer.domElement.addEventListener('click', onClick);

    // Resize
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      // Cámara adaptive: en portrait / narrow screens tuneamos la
      // distancia para que la cara llene el frame sin que la cabeza
      // coma todo el viewport.
      //   aspect >= 1.2 (landscape / desktop): z = 3.2 (close, retrato)
      //   aspect  < 0.75 (mobile portrait):    z = 3.4 (cara grande,
      //      empareja con el canvas más corto de ~52vh en mobile)
      //   en el medio: interpolación lineal.
      // Nota histórica: antes el mobile usaba z=5.2 para "dejar aire",
      // pero con el nuevo layout donde la cabeza es su propia banda
      // arriba (no layered con texto), necesitamos que la cara llene.
      const a = camera.aspect;
      let z: number;
      if (typeof cameraZ === 'number') {
        // Override manual — el consumer ya sabe la proporción de su stage
        // y pidió un zoom específico. No interpolamos.
        z = cameraZ;
      } else if (a >= 1.2) z = 3.2;
      else if (a <= 0.75) z = 3.4;
      else z = 3.2 + (3.4 - 3.2) * (1.2 - a) / (1.2 - 0.75);
      camera.position.set(0, 0, z);

      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // IntersectionObserver — si el hero sale de viewport (el usuario scroleó
    // abajo), apagamos el RAF. La GPU descansa mientras lee la página.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          inViewport = e.isIntersecting;
          if (inViewport && tabVisible && !raf) {
            raf = requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0 },
    );
    io.observe(container);

    // Page Visibility — si el tab está en background, apagamos el RAF.
    const onVisibility = () => {
      tabVisible = !document.hidden;
      if (tabVisible && inViewport && !raf) {
        raf = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ─────────────────────────────────────────────────────────
    // Loop — con cap a 30fps (el movimiento es sutil, 60fps es GPU-waste)
    // ─────────────────────────────────────────────────────────
    // Usamos `performance.now()` directo en vez de `THREE.Clock` — Three 0.180+
    // empezó a emitir deprecation warnings sobre Clock (migraron a `Timer`,
    // que aún no está estable). Como ya estábamos trackeando `now` y
    // `lastFrame` para el cap de 30fps, computamos dt/t a mano y evitamos
    // tanto el warning como el allocation extra.
    const startTime = performance.now();
    let prevTime = startTime;
    let raf = 0;
    const TARGET_FPS = 30;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastFrame = 0;

    const animate = () => {
      // Gate de viewport + visibility: si no se ve o el tab está hidden,
      // liberamos el loop. Se re-arma en los listeners.
      if (!inViewport || !tabVisible) {
        raf = 0;
        return;
      }

      const now = performance.now();

      // Cap a 30fps: si no pasó FRAME_MS, reprogramamos sin hacer trabajo.
      if (now - lastFrame < FRAME_MS) {
        raf = requestAnimationFrame(animate);
        return;
      }
      lastFrame = now;

      // dt = segundos desde el frame anterior; t = segundos desde el inicio.
      // Reemplaza `clock.getDelta()` + `clock.elapsedTime` sin usar THREE.Clock.
      const dt = Math.min(0.25, (now - prevTime) / 1000);
      const t = (now - startTime) / 1000;
      prevTime = now;

      // 1) TARGET ROTATION — de dónde viene la pose base de la cabeza.
      //    Orden de prioridad: look-at-mouse (si mouse activo) > idle swing.
      const mouseActiveRecent = now - mouseLastActive < 3000;
      let targetX: number;
      let targetY: number;

      if (mouseActiveRecent) {
        // Look-at cursor: mouseTarget ∈ [-1,1] → escalar por rango máx.
        targetY = mouseTarget.x * lookAtYawMax;
        // Invertimos Y porque un mouse arriba en pantalla = pitch NEGATIVO
        // (la cabeza mira arriba). Sin este invert se siente upside-down.
        targetX = -mouseTarget.y * lookAtPitchMax;
      } else {
        // Idle swing — oscila suave en Y, casi estático en X.
        targetY = Math.sin(t * 0.28) * lookAtYawMax * 0.6;
        targetX = Math.sin(t * 0.22 + 1) * lookAtPitchMax * 0.15;
      }

      // 2) GESTURES RANDOM — chequeo si toca disparar uno.
      if (!disableRandomGestures && !activeGesture && now >= nextRandomGestureAt) {
        activeGesture = GESTURES[pickRandomGesture()];
        gestureStart = now;
      }

      // 3) APLICAR OFFSET DEL GESTO si hay uno activo.
      let offsetX = 0;
      let offsetY = 0;
      if (activeGesture) {
        const localT = (now - gestureStart) / activeGesture.duration;
        if (localT >= 1) {
          activeGesture = null;
          // Programar el siguiente entre 8-15s.
          nextRandomGestureAt = now + (8 + Math.random() * 7) * 1000;
        } else {
          const off = activeGesture.compute(localT);
          offsetX = off.x;
          offsetY = off.y;
        }
      }

      // 4) LERP hacia el target final (base + offset).
      const finalX = targetX + offsetX;
      const finalY = targetY + offsetY;
      // factor 5 = settling ~0.2s a 60fps. Menor = más perezoso.
      const k = Math.min(1, dt * 5);
      currentRot.x += (finalX - currentRot.x) * k;
      currentRot.y += (finalY - currentRot.y) * k;
      rotationGroup.rotation.x = currentRot.x;
      rotationGroup.rotation.y = currentRot.y;

      // 5) RESPIRACIÓN — pulso Y suave aplicado al inner group.
      //    Período ~4.2s (respiración relajada), amplitud 0.018 = ±1.8%.
      //    `breathAmpScale` permite atenuarla o apagarla (HeroRedesign
      //    la deja al 0.5 para que el busto se sienta calmo).
      let breath = 1 + Math.sin(t * (Math.PI * 2) / 4.2) * 0.018 * breathAmpScale;

      // 6) PESTAÑEO FAKE — squash Y rápido (100ms) cada 3-7s.
      //    Como el mesh es estático sin morph targets, aplastar toda la
      //    cabeza brevemente es la forma más barata de sugerir pestañeo.
      //    En HeroRedesign pasamos `disableBlink` porque se lee como
      //    "temblequeo" mezclado con el resto del movimiento.
      if (!disableBlink) {
        if (!blinking && now >= nextBlinkAt) {
          blinking = true;
          blinkStart = now;
          nextBlinkAt = now + (3 + Math.random() * 4) * 1000;
        }
        if (blinking) {
          const bt = (now - blinkStart) / 100; // 100ms de duración
          if (bt >= 1) {
            blinking = false;
          } else {
            // Curva asimétrica: cierre rápido (0→1 en 40% del tiempo) +
            // apertura más lenta (60%). Sin(pi*x) es simétrico, usamos
            // un parabólico asimétrico: pico a 0.35.
            const peakAt = 0.35;
            const p = bt < peakAt ? bt / peakAt : (1 - bt) / (1 - peakAt);
            const squash = 1 - Math.max(0, p) * 0.09;
            breath *= squash;
          }
        }
      }

      breathGroup.scale.set(1, breath, 1);

      for (const sat of satellites) {
        const angle = sat.def.baseAngle + t * sat.def.speed;
        const precession = t * sat.def.precession + sat.def.phase;
        const ellipsePulse = 1 + Math.sin(t * 0.37 + sat.def.phase) * sat.def.eccentricity;
        const local = new THREE.Vector3(
          Math.cos(angle) * sat.def.radiusX * ellipsePulse,
          0,
          Math.sin(angle) * sat.def.radiusZ * (2 - ellipsePulse),
        ).applyEuler(new THREE.Euler(
          sat.def.tiltX + Math.sin(precession) * 0.08,
          Math.cos(precession) * 0.06,
          sat.def.tiltZ + Math.sin(precession * 0.7) * 0.06,
        ));

        const verticalDrift = Math.sin(t * sat.def.verticalSpeed + sat.def.phase) * sat.def.verticalAmp;

        const orbitY = ORBIT_CENTER.y + sat.def.yOffset + local.y + verticalDrift;
        sat.pivot.position.set(
          ORBIT_CENTER.x + local.x,
          Math.max(0.34, orbitY),
          ORBIT_CENTER.z + local.z,
        );

        // Billboard hacia la cámara. `lookAt` orienta el -Z del objeto al
        // target, y los GLB en /models/planets vienen con la cara en el
        // -Z nativo (convención Three.js) — o sea, lookAt alcanza. Antes
        // teníamos un `rotateY(Math.PI)` acá que asumía forward=+Z y
        // dejaba la nuca al viewer ("otra vez los pusiste mirando al
        // revés" — Santi). Lo sacamos.
        const camLocal = sat.pivot.worldToLocal(camera.position.clone());
        sat.visual.lookAt(camLocal);

        const frontness = THREE.MathUtils.clamp((local.z + sat.def.radiusZ) / (sat.def.radiusZ * 2), 0, 1);
        const scaleMul = THREE.MathUtils.lerp(0.86, 1.0, frontness);
        sat.pivot.scale.setScalar(scaleMul);
        sat.materialTargets.forEach((mat) => {
          // Piso subido de 0.62 → 0.85 (y techo 0.9 → 1.0). Antes se leían
          // "fantasmagóricas" en desktop, al punto que Santi no las veía.
          // Con el busto fondo-pink/chocolate, 0.62 las hacía casi invisibles
          // en el back-half. Ahora son claramente leíbles aunque el z-buffer
          // las siga ocluyendo detrás del busto.
          mat.opacity = THREE.MathUtils.lerp(0.85, 1.0, frontness);
        });
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // ─────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────
    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      io.disconnect();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          const disposeMat = (m: THREE.Material) => {
            const pbr = m as THREE.MeshStandardMaterial;
            pbr.map?.dispose();
            pbr.normalMap?.dispose();
            pbr.roughnessMap?.dispose();
            pbr.metalnessMap?.dispose();
            pbr.aoMap?.dispose();
            pbr.dispose();
          };
          if (Array.isArray(mat)) mat.forEach(disposeMat);
          else if (mat) disposeMat(mat);
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [src, lookAtYawMax, lookAtPitchMax, yOffsetRatio, disableRandomGestures, disablePlanets, disableBlink, breathAmpScale, cameraZ, onReady, onError]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: !loaded && !errored
          ? `radial-gradient(ellipse at 50% 45%, ${TOKENS.bgDeep} 0%, transparent 70%)`
          : 'transparent',
        ...style,
      }}
      aria-label="Cabeza 3D de Santi Balosky — clic para saludar"
      role="img"
    >
      {errored && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: TOKENS.textDim, fontSize: 12,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          letterSpacing: 2, textTransform: 'uppercase',
        }}>
          · modelo no disponible ·
        </div>
      )}
    </div>
  );
}
