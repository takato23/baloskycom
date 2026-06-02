/**
 * /preview-full — Hero con orbes + MultimediaHub en UNA sola página.
 *
 * Respeta el mental model del usuario: tap en bola NO es cambio de ruta,
 * es un scrollIntoView con easing hacia la sub-zona. Idem si scrolleás
 * sin tocar nada, también bajás naturalmente.
 *
 * Mapping orbe → zona (4 universos):
 *   multimedia → zone-multimedia (música + fotos + wallpapers)
 *   ideas      → zone-ideas      (videos IA + notebookLLM + ensayos)
 *   trabajo    → zone-trabajo    (1:1, servicios IA, workshops, colabs)
 *   sobre-mi   → zone-sobre-mi   (bio + redes + contacto)
 *
 * Cafecito queda FUERA del set de orbes — vive como FAB liquid-glass
 * persistente flotando abajo-derecha, con su propio scroll target
 * (zone-cafecito).
 *
 * /preview-hero y /preview-multimedia siguen vivos como banco aislado y
 * referencia — esta página es la versión unificada para testear el flow
 * completo desde un solo viewport.
 */

import { useEffect, useRef, useState } from 'react';
import { MultimediaHub } from './MultimediaPreview';

/* -------------------------------------------------------------------------
 * Assets — mismas rutas que HeroPreview, para reusar videos ya bakeados.
 * ----------------------------------------------------------------------- */
const HERO_LOOP_SRC = '/uploads/videos/balosky-hero-loop-hd.mp4';

type OrbId = 'multimedia' | 'ideas' | 'trabajo' | 'sobre-mi';
type ZoneId = 'multimedia' | 'ideas' | 'trabajo' | 'sobre-mi' | 'cafecito';

// Dirección del pill-label respecto al orbe. La usamos para que el label
// caiga afuera del orbe (hacia el centro de la pantalla), así no se tapa
// con el borde del viewport ni con el video.
type LabelDir = 'below-right' | 'below-left' | 'above-right' | 'above-left';

type FullOrb = {
  id: OrbId;
  label: string;
  color: string;
  zone: ZoneId;
  xDesktop: string; yDesktop: string;
  xMobile: string;  yMobile: string;
  labelDirDesktop: LabelDir;
  labelDirMobile: LabelDir;
  eatSrc: string | null;
  featured?: boolean;   // 1 sola — orbe protagonista, más grande y con más glow
};

// 4 orbes = 4 universos del hub. Cafecito queda FUERA del set (vive como FAB
// flotante liquid-glass persistente). El orbe "multimedia" es el featured
// (peach, centro del arco) porque agrupa todo lo audiovisual: música, fotos,
// wallpapers. Preservamos los colores de las 4 burbujas del video para que
// el dissolve (clip come-bola) siga matcheando el humo.
const ORBS: FullOrb[] = [
  // IDEAS · cyan. Satélite arriba-izquierda — el humo frío suele nacer ahí.
  { id: 'ideas',      label: 'ideas',      color: '#9FD9E0', zone: 'ideas',
    xDesktop: '60%', yDesktop: '32%', xMobile: '22%', yMobile: '18%',
    labelDirDesktop: 'below-right', labelDirMobile: 'below-right',
    eatSrc: '/uploads/videos/balosky-eat-mira.mp4' },
  // SOBRE MÍ · pink. Arriba-derecha — donde la burbuja rosa del humo flota.
  { id: 'sobre-mi',   label: 'sobre mí',   color: '#F26FA6', zone: 'sobre-mi',
    xDesktop: '76%', yDesktop: '24%', xMobile: '78%', yMobile: '24%',
    labelDirDesktop: 'below-left',  labelDirMobile: 'below-left',
    eatSrc: '/uploads/videos/balosky-eat-cafecito.mp4' },
  // TRABAJO · cream. Abajo-izquierda del retrato, patrón diamante vertical.
  { id: 'trabajo',    label: 'trabajo',    color: '#F8E3B8', zone: 'trabajo',
    xDesktop: '90%', yDesktop: '52%', xMobile: '22%', yMobile: '58%',
    labelDirDesktop: 'below-left',  labelDirMobile: 'above-right',
    eatSrc: '/uploads/videos/balosky-eat-ojo.mp4' },
  // MULTIMEDIA · peach · FEATURED. Medio-derecha, orbe más grande — arc
  // vertical: ideas↖ sobre-mí↗ multimedia→ trabajo↙.
  { id: 'multimedia', label: 'multimedia', color: '#F4B37E', zone: 'multimedia',
    xDesktop: '74%', yDesktop: '54%', xMobile: '78%', yMobile: '55%',
    labelDirDesktop: 'below-right', labelDirMobile: 'above-left',
    eatSrc: '/uploads/videos/balosky-eat-sonido.mp4',
    featured: true },
];

// Tamaño del ring (% del eje corto).
const RING_SIZE_VMIN = 14;
// Velocidad del clip come-bola (1.8× recorta los 10s originales a ~5.5s).
const EAT_SPEED = 1.8;

// Mapping zona → label legible para el cartel del dissolve.
const ZONE_LABELS: Record<ZoneId, string> = {
  multimedia: 'multimedia',
  ideas: 'ideas',
  trabajo: 'trabajo',
  'sobre-mi': 'sobre mí',
  cafecito: 'cafecito',
};
function labelForZone(zone: ZoneId | null | undefined): string {
  return zone ? ZONE_LABELS[zone] : '';
}

// Tracks demo para la zona MÚSICA — los nombres salen del mockup. Cuando
// el admin tenga el catálogo real, reemplazamos esto por un fetch a
// /api/media?type=cancion (ya hay endpoint).
type DemoTrack = { id: string; title: string; sub: string; duration: string };
const DEMO_TRACKS: DemoTrack[] = [
  { id: 'tr1', title: 'Robaron a Balosky',                  sub: 'Temas Propios', duration: '3:43' },
  { id: 'tr2', title: 'Tin Cup Anthem',                     sub: 'Temas Propios', duration: '3:36' },
  { id: 'tr3', title: 'El Instagram',                       sub: 'Temas Propios', duration: '4:07' },
  { id: 'tr4', title: 'Tin Cup Anthem (v2)',                sub: 'Temas Propios', duration: '3:18' },
  { id: 'tr5', title: 'Ai, ai, ai, ai',                     sub: 'Temas Propios', duration: '2:37' },
  { id: 'tr6', title: 'Y bueno, locos, clarito les digo,',  sub: 'Temas Propios', duration: '4:11' },
];

/* Sample de fotos para el carousel de la zona FOTOS en el slab combinado.
   Son placeholders con las Redes_*.webp que ya están subidas — cuando el
   admin cargue fotos reales, cambiamos por fetch a /api/media?type=foto. */
type FotoSample = { id: string; src: string; alt: string };
const FOTO_SAMPLES: FotoSample[] = [
  { id: 'f1', src: '/uploads/ojo/Redes_Chinatown_Noche.webp',         alt: 'Chinatown de noche' },
  { id: 'f2', src: '/uploads/ojo/Redes_Tren_Noche_Curva.webp',        alt: 'Tren de noche' },
  { id: 'f3', src: '/uploads/ojo/Redes_Iglesia_Rascacielos.webp',     alt: 'Iglesia + rascacielos' },
  { id: 'f4', src: '/uploads/ojo/Redes_Estatua_Libertad_Sol_Atras.webp', alt: 'Estatua de la libertad' },
  { id: 'f5', src: '/uploads/ojo/Redes_Flor_Loto_Blanca.webp',        alt: 'Flor de loto blanca' },
  { id: 'f6', src: '/uploads/ojo/Redes_Escalera_Graffitis.webp',      alt: 'Escalera con graffitis' },
  { id: 'f7', src: '/uploads/ojo/Redes_Barberia_NYC.webp',            alt: 'Barbería NYC' },
  { id: 'f8', src: '/uploads/ojo/Redes_Subte_Noche_Q.webp',           alt: 'Subte Q de noche' },
];

/* Tiers Variación 5 · numerados, con icono + color por tier, el último
   (club balosky) es "featured" y tiene otro tratamiento visual (título
   grande en vez de precio). */
type CafeIconId = 'coffee' | 'leaf' | 'pizza' | 'crown';
type CafeTierV5 = {
  id: string;
  num: string;
  label: string;
  amount?: number;
  note: string;
  title?: string;   // sólo para el club: override del precio por título grande
  icon: CafeIconId;
  color: string;
  featured?: boolean;
};
const CAFECITO_TIERS_V5: CafeTierV5[] = [
  { id: 'cafe',  num: '05', label: 'cafecito',     amount: 500,  note: 'gracias, sueño',    icon: 'coffee', color: '#F4B37E' },
  { id: 'mate',  num: '06', label: 'mate largo',   amount: 1500, note: 'una charla',         icon: 'leaf',   color: '#9FD9AB' },
  { id: 'pizza', num: '07', label: 'pizza',        amount: 3500, note: 'comimos juntos',     icon: 'pizza',  color: '#F26FA6' },
  { id: 'club',  num: '08', label: 'club balosky', title: 'bancame todo el año', note: 'acceso a DEMO VIP, descargas y más', icon: 'crown', color: '#F8E3B8', featured: true },
];

// Tabs del mini-dock flotante top. Cada tab = uno de los 4 universos del
// hub. El click hace scrollIntoView a la sección correspondiente. Cafecito
// NO está acá — vive como FAB flotante persistente.
type ZoneTabId = 'multimedia' | 'ideas' | 'trabajo' | 'sobre-mi';
type ZoneTab = { id: ZoneTabId; label: string; targetId: string; color: string };
const ZONE_TABS: ZoneTab[] = [
  { id: 'multimedia', label: 'multimedia', targetId: 'zone-multimedia', color: '#F4B37E' },
  { id: 'ideas',      label: 'ideas',      targetId: 'zone-ideas',      color: '#9FD9E0' },
  { id: 'trabajo',    label: 'trabajo',    targetId: 'zone-trabajo',    color: '#F8E3B8' },
  { id: 'sobre-mi',   label: 'sobre mí',   targetId: 'zone-sobre-mi',   color: '#F26FA6' },
];

// Píldoras del bottom-bar del slab — atajos de acción rápida (estilo
// dock iOS). Apuntan a las zonas más jugosas para un soporter que entra
// al hero. Iconos inline SVG porque son 4 y no vale la pena traer una
// libería entera.
type SlabPill = {
  id: string;
  label: string;
  sub: string;
  href?: string;
  zone?: ZoneId;
  iconPath: string; // d= del <path>
};
const SLAB_PILLS: SlabPill[] = [
  {
    id: 'multimedia', label: 'multimedia', sub: 'música · fotos', zone: 'multimedia',
    // camera
    iconPath: 'M4 7h3l1.6-2.4A1 1 0 0 1 9.4 4h5.2a1 1 0 0 1 .8.4L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
  },
  {
    id: 'ideas', label: 'ideas', sub: 'videos · notas', zone: 'ideas',
    // lightbulb
    iconPath: 'M9 21h6M10 17v2h4v-2M12 3a7 7 0 0 0-4 12.7V17h8v-1.3A7 7 0 0 0 12 3z',
  },
  {
    id: 'trabajo', label: 'trabajo', sub: 'contratame', zone: 'trabajo',
    // briefcase
    iconPath: 'M4 8h16v12H4V8zm5-4h6v4H9V4zm-5 8h16',
  },
  {
    id: 'sobre-mi', label: 'sobre mí', sub: 'quién soy', zone: 'sobre-mi',
    // user
    iconPath: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0v1H5v-1z',
  },
];

export default function PreviewFull() {
  // --- modo demo (?demo=1) — oculta el chip de dev, toggle queda visible.
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('demo') === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (demoMode) url.searchParams.set('demo', '1');
    else url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.toString());
  }, [demoMode]);

  // --- device (mobile vs desktop) por viewport. Evita useIsMobile porque
  //     esta página vive fuera del Layout y queremos 0 deps extra.
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  });
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setDevice(mq.matches ? 'mobile' : 'desktop');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- eat state machine (réplica minimalista de HeroPreview).
  const [loopSrc, setLoopSrc] = useState<string>(HERO_LOOP_SRC);
  const [eatState, setEatState] = useState<'idle' | 'eating'>('idle');
  const [eatingOrbId, setEatingOrbId] = useState<OrbId | null>(null);
  const eatTargetZoneRef = useRef<ZoneId | null>(null);
  const eatTimeoutRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // --- dissolve cinematográfico. Fases del puente hero → zona:
  //   'off'     → oculto (default)
  //   'rising'  → panel de vidrio esmerilado sube desde abajo, cámara baja (translateY del video).
  //   'covered' → cristal tapa todo el viewport, momento en que disparamos scrollIntoView por detrás.
  //   'falling' → cristal se disuelve hacia arriba revelando la zona destino.
  // La transición total dura ~1.6s. Respeta prefers-reduced-motion.
  const [dissolvePhase, setDissolvePhase] = useState<'off' | 'rising' | 'covered' | 'falling'>('off');
  // Tinte del vidrio = color del orbe comido. Sutileza crítica: tira humo del mismo color.
  const [dissolveTint, setDissolveTint] = useState<string>('#F4B37E');
  // Label de la zona destino — guardado en state porque el ref se nullea
  // dentro de runDissolve antes de que el overlay renderee.
  const [dissolveLabel, setDissolveLabel] = useState<string>('');
  // Timers del dissolve para poder limpiarlos si el usuario spamea.
  const dissolveTimersRef = useRef<number[]>([]);

  // Todas las zonas tienen IDs estables en el DOM: `zone-multimedia`,
  // `zone-ideas`, `zone-trabajo`, `zone-sobre-mi`, `zone-cafecito`.
  // Usamos getElementById — más liviano que forwardear refs a través
  // de componentes hijos.
  const scrollToZone = (zone: ZoneId) => {
    const el = document.getElementById(`zone-${zone}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOrbClick = (orb: FullOrb) => {
    if (eatState === 'eating' || dissolvePhase !== 'off') return;
    // Guardamos el tinte + label AHORA para que el dissolve los use.
    setDissolveTint(orb.color);
    setDissolveLabel(labelForZone(orb.zone));
    // Sin clip come-bola (edge case si se borró el video): dissolve directo.
    if (!orb.eatSrc) {
      eatTargetZoneRef.current = orb.zone;
      runDissolve();
      return;
    }
    eatTargetZoneRef.current = orb.zone;
    setEatingOrbId(orb.id);
    setEatState('eating');
    setLoopSrc(orb.eatSrc);
    // Safety net: si el clip se traba, disparamos el dissolve igual a los 15s.
    if (eatTimeoutRef.current) window.clearTimeout(eatTimeoutRef.current);
    eatTimeoutRef.current = window.setTimeout(() => finishEat(), 15000);
  };

  const finishEat = () => {
    if (eatTimeoutRef.current) {
      window.clearTimeout(eatTimeoutRef.current);
      eatTimeoutRef.current = null;
    }
    setEatState('idle');
    setEatingOrbId(null);
    setLoopSrc(HERO_LOOP_SRC);
    runDissolve();
  };

  // ─────────────────────────────────────────────────────────────────
  // Dissolve cinematográfico. Pipeline:
  //   1. rising  (0 → 600ms)   panel sube + cámara baja
  //   2. covered (600 → 700ms) cristal tapa todo, scrollIntoView por detrás
  //   3. falling (700 → 1500ms) cristal se desvanece hacia arriba
  //   4. off                    estado limpio
  //
  // Si el user tiene prefers-reduced-motion: scroll seco sin overlay.
  // ─────────────────────────────────────────────────────────────────
  const runDissolve = () => {
    const zone = eatTargetZoneRef.current;
    eatTargetZoneRef.current = null;

    // Limpieza de timers previos (si el user spamea bolas).
    dissolveTimersRef.current.forEach((t) => window.clearTimeout(t));
    dissolveTimersRef.current = [];

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !zone) {
      if (zone) requestAnimationFrame(() => scrollToZone(zone));
      return;
    }

    // FASE 1 — sube el cristal.
    setDissolvePhase('rising');

    // FASE 2 — totalmente cubierto. Es el momento de teleportarse: scrolleamos
    // a la zona destino mientras el viewport está 100% tapado por el vidrio.
    const t1 = window.setTimeout(() => {
      setDissolvePhase('covered');
      scrollToZone(zone);
    }, 600);

    // FASE 3 — el cristal se levanta y se desvanece, revelando la zona.
    const t2 = window.setTimeout(() => {
      setDissolvePhase('falling');
    }, 700);

    // FASE 4 — limpio. Listo para otro tap.
    const t3 = window.setTimeout(() => {
      setDissolvePhase('off');
    }, 1500);

    dissolveTimersRef.current = [t1, t2, t3];
  };

  // Cleanup al desmontar — evitamos timers huérfanos.
  useEffect(() => {
    return () => {
      dissolveTimersRef.current.forEach((t) => window.clearTimeout(t));
      if (eatTimeoutRef.current) window.clearTimeout(eatTimeoutRef.current);
    };
  }, []);

  // Aplicar playbackRate cuando cambia el state. Idle siempre 1.0.
  useEffect(() => {
    const v = videoElRef.current;
    if (!v) return;
    v.playbackRate = eatState === 'eating' ? EAT_SPEED : 1.0;
  }, [eatState, loopSrc]);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: '#0a0908',
        color: '#F3EFE6',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <style>{previewFullStyles}</style>

      {/* Grain sutil full page. */}
      <div className="pf-grain" aria-hidden />

      {/* ============ MINI-DOCK TOP · nav flotante persistente ============
          Aparece al scrollear más allá del hero. Muestra las 4 zonas como
          pills chicas liquid-glass, con la activa marcada. Click hace
          scrollIntoView. Queda fixed top-right, fuera del slab hero. */}
      <MiniDockTop onTabClick={(t) => {
        const el = document.getElementById(t.targetId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />

      {/* ============ CAFECITO FAB · botón flotante persistente ============
          Vive abajo-derecha en todos los viewports. Gotita liquid-glass
          con el orange firma. Click scrolleá a zone-cafecito (dentro de
          FotosCafecitoSlab). Siempre visible — es el CTA de conversión. */}
      <CafecitoFAB onTap={() => {
        const el = document.getElementById('zone-cafecito');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />

      {/* ─── PAGE-LEVEL AMBIENT · hilo cálido continuo que pasa detrás de los
          3 slabs y los ata en una sola atmósfera vidriosa. Absolute, full
          height de la página, detrás de todo via z-index. Solo desktop —
          en mobile los cards ocupan todo el ancho y no hay gap visible
          entre ellos donde el thread pueda leerse. */}
      <div className="pf-page-ambient hidden md:block" aria-hidden>
        <div className="pf-page-ambient-spine" />
        <div className="pf-page-ambient-blob pf-page-ambient-blob--a" />
        <div className="pf-page-ambient-blob pf-page-ambient-blob--b" />
        <div className="pf-page-ambient-blob pf-page-ambient-blob--c" />
      </div>

      {/* ============ HERO (viewport 1) — SLAB CENTRAL ============
          Cambio de paradigma vs versión anterior: en lugar de hero full-bleed
          con columnas izq/der, ahora todo vive adentro de un panel de vidrio
          ROUNDED centrado en el viewport (estilo Apple Liquid Glass del
          mockup 01). El viewport "afuera" es vacío oscuro con grain — el
          slab es el escenario donde pasa todo. */}
      <section
        id="zone-hero"
        className="pf-seamless-section pf-seamless-section--hero relative w-full flex items-center justify-center px-0 md:px-8 lg:px-10 pt-0 md:pt-6 pb-3 md:pb-4"
        style={{ background: '#0a0908' }}
      >
        {/* ─── APPLE INTELLIGENCE GLOW · fondo iridiscente detrás del slab.
            Conic-gradient rotando con hues pastel que respiran, blur fuerte,
            para que el void alrededor del slab tenga vida en vez de ser
            #000 plano. Visible en mobile y desktop. */}
        <div className="pf-ai-glow" aria-hidden>
          <div className="pf-ai-glow-ring" />
          <div className="pf-ai-glow-ring pf-ai-glow-ring--b" />
          <div className="pf-ai-glow-veil" />
        </div>

        {/* Halo ambiente fuera del slab — soft glow que filtra los colores
            de los orbes a través del void. Sutil, casi imperceptible. */}
        <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden>
          <div className="pf-hero-blob" style={{ top: '8%',  left: '-2%',  background: ORBS[0].color, animationDelay: '0s', opacity: 0.15 }} />
          <div className="pf-hero-blob" style={{ top: '14%', right: '-4%', background: ORBS[1].color, animationDelay: '3s', opacity: 0.15 }} />
          <div className="pf-hero-blob" style={{ bottom: '4%', left: '-2%', background: ORBS[2].color, animationDelay: '6s', opacity: 0.12 }} />
          <div className="pf-hero-blob" style={{ bottom: '8%', right: '-4%', background: ORBS[3].color, animationDelay: '9s', opacity: 0.12 }} />
        </div>

        {/* ─── EL SLAB ─── Panel de vidrio rounded que contiene TODO el hero.
            El video va adentro (clipped por overflow:hidden), el nav arriba,
            el título a la izquierda, los orbes orbitan el retrato y la barra
            de píldoras abajo al centro. */}
        <div className="pf-slab relative w-full max-w-[1440px] mx-auto h-[95vh] md:h-[74vh] rounded-t-none rounded-b-[28px] md:rounded-[36px] overflow-hidden">

          {/* CAPA -1 · Ambiente interno · resplandor cálido que simula el
              humo del retrato filtrándose atrás del vidrio. Vive ADENTRO
              del slab (clipped por overflow:hidden) y ABAJO del video en
              document-order → en la mitad derecha lo tapa el retrato, en
              la izquierda (void) tiñe todo el panel con el humo.
              Sólo desktop: en mobile el video ocupa el slab entero y
              estos layers quedarían invisibles. */}
          <div className="pf-hero-ambient absolute inset-0 pointer-events-none hidden md:block" aria-hidden>
            <div className="pf-hero-ambient-halo" />
            <div className="pf-hero-ambient-column" />
            <div className="pf-hero-ambient-floor" />
          </div>

          {/* CAPA 0 · Video — wrapper que lo constraina a la mitad derecha
              del slab. Así la mitad izquierda queda en fondo total black
              (para el título multimedia) y en la derecha se ve el retrato
              encuadrado de hombros para arriba (object-fit cover + position
              vertical calibrado al rostro). El wrapper aplica el fade
              IZQUIERDO (cabeza → void), y el video dentro aplica el fade
              INFERIOR (hombros → pillbar). Máscaras separadas en padre/hijo
              para evitar composición compleja. */}
          <div
            className="pf-slab-video-wrap absolute inset-y-0 right-0 pointer-events-none overflow-hidden"
          >
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
              className="absolute inset-0 w-full h-full"
              style={{
                /* cover dentro del wrapper 56%-wide. objectPosition Y=62%
                   baja el encuadre para mostrar hombros+cuello+cabeza
                   con el humo saliendo por arriba. */
                objectFit: 'cover',
                objectPosition: '50% 62%',
                transform:
                  dissolvePhase === 'rising' || dissolvePhase === 'covered'
                    ? 'translateY(4%) scale(1.04)'
                    : 'translateY(0) scale(1.02)',
                transition: 'transform 600ms cubic-bezier(.4,0,.2,1)',
                filter:
                  dissolvePhase === 'rising' || dissolvePhase === 'covered'
                    ? 'brightness(0.55) blur(2px)'
                    : 'none',
                WebkitMaskImage:
                  'linear-gradient(180deg, #000 0%, #000 72%, rgba(0,0,0,0.6) 88%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(180deg, #000 0%, #000 72%, rgba(0,0,0,0.6) 88%, rgba(0,0,0,0) 100%)',
              }}
            />
          </div>

          {/* CAPA 1 · Tint mínimo — casi imperceptible. El fondo ya es
              #000 puro, así que no hace falta viñeta ni gradientes pesados.
              Sólo un top-highlight muy sutil que vende el "vidrio". */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 18%)',
            }}
          />

          {/* ─── TOP NAV · pegado al borde superior del slab ─── */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-4 md:py-5 pointer-events-none">
            {/* Logo + eyebrow */}
            <div className="flex items-center gap-3 md:gap-4 pointer-events-auto">
              <div className="pf-slab-logo">m</div>
              <div className="pf-slab-eyebrow hidden sm:block">· zona 01</div>
            </div>
            {/* Nav links + dots menu */}
            <div className="flex items-center gap-5 md:gap-8 pointer-events-auto">
              <a href="#zone-multimedia" className="pf-slab-link hidden md:inline">inicio</a>
              <a href="#zone-sobre-mi" className="pf-slab-link hidden md:inline">acerca</a>
              <a href="#zone-trabajo" className="pf-slab-link hidden md:inline">contacto</a>
              <button type="button" className="pf-slab-dots" aria-label="más">
                <span /><span /><span />
              </button>
            </div>
          </div>

          {/* PLACA DE VIDRIO PROTECTORA → removida. Ya no hace falta: el
              video vive constrained a la derecha (56% wrapper), la mitad
              izquierda queda en fondo #000 puro del slab, legibilidad
              garantizada para el título. */}

          {/* ─── COLUMNA IZQUIERDA · título editorial + tagline + cta hint ───
              Mobile: sólo el título "Balosky"; el eyebrow, subtitle y hint
              quedan hidden para que el retrato + los 4 orbes respiren sin
              competencia. Desktop sigue con el layout completo (lo ajustamos
              en otra pasada). */}
          <div className="absolute top-[18%] md:top-[22%] left-6 md:left-10 z-30 max-w-[88%] md:max-w-[42%] lg:max-w-[40%] pointer-events-none">
            <div className="pf-slab-microeyebrow mb-2 md:mb-3 hidden md:block">música · wallpapers · fotos</div>
            <h1 className="pf-slab-title">
              <span className="pf-slab-title-accent">Balosky</span>
            </h1>
            <p className="pf-slab-sub mt-3 md:mt-5 hidden md:block">todo junto, atrás del mismo cristal.</p>
            {eatState === 'idle' && (
              <div className="pf-slab-hint mt-6 md:mt-8 pointer-events-auto hidden md:flex">
                <span>bajá para descubrir</span>
                <span className="pf-slab-hint-arrow">↓</span>
              </div>
            )}
          </div>

          {/* ─── ORBES · orbitando el retrato ───
              Sólo mobile: en desktop el pillbar de abajo ya hace de nav
              y los orbes taparían el retrato. En mobile, donde la cara
              es más chica y el pillbar compite por espacio, los orbes
              aportan personalidad + son un target táctil grande. */}
          <div
            className="absolute inset-0 z-30 transition-opacity duration-300 md:hidden"
            style={{
              opacity: eatState === 'eating' ? 0 : 1,
              pointerEvents: eatState === 'eating' ? 'none' : 'auto',
            }}
          >
            {ORBS.map((o, i) => {
              const x = device === 'desktop' ? o.xDesktop : o.xMobile;
              const y = device === 'desktop' ? o.yDesktop : o.yMobile;
              const labelDir = device === 'desktop' ? o.labelDirDesktop : o.labelDirMobile;
              // Featured orb: ~1.55× más grande en desktop, sin escala extra en mobile
              const ringSize = o.featured
                ? (device === 'desktop' ? RING_SIZE_VMIN * 1.55 : RING_SIZE_VMIN * 1.15)
                : (device === 'desktop' ? RING_SIZE_VMIN * 0.72 : RING_SIZE_VMIN * 0.95);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleOrbClick(o)}
                  className={`pf-orb${o.featured ? ' pf-orb--featured' : ' pf-orb--satellite'}`}
                  style={{
                    left: x,
                    top: y,
                    color: o.color,
                    ['--ring-size' as any]: `${ringSize}vmin`,
                    animationDelay: `${i * 0.25}s`,
                  }}
                  aria-label={`${o.label} — bajar a ${o.zone}`}
                >
                  <span className="pf-orb-glow" />
                  <span className="pf-orb-sphere" />
                  <span className="pf-orb-spec" />
                  <span className={`pf-orb-label pf-orb-label--${labelDir}`}>{o.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── BOTTOM PILL BAR · REEMPLAZADO por MiniDockTop flotante.
              Lo dejamos en el DOM pero hidden para conservar código
              mientras se prueba el nuevo pattern. Borrar si no vuelve. */}
          {false && eatState === 'idle' && (
            <div className="pf-pillbar hidden absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30">
              <div className="pf-pillbar-inner">
                {SLAB_PILLS.map((p) => {
                  // Color del pill = color del orbe de su zona, si tiene zona.
                  const orbColor = p.zone ? ORBS.find((o) => o.zone === p.zone)?.color : '#F3EFE6';
                  const onClick = () => {
                    if (p.href) {
                      window.location.href = p.href;
                      return;
                    }
                    if (p.zone) {
                      setDissolveTint(orbColor || '#F4B37E');
                      setDissolveLabel(labelForZone(p.zone));
                      eatTargetZoneRef.current = p.zone;
                      runDissolve();
                    }
                  };
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={onClick}
                      className="pf-pill"
                      style={{ ['--pill-color' as any]: orbColor }}
                      aria-label={`${p.label} — ${p.sub}`}
                    >
                      <svg className="pf-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={p.iconPath} />
                      </svg>
                      <div className="pf-pill-text">
                        <div className="pf-pill-label">{p.label}</div>
                        <div className="pf-pill-sub">{p.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Borde highlight sutil interno del slab (encima de todo) */}
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none pf-slab-rim" aria-hidden />
        </div>
      </section>

      {/* ============ ZONA TRABAJO · REAL (services-first flow) ============
          Viene PRIMERO después del hero porque es lo principal: cafecito,
          canción IA, pack imágenes IA, 1:1 ($100k featured) + memberships.
          El user eligió "cards de servicios directas". */}
      <TrabajoZone onNavigate={(href) => { window.location.href = href; }} />

      {/* ============ ZONA IDEAS · placeholder ============
          Video IA vertical + collage de frames alrededor. Contenido en
          construcción — por ahora muestra la intención visual. */}
      <PlaceholderZone
        id="zone-ideas"
        eyebrow="ZONA 02 · IDEAS"
        title="ideas"
        tint="#9FD9E0"
        description="videos IA con storyboard · notebookLLM · ensayos · reflexiones. la parte bloguera — lo que pienso, lo que armo, lo que improviso."
        kicker="en construcción · pronto"
      />

      {/* ============ ZONA MULTIMEDIA · música + wallpapers + fotos ============
          Bloque triple: MusicaSlab (intro + tracks), MultimediaHub (sólo
          wallpapers en modo compact) y FotosCafecitoSlab (lightbox + cafecito
          tier cards). Queda adentro de la zona "multimedia" (fun/side
          content — no es lo principal). */}
      <MusicaSlab activeTab="multimedia" />
      <MultimediaHub skipMusica skipFotos compact />
      <FotosCafecitoSlab activeTab="multimedia" />

      {/* ============ ZONA SOBRE MÍ · placeholder ============
          Bio editorial + retrato + links redes. */}
      <PlaceholderZone
        id="zone-sobre-mi"
        eyebrow="ZONA 04 · SOBRE MÍ"
        title="sobre mí"
        tint="#F26FA6"
        description="santi balosky · creador, músico, experimentador IA. instagram, spotify, youtube — abajo en el dock. si querés escribirme, el cafecito también lleva a ahí."
        kicker="bio corta · pronto la larga"
      />

      {/* Cierre — nota humana y corta. */}
      <div className="relative px-4 md:px-16 mt-6 mb-20 text-center text-white/40 text-sm">
        también podés dejarme un mensaje en el{' '}
        <a href="/#muro" className="underline underline-offset-4 hover:text-white/80 transition-colors">
          muro
        </a>
        . leo todos.
      </div>

      {/* Footer minimal. */}
      <footer className="relative px-4 md:px-16 py-12 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-mono">
          balosky · preview full
        </div>
      </footer>

      {/* ============ DISSOLVE OVERLAY ============
          Vidrio esmerilado que sube → tapa → cae. Es la transición
          cinematográfica entre hero y zona destino. Va `fixed inset-0`
          con el panel adentro moviéndose por keyframes según la phase.
          aria-hidden porque es decorativo y dura <2s. */}
      {dissolvePhase !== 'off' && (
        <div className="fixed inset-0 z-[55] pointer-events-none overflow-hidden" aria-hidden>
          <div
            className={`pf-glass pf-glass--${dissolvePhase}`}
            style={{
              // Vidrio esmerilado: blur fuerte + saturate + tinte del orbe.
              backdropFilter: 'blur(28px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
              background: `linear-gradient(180deg, ${dissolveTint}1f 0%, rgba(10,9,8,0.6) 50%, rgba(10,9,8,0.88) 100%)`,
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Borde inferior del cristal con glow del color del orbe —
                es la luz "filtrándose desde abajo" a través del vidrio. */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${dissolveTint}cc 50%, transparent 100%)`,
                boxShadow: `0 0 32px 4px ${dissolveTint}88`,
                opacity: dissolvePhase === 'falling' ? 0.4 : 1,
                transition: 'opacity 400ms ease',
              }}
            />
            {/* Cartel sutil del destino — aparece cuando estamos cubiertos. */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                opacity: dissolvePhase === 'covered' || dissolvePhase === 'falling' ? 1 : 0,
                transition: 'opacity 300ms ease',
              }}
            >
              <div
                className="text-[11px] tracking-[0.4em] uppercase font-mono"
                style={{ color: `${dissolveTint}dd`, textShadow: `0 0 18px ${dissolveTint}66` }}
              >
                ↓ {dissolveLabel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle demo — siempre visible abajo-izq. */}
      <button
        onClick={() => setDemoMode((v) => !v)}
        className="fixed bottom-5 left-5 z-[60] px-3 py-2 rounded-full bg-white/5 backdrop-blur-md text-white/80 text-[10px] font-mono tracking-[0.18em] uppercase border border-white/15 hover:bg-white/15 hover:text-white transition-colors"
        title={demoMode ? 'Salir del modo presentación' : 'Entrar en modo presentación'}
      >
        {demoMode ? '× demo' : '◐ demo'}
      </button>

      {/* Chip dev — sólo fuera de demoMode. */}
      {!demoMode && (
        <div className="fixed bottom-5 right-5 z-[60] px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/70 text-[9px] font-mono tracking-wider uppercase pointer-events-none">
          /preview-full · {device} · {eatState === 'eating' ? `comiendo: ${eatingOrbId}` : 'idle'}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * MusicaSlab · zona MÚSICA en el lenguaje Liquid Glass Neon (Variación 04
 * del último mockup). Layout: sidebar izquierda con tabs verticales + DEMO,
 * main content con retrato semi-transparente detrás, eyebrow naranja,
 * título grande, subtítulo, grid 2-col de tracks, CTA centered. En mobile
 * el sidebar desaparece y en su lugar aparece bottom tab bar con iconos.
 * Glows ambient a izq (naranja) y der (rosa/turquesa) bleeding por los
 * bordes redondeados del slab.
 * ----------------------------------------------------------------------- */
function MusicaSlab({ activeTab }: { activeTab: ZoneTabId }) {
  const handleTabClick = (tab: ZoneTab) => {
    const el = document.getElementById(tab.targetId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="pf-seamless-section relative w-full px-4 md:px-8 lg:px-10 pt-2 md:pt-3 pb-3 md:pb-5"
      style={{ background: '#0a0908' }}
    >
      {/* ─── GLOWS AMBIENT atrás del slab — neon bleed ─── */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden>
        <div className="pf-musica-glow pf-musica-glow--orange" />
        <div className="pf-musica-glow pf-musica-glow--cyan" />
        <div className="pf-musica-glow pf-musica-glow--pink" />
      </div>

      <div
        id="zone-multimedia"
        data-zone="multimedia"
        className="pf-musica-slab relative w-full max-w-[1440px] mx-auto rounded-[28px] md:rounded-[36px] overflow-hidden"
        style={{ scrollMarginTop: '24px' }}
      >
        {/* CAPA 0 · Retrato semi-transparente — detrás de TODO el contenido,
            posicionado a la derecha del título. Solo desktop. */}
        <div className="pf-musica-portrait hidden md:block" aria-hidden>
          <img src="/uploads/balosky-portrait.jpg" alt="" />
        </div>

        {/* CAPA 1 · gradiente vinieta para legibilidad */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              'linear-gradient(90deg, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.3) 50%, rgba(10,9,8,0.7) 100%)',
          }}
        />

        {/* ─── DESKTOP LAYOUT · top-nav + content + bottom-dock ───
            Mismo patrón que fotos+cafecito para alinear el eje entre slabs.
            Logo a la izq del top-nav (x=40 desde borde del slab), tabs
            horizontales en el centro, search+menú a la derecha. Abajo,
            dock centrado con DEMO + zone-pills, matching el flow. */}
        <div className="hidden md:block relative z-10">
          {/* Top nav */}
          <div className="pf-zoneslab-topnav px-10 pt-6 relative z-20">
            <div className="pf-zoneslab-topnav-brand">
              <div className="pf-slab-logo">m</div>
            </div>
            <div className="pf-zoneslab-topnav-center">
              <nav className="pf-zoneslab-pillnav" aria-label="zonas">
                {ZONE_TABS.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTabClick(t)}
                    className={`pf-zonetab ${activeTab === t.id ? 'pf-zonetab--active' : ''}`}
                    style={{ ['--tab-color' as any]: t.color }}
                    aria-current={activeTab === t.id ? 'page' : undefined}
                  >
                    <span>{t.label}</span>
                    {activeTab === t.id && <span className="pf-zonetab-underline" aria-hidden />}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pf-zoneslab-topnav-actions">
              <button type="button" className="pf-zonenav-icon" aria-label="buscar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </button>
              <button type="button" className="pf-zonenav-menu" aria-label="menú">
                <span>menú</span>
                <span className="pf-zonenav-menu-dots" aria-hidden>
                  <span /><span /><span /><span /><span /><span /><span /><span /><span />
                </span>
              </button>
            </div>
          </div>

          {/* Main · header + tracks + cta. Eje izquierdo en x=40 (pf-musica-main). */}
          <div className="pf-musica-main">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <div className="pf-zoneslab-eyebrow">· sonido</div>
              <h2 className="pf-musica-title">música</h2>
              <p className="pf-musica-sub">lo que estoy haciendo este año</p>
            </div>

            {/* Tracks 2-col */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3 mb-6">
              {DEMO_TRACKS.map((t) => (
                <TrackRow key={t.id} track={t} />
              ))}
            </div>
          </div>

          {/* Bottom dock · DEMO toggle + CTA + bell */}
          <div className="flex items-center justify-between gap-4 px-10 pb-6 pt-2 relative z-20">
            <div className="pf-zoneslab-demo">
              <span className="pf-zoneslab-demo-dot" aria-hidden />
              demo
            </div>
            <a href="/portfolio" className="pf-zoneslab-cta">
              <span>ver todo el catálogo</span>
              <span className="pf-zoneslab-cta-arrow">→</span>
            </a>
            <button type="button" className="pf-zonenav-icon" aria-label="notificaciones">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── MOBILE LAYOUT · stack vertical, top logo+menu, bottom tab bar ─── */}
        <div className="md:hidden relative z-10 px-4 pt-4 pb-20">
          {/* Top: logo + MENU */}
          <div className="flex items-center justify-between mb-4">
            <div className="pf-slab-logo">m</div>
            <button type="button" className="pf-zonenav-menu" aria-label="menú">
              <span>menú</span>
              <span className="pf-zonenav-menu-dots" aria-hidden>
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </span>
            </button>
          </div>
          {/* Header */}
          <div className="mb-5">
            <div className="pf-zoneslab-eyebrow">· sonido</div>
            <h2 className="pf-musica-title">música</h2>
            <p className="pf-musica-sub">lo que estoy haciendo este año</p>
          </div>
          {/* Tracks single col */}
          <div className="flex flex-col gap-2 mb-6">
            {DEMO_TRACKS.map((t) => (
              <TrackRow key={t.id} track={t} />
            ))}
          </div>
          {/* CTA */}
          <div className="flex justify-center mb-4">
            <a href="/portfolio" className="pf-zoneslab-cta">
              <span>ver todo el catálogo</span>
              <span className="pf-zoneslab-cta-arrow">→</span>
            </a>
          </div>
          {/* Bottom tab bar */}
          <nav className="pf-mobile-tabbar">
            {ZONE_TABS.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabClick(t)}
                className={`pf-mobile-tab ${activeTab === t.id ? 'pf-mobile-tab--active' : ''}`}
                style={{ ['--tab-color' as any]: t.color }}
              >
                <DockIcon id={t.id} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Borde rim del slab encima de todo */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none pf-slab-rim z-20" aria-hidden />
      </div>
    </section>
  );
}

/* TrackRow · una fila de track tipo glass-pill (mockup Variación 1) */
function TrackRow({ track }: { track: DemoTrack }) {
  return (
    <button type="button" className="pf-trackrow group">
      {/* Play button — disco naranja con triángulo */}
      <span className="pf-trackrow-play" aria-hidden>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      {/* Texto */}
      <span className="pf-trackrow-text">
        <span className="pf-trackrow-title">{track.title}</span>
        <span className="pf-trackrow-sub">
          {track.sub} · {track.duration}
        </span>
      </span>
      {/* PLAY → arrow */}
      <span className="pf-trackrow-cta">
        play <span aria-hidden>›</span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------
 * FotosCafecitoSlab · Variación 5 — slab combinado fotos + cafecito.
 * Desktop: 2 columnas (fotos lightbox a la izq + tier cards a la der), top
 * nav y bottom dock. Mobile: stacked vertical, scroll horizontal de fotos,
 * tier cards en stack, bottom tab bar.
 * ----------------------------------------------------------------------- */
function FotosCafecitoSlab({ activeTab }: { activeTab: ZoneTabId }) {
  const [fotoIdx, setFotoIdx] = useState(0);
  const total = FOTO_SAMPLES.length;
  const active = FOTO_SAMPLES[fotoIdx];

  const handleTabClick = (tab: ZoneTab) => {
    const el = document.getElementById(tab.targetId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const next = () => setFotoIdx((i) => (i + 1) % total);
  const prev = () => setFotoIdx((i) => (i - 1 + total) % total);

  return (
    <section
      className="pf-seamless-section relative w-full px-4 md:px-8 lg:px-10 pt-2 md:pt-3 pb-6 md:pb-10"
      style={{ background: '#0a0908' }}
    >
      {/* GLOWS AMBIENT atrás del slab */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden>
        <div className="pf-fc-glow pf-fc-glow--cyan" />
        <div className="pf-fc-glow pf-fc-glow--pink" />
        <div className="pf-fc-glow pf-fc-glow--amber" />
      </div>

      <div
        id="zone-cafecito"
        data-zone="cafecito"
        className="pf-fc-slab relative w-full max-w-[1440px] mx-auto rounded-[28px] md:rounded-[36px] overflow-hidden"
        style={{ scrollMarginTop: '24px' }}
      >
        {/* Fotos ahora vive dentro de zone-multimedia — este anchor queda legacy. */}

        {/* ─── DESKTOP · top nav ─── */}
        <div className="hidden md:grid pf-zoneslab-topnav px-10 pt-6 relative z-20">
          <div className="pf-zoneslab-topnav-brand">
            <div className="pf-slab-logo">m</div>
          </div>
          <div className="pf-zoneslab-topnav-center">
            <nav className="pf-zoneslab-pillnav" aria-label="zonas">
              {ZONE_TABS.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabClick(t)}
                  className={`pf-zonetab ${activeTab === t.id ? 'pf-zonetab--active' : ''}`}
                  style={{ ['--tab-color' as any]: t.color }}
                  aria-current={activeTab === t.id ? 'page' : undefined}
                >
                  <span>{t.label}</span>
                  {activeTab === t.id && <span className="pf-zonetab-underline" aria-hidden />}
                </button>
              ))}
            </nav>
          </div>
          <div className="pf-zoneslab-topnav-actions">
            <button type="button" className="pf-zonenav-icon" aria-label="buscar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <button type="button" className="pf-zonenav-menu" aria-label="menú">
              <span>menú</span>
              <span className="pf-zonenav-menu-dots" aria-hidden>
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </span>
            </button>
          </div>
        </div>

        {/* ─── DESKTOP · 2-col grid ─── */}
        <div className="hidden md:grid pf-fc-grid relative z-10">
          {/* LEFT · fotos */}
          <div className="pf-fc-fotos">
            <div className="pf-fc-eyebrow" style={{ color: '#9FD9E0' }}>03 · ojo</div>
            <h2 className="pf-fc-title">fotos</h2>
            <p className="pf-fc-sub">lo que vi</p>

            {/* Foto principal con prev/next + counter */}
            <div className="pf-fc-photo-main">
              <img src={active.src} alt={active.alt} />
              <div className="pf-fc-photo-counter">
                · {String(fotoIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={prev}
                className="pf-fc-photo-nav pf-fc-photo-nav--prev"
                aria-label="foto anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                className="pf-fc-photo-nav pf-fc-photo-nav--next"
                aria-label="foto siguiente"
              >
                ›
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="pf-fc-thumbs">
              {FOTO_SAMPLES.slice(0, 6).map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFotoIdx(i)}
                  className={`pf-fc-thumb ${i === fotoIdx ? 'pf-fc-thumb--active' : ''}`}
                  aria-label={f.alt}
                >
                  <img src={f.src} alt="" />
                </button>
              ))}
              <a
                href="/portfolio?type=foto"
                className="pf-fc-thumb pf-fc-thumb--more"
                aria-label="ver más fotos"
              >
                <span>ver<br/>más</span>
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {/* RIGHT · cafecito column */}
          <div className="pf-fc-cafe">
            <div className="pf-fc-eyebrow" style={{ color: '#F26FA6' }}>04 · apoyo</div>
            <h2 className="pf-fc-title pf-fc-title--sm">cafecito</h2>
            <p className="pf-fc-sub" style={{ marginBottom: 24 }}>
              si lo que hago te cambia algo del día, podés invitarme algo — o bancar todo el año. gracias es poco.
            </p>
            <div className="pf-fc-tiers">
              {CAFECITO_TIERS_V5.map((t) => (
                <CafeTierCard key={t.id} tier={t} />
              ))}
            </div>
            <a href="/#cafecito" className="pf-fc-cta">
              <span>ver todo el catálogo</span>
              <span className="pf-zoneslab-cta-arrow">→</span>
            </a>
          </div>
        </div>

        {/* ─── DESKTOP · bottom dock (DEMO + pillbar + bell+avatar) ─── */}
        <div className="hidden md:flex items-center justify-between gap-4 px-10 pb-6 pt-2 relative z-20">
          <div className="pf-zoneslab-demo">
            <span className="pf-zoneslab-demo-dot" aria-hidden />
            demo
          </div>
          <nav className="pf-fc-dock" aria-label="zonas">
            {ZONE_TABS.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabClick(t)}
                className={`pf-fc-dock-pill ${activeTab === t.id ? 'pf-fc-dock-pill--active' : ''}`}
                style={{ ['--tab-color' as any]: t.color }}
              >
                <DockIcon id={t.id} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button type="button" className="pf-zonenav-icon" aria-label="notificaciones">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </button>
            <div className="pf-fc-avatar" aria-hidden>
              <img src="/uploads/balosky-portrait.jpg" alt="" />
            </div>
          </div>
        </div>

        {/* ─── MOBILE · stacked layout ─── */}
        <div className="md:hidden relative z-10 px-4 pt-4 pb-24">
          {/* Top */}
          <div className="flex items-center justify-between mb-5">
            <div className="pf-slab-logo">m</div>
            <button type="button" className="pf-zonenav-menu" aria-label="menú">
              <span>menú</span>
              <span className="pf-zonenav-menu-dots" aria-hidden>
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </span>
            </button>
          </div>

          {/* Fotos block */}
          <div className="mb-3">
            <div className="pf-fc-eyebrow" style={{ color: '#9FD9E0' }}>03 · ojo</div>
            <h2 className="pf-fc-title pf-fc-title--mobile">fotos</h2>
            <p className="pf-fc-sub" style={{ marginBottom: 12 }}>lo que vi</p>
          </div>
          <div className="pf-fc-thumbs-scroll">
            {FOTO_SAMPLES.map((f) => (
              <div key={f.id} className="pf-fc-thumb-mobile">
                <img src={f.src} alt={f.alt} />
              </div>
            ))}
          </div>
          <a
            href="/portfolio?type=foto"
            className="pf-fc-cta pf-fc-cta--ghost pf-fc-cta--block"
            style={{ marginTop: 12, marginBottom: 28 }}
          >
            <span>deslizá para ver más</span>
            <span className="pf-zoneslab-cta-arrow">→</span>
          </a>

          {/* Cafecito block */}
          <div className="mb-4">
            <div className="pf-fc-eyebrow" style={{ color: '#F26FA6' }}>04 · apoyo</div>
            <h2 className="pf-fc-title pf-fc-title--mobile">cafecito</h2>
            <p className="pf-fc-sub" style={{ marginBottom: 16 }}>
              si lo que hago te cambia algo del día, podés invitarme algo — o bancar todo el año. gracias es poco.
            </p>
          </div>
          <div className="pf-fc-tiers">
            {CAFECITO_TIERS_V5.map((t) => (
              <CafeTierCard key={t.id} tier={t} />
            ))}
          </div>
          <a
            href="/#cafecito"
            className="pf-fc-cta pf-fc-cta--block"
            style={{ marginTop: 18 }}
          >
            <span>ver todo el catálogo</span>
            <span className="pf-zoneslab-cta-arrow">→</span>
          </a>

          {/* Bottom tab bar (mobile) */}
          <nav className="pf-mobile-tabbar">
            {ZONE_TABS.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabClick(t)}
                className={`pf-mobile-tab ${activeTab === t.id ? 'pf-mobile-tab--active' : ''}`}
                style={{ ['--tab-color' as any]: t.color }}
              >
                <DockIcon id={t.id} />
                <span>{t.label}</span>
              </button>
            ))}
            <button type="button" className="pf-mobile-tab" onClick={() => handleTabClick(ZONE_TABS[4])}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="5" cy="6" r="1.6" /><circle cx="12" cy="6" r="1.6" /><circle cx="19" cy="6" r="1.6" />
                <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
                <circle cx="5" cy="18" r="1.6" /><circle cx="12" cy="18" r="1.6" /><circle cx="19" cy="18" r="1.6" />
              </svg>
              <span>más</span>
            </button>
          </nav>
        </div>

        <div className="absolute inset-0 rounded-[inherit] pointer-events-none pf-slab-rim z-30" aria-hidden />
      </div>
    </section>
  );
}

/* Card individual de tier dentro del FotosCafecitoSlab. Usa --tier-color
   para el eyebrow + arrow. El featured (club) tiene tratamiento más
   prominente: fondo ligeramente más opaco, border tinted, glow lateral. */
function CafeTierCard({ tier }: { tier: CafeTierV5 }) {
  const href = tier.id === 'club' ? '/#club' : `/#cafecito?amount=${tier.amount}`;
  return (
    <a
      href={href}
      className={`pf-fc-tier ${tier.featured ? 'pf-fc-tier--featured' : ''}`}
      style={{ ['--tier-color' as any]: tier.color }}
    >
      <div className="pf-fc-tier-num">
        {tier.num} · {tier.label}
      </div>
      <div className="pf-fc-tier-body">
        <div className="pf-fc-tier-icon" aria-hidden>
          <CafeIcon icon={tier.icon} />
        </div>
        <div className="pf-fc-tier-text">
          {tier.title ? (
            <div className="pf-fc-tier-title">{tier.title}</div>
          ) : (
            <div className="pf-fc-tier-amount">${tier.amount?.toLocaleString('es-AR')}</div>
          )}
          <div className="pf-fc-tier-note">{tier.note}</div>
        </div>
        <div className="pf-fc-tier-arrow" aria-hidden>→</div>
      </div>
    </a>
  );
}

/* Iconos inline reutilizados por CafeTierCard y por el dock/tab-bar. */
function CafeIcon({ icon }: { icon: CafeIconId }) {
  switch (icon) {
    case 'coffee':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
          <path d="M17 9h2a3 3 0 0 1 0 6h-2" />
          <path d="M7 4v2M11 4v2M9 4v2" />
        </svg>
      );
    case 'leaf':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9 4 0 7 3 7 7 0 4-3 7-7 7-3 0-5-2-5-5 0-2 1-4 3-5" />
          <path d="M11 20c0-3 1-7 5-12" />
        </svg>
      );
    case 'pizza':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 19l9-15 9 15z" />
          <circle cx="9" cy="13" r="1" fill="currentColor" />
          <circle cx="13" cy="11" r="1" fill="currentColor" />
          <circle cx="14" cy="15" r="1" fill="currentColor" />
        </svg>
      );
    case 'crown':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7l4 4 5-7 5 7 4-4-2 13H5L3 7z" />
          <path d="M5 21h14" />
        </svg>
      );
  }
}

/* Icono del mini-dock top. Mapea las 4 zonas principales a un símbolo. */
function DockIcon({ id }: { id: ZoneTabId }) {
  switch (id) {
    case 'multimedia':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V6l12-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'ideas':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21h6M10 17v2h4v-2M12 3a7 7 0 0 0-4 12.7V17h8v-1.3A7 7 0 0 0 12 3z" />
        </svg>
      );
    case 'trabajo':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="12" rx="1.5" /><path d="M9 8V4h6v4M4 13h16" />
        </svg>
      );
    case 'sobre-mi':
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
  }
}

/* =========================================================================
 * MiniDockTop · nav flotante fixed arriba-derecha. Aparece al scrollear
 * más allá de ~70% del viewport (sale del hero). Muestra las 4 zonas del
 * hub como pills liquid-glass chicas, con la activa marcada por color.
 * ========================================================================= */
function MiniDockTop({ onTabClick }: { onTabClick: (tab: ZoneTab) => void }) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<ZoneTabId | null>(null);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      // Visible cuando pasamos ~80% del hero. En mobile baja el umbral
      // para aparecer antes (porque no hay pillbar).
      setVisible(y > vh * 0.7);

      // Cuál zona está más cerca del top del viewport — esa es la activa.
      const zones: ZoneTabId[] = ['multimedia', 'ideas', 'trabajo', 'sobre-mi'];
      let closest: { id: ZoneTabId | null; distance: number } = { id: null, distance: Infinity };
      for (const z of zones) {
        const el = document.getElementById(`zone-${z}`);
        if (!el) continue;
        const d = Math.abs(el.getBoundingClientRect().top - 80);
        if (d < closest.distance) closest = { id: z, distance: d };
      }
      setActive(closest.id);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className={`pf-minidock ${visible ? 'pf-minidock--visible' : ''}`}
      aria-label="navegación zonas"
    >
      {ZONE_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTabClick(t)}
          className={`pf-minidock-pill ${active === t.id ? 'pf-minidock-pill--active' : ''}`}
          style={{ ['--pill-color' as any]: t.color }}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <DockIcon id={t.id} />
          <span className="pf-minidock-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* =========================================================================
 * CafecitoFAB · botón persistente liquid-glass abajo-derecha. Gotita
 * naranja con el ícono de taza, siempre visible, levemente pulsando.
 * Click hace scroll al cafecito zone.
 * ========================================================================= */
function CafecitoFAB({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="pf-cafefab"
      aria-label="invitame un cafecito"
    >
      <span className="pf-cafefab-glow" aria-hidden />
      <span className="pf-cafefab-core">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
          <path d="M17 8h2a3 3 0 0 1 0 6h-2" />
          <path d="M7 4v2M11 4v2M9 4v2" />
        </svg>
      </span>
      <span className="pf-cafefab-label">cafecito</span>
    </button>
  );
}

/* =========================================================================
 * TrabajoZone · la zona de servicios real. Hero card con el 1:1 IA ($100k)
 * featured a la izquierda, grid de servicios a la derecha, y fila de
 * memberships abajo. Los trabajos a medida entran como pre-pedido; el pago
 * se define después de cotizar. El navigate() lo pasa el padre.
 * ========================================================================= */
type TrabajoService = {
  id: string;
  title: string;
  tagline: string;
  amount: number;
  blurb: string;
  points: string[];
  featured?: boolean;
  href: string;
};

const TRABAJO_SERVICES: TrabajoService[] = [
  {
    id: 'zoom1a1',
    title: '1:1 IA',
    tagline: '60min · zoom',
    amount: 100000,
    blurb: 'cara a cara. me contás tu proyecto, te devuelvo flows de IA reales.',
    points: [],
    featured: true,
    href: '/#prepedido-consultoria',
  },
  {
    id: 'pack-img',
    title: 'Pack imágenes',
    tagline: '5 visuales IA',
    amount: 80000,
    blurb: 'cinco imágenes a medida para tu marca o proyecto.',
    points: [],
    href: '/#prepedido-custom',
  },
  {
    id: 'cancion-ia',
    title: 'Canción IA',
    tagline: 'suno · a medida',
    amount: 25000,
    blurb: 'una canción original sobre tu tema. master + stems.',
    points: [],
    href: '/#prepedido-custom',
  },
  {
    id: 'cafecito-srv',
    title: 'Cafecito',
    tagline: 'aporte libre',
    amount: 3000,
    blurb: 'sin contraprestación. sólo bancar el contenido.',
    points: [],
    href: '/cafecito',
  },
];

type TrabajoTier = {
  id: string;
  name: string;
  amount: number;
  blurb: string;
  recommended?: boolean;
  href: string;
};

const TRABAJO_TIERS: TrabajoTier[] = [
  { id: 'base',    name: 'Base',           amount: 3000,  blurb: 'demos + muro privado · 10% off',        href: '/checkout?mode=baloskiers&tier=base' },
  { id: 'orbita',  name: 'Órbita',         amount: 9000,  blurb: 'vivo mensual · 25% off · early drops',  recommended: true, href: '/checkout?mode=baloskiers&tier=orbita' },
  { id: 'cerrada', name: 'Órbita cerrada', amount: 25000, blurb: 'zoom 1:1 trimestral · merch físico',    href: '/checkout?mode=baloskiers&tier=cerrada' },
];

function formatArs(n: number): string {
  return n.toLocaleString('es-AR');
}

function TrabajoZone({ onNavigate }: { onNavigate: (href: string) => void }) {
  const tint = '#F8E3B8';
  const [featured, ...rest] = TRABAJO_SERVICES;

  return (
    <section
      id="zone-trabajo"
      className="pf-placeholder-section pf-trabajo-section relative w-full px-4 md:px-8 lg:px-10 py-6 md:py-10"
      style={{ background: '#0a0908', scrollMarginTop: '24px' }}
    >
      <div
        className="pf-placeholder-slab pf-trabajo-slab relative w-full max-w-[1440px] mx-auto rounded-[28px] md:rounded-[36px] overflow-hidden px-6 md:px-12 py-12 md:py-16"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 20%, ${tint}1a 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 10% 90%, ${tint}12 0%, transparent 70%),
            linear-gradient(180deg, #0f0d0b 0%, #0a0908 100%)
          `,
        }}
      >
        <div className="pf-placeholder-rim" aria-hidden style={{ ['--rim-color' as any]: tint }} />

        {/* Header: eyebrow + título + descripción corta */}
        <div className="relative z-[2] max-w-[820px] mb-10 md:mb-14">
          <div className="pf-placeholder-eyebrow" style={{ color: tint }}>
            ZONA 01 · TRABAJO
          </div>
          <h2 className="pf-placeholder-title">trabajo</h2>
          <p className="pf-placeholder-desc">
            servicios reales, alcance claro. primero pre-pedido; si cierra,
            recién ahí te paso el pago.
          </p>
        </div>

        {/* Featured service · 1:1 IA $100k */}
        <div
          className="pf-trabajo-hero relative z-[2] rounded-[24px] md:rounded-[28px] overflow-hidden mb-6 md:mb-8 p-6 md:p-10"
          style={{
            background: `
              radial-gradient(ellipse 60% 100% at 100% 0%, ${tint}1a 0%, transparent 55%),
              linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)
            `,
          }}
        >
          <div className="pf-trabajo-hero-rim" aria-hidden style={{ ['--rim-color' as any]: tint }} />
          <div className="relative z-[2] grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-12 items-start">
            <div>
              <div className="pf-trabajo-chip" style={{ ['--chip-color' as any]: tint }}>
                <span className="pf-trabajo-chip-dot" />
                más pedido · featured
              </div>
              <h3 className="pf-trabajo-hero-title">{featured.title}</h3>
              <div className="pf-trabajo-hero-tag">{featured.tagline}</div>
              <p className="pf-trabajo-hero-blurb">{featured.blurb}</p>
              <ul className="pf-trabajo-points">
                {featured.points.map((p) => (
                  <li key={p}><span className="pf-trabajo-points-dot" style={{ background: tint }} />{p}</li>
                ))}
              </ul>
            </div>
            <div className="pf-trabajo-hero-side">
              <div className="pf-trabajo-hero-price">
                <span className="pf-trabajo-hero-price-currency">$</span>
                <span className="pf-trabajo-hero-price-num">{formatArs(featured.amount)}</span>
              </div>
              <div className="pf-trabajo-hero-price-sub">referencia · se cotiza antes de pagar</div>
              <button
                type="button"
                className="pf-trabajo-cta pf-trabajo-cta--primary"
                onClick={() => onNavigate(featured.href)}
              >
                consultar 1:1
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <div className="pf-trabajo-hero-fineprint">mandás pre-pedido, te respondo alcance y coordinamos horario</div>
            </div>
          </div>
        </div>

        {/* Grid de otros servicios — 3 cards */}
        <div className="pf-trabajo-grid relative z-[2] grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {rest.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.href)}
              className="pf-trabajo-card text-left"
            >
              <div className="pf-trabajo-card-rim" aria-hidden />
              <div className="pf-trabajo-card-inner">
                <div className="pf-trabajo-card-head">
                  <h4 className="pf-trabajo-card-title">{s.title}</h4>
                  <div className="pf-trabajo-card-price">
                    <span className="pf-trabajo-card-price-cur">$</span>
                    {formatArs(s.amount)}
                  </div>
                </div>
                <div className="pf-trabajo-card-tag">{s.tagline}</div>
                <p className="pf-trabajo-card-blurb">{s.blurb}</p>
                <div className="pf-trabajo-card-cta">
                  elegir
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Divider + memberships row */}
        <div className="relative z-[2] mt-10 md:mt-14 pt-8 md:pt-10 pf-trabajo-divider">
          <div className="flex items-baseline justify-between gap-4 mb-5 md:mb-7 flex-wrap">
            <div>
              <div className="pf-trabajo-sub-eyebrow">membresías · mensuales</div>
              <div className="pf-trabajo-sub-title">sumate al club</div>
            </div>
            <div className="pf-trabajo-sub-copy">bancar mes a mes · cancelar cuando quieras</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {TRABAJO_TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate(t.href)}
                className={`pf-trabajo-tier text-left ${t.recommended ? 'pf-trabajo-tier--rec' : ''}`}
              >
                {t.recommended && <div className="pf-trabajo-tier-badge">recomendada</div>}
                <div className="pf-trabajo-tier-name">{t.name}</div>
                <div className="pf-trabajo-tier-price">
                  <span className="pf-trabajo-tier-price-cur">$</span>
                  {formatArs(t.amount)}
                  <span className="pf-trabajo-tier-price-suf"> /mes</span>
                </div>
                <p className="pf-trabajo-tier-blurb">{t.blurb}</p>
                <div className="pf-trabajo-tier-cta">
                  elegir
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
 * PlaceholderZone · card minimal con eyebrow + título + descripción +
 * kicker. Se usa como placeholder para Ideas / Trabajo / Sobre mí mientras
 * se construye el contenido real. Usa el tint como acento.
 * ========================================================================= */
function PlaceholderZone({
  id,
  eyebrow,
  title,
  tint,
  description,
  kicker,
}: {
  id: string;
  eyebrow: string;
  title: string;
  tint: string;
  description: string;
  kicker: string;
}) {
  return (
    <section
      id={id}
      className="pf-placeholder-section relative w-full px-4 md:px-8 lg:px-10 py-6 md:py-10"
      style={{ background: '#0a0908', scrollMarginTop: '24px' }}
    >
      <div
        className="pf-placeholder-slab relative w-full max-w-[1440px] mx-auto rounded-[28px] md:rounded-[36px] overflow-hidden px-6 md:px-14 py-14 md:py-20"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 30%, ${tint}14 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 20% 80%, ${tint}0f 0%, transparent 70%),
            linear-gradient(180deg, #0f0d0b 0%, #0a0908 100%)
          `,
        }}
      >
        <div className="pf-placeholder-rim" aria-hidden style={{ ['--rim-color' as any]: tint }} />
        <div className="relative z-[2] max-w-[720px]">
          <div
            className="pf-placeholder-eyebrow"
            style={{ color: tint }}
          >
            {eyebrow}
          </div>
          <h2 className="pf-placeholder-title">
            {title}
          </h2>
          <p className="pf-placeholder-desc">
            {description}
          </p>
          <div className="pf-placeholder-kicker">
            <span className="pf-placeholder-kicker-dot" style={{ background: tint }} />
            {kicker}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------
 * Estilos locales — copian el lenguaje de loop-orb del HeroPreview para
 * mantener pulsadores idénticos. Prefijados con pf- para no colisionar.
 * ----------------------------------------------------------------------- */
const previewFullStyles = `
.pf-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.06;
  z-index: 1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: overlay;
}

/* ─── Orbe sólido 3D (Liquid Glass) ───
   Estructura de 3 capas apiladas:
     .pf-orb-glow   → aura externa blurreada, del color del orbe
     .pf-orb-sphere → cuerpo 3D con gradiente radial (specular → body → edge)
     .pf-orb-spec   → highlight especular puntual arriba-izq
   El wrapper .pf-orb respira (breath) muy sutil para que no quede estático. */
@keyframes pf-orb-breath {
  0%, 100% { transform: translate(-50%, -50%) scale(1);    }
  50%      { transform: translate(-50%, -50%) scale(1.04); }
}
@keyframes pf-orb-glow-pulse {
  0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1);    }
  50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.18); }
}
.pf-orb {
  position: absolute;
  width: var(--ring-size, 14vmin);
  height: var(--ring-size, 14vmin);
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  cursor: pointer;
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  animation: pf-orb-breath 4.2s ease-in-out infinite;
  transition: transform 220ms cubic-bezier(.2,.6,.3,1);
}
.pf-orb:hover { transform: translate(-50%, -50%) scale(1.08); }

/* Featured: glow más intenso + sombra ambiente más profunda */
.pf-orb--featured .pf-orb-glow {
  filter: blur(28px);
  background: radial-gradient(circle,
    currentColor 0%,
    currentColor 22%,
    transparent 65%);
}
.pf-orb--featured .pf-orb-sphere {
  box-shadow:
    inset 0 -8% 18% 0 rgba(0,0,0,0.4),
    inset 0 4% 10% 0 rgba(255,255,255,0.28),
    0 16px 50px -10px rgba(0,0,0,0.6),
    0 0 60px -8px currentColor;
}
.pf-orb--featured .pf-orb-label {
  font-size: 11px;
  padding: 6px 14px;
  background: rgba(10, 9, 8, 0.72);
  border-color: color-mix(in oklab, currentColor 35%, rgba(255,255,255,0.14));
}

/* Satélite: glow más sutil, esfera más chica visualmente */
.pf-orb--satellite .pf-orb-glow {
  filter: blur(16px);
  opacity: 0.7;
}
.pf-orb--satellite .pf-orb-label {
  font-size: 9px;
  padding: 4px 10px;
  opacity: 0.85;
}
.pf-orb-glow {
  position: absolute;
  top: 50%; left: 50%;
  width: 160%; height: 160%;
  border-radius: 50%;
  background: radial-gradient(circle,
    currentColor 0%,
    currentColor 18%,
    transparent 60%);
  filter: blur(22px);
  mix-blend-mode: screen;
  pointer-events: none;
  animation: pf-orb-glow-pulse 3.2s ease-in-out infinite;
  will-change: transform, opacity;
}
.pf-orb-sphere {
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  /* Gradiente 3D: highlight arriba-izq → body → edge oscura abajo-der */
  background:
    radial-gradient(circle at 32% 28%,
      rgba(255,255,255,0.85) 0%,
      rgba(255,255,255,0.35) 8%,
      currentColor 30%,
      currentColor 60%,
      rgba(0,0,0,0.55) 100%);
  box-shadow:
    inset 0 -8% 18% 0 rgba(0,0,0,0.35),
    inset 0 4% 10% 0 rgba(255,255,255,0.25),
    0 10px 30px -8px rgba(0,0,0,0.5);
  pointer-events: none;
}
.pf-orb-spec {
  position: absolute;
  top: 22%; left: 28%;
  width: 26%; height: 22%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center,
    rgba(255,255,255,0.9) 0%,
    rgba(255,255,255,0.35) 40%,
    transparent 70%);
  filter: blur(2px);
  pointer-events: none;
  transform: rotate(-18deg);
}

/* ─── Pill labels flotantes (separados del orbe, como en el mockup) ───
   La dirección se elige según en qué cuadrante vive el orbe para que el
   texto caiga SIEMPRE hacia el centro de la pantalla. */
.pf-orb-label {
  position: absolute;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0.95;
  white-space: nowrap;
  transition: opacity 200ms ease, letter-spacing 200ms ease, transform 220ms cubic-bezier(.2,.6,.3,1);
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(10, 9, 8, 0.55);
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 14px -4px rgba(0,0,0,0.5);
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  pointer-events: none;
  color: #F3EFE6;
}
/* Desktop offsets — bien afuera del orbe así no se superponen */
.pf-orb-label--below-right { top: calc(100% + 10px); left: 56%; }
.pf-orb-label--below-left  { top: calc(100% + 10px); right: 56%; }
.pf-orb-label--above-right { bottom: calc(100% + 10px); left: 56%; }
.pf-orb-label--above-left  { bottom: calc(100% + 10px); right: 56%; }
.pf-orb:hover .pf-orb-label { opacity: 1; letter-spacing: 0.32em; }

/* ─── EL SLAB · panel central de vidrio rounded ───
   Es el contenedor maestro del hero. Bordes redondeados, sutil highlight
   superior, sombra dura proyectada. NO usa backdrop-filter porque el
   contenido está adentro (el video clipea sus bordes redondeados). */
.pf-slab {
  /* Fondo TOTAL BLACK — el vidrio se apoya sobre el vacío puro. */
  background: #000000;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.10),
    0 30px 80px -20px rgba(0,0,0,0.7),
    0 10px 30px -10px rgba(0,0,0,0.4);
  isolation: isolate;
}
/* Wrapper del video del hero — mobile ocupa el slab entero, desktop
   vive en la mitad derecha con fade izquierdo al void negro. */
.pf-slab-video-wrap {
  width: 100%;
  -webkit-mask-image: none;
  mask-image: none;
}
@media (max-width: 767px) {
  /* Mobile · sin zoom para que las 4 burbujas del video entren completas
     en el frame. Centramos el object-position así el retrato queda
     balanceado con las burbujas arriba/a los costados visibles. Después
     ajustamos las coords de los orbes interactivos para que queden encima. */
  .pf-slab-video-wrap {
    transform: none;
  }
  .pf-slab-video-wrap > video {
    object-position: 50% 50% !important;
  }
}
@media (min-width: 768px) {
  .pf-slab-video-wrap {
    width: 56%;
    -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 18%, #000 40%);
    mask-image: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 18%, #000 40%);
  }
}
.pf-slab-rim {
  border-radius: inherit;
  /* Glass edge liquid-glass iOS26 · highlight brillante arriba + reflejo
     tenue abajo + ring blanco fino alrededor + halo interno que simula
     el grosor del vidrio. */
  box-shadow:
    inset 0 1.5px 1px 0 rgba(255,255,255,0.42),
    inset 0 -1px 1px 0 rgba(255,255,255,0.10),
    inset 0 0 0 1px rgba(255,255,255,0.14),
    inset 0 0 40px rgba(255,255,255,0.05),
    inset 0 0 80px rgba(250,93,41,0.04);
  position: relative;
  overflow: hidden;
}
/* Borde iridiscente gradient — usa mask trick para pintar solo el perfil
   del slab. Hues cálidos mezclados con celeste/lila para firma AI. */
.pf-slab-rim::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: linear-gradient(
    135deg,
    rgba(255,200,150,0.55) 0%,
    rgba(250,93,41,0.35) 25%,
    rgba(232,169,255,0.35) 50%,
    rgba(143,208,255,0.40) 75%,
    rgba(255,214,165,0.55) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.85;
}
/* Reflejo de highlight superior curvado · una lamina fina que refracta
   luz cerca del borde top, lo que vende la sensación de vidrio grueso. */
.pf-slab-rim::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.08) 0%,
    rgba(255,255,255,0.02) 14%,
    rgba(255,255,255,0) 32%
  );
  pointer-events: none;
}

/* ─── Top nav del slab ─── */
.pf-slab-logo {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: 14px;
  color: #F3EFE6;
  letter-spacing: -0.04em;
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.15);
}
.pf-slab-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.55);
}
.pf-slab-link {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.7);
  text-decoration: none;
  transition: color 200ms ease;
}
.pf-slab-link:hover { color: #fff; }
.pf-slab-link:first-of-type { color: #fff; }
.pf-slab-dots {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: background 200ms ease;
  padding: 0;
  gap: 3px;
}
.pf-slab-dots:hover { background: rgba(255,255,255,0.12); }
.pf-slab-dots span {
  display: block;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: rgba(243,239,230,0.85);
  margin: 1.5px 0;
}

/* ─── Título editorial "multi/media" ─── */
.pf-slab-microeyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.5);
}
.pf-slab-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(72px, 11vw, 184px);
  line-height: 0.84;
  letter-spacing: -0.06em;
  color: #F3EFE6;
}
.pf-slab-title-accent { color: #F4B37E; }
.pf-slab-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 1.2vw, 18px);
  line-height: 1.4;
  color: rgba(243,239,230,0.65);
  max-width: 32ch;
}
.pf-slab-hint {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.7);
  cursor: default;
}
.pf-slab-hint-arrow {
  display: inline-block;
  font-size: 14px;
  animation: pf-hint-bob 2.2s ease-in-out infinite;
}
@keyframes pf-hint-bob {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50%      { transform: translateY(4px); opacity: 1; }
}

/* ─── Bottom pill bar (dock estilo iOS) ───
   Dock angosto, translúcido, integrado al slab. El fondo pasa MUCHO
   vidrio (blur alto + saturate) pero muy poca nata blanca, así el dock
   se siente parte del cristal del slab en vez de un elemento pegado
   encima. Texto simplificado a label sólo en estado idle, con sub
   chiquito opcional para los 2 primeros. */
.pf-pillbar { width: max-content; max-width: calc(100% - 24px); }
.pf-pillbar-inner {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
  backdrop-filter: blur(40px) saturate(1.7);
  -webkit-backdrop-filter: blur(40px) saturate(1.7);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.14),
    inset 0 -1px 0 0 rgba(255,255,255,0.03),
    0 16px 50px -20px rgba(0,0,0,0.55);
}
.pf-pill {
  --pill-color: #F4B37E;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px;
  border-radius: 14px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: #F3EFE6;
  text-align: left;
  transition: background 220ms ease, border-color 220ms ease, transform 220ms cubic-bezier(.2,.6,.3,1);
  min-width: 0;
}
.pf-pill:first-child {
  background: linear-gradient(180deg, color-mix(in oklab, var(--pill-color) 14%, transparent) 0%, color-mix(in oklab, var(--pill-color) 4%, transparent) 100%);
  border-color: color-mix(in oklab, var(--pill-color) 32%, rgba(255,255,255,0.08));
  box-shadow: 0 6px 18px -10px color-mix(in oklab, var(--pill-color) 55%, transparent);
}
.pf-pill:hover {
  background: linear-gradient(180deg, color-mix(in oklab, var(--pill-color) 12%, transparent) 0%, color-mix(in oklab, var(--pill-color) 3%, transparent) 100%);
  border-color: color-mix(in oklab, var(--pill-color) 30%, rgba(255,255,255,0.08));
  transform: translateY(-1px);
}
.pf-pill-icon {
  width: 18px; height: 18px;
  flex-shrink: 0;
  color: var(--pill-color);
  filter: drop-shadow(0 1px 3px color-mix(in oklab, var(--pill-color) 55%, transparent));
}
.pf-pill-text { display: flex; flex-direction: column; line-height: 1.05; min-width: 0; }
.pf-pill-label {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: -0.01em;
  text-transform: lowercase;
  color: #F3EFE6;
}
.pf-pill-sub {
  margin-top: 2px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

/* En mobile escondemos los sub-labels y achicamos las píldoras a icon-only */
@media (max-width: 768px) {
  .pf-pill-text { display: none; }
  .pf-pill { padding: 9px; }
  .pf-pillbar-inner { gap: 3px; padding: 5px; }
}

/* ─── ZONA SLAB (música y futuras zonas) ───
   Versión "página" del slab: respeta la identidad visual del hero (rounded
   container, rim, glow ambient) pero sin alto fijo — fluye con el contenido.
   Acá vive el contenido editorial de cada zona (lista de tracks, grid de
   wallpapers, etc). */
.pf-zoneslab {
  background: linear-gradient(180deg, rgba(20,18,16,0.85) 0%, rgba(10,9,8,0.95) 100%);
  min-height: 70vh;
}

/* Top nav de los slabs de zonas: logo a la izq, tabs centradas de verdad,
   acciones a la der. Grid evita que la marca empuje el nav fuera del eje. */
.pf-zoneslab-topnav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  min-height: 44px;
}
.pf-zoneslab-topnav-brand {
  justify-self: start;
  display: flex;
  align-items: center;
}
.pf-zoneslab-topnav-center {
  justify-self: center;
  min-width: 0;
}
.pf-zoneslab-topnav-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pf-zoneslab-pillnav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(16, 14, 12, 0.52);
  backdrop-filter: blur(22px) saturate(1.28);
  -webkit-backdrop-filter: blur(22px) saturate(1.28);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.1),
    0 16px 34px -18px rgba(0,0,0,0.7);
}

/* Tabs del top-nav — texto sutil con underline animado del color del tab */
.pf-zonetab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  color: rgba(243,239,230,0.55);
  cursor: pointer;
  transition: color 200ms ease, background 200ms ease;
  white-space: nowrap;
}
.pf-zonetab:hover {
  color: rgba(243,239,230,0.92);
  background: rgba(255,255,255,0.04);
}
.pf-zonetab--active {
  color: #F3EFE6;
  background: color-mix(in srgb, var(--tab-color, #F4B37E) 14%, rgba(255,255,255,0.04));
}
.pf-zonetab-underline {
  position: absolute;
  left: 12px; right: 12px; bottom: 5px;
  height: 2px;
  border-radius: 2px;
  background: var(--tab-color, #F4B37E);
  box-shadow: 0 0 12px var(--tab-color, #F4B37E);
}

/* Iconos del top-nav (search) y MENU pill */
.pf-zonenav-icon {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(243,239,230,0.7);
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease;
}
.pf-zonenav-icon:hover { background: rgba(255,255,255,0.10); color: #fff; }
.pf-zonenav-menu {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(243,239,230,0.85);
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  transition: background 200ms ease;
}
.pf-zonenav-menu:hover { background: rgba(255,255,255,0.10); }
.pf-zonenav-menu-dots {
  display: grid;
  grid-template-columns: repeat(3, 3px);
  gap: 2px;
}
.pf-zonenav-menu-dots span {
  width: 3px; height: 3px;
  border-radius: 50%;
  background: rgba(243,239,230,0.7);
}

/* Mobile nav scrollable */
.pf-zonenav-mobile {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.pf-zonenav-mobile::-webkit-scrollbar { display: none; }

/* HEADER · eyebrow + título + subtítulo del zone-slab */
.pf-zoneslab-eyebrow {
  display: inline-block;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #F4B37E;
  margin-bottom: 14px;
}
.pf-zoneslab-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(64px, 11vw, 168px);
  line-height: 0.86;
  letter-spacing: -0.06em;
  color: #F3EFE6;
  margin-bottom: 12px;
}
.pf-zoneslab-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 1.2vw, 18px);
  color: rgba(243,239,230,0.55);
}

/* CTA pill "ver todo el catálogo →" */
.pf-zoneslab-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(243,239,230,0.85);
  text-decoration: none;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background 220ms ease, border-color 220ms ease, transform 220ms cubic-bezier(.2,.6,.3,1);
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.08);
}
.pf-zoneslab-cta:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.25);
  transform: translateY(-1px);
  color: #fff;
}
.pf-zoneslab-cta-arrow {
  font-size: 14px;
  transition: transform 220ms ease;
}
.pf-zoneslab-cta:hover .pf-zoneslab-cta-arrow { transform: translateX(4px); }

/* DEMO chip bottom-left */
.pf-zoneslab-demo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.45);
  pointer-events: none;
}
.pf-zoneslab-demo-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F4B37E 50%, transparent 50%);
  border: 1px solid rgba(244,179,126,0.5);
}

/* TRACK ROW · pildora glass que parece track del mockup */
.pf-trackrow {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px 12px 12px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  text-align: left;
  color: #F3EFE6;
  transition: background 220ms ease, border-color 220ms ease, transform 220ms cubic-bezier(.2,.6,.3,1);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.06),
    inset 0 -1px 0 0 rgba(255,255,255,0.02);
  min-width: 0;
}
.pf-trackrow:hover {
  background: linear-gradient(180deg, rgba(244,179,126,0.10) 0%, rgba(244,179,126,0.02) 100%);
  border-color: rgba(244,179,126,0.30);
  transform: translateY(-1px);
}
.pf-trackrow-play {
  flex-shrink: 0;
  width: 36px; height: 36px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: radial-gradient(circle at 30% 30%, #FFD3A8 0%, #F4B37E 50%, #C97F45 100%);
  color: #1a0d05;
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.4),
    inset 0 -1px 0 0 rgba(0,0,0,0.2),
    0 4px 10px -2px rgba(244,179,126,0.5);
  padding-left: 2px; /* triángulo visualmente centrado */
}
.pf-trackrow-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.2;
}
.pf-trackrow-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #F3EFE6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pf-trackrow-sub {
  margin-top: 2px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  color: rgba(243,239,230,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pf-trackrow-cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.4);
  transition: color 220ms ease, transform 220ms ease;
}
.pf-trackrow:hover .pf-trackrow-cta {
  color: rgba(243,239,230,0.85);
  transform: translateX(2px);
}

/* ─────────────────────────────────────────────────────────────────────────
   MUSICA SLAB · Variación 04 · Liquid Glass Neon
   Sidebar izquierda con tabs verticales + retrato semi-transparente a la
   derecha + glows neon ambient que sangran por los bordes. Mobile sustituye
   sidebar por tab bar fijado abajo.
   ──────────────────────────────────────────────────────────────────────── */
.pf-musica-slab {
  background: linear-gradient(160deg, rgba(18,16,14,0.92) 0%, rgba(8,7,6,0.98) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow:
    0 40px 90px -30px rgba(0,0,0,0.75),
    0 14px 40px -12px rgba(0,0,0,0.45),
    inset 0 1px 0 0 rgba(255,255,255,0.05);
  isolation: isolate;
  min-height: 640px;
}

/* Retrato semi-transparente detrás del contenido. Se coloca pegado al borde
   derecho del slab para que el rostro sirva de fondo del título "música". */
.pf-musica-portrait {
  position: absolute;
  top: 0; bottom: 0; right: 0;
  width: 60%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 35%, #000 70%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 35%, #000 70%);
}
.pf-musica-portrait img {
  position: absolute;
  top: 50%;
  right: -4%;
  transform: translateY(-50%);
  height: 112%;
  width: auto;
  object-fit: cover;
  object-position: center;
  opacity: 0.38;
  filter: grayscale(0.1) contrast(1.05) brightness(0.85) saturate(0.9);
  mix-blend-mode: luminosity;
}

/* Glows neon ambientes — blobs gigantes muy blureados fuera del slab */
.pf-musica-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.55;
  mix-blend-mode: screen;
  pointer-events: none;
}
.pf-musica-glow--orange {
  top: -8%; left: -10%;
  width: 520px; height: 520px;
  background: radial-gradient(circle, rgba(244,179,126,0.9) 0%, rgba(244,179,126,0) 70%);
}
.pf-musica-glow--cyan {
  bottom: -10%; left: 20%;
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(159,217,224,0.8) 0%, rgba(159,217,224,0) 70%);
  opacity: 0.45;
}
.pf-musica-glow--pink {
  top: 30%; right: -12%;
  width: 560px; height: 560px;
  background: radial-gradient(circle, rgba(242,111,166,0.85) 0%, rgba(242,111,166,0) 70%);
}

/* Grid principal desktop: sidebar 240px + main flexible */
.pf-musica-grid {
  grid-template-columns: 220px 1fr;
  min-height: 580px;
  max-width: 1320px;
  margin: 0 auto;
}

/* Sidebar · columna izquierda con logo arriba, tabs al centro-top, DEMO abajo */
.pf-musica-sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 28px 22px 22px;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 60%);
  min-height: 100%;
  position: relative;
  z-index: 2;
}

/* Vertical nav dentro del sidebar */
.pf-musica-vnav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
  flex: 1;
}
.pf-musica-vtab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  text-transform: lowercase;
  color: rgba(243,239,230,0.55);
  text-align: left;
  transition: color 200ms ease, background 200ms ease, transform 200ms ease;
}
.pf-musica-vtab:hover {
  color: rgba(243,239,230,0.92);
  background: rgba(255,255,255,0.03);
}
.pf-musica-vtab--active {
  color: var(--tab-color, #F4B37E);
  background: color-mix(in oklab, var(--tab-color, #F4B37E) 10%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--tab-color, #F4B37E) 25%, transparent),
    0 0 24px -8px var(--tab-color, #F4B37E);
}
.pf-musica-vtab--active > span:last-child {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  line-height: 1;
  opacity: 0.8;
}

/* Main · columna derecha — padding generoso, alineación del contenido */
.pf-musica-main {
  padding: 24px 40px 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
  min-width: 0;
}

/* Override titular para esta zona · tamaño ajustado (no tan gigante como hero) */
.pf-musica-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(56px, 9vw, 140px);
  line-height: 0.86;
  letter-spacing: -0.06em;
  color: #F3EFE6;
  margin: 0 0 10px;
}
.pf-musica-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 1.1vw, 17px);
  color: rgba(243,239,230,0.58);
  margin: 0;
}

/* ─── MOBILE TAB BAR · dock flotante pegado al bottom del slab en mobile ─── */
.pf-mobile-tabbar {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 8px 6px;
  border-radius: 24px;
  background: rgba(14,12,10,0.72);
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 10px 30px -10px rgba(0,0,0,0.6),
    inset 0 1px 0 0 rgba(255,255,255,0.08);
  z-index: 15;
}
.pf-mobile-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 16px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: -0.005em;
  text-transform: lowercase;
  color: rgba(243,239,230,0.5);
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
  min-width: 0;
}
.pf-mobile-tab:hover {
  color: rgba(243,239,230,0.9);
}
.pf-mobile-tab svg { opacity: 0.8; }
.pf-mobile-tab--active {
  color: var(--tab-color, #F4B37E);
  background: color-mix(in oklab, var(--tab-color, #F4B37E) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tab-color, #F4B37E) 24%, transparent);
}
.pf-mobile-tab--active svg { opacity: 1; }

@media (max-width: 900px) {
  .pf-musica-slab { min-height: auto; }
  .pf-musica-title { font-size: clamp(56px, 18vw, 96px); }
}

/* ─────────────────────────────────────────────────────────────────────────
   FOTOS + CAFECITO SLAB · Variación 5
   Slab combinado: lightbox de fotos a la izquierda + tier cards a la
   derecha. Bottom dock con pillbar. Mobile: stacked + bottom tab bar.
   ──────────────────────────────────────────────────────────────────────── */
.pf-fc-slab {
  background: linear-gradient(180deg, rgba(20,17,14,0.92) 0%, rgba(8,7,6,0.98) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow:
    0 40px 90px -30px rgba(0,0,0,0.75),
    0 14px 40px -12px rgba(0,0,0,0.45),
    inset 0 1px 0 0 rgba(255,255,255,0.05);
  isolation: isolate;
}

/* Glows ambient detrás del slab */
.pf-fc-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: 0.5;
}
.pf-fc-glow--cyan {
  top: -10%; left: -8%;
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(159,217,224,0.85) 0%, rgba(159,217,224,0) 70%);
}
.pf-fc-glow--pink {
  top: 30%; right: -12%;
  width: 560px; height: 560px;
  background: radial-gradient(circle, rgba(242,111,166,0.85) 0%, rgba(242,111,166,0) 70%);
}
.pf-fc-glow--amber {
  bottom: -10%; left: 30%;
  width: 520px; height: 520px;
  background: radial-gradient(circle, rgba(244,179,126,0.7) 0%, rgba(244,179,126,0) 70%);
  opacity: 0.4;
}

/* Grid principal: fotos (1.35fr) + cafecito (1fr ~ 380px).
   El ratio bajó de 1.7 → 1.35 para que las fotos ocupen menos ancho
   y se sientan contenidas, matching el eje del resto de la página. */
.pf-fc-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr);
  gap: 32px;
  padding: 20px 40px 12px;
  align-items: start;
}

/* Eyebrow + título base — comparten patrón pero permiten override */
.pf-fc-eyebrow {
  display: inline-block;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #F26FA6;
  margin-bottom: 10px;
}
.pf-fc-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(56px, 7.5vw, 116px);
  line-height: 0.86;
  letter-spacing: -0.06em;
  color: #F3EFE6;
  margin: 0 0 6px;
}
.pf-fc-title--sm {
  font-size: clamp(48px, 5vw, 84px);
}
.pf-fc-title--mobile {
  font-size: clamp(56px, 18vw, 96px);
}
.pf-fc-sub {
  font-family: 'Inter', sans-serif;
  font-size: clamp(14px, 1.05vw, 16px);
  color: rgba(243,239,230,0.55);
  margin: 0;
  max-width: 38ch;
}

/* COLUMNA IZQUIERDA · fotos */
.pf-fc-fotos {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* Foto principal · más cuadrada (4:3) para que se sienta contenida y no
   robe protagonismo al resto del slab. */
.pf-fc-photo-main {
  position: relative;
  width: 100%;
  max-width: 720px;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  overflow: hidden;
  margin: 16px auto 0;
  background: #050403;
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.06),
    0 20px 50px -20px rgba(0,0,0,0.7);
}
.pf-fc-photo-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pf-fc-photo-counter {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(10,9,8,0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgba(243,239,230,0.85);
}
.pf-fc-photo-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px; height: 38px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(10,9,8,0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(243,239,230,0.9);
  font-size: 18px;
  cursor: pointer;
  transition: background 200ms ease, transform 200ms ease;
}
.pf-fc-photo-nav:hover {
  background: rgba(10,9,8,0.85);
  transform: translateY(-50%) scale(1.05);
}
.pf-fc-photo-nav--prev { left: 14px; }
.pf-fc-photo-nav--next { right: 14px; }

/* Thumbnail strip · 7 cuadraditos en una fila */
.pf-fc-thumbs {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
.pf-fc-thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  padding: 0;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.pf-fc-thumb img {
  width: 100%; height: 100%; object-fit: cover;
  display: block;
  transition: transform 380ms ease;
}
.pf-fc-thumb:hover {
  border-color: rgba(255,255,255,0.18);
  transform: translateY(-2px);
}
.pf-fc-thumb:hover img { transform: scale(1.06); }
.pf-fc-thumb--active {
  border-color: rgba(159,217,224,0.55);
  box-shadow: 0 0 0 2px rgba(159,217,224,0.25), 0 8px 22px -8px rgba(159,217,224,0.4);
}
.pf-fc-thumb--more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: rgba(243,239,230,0.65);
  background: rgba(255,255,255,0.04);
  text-align: center;
  line-height: 1.15;
}
.pf-fc-thumb--more:hover {
  color: #fff;
  background: rgba(255,255,255,0.08);
}

/* COLUMNA DERECHA · cafecito column con tier cards */
.pf-fc-cafe {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 16px;
}
.pf-fc-tiers {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

/* Tier card individual */
.pf-fc-tier {
  position: relative;
  display: block;
  padding: 14px 18px 14px 16px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--tier-color, #F4B37E) 6%, transparent) 0%, rgba(255,255,255,0.01) 100%);
  border: 1px solid color-mix(in oklab, var(--tier-color, #F4B37E) 18%, rgba(255,255,255,0.08));
  text-decoration: none;
  color: #F3EFE6;
  transition: transform 220ms cubic-bezier(.2,.6,.3,1), border-color 220ms ease, background 220ms ease, box-shadow 220ms ease;
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.06),
    0 6px 20px -10px rgba(0,0,0,0.5);
}
.pf-fc-tier:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--tier-color, #F4B37E) 36%, rgba(255,255,255,0.1));
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--tier-color, #F4B37E) 12%, transparent) 0%, rgba(255,255,255,0.02) 100%);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.08),
    0 14px 28px -12px color-mix(in oklab, var(--tier-color, #F4B37E) 30%, transparent);
}
.pf-fc-tier-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tier-color, #F4B37E);
  margin-bottom: 6px;
  opacity: 0.95;
}
.pf-fc-tier-body {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pf-fc-tier-icon {
  flex-shrink: 0;
  width: 34px; height: 34px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: color-mix(in oklab, var(--tier-color, #F4B37E) 14%, transparent);
  color: var(--tier-color, #F4B37E);
}
.pf-fc-tier-text {
  flex: 1;
  min-width: 0;
}
.pf-fc-tier-amount {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: -0.03em;
  color: #F3EFE6;
  line-height: 1;
}
.pf-fc-tier-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 800;
  font-size: 17px;
  letter-spacing: -0.02em;
  color: #F3EFE6;
  line-height: 1.05;
}
.pf-fc-tier-note {
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: rgba(243,239,230,0.55);
  line-height: 1.3;
}
.pf-fc-tier-arrow {
  flex-shrink: 0;
  width: 30px; height: 30px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(243,239,230,0.7);
  font-size: 14px;
  transition: background 180ms ease, transform 180ms ease, border-color 180ms ease;
}
.pf-fc-tier:hover .pf-fc-tier-arrow {
  background: color-mix(in oklab, var(--tier-color, #F4B37E) 22%, transparent);
  border-color: color-mix(in oklab, var(--tier-color, #F4B37E) 40%, transparent);
  color: #fff;
  transform: translateX(2px);
}
.pf-fc-tier--featured {
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--tier-color, #F4B37E) 14%, transparent) 0%, rgba(255,255,255,0.02) 100%);
  border-color: color-mix(in oklab, var(--tier-color, #F4B37E) 35%, rgba(255,255,255,0.1));
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.08),
    0 12px 30px -12px color-mix(in oklab, var(--tier-color, #F4B37E) 35%, transparent);
}

/* CTA pill al pie de la columna cafecito */
.pf-fc-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  margin-top: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(242,111,166,0.18) 0%, rgba(242,111,166,0.06) 100%);
  border: 1px solid rgba(242,111,166,0.32);
  color: #F3EFE6;
  text-decoration: none;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background 220ms ease, border-color 220ms ease, transform 220ms cubic-bezier(.2,.6,.3,1);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.1),
    0 10px 24px -10px rgba(242,111,166,0.4);
  width: 100%;
  justify-content: center;
}
.pf-fc-cta:hover {
  background: linear-gradient(180deg, rgba(242,111,166,0.28) 0%, rgba(242,111,166,0.10) 100%);
  border-color: rgba(242,111,166,0.5);
  transform: translateY(-1px);
}
.pf-fc-cta--ghost {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.12);
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.06);
}
.pf-fc-cta--ghost:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.24);
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.08);
}
.pf-fc-cta--block { width: 100%; justify-content: center; }

/* Bottom dock desktop · pillbar central con icon+label */
.pf-fc-dock {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(14,12,10,0.65);
  backdrop-filter: blur(18px) saturate(1.3);
  -webkit-backdrop-filter: blur(18px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.08),
    0 10px 30px -10px rgba(0,0,0,0.6);
}
.pf-fc-dock-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 999px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.005em;
  text-transform: lowercase;
  color: rgba(243,239,230,0.6);
  transition: color 180ms ease, background 180ms ease;
}
.pf-fc-dock-pill:hover { color: rgba(243,239,230,0.95); }
.pf-fc-dock-pill--active {
  color: var(--tab-color, #F4B37E);
  background: color-mix(in oklab, var(--tab-color, #F4B37E) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tab-color, #F4B37E) 28%, transparent);
}

/* Avatar mini en bottom dock */
.pf-fc-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.15);
  flex-shrink: 0;
}
.pf-fc-avatar img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center top;
}

/* MOBILE · scroll horizontal de thumbs */
.pf-fc-thumbs-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}
.pf-fc-thumbs-scroll::-webkit-scrollbar { display: none; }
.pf-fc-thumb-mobile {
  flex-shrink: 0;
  width: 96px;
  aspect-ratio: 9 / 14;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  background: #111;
  scroll-snap-align: start;
}
.pf-fc-thumb-mobile img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

/* Responsive · colapsa el grid en pantallas medianas */
@media (max-width: 1100px) {
  .pf-fc-grid {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .pf-fc-cafe { padding-top: 4px; }
}

@media (prefers-reduced-motion: reduce) {
  .pf-orb,
  .pf-orb-glow,
  .pf-cta-main,
  .pf-cta-main-chev { animation: none !important; }
  .pf-glass { animation: none !important; transition: none !important; }
}

/* ─── Dissolve cinematográfico: panel de vidrio esmerilado ───
   El panel SIEMPRE cubre el viewport; lo que cambia es su posición Y via
   keyframes según la phase. Así evitamos race conditions con transitions
   que dependen del estado anterior. */
.pf-glass {
  position: absolute;
  inset: 0;
  will-change: transform;
}
@keyframes pf-glass-rise {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes pf-glass-fall {
  from { transform: translateY(0); }
  to   { transform: translateY(-100%); }
}
.pf-glass--rising  { animation: pf-glass-rise 600ms cubic-bezier(.4,0,.2,1) both; }
.pf-glass--covered { transform: translateY(0); }
.pf-glass--falling { animation: pf-glass-fall 800ms cubic-bezier(.4,0,.2,1) both; }

/* ─── Blobs atmosféricos del hero — humo de color que respira ───
   Uno por color de orbe, anclados a las 4 esquinas del viewport.
   Live opacity baja porque se SUMAN encima del video → tienen que
   teñir, no tapar. */
@keyframes pf-hero-blob-drift {
  0%, 100% { transform: translate(0,0) scale(1);    opacity: 0.18; }
  33%      { transform: translate(2%, -1%) scale(1.08); opacity: 0.26; }
  66%      { transform: translate(-1%, 2%) scale(0.94); opacity: 0.20; }
}
.pf-hero-blob {
  position: absolute;
  width: 38vw;
  max-width: 540px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  filter: blur(72px);
  mix-blend-mode: screen;
  animation: pf-hero-blob-drift 18s ease-in-out infinite;
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .pf-hero-blob { animation: none !important; }
}

/* ─── APPLE INTELLIGENCE GLOW · resplandor iridiscente detrás del slab.
   Reemplaza el void negro alrededor del card por un halo que respira con
   hues pastel (naranja firma, coral, lila, celeste). Dos capas cónicas
   rotando a velocidades distintas + un velo radial que suaviza los bordes
   y concentra el brillo cerca de los bordes del slab. */
.pf-ai-glow {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.pf-ai-glow-ring,
.pf-ai-glow-ring--b {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  mix-blend-mode: screen;
  will-change: transform, opacity, filter;
}
.pf-ai-glow-ring {
  background: conic-gradient(
    from 0deg,
    #FA5D29 0deg,
    #F4B37E 45deg,
    #FFD6A5 90deg,
    #E8A9FF 160deg,
    #B4D8FF 220deg,
    #8FD0FF 275deg,
    #FA5D29 330deg,
    #FA5D29 360deg
  );
  animation: pf-ai-glow-rotate 28s linear infinite, pf-ai-glow-breathe 12s ease-in-out infinite;
}
.pf-ai-glow-ring--b {
  width: 110%;
  background: conic-gradient(
    from 180deg,
    rgba(250,93,41,0.8) 0deg,
    rgba(244,179,126,0.5) 60deg,
    rgba(183,168,255,0.55) 140deg,
    rgba(143,208,255,0.55) 210deg,
    rgba(255,209,102,0.5) 280deg,
    rgba(250,93,41,0.8) 360deg
  );
  opacity: 0.4;
  filter: blur(70px);
  animation: pf-ai-glow-rotate-rev 40s linear infinite, pf-ai-glow-breathe 16s ease-in-out infinite reverse;
}
/* Velo radial que atenúa el centro (donde va el slab) y aviva los bordes,
   así el efecto se lee como un halo alrededor del card, no como una mancha
   encima de él. */
.pf-ai-glow-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 75% 70% at 50% 50%,
    #0a0908 0%,
    #0a0908 55%,
    rgba(10,9,8,0.65) 75%,
    rgba(10,9,8,0) 100%
  );
}
@keyframes pf-ai-glow-rotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes pf-ai-glow-rotate-rev {
  from { transform: translate(-50%, -50%) rotate(360deg); }
  to   { transform: translate(-50%, -50%) rotate(0deg); }
}
@keyframes pf-ai-glow-breathe {
  0%, 100% { opacity: 0.55; filter: blur(90px); }
  50%      { opacity: 0.75; filter: blur(110px); }
}
@media (max-width: 767px) {
  /* Mobile · glow más cerca del slab y más saturado, ya que el void lateral
     es más fino; también lo dejamos bleedear arriba para comer la franja
     oscura sobre el borde superior del slab. */
  .pf-ai-glow-ring { width: 180%; filter: blur(70px); opacity: 0.7; }
  .pf-ai-glow-ring--b { width: 150%; filter: blur(60px); opacity: 0.55; }
  .pf-ai-glow-veil {
    background: radial-gradient(
      ellipse 85% 75% at 50% 55%,
      #0a0908 0%,
      #0a0908 48%,
      rgba(10,9,8,0.55) 72%,
      rgba(10,9,8,0) 100%
    );
  }
}
@media (prefers-reduced-motion: reduce) {
  .pf-ai-glow-ring, .pf-ai-glow-ring--b { animation: none !important; }
}

/* ─── Ambiente interno del slab · el humo del retrato se lee como un
   resplandor cálido que tiñe toda la cara del vidrio. Se apila DEBAJO
   del video (document order) y usa mix-blend-mode:screen para sumarse
   sobre el negro puro sin opacar el retrato. El isolation:isolate del
   .pf-slab confina el blend al slab (no se escapa al void de afuera). */
.pf-hero-ambient {
  z-index: 0;
}
.pf-hero-ambient-halo,
.pf-hero-ambient-column,
.pf-hero-ambient-floor {
  position: absolute;
  pointer-events: none;
  will-change: transform, opacity;
}
/* Pool principal · radial cálido anclado al lado del retrato (~70% slab
   horizontal, ~45% vertical) que sangra hacia la izquierda tiñendo el
   void donde vive el título multimedia. */
.pf-hero-ambient-halo {
  top: 0%;
  left: 30%;
  right: -15%;
  bottom: 15%;
  background:
    radial-gradient(
      closest-side at 55% 45%,
      rgba(250, 93, 41, 0.24) 0%,
      rgba(242, 111, 166, 0.16) 32%,
      rgba(244, 179, 126, 0.08) 58%,
      rgba(0, 0, 0, 0) 88%
    );
  filter: blur(56px);
  mix-blend-mode: screen;
  animation: pf-hero-ambient-breathe 14s ease-in-out infinite;
}
/* Columna vertical · humo que sube desde la cabeza hacia el top del
   slab. Rosa a mitad → naranja al núcleo → cyan apenas arriba, fundido
   con transparente en ambos extremos para que flote. */
.pf-hero-ambient-column {
  top: -8%;
  left: 58%;
  width: 28%;
  height: 80%;
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0)           0%,
      rgba(242, 111, 166, 0.12) 26%,
      rgba(250, 93, 41, 0.14)   58%,
      rgba(159, 217, 224, 0.05) 84%,
      rgba(0, 0, 0, 0)         100%
    );
  filter: blur(40px);
  mix-blend-mode: screen;
  animation: pf-hero-ambient-rise 16s ease-in-out infinite;
}
/* Piso · wash tenue bajo el pillbar — lo apoya sobre la luz del humo
   sin competir con los píldoros. Centrado, fade suave hacia los lados. */
.pf-hero-ambient-floor {
  bottom: -5%;
  left: 20%;
  right: 20%;
  height: 24%;
  background:
    radial-gradient(
      ellipse at center top,
      rgba(250, 93, 41, 0.18)   0%,
      rgba(242, 111, 166, 0.08) 42%,
      rgba(0, 0, 0, 0)          80%
    );
  filter: blur(48px);
  mix-blend-mode: screen;
}
@keyframes pf-hero-ambient-breathe {
  0%, 100% { opacity: 0.92; transform: scale(1);    }
  50%      { opacity: 1.00; transform: scale(1.03); }
}
@keyframes pf-hero-ambient-rise {
  0%, 100% { transform: translateY(0)    scaleY(1);    opacity: 0.85; }
  50%      { transform: translateY(-2%)  scaleY(1.05); opacity: 1;    }
}
@media (prefers-reduced-motion: reduce) {
  .pf-hero-ambient-halo,
  .pf-hero-ambient-column { animation: none !important; }
}

/* ─── Atmósfera PAGE-LEVEL · el hilo que ata los 3 slabs en una sola
   hoja de vidrio. Spine vertical de luz cálida + 3 blobs de color
   distribuidos en la escala de toda la página. Vive absolute en el
   root de PreviewFull y pinta ATRÁS de las sections via paint order
   (las sections son static/relative posteriores en el DOM). Con la
   spine + blobs respirando, el color pasa por las costuras entre
   slabs y da sensación de continuidad. */
.pf-page-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.pf-page-ambient-spine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 60vw;
  max-width: 900px;
  transform: translateX(-50%);
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0)             0%,
      rgba(250, 93, 41, 0.10)    12%,
      rgba(242, 111, 166, 0.06)  36%,
      rgba(250, 93, 41, 0.08)    60%,
      rgba(244, 179, 126, 0.05)  82%,
      rgba(0, 0, 0, 0)          100%
    );
  filter: blur(100px);
  mix-blend-mode: screen;
  animation: pf-page-ambient-drift 22s ease-in-out infinite;
}
.pf-page-ambient-blob {
  position: absolute;
  width: 52vw;
  max-width: 780px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  filter: blur(140px);
  mix-blend-mode: screen;
  opacity: 0.28;
  animation: pf-page-ambient-breathe 24s ease-in-out infinite;
}
.pf-page-ambient-blob--a {
  top: 6%;
  left: -16%;
  background: radial-gradient(circle, rgba(159, 217, 224, 0.85) 0%, rgba(159, 217, 224, 0) 70%);
  animation-delay: 0s;
}
.pf-page-ambient-blob--b {
  top: 38%;
  right: -18%;
  background: radial-gradient(circle, rgba(242, 111, 166, 0.85) 0%, rgba(242, 111, 166, 0) 70%);
  animation-delay: -8s;
}
.pf-page-ambient-blob--c {
  bottom: 4%;
  left: 30%;
  background: radial-gradient(circle, rgba(244, 179, 126, 0.80) 0%, rgba(244, 179, 126, 0) 70%);
  animation-delay: -14s;
}
@keyframes pf-page-ambient-drift {
  0%, 100% { transform: translateX(-50%) scaleY(1);    opacity: 1.00; }
  50%      { transform: translateX(-48%) scaleY(1.06); opacity: 0.90; }
}
@keyframes pf-page-ambient-breathe {
  0%, 100% { transform: scale(1)    translate(0, 0);     opacity: 0.28; }
  50%      { transform: scale(1.08) translate(-1%, 2%);  opacity: 0.38; }
}
@media (prefers-reduced-motion: reduce) {
  .pf-page-ambient-spine,
  .pf-page-ambient-blob { animation: none !important; }
}

/* ─── Seam bleeds · cada sección marcada con .pf-seamless-section
   proyecta un resplandor cálido por su borde superior e inferior
   (pseudo-elementos que escapan de la section via negative offset).
   En las costuras entre slabs se superponen DOS bleeds (el bottom del
   de arriba + el top del de abajo), cerrando la percepción de "vidrio
   continuo" que se pliega de slab en slab. */
.pf-seamless-section {
  position: relative;
}
.pf-seamless-section::before,
.pf-seamless-section::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: min(94vw, 1440px);
  height: 160px;
  pointer-events: none;
  mix-blend-mode: screen;
  filter: blur(40px);
  z-index: 0;
}
.pf-seamless-section::before {
  top: -80px;
  background:
    radial-gradient(
      ellipse at 50% 82%,
      rgba(250, 93, 41, 0.16)    0%,
      rgba(242, 111, 166, 0.08) 35%,
      rgba(0, 0, 0, 0)          72%
    );
}
.pf-seamless-section::after {
  bottom: -80px;
  background:
    radial-gradient(
      ellipse at 50% 18%,
      rgba(250, 93, 41, 0.16)    0%,
      rgba(244, 179, 126, 0.08) 35%,
      rgba(0, 0, 0, 0)          72%
    );
}
/* Hero no tiene slab arriba → skippeamos el ::before que quedaría
   flotando sin ancla visual. */
.pf-seamless-section--hero::before {
  display: none;
}
@media (max-width: 767px) {
  .pf-seamless-section::before,
  .pf-seamless-section::after { display: none; }
}

/* ═══════════════════════════════════════════════════════════════════════
   MINI-DOCK TOP · nav flotante fixed que reemplaza la pillbar del hero.
   Liquid-glass: blur + borde iridiscente sutil + pills interactivas.
   ═══════════════════════════════════════════════════════════════════════ */
.pf-minidock {
  position: fixed;
  top: 18px;
  right: 18px;
  display: flex;
  gap: 4px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(20,18,16,0.55);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
  box-shadow:
    0 12px 32px rgba(0,0,0,0.4),
    inset 0 1px 0 0 rgba(255,255,255,0.18),
    inset 0 0 0 1px rgba(255,255,255,0.06);
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 400ms cubic-bezier(.4,0,.2,1), transform 400ms cubic-bezier(.4,0,.2,1);
  pointer-events: none;
  z-index: 50;
}
.pf-minidock--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.pf-minidock-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: rgba(243,239,230,0.7);
  font-family: 'Inter Tight', Inter, sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 240ms ease, color 240ms ease, box-shadow 240ms ease;
}
.pf-minidock-pill:hover {
  background: rgba(255,255,255,0.05);
  color: #F3EFE6;
}
.pf-minidock-pill--active {
  background: color-mix(in srgb, var(--pill-color) 22%, rgba(20,18,16,0.6));
  color: #0a0908;
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.3),
    0 0 18px color-mix(in srgb, var(--pill-color) 40%, transparent);
}
.pf-minidock-label {
  display: none;
}
@media (min-width: 768px) {
  .pf-minidock-label { display: inline; }
}
@media (max-width: 480px) {
  .pf-minidock {
    top: 12px;
    right: 12px;
    left: 12px;
    justify-content: space-between;
  }
  .pf-minidock-pill { padding: 8px 10px; flex: 1; justify-content: center; }
}

@media (max-width: 1100px) {
  .pf-zoneslab-topnav {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
  }
  .pf-zoneslab-pillnav {
    max-width: 100%;
  }
  .pf-zonetab {
    padding-inline: 12px;
    font-size: 11px;
  }
}

@media (min-width: 1200px) {
  .pf-zoneslab-topnav {
    grid-template-columns: auto 1fr auto;
  }
  .pf-zoneslab-topnav-center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
    max-width: calc(100% - 260px);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   CAFECITO FAB · gotita liquid-glass persistente abajo-derecha.
   Orange firma, pulse sutil, micro-label fuera del core.
   ═══════════════════════════════════════════════════════════════════════ */
.pf-cafefab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #F3EFE6;
  cursor: pointer;
  z-index: 49;
  font-family: 'Inter Tight', Inter, sans-serif;
  transition: transform 240ms cubic-bezier(.4,0,.2,1);
}
.pf-cafefab:hover {
  transform: translateY(-2px);
}
.pf-cafefab-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250,93,41,0.45) 0%, rgba(250,93,41,0) 70%);
  filter: blur(10px);
  animation: pf-cafefab-pulse 3.2s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
@keyframes pf-cafefab-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.85; transform: scale(1.12); }
}
.pf-cafefab-core {
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #FA5D29 0%, #D84612 100%);
  box-shadow:
    inset 0 2px 2px 0 rgba(255,255,255,0.4),
    inset 0 -2px 3px 0 rgba(0,0,0,0.2),
    inset 0 0 0 1px rgba(255,255,255,0.2),
    0 8px 24px rgba(250,93,41,0.35),
    0 2px 8px rgba(0,0,0,0.3);
}
.pf-cafefab-label {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(20,18,16,0.7);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.15),
    inset 0 0 0 1px rgba(255,255,255,0.04);
}
@media (max-width: 767px) {
  .pf-cafefab { bottom: 16px; right: 16px; }
  .pf-cafefab-core { width: 52px; height: 52px; }
  .pf-cafefab-label { display: none; }
}

/* ═══════════════════════════════════════════════════════════════════════
   PLACEHOLDER ZONES · Ideas / Trabajo / Sobre mí antes de contenido real.
   Card liquid-glass minimal con eyebrow + título + desc + kicker.
   ═══════════════════════════════════════════════════════════════════════ */
.pf-placeholder-section { position: relative; }
.pf-placeholder-slab {
  position: relative;
  isolation: isolate;
}
.pf-placeholder-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 1.5px 1px 0 rgba(255,255,255,0.18),
    inset 0 -1px 1px 0 rgba(255,255,255,0.04),
    inset 0 0 0 1px rgba(255,255,255,0.06);
}
.pf-placeholder-rim::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, var(--rim-color) 0%, rgba(255,255,255,0.15) 50%, var(--rim-color) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.3;
}
.pf-placeholder-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-bottom: 18px;
  opacity: 0.85;
}
.pf-placeholder-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(52px, 10vw, 128px);
  line-height: 0.92;
  letter-spacing: -0.05em;
  margin-bottom: 24px;
  color: #F3EFE6;
}
.pf-placeholder-desc {
  font-family: Inter, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(243,239,230,0.65);
  max-width: 560px;
  margin-bottom: 32px;
}
@media (min-width: 768px) {
  .pf-placeholder-desc { font-size: 18px; }
}
.pf-placeholder-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.45);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.03);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
}
.pf-placeholder-kicker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

/* ═══════════════════════════════════════════════════════════════════════
   TRABAJO ZONE · hero card $100k + grid servicios + memberships row.
   Tint base: #F8E3B8 (cream). Toda la estructura usa el rim trick
   (mask-composite xor) para bordes gradiente liquid-glass consistentes
   con el resto del preview.
   ═══════════════════════════════════════════════════════════════════════ */
.pf-trabajo-section { position: relative; }
.pf-trabajo-slab { isolation: isolate; }

/* Chip featured · pill pequeña con dot + label */
.pf-trabajo-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  padding: 7px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--chip-color) 14%, rgba(20,18,16,0.6));
  color: var(--chip-color);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--chip-color) 35%, transparent);
  margin-bottom: 18px;
}
.pf-trabajo-chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

/* Hero card (1:1 IA $100k featured) */
.pf-trabajo-hero {
  position: relative;
  isolation: isolate;
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
}
.pf-trabajo-hero-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, var(--rim-color) 0%, rgba(255,255,255,0.18) 50%, var(--rim-color) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.45;
}
.pf-trabajo-hero-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: clamp(36px, 5.4vw, 64px);
  line-height: 0.94;
  letter-spacing: -0.045em;
  color: #F3EFE6;
  margin-bottom: 8px;
}
.pf-trabajo-hero-tag {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.55);
  margin-bottom: 20px;
}
.pf-trabajo-hero-blurb {
  font-family: Inter, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(243,239,230,0.72);
  max-width: 520px;
  margin-bottom: 22px;
}
@media (min-width: 768px) {
  .pf-trabajo-hero-blurb { font-size: 17px; }
}
.pf-trabajo-points {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.pf-trabajo-points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: Inter, sans-serif;
  font-size: 14px;
  color: rgba(243,239,230,0.78);
}
.pf-trabajo-points-dot {
  width: 5px; height: 5px; border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  flex-shrink: 0;
}

/* Hero card · columna derecha (precio + CTA) */
.pf-trabajo-hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 22px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
}
@media (min-width: 768px) {
  .pf-trabajo-hero-side { align-items: flex-end; text-align: right; }
}
.pf-trabajo-hero-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  color: #F3EFE6;
  letter-spacing: -0.03em;
  line-height: 1;
}
.pf-trabajo-hero-price-currency {
  font-size: clamp(22px, 3vw, 28px);
  color: rgba(243,239,230,0.6);
  font-weight: 500;
}
.pf-trabajo-hero-price-num {
  font-size: clamp(48px, 7vw, 78px);
}
.pf-trabajo-hero-price-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.4);
}
.pf-trabajo-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  border-radius: 999px;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  margin-top: 6px;
}
.pf-trabajo-cta--primary {
  background: linear-gradient(145deg, #FA5D29 0%, #D84612 100%);
  color: #fff;
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.35),
    inset 0 -1px 1px 0 rgba(0,0,0,0.15),
    0 8px 22px rgba(250,93,41,0.35),
    0 2px 6px rgba(0,0,0,0.25);
}
.pf-trabajo-cta--primary:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 0 rgba(255,255,255,0.4),
    inset 0 -1px 1px 0 rgba(0,0,0,0.15),
    0 12px 28px rgba(250,93,41,0.45),
    0 4px 10px rgba(0,0,0,0.3);
}
.pf-trabajo-hero-fineprint {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: rgba(243,239,230,0.35);
  max-width: 220px;
}

/* Grid · 3 cards de servicios no-featured */
.pf-trabajo-card {
  position: relative;
  isolation: isolate;
  border-radius: 20px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 100% at 100% 0%, rgba(248,227,184,0.06) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%);
  border: none;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  color: inherit;
}
.pf-trabajo-card:hover {
  transform: translateY(-3px);
}
.pf-trabajo-card-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(248,227,184,0.35) 0%, rgba(255,255,255,0.08) 50%, rgba(248,227,184,0.25) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.4;
  transition: opacity 0.25s ease;
}
.pf-trabajo-card:hover .pf-trabajo-card-rim { opacity: 0.75; }
.pf-trabajo-card-inner {
  position: relative; z-index: 2;
  padding: 22px 22px 20px;
  display: flex; flex-direction: column; gap: 10px;
  min-height: 220px;
}
.pf-trabajo-card-head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 10px; flex-wrap: wrap;
}
.pf-trabajo-card-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: #F3EFE6;
}
.pf-trabajo-card-price {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #F3EFE6;
  letter-spacing: -0.01em;
}
.pf-trabajo-card-price-cur {
  color: rgba(243,239,230,0.5);
  font-weight: 500;
  margin-right: 2px;
}
.pf-trabajo-card-tag {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #F8E3B8;
  opacity: 0.7;
  margin-bottom: 4px;
}
.pf-trabajo-card-blurb {
  font-family: Inter, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(243,239,230,0.6);
  flex-grow: 1;
}
.pf-trabajo-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.85);
  margin-top: 6px;
  padding: 8px 0 0;
  border-top: 1px solid rgba(255,255,255,0.06);
}

/* Divider antes de memberships */
.pf-trabajo-divider {
  border-top: 1px solid rgba(255,255,255,0.06);
}
.pf-trabajo-sub-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(248,227,184,0.7);
  margin-bottom: 6px;
}
.pf-trabajo-sub-title {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 800;
  font-size: clamp(24px, 3.6vw, 36px);
  letter-spacing: -0.03em;
  color: #F3EFE6;
}
.pf-trabajo-sub-copy {
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: rgba(243,239,230,0.45);
}

/* Membership tier cards */
.pf-trabajo-tier {
  position: relative;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  cursor: pointer;
  border: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  color: inherit;
  display: flex; flex-direction: column; gap: 8px;
}
.pf-trabajo-tier:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
}
.pf-trabajo-tier--rec {
  background:
    radial-gradient(ellipse 100% 70% at 50% 0%, rgba(248,227,184,0.1) 0%, transparent 70%),
    linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%);
  box-shadow: inset 0 0 0 1px rgba(248,227,184,0.4);
}
.pf-trabajo-tier-badge {
  position: absolute;
  top: -10px;
  left: 18px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #F8E3B8 0%, #e6cf97 100%);
  color: #1a1411;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(248,227,184,0.25);
}
.pf-trabajo-tier-name {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #F3EFE6;
  letter-spacing: -0.01em;
}
.pf-trabajo-tier-price {
  font-family: 'Inter Tight', Inter, sans-serif;
  font-weight: 900;
  font-size: 32px;
  color: #F3EFE6;
  letter-spacing: -0.035em;
  line-height: 1;
}
.pf-trabajo-tier-price-cur {
  color: rgba(243,239,230,0.5);
  font-weight: 500;
  margin-right: 3px;
  font-size: 20px;
}
.pf-trabajo-tier-price-suf {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.4);
  font-weight: 500;
  margin-left: 4px;
}
.pf-trabajo-tier-blurb {
  font-family: Inter, sans-serif;
  font-size: 13px;
  color: rgba(243,239,230,0.55);
  line-height: 1.5;
  flex-grow: 1;
}
.pf-trabajo-tier-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(243,239,230,0.75);
  margin-top: 6px;
}

@media (max-width: 767px) {
  .pf-trabajo-hero-side { width: 100%; }
  .pf-trabajo-card-inner { min-height: 180px; }
  .pf-trabajo-chip { font-size: 9px; padding: 6px 12px; }
}
`;
