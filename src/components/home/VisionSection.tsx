import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { Media } from '@/types';
import MediaLightbox from './MediaLightbox';
import EarlyDropBadge from './EarlyDropBadge';

/**
 * Port of `<section id="vision">` — AI video grid.
 *
 * Fetches `/api/media?kind=video_ia` (same feed as /laboratorio) and renders a
 * 12-col grid of `.vi-tile` cards. Tile spans follow a 6-6 / 4-8 / 8-4 pattern
 * so the composition doesn't look like a uniform matrix. Clicking a tile opens
 * the shared `MediaLightbox` in video mode.
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
  const [active, setActive] = useState<number | null>(null);

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

  return (
    <section id="vision">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--violet)' }}>04 · VISIÓN</span>
            </div>
            <h2>videos hechos<br /><em>con IA</em>.</h2>
          </div>
          <p>
            Lo que imagino, generado con herramientas de IA. Hover para que el clip arranque, click
            para verlo en grande.
          </p>
        </div>

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
            items.slice(0, PREVIEW_LIMIT).map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                className={`vi-tile ${spanFor(i)}`}
                data-cursor="VER"
                style={{ border: 0, padding: 0, textAlign: 'left', position: 'relative' }}
              >
                <EarlyDropBadge media={m} />
                {m.mediaUrl ? (
                  <video
                    src={m.mediaUrl}
                    poster={m.coverImage || undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                    onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
                  />
                ) : m.coverImage ? (
                  <img src={m.coverImage} alt={m.title} loading="lazy" />
                ) : null}
                <div className="vi-overlay" />
                {m.aiTool && (
                  <div className="vi-ai-badge" aria-label={`Generado con IA · ${m.aiTool}`}>
                    <span className="vi-ai-badge__dot" aria-hidden="true" />
                    IA · {m.aiTool}
                  </div>
                )}
                {m.duration && <div className="vi-dur">{m.duration}</div>}
                <div className="vi-play">▶</div>
                <div className="vi-meta">
                  {m.aiTool && <div className="vi-cat">{m.aiTool}</div>}
                  <h4>{m.title}</h4>
                </div>
              </button>
            ))
          )}
        </div>

        {items.length > PREVIEW_LIMIT && (
          <div className="feed-more-wrap reveal">
            <Link
              to="/laboratorio"
              className="feed-more"
              data-cursor="LAB"
            >
              <span>Ver los {items.length} videos en el Laboratorio</span>
              <span className="feed-more__badge" aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>

      <MediaLightbox
        items={items}
        index={active}
        onClose={() => setActive(null)}
        onNavigate={(i) => setActive(i)}
        mode="video"
      />
    </section>
  );
}
