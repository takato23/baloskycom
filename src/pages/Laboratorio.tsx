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
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Volume2, VolumeX, X, Copy, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Media } from '@/types';
import { cn } from '@/lib/utils';

type AspectRatio = '9:16' | '16:9' | '1:1';

const ASPECT_CLASS: Record<AspectRatio, string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '1:1':  'aspect-square',
};

/** Fallback when no aspectRatio is set on the row. */
const DEFAULT_ASPECT: AspectRatio = '9:16';

/** Whether the public flag is on. Defaults to true so legacy rows keep showing. */
const isOn = (v: boolean | undefined) => v !== false;

export default function Laboratorio() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<string>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('video_ia')
      .then((rows) => {
        if (!mounted) return;
        setItems(rows.filter((r) => r.active !== false));
      })
      .catch((e) => console.error('[Laboratorio] getMedia failed', e))
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

  const closeModal = useCallback(() => setOpenIndex(null), []);
  const goPrev = useCallback(() => {
    setOpenIndex((cur) => (cur === null ? null : (cur - 1 + filtered.length) % filtered.length));
  }, [filtered.length]);
  const goNext = useCallback(() => {
    setOpenIndex((cur) => (cur === null ? null : (cur + 1) % filtered.length));
  }, [filtered.length]);

  return (
    <div className="theme-page theme-adapt pb-32 sm:pb-16">
      {/* Hero */}
      <section className="px-[clamp(20px,4vw,80px)] pt-12 sm:pt-20 pb-10 sm:pb-16 max-w-[1400px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.52, 0, 0, 1] }}
          className="space-y-6"
        >
          <div className="t-eyebrow text-[var(--muted)] flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>LABORATORIO · VIDEO · IA</span>
          </div>
          <h1 className="t-hero text-[clamp(48px,9vw,160px)] text-[var(--black)] leading-[0.9]">
            Laboratorio<span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="t-body max-w-2xl text-base sm:text-lg">
            Videos generados con IA. Experimentos, sátiras y delirios varios —
            con el prompt exacto y la herramienta que usé para hacerlos.
          </p>
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

      {/* Grid */}
      <section className="px-[clamp(20px,4vw,80px)] max-w-[1400px] mx-auto w-full">
        {loading ? (
          <LoadingGrid aspect={gridAspect} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
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
        'text-left',
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
            'bg-[radial-gradient(ellipse_at_30%_40%,#222,#0a0a0a)]',
            'transition-opacity duration-300',
            hovering && !isMobile && !isEmbed ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden="true"
        />
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
          <div className="t-eyebrow text-[10px] bg-[var(--accent)] text-white px-2 py-1 border border-[var(--accent)]">
            {item.aiTool}
          </div>
        </div>
      )}

      {/* Footer metadata */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
        <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
          {item.title}
        </h3>
        {item.duration && (
          <div className="t-eyebrow text-[10px] opacity-80 mt-1">{item.duration}</div>
        )}
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

        {/* Metadata side — respects per-item flags */}
        <aside className="w-full lg:w-[420px] lg:border-l border-white/10 bg-black/60 p-6 sm:p-8 overflow-y-auto text-white">
          <div className="space-y-6">
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
