/**
 * /preview-multimedia — Hub atmosférico de multimedia.
 *
 * Esta página es el "destino" del orbe MULTIMEDIA del /preview-hero.
 * Reemplaza el brutalismo del Layout actual con un lenguaje cinematográfico
 * que se conecta con el hero:
 *
 *   - Fondo profundo (#0a0908), grain CSS sutil, glows embebidos por zona.
 *   - Paleta heredada de los orbes (naranja / crema / rosa / turquesa).
 *   - Cards de vidrio (backdrop-filter blur+saturate, borde 1px sutil).
 *   - Tipografía: Inter Tight 900 display (-0.06em), Inter 400 body.
 *   - Sin colores planos. Sólo glows + glass + texturas.
 *
 * La sección de arriba ("techo de vidrio esmerilado") es donde aterriza el
 * dissolve cinematográfico cuando el hero se traga la bola — la cámara
 * baja, atraviesa el cristal, y uno aparece del otro lado, en este hub.
 *
 * Por ahora el hub muestra MULTIMEDIA (música + wallpapers + fotos
 * unificados bajo una sola umbrella). En futuros previews vamos a sumar
 * cafecito / ojo / mira como sub-rutas o sub-zonas, manteniendo el mismo
 * lenguaje visual.
 *
 * Toggle de "modo presentación" (?demo=1) igual que /preview-hero — para
 * mandar links limpios a los amigos sin chips de dev.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Media } from '@/types';

/* -------------------------------------------------------------------------
 * Paleta de orbes — replicada del LOOP_ORBS_DEFAULT del HeroPreview para
 * mantener el lenguaje visual consistente. Si cambia uno, actualizar los dos.
 * ----------------------------------------------------------------------- */
const ORB_PALETTE = {
  multimedia: '#F4B37E', // naranja cálido — la bola arriba-izquierda del hero
  cafecito: '#F26FA6', // rosa
  ojo: '#F8E3B8', // crema
  mira: '#9FD9E0', // turquesa
} as const;

/* -------------------------------------------------------------------------
 * Tipos locales — un superset liviano del Media del backend, así la página
 * funciona tanto con la API real como con los demos hardcoded.
 * ----------------------------------------------------------------------- */
type Track = Pick<Media, 'id' | 'title' | 'category' | 'coverImage' | 'embedUrl' | 'mediaUrl' | 'duration'>;
type Wallpaper = Pick<Media, 'id' | 'title' | 'category' | 'coverImage' | 'thumbUrl' | 'mediaUrl'>;
type Photo = Pick<Media, 'id' | 'title' | 'category' | 'thumbUrl' | 'coverImage' | 'mediaUrl'>;

/* -------------------------------------------------------------------------
 * Demos — se usan SI la API devuelve vacío o falla. Permite mostrarle la
 * página a alguien sin levantar el backend.
 * ----------------------------------------------------------------------- */
const DEMO_TRACKS: Track[] = [
  { id: 't1', title: 'cosas que me pasan', category: 'pop', duration: '3:21' },
  { id: 't2', title: 'silla vacía', category: 'indie', duration: '4:02' },
  { id: 't3', title: 'jueves', category: 'pop', duration: '2:48' },
  { id: 't4', title: 'no me llames', category: 'electrónica', duration: '3:55' },
  { id: 't5', title: 'humo', category: 'indie', duration: '5:10' },
  { id: 't6', title: 'la última vez', category: 'pop', duration: '3:33' },
];

const DEMO_WALLPAPERS: Wallpaper[] = [
  { id: 'w1', title: 'azul tarde', category: 'paisaje' },
  { id: 'w2', title: 'naranja domingo', category: 'paisaje' },
  { id: 'w3', title: 'humo IA', category: 'abstracto' },
  { id: 'w4', title: 'corazón mecánico', category: 'abstracto' },
  { id: 'w5', title: 'mar adentro', category: 'paisaje' },
  { id: 'w6', title: 'piel', category: 'retrato' },
];

const DEMO_PHOTOS: Photo[] = [
  { id: 'p1', title: 'estudio · enero' },
  { id: 'p2', title: 'gira norte' },
  { id: 'p3', title: 'sesión polaroid' },
  { id: 'p4', title: 'amanecer en costanera' },
  { id: 'p5', title: 'soundcheck' },
  { id: 'p6', title: 'mañana en casa' },
  { id: 'p7', title: 'show vivo · obras' },
  { id: 'p8', title: 'café 7am' },
  { id: 'p9', title: 'detrás de cámara' },
];

/* -------------------------------------------------------------------------
 * Hook — fetch + fallback a demos. Se hidrata en background, no bloquea
 * el render. Si la API tarda, vemos demos primero y se reemplazan.
 * ----------------------------------------------------------------------- */
function useMediaWithFallback() {
  const [tracks, setTracks] = useState<Track[]>(DEMO_TRACKS);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(DEMO_WALLPAPERS);
  const [photos, setPhotos] = useState<Photo[]>(DEMO_PHOTOS);

  useEffect(() => {
    let mounted = true;
    const fetchKind = async (kind: string) => {
      try {
        const r = await fetch(`/api/media?kind=${kind}`);
        if (!r.ok) return null;
        const data = await r.json();
        return Array.isArray(data) ? data : null;
      } catch {
        return null;
      }
    };
    Promise.all([fetchKind('cancion'), fetchKind('wallpaper'), fetchKind('foto')]).then(
      ([t, w, p]) => {
        if (!mounted) return;
        if (t && t.length) setTracks(t.slice(0, 6));
        if (w && w.length) setWallpapers(w.slice(0, 6));
        if (p && p.length) setPhotos(p.slice(0, 9));
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  return { tracks, wallpapers, photos };
}

/* -------------------------------------------------------------------------
 * Componente principal.
 * ----------------------------------------------------------------------- */
export default function MultimediaPreview() {
  // Modo presentación — mismo patrón que HeroPreview. ?demo=1 oculta el
  // chip de dev; toggle siempre visible.
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

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: '#0a0908',
        color: '#F3EFE6',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Estilos locales — mantengo los efectos atmosféricos en este file
          para que la página sea autocontenida y no contamine el resto. */}
      <style>{multimediaStyles}</style>

      {/* Grano sutil sobre todo el documento. Bajo opacity para no
          robarle atención a las imágenes. */}
      <div className="mm-grain" aria-hidden />

      {/* ========================================================
          1. HERO SLAB — liquid glass con el video idle adentro.
          La visión: slab vertical con Balosky en remera blanca +
          fondo negro, y los colores del humo de las 4 bolas
          "escapándose" por los bordes del cristal (blobs atrás).
          Es el aterrizaje natural del dissolve del hero.
          ======================================================== */}
      <HeroSlab />

      {/* ========================================================
          2. HUB — nav + 3 zonas + footer. Exportado como componente
          reusable para embeberlo en /preview-full (debajo del hero
          con orbes). Acá se monta con showFooter porque la página
          es standalone.
          ======================================================== */}
      <MultimediaHub showFooter />


      {/* ========================================================
          TOGGLE DE MODO PRESENTACIÓN — discreto, abajo-izq.
          ======================================================== */}
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
          /preview-multimedia
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * MultimediaHub — exportado para embeberlo en /preview-full debajo del
 * hero con orbes. Es self-contained: maneja su propio fetch, su propio
 * activeZone, y expone IDs estables por zona (`zone-musica` /
 * `zone-wallpapers` / `zone-fotos`) para que el padre pueda hacer
 * scrollIntoView desde afuera.
 * ----------------------------------------------------------------------- */
export function MultimediaHub({
  showFooter = false,
  skipMusica = false,
  skipFotos = false,
  compact = false,
}: {
  showFooter?: boolean;
  // Permite a /preview-full ocultar la zona música del hub porque allá la
  // renderizamos con el nuevo slab-style custom (ver MusicaSlab en
  // PreviewFull.tsx). El Hub sigue sirviendo wallpapers + fotos.
  skipMusica?: boolean;
  // Idem para fotos: /preview-full las muestra en el FotosCafecitoSlab
  // combinado (Variación 5) así que el hub sólo renderiza wallpapers.
  skipFotos?: boolean;
  // Layout tight para /preview-full: alinea las sections con el eje de los
  // slabs (max-w 1440 + padding reducido) y le suma la clase de seam-bleed
  // del sistema vidrioso. El standalone page sigue usando defaults.
  compact?: boolean;
}) {
  const { tracks, wallpapers, photos } = useMediaWithFallback();
  const musicRef = useRef<HTMLDivElement>(null);
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const [activeZone, setActiveZone] = useState<'musica' | 'wallpapers' | 'fotos' | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.zone as
              | 'musica'
              | 'wallpapers'
              | 'fotos'
              | undefined;
            if (id) setActiveZone(id);
          }
        });
      },
      { rootMargin: '-30% 0px -50% 0px' },
    );
    const refs: (HTMLDivElement | null)[] = [];
    if (!skipMusica) refs.push(musicRef.current);
    refs.push(wallpaperRef.current);
    if (!skipFotos) refs.push(photoRef.current);
    refs.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [skipMusica, skipFotos]);

  return (
    <>
      {/* Nav sticky de sub-zonas — pildoras de vidrio */}
      <nav
        className="sticky top-4 z-30 mx-auto w-fit px-3"
        style={{ marginTop: '-32px' }}
      >
        <div
          className="mm-glass relative flex items-center gap-1 p-1.5 rounded-full overflow-hidden"
          style={{
            background: 'rgba(10,9,8,0.55)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            boxShadow:
              'inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -1px 0 0 rgba(255,255,255,0.04), 0 8px 32px -8px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-full"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 100%)',
            }}
            aria-hidden
          />
          {!skipMusica && (
            <ZoneChip
              label="música"
              active={activeZone === 'musica'}
              color={ORB_PALETTE.multimedia}
              onClick={() => musicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          )}
          <ZoneChip
            label="wallpapers"
            active={activeZone === 'wallpapers'}
            color={ORB_PALETTE.ojo}
            onClick={() =>
              wallpaperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          />
          {!skipFotos && (
            <ZoneChip
              label="fotos"
              active={activeZone === 'fotos'}
              color={ORB_PALETTE.mira}
              onClick={() => photoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          )}
        </div>
      </nav>

      {/* ZONA MÚSICA — en /preview-full se renderiza afuera del Hub (ver
          MusicaSlab). Mostramos esta versión sólo en /preview-multimedia
          standalone. */}
      {!skipMusica && (
        <section
          ref={musicRef}
          id="zone-musica"
          data-zone="musica"
          className="relative px-4 md:px-16 pt-24 md:pt-28 pb-24 md:pb-32 max-w-6xl mx-auto"
          style={{ scrollMarginTop: '80px' }}
        >
          <ZoneHeader
            eyebrow="01 · sonido"
            title="música"
            subtitle="lo que estoy haciendo este año"
            color={ORB_PALETTE.multimedia}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} accent={ORB_PALETTE.multimedia} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <GlassButton color={ORB_PALETTE.multimedia}>ver todo el catálogo</GlassButton>
          </div>
        </section>
      )}

      {/* ZONA WALLPAPERS */}
      <section
        ref={wallpaperRef}
        id="zone-wallpapers"
        data-zone="wallpapers"
        className={
          compact
            ? 'pf-seamless-section relative px-4 md:px-8 lg:px-10 pt-2 md:pt-3 pb-6 md:pb-10 w-full'
            : 'relative px-4 md:px-10 pt-10 md:pt-14 pb-16 md:pb-24 max-w-[1320px] mx-auto'
        }
        style={{ scrollMarginTop: '80px' }}
      >
        <div
          className={
            compact
              ? 'pf-fc-slab relative w-full max-w-[1440px] mx-auto rounded-[28px] md:rounded-[36px] overflow-hidden px-6 md:px-10 pt-6 md:pt-8 pb-8 md:pb-12'
              : 'contents'
          }
        >
          <ZoneHeader
            eyebrow="02 · pixel"
            title="wallpapers"
            subtitle="para tu pantalla, gratis"
            color={ORB_PALETTE.ojo}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
            {wallpapers.map((w, i) => (
              <WallpaperTile key={w.id} wp={w} index={i} accent={ORB_PALETTE.ojo} />
            ))}
          </div>
        </div>
      </section>

      {/* ZONA FOTOS — En /preview-full la renderiza FotosCafecitoSlab. */}
      {!skipFotos && (
        <section
          ref={photoRef}
          id="zone-fotos"
          data-zone="fotos"
          className="relative px-4 md:px-16 pt-16 md:pt-20 pb-32 md:pb-40 max-w-6xl mx-auto"
          style={{ scrollMarginTop: '80px' }}
        >
          <ZoneHeader
            eyebrow="03 · ojo"
            title="fotos"
            subtitle="lo que vi"
            color={ORB_PALETTE.mira}
          />
          <div
            className="grid gap-2 mt-10 md:mt-12 mm-photo-grid"
            style={{ gridAutoFlow: 'dense' }}
          >
            {photos.map((p, i) => (
              <PhotoTile key={p.id} photo={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {showFooter && (
        <footer className="relative px-6 md:px-16 py-20 text-center border-t border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40 mb-3">
            balosky · preview
          </div>
          <Link
            to="/preview-hero?mode=orbs"
            className="text-sm opacity-60 hover:opacity-100 transition-opacity underline-offset-4 hover:underline"
          >
            ← volver al hero
          </Link>
        </footer>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
 * Sub-componentes locales.
 * ----------------------------------------------------------------------- */

/**
 * HeroSlab — la pieza central. Una "slab" de vidrio vertical que contiene
 * el video idle de Balosky (remera blanca, fondo negro, las 4 bolas de
 * humo en colores). Atrás de la slab, 4 blobs de color extendidos más
 * allá del borde — el efecto visual es que el humo del video "se escapa"
 * por los costados del cristal.
 *
 * Tratamiento liquid glass:
 *   - rim exterior 1px en gradiente (top brillante, bottom tenue)
 *   - specular highlight diagonal (gradiente blanco transparente arriba)
 *   - sombra inferior cromática (mezcla de los 4 orbes)
 *   - bordes muy redondeados (32px), corner inner highlight
 *   - sutil "breath": animación de scale infinita 8s, casi imperceptible
 *
 * Sobre desktop la slab está alineada a la derecha y el título queda a la
 * izquierda. En mobile la slab va arriba centrada y el título debajo.
 */
function HeroSlab() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden px-4 md:px-12 py-16 md:py-20">
      {/* ----- BLOBS DE HUMO atrás de la slab ----- */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* naranja — arriba-izq, grande, la "presencia" principal */}
        <div
          className="mm-blob"
          style={{
            top: '8%',
            left: '12%',
            width: '46vw',
            height: '46vw',
            maxWidth: '720px',
            maxHeight: '720px',
            background: `radial-gradient(circle, ${ORB_PALETTE.multimedia}55 0%, ${ORB_PALETTE.multimedia}22 35%, transparent 70%)`,
            animationDelay: '0s',
          }}
        />
        {/* rosa — arriba-der */}
        <div
          className="mm-blob"
          style={{
            top: '4%',
            right: '6%',
            width: '34vw',
            height: '34vw',
            maxWidth: '520px',
            maxHeight: '520px',
            background: `radial-gradient(circle, ${ORB_PALETTE.cafecito}44 0%, ${ORB_PALETTE.cafecito}1A 40%, transparent 70%)`,
            animationDelay: '-2s',
          }}
        />
        {/* crema — abajo-izq */}
        <div
          className="mm-blob"
          style={{
            bottom: '8%',
            left: '4%',
            width: '38vw',
            height: '38vw',
            maxWidth: '600px',
            maxHeight: '600px',
            background: `radial-gradient(circle, ${ORB_PALETTE.ojo}3A 0%, ${ORB_PALETTE.ojo}11 45%, transparent 70%)`,
            animationDelay: '-4s',
          }}
        />
        {/* turquesa — abajo-der */}
        <div
          className="mm-blob"
          style={{
            bottom: '12%',
            right: '14%',
            width: '40vw',
            height: '40vw',
            maxWidth: '640px',
            maxHeight: '640px',
            background: `radial-gradient(circle, ${ORB_PALETTE.mira}40 0%, ${ORB_PALETTE.mira}14 40%, transparent 70%)`,
            animationDelay: '-6s',
          }}
        />
      </div>

      {/* ----- Contenido — split layout ----- */}
      <div className="relative w-full max-w-7xl mx-auto grid md:grid-cols-12 gap-8 md:gap-12 items-center z-10">
        {/* Texto / títulos — col-span 7 en desktop, full en mobile */}
        <div className="md:col-span-7 order-2 md:order-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-50 mb-5 md:mb-6">
            del otro lado · zona 01
          </div>
          <h1
            className="leading-[0.84] mb-5 md:mb-7"
            style={{
              fontFamily: 'Inter Tight, sans-serif',
              fontWeight: 900,
              letterSpacing: '-0.06em',
              fontSize: 'clamp(54px, 11vw, 168px)',
              color: '#F3EFE6',
            }}
          >
            multi
            <br />
            <span style={{ color: ORB_PALETTE.multimedia }}>media</span>
          </h1>
          <p
            className="max-w-xl text-base md:text-lg leading-relaxed opacity-65 mb-8"
            style={{ color: '#F3EFE6' }}
          >
            Música, wallpapers, fotos. Todo junto, atrás del mismo cristal.
            Bajá.
          </p>
          {/* Indicador de scroll — pegado al título, no al borde inferior
              de la pantalla, para que respire mejor en mobile. */}
          <div className="mm-pulse text-[10px] font-mono tracking-[0.3em] opacity-40 uppercase">
            ↓ scroll
          </div>
        </div>

        {/* Slab — col-span 5 en desktop */}
        <div className="md:col-span-5 order-1 md:order-2 flex justify-center md:justify-end">
          <LiquidSlab />
        </div>
      </div>
    </section>
  );
}

/**
 * LiquidSlab — el cristal en sí, con el video idle adentro y todos los
 * detalles de liquid glass (rim, specular, sombra cromática).
 *
 * Está pensado para ser autocontenido — podés usarlo en otras secciones
 * sumando un `src` distinto si quisieras (futura expansión).
 */
function LiquidSlab() {
  return (
    <div className="relative mm-slab-breath">
      {/* Sombra inferior cromática — proyecta los colores de los orbes
          como si fuera la luz que pasa por el vidrio y cae al piso. */}
      <div
        className="absolute -inset-x-8 -bottom-10 h-24 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 25% 50%, ${ORB_PALETTE.multimedia}66 0%, transparent 55%),
            radial-gradient(ellipse at 75% 50%, ${ORB_PALETTE.cafecito}44 0%, transparent 55%),
            radial-gradient(ellipse at 50% 90%, ${ORB_PALETTE.mira}33 0%, transparent 60%)
          `,
          filter: 'blur(32px)',
          opacity: 0.85,
        }}
        aria-hidden
      />

      {/* Slab container — aspect ratio 9:13 vertical, ancho responsivo */}
      <div
        className="relative rounded-[32px] overflow-hidden"
        style={{
          width: 'min(78vw, 360px)',
          aspectRatio: '9 / 13',
          // Sombra principal — drop shadow profunda para sentir grosor
          boxShadow: `
            0 30px 80px -20px rgba(0,0,0,0.7),
            0 10px 30px -10px rgba(0,0,0,0.5)
          `,
        }}
      >
        {/* RETRATO — la foto cropeada 9:16. El humo de colores viene de
            los blobs que están ATRÁS de la slab (no del retrato), así
            la foto puede respirar limpia y los colores se "filtran"
            por los costados del cristal. */}
        <img
          src="/uploads/balosky-portrait.jpg"
          alt="Balosky"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Tinte oscuro muy sutil para que el cristal "tenga peso" */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(10,9,8,0.05)' }}
          aria-hidden
        />

        {/* RIM — borde con gradiente: top brilla, bottom apaga.
            Lo hacemos con un inset box-shadow doble así no comemos espacio
            interno y el rim queda *adentro* del rounded corner. */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[32px]"
          style={{
            boxShadow: `
              inset 0 1px 0 0 rgba(255,255,255,0.35),
              inset 0 -1px 0 0 rgba(255,255,255,0.04),
              inset 1px 0 0 0 rgba(255,255,255,0.10),
              inset -1px 0 0 0 rgba(255,255,255,0.06)
            `,
          }}
          aria-hidden
        />

        {/* SPECULAR HIGHLIGHT — destello diagonal arriba-izquierda,
            la firma del liquid glass. */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[32px]"
          style={{
            background: `
              linear-gradient(135deg,
                rgba(255,255,255,0.18) 0%,
                rgba(255,255,255,0.04) 18%,
                transparent 38%),
              linear-gradient(to bottom,
                rgba(255,255,255,0.05) 0%,
                transparent 22%)
            `,
            mixBlendMode: 'overlay',
          }}
          aria-hidden
        />

        {/* Glare brillante chiquito arriba — el "lighthouse moment" */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: '6%',
            left: '12%',
            width: '24%',
            height: '6%',
            background:
              'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)',
            filter: 'blur(2px)',
          }}
          aria-hidden
        />

        {/* Label inferior dentro de la slab — muy sutil, como un grabado */}
        <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
          <div
            className="text-[9px] font-mono uppercase tracking-[0.32em] text-white/55 text-center"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            balosky · 2026
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.18em] transition-all"
      style={{
        background: active ? `${color}22` : 'transparent',
        color: active ? color : 'rgba(243,239,230,0.65)',
        boxShadow: active ? `inset 0 0 0 1px ${color}55` : 'none',
      }}
    >
      {label}
    </button>
  );
}

function ZoneHeader({
  eyebrow,
  title,
  subtitle,
  color,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="relative">
      {/* Glow detrás del título */}
      <div
        className="absolute -inset-x-20 -top-12 -bottom-4 pointer-events-none opacity-50"
        style={{
          background: `radial-gradient(ellipse at 10% 50%, ${color}1A 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
        aria-hidden
      />
      <div className="relative">
        <div
          className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.3em] mb-4"
          style={{
            background: `${color}1A`,
            color,
            border: `1px solid ${color}33`,
          }}
        >
          {eyebrow}
        </div>
        <h2
          className="leading-[0.92] mb-2"
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            fontSize: 'clamp(40px, 8vw, 96px)',
            color: '#F3EFE6',
          }}
        >
          {title}
        </h2>
        <p className="text-sm md:text-base opacity-50">{subtitle}</p>
      </div>
    </div>
  );
}

function TrackCard({ track, accent }: { track: Track; accent: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="mm-glass relative flex items-center gap-4 px-4 py-3 rounded-3xl cursor-pointer overflow-hidden"
      style={{
        background: hover ? 'rgba(243,239,230,0.06)' : 'rgba(243,239,230,0.03)',
        backdropFilter: 'blur(18px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
        boxShadow: hover
          ? `inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -1px 0 0 rgba(255,255,255,0.04), 0 8px 24px -10px ${accent}55`
          : 'inset 0 1px 0 0 rgba(255,255,255,0.10), inset 0 -1px 0 0 rgba(255,255,255,0.02)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 240ms ease',
      }}
    >
      {/* specular highlight superior — la firma del liquid glass */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, transparent 100%)',
        }}
        aria-hidden
      />
      {/* Disco / placeholder con glow */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: `radial-gradient(circle at center, ${accent}55 0%, ${accent}11 70%, transparent 100%)`,
          boxShadow: hover ? `0 0 24px ${accent}55` : `0 0 12px ${accent}22`,
          transition: 'box-shadow 240ms ease',
        }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium truncate">{track.title}</div>
        <div className="text-[11px] opacity-50 mt-0.5">
          {track.category || 'balosky'} · {track.duration || '—:—'}
        </div>
      </div>
      <div
        className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 transition-opacity"
        style={{ opacity: hover ? 0.8 : 0.3 }}
      >
        play →
      </div>
    </div>
  );
}

function WallpaperTile({
  wp,
  index,
  accent,
}: {
  wp: Wallpaper;
  index: number;
  accent: string;
}) {
  const [hover, setHover] = useState(false);
  // Variación cromática entre tiles para que la grilla no se vea plana.
  const hue = (index * 47) % 360;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transition-transform"
      style={{
        background: wp.coverImage
          ? `url(${wp.coverImage}) center/cover`
          : `linear-gradient(135deg, hsl(${hue}, 35%, 18%) 0%, hsl(${(hue + 40) % 360}, 25%, 8%) 100%)`,
        border: `1px solid rgba(243,239,230,${hover ? '0.18' : '0.06'})`,
        transform: hover ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hover ? `0 24px 60px -20px ${accent}55, 0 0 40px ${accent}22` : 'none',
      }}
    >
      {/* Vignette + label */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(10,9,8,0.85) 0%, rgba(10,9,8,0.2) 40%, transparent 70%)',
        }}
      />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60 mb-1">
          {wp.category || 'wallpaper'}
        </div>
        <div className="text-sm font-medium truncate">{wp.title}</div>
      </div>
    </div>
  );
}

function PhotoTile({ photo, index }: { photo: Photo; index: number }) {
  const [hover, setHover] = useState(false);
  const hue = (index * 71) % 360;
  // Patrón tetris: cada 5ª foto ocupa 2x2.
  const big = index % 5 === 0;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        gridColumn: big ? 'span 2' : 'span 1',
        gridRow: big ? 'span 2' : 'span 1',
        background: photo.thumbUrl
          ? `url(${photo.thumbUrl}) center/cover`
          : photo.coverImage
            ? `url(${photo.coverImage}) center/cover`
            : `linear-gradient(${hue}deg, hsl(${hue}, 30%, 22%) 0%, hsl(${(hue + 60) % 360}, 20%, 10%) 100%)`,
        border: `1px solid rgba(243,239,230,${hover ? '0.18' : '0.04'})`,
        transform: hover ? 'scale(1.02)' : 'scale(1)',
        zIndex: hover ? 1 : 0,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        style={{
          background: 'linear-gradient(to top, rgba(10,9,8,0.7) 0%, transparent 50%)',
          opacity: hover ? 1 : 0.4,
        }}
      />
      <div
        className="absolute bottom-2 left-2 right-2 text-[10px] font-mono uppercase tracking-[0.18em] transition-opacity"
        style={{ opacity: hover ? 0.85 : 0 }}
      >
        {photo.title}
      </div>
    </div>
  );
}

function GlassButton({
  children,
  color,
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative px-7 py-3.5 rounded-full text-[12px] font-mono uppercase tracking-[0.22em] transition-all overflow-hidden"
      style={{
        background: hover ? `${color}22` : 'rgba(243,239,230,0.04)',
        color: hover ? color : '#F3EFE6',
        backdropFilter: 'blur(18px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
        boxShadow: hover
          ? `inset 0 1px 0 0 rgba(255,255,255,0.25), inset 0 -1px 0 0 rgba(255,255,255,0.05), 0 0 32px ${color}44, 0 8px 20px -8px ${color}66`
          : 'inset 0 1px 0 0 rgba(255,255,255,0.14), inset 0 -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* specular */}
      <span
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-full"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.10) 0%, transparent 100%)',
        }}
        aria-hidden
      />
      <span className="relative">{children}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Estilos locales — grain SVG, animaciones suaves. Inyectados via <style>
 * para mantener la página autocontenida (no contamina src/index.css).
 * ----------------------------------------------------------------------- */
const multimediaStyles = `
.mm-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.06;
  z-index: 1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: overlay;
}

@keyframes mm-pulse-anim {
  0%, 100% { opacity: 0.4; transform: translateY(0); }
  50%      { opacity: 0.8; transform: translateY(4px); }
}
.mm-pulse {
  animation: mm-pulse-anim 2.4s ease-in-out infinite;
  display: inline-block;
}

.mm-glass {
  transition: all 240ms ease;
}

/* Blobs de humo que respiran atrás de la slab. Cada uno se desfasa
   con animationDelay inline para que no se muevan en sincro. */
@keyframes mm-blob-drift {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  33% {
    transform: translate(3%, -2%) scale(1.06);
    opacity: 0.92;
  }
  66% {
    transform: translate(-2%, 3%) scale(0.96);
    opacity: 0.88;
  }
}
.mm-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  animation: mm-blob-drift 14s ease-in-out infinite;
  will-change: transform, opacity;
}

/* Respiración MUY sutil de la slab — 8s, 1.5% de scale, imperceptible
   pero suma "vida" al cristal. */
@keyframes mm-slab-breath-anim {
  0%, 100% { transform: scale(1) translateY(0); }
  50%      { transform: scale(1.015) translateY(-2px); }
}
.mm-slab-breath {
  animation: mm-slab-breath-anim 8s ease-in-out infinite;
  will-change: transform;
}

/* Grilla tetris de fotos — tiles más chicos en mobile para que no
   queden 1-col exageradamente grandes. En desktop ~180px. */
.mm-photo-grid {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  grid-auto-rows: 140px;
}
@media (min-width: 768px) {
  .mm-photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    grid-auto-rows: 180px;
  }
}

/* Mobile tweaks — en pantallas chicas bajamos la intensidad de los
   blobs (consumen batería + se ven demasiado saturados al lado de
   la slab pequeña) y desactivamos la respiración para ahorrar GPU. */
@media (max-width: 768px) {
  .mm-blob {
    filter: blur(36px);
    opacity: 0.7;
  }
  .mm-slab-breath {
    animation: none;
  }
}

/* Respeto para gente que prefiere menos movimiento. */
@media (prefers-reduced-motion: reduce) {
  .mm-blob, .mm-slab-breath, .mm-pulse {
    animation: none !important;
  }
}
`;
