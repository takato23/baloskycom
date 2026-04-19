import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import SunoModal from './SunoModal';
import EarlyDropBadge from './EarlyDropBadge';

/**
 * Port of `<section id="sonido">` — SUNO tracks.
 *
 * Fetches `/api/media?kind=cancion` and renders the grid of `.suno-card`
 * tiles. Clicking a card opens the shared `SunoModal` which picks the right
 * player for the source URL (Spotify / Apple Music / YouTube iframe, native
 * `<audio>` for raw MP3/WAV/M4A). Category chips filter the visible set and
 * drive modal navigation.
 */

function badgeFor(url: string | null | undefined): { cls: string; label: string } | null {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('spotify')) return { cls: 'suno-badge suno-badge--spotify', label: 'Spotify' };
  if (u.includes('music.apple') || u.includes('apple.co'))
    return { cls: 'suno-badge suno-badge--apple-music', label: 'Apple Music' };
  if (u.includes('youtu')) return { cls: 'suno-badge suno-badge--youtube', label: 'YouTube' };
  if (u.endsWith('.mp3') || u.includes('.mp3?') || u.endsWith('.wav') || u.endsWith('.m4a'))
    return { cls: 'suno-badge suno-badge--mp3', label: 'MP3' };
  return null;
}

/** Canciones por defecto antes de "Ver todas". Ajustable. */
const PREVIEW_LIMIT = 6;

export default function SonidoSection() {
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<string>('*');
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('cancion')
      .then((rows) => {
        if (!mounted) return;
        setItems(rows.filter((r) => r.active !== false));
      })
      .catch((e) => console.error('[SonidoSection] getMedia failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(() => {
    if (filter === '*') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  useEffect(() => {
    setExpanded(false);
  }, [filter]);

  const previewed = expanded ? visible : visible.slice(0, PREVIEW_LIMIT);
  const hasMore = visible.length > PREVIEW_LIMIT;

  return (
    <section id="sonido">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--gold)', color: '#0a0908' }}>
                07 · SONIDO
              </span>
            </div>
            <h2>canciones<br /><em>con SUNO</em>.</h2>
          </div>
          <p>
            Tracks que generé con SUNO de distinta índole — experimentos, bocetos, versiones que no
            llegaron al disco. Todo se escucha acá.
          </p>
        </div>

        <div className="reveal">
          {categories.length > 0 && (
            <div className="suno-controls">
              <div className="suno-chipbar">
                <button
                  type="button"
                  className={`suno-chip${filter === '*' ? ' is-active' : ''}`}
                  onClick={() => setFilter('*')}
                >
                  Todo <b>{items.length}</b>
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`suno-chip${filter === c ? ' is-active' : ''}`}
                    onClick={() => setFilter(c)}
                  >
                    {c} <b>{items.filter((i) => i.category === c).length}</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="suno-grid">
            {visible.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '60px 20px',
                  textAlign: 'center',
                  borderRadius: 16,
                  border: '1px dashed rgba(243,239,230,0.14)',
                  color: 'rgba(243,239,230,0.55)',
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 12,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                próximamente · subiendo tracks
              </div>
            ) : (
              previewed.map((m, i) => {
                const badge = badgeFor(m.embedUrl || m.mediaUrl);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActive(i)}
                    className="suno-card"
                    data-cursor="ESCUCHAR"
                    style={{ position: 'relative' }}
                  >
                    <EarlyDropBadge media={m} />
                    {m.featured && <span className="suno-card__ribbon">Nuevo</span>}
                    <div className="suno-card__art">
                      {m.coverImage ? (
                        <img
                          src={m.coverImage}
                          alt={m.title}
                          className="suno-card__cover"
                          loading="lazy"
                          onError={(e) => {
                            // If the cover 404s, swap it for the letter
                            // fallback so the card doesn't show a broken image
                            // icon.
                            const img = e.currentTarget;
                            img.style.display = 'none';
                            const fallback = img.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="suno-card__cover suno-card__cover--fallback"
                        style={{ display: m.coverImage ? 'none' : 'flex' }}
                      >
                        <span>{m.title.slice(0, 1).toUpperCase()}</span>
                      </div>
                      {badge && (
                        <div className="suno-card__badges">
                          <span className={badge.cls}>{badge.label}</span>
                        </div>
                      )}
                      <div className="suno-card__overlay">
                        <button type="button" className="suno-card__play" aria-hidden tabIndex={-1}>
                          ▶
                        </button>
                      </div>
                    </div>
                    <div className="suno-card__body">
                      <div className="suno-card__title">{m.title}</div>
                      <div className="suno-card__meta">
                        {[m.category, m.duration].filter(Boolean).join(' · ') || 'SUNO'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {hasMore && (
            <div className="feed-more-wrap">
              <button
                type="button"
                className={`feed-more${expanded ? ' feed-more--collapse' : ''}`}
                onClick={() => setExpanded((v) => !v)}
                data-cursor={expanded ? 'MENOS' : 'VER'}
              >
                <span>
                  {expanded ? 'Ver menos' : `Ver las ${visible.length} canciones`}
                </span>
                <span className="feed-more__badge" aria-hidden="true">
                  {expanded ? '↑' : '↓'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <SunoModal
        items={visible}
        index={active}
        onClose={() => setActive(null)}
        onNavigate={(i) => setActive(i)}
      />
    </section>
  );
}
