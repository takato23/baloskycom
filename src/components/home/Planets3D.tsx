import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Planets3D — las 6 caras/cabezas 3D que flotan en órbita alrededor de
 * la cabeza del busto.
 *
 * Historia del componente:
 * 1. Primera versión: 4 esferas planas color-pickeadas. "hay unas bolas
 *    flotando" (Santi). Eran placeholders.
 * 2. Segunda: 6 GLBs de Meshy en una ELIPSE 2D (plano XY, z≈0.1). Mejor
 *    porque se leían como caras, pero "las 3 del frente me atraviesan"
 *    (Santi) — por estar en el mismo plano 2D que el busto, colisionaban
 *    visualmente en la silueta. Además 3 de ellas aparecían siempre a la
 *    altura del torso porque la elipse era chata y centrada bajo.
 * 3. Tercera (esta): ÓRBITA 3D REAL — anillo inclinado alrededor de la
 *    cabeza, con Z real. Cuando una cara pasa por ATRÁS del busto (z<0)
 *    se renderiza en un canvas "back" que va DETRÁS del busto en el
 *    stacking context; cuando pasa por adelante (z≥0), se renderiza en
 *    un canvas "front" por encima. Así el busto naturalmente la oculta
 *    cuando le toca pasar por detrás. PerspectiveCamera da parallax de
 *    tamaño (las del fondo se ven más chicas).
 *
 * Arquitectura de capas (dentro de .rdz-stage, isolation: isolate):
 *   ├─ .rdz-stage-arch          z-index: 0  (arco blanco detrás)
 *   ├─ Planets3D canvas "back"  z-index: 1  ← caras con z<0
 *   ├─ .rdz-head-wrap (busto)   z-index: 2  (Head3D canvas)
 *   └─ Planets3D canvas "front" z-index: 4  ← caras con z≥0
 *
 * Orientación: los GLB que estamos usando vienen exportados con la cara
 * apuntando a +Z (o sea, ya de frente al viewer en rotation=0). Así que
 * el default es `rotation.y = 0`. Si algún modelo concreto viene girado,
 * se puede override con `yRot` en su `PlanetDef`. Como la cámara es fija
 * y está en +Z, una rotación estática alcanza — no hace falta lookAt
 * dinámico per-frame.
 *
 * Historia: antes el default era `Math.PI` (180°) porque asumíamos que
 * Meshy exportaba con forward=-Z. Resultado: todas las cabezas mostraban
 * la nuca al viewer. Santi lo llamó — "TODOS están giradas". Fix: default
 * a 0 y se deja `yRot` como override per-modelo por si alguno viene al
 * revés.
 *
 * Perf: IO + visibilitychange pausan el RAF; reduced-motion → estático.
 */

type PlanetDef = {
  url: string;
  baseAngle: number;   // rad — posición inicial en el anillo (en su plano)
  orbitSpeed: number;  // rad/seg — velocidad angular de la órbita
  scale: number;       // tamaño final (unidades world)
  bobAmp: number;      // amplitud vertical extra
  bobSpeed: number;    // freq del bob
  phase: number;       // desfase para que no se muevan sincronizadas
  yRot?: number;       // override per-modelo — default Math.PI
};

// ─── Geometría del anillo ───
// Pulido abril 2026: pequeños ajustes de composición.
//  · ORBIT_CENTER_Y 0.70 → 0.66 — el anillo baja un pelo para rodear
//    mejor la cabeza y tocar los hombros, en vez de flotar apenas encima.
//  · ORBIT_RADIUS 1.05 → 1.10 — abrimos el anillo para que los satélites
//    respiren más alrededor del busto (y ahora que el stage es 5:6 hay
//    margen horizontal para eso).
//  · ORBIT_TILT_X -0.32 → -0.26 — tilt más suave, lee menos "anillo de
//    Saturno" y más "halo en perspectiva". Integración más orgánica
//    con el busto.
// Pulido iteración abril 2026 (feedback: "orbitando todo mal, cabezas
// gigantes y cortadas por el borde"):
//  · ORBIT_CENTER_Y 0.66 → 0.50 — centra el anillo en la altura de la
//    cara del busto, en vez de en la frente. Así los satélites de
//    adelante/atrás caen en la línea de hombros/cabeza (lectura de
//    halo) en lugar de flotar sobre la cabeza y salirse del frame.
//  · ORBIT_RADIUS 1.10 → 0.95 — cierra el anillo para que no se corten
//    contra los bordes del stage (ratio 5:6 vertical).
//  · ORBIT_TILT_X -0.26 → -0.22 — tilt apenas más plano para integrar
//    mejor con el nuevo centro bajo.
const ORBIT_CENTER_Y = 0.50;
const ORBIT_RADIUS = 0.95;
const ORBIT_TILT_X = -0.22;

// Factor de "achatado" del anillo en Z. Subimos 0.45 → 0.62 para que
// las caras de atrás (z<0) queden más lejos del busto y sean bien
// ocultadas, en vez de quedar casi en el mismo plano y asomar por
// los costados (problema previo).
const ORBIT_DEPTH = 0.62;

// ─── Cámara ───
// FOV 32 + camZ 5.0 — perspectiva aún más comprimida. Mantiene todas
// las cabezas con tamaños parejos (parallax ~15%) y da margen
// vertical para el nuevo anillo más chico.
const CAMERA_FOV = 32;
const CAMERA_Z = 5.0;
const CAMERA_Y = 0.30;

const PLANETS: PlanetDef[] = [
  // 6 caras a 60° entre sí. Todas giran en el mismo sentido.
  //
  // Orientación (yRot): los 6 GLB vienen de Meshy con orientaciones
  // inconsistentes entre sí — algunos exportan con forward=+Z (cara al
  // viewer en rotation=0) y otros con forward=-Z (nuca al viewer).
  // Santi reportó: "hay algunas dadas vueltas y otras para el otro
  // lado". Solución: yRot explícito per-modelo, alternando 0 y PI
  // como primera apuesta. Si alguna queda al revés, se flipa su yRot
  // individualmente (0 ↔ Math.PI) sin tocar las demás.
  //
  // Escalas: bajadas a 0.0825 — 45% más chicas que la versión 0.15.
  // tamaño del busto (lectura: "cabezas gigantes"). Con este valor y
  // ORBIT_RADIUS 0.95, cada satélite ocupa ~1/3 del busto — proporción
  // de "seguidor" vs "protagonista" clara. Todas iguales = sin
  // variación de parallax perceptible.
  { url: '/models/planets/planet-01.glb', baseAngle: Math.PI * 0.00, orbitSpeed: 0.070, scale: 0.0825, bobAmp: 0.020, bobSpeed: 0.75, phase: 0.0, yRot: 0 },
  { url: '/models/planets/planet-02.glb', baseAngle: Math.PI * 0.33, orbitSpeed: 0.078, scale: 0.0825, bobAmp: 0.025, bobSpeed: 1.05, phase: 1.1, yRot: Math.PI },
  { url: '/models/planets/planet-03.glb', baseAngle: Math.PI * 0.66, orbitSpeed: 0.065, scale: 0.0825, bobAmp: 0.020, bobSpeed: 1.30, phase: 2.3, yRot: 0 },
  { url: '/models/planets/planet-04.glb', baseAngle: Math.PI * 1.00, orbitSpeed: 0.072, scale: 0.0825, bobAmp: 0.025, bobSpeed: 0.95, phase: 3.7, yRot: Math.PI },
  { url: '/models/planets/planet-05.glb', baseAngle: Math.PI * 1.33, orbitSpeed: 0.080, scale: 0.0825, bobAmp: 0.020, bobSpeed: 0.85, phase: 4.9, yRot: 0 },
  { url: '/models/planets/planet-06.glb', baseAngle: Math.PI * 1.66, orbitSpeed: 0.068, scale: 0.0825, bobAmp: 0.025, bobSpeed: 1.10, phase: 5.6, yRot: Math.PI },
];

export default function Planets3D() {
  const backRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const backEl = backRef.current;
    const frontEl = frontRef.current;
    if (!backEl || !frontEl) return;

    // ─── Cámara COMPARTIDA entre las dos escenas ───
    // Ambos canvas rendean con la misma cámara, así el punto de vista
    // es coherente entre las caras que están adelante y las que están
    // detrás del busto.
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 20);
    camera.position.set(0, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, CAMERA_Y - 0.1, 0);

    // ─── Dos scenes separadas: back y front ───
    const backScene = new THREE.Scene();
    const frontScene = new THREE.Scene();

    const addLights = (scene: THREE.Scene) => {
      const hemi = new THREE.HemisphereLight(0xfff4e6, 0xa08070, 0.85);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(2, 3, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffc8a0, 0.45);
      rim.position.set(-3, 1, 2);
      scene.add(rim);
    };
    addLights(backScene);
    addLights(frontScene);

    // ─── Dos renderers (uno por canvas) ───
    const mkRenderer = (parent: HTMLDivElement) => {
      const r = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setClearColor(0x000000, 0);
      parent.appendChild(r.domElement);
      return r;
    };
    const backRenderer = mkRenderer(backEl);
    const frontRenderer = mkRenderer(frontEl);

    // ─── Sizing ───
    // Los dos canvas deben tener exactamente el mismo tamaño y aspect
    // ratio — si no, las posiciones world no matchean visualmente.
    const resize = () => {
      const rect = backEl.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      backRenderer.setSize(w, h, false);
      frontRenderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(backEl);

    // ─── Estado de cada planeta ───
    type Entry = {
      obj: THREE.Group;
      def: PlanetDef;
      // Dónde está ahora: 'back' (en backScene) o 'front' (en frontScene).
      layer: 'back' | 'front';
    };
    const planetGroups: Entry[] = [];

    // ─── Helper: posición 3D en el anillo tilteado ───
    // El anillo base está en el plano XZ (horizontal). Se rota alrededor
    // del eje X por ORBIT_TILT_X para que la mitad "de atrás" suba y la
    // "de adelante" baje (lectura de anillo en perspectiva).
    const sinTilt = Math.sin(ORBIT_TILT_X);
    const cosTilt = Math.cos(ORBIT_TILT_X);
    const positionFor = (def: PlanetDef, t: number) => {
      const angle = def.baseAngle + t * def.orbitSpeed;
      // Punto en el plano XZ del anillo. El X usa el radio completo
      // (el anillo sigue igual de ancho visualmente), pero el Z se
      // multiplica por ORBIT_DEPTH para aplanarlo y reducir parallax.
      const localX = Math.cos(angle) * ORBIT_RADIUS;
      const localZ = Math.sin(angle) * ORBIT_RADIUS * ORBIT_DEPTH;
      // Rotación alrededor de X: (x, y, z) → (x, y*cos - z*sin, y*sin + z*cos)
      // y local = 0 → después del tilt: y = -localZ*sin, z = localZ*cos.
      const yAfter = -localZ * sinTilt;
      const zAfter = localZ * cosTilt;
      // Bobbing vertical pequeño, por-cara, para que no todas queden
      // exactas en el anillo matemático.
      const bobY = Math.sin(t * def.bobSpeed + def.phase) * def.bobAmp;
      return {
        x: localX,
        y: yAfter + ORBIT_CENTER_Y + bobY,
        z: zAfter,
      };
    };

    // ─── Load planets ───
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    PLANETS.forEach((def) => {
      loader.load(
        def.url,
        (gltf) => {
          const model = gltf.scene;
          // Auto-center + normalizado al bounding box unitario.
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const sizeVec = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
          model.position.sub(center);

          const norm = new THREE.Group();
          norm.add(model);
          norm.scale.setScalar((def.scale * 2) / maxDim);

          // Rotación fija hacia la cámara. Los GLB en /models/planets
          // vienen con la cara mirando a +Z (al viewer) en rotation=0,
          // así que el default es 0. `yRot` queda como override per-
          // modelo para el caso en que alguno venga rotado al revés.
          norm.rotation.set(0, def.yRot ?? 0, 0);

          // Posición inicial + decidir layer (back/front) por el signo
          // de Z. Así no aparecen todas en el mismo plano al entrar.
          const p0 = positionFor(def, 0);
          norm.position.set(p0.x, p0.y, p0.z);

          const layer: 'back' | 'front' = p0.z >= 0 ? 'front' : 'back';
          (layer === 'front' ? frontScene : backScene).add(norm);

          planetGroups.push({ obj: norm, def, layer });
        },
        undefined,
        (err) => {
          console.warn('[Planets3D] no se cargó', def.url, err);
        },
      );
    });

    // ─── Animate ───
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const start = performance.now();

    const renderBoth = () => {
      backRenderer.render(backScene, camera);
      frontRenderer.render(frontScene, camera);
    };

    const tick = () => {
      if (!visible || !pageVisible || reducedMotion) {
        raf = 0;
        renderBoth();
        return;
      }
      const t = (performance.now() - start) / 1000;
      planetGroups.forEach((entry) => {
        const { x, y, z } = positionFor(entry.def, t);
        entry.obj.position.set(x, y, z);
        // Switch scene si cruzó el plano z=0 (el plano del busto).
        const shouldBeFront = z >= 0;
        const isFront = entry.layer === 'front';
        if (shouldBeFront && !isFront) {
          backScene.remove(entry.obj);
          frontScene.add(entry.obj);
          entry.layer = 'front';
        } else if (!shouldBeFront && isFront) {
          frontScene.remove(entry.obj);
          backScene.add(entry.obj);
          entry.layer = 'back';
        }
      });
      renderBoth();
      raf = requestAnimationFrame(tick);
    };

    const resume = () => {
      if (!raf && visible && pageVisible && !reducedMotion) {
        raf = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) resume();
        });
      },
      { threshold: 0 },
    );
    io.observe(backEl);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) resume();
    };
    document.addEventListener('visibilitychange', onVisibility);

    renderBoth();
    if (!reducedMotion) raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      planetGroups.forEach(({ obj, layer }) => {
        (layer === 'front' ? frontScene : backScene).remove(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            const mat = child.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
      });
      backRenderer.dispose();
      frontRenderer.dispose();
      backRenderer.domElement.parentElement?.removeChild(backRenderer.domElement);
      frontRenderer.domElement.parentElement?.removeChild(frontRenderer.domElement);
    };
  }, [reducedMotion]);

  // Dos divs absolute-positioned que llenan el stage. Los z-index se
  // eligen para intercalarse con .rdz-head-wrap (z-index 2):
  //   · back:  z-index 1 → detrás del busto
  //   · front: z-index 4 → delante del busto
  return (
    <>
      <div
        ref={backRef}
        aria-hidden="true"
        className="rdz-planets-back"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        ref={frontRef}
        aria-hidden="true"
        className="rdz-planets-front"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
    </>
  );
}
