/**
 * Panorama360Viewer — visor 360° equirectangular con soporte de giroscopio.
 *
 * Monta una esfera grande (BackSide) mapeada con la imagen equirectangular y
 * permite mirarla con:
 *   - Arrastre (mouse/touch)
 *   - Gesto de pinch para zoom (toca dos dedos)
 *   - Rueda del mouse para zoom en desktop
 *   - Giroscopio del celular (botón "Activar sensores" — requiere permiso en
 *     iOS 13+). Cuando está activo, el arrastre agrega un offset manual sobre
 *     la orientación del dispositivo para poder "mirar alrededor" sin girar
 *     físicamente 360°.
 *   - Botón de pantalla completa (requestFullscreen) — clave en celular.
 *
 * Carga perezosa: renderiza un spinner hasta que la textura se descarga. Se
 * encarga solo de la limpieza (geometry/material/texture/renderer dispose)
 * así que se puede montar/desmontar dentro de modales sin leaks de GPU.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Compass, Maximize2, Minimize2, Loader2 } from 'lucide-react';

type Props = {
  imageUrl: string;
  /** Muestra un CTA superpuesto con instrucciones en la primera carga. */
  showHint?: boolean;
  className?: string;
};

// DeviceOrientationEvent.requestPermission sólo existe en iOS 13+.
type DeviceOrientationEventIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const MIN_FOV = 35;
const MAX_FOV = 95;
const INITIAL_FOV = 75;

export default function Panorama360Viewer({ imageUrl, showHint = true, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const geometryRef = useRef<THREE.SphereGeometry | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const frameRef = useRef<number>(0);

  // Orientación "manual" (arrastre) — spherical coords en radianes.
  // lon 0 mira hacia -Z; lat positivo mira arriba.
  const lonRef = useRef(0);
  const latRef = useRef(0);
  // Offset del giroscopio: usuarios pueden arrastrar encima del gyro.
  const gyroOffsetLonRef = useRef(0);
  const gyroOffsetLatRef = useRef(0);

  // Gyro state (device orientation integration).
  const gyroEnabledRef = useRef(false);
  const gyroQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const screenOrientationRef = useRef(0); // degrees

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gyroState, setGyroState] = useState<'idle' | 'on' | 'denied' | 'unsupported'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintVisible, setHintVisible] = useState(showHint);

  /* ---------------------------------------------------------------------- */
  /*  Setup + cleanup                                                        */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      INITIAL_FOV,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1100,
    );
    camera.position.set(0, 0, 0.01);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.userSelect = 'none';
    renderer.domElement.draggable = false;
    rendererRef.current = renderer;

    const geometry = new THREE.SphereGeometry(500, 64, 40);
    // Invertir la esfera en X para no ver la textura espejada desde adentro.
    geometry.scale(-1, 1, 1);
    geometryRef.current = geometry;

    const material = new THREE.MeshBasicMaterial();
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Cargar la textura async — mantener loading=true hasta que esté lista.
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      imageUrl,
      (tex) => {
        // Modo equirectangular: three.js mapea bien con MeshBasicMaterial + map.
        // Color space sRGB para que el tono sea parecido al archivo original.
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        material.map = tex;
        material.needsUpdate = true;
        textureRef.current = tex;
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[Panorama360Viewer] texture load failed', err);
        setLoadError('No pude cargar la imagen 360°. Revisá que sea un JPG/PNG equirectangular.');
        setLoading(false);
      },
    );

    /* Animation loop ------------------------------------------------------ */
    const render = () => {
      frameRef.current = requestAnimationFrame(render);
      const cam = cameraRef.current;
      if (!cam) return;

      if (gyroEnabledRef.current && gyroQuaternionRef.current) {
        // Base quaternion del dispositivo + offset manual por arrastre.
        cam.quaternion.copy(gyroQuaternionRef.current);
        const offsetEuler = new THREE.Euler(
          gyroOffsetLatRef.current,
          gyroOffsetLonRef.current,
          0,
          'YXZ',
        );
        const offsetQuat = new THREE.Quaternion().setFromEuler(offsetEuler);
        cam.quaternion.multiply(offsetQuat);
      } else {
        // Cámara 100% controlada por drag.
        latRef.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, latRef.current));
        const phi = Math.PI / 2 - latRef.current;
        const theta = lonRef.current;
        const target = new THREE.Vector3(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        );
        cam.lookAt(target);
      }

      renderer.render(scene, cam);
    };
    render();

    /* Resize handler ------------------------------------------------------ */
    const handleResize = () => {
      const c = containerRef.current;
      const r = rendererRef.current;
      const cam = cameraRef.current;
      if (!c || !r || !cam) return;
      const w = c.clientWidth;
      const h = Math.max(1, c.clientHeight);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      r.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Screen orientation tracking (para gyro math).
    const handleScreenOrientation = () => {
      screenOrientationRef.current = (window.screen?.orientation?.angle ?? (window as any).orientation ?? 0) as number;
    };
    handleScreenOrientation();
    window.addEventListener('orientationchange', handleScreenOrientation);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleScreenOrientation);
      try {
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
      } catch { /* noop */ }
      geometry.dispose();
      material.dispose();
      textureRef.current?.dispose();
      renderer.dispose();
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [imageUrl]);

  /* ---------------------------------------------------------------------- */
  /*  Pointer drag + pinch + wheel                                          */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    const canvas = renderer?.domElement;
    if (!container || !canvas) return;

    // Pointer tracking — soporta mouse, touch y pen.
    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;

    const applyDragDelta = (dx: number, dy: number) => {
      const cam = cameraRef.current;
      if (!cam) return;
      // Sensibilidad dependiente de FOV: a menor FOV, pan más preciso.
      const fovFactor = (cam.fov / 180) * Math.PI;
      const speed = fovFactor / Math.max(1, canvas.clientHeight);
      if (gyroEnabledRef.current) {
        gyroOffsetLonRef.current -= dx * speed;
        gyroOffsetLatRef.current -= dy * speed;
      } else {
        lonRef.current -= dx * speed;
        latRef.current += dy * speed;
      }
      setHintVisible(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        // Pinch zoom — dos dedos.
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist > 0) {
          const delta = dist - lastPinchDist;
          adjustFov(-delta * 0.1);
        }
        lastPinchDist = dist;
        return;
      }

      if (pointers.size === 1) {
        applyDragDelta(e.clientX - prev.x, e.clientY - prev.y);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinchDist = 0;
      if (pointers.size === 0) canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      adjustFov(e.deltaY * 0.05);
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('dragstart', onContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel as EventListener);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('dragstart', onContextMenu);
    };
  }, []);

  const adjustFov = useCallback((delta: number) => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, cam.fov + delta));
    cam.updateProjectionMatrix();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Device orientation (giroscopio)                                        */
  /* ---------------------------------------------------------------------- */
  const startGyro = useCallback(async () => {
    const DOE = (typeof window !== 'undefined' ? (DeviceOrientationEvent as DeviceOrientationEventIOS) : null);
    if (!DOE) { setGyroState('unsupported'); return; }

    if (typeof DOE.requestPermission === 'function') {
      try {
        const resp = await DOE.requestPermission();
        if (resp !== 'granted') { setGyroState('denied'); return; }
      } catch (e) {
        console.warn('[Panorama360Viewer] gyro permission failed', e);
        setGyroState('denied');
        return;
      }
    }

    // Tres rotaciones estándar (see THREE DeviceOrientationControls):
    //   zee: rotación de pantalla (alpha)
    //   q1: corrige ejes (cámara mira -Z, gyro mira +Z)
    const zee = new THREE.Vector3(0, 0, 1);
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
    const euler = new THREE.Euler();

    const onOrientation = (ev: DeviceOrientationEvent) => {
      if (ev.alpha == null || ev.beta == null || ev.gamma == null) return;
      const alpha = THREE.MathUtils.degToRad(ev.alpha);
      const beta  = THREE.MathUtils.degToRad(ev.beta);
      const gamma = THREE.MathUtils.degToRad(ev.gamma);
      const orient = THREE.MathUtils.degToRad(screenOrientationRef.current || 0);

      euler.set(beta, alpha, -gamma, 'YXZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);
      quat.multiply(q1);
      quat.multiply(new THREE.Quaternion().setFromAxisAngle(zee, -orient));
      gyroQuaternionRef.current = quat;
    };

    window.addEventListener('deviceorientation', onOrientation, true);
    gyroEnabledRef.current = true;
    // Reset manual offset al activar (evita saltos).
    gyroOffsetLonRef.current = 0;
    gyroOffsetLatRef.current = 0;
    setGyroState('on');
    setHintVisible(false);

    // Guardar cleanup — ejecutamos al apagar.
    (startGyro as any)._cleanup = () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      gyroEnabledRef.current = false;
      gyroQuaternionRef.current = null;
    };
  }, []);

  const stopGyro = useCallback(() => {
    const cleanup = (startGyro as any)._cleanup as (() => void) | undefined;
    if (cleanup) cleanup();
    setGyroState('idle');
  }, [startGyro]);

  useEffect(() => {
    return () => {
      const cleanup = (startGyro as any)._cleanup as (() => void) | undefined;
      if (cleanup) cleanup();
    };
  }, [startGyro]);

  /* ---------------------------------------------------------------------- */
  /*  Fullscreen                                                             */
  /* ---------------------------------------------------------------------- */
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn('[Panorama360Viewer] fullscreen toggle failed', e);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                 */
  /* ---------------------------------------------------------------------- */
  return (
    <div
      ref={containerRef}
      className={'relative w-full h-full bg-black overflow-hidden select-none ' + (className || '')}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Loading overlay */}
      {loading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none z-10">
          <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black/80 z-10">
          <p className="text-sm text-white/80 max-w-sm">{loadError}</p>
        </div>
      )}

      {/* First-time hint */}
      {hintVisible && !loading && !loadError && (
        <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+148px)] z-20 flex justify-center pointer-events-none sm:top-[calc(env(safe-area-inset-top,0px)+148px)]">
          <div className="max-w-[min(92vw,520px)] rounded-full border border-white/15 bg-black/55 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur sm:px-4">
            Arrastrá para mirar · pinch para zoom · activá sensores en mobile
          </div>
        </div>
      )}

      {/* Controles flotantes */}
      {!loadError && (
        <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+84px)] z-50 flex max-w-[calc(100%-24px)] flex-wrap justify-center gap-2 sm:inset-x-auto sm:right-6 sm:top-[calc(env(safe-area-inset-top,0px)+88px)] sm:justify-end">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/18 bg-black/70 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-colors hover:border-white/40 hover:bg-white hover:text-black"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Salir full' : 'Full screen'}</span>
          </button>
          <button
            type="button"
            onClick={gyroState === 'on' ? stopGyro : startGyro}
            aria-label="Activar giroscopio"
            disabled={gyroState === 'unsupported'}
            className={
              'inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-colors ' +
              (gyroState === 'on'
                ? 'bg-[var(--accent,#FA5D29)] border-[var(--accent,#FA5D29)] text-white'
                : gyroState === 'unsupported'
                  ? 'bg-black/35 border-white/10 text-white/35 cursor-not-allowed'
                  : 'bg-black/70 border-white/18 text-white hover:border-[var(--accent,#FA5D29)] hover:bg-[var(--accent,#FA5D29)]')
            }
          >
            <Compass className="w-4 h-4" />
            <span>{gyroState === 'on' ? 'Giro activo' : 'Giroscopio'}</span>
          </button>
        </div>
      )}

      {gyroState === 'denied' && (
        <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+146px)] z-50 mx-auto max-w-[300px] rounded-2xl border border-white/10 bg-black/75 px-3 py-2 text-center text-[11px] text-white/80 backdrop-blur-xl sm:left-auto sm:right-6 sm:mx-0 sm:top-[calc(env(safe-area-inset-top,0px)+150px)]">
          No diste permiso al sensor. Revisá los permisos del navegador y probá de nuevo.
        </div>
      )}
    </div>
  );
}
