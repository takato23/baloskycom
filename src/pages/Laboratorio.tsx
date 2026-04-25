/**
 * /laboratorio — Santi's AI-generated video lab.
 *
 * The grid shows the cover image (poster) for each video. Desktop visitors
 * trigger an inline muted preview by hovering; mobile visitors tap to enter
 * a full-screen Reels-style immersive feed with sound, swipe-to-navigate,
 * and a metadata panel.
 *
 * The grid is "smart" about aspect ratio: when every visible item declares
 * the same aspectRatio it uses that ratio for the cards; when mixed, it
 * falls back to 1:1 so neither vertical nor horizontal pieces get cropped
 * aggressively.
 *
 * Per-item visibility flags (showTool, showDescription, showPrompt) come
 * from /api/media so the admin can decide what's exposed publicly.
 *
 * Data source: GET /api/media?kind=video_ia.
 */
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, VolumeX, X, Copy, Check, Sparkles, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Media } from '@/types';
import { cn } from '@/lib/utils';

// El visor 360 sólo se carga cuando el usuario abre un panorama — así evitamos
// que el bundle de three.js impacte el first paint de /laboratorio.
const Panorama360Viewer = lazy(() => import('@/components/Panorama360Viewer'));

type AspectRatio = '9:16' | '16:9' | '1:1';

const ASPECT_CLASS: Record<AspectRatio, string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '1:1':  'aspect-square',
};

/** Fallback when no aspectRatio is set on the row. */
const DEFAULT_ASPECT: AspectRatio = '9:16';
const MEDIA_FETCH_TIMEOUT_MS = 2600;

const FALLBACK_VIDEOS: Media[] = [{
  id: 'fallback_molinete_conurbano',
  kind: 'video_ia',
  title: 'El molinete del conurbano',
  description: 'Pieza de archivo para que el Laboratorio siga vivo aunque el feed tarde en responder.',
  category: 'IDEAS · IA',
  mediaUrl: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/videos/balosky-molinete-conurbano.web.mp4',
  coverImage: '/uploads/thumbs/balosky-hero-loop-first.png',
  thumbUrl: '/uploads/thumbs/balosky-hero-loop-first.png',
  duration: '0:24',
  aiTool: 'IA',
  aspectRatio: '16:9',
  showDescription: true,
  showPrompt: false,
  showTool: true,
  isLocked: false,
  active: true,
  featured: true,
  sortOrder: 0,
  createdAt: '2026-04-25T00:00:00.000Z',
}];

/** Whether the public flag is on. Defaults to true so legacy rows keep showing. */
const isOn = (v: boolean | undefined) => v !== false;

function fetchMediaWithTimeout(kind: Media['kind'], fallback: Media[], label: string): Promise<Media[]> {
  const controller = new AbortController();
  let settled = false;

  return new Promise((resolve) => {
    const finish = (value: Media[]) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };

    const timer = window.setTimeout(() => {
      controller.abort();
      console.warn(`[Laboratorio] ${label} timeout, using fallback`);
      finish(fallback);
    }, MEDIA_FETCH_TIMEOUT_MS);

    fetch(`/api/media?kind=${encodeURIComponent(kind)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Media[]>;
      })
      .then((rows) => finish(rows))
      .catch((error) => {
        if (!settled && error?.name !== 'AbortError') {
          console.warn(`[Laboratorio] ${label} failed, using fallback`, error);
        }
        finish(fallback);
      });
  });
}

export default function Laboratorio() {
  const [items, setItems] = useState<Media[]>([]);
  const [panoramas, setPanoramas] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<string>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [openPanoramaIndex, setOpenPanoramaIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    // Traemos videos y panoramas en paralelo. Si la API tarda, abortamos las
    // requests para no bloquear la carga perezosa del visor 360.
    Promise.all([
      fetchMediaWithTimeout('video_ia', FALLBACK_VIDEOS, 'video_ia fetch'),
      fetchMediaWithTimeout('panorama_360', [], 'panorama_360 fetch'),
    ])
      .then(([videoRows, panoRows]) => {
        if (!mounted) return;
        const activeVideos = videoRows.filter((r) => r.active !== false);
        const activePanoramas = panoRows.filter((r) => r.active !== false && (r.mediaUrl || r.coverImage));

        setItems(activeVideos.length ? activeVideos : FALLBACK_VIDEOS);
        setPanoramas(activePanoramas);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const tools = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.aiTool && isOn(i.showTool)) set.add(i.aiTool);
    });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (activeTool === 'all') return items;
    return items.filter((i) => i.aiTool === activeTool);
  }, [items, activeTool]);

  // Smart grid aspect: if every visible item shares one aspectRatio, use it.
  // Otherwise fall back to 1:1 so vertical and horizontal coexist cleanly.
  const gridAspect: AspectRatio = useMemo(() => {
    if (!filtered.length) return DEFAULT_ASPECT;
    const ratios = new Set<AspectRatio>();
    for (const item of filtered) {
      const r = (item.aspectRatio || DEFAULT_ASPECT) as AspectRatio;
      ratios.add(r);
      if (ratios.size > 1) return '1:1';
    }
    return Array.from(ratios)[0] || DEFAULT_ASPECT;
  }, [filtered]);

  const labSections = useMemo(() => ([
    {
      href: '#panoramas',
      label: 'Panoramas 360',
      value: panoramas.length,
      meta: panoramas.length ? 'mirar alrededor' : 'pendiente',
    },
    {
      href: '#videos-ia',
      label: 'Videos IA',
      value: items.length,
      meta: 'clips + storyboard',
    },
    {
      href: '#herramientas',
      label: 'Herramientas',
      value: tools.length || 1,
      meta: 'Sora · Veo · Runway',
    },
  ]), [items.length, panoramas.length, tools.length]);

  const closeModal = useCallback(() => setOpenIndex(null), []);
  const goPrev = useCallback(() => {
    setOpenIndex((cur) => (cur === null ? null : (cur - 1 + filtered.length) % filtered.length));
  }, [filtered.length]);
  const goNext = useCallback(() => {
    setOpenIndex((cur) => (cur === null ? null : (cur + 1) % filtered.length));
  }, [filtered.length]);

  const blockAssetMenu = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
  }, []);

  return (
    <div
      className="theme-page theme-adapt min-h-screen w-full overflow-x-clip pb-32 sm:pb-16"
      onContextMenu={blockAssetMenu}
    >
      {/* Hero */}
      <section className="relative mx-auto w-full max-w-[1440px] overflow-hidden !px-[clamp(20px,4vw,80px)] !pt-10 !pb-8 sm:!pt-20 sm:!pb-14">
        <div
          aria-hidden="true"
          className="absolute inset-x-[clamp(20px,4vw,80px)] top-8 bottom-8 -z-10 bg-[linear-gradient(115deg,rgba(250,93,41,0.11),rgba(240,46,101,0.08)_31%,rgba(24,210,196,0.10)_62%,rgba(255,184,61,0.08))] border-y border-[var(--border)]"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.52, 0, 0, 1] }}
          className="space-y-6 py-8 sm:py-12"
        >
          <div className="t-eyebrow text-[var(--muted)] flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[rgba(24,210,196,0.42)] bg-[rgba(24,210,196,0.10)] text-[#18d2c4]">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span>LABORATORIO · VIDEO · IA</span>
          </div>
          <h1 className="t-hero text-[clamp(52px,9.5vw,170px)] text-[var(--black)] leading-[0.88]">
            Laboratorio<span className="bg-gradient-to-r from-[var(--accent)] via-[#f02e65] to-[#18d2c4] bg-clip-text text-transparent">.</span>
          </h1>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <p className="t-body max-w-2xl text-base sm:text-lg">
              Panoramas 360, videos generados con IA y piezas de proceso. Cada
              cosa entra como capítulo, no como galería suelta.
            </p>
          </div>
          <nav
            aria-label="Secciones del laboratorio"
            className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-3"
          >
            {labSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="group flex min-h-[76px] items-end justify-between gap-4 border border-[var(--border)] bg-[rgba(255,255,255,0.38)] px-4 py-3 text-left backdrop-blur-sm transition-[background,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[#18d2c4]/70 hover:bg-white/60"
              >
                <span>
                  <span className="block font-['Inter_Tight'] text-2xl font-black leading-none text-[var(--black)]">
                    {section.value}
                  </span>
                  <span className="t-eyebrow mt-1 block text-[10px] text-[var(--muted)]">
                    {section.label}
                  </span>
                </span>
                <span className="max-w-[11ch] text-right text-[11px] font-semibold leading-tight text-[var(--muted)] transition-colors group-hover:text-[var(--black)]">
                  {section.meta}
                </span>
              </a>
            ))}
          </nav>
        </motion.div>

        {/* Tool filter — only when there's more than one tool to choose from */}
        {tools.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-wrap gap-2"
          >
            <FilterChip
              label="Todo"
              count={items.length}
              active={activeTool === 'all'}
              onClick={() => setActiveTool('all')}
            />
            {tools.map((t) => (
              <FilterChip
                key={t}
                label={t}
                count={items.filter((i) => i.aiTool === t).length}
                active={activeTool === t}
                onClick={() => setActiveTool(t)}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* Sección 360° — aparece antes del grid para que el Laboratorio tenga una pieza interactiva real aun cuando el feed tarde. */}
      <Panorama360Section
        panoramas={panoramas}
        onOpen={(i) => setOpenPanoramaIndex(i)}
      />

      {/* Videos */}
      <section
        id="videos-ia"
        className="mx-auto w-full max-w-[1440px] scroll-mt-28 !px-[clamp(20px,4vw,80px)] !pt-14 !pb-20 sm:!pt-20"
      >
        <SectionLead
          eyebrow="LABORATORIO · VIDEO · IA"
          title="Videos con proceso."
          copy="Cada pieza puede abrirse como expediente: video, prompt y frames del storyboard que muestran cómo nació."
        />
        {loading ? (
          <LoadingGrid aspect={gridAspect} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map((item, i) => (
              <VideoCard
                key={item.id}
                item={item}
                index={i}
                aspect={gridAspect}
                isMobile={isMobile}
                onOpen={() => setOpenIndex(i)}
              />
            ))}
          </div>
        )}
      </section>

      <section
        id="herramientas"
        className="mx-auto w-full max-w-[1440px] scroll-mt-28 !px-[clamp(20px,4vw,80px)] !pb-20"
      >
        <SectionLead
          eyebrow="LABORATORIO · HERRAMIENTAS"
          title="Aplicaciones."
          copy="El mapa de máquinas que van apareciendo en las piezas: modelos de video, generación, edición y experimentos."
        />
        <div className="flex flex-wrap gap-2">
          {(tools.length ? tools : ['IA']).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setActiveTool(tool === 'IA' && tools.length === 0 ? 'all' : tool)}
              className="min-h-11 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.42)] px-5 text-sm font-black text-[var(--black)] transition-colors hover:border-[#18d2c4]/70 hover:bg-white"
            >
              {tool}
            </button>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {openIndex !== null && filtered[openIndex] && (
          isMobile ? (
            <MobileFeedModal
              items={filtered}
              startIndex={openIndex}
              onClose={closeModal}
            />
          ) : (
            <DesktopVideoModal
              item={filtered[openIndex]}
              onClose={closeModal}
              onPrev={goPrev}
              onNext={goNext}
            />
          )
        )}
        {openPanoramaIndex !== null && panoramas[openPanoramaIndex] && (
          <Panorama360Modal
            panoramas={panoramas}
            startIndex={openPanoramaIndex}
            onClose={() => setOpenPanoramaIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————————————
// Card — poster image always visible. On desktop hover, a muted video
// element mounts inline and plays; leaving the card pauses + hides it. On
// mobile, the card stays a poster — tap opens the immersive feed.
// ————————————————————————————————————————————————————————————————————————
function VideoCard({
  item,
  index,
  aspect,
  isMobile,
  onOpen,
}: {
  item: Media;
  index: number;
  aspect: AspectRatio;
  isMobile: boolean;
  onOpen: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start playback when the user hovers; pause + reset when they leave so
  // we don't keep N tabs of muted clips running in the background.
  useEffect(() => {
    if (isMobile) return;
    const v = videoRef.current;
    if (!v) return;
    if (hovering) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [hovering, isMobile]);

  const isEmbed = !!item.embedUrl;
  const storyboardCount = item.assetUrls?.filter(Boolean).length || 0;
  // The card's aspect comes from the grid (for layout uniformity); we use the
  // item's own aspectRatio only inside the modal where everything is fluid.

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      data-hover
      data-cursor-label="OPEN"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.5, ease: [0.52, 0, 0, 1] }}
      className={cn(
        'group relative block w-full overflow-hidden',
        'bg-[var(--grey)] border border-[var(--border)]',
        'text-left transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[rgba(24,210,196,0.55)] hover:shadow-[0_20px_60px_-34px_rgba(24,210,196,0.95)]',
        ASPECT_CLASS[aspect],
      )}
    >
      {/* Poster — always rendered, never disappears so layout never reflows */}
      {item.coverImage ? (
        <img
          src={item.coverImage}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'transition-opacity duration-300',
            hovering && !isMobile && !isEmbed ? 'opacity-0' : 'opacity-100',
          )}
        />
      ) : (
        // Fallback poster: gradient with the title — happens when no cover
        // is set yet (e.g. fresh upload waiting for a manual frame).
        <div
          className={cn(
            'absolute inset-0 w-full h-full',
            'bg-[linear-gradient(135deg,#111_0%,#2a114e_42%,#064f54_72%,#fa5d29_100%)]',
            'transition-opacity duration-300',
            hovering && !isMobile && !isEmbed ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.28),transparent_34%),radial-gradient(circle_at_72%_68%,rgba(240,46,101,0.36),transparent_38%)]" />
          <div className="absolute left-4 top-4 h-14 w-14 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm" />
          <div className="absolute bottom-16 right-5 h-24 w-24 rounded-full border border-[#18d2c4]/50" />
        </div>
      )}

      {/* Hover-to-play preview — mounted on first hover so non-hovered cards
          don't waste bandwidth. Mobile never mounts this. */}
      {!isMobile && !isEmbed && item.mediaUrl && hovering && (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          poster={item.coverImage || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay for legibility */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

      {/* Play glyph — always visible on mobile, hover-only on desktop */}
      <div
        className={cn(
          'absolute top-3 right-3 flex items-center justify-center',
          'w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/20',
          'text-white transition-opacity duration-300',
          !isMobile && 'opacity-0 group-hover:opacity-100',
        )}
      >
        <Play className="w-4 h-4 fill-white" />
      </div>

      {/* AI tool chip — respects showTool flag */}
      {item.aiTool && isOn(item.showTool) && (
        <div className="absolute top-3 left-3">
          <div className="t-eyebrow text-[10px] bg-gradient-to-r from-[var(--accent)] via-[#f02e65] to-[#18d2c4] text-white px-2 py-1 border border-white/20">
            {item.aiTool}
          </div>
        </div>
      )}

      {/* Footer metadata */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
        <div className="mb-2 inline-flex rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/75 backdrop-blur">
          expediente · {storyboardCount ? `${storyboardCount} frames` : 'storyboard pendiente'}
        </div>
        <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
          {item.title}
        </h3>
        {item.duration && (
          <div className="t-eyebrow text-[10px] opacity-80 mt-1">{item.duration}</div>
        )}
        <div className="mt-3 hidden min-h-10 items-center rounded-full bg-white px-4 text-xs font-black text-black shadow-[0_16px_36px_-28px_rgba(0,0,0,0.75)] transition-transform group-hover:translate-x-1 sm:inline-flex">
          abrir expediente →
        </div>
      </div>
    </motion.button>
  );
}

// ————————————————————————————————————————————————————————————————————————
// Desktop modal — split layout: video on the left, metadata panel on the
// right. ← / → keys jump between videos in the current filtered set.
// ————————————————————————————————————————————————————————————————————————
function DesktopVideoModal({
  item,
  onClose,
  onPrev,
  onNext,
}: {
  item: Media;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Esc/← /→ keyboard shortcuts. Lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  // Autoplay with sound on every item change. If the browser blocks audio,
  // fall back to muted playback and surface the mute button.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, [item.id]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  };

  const copyPrompt = () => {
    if (!item.aiPrompt) return;
    navigator.clipboard.writeText(item.aiPrompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Lock the player container to the item's aspect ratio so 16:9 pieces
  // don't get squished into a 9:16 frame.
  const itemAspect = (item.aspectRatio || DEFAULT_ASPECT) as AspectRatio;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.52, 0, 0, 1] }}
        className="relative w-full h-full flex flex-col lg:flex-row items-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video side */}
        <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0">
          <div className={cn(
            'relative h-full max-h-[70vh] lg:max-h-[90vh] bg-black border border-white/10 overflow-hidden',
            ASPECT_CLASS[itemAspect],
          )}>
            {item.mediaUrl && !item.embedUrl && (
              <video
                ref={videoRef}
                src={item.mediaUrl}
                poster={item.coverImage || undefined}
                controls
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
            {item.embedUrl && (
              <iframe
                src={item.embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          {/* Prev / Next nav arrows */}
          <button
            onClick={onPrev}
            data-hover
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full backdrop-blur transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={onNext}
            data-hover
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full backdrop-blur transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Quick mute toggle — only relevant for direct video */}
          {item.mediaUrl && !item.embedUrl && (
            <button
              onClick={toggleMute}
              data-hover
              className="absolute top-4 right-16 p-2 text-white/70 hover:text-white transition-colors"
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            data-hover
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Metadata side — expediente de proceso */}
        <aside className="w-full lg:w-[440px] lg:border-l border-white/10 bg-black/60 p-6 sm:p-8 overflow-y-auto text-white">
          <div className="space-y-6">
            <div className="t-eyebrow text-white/40 text-[10px]">Expediente de pieza</div>
            {item.aiTool && isOn(item.showTool) && (
              <div className="t-eyebrow text-[var(--accent)] text-[10px]">
                {item.aiTool}
                {item.category ? ` · ${item.category}` : ''}
              </div>
            )}
            <h2 className="t-section text-3xl sm:text-4xl leading-tight">{item.title}</h2>
            {item.description && isOn(item.showDescription) && (
              <p className="t-body text-white/80 text-sm sm:text-base leading-relaxed">
                {item.description}
              </p>
            )}

            {item.aiPrompt && isOn(item.showPrompt) && (
              <div className="space-y-2">
                <div className="t-eyebrow text-white/40 text-[10px]">Prompt</div>
                <div className="relative bg-white/5 border border-white/10 p-4 font-mono text-xs sm:text-sm text-white/90 leading-relaxed">
                  {item.aiPrompt}
                  <button
                    onClick={copyPrompt}
                    data-hover
                    aria-label="Copiar prompt"
                    className="absolute top-2 right-2 p-1.5 bg-white/5 border border-white/10 hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <AssetWall urls={item.assetUrls} />

            {item.duration && (
              <div className="t-eyebrow text-white/40 text-[10px]">
                Duración · {item.duration}
              </div>
            )}

            {/* Keyboard hint */}
            <div className="pt-4 border-t border-white/10 text-[10px] uppercase tracking-wider text-white/30">
              ← → para navegar · Esc para cerrar
            </div>
          </div>
        </aside>
      </motion.div>
    </motion.div>
  );
}

// ————————————————————————————————————————————————————————————————————————
// Mobile feed modal — Reels/TikTok style. Vertical scroll-snap container
// where every "page" is the full viewport. Each item plays automatically
// when it's the active page; sound is on by default. Tap the close button
// to exit; horizontal swipe also closes.
// ————————————————————————————————————————————————————————————————————————
function MobileFeedModal({
  items,
  startIndex,
  onClose,
}: {
  items: Media[];
  startIndex: number;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(startIndex);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Jump to the start item on open
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: startIndex * c.clientHeight, behavior: 'auto' });
  }, [startIndex]);

  // Track which item is in view as the user swipes
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(c.scrollTop / c.clientHeight);
        setActiveIdx(idx);
      });
    };
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      c.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Esc to close (in case there's a hardware keyboard on tablet)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Close + counter — fixed to viewport so they don't scroll */}
      <button
        onClick={onClose}
        data-hover
        aria-label="Cerrar"
        className="fixed top-3 right-3 z-[110] p-2 rounded-full bg-black/40 backdrop-blur text-white"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="fixed top-3 left-3 z-[110] px-3 py-1 rounded-full bg-black/40 backdrop-blur text-white text-[11px] tracking-wider">
        {activeIdx + 1} / {items.length}
      </div>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {items.map((item, i) => (
          <MobileFeedSlide
            key={item.id}
            item={item}
            isActive={i === activeIdx}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MobileFeedSlide({ item, isActive }: { item: Media; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.muted = false;
      setMuted(false);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, [isActive]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  };

  const copyPrompt = () => {
    if (!item.aiPrompt) return;
    navigator.clipboard.writeText(item.aiPrompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      className="h-full w-full snap-start relative bg-black flex items-center justify-center"
      style={{ scrollSnapAlign: 'start' }}
    >
      {item.mediaUrl && !item.embedUrl && (
        <video
          ref={videoRef}
          src={item.mediaUrl}
          poster={item.coverImage || undefined}
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-contain"
          onClick={toggleMute}
        />
      )}
      {item.embedUrl && (
        <iframe
          src={item.embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      )}

      {/* Bottom gradient + metadata */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 pb-10 text-white pointer-events-none">
        {item.aiTool && isOn(item.showTool) && (
          <div className="t-eyebrow text-[10px] text-[var(--accent)] mb-2">
            {item.aiTool}
            {item.category ? ` · ${item.category}` : ''}
          </div>
        )}
        <h2 className="font-bold text-xl leading-tight">{item.title}</h2>
        {item.description && isOn(item.showDescription) && (
          <p className="mt-2 text-sm text-white/80 leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}
        {item.aiPrompt && isOn(item.showPrompt) && (
          <div className="mt-3 pointer-events-auto">
            <details className="bg-white/5 border border-white/10 rounded">
              <summary className="cursor-pointer px-3 py-2 text-[11px] uppercase tracking-wider">
                Ver prompt
              </summary>
              <div className="relative px-3 pb-3 pt-1 text-xs font-mono text-white/85 leading-relaxed">
                {item.aiPrompt}
                <button
                  onClick={copyPrompt}
                  className="absolute top-1 right-1 p-1.5 bg-white/10 border border-white/10 active:bg-[var(--accent)]"
                  aria-label="Copiar prompt"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </details>
          </div>
        )}
        <AssetWall urls={item.assetUrls} mobile />
      </div>

      {/* Mute indicator — top-right of slide content area */}
      {item.mediaUrl && !item.embedUrl && (
        <div className="absolute top-3 right-16 z-[105] p-2 rounded-full bg-black/40 backdrop-blur text-white">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </div>
      )}
    </section>
  );
}

function AssetWall({ urls, mobile = false }: { urls?: string[] | null; mobile?: boolean }) {
  const clean = (urls || []).filter(Boolean);
  if (clean.length === 0) {
    return (
      <div className={mobile ? 'mt-4 pointer-events-auto' : 'space-y-3'}>
        <div className={mobile ? 't-eyebrow text-[10px] text-white/65 mb-2' : 't-eyebrow text-white/45 text-[10px]'}>
          Storyboard · frames / referencias
        </div>
        <div className={cn(
          'grid gap-2',
          mobile ? 'grid-cols-3' : 'grid-cols-3',
        )}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'relative overflow-hidden border border-dashed border-white/12 bg-white/[0.04]',
                mobile ? 'aspect-square rounded-lg' : 'aspect-[4/5]',
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(24,210,196,0.16),transparent_42%),radial-gradient(circle_at_72%_75%,rgba(250,93,41,0.12),transparent_40%)]" />
              <div className="absolute bottom-2 left-2 font-['Inter_Tight'] text-xl font-black leading-none text-white/20">
                {String(i + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
        <p className={cn('max-w-[34ch] text-xs leading-relaxed', mobile ? 'text-white/60' : 'text-white/45')}>
          Todavía no hay frames cargados para esta pieza. Cuando los agregues desde el admin, aparecen acá como storyboard.
        </p>
      </div>
    );
  }

  return (
    <div className={mobile ? 'mt-4 pointer-events-auto' : 'space-y-3'}>
      <div className={mobile ? 't-eyebrow text-[10px] text-white/65 mb-2' : 't-eyebrow text-white/45 text-[10px]'}>
        Storyboard · frames / referencias
      </div>
      <div
        className={cn(
          mobile
            ? 'flex snap-x gap-2 overflow-x-auto pb-1'
            : 'grid grid-cols-2 gap-2',
        )}
      >
        {clean.map((url, i) => (
          <a
            key={`${url}-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'group relative overflow-hidden border border-white/10 bg-white/5',
              mobile ? 'h-28 min-w-[44vw] snap-start rounded-xl' : 'aspect-[4/5]',
            )}
            aria-label={`Abrir asset ${i + 1}`}
          >
            <img
              src={url}
              alt={`Asset usado ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="font-['Inter_Tight'] text-xl font-black leading-none text-white/90">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="t-eyebrow text-[8px] text-white/60">frame</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————————————
// Subcomponents
// ————————————————————————————————————————————————————————————————————————
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-hover
      className={cn(
        't-eyebrow text-[11px] px-3 py-2 border transition-colors',
        active
          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
          : 'bg-transparent text-[var(--black)] border-[var(--border-solid)] hover:border-[var(--accent)]',
      )}
    >
      {label} <span className="opacity-60 ml-1">{count}</span>
    </button>
  );
}

function LoadingGrid({ aspect }: { aspect: AspectRatio }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-[var(--grey)] border border-[var(--border)] animate-pulse',
            ASPECT_CLASS[aspect],
          )}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center">
      <div className="t-eyebrow text-[var(--muted)] mb-3">SIN VIDEOS AÚN</div>
      <p className="t-body max-w-md mx-auto">
        Pronto vas a encontrar acá todos los experimentos con IA.
      </p>
    </div>
  );
}

function SectionLead({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: [0.52, 0, 0, 1] }}
      className="mb-7 grid gap-4 border-t border-[var(--border)] pt-5 sm:mb-10 sm:grid-cols-[minmax(0,0.7fr)_minmax(280px,0.3fr)] sm:items-end"
    >
      <div>
        <div className="t-eyebrow mb-3 flex items-center gap-3 text-[var(--muted)]">
          <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{eyebrow}</span>
        </div>
        <h2 className="t-section max-w-[10ch] text-[clamp(38px,7vw,92px)] leading-[0.9] text-[var(--black)]">
          {title}
        </h2>
      </div>
      <p className="t-body max-w-[35ch] text-sm leading-relaxed sm:text-base">
        {copy}
      </p>
    </motion.header>
  );
}

// ————————————————————————————————————————————————————————————————————————
// Panorama 360 — sección aparte debajo del grid de videos. Cada card abre
// un modal fullscreen con el visor 3D.
// ————————————————————————————————————————————————————————————————————————
function Panorama360Section({
  panoramas,
  onOpen,
}: {
  panoramas: Media[];
  onOpen: (i: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const featured = panoramas.find((p) => p.featured) || panoramas[0];
  const ordered = featured
    ? [featured, ...panoramas.filter((p) => p.id !== featured.id)]
    : panoramas;
  const rest = ordered.slice(1);
  const visibleRest = showAll ? rest.slice(0, 24) : rest.slice(0, 6);
  const hiddenCount = Math.max(0, rest.length - visibleRest.length);
  const featuredIndex = featured ? panoramas.findIndex((p) => p.id === featured.id) : 0;
  const getOriginalIndex = (id: string) => panoramas.findIndex((p) => p.id === id);

  return (
    <section id="panoramas" className="mx-auto mt-12 w-full max-w-[1440px] scroll-mt-28 select-none px-[clamp(20px,4vw,80px)] sm:mt-20">
      <SectionLead
        eyebrow="LABORATORIO · 360°"
        title="Panoramas."
        copy="Fotos equirectangulares para entrar y mirar alrededor. En mobile: arrastrás, hacés pinch o activás sensores."
      />

      {!featured && <EmptyPanoramaShelf />}

      {featured && (
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {featured && (
          <Panorama360Card
            panorama={featured}
            index={0}
            featured
            onOpen={() => onOpen(featuredIndex >= 0 ? featuredIndex : 0)}
          />
        )}
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="t-eyebrow text-[10px] text-[var(--muted)]">RECORRIDOS</div>
              <div className="mt-1 text-sm font-semibold text-[var(--black)]">
                {panoramas.length} escena{panoramas.length === 1 ? '' : 's'} 360 cargada{panoramas.length === 1 ? '' : 's'}
              </div>
            </div>
            {rest.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="min-h-10 shrink-0 rounded-full border border-[var(--border)] bg-white/50 px-4 text-xs font-black uppercase tracking-[0.08em] text-[var(--black)] hover:border-[#18d2c4]/70"
              >
                {showAll ? 'ver menos' : `ver ${hiddenCount} más`}
              </button>
            )}
          </div>

          {rest.length > 0 ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-3 lg:grid lg:max-h-[520px] lg:grid-cols-2 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
              {visibleRest.map((p, i) => (
                <Panorama360Card
                  key={p.id}
                  panorama={p}
                  index={i + 1}
                  compact
                  onOpen={() => {
                    const originalIndex = getOriginalIndex(p.id);
                    onOpen(originalIndex >= 0 ? originalIndex : i + 1);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col justify-end border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.28)] p-4">
              <div className="t-eyebrow text-[10px] text-[var(--muted)]">PRÓXIMAS ESCENAS · 360°</div>
              <p className="mt-3 max-w-[28ch] text-sm leading-snug text-[var(--muted)]">
                Nuevas habitaciones, viajes y escenas raras van a entrar en este rail.
              </p>
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}

function EmptyPanoramaShelf() {
  return (
    <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="relative min-h-[260px] overflow-hidden border border-dashed border-[var(--border)] bg-[linear-gradient(135deg,rgba(24,210,196,0.10),rgba(250,93,41,0.08)_45%,rgba(255,255,255,0.35))] p-5 sm:min-h-[360px] sm:p-7">
        <div className="absolute inset-8 rounded-full border border-[rgba(24,210,196,0.24)]" />
        <div className="absolute right-[-14%] top-[-30%] h-[72%] w-[72%] rounded-full border border-[rgba(240,46,101,0.22)]" />
        <div className="relative z-10 flex h-full flex-col justify-end">
          <div className="t-eyebrow text-[10px] text-[var(--muted)]">360° · SIN PUBLICAR</div>
          <h3 className="mt-3 max-w-[10ch] font-['Inter_Tight'] text-4xl font-black leading-[0.9] text-[var(--black)] sm:text-6xl">
            próximos recorridos.
          </h3>
        </div>
      </div>
      <div className="flex min-h-[180px] flex-col justify-end border border-[var(--border)] bg-[rgba(255,255,255,0.34)] p-5">
        <div className="t-eyebrow text-[10px] text-[var(--muted)]">CARGA DESDE ADMIN</div>
        <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[var(--muted)]">
          Cuando publiques panoramas 2:1, acá aparece uno grande y el resto queda en un rail compacto.
        </p>
      </div>
    </div>
  );
}

function Panorama360Card({
  panorama,
  index,
  featured = false,
  compact = false,
  onOpen,
}: {
  panorama: Media;
  index: number;
  featured?: boolean;
  compact?: boolean;
  onOpen: () => void;
}) {
  // Preferimos el coverImage (thumbnail liviano) si existe; si no, caemos en
  // el mediaUrl del panorama completo — va a tardar más en cargar pero al
  // menos se ve algo.
  const thumb = panorama.coverImage || panorama.thumbUrl || panorama.mediaUrl || '';
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      data-hover
      data-cursor-label="360°"
      onContextMenu={(event) => event.preventDefault()}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5, ease: [0.52, 0, 0, 1] }}
      className={cn(
        'group relative block w-full overflow-hidden bg-[var(--grey)] border border-[var(--border)] text-left transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#18d2c4]/70 hover:shadow-[0_24px_70px_-46px_rgba(24,210,196,0.9)]',
        featured
          ? 'min-h-[320px] aspect-[4/3] sm:aspect-[16/9] lg:min-h-[520px]'
          : compact
            ? 'min-h-[170px] min-w-[72vw] snap-start aspect-[4/3] sm:min-w-[320px] lg:min-w-0'
            : 'aspect-[2/1] min-h-[180px]',
      )}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={panorama.title}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#222,#0a0a0a)]" aria-hidden="true" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      {/* Chip 360° arriba-izquierda */}
      <div className="absolute top-3 left-3">
        <div className="t-eyebrow text-[10px] bg-black/60 backdrop-blur text-white border border-white/20 px-2 py-1 flex items-center gap-1.5">
          <Compass className="w-3 h-3" /> 360°
        </div>
      </div>

      {/* Botón play circular */}
      <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <Play className="w-4 h-4 fill-white" />
      </div>

      <div className={cn('absolute inset-x-0 bottom-0 text-white', featured ? 'p-5 sm:p-7' : 'p-3 sm:p-4')}>
        <h3 className={cn('font-bold leading-tight line-clamp-2', featured ? 'max-w-[11ch] text-4xl sm:text-6xl' : compact ? 'text-lg' : 'text-base sm:text-lg')}>
          {panorama.title}
        </h3>
        {panorama.category && (
          <div className="t-eyebrow text-[10px] opacity-70 mt-1">{panorama.category}</div>
        )}
        {featured && (
          <div className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
            abrir visor 360 →
          </div>
        )}
      </div>
    </motion.button>
  );
}

function Panorama360Modal({
  panoramas,
  startIndex,
  onClose,
}: {
  panoramas: Media[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const current = panoramas[idx];

  const goPrev = useCallback(() => setIdx((i) => (i - 1 + panoramas.length) % panoramas.length), [panoramas.length]);
  const goNext = useCallback(() => setIdx((i) => (i + 1) % panoramas.length), [panoramas.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  // Preferimos el mediaUrl (panorama en alta); si no existe caemos al cover
  // (mejor algo que nada).
  const panoramaUrl = current.mediaUrl || current.coverImage || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] select-none bg-black"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="relative w-full h-full">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Cargando visor…
            </div>
          }
        >
          {panoramaUrl ? (
            <Panorama360Viewer key={current.id} imageUrl={panoramaUrl} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Este panorama no tiene imagen cargada.
            </div>
          )}
        </Suspense>

        {/* Top overlay — título + contador */}
        <div className="pointer-events-none absolute top-0 inset-x-0 p-4 sm:p-6 flex items-start justify-between gap-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="min-w-0">
            <div className="t-eyebrow text-[10px] text-white/60 mb-1 flex items-center gap-2">
              <Compass className="w-3 h-3 text-[var(--accent)]" />
              360° · {idx + 1} / {panoramas.length}
            </div>
            <h3 className="text-white font-bold text-lg sm:text-xl leading-tight truncate">
              {current.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            data-hover
            aria-label="Cerrar"
            className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur text-white/80 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación prev/next — sólo si hay más de un panorama */}
        {panoramas.length > 1 && (
          <>
            <button
              onClick={goPrev}
              data-hover
              aria-label="Anterior"
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/35 hover:bg-black/60 rounded-full backdrop-blur border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              data-hover
              aria-label="Siguiente"
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/35 hover:bg-black/60 rounded-full backdrop-blur border border-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Descripción inferior — opcional */}
        {current.description && (
          <div className="pointer-events-none absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white/85 text-sm sm:text-base max-w-2xl leading-relaxed line-clamp-3">
              {current.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
