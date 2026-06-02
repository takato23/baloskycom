import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { Media } from '@/types';
import EarlyDropBadge from './EarlyDropBadge';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';
import EditorialSectionLead from './EditorialSectionLead';

/**
 * Port of `<section id="vision">` — AI video grid.
 *
 * Fetches `/api/media?kind=video_ia` (same feed as /laboratorio) y renderiza
 * un grid de 12 cols con `.vi-tile`. Spans siguen un patrón 6-6 / 4-8 / 8-4
 * para que la composición no parezca una matriz uniforme.
 *
 * **Interacción v2 (abr 2026)**: antes al tocar una tile se abría el
 * `MediaLightbox` en pantalla completa — Santi lo llamó "intrusivo". Ahora:
 *
 * - Desktop hover → preview silencioso inline (como antes).
 * - Tap/click en la tile → toggle play inline con sonido. Un segundo tap
 *   pausa. Sólo se reproduce UNA tile a la vez — si tocás otra, la
 *   anterior se pausa y vuelve a mute.
 * - Para verlo en grande (fullscreen + carrusel), el CTA "Ver en el
 *   Laboratorio" sigue llevando a `/laboratorio`, que es la página
 *   dedicada al feed completo.
 *
 * Resultado: el usuario puede "tocar e ir a ver el video" sin que la UI le
 * tape toda la pantalla. Los tiles se comportan como un mini-feed tipo
 * TikTok/IG Reels pero respetando el scroll de la home.
 */

const SPAN_PATTERN = ['span-6', 'span-6', 'span-4', 'span-8', 'span-8', 'span-4'] as const;

function spanFor(i: number): string {
  return SPAN_PATTERN[i % SPAN_PATTERN.length];
}

/** Videos IA mostrados en la portada. El resto vive en /laboratorio,
 * que ya es la página dedicada al feed completo. */
const PREVIEW_LIMIT = 4;

export default function VisionSection() {
  const [items, setItems] = useState<Media[]>([]);
  /* ID de la tile que está reproduciendo inline con sonido. Null = ninguna.
   * Sólo una corre a la vez — patrón Reels/TikTok. */
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  /* Refs a cada <video> para poder pausarlo/mutearlo desde el click handler
   * de otra tile sin re-renderizar. */
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  /* Videos que fallaron al cargar — los seguimos mostrando pero marcamos
   * la tile como "no-playable" para esconder el botón ▶ y que al clickear
   * no intente reproducir algo roto. */
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const markBroken = (id: string) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('video_ia')
      .then((rows) => {
        if (!mounted) return;
        setItems(rows.filter((r) => r.active !== false));
      })
      .catch((e) => console.error('[VisionSection] getMedia failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  /* Pausa cualquier otro video que esté reproduciendo con sonido. Usado
   * cuando tocás una tile nueva: la anterior se detiene y se remutea. */
  const pauseOthers = (exceptId: string) => {
    videoRefs.current.forEach((vid, id) => {
      if (id === exceptId) return;
      vid.pause();
      vid.muted = true;
      vid.currentTime = 0;
    });
  };

  /* Handler del tap en la tile. Toggle play con sonido. No abre modal —
   * el video se reproduce dentro de la grilla. Si ya está sonando, el
   * tap lo pausa. Si no, pausa a los demás y arranca éste. */
  const handleTileTap = (m: Media) => {
    if (brokenIds.has(m.id)) return;
    if (playingId === m.id) {
      const vid = videoRefs.current.get(m.id);
      if (!vid) return;
      vid.pause();
      vid.muted = true;
      setPlayingId(null);
      return;
    }
    pauseOthers(m.id);
    setPreviewId(null);
    setPlayingId(m.id);
  };

  useEffect(() => {
    if (!playingId) return;
    const vid = videoRefs.current.get(playingId);
    if (!vid) return;
    vid.muted = false;
    vid.currentTime = 0;
    vid.play().catch(() => {
      // Autoplay con sonido bloqueado (raro después de user gesture pero
      // por si acaso): intentamos muted, así al menos reproduce.
      vid.muted = true;
      vid.play().catch(() => {});
    });
  }, [playingId]);

  /* Si el user navega/scrollea lejos o cambia de sección, paramos el
   * audio — nadie quiere que siga sonando un reel cuando ya miraste
   * hacia abajo. IntersectionObserver sobre cada tile activa. */
  useEffect(() => {
    if (!playingId) return;
    const vid = videoRefs.current.get(playingId);
    if (!vid) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            vid.pause();
            vid.muted = true;
            setPlayingId(null);
          }
        }
      },
      { threshold: [0, 0.4, 0.8] },
    );
    io.observe(vid);
    return () => io.disconnect();
  }, [playingId]);

  /* Ya no hay lightbox — tap inline reemplaza al modal fullscreen. Los
   * broken ids se mantienen sólo para deshabilitar el tap en la tile. */

  return (
    <section id="vision">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--violet)' }}>04 · VISIÓN</span>
            </div>
            <h2>visiones<br /><em>en proceso</em>.</h2>
          </div>
          <p>
            Videos, pruebas y climas raros del laboratorio. Hover para espiar; tap para entrar con
            sonido.
          </p>
        </div>

        <EditorialSectionLead
          label="Laboratorio"
          title="Antes de ser video, todo fue una aparición."
          body="Acá quedan las mutaciones: renders, escenas, errores hermosos y climas que después se vuelven pieza."
          imageSrc="/images/home-editorial/lab-poster-h.jpg"
          imageAlt="Estudio creativo con proyecciones naranjas y violetas."
          tone="amber"
          reverse
          meta={['proceso', 'video', 'ia']}
          href="/laboratorio"
          cta="Ir al laboratorio"
        />

        <div className="vision-grid reveal">
          {items.length === 0 ? (
            <div
              style={{
                gridColumn: 'span 12',
                padding: '60px 20px',
                textAlign: 'center',
                borderRadius: 20,
                border: '1px dashed rgba(243,239,230,0.14)',
                color: 'rgba(243,239,230,0.55)',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 12,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              próximamente · cargando videos
            </div>
          ) : (
            items.slice(0, PREVIEW_LIMIT).map((m, i) => {
              const broken = brokenIds.has(m.id);
              const isPlaying = playingId === m.id;
              /**
               * Cuando la tile está reproduciendo usamos `<div>` en vez de
               * `<button>` para poder mostrar controles nativos del video
               * (scrub, mute, fullscreen) + un botón explícito de cerrar
               * sin anidar interactivos dentro de un botón. Cuando está
               * idle / preview, sigue siendo `<button>` para que el tap
               * arranque la reproducción.
               */
              const Tag = isPlaying ? 'div' : 'button';
              const tagProps: Record<string, unknown> = isPlaying
                ? {
                    role: 'group',
                    'aria-label': `${m.title} · reproduciendo`,
                  }
                : {
                    type: 'button',
                    onClick: () => handleTileTap(m),
                    'data-cursor': broken ? 'PRONTO' : 'PLAY',
                    'aria-disabled': broken || undefined,
                    'aria-pressed': isPlaying,
                  };
              return (
                <Tag
                  key={m.id}
                  {...tagProps}
                  onMouseEnter={() => {
                    if (!isPlaying && !broken) setPreviewId(m.id);
                  }}
                  onMouseLeave={() => {
                    if (previewId !== m.id || isPlaying) return;
                    const vid = videoRefs.current.get(m.id);
                    vid?.pause();
                    setPreviewId(null);
                  }}
                  className={`vi-tile ${spanFor(i)}${broken ? ' vi-tile--broken' : ''}${isPlaying ? ' vi-tile--playing' : ''}`}
                  style={{ border: 0, padding: 0, textAlign: 'left', position: 'relative' }}
                >
                  <EarlyDropBadge media={m} />
                  {m.mediaUrl && !broken && (isPlaying || previewId === m.id) ? (
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(m.id, el);
                        else videoRefs.current.delete(m.id);
                      }}
                      src={m.mediaUrl}
                      poster={m.coverImage || undefined}
                      muted={!isPlaying}
                      loop
                      playsInline
                      preload="metadata"
                      /* Controles nativos cuando el user tapeó para ver —
                       * le da scrub, mute, fullscreen y pausa sin que
                       * tengamos que reinventarlos. En estado preview
                       * (hover silencioso) los sacamos para que la tile
                       * se vea limpia. */
                      controls={isPlaying}
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onError={() => markBroken(m.id)}
                      onMouseEnter={(e) => {
                        // Hover preview silencioso en desktop — sólo si
                        // esta tile NO es la que está sonando.
                        if (isPlaying) return;
                        (e.currentTarget as HTMLVideoElement).play().catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        if (isPlaying) return;
                        (e.currentTarget as HTMLVideoElement).pause();
                      }}
                      onClick={(e) => {
                        // Cuando está reproduciendo, el click sobre el
                        // video lo maneja el control nativo — no queremos
                        // que burbujee al container y dispare otra cosa.
                        if (isPlaying) e.stopPropagation();
                      }}
                    />
                  ) : m.coverImage ? (
                    <img
                      src={m.coverImage}
                      alt={m.title}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === '1') return;
                        img.dataset.fallback = '1';
                        img.src = getMediaPlaceholder(m.title, { category: m.aiTool || m.category, width: 800, height: 450 });
                      }}
                    />
                  ) : (
                    <img
                      src={getMediaPlaceholder(m.title, { category: m.aiTool || m.category, width: 800, height: 450 })}
                      alt={m.title}
                      loading="lazy"
                    />
                  )}
                  {/* Overlay + meta + badges sólo en preview. Cuando está
                    * reproduciendo los escondemos para no tapar el video
                    * (y los controles nativos ya indican qué se está
                    * mirando). El botón de cerrar reemplaza al ▶. */}
                  {!isPlaying && <div className="vi-overlay" />}
                  {!isPlaying && m.aiTool && (
                    <div className="vi-ai-badge" aria-label={`Generado con IA · ${m.aiTool}`}>
                      <span className="vi-ai-badge__dot" aria-hidden="true" />
                      IA · {m.aiTool}
                    </div>
                  )}
                  {!isPlaying && m.duration && <div className="vi-dur">{m.duration}</div>}
                  {!isPlaying && (
                    <div className="vi-play">{broken ? '◌' : '▶'}</div>
                  )}
                  {isPlaying && (
                    <button
                      type="button"
                      className="vi-close"
                      aria-label="Cerrar video"
                      data-cursor="CERRAR"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTileTap(m);
                      }}
                    >
                      ✕
                    </button>
                  )}
                  {!isPlaying && (
                    <div className="vi-meta">
                      {m.aiTool && <div className="vi-cat">{m.aiTool}</div>}
                      <h4>{m.title}</h4>
                      {broken && (
                        <div
                          className="t-mono"
                          style={{ marginTop: 4, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(243,239,230,0.55)' }}
                        >
                          · próximamente ·
                        </div>
                      )}
                    </div>
                  )}
                </Tag>
              );
            })
          )}
        </div>

        {/* Siempre mostramos el CTA al Laboratorio (no sólo cuando hay más
         * de PREVIEW_LIMIT). La idea: la home es el "trailer" con 4 videos
         * que se pueden reproducir inline, y el Laboratorio es el "cine"
         * donde se ven todos en un grid dedicado con detalle. */}
        <div className="feed-more-wrap reveal">
          <Link
            to="/laboratorio"
            className="feed-more"
            data-cursor="LAB"
          >
            <span>
              {items.length > PREVIEW_LIMIT
                ? `Ver los ${items.length} videos en el Laboratorio`
                : 'Ver todos en el Laboratorio'}
            </span>
            <span className="feed-more__badge" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
