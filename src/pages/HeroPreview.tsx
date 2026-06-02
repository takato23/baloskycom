import { useMemo, useRef, useState, useEffect } from 'react';
import Hero3DScene from '../components/effects/Hero3DScene';
import HeroMeshScene from '../components/effects/HeroMeshScene';

/**
 * /preview-hero — banco de pruebas aislado para afinar el "desenfoque
 * vidrioso" del video de Seedance antes de llevarlo al home real.
 *
 * Layout pensado como el hero real:
 *   - Video FULL-BLEED de fondo (ocupa todo el viewport en desktop).
 *   - Copy superpuesto arriba con gradient oscuro debajo para legibilidad.
 *   - Panel de controles cerrado por default — aparece con el botón flotante
 *     abajo a la derecha. Es compacto y se queda sobre el costado sin tapar
 *     la cara.
 *
 * Controles:
 *   - Dirección de la máscara (abajo→arriba | arriba→abajo | centro | sin)
 *     — la clave para el look "me blendeo en la oscuridad".
 *   - Blur, saturate, brightness, contrast (vidrio).
 *   - Mix-blend-mode (screen / multiply / overlay / ...).
 *   - Scale + offset X (encuadre).
 *   - Toggle scroll-tied playback (trick de Higgsfield).
 *   - Color de fondo.
 *
 * Esta página NO toca el hero de producción — es 100% aislada. Cuando los
 * parámetros queden definidos, pegamos el CSS generado en `HeroSection.tsx`.
 */

type BlendMode =
  | 'normal'
  | 'screen'
  | 'lighten'
  | 'multiply'
  | 'overlay'
  | 'soft-light'
  | 'hard-light';

type MaskDir = 'bottom-to-top' | 'top-to-bottom' | 'center' | 'none';

const VIDEO_SRC = '/uploads/videos/balosky-hero-ideas.mp4';
const POSTER_SRC = '/uploads/thumbs/balosky-hero-ideas-poster.jpg';
// Portrait neutro generado con Gemini — la cara que usamos como "input" para
// la escena 3D (vertex displacement) y como fallback para el mockup de orbes.
const PORTRAIT_SRC = '/uploads/thumbs/balosky-portrait-frente.png';
// Depth map derivado del portrait (pre-procesado con sharp: luminancia
// desaturada + blur fuerte + boost de contraste). Se usa si existe; si el
// usuario lo borra del input el componente cae al generador heurístico.
const PORTRAIT_DEPTH_SRC = '/uploads/thumbs/balosky-portrait-frente-depth.png';
// Mesh decimado del scan de Luma (Genie). Se genera con
// scripts/_decimate-luma-ply.mjs a partir del PLY crudo.
const LUMA_MESH_SRC = '/uploads/3d/balosky-luma-scan.ply';
// Loop único del hero — cabeza humeando + 4 bolitas visibles, ya
// loopeable (el usuario emparejó primer/último frame).
const HERO_LOOP_SRC = '/uploads/videos/balosky-hero-loop.mp4';

// Pulsadores que se superponen encima de las bolas bakeadas del video.
// Las coordenadas son % del contenedor del hero. Dos tunings por device
// porque en desktop el video (9:16) queda cover-center y el layout horizontal
// cambia la proyección de las bolas.
type LoopOrb = {
  id: string;
  label: string;
  href: string;
  color: string;
  xDesktop: string; yDesktop: string;
  xMobile: string;  yMobile: string;
  /** Clip "come-bola" específico — cuando el usuario tapea, se hace
   *  swap del video principal a este y se reproduce UNA vez. Si es null
   *  usa el fallback al loop (no hay clip todavía). */
  eatSrc: string | null;
};

const LOOP_ORBS_DEFAULT: LoopOrb[] = [
  { id: 'sonido',   label: 'multimedia', href: '/preview-multimedia',   color: '#F4B37E',
    xDesktop: '42%', yDesktop: '22%', xMobile: '15%', yMobile: '14%',
    eatSrc: '/uploads/videos/balosky-eat-sonido.mp4' },
  { id: 'cafecito', label: 'cafecito', href: '/#cafecito', color: '#F26FA6',
    xDesktop: '58%', yDesktop: '30%', xMobile: '84%', yMobile: '27%',
    eatSrc: '/uploads/videos/balosky-eat-cafecito.mp4' },
  { id: 'ojo',      label: 'ojo',      href: '/#ojo',      color: '#F8E3B8',
    xDesktop: '40%', yDesktop: '54%', xMobile: '10%', yMobile: '50%',
    eatSrc: '/uploads/videos/balosky-eat-ojo.mp4' },
  { id: 'mira',     label: 'mira',     href: '/#mira',     color: '#9FD9E0',
    xDesktop: '60%', yDesktop: '62%', xMobile: '86%', yMobile: '60%',
    eatSrc: '/uploads/videos/balosky-eat-mira.mp4' },
];

/* Presets para arrancar rápido — punto de partida que el usuario puede
 * ajustar desde ahí. El default "Vidrio suave" ahora usa bottom-to-top
 * (la cara arriba nítida, el cuerpo abajo se funde con la oscuridad). */
const PRESETS = {
  'Vidrio suave': {
    maskDir: 'bottom-to-top' as MaskDir,
    maskStart: 45,
    maskEnd: 95,
    blur: 0.4,
    saturate: 1.05,
    brightness: 1.0,
    contrast: 1.02,
    blend: 'screen' as BlendMode,
    bg: '#0a0908',
    scale: 1.0,
    offsetX: 0,
  },
  'Aparición espectral': {
    maskDir: 'bottom-to-top' as MaskDir,
    maskStart: 25,
    maskEnd: 85,
    blur: 1.2,
    saturate: 1.2,
    brightness: 1.05,
    contrast: 1.0,
    blend: 'screen' as BlendMode,
    bg: '#0a0908',
    scale: 1.05,
    offsetX: 0,
  },
  'Fondo claro': {
    maskDir: 'bottom-to-top' as MaskDir,
    maskStart: 50,
    maskEnd: 95,
    blur: 0.3,
    saturate: 1.0,
    brightness: 0.98,
    contrast: 1.0,
    blend: 'multiply' as BlendMode,
    bg: '#F3EFE6',
    scale: 1.0,
    offsetX: 0,
  },
  'Crudo (sin efecto)': {
    maskDir: 'none' as MaskDir,
    maskStart: 100,
    maskEnd: 100,
    blur: 0,
    saturate: 1,
    brightness: 1,
    contrast: 1,
    blend: 'normal' as BlendMode,
    bg: '#0a0908',
    scale: 1.0,
    offsetX: 0,
  },
} as const;

type PresetKey = keyof typeof PRESETS;

/* ---------------------------------------------------------------------------
 * Orbes — mockup HTML/CSS del estado "open" (cabeza abierta, orbes salen).
 * Son la propuesta de navegación. Cuando generemos el video final, estos
 * mismos orbes quedan como overlay clickeable encima del loop.
 *
 * Coordenadas: % del viewport, asumiendo que la cara queda centrada.
 * Los colores son pasteles que combinan con la paleta de Delirio.
 * Los labels son placeholders — el usuario va a querer ajustar nombres.
 * ------------------------------------------------------------------------ */
type Orb = {
  id: string;
  label: string;
  color: string;
  /** posición en % del viewport */
  x: string;
  y: string;
  /** delay de entrada para el stagger */
  delay: number;
};

/** Posiciones para desktop (16:9) y mobile (9:16). En desktop los orbes
 *  están MÁS SPREADED porque hay más aire horizontal; en mobile se
 *  apretaron alrededor de la cara. */
const ORBS_DESKTOP: Orb[] = [
  { id: 'sonido',   label: 'sonido',   color: '#FA5D29', x: '22%', y: '32%', delay: 0.0 },
  { id: 'cafecito', label: 'cafecito', color: '#E94B8A', x: '76%', y: '26%', delay: 0.15 },
  { id: 'ojo',      label: 'ojo',      color: '#F4D35E', x: '18%', y: '68%', delay: 0.3 },
  { id: 'cabeza',   label: 'cabeza',   color: '#7BBEC8', x: '80%', y: '62%', delay: 0.45 },
];

const ORBS_MOBILE: Orb[] = [
  { id: 'sonido',   label: 'sonido',   color: '#FA5D29', x: '18%', y: '38%', delay: 0.0 },
  { id: 'cafecito', label: 'cafecito', color: '#E94B8A', x: '82%', y: '34%', delay: 0.15 },
  { id: 'ojo',      label: 'ojo',      color: '#F4D35E', x: '16%', y: '72%', delay: 0.3 },
  { id: 'cabeza',   label: 'cabeza',   color: '#7BBEC8', x: '84%', y: '68%', delay: 0.45 },
];

/* Keyframes inyectadas como <style> dentro del componente. Inline para
 * no ensuciar delirio.css con cosas que son sólo del preview. */
const ORB_STYLES = `
@keyframes orb-breath {
  0%, 100% { transform: translate(-50%, -50%) scale(1);     filter: blur(0px);   }
  50%      { transform: translate(-50%, -50%) scale(1.06);  filter: blur(0.2px); }
}
@keyframes orb-enter {
  0%   { opacity: 0; transform: translate(-50%, calc(-50% + 60px)) scale(0.2); filter: blur(12px); }
  60%  { opacity: 1; filter: blur(2px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0px); }
}
@keyframes orb-ring-spin {
  0%   { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes smoke-rise {
  0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes dissolve-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
.orb {
  position: absolute;
  width: 180px;
  height: 180px;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  animation: orb-enter 1200ms cubic-bezier(.2,.9,.2,1) forwards, orb-breath 4.5s ease-in-out infinite 1200ms;
  text-decoration: none;
  color: inherit;
}
.orb .orb-aura {
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  filter: blur(30px);
  opacity: 0.55;
  mix-blend-mode: screen;
  transition: opacity 300ms ease, filter 300ms ease;
}
.orb .orb-disc {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  filter: blur(10px);
  opacity: 0.9;
  mix-blend-mode: screen;
  transition: opacity 300ms ease, filter 300ms ease;
}
.orb .orb-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0.35;
  animation: orb-ring-spin 12s linear infinite;
  transition: opacity 300ms ease;
}
.orb .orb-core {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  box-shadow: 0 0 24px currentColor, 0 0 70px currentColor, 0 0 120px currentColor;
  transition: transform 300ms ease;
}
.orb .orb-label {
  position: absolute;
  bottom: -8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.75;
  white-space: nowrap;
  transition: opacity 300ms ease, letter-spacing 300ms ease;
}
.orb:hover .orb-disc    { opacity: 1; filter: blur(10px); }
.orb:hover .orb-core    { transform: scale(1.15); }
.orb:hover .orb-label   { opacity: 1; letter-spacing: 0.3em; }
.face-smoke {
  animation: smoke-rise 900ms cubic-bezier(.2,.9,.2,1) forwards;
}

/* ─── Pulsadores del modo loop (encima de las bolas bakeadas). ─── */
@keyframes loop-ring-pulse {
  0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
  70%  { transform: translate(-50%, -50%) scale(1.6); opacity: 0;   }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0;   }
}
@keyframes loop-core-breath {
  0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.85; }
  50%      { transform: translate(-50%, -50%) scale(1.12); opacity: 1;    }
}
.loop-orb {
  position: absolute;
  width: var(--ring-size, 14vmin);
  height: var(--ring-size, 14vmin);
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  animation: loop-core-breath 3.4s ease-in-out infinite;
}
.loop-orb-ring,
.loop-orb-ring-2 {
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  box-shadow: 0 0 14px currentColor;
  animation: loop-ring-pulse 2.6s cubic-bezier(.2,.6,.3,1) infinite;
  pointer-events: none;
  mix-blend-mode: screen;
}
.loop-orb-ring-2 {
  animation-delay: 1.3s;
  opacity: 0.6;
}
.loop-orb-core {
  /* El "puntito" ahora es un halo soft — se embebe con el anillo y
     cubre el micro-jitter de las bolas del video (que respiran un cacho). */
  position: absolute;
  top: 50%; left: 50%;
  width: 62%; height: 62%;
  border-radius: 50%;
  background: radial-gradient(circle at center,
    currentColor 0%,
    currentColor 18%,
    transparent 70%);
  opacity: 0.55;
  filter: blur(6px);
  pointer-events: none;
  mix-blend-mode: screen;
  transform: translate(-50%, -50%);
  transition: opacity 240ms ease, filter 240ms ease;
}
.loop-orb-label {
  /* Pill semitransparente con backdrop-blur — siempre legible aunque
     atrás haya tela blanca, fondo oscuro, o cualquier mezcla. El text-shadow
     lo dejamos también como refuerzo por si el backdrop-filter no es soportado. */
  position: absolute;
  bottom: calc(-1 * var(--ring-size, 14vmin) * 0.12 - 18px);
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.85;
  white-space: nowrap;
  transition: opacity 200ms ease, letter-spacing 200ms ease, background 200ms ease;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(10, 9, 8, 0.45);
  backdrop-filter: blur(6px) saturate(1.1);
  -webkit-backdrop-filter: blur(6px) saturate(1.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  pointer-events: none;
}
.loop-orb:hover .loop-orb-label { opacity: 1; letter-spacing: 0.3em; }
.loop-orb:hover .loop-orb-core  { opacity: 0.85; filter: blur(10px); }
`;

/* Helper: arma la mask-image gradient según dirección.
 *   bottom-to-top → opaco arriba, transparente abajo (cuerpo se fusiona)
 *   top-to-bottom → opaco abajo, transparente arriba (cabeza se fusiona)
 *   center        → opaco en el medio, transparente en bordes
 *   none          → sin máscara (muestra todo)
 */
function buildMask(dir: MaskDir, start: number, end: number): string {
  if (dir === 'none') return 'none';
  if (dir === 'bottom-to-top') {
    return `linear-gradient(to bottom, #000 0%, #000 ${start}%, transparent ${end}%)`;
  }
  if (dir === 'top-to-bottom') {
    return `linear-gradient(to top, #000 0%, #000 ${start}%, transparent ${end}%)`;
  }
  // center → radial: transparente en los bordes
  return `radial-gradient(ellipse at center, #000 ${start}%, transparent ${end}%)`;
}

export default function HeroPreview() {
  const initial = PRESETS['Vidrio suave'];
  const [maskDir, setMaskDir] = useState<MaskDir>(initial.maskDir);
  const [maskStart, setMaskStart] = useState<number>(initial.maskStart);
  const [maskEnd, setMaskEnd] = useState<number>(initial.maskEnd);
  const [blur, setBlur] = useState<number>(initial.blur);
  const [saturate, setSaturate] = useState<number>(initial.saturate);
  const [brightness, setBrightness] = useState<number>(initial.brightness);
  const [contrast, setContrast] = useState<number>(initial.contrast);
  const [blend, setBlend] = useState<BlendMode>(initial.blend);
  const [bg, setBg] = useState<string>(initial.bg);
  const [scale, setScale] = useState<number>(initial.scale);
  const [offsetX, setOffsetX] = useState<number>(initial.offsetX);
  const [scrollTied, setScrollTied] = useState(false);
  const [scrollLength, setScrollLength] = useState(400); // % de viewport que dura el pin
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCopy, setShowCopy] = useState(true);
  const [scrollPct, setScrollPct] = useState(0); // 0..1 para el indicador visual
  const [mode, setMode] = useState<'classic' | 'orbs' | '3d' | 'mesh'>(() => {
    // Si viene ?mode=orbs en la URL arrancamos directo en orbs (para los amigos)
    if (typeof window === 'undefined') return 'classic';
    const m = new URLSearchParams(window.location.search).get('mode');
    if (m === 'orbs' || m === '3d' || m === 'mesh') return m;
    return 'classic';
  });
  const [orbsRevealed, setOrbsRevealed] = useState(false); // mockup: simula el "tap → reveal"
  const [device, setDevice] = useState<'desktop' | 'mobile'>('mobile'); // qué framing previsualizar

  // Modo presentación — oculta el panel lateral y el chip dev. Se prende
  // con ?demo=1 en la URL (para mandar links a amigos sin distraerlos)
  // o con el botón flotante. Persiste en query así si actualizan la página
  // sigue limpio.
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('demo') === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (demoMode) url.searchParams.set('demo', '1');
    else url.searchParams.delete('demo');
    // También guardo el mode actual así el link incluye qué modo mostrar
    if (mode !== 'classic') url.searchParams.set('mode', mode);
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url.toString());
  }, [demoMode, mode]);
  const [orbsImage, setOrbsImage] = useState<string>(PORTRAIT_SRC); // foto base del mockup, swappable
  // Modo "double-video" del flujo orbes: dos videos de Seedance encadenados.
  // - idleVideo: loopea en silencio (micro-motion mirando a cámara).
  // - transformVideo: one-shot que reproduce el humo + apertura cuando se
  //   dispara el reveal. Cuando termina, queda en su último frame.
  // Si están vacíos, el mode orbes cae al `<img>` estático de toda la vida.
  const [orbsIdleVideo, setOrbsIdleVideo] = useState<string>('/uploads/videos/balosky-hero-idle.mp4');
  const [orbsTransformVideo, setOrbsTransformVideo] = useState<string>('/uploads/videos/balosky-hero-transform.mp4');
  // openIdleVideo: loop que se pone en play cuando el transform termina.
  // Se genera a partir del último frame del transform (humo vivo) así el
  // hero abierto no queda congelado. Si está vacío, el transform keda
  // frizado en el último frame (comportamiento previo).
  const [orbsOpenIdleVideo, setOrbsOpenIdleVideo] = useState<string>('/uploads/videos/balosky-hero-open-idle.mp4');
  // Flag runtime: true cuando el transform llegó al final y deberíamos
  // mostrar el openIdle. Se resetea al cerrar.
  const [orbsTransformEnded, setOrbsTransformEnded] = useState(false);
  const openIdleVideoRef = useRef<HTMLVideoElement>(null);
  // % del transformVideo a partir del cual aparecen los orbes (cuando el
  // humo ya empezó a salir). 0..1. Ajustable desde el panel.
  const [orbsRevealPoint, setOrbsRevealPoint] = useState<number>(0.55);
  // Estado runtime: progreso del transformVideo 0..1, lo usamos para
  // disparar la entrada de los orbes según el revealPoint.
  const [orbsTransformProgress, setOrbsTransformProgress] = useState(0);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const transformVideoRef = useRef<HTMLVideoElement>(null);
  // Controles de la escena 3D — displacement / parallax / tilt / fade / depth map opcional.
  // El depth src vacío dispara el generador heurístico adentro del componente.
  const [scene3dPhoto, setScene3dPhoto] = useState<string>(PORTRAIT_SRC);
  const [scene3dDepth, setScene3dDepth] = useState<string>(PORTRAIT_DEPTH_SRC);
  // Defaults calibrados sobrios: displacement bajo para evitar el "taffy
  // effect" cuando el mouse llega a los bordes, parallax medio, sin tilt
  // base (lo subís manualmente si querés isométrico más marcado).
  const [scene3dDisplacement, setScene3dDisplacement] = useState<number>(0.35);
  const [scene3dParallax, setScene3dParallax] = useState<number>(0.8);
  const [scene3dEdgeFade, setScene3dEdgeFade] = useState<number>(0.06);
  const [scene3dTilt, setScene3dTilt] = useState<number>(3);

  // Loop simple (reemplaza el state-machine idle→transform→openIdle):
  // un solo video loopeable + 4 pulsadores absolute sobre las bolas.
  const [loopSrc, setLoopSrc] = useState<string>(HERO_LOOP_SRC);
  const [loopOrbs, setLoopOrbs] = useState<LoopOrb[]>(LOOP_ORBS_DEFAULT);
  // Index del orbe seleccionado en el panel para tunear su x/y.
  const [tuneOrbIdx, setTuneOrbIdx] = useState<number>(0);
  // Tamaño del ring pulsador (% del contenedor, eje corto).
  const [loopRingSize, setLoopRingSize] = useState<number>(14);
  // Velocidad del clip "come-bola" — 1.0 es real, 1.8x default acorta
  // a ~5.5s los 10s originales. El idle siempre va a 1.0.
  const [eatSpeed, setEatSpeed] = useState<number>(1.8);

  // Eat-flow: al tapear un orbe, si tiene eatSrc, swap al clip,
  // reproducir una vez, al onEnded navegar a href.
  //   'idle'   → loop normal (HERO_LOOP_SRC)
  //   'eating' → reproduciendo clip come-bola (loop=false), HUD oculto
  const [eatState, setEatState] = useState<'idle' | 'eating'>('idle');
  const [eatingOrbId, setEatingOrbId] = useState<string | null>(null);
  // Destino post-eat. Se setea al empezar el eat y se consume al onEnded.
  const eatTargetRef = useRef<string | null>(null);
  // Si el clip se traba / no existe / tarda demasiado, fallback a navegar.
  const eatTimeoutRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Handler del click en orbe — si tiene eatSrc, empezamos el eat flow.
  // Si no, navegamos directo (fallback).
  // ─────────────────────────────────────────────────────────────────
  const handleOrbClick = (orb: LoopOrb) => {
    // Ya estamos comiendo — ignorar dobles clicks.
    if (eatState === 'eating') return;

    if (!orb.eatSrc) {
      // No hay clip: navegación directa. En /preview-hero esto no hace
      // scroll porque las secciones no existen; en prod sí va a #sonido.
      window.location.href = orb.href;
      return;
    }

    // 1) Guardamos el destino y entramos en modo eating.
    eatTargetRef.current = orb.href;
    setEatingOrbId(orb.id);
    setEatState('eating');
    setLoopSrc(orb.eatSrc);

    // 2) Safety net: si el clip no dispara onEnded en 15s (error de codec,
    //    decode lento, lo que sea), navegamos igual.
    if (eatTimeoutRef.current) window.clearTimeout(eatTimeoutRef.current);
    eatTimeoutRef.current = window.setTimeout(() => {
      finishEat();
    }, 15000);
  };

  // Aplicar playbackRate cuando cambia el state o el slider del panel.
  // El idle vuelve a 1.0 siempre, así no queda apurado al volver.
  useEffect(() => {
    const v = videoElRef.current;
    if (!v) return;
    v.playbackRate = eatState === 'eating' ? Math.max(0.25, eatSpeed) : 1.0;
  }, [eatState, eatSpeed, loopSrc]);

  const finishEat = () => {
    const href = eatTargetRef.current;
    if (eatTimeoutRef.current) {
      window.clearTimeout(eatTimeoutRef.current);
      eatTimeoutRef.current = null;
    }
    eatTargetRef.current = null;
    // Reglas de navegación al final del eat:
    //   - En prod (NO en /preview-hero): seguimos cualquier href.
    //   - En /preview-hero: bloqueamos los hrefs internos con # (anchors)
    //     para no salir del banco de pruebas, pero SÍ permitimos saltar
    //     a otros previews (`/preview-multimedia`, etc.) — así se puede
    //     testear el flow completo orbe → destino sin romper el laboratorio.
    if (href) {
      const inPreview = window.location.pathname.startsWith('/preview-');
      const isAnchor = href.includes('#');
      const isOtherPreview = href.startsWith('/preview-') && href !== window.location.pathname;
      if (!inPreview || isOtherPreview) {
        window.location.href = href;
        return;
      }
      // anchor dentro del propio preview → no navegamos
      if (!isAnchor) {
        window.location.href = href;
        return;
      }
    }
    // Volver al idle
    setEatState('idle');
    setEatingOrbId(null);
    setLoopSrc(HERO_LOOP_SRC);
  };

  // Mesh scene (Luma scan).
  const [meshSrc, setMeshSrc] = useState<string>(LUMA_MESH_SRC);
  const [meshParallax, setMeshParallax] = useState<number>(0.7);
  const [meshTilt, setMeshTilt] = useState<number>(4);
  const [meshZoom, setMeshZoom] = useState<number>(1);
  const [meshAutoRotate, setMeshAutoRotate] = useState<number>(0);
  const [meshPointMode, setMeshPointMode] = useState<boolean>(false);
  const [meshPointSize, setMeshPointSize] = useState<number>(2);
  const [meshExposure, setMeshExposure] = useState<number>(1);
  const [meshStats, setMeshStats] = useState<{ vertices: number; faces: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  const applyPreset = (key: PresetKey) => {
    const p = PRESETS[key];
    setMaskDir(p.maskDir);
    setMaskStart(p.maskStart);
    setMaskEnd(p.maskEnd);
    setBlur(p.blur);
    setSaturate(p.saturate);
    setBrightness(p.brightness);
    setContrast(p.contrast);
    setBlend(p.blend);
    setBg(p.bg);
    setScale(p.scale);
    setOffsetX(p.offsetX);
  };

  /**
   * Scroll-tied playback: mapea `window.scrollY` (0..maxScroll) al
   * `currentTime` del video (0..duration). Escuchamos scroll en la window
   * porque el contenedor externo tiene `min-h-screen` y no scrollea —
   * el que realmente se mueve es el body.
   *
   * Si la metadata todavía no cargó cuando activás el modo, esperamos
   * `loadedmetadata` antes de empezar a mapear. Sin esto, `video.duration`
   * es NaN y `currentTime` se queda en 0 → el video parece congelado.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scrollTied) return;

    video.pause();

    let pending = false;
    let raf = 0;

    const tick = () => {
      pending = false;
      const d = video.duration;
      if (!d || isNaN(d) || !isFinite(d)) return;
      const hero = heroRef.current;
      let pct = 0;
      if (hero) {
        // Mapeamos el scroll DENTRO del hero spacer (que es alto, ej 400vh).
        // -rect.top = cuántos px scrolleamos pasado el inicio del hero.
        // total = (alto total del hero - 1 viewport) = el rango útil donde
        // el sticky se mantiene pegado al top.
        const rect = hero.getBoundingClientRect();
        const total = hero.offsetHeight - window.innerHeight;
        if (total > 0) {
          pct = Math.max(0, Math.min(1, -rect.top / total));
        }
      } else {
        // Fallback: scroll de toda la página
        const max =
          (document.documentElement.scrollHeight || document.body.scrollHeight) -
          window.innerHeight;
        if (max > 0) pct = Math.max(0, Math.min(1, window.scrollY / max));
      }
      setScrollPct(pct);
      try {
        video.currentTime = pct * d;
      } catch {
        /* seeking puede tirar si el video no terminó de cargar todavía */
      }
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(tick);
    };

    const onMeta = () => {
      tick();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    video.addEventListener('loadedmetadata', onMeta);

    // Si la metadata ya está disponible, disparamos un primer tick.
    if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
      tick();
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      video.removeEventListener('loadedmetadata', onMeta);
      cancelAnimationFrame(raf);
      video.play().catch(() => {});
    };
  }, [scrollTied]);

  /**
   * Video lifecycle orchestration — pausa los que no están visibles
   * para ahorrar decode. Sin esto, los 3 videos reproducen en paralelo
   * todo el tiempo (GPU + CPU trabajando de más → la escena se siente
   * lenta incluso con archivos chicos).
   *
   * Reglas:
   *   - mode !== 'orbs' → los 3 pausados.
   *   - !revealed         → solo idle corre.
   *   - revealed & !ended → solo transform corre.
   *   - revealed & ended  → solo openIdle corre.
   */
  useEffect(() => {
    const idle = idleVideoRef.current;
    const open = openIdleVideoRef.current;
    if (mode !== 'orbs') {
      idle?.pause();
      open?.pause();
      return;
    }
    if (!orbsRevealed) {
      idle?.play().catch(() => {});
      open?.pause();
    } else if (orbsTransformEnded) {
      idle?.pause();
      open?.play().catch(() => {});
    } else {
      idle?.pause();
      open?.pause();
    }
  }, [mode, orbsRevealed, orbsTransformEnded]);

  /**
   * Video de transformación — maneja el lifecycle del video one-shot.
   *
   *   orbsRevealed=true (tap de apertura):
   *     - Rebobina a 0 y hace play.
   *     - Trackea `timeupdate` para actualizar `orbsTransformProgress`.
   *     - Al llegar al final, queda pausado en el último frame (el
   *       atributo `ended` quedará true pero no rebobinamos — así los
   *       orbes quedan sobre el último encuadre hasta que se cierre).
   *
   *   orbsRevealed=false (tap de cierre o carga inicial):
   *     - Pausa y rebobina a 0. El idle loop de abajo se hace cargo.
   *     - Reset progress a 0.
   *
   * Solo corre cuando el modo orbes está activo y hay transformVideo
   * configurado. En otros escenarios, es no-op.
   */
  useEffect(() => {
    if (mode !== 'orbs' || !orbsTransformVideo) return;
    const v = transformVideoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      const d = v.duration;
      if (!d || isNaN(d) || !isFinite(d)) return;
      setOrbsTransformProgress(Math.max(0, Math.min(1, v.currentTime / d)));
    };
    const onEnded = () => {
      setOrbsTransformEnded(true);
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('ended', onEnded);

    if (orbsRevealed) {
      setOrbsTransformEnded(false);
      try {
        v.currentTime = 0;
      } catch {
        /* el seek puede fallar si aún no cargó metadata */
      }
      v.play().catch(() => {
        // autoplay puede fallar por políticas — no pasa nada porque el
        // tap del user ya es un gesto válido, pero por las dudas no
        // rompemos.
      });
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch { /* idem */ }
      setOrbsTransformProgress(0);
      setOrbsTransformEnded(false);
    }

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('ended', onEnded);
    };
  }, [mode, orbsRevealed, orbsTransformVideo]);

  /**
   * Particles canvas — simula las "ideas" que suben desde la cabeza cuando
   * se abre el estado orbes. Es visual — le da movimiento a lo que sería
   * un video estático + hace que el head-unfold se sienta vivo.
   *
   * Genera partículas chicas de colores pastel desde una zona acotada
   * (la cabeza) y las hace subir con drift lateral + fade-out. Loop.
   */
  useEffect(() => {
    if (mode !== 'orbs' || !orbsRevealed) return;
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number; color: string;
    };
    const colors = ['#FA5D29', '#E94B8A', '#F4D35E', '#7BBEC8', '#F3EFE6'];
    const particles: Particle[] = [];

    const spawn = () => {
      const rect = canvas.getBoundingClientRect();
      // Zona de emisión: aprox donde está la cabeza (ancho central, alto superior)
      const headX = rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.35;
      const headY = rect.height * 0.20 + (Math.random() - 0.5) * rect.height * 0.10;
      particles.push({
        x: headX,
        y: headY,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.3,
        life: 0,
        maxLife: 90 + Math.random() * 60,
        size: 1 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    let raf = 0;
    let frame = 0;
    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      // Spawn periódico
      if (frame++ % 2 === 0) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.003; // gravedad invertida (suben con ease)
        const k = 1 - p.life / p.maxLife;
        if (k <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode, orbsRevealed]);

  const maskCSS = useMemo(
    () => buildMask(maskDir, maskStart, maskEnd),
    [maskDir, maskStart, maskEnd],
  );

  /* CSS generado — lista para pegar en HeroSection.tsx */
  const generatedCSS = useMemo(
    () => `.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translateX(${offsetX}%) scale(${scale.toFixed(2)});
  filter: blur(${blur.toFixed(2)}px) saturate(${saturate.toFixed(2)}) brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)});
  mix-blend-mode: ${blend};
  -webkit-mask-image: ${maskCSS};
          mask-image: ${maskCSS};
}`,
    [offsetX, scale, blur, saturate, brightness, contrast, blend, maskCSS],
  );

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translateX(${offsetX}%) scale(${scale})`,
    filter: `blur(${blur}px) saturate(${saturate}) brightness(${brightness}) contrast(${contrast})`,
    mixBlendMode: blend,
    WebkitMaskImage: maskCSS,
    maskImage: maskCSS,
  };

  const isLight = bg === '#F3EFE6';

  return (
    <div
      ref={scrollerRef}
      style={{ background: bg, color: isLight ? '#111' : '#F3EFE6' }}
      className="min-h-screen w-full overflow-auto"
    >
      {/* Keyframes de orbes — sólo activa cuando mode === 'orbs' pero
          inyectar siempre es barato y evita FOUC al cambiar de modo. */}
      <style>{ORB_STYLES}</style>

      {/* ============================================================
          HERO FULL-BLEED · MODO CLÁSICO
          Cuando scrollTied está OFF: el hero es un viewport normal
          (h-screen). Cuando está ON: el hero crece a `scrollLength`
          viewports de alto (ej 400vh) y adentro el video queda sticky
          — así se "pinea" mientras scrolleás y tenés tiempo real de
          ver el timeline.
          ============================================================ */}
      {mode === 'classic' && (
      <section
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{ height: scrollTied ? `${scrollLength}vh` : '100vh' }}
      >
        <div
          className={scrollTied ? 'sticky top-0 w-full h-screen' : 'absolute inset-0'}
        >
          {/* Video de fondo */}
          <div className="absolute inset-0 pointer-events-none">
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster={POSTER_SRC}
              autoPlay={!scrollTied}
              muted
              loop={!scrollTied}
              playsInline
              preload="auto"
              style={videoStyle}
            />
          </div>

          {/* Gradient inferior para que el copy se lea contra el video */}
          {showCopy && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isLight
                  ? 'linear-gradient(to top, rgba(243,239,230,0.92) 0%, rgba(243,239,230,0.4) 40%, transparent 70%)'
                  : 'linear-gradient(to top, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.35) 40%, transparent 70%)',
              }}
            />
          )}

          {/* Copy encima del video */}
          {showCopy && (
            <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 lg:px-24 pb-16 md:pb-24 max-w-5xl">
              <div className="text-[11px] font-medium tracking-[0.22em] uppercase opacity-70 mb-4">
                balosky · ideas en curso
              </div>
              <h1
                className="font-black leading-[0.92] tracking-tight mb-6"
                style={{ fontSize: 'clamp(46px, 8vw, 120px)', fontFamily: 'Inter Tight, sans-serif' }}
              >
                hago temas<br />
                cuando pasan<br />
                <em className="font-black not-italic" style={{ color: '#FA5D29' }}>cosas</em>.
              </h1>
              <p className="text-base md:text-lg opacity-80 mb-8 max-w-lg leading-relaxed">
                Música, videos con IA, fotos. Si te gusta lo que hago, un cafecito ayuda a
                que haya más.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="px-5 py-3 rounded-full text-sm font-semibold"
                  style={{ background: '#FA5D29', color: '#fff' }}
                >
                  Bancame un cafecito →
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="px-5 py-3 rounded-full text-sm font-semibold border"
                  style={{ borderColor: 'currentColor', opacity: 0.8 }}
                >
                  Qué estoy haciendo
                </a>
              </div>
            </div>
          )}

          {/* Indicador visual del progreso del scroll-tied */}
          {scrollTied && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono tracking-wider">
                scroll · {(scrollPct * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ============================================================
          HERO · MODO ORBES (loop simple)
          Un único video loopeable en el que ya vive la cabeza humeando
          + las 4 bolitas de colores. Encima, 4 "pulsadores" (rings que
          pulsan) posicionados sobre las bolas para que sean clickeables.
          Adiós state-machine idle→transform→openIdle — fue todo a un
          solo asset.
          ============================================================ */}
      {mode === 'orbs' && (
        <section
          className="relative w-full h-screen overflow-hidden flex items-center justify-center"
          style={{ background: bg }}
        >
          {/* Contenedor del hero — full en desktop, simulación de iPhone
              en mobile. Así podés previsualizar ambos framings sin
              redimensionar la ventana. */}
          <div
            className={`relative overflow-hidden ${
              device === 'mobile'
                ? 'w-[390px] h-[844px] rounded-[44px] shadow-[0_0_0_8px_#111,0_0_80px_rgba(0,0,0,0.5)]'
                : 'w-full h-full'
            }`}
            style={{ background: bg }}
          >
            {/* CAPA 1 · Video — idle loopea; eating reproduce 1 vez y al
                terminar dispara finishEat (navegar o volver al idle).
                En mobile: cover (video 9:16 llena el frame).
                En desktop: contain (letterbox lateral, así no perdemos ninguna bola). */}
            <video
              ref={videoElRef}
              key={loopSrc}
              src={loopSrc}
              autoPlay
              muted
              loop={eatState === 'idle'}
              playsInline
              preload="auto"
              onEnded={() => {
                if (eatState === 'eating') finishEat();
              }}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                objectFit: device === 'desktop' ? 'contain' : 'cover',
                objectPosition: '50% 50%',
              }}
            />

            {/* CAPA 2 · Viñeta suave para leer los pulsadores encima. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isLight
                  ? 'radial-gradient(ellipse at center, transparent 45%, rgba(243,239,230,0.25) 95%)'
                  : 'radial-gradient(ellipse at center, transparent 45%, rgba(10,9,8,0.4) 95%)',
              }}
            />

            {/* CAPA 3 · Pulsadores — 4 rings que pulsan sobre cada bola
                del video. Durante eating los escondemos con fade rápido,
                así el clip "come-bola" se ve limpio sin el HUD encima. */}
            <div
              className="absolute inset-0 z-20 transition-opacity duration-300"
              style={{
                opacity: eatState === 'eating' ? 0 : 1,
                // Durante eating ningún click — ni aunque se pudiera ver algo.
                pointerEvents: eatState === 'eating' ? 'none' : 'auto',
              }}
            >
              {loopOrbs.map((o, i) => {
                const x = device === 'desktop' ? o.xDesktop : o.xMobile;
                const y = device === 'desktop' ? o.yDesktop : o.yMobile;
                return (
                  <a
                    key={o.id}
                    href={o.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleOrbClick(o);
                    }}
                    className="loop-orb"
                    style={{
                      left: x,
                      top: y,
                      color: o.color,
                      ['--ring-size' as any]: `${loopRingSize}vmin`,
                      animationDelay: `${i * 0.25}s`,
                    }}
                    aria-label={o.label}
                  >
                    <span className="loop-orb-ring" />
                    <span className="loop-orb-ring loop-orb-ring-2" />
                    <span className="loop-orb-core" />
                    <span
                      className="loop-orb-label"
                      style={{
                        color: isLight ? '#111' : '#F3EFE6',
                        background: isLight
                          ? 'rgba(243, 239, 230, 0.6)'
                          : 'rgba(10, 9, 8, 0.45)',
                        borderColor: isLight
                          ? 'rgba(17, 17, 17, 0.12)'
                          : 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {o.label}
                    </span>
                  </a>
                );
              })}
            </div>

            {/* CAPA 4 · Indicador discreto arriba-izq — oculto en demo */}
            {!demoMode && (
              <div className="absolute top-4 left-4 z-30 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[9px] font-mono tracking-wider uppercase pointer-events-none">
                {device} · {eatState === 'eating' ? `comiendo: ${eatingOrbId}` : `loop · ${loopOrbs.length} pulsadores`}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================
          HERO 3D · ESCENA ISOMÉTRICA
          Plano 3D con la foto como textura + depth map para elevar la
          cara. Paralaje al mouse/tilt. Si no le pasás depth map se lo
          inventa heurísticamente (radial centrado en la cara + luminancia)
          así podés validar el efecto sin esperar a generar uno real.
          ============================================================ */}
      {mode === '3d' && (
        <section
          className="relative w-full h-screen overflow-hidden flex items-center justify-center"
          style={{ background: bg }}
        >
          <div
            className={`relative overflow-hidden ${
              device === 'mobile'
                ? 'w-[390px] h-[844px] rounded-[44px] shadow-[0_0_0_8px_#111,0_0_80px_rgba(0,0,0,0.5)]'
                : 'w-full h-full'
            }`}
            style={{ background: bg }}
          >
            <Hero3DScene
              photoSrc={scene3dPhoto}
              depthSrc={scene3dDepth || undefined}
              displacement={scene3dDisplacement}
              parallax={scene3dParallax}
              edgeFade={scene3dEdgeFade}
              tilt={scene3dTilt}
              background={bg}
              className="absolute inset-0"
            />

            {/* Label dev — arriba-izq, pa' saber en qué modo estoy. */}
            {!demoMode && (
              <div className="absolute top-4 left-4 z-30 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[9px] font-mono tracking-wider uppercase pointer-events-none">
                3d · {device} · {scene3dDepth ? 'depth real' : 'depth auto'}
              </div>
            )}

            {/* Copy superpuesto — mismo treatment que el hero real, sólo
                para tener una referencia de cómo se vería el texto encima
                del efecto 3D. */}
            {showCopy && (
              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none px-6 pb-12">
                <div
                  className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.4) 55%, transparent 100%)',
                  }}
                />
                <div className="relative text-[10px] font-mono tracking-[0.22em] uppercase opacity-60 mb-2 text-white">
                  hero · 3d preview
                </div>
                <h1
                  className="relative font-black leading-[0.92] tracking-tight text-white"
                  style={{ fontSize: 'clamp(34px, 6vw, 72px)', fontFamily: 'Inter Tight, sans-serif' }}
                >
                  hago temas<br />
                  cuando pasan<br />
                  <em className="font-black not-italic" style={{ color: '#FA5D29' }}>cosas</em>.
                </h1>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================
          MODO MESH — renderiza el scan de Luma (.ply con color por
          vértice). El PLY crudo (80MB+) se decima antes con
          scripts/_decimate-luma-ply.mjs a algo cargable (~1MB).
          ============================================================ */}
      {mode === 'mesh' && (
        <section
          className="relative w-full h-screen overflow-hidden flex items-center justify-center"
          style={{ background: bg }}
        >
          <div
            className={`relative overflow-hidden ${
              device === 'mobile'
                ? 'w-[390px] h-[844px] rounded-[44px] shadow-[0_0_0_8px_#111,0_0_80px_rgba(0,0,0,0.5)]'
                : 'w-full h-full'
            }`}
            style={{ background: bg }}
          >
            <HeroMeshScene
              src={meshSrc}
              parallax={meshParallax}
              tilt={meshTilt}
              zoom={meshZoom}
              autoRotate={meshAutoRotate}
              pointMode={meshPointMode}
              pointSize={meshPointSize}
              exposure={meshExposure}
              background={bg}
              className="absolute inset-0"
              onLoaded={setMeshStats}
            />

            {!demoMode && (
              <div className="absolute top-4 left-4 z-30 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[9px] font-mono tracking-wider uppercase pointer-events-none">
                mesh · {device} · {meshStats
                  ? `${(meshStats.vertices / 1000).toFixed(1)}k verts · ${(meshStats.faces / 1000).toFixed(1)}k tris`
                  : 'loading…'}
              </div>
            )}

            {showCopy && (
              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none px-6 pb-12">
                <div
                  className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.4) 55%, transparent 100%)',
                  }}
                />
                <div className="relative text-[10px] font-mono tracking-[0.22em] uppercase opacity-60 mb-2 text-white">
                  hero · luma scan
                </div>
                <h1 className="relative text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-white">
                  Balosky
                </h1>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================
          SECCIÓN SIGUIENTE — para testear cómo el video se funde con
          el resto de la página (scroll hacia abajo).
          ============================================================ */}
      <section className="px-6 md:px-16 py-24 md:py-32 max-w-3xl mx-auto">
        <div className="text-[11px] font-medium tracking-[0.22em] uppercase opacity-60 mb-4">
          01 · sigue abajo
        </div>
        <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
          Esta es la sección siguiente.
        </h2>
        <p className="opacity-75 leading-relaxed max-w-xl mb-4">
          Scrolleá para arriba y para abajo. La idea es sentir cómo el video se funde con
          la oscuridad del fondo y te deja el texto claro al final del viewport.
        </p>
        <p className="opacity-60 text-sm leading-relaxed max-w-xl">
          Si prendés "Scroll-tied" en el panel, el video avanza con tu scroll en vez de
          loopear.
        </p>
        {scrollTied &&
          Array.from({ length: 10 }).map((_, i) => (
            <p key={i} className="mt-8 opacity-50 text-sm">
              Bloque extra {i + 1} · seguí scrolleando para ver cómo el video recorre su
              timeline junto con vos.
            </p>
          ))}
      </section>

      {/* ============================================================
          TOGGLE DE MODO PRESENTACIÓN — siempre visible (también en demo)
          para que pueda salir y entrar sin tener que tocar la URL.
          Discreto: chiquito, abajo a la izquierda, vidrio sutil.
          ============================================================ */}
      <button
        onClick={() => setDemoMode((v) => !v)}
        className="fixed bottom-5 left-5 z-[60] px-3 py-2 rounded-full bg-white/8 backdrop-blur-md text-white/80 text-[10px] font-mono tracking-[0.18em] uppercase border border-white/15 hover:bg-white/15 hover:text-white transition-colors"
        title={demoMode ? 'Salir del modo presentación' : 'Entrar en modo presentación (oculta los controles)'}
      >
        {demoMode ? '× demo' : '◐ demo'}
      </button>

      {/* ============================================================
          BOTÓN FLOTANTE PARA ABRIR/CERRAR EL PANEL
          (escondido en demoMode — el link compartido queda limpio)
          ============================================================ */}
      {!demoMode && (
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-full bg-[#FA5D29] text-white text-xs font-semibold tracking-wider uppercase shadow-xl hover:scale-105 transition-transform"
        >
          {panelOpen ? 'Cerrar panel' : '⚙ Controles'}
        </button>
      )}

      {/* Toggle rápido: mostrar/ocultar copy sin abrir el panel — útil
          para ver el video limpio. */}
      {!demoMode && (
        <button
          onClick={() => setShowCopy((v) => !v)}
          className="fixed bottom-5 right-44 z-50 px-3 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider uppercase border border-white/20 hover:bg-white/20"
          title="Mostrar/ocultar el copy sobre el video"
        >
          {showCopy ? 'Sin copy' : 'Con copy'}
        </button>
      )}

      {/* ============================================================
          PANEL DE CONTROLES (slide-in desde la derecha)
          ============================================================ */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-[340px] overflow-y-auto bg-zinc-950/95 border-l border-white/10 p-5 text-[13px] backdrop-blur-xl shadow-2xl text-white transition-transform duration-200 ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <b className="tracking-tight">Controles</b>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-white/60 hover:text-white text-lg leading-none"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Toggle de modo — Clásico / Orbes / 3D-plano / Mesh */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Modo hero</label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setMode('classic')}
              className={`px-2 py-2 text-[11px] rounded tracking-wide ${mode === 'classic' ? 'bg-[#FA5D29] text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Clásico
            </button>
            <button
              onClick={() => setMode('orbs')}
              className={`px-2 py-2 text-[11px] rounded tracking-wide ${mode === 'orbs' ? 'bg-[#FA5D29] text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Orbes
            </button>
            <button
              onClick={() => setMode('3d')}
              className={`px-2 py-2 text-[11px] rounded tracking-wide ${mode === '3d' ? 'bg-[#FA5D29] text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              3D
            </button>
            <button
              onClick={() => setMode('mesh')}
              className={`px-2 py-2 text-[11px] rounded tracking-wide ${mode === 'mesh' ? 'bg-[#FA5D29] text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Mesh
            </button>
          </div>
          {mode === 'orbs' && (
            <>
              <p className="text-[10px] opacity-50 leading-snug mt-2 mb-3">
                Video loopeable con humo y 4 bolas bakeadas. Los pulsadores son HTML encima — ajustá posición, label y href por cada bola.
              </p>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Framing</label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <button
                  onClick={() => setDevice('mobile')}
                  className={`px-2 py-1.5 text-[11px] rounded tracking-wide ${device === 'mobile' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Mobile 9:16
                </button>
                <button
                  onClick={() => setDevice('desktop')}
                  className={`px-2 py-1.5 text-[11px] rounded tracking-wide ${device === 'desktop' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Desktop 16:9
                </button>
              </div>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Video loop</label>
              <input
                type="text"
                value={loopSrc}
                onChange={(e) => setLoopSrc(e.target.value)}
                placeholder="/uploads/videos/balosky-hero-loop.mp4"
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-mono mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Tamaño del pulsador (vmin) <span className="opacity-50 font-mono">{loopRingSize}</span>
              </label>
              <input
                type="range"
                min="6"
                max="24"
                step="0.5"
                value={loopRingSize}
                onChange={(e) => setLoopRingSize(parseFloat(e.target.value))}
                className="w-full mb-4"
              />

              {/* Velocidad del clip come-bola — los 10s originales son
                  demasiado, en 1.8x quedan 5.5s y se siente snappy. */}
              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Velocidad come-bola <span className="opacity-50 font-mono">{eatSpeed.toFixed(2)}x · {(10 / eatSpeed).toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={eatSpeed}
                onChange={(e) => setEatSpeed(parseFloat(e.target.value))}
                className="w-full mb-4"
              />

              {/* Selector de orbe a tunear */}
              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Orbe a tunear</label>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {loopOrbs.map((o, i) => (
                  <button
                    key={o.id}
                    onClick={() => setTuneOrbIdx(i)}
                    className={`px-2 py-2 text-[10px] rounded tracking-wide uppercase ${
                      tuneOrbIdx === i ? 'bg-[#FA5D29] text-white' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    style={{ borderLeft: `3px solid ${o.color}` }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {(() => {
                const o = loopOrbs[tuneOrbIdx];
                const update = (patch: Partial<LoopOrb>) => {
                  setLoopOrbs((prev) =>
                    prev.map((p, i) => (i === tuneOrbIdx ? { ...p, ...patch } : p)),
                  );
                };
                const parsePct = (v: string) => parseFloat(v.replace('%', ''));
                const x = device === 'desktop' ? parsePct(o.xDesktop) : parsePct(o.xMobile);
                const y = device === 'desktop' ? parsePct(o.yDesktop) : parsePct(o.yMobile);
                const setX = (val: number) => {
                  if (device === 'desktop') update({ xDesktop: `${val}%` });
                  else update({ xMobile: `${val}%` });
                };
                const setY = (val: number) => {
                  if (device === 'desktop') update({ yDesktop: `${val}%` });
                  else update({ yMobile: `${val}%` });
                };
                return (
                  <>
                    <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Label</label>
                    <input
                      type="text"
                      value={o.label}
                      onChange={(e) => update({ label: e.target.value })}
                      className="w-full px-2 py-1.5 mb-2 bg-white/5 border border-white/10 rounded text-white text-xs font-mono"
                    />

                    <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Href</label>
                    <input
                      type="text"
                      value={o.href}
                      onChange={(e) => update({ href: e.target.value })}
                      className="w-full px-2 py-1.5 mb-2 bg-white/5 border border-white/10 rounded text-white text-xs font-mono"
                    />

                    <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Color</label>
                    <div className="flex gap-2 items-center mb-3">
                      <input
                        type="color"
                        value={o.color}
                        onChange={(e) => update({ color: e.target.value })}
                        className="w-9 h-9 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={o.color}
                        onChange={(e) => update({ color: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-mono"
                      />
                    </div>

                    <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                      X <span className="opacity-50 font-mono">{x.toFixed(1)}%</span>
                      <span className="opacity-30 font-mono ml-2">({device})</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={x}
                      onChange={(e) => setX(parseFloat(e.target.value))}
                      className="w-full mb-2"
                    />

                    <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                      Y <span className="opacity-50 font-mono">{y.toFixed(1)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={y}
                      onChange={(e) => setY(parseFloat(e.target.value))}
                      className="w-full mb-3"
                    />

                    <button
                      onClick={() => {
                        console.log('// LOOP_ORBS —\n' + JSON.stringify(loopOrbs, null, 2));
                        alert('Snapshot enviado a consola.');
                      }}
                      className="w-full px-2 py-2 text-[10px] rounded bg-white/10 hover:bg-white/20 tracking-wider uppercase"
                    >
                      Loggear posiciones actuales
                    </button>
                  </>
                );
              })()}
            </>
          )}

          {mode === '3d' && (
            <>
              <p className="text-[10px] opacity-50 leading-snug mt-2 mb-3">
                Escena 3D con vertex displacement. La foto se vuelve un plano subdividido y el depth map levanta los píxeles de la cara. Si no paso depth map, lo genero solo (radial + luminancia).
              </p>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Framing</label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <button
                  onClick={() => setDevice('mobile')}
                  className={`px-2 py-1.5 text-[11px] rounded tracking-wide ${device === 'mobile' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Mobile 9:16
                </button>
                <button
                  onClick={() => setDevice('desktop')}
                  className={`px-2 py-1.5 text-[11px] rounded tracking-wide ${device === 'desktop' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Desktop 16:9
                </button>
              </div>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Foto (color)</label>
              <input
                type="text"
                value={scene3dPhoto}
                onChange={(e) => setScene3dPhoto(e.target.value)}
                placeholder="/uploads/thumbs/balosky-portrait-frente.jpg"
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-mono mb-2"
              />
              <p className="text-[10px] opacity-40 leading-snug mb-3">
                Portrait frontal. Mejor si el fondo ya está oscuro / limpio.
              </p>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-2">Depth map (opcional)</label>
              <input
                type="text"
                value={scene3dDepth}
                onChange={(e) => setScene3dDepth(e.target.value)}
                placeholder="(vacío = auto)"
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs font-mono mb-2"
              />
              <p className="text-[10px] opacity-40 leading-snug mb-4">
                Dejá vacío para que use el depth generado automáticamente. Cuando tengas uno real (MiDaS / ZoeDepth) pegá el path acá.
              </p>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Displacement <span className="opacity-50 font-mono">{scene3dDisplacement.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={scene3dDisplacement}
                onChange={(e) => setScene3dDisplacement(parseFloat(e.target.value))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Paralaje <span className="opacity-50 font-mono">{scene3dParallax.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={scene3dParallax}
                onChange={(e) => setScene3dParallax(parseFloat(e.target.value))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Tilt base (º) <span className="opacity-50 font-mono">{scene3dTilt}</span>
              </label>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={scene3dTilt}
                onChange={(e) => setScene3dTilt(parseInt(e.target.value, 10))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Edge fade <span className="opacity-50 font-mono">{scene3dEdgeFade.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.005"
                value={scene3dEdgeFade}
                onChange={(e) => setScene3dEdgeFade(parseFloat(e.target.value))}
                className="w-full"
              />
            </>
          )}

          {mode === 'mesh' && (
            <>
              <p className="text-[10px] opacity-50 leading-snug mt-2 mb-3">
                Mesh real del scan de Luma. Si el archivo crudo es ≥10MB,
                primero correr <code className="bg-white/10 px-1 rounded">node scripts/_decimate-luma-ply.mjs</code>.
              </p>

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">PLY src</label>
              <input
                type="text"
                value={meshSrc}
                onChange={(e) => setMeshSrc(e.target.value)}
                className="w-full px-2 py-1.5 mb-3 bg-white/5 border border-white/10 rounded text-white text-[11px] font-mono"
              />

              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meshPointMode}
                  onChange={(e) => setMeshPointMode(e.target.checked)}
                />
                <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">
                  Modo puntos (debug)
                </span>
              </label>

              {meshPointMode && (
                <>
                  <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                    Tamaño punto <span className="opacity-50 font-mono">{meshPointSize}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={meshPointSize}
                    onChange={(e) => setMeshPointSize(parseFloat(e.target.value))}
                    className="w-full mb-3"
                  />
                </>
              )}

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Zoom <span className="opacity-50 font-mono">{meshZoom.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.4"
                max="3"
                step="0.05"
                value={meshZoom}
                onChange={(e) => setMeshZoom(parseFloat(e.target.value))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Tilt base (º) <span className="opacity-50 font-mono">{meshTilt}</span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={meshTilt}
                onChange={(e) => setMeshTilt(parseInt(e.target.value, 10))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Paralaje <span className="opacity-50 font-mono">{meshParallax.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={meshParallax}
                onChange={(e) => setMeshParallax(parseFloat(e.target.value))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Auto-rotate (rad/s) <span className="opacity-50 font-mono">{meshAutoRotate.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={meshAutoRotate}
                onChange={(e) => setMeshAutoRotate(parseFloat(e.target.value))}
                className="w-full mb-3"
              />

              <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">
                Exposición <span className="opacity-50 font-mono">{meshExposure.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.05"
                value={meshExposure}
                onChange={(e) => setMeshExposure(parseFloat(e.target.value))}
                className="w-full"
              />

              {meshStats && (
                <div className="mt-3 px-2 py-1.5 rounded bg-white/5 text-[10px] font-mono opacity-70">
                  {meshStats.vertices.toLocaleString()} verts · {meshStats.faces.toLocaleString()} caras
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className="px-2 py-1.5 text-[10px] rounded bg-white/10 hover:bg-white/20 tracking-wide text-left"
              title={k}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="mt-3 mb-4">
          <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">Dirección de la máscara</label>
          <select
            value={maskDir}
            onChange={(e) => setMaskDir(e.target.value as MaskDir)}
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
          >
            <option value="bottom-to-top" className="bg-zinc-900">abajo → arriba (cuerpo se fusiona)</option>
            <option value="top-to-bottom" className="bg-zinc-900">arriba → abajo (cabeza se fusiona)</option>
            <option value="center" className="bg-zinc-900">centro (bordes se fusionan)</option>
            <option value="none" className="bg-zinc-900">sin máscara</option>
          </select>
        </div>

        <Slider label="Máscara · inicio" value={maskStart} onChange={setMaskStart} min={0} max={100} step={1} unit="%" />
        <Slider label="Máscara · fin"    value={maskEnd}   onChange={setMaskEnd}   min={0} max={100} step={1} unit="%" />
        <Slider label="Blur (vidrio)"    value={blur}       onChange={setBlur}       min={0} max={8}   step={0.1} unit="px" />
        <Slider label="Saturate"         value={saturate}   onChange={setSaturate}   min={0} max={2}   step={0.01} />
        <Slider label="Brightness"       value={brightness} onChange={setBrightness} min={0.5} max={1.5} step={0.01} />
        <Slider label="Contrast"         value={contrast}   onChange={setContrast}   min={0.5} max={1.5} step={0.01} />
        <Slider label="Scale"            value={scale}      onChange={setScale}      min={0.7} max={1.3} step={0.01} />
        <Slider label="Offset X"         value={offsetX}    onChange={setOffsetX}    min={-30} max={30} step={1} unit="%" />

        <div className="mt-3">
          <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">Blend mode</label>
          <select
            value={blend}
            onChange={(e) => setBlend(e.target.value as BlendMode)}
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
          >
            {(['normal', 'screen', 'lighten', 'multiply', 'overlay', 'soft-light', 'hard-light'] as BlendMode[]).map((m) => (
              <option key={m} value={m} className="bg-zinc-900">{m}</option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <label className="block text-[11px] uppercase tracking-[0.14em] opacity-60 mb-1">Fondo</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-8 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm font-mono"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scrollTied}
            onChange={(e) => setScrollTied(e.target.checked)}
          />
          <span>Scroll-tied playback</span>
        </label>

        {scrollTied && (
          <div className="mt-2 pl-6">
            <Slider
              label="Largo del pin"
              value={scrollLength}
              onChange={setScrollLength}
              min={150}
              max={800}
              step={50}
              unit="vh"
            />
            <p className="text-[10px] opacity-50 leading-snug -mt-1">
              Cuánto scroll dura el video pegado al top. + alto = scroll más lento, video más visible.
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <b className="text-[11px] uppercase tracking-[0.14em] opacity-60">CSS generado</b>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCSS).catch(() => {})}
              className="px-2 py-1 rounded bg-[#FA5D29] text-white text-[11px] font-semibold"
            >
              Copiar
            </button>
          </div>
          <pre className="text-[11px] leading-relaxed bg-black/60 p-2 rounded overflow-x-auto whitespace-pre-wrap font-mono">{generatedCSS}</pre>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Slider genérico con label y valor numérico alineado a la derecha.
 * ----------------------------------------------------------------------- */
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] uppercase tracking-[0.12em] opacity-60">{label}</label>
        <span className="text-[11px] font-mono opacity-80">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FA5D29]"
      />
    </div>
  );
}
