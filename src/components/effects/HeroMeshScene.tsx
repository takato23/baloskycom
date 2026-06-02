/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

/**
 * HeroMeshScene — carga un .ply con color por vértice (típico del output
 * de Luma Genie o de cualquier pipeline que pase por Open3D) y lo
 * renderiza como mesh rotable con la misma interacción que Hero3DScene
 * (paralaje mouse/tilt + tilt base isométrico).
 *
 * Por qué PLY y no GLB:
 * - Luma te devuelve directo PLY con color por vértice (sin UV/textura),
 *   así que saltarnos la conversión a GLTF ahorra un paso.
 * - Con `vertexColors: true` en un MeshBasicMaterial alcanza — no hace
 *   falta lighting. El scan ya viene con los colores horneados.
 *
 * Tuning:
 * - El scan crudo de Luma es 80MB+ (1.5M verts). Usar
 *   scripts/_decimate-luma-ply.mjs primero para dejarlo en ~1MB.
 */

interface HeroMeshSceneProps {
  /** Path al .ply (con color por vértice idealmente). */
  src: string;
  /** 0..1 — fuerza del paralaje mouse/tilt. */
  parallax?: number;
  /** Grados de tilt base "isométrico". 0 = frente. */
  tilt?: number;
  /** Factor de zoom — >1 acerca, <1 aleja. */
  zoom?: number;
  /** Auto-rotación (rad/seg). 0 = parado. */
  autoRotate?: number;
  /** Mostrar los vértices como puntitos en vez de caras. */
  pointMode?: boolean;
  /** Tamaño del punto en pointMode (px). */
  pointSize?: number;
  /** Exposición / gamma del color del vértice. 1 = directo. */
  exposure?: number;
  /** Color del fondo. */
  background?: string;
  /** Clase CSS del wrapper — debe tener width/height. */
  className?: string;
  /** Callback cuando termina de cargar (útil para quitar spinner). */
  onLoaded?: (stats: { vertices: number; faces: number }) => void;
}

interface MeshSceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  group: THREE.Group;
  mesh: THREE.Mesh | THREE.Points | null;
  targetMouse: THREE.Vector2;
  currentMouse: THREE.Vector2;
  tiltRad: number;
  parallax: number;
  autoRotate: number;
  baseY: number; // y-rotation base (para auto-rotate acumulativa)
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

export default function HeroMeshScene({
  src,
  parallax = 0.6,
  tilt = 3,
  zoom = 1,
  autoRotate = 0,
  pointMode = false,
  pointSize = 2,
  exposure = 1,
  background = '#0a0908',
  className,
  onLoaded,
}: HeroMeshSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<MeshSceneState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Setup único por `src` y `pointMode` (cambiar mesh↔points recrea).
  // displacement/parallax/tilt/zoom se propagan por ref en el segundo effect.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 500);
    camera.position.set(0, 0, 3);

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

    // Grupo contenedor — nos deja rotar el scan independientemente
    // del centrado en el origen.
    const group = new THREE.Group();
    scene.add(group);

    const state: MeshSceneState = {
      scene,
      camera,
      renderer,
      group,
      mesh: null,
      targetMouse: new THREE.Vector2(0, 0),
      currentMouse: new THREE.Vector2(0, 0),
      tiltRad: THREE.MathUtils.degToRad(tilt),
      parallax,
      autoRotate,
      baseY: 0,
    };
    stateRef.current = state;

    // ── Loader ──
    setLoading(true);
    setErrored(null);
    const loader = new PLYLoader();
    loader.load(
      src,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        // Escalar a tamaño canónico: el lado mayor del AABB → 2.4 unidades,
        // así encaja bien con la cámara a z=3.
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxSide = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.4 / maxSide;
        geometry.scale(scale, scale, scale);

        // PLY de Open3D viene sin normales. Si hay caras, calcularlas
        // en fragment sería caro — mejor precomputar acá (una vez).
        if (geometry.index && !geometry.getAttribute('normal')) {
          geometry.computeVertexNormals();
        }

        const hasColor = !!geometry.getAttribute('color');
        let obj: THREE.Mesh | THREE.Points;

        if (pointMode || !geometry.index) {
          // Sin índice → sólo nube de puntos
          const mat = new THREE.PointsMaterial({
            vertexColors: hasColor,
            color: hasColor ? 0xffffff : 0xffffff,
            size: pointSize,
            sizeAttenuation: false,
          });
          obj = new THREE.Points(geometry, mat);
        } else {
          // Basic material con color por vértice — el scan ya trae
          // iluminación horneada del capture original, sumarle lights
          // sólo ensucia.
          const mat = new THREE.MeshBasicMaterial({
            vertexColors: hasColor,
            color: hasColor ? 0xffffff : 0xbbbbbb,
            side: THREE.DoubleSide,
            // Boost contrast/exposure en shader hack:
            toneMapped: false,
          });
          obj = new THREE.Mesh(geometry, mat);
        }

        group.add(obj);
        state.mesh = obj;
        setLoading(false);

        const stats = {
          vertices: geometry.getAttribute('position').count,
          faces: geometry.index ? geometry.index.count / 3 : 0,
        };
        onLoaded?.(stats);

        // forzar un frame al toque (antes de que arranque el rAF)
        renderer.render(scene, camera);
      },
      undefined, // onProgress — si querés mostrar % usalo
      (err) => {
        console.error('[HeroMeshScene] failed to load PLY', err);
        setErrored(String(err));
        setLoading(false);
      },
    );

    // ── Interacción ──
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.targetMouse.set(clamp1(x), clamp1(y));
    };
    const onMouseLeave = () => {
      state.targetMouse.set(0, 0);
    };
    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mouseleave', onMouseLeave);

    // deviceorientation para mobile — mismo approach que Hero3DScene.
    const onDeviceOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const x = clamp1((e.gamma || 0) / 45);
      const y = clamp1(((e.beta || 0) - 45) / 45);
      state.targetMouse.set(x, -y);
    };
    window.addEventListener('deviceorientation', onDeviceOrient);

    // ── Render loop ──
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      state.currentMouse.lerp(state.targetMouse, 0.08);
      state.baseY += state.autoRotate * dt;

      const baseX = state.tiltRad * 0.45;
      const baseY = -state.tiltRad * 0.30 + state.baseY;
      group.rotation.x = baseX - state.currentMouse.y * 0.18 * state.parallax;
      group.rotation.y = baseY + state.currentMouse.x * 0.28 * state.parallax;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ── Resize ──
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('deviceorientation', onDeviceOrient);
      if (state.mesh) {
        state.mesh.geometry.dispose();
        const mat = state.mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, pointMode]);

  // Props que pueden cambiar en caliente sin recrear la scene.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.parallax = parallax;
    s.tiltRad = THREE.MathUtils.degToRad(tilt);
    s.autoRotate = autoRotate;
    s.camera.position.z = 3 / Math.max(0.2, zoom);
    s.camera.updateProjectionMatrix();
  }, [parallax, tilt, autoRotate, zoom]);

  // Actualizar pointSize en caliente si es Points.
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.mesh) return;
    if (s.mesh instanceof THREE.Points) {
      (s.mesh.material as THREE.PointsMaterial).size = pointSize;
    }
  }, [pointSize]);

  // Exposure: ajusta un scaling global del color del vértice
  // (multiplica el atributo color del geometry). Para previews alcanza.
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.mesh) return;
    const mat = s.mesh.material as THREE.MeshBasicMaterial | THREE.PointsMaterial;
    // Hack: tintamos el color base, así se multiplica por el vertexColor.
    const c = Math.max(0, Math.min(2, exposure));
    (mat.color as THREE.Color).setScalar(c);
    mat.needsUpdate = true;
  }, [exposure]);

  return (
    <div ref={mountRef} className={className} style={{ background, position: 'relative' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-[11px] font-mono tracking-wider uppercase pointer-events-none">
          cargando mesh…
        </div>
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center text-red-300/80 text-[11px] font-mono tracking-wider uppercase pointer-events-none px-8 text-center">
          error cargando mesh<br />
          <span className="opacity-60">{errored.slice(0, 80)}</span>
        </div>
      )}
    </div>
  );
}
