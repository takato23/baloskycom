import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import MediaLightbox from './MediaLightbox';
import EarlyDropBadge from './EarlyDropBadge';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';

/**
 * Port of `<section id="ojo">` — photo portfolio (`@fotobalosky`).
 *
 * Fetches `/api/media?kind=foto`, derives filter chips from the `category`
 * field, and lays tiles out in a compact 4-col grid. Clicking a tile opens
 * the shared `MediaLightbox` in photo mode (ESC + arrow keys + backdrop
 * dismissal). Filtered items drive the lightbox so navigation respects the
 * active chip.
 */
/** Cuántas fotos mostramos por defecto en la portada antes de pedir
 * "Ver todas". Tunear este número si la audiencia se queda corta o
 * si el bounce sube demasiado. */
const PREVIEW_LIMIT = 6;

export default function OjoSection() {
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<string>('*');
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('foto')
      .then((rows) => {
        if (!mounted) return;
        setItems(rows.filter((r) => r.active !== false));
      })
      .catch((e) => console.error('[OjoSection] getMedia failed', e));
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

  // Antes escondíamos las tiles cuyas imágenes 404'd, pero eso dejaba la grilla
  // vacía si todavía no se subieron los assets. Ahora en vez de esconderlas,
  // swapeamos el src por un placeholder SVG con gradiente Delirio + título.
  // Así la grilla siempre está "poblada" y el usuario sabe que hay contenido
  // en camino.

  const visible = useMemo(() => {
    return filter === '*' ? items : items.filter((i) => i.category === filter);
  }, [items, filter]);

  /* Reset el "ver todas" cada vez que cambia el filtro — no tiene sentido
   * arrastrar el estado expandido entre categorías. */
  useEffect(() => {
    setExpanded(false);
  }, [filter]);

  const previewed = expanded ? visible : visible.slice(0, PREVIEW_LIMIT);
  const hasMore = visible.length > PREVIEW_LIMIT;

  return (
    <section id="ojo">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--teal)', color: '#0a0908' }}>
                05 · OJO
              </span>
            </div>
            <h2>lo que veo<br /><em>con cámara</em>.</h2>
          </div>
          <p>
            Fotos de <b>@fotobalosky</b> — mi cuenta de foto. Cámara analógica y digital, Buenos
            Aires y el sur. Click para abrir en grande.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="ojo-filters reveal">
            <button
              type="button"
              className={filter === '*' ? 'active' : ''}
              onClick={() => setFilter('*')}
            >
              Todo
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={filter === c ? 'active' : ''}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="ojo-feed reveal">
          <div className="feed-grid feed-grid--compact">
            {visible.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
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
                próximamente · subiendo fotos
              </div>
            ) : (
              previewed.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className="feed-tile photo-tile"
                  data-cat={m.category ?? undefined}
                  data-cursor="ABRIR"
                  style={{ border: 0, padding: 0, background: 'transparent', textAlign: 'left', position: 'relative' }}
                >
                  <EarlyDropBadge media={m} />
                  <div className="ft-img">
                    <img
                      src={m.thumbUrl || m.coverImage || m.mediaUrl || getMediaPlaceholder(m.title, { category: m.category })}
                      alt={m.title}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        // Evitar loop si el placeholder (por algún motivo) también falla.
                        if (img.dataset.fallback === '1') return;
                        img.dataset.fallback = '1';
                        img.src = getMediaPlaceholder(m.title, { category: m.category });
                      }}
                    />
                  </div>
                  <div className="ft-caption">
                    <div className="fc-num">{String(i + 1).padStart(2, '0')}</div>
                    <div className="fc-title">{m.title}</div>
                    {m.category && <div className="fc-cat">{m.category}</div>}
                  </div>
                </button>
              ))
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
                  {expanded ? 'Ver menos' : `Ver las ${visible.length} fotos`}
                </span>
                <span className="feed-more__badge" aria-hidden="true">
                  {expanded ? '↑' : '↓'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <MediaLightbox
        items={visible}
        index={active}
        onClose={() => setActive(null)}
        onNavigate={(i) => setActive(i)}
        mode="photo"
      />
    </section>
  );
}
