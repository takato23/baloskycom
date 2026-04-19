import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import WallpaperGate from './WallpaperGate';
import EarlyDropBadge from './EarlyDropBadge';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';

/**
 * Port of `<section id="pixel">` — wallpapers.
 *
 * Fetches `/api/media?kind=wallpaper`. First 3 tiles are free (direct
 * download via an anchor); the rest are marked `.locked` and open the
 * `WallpaperGate` email-gate modal which subscribes the user to the
 * newsletter before triggering the hi-res download.
 *
 * Mobile mosaic: las tiles alternan tamaño (algunas grandes / algunas
 * chicas) y además tienen un scale sutil que interpola con su posición
 * en el viewport — creando una sensación de "respira al scrollear".
 *
 * Patrón de tamaños usado en mobile (≤540px) para variar la grilla:
 *   B B  → big primero (span-2)
 *   S S  → dos chicas
 *   S B  → mix
 *   B S  → mix invertido
 * (se cicla cada 6 tiles)
 */
const MOBILE_SIZE_PATTERN: Array<'big' | 'small'> = [
  'big', 'small', 'small', 'big', 'small', 'big',
];

function sizeFor(i: number): 'big' | 'small' {
  return MOBILE_SIZE_PATTERN[i % MOBILE_SIZE_PATTERN.length];
}

type Orient = 'v' | 'h' | 's';

/** Mostramos los primeros 6 (3 free + 3 locked como teaser) y el resto
 * va tras un "Ver todos" para no eternizar el scroll. El pack CTA sigue
 * siendo el upgrade hook principal. */
const PREVIEW_LIMIT = 6;

export default function PixelSection() {
  const [items, setItems] = useState<Media[]>([]);
  const [gateItem, setGateItem] = useState<Media | null>(null);
  const [expanded, setExpanded] = useState(false);
  /**
   * Real orientation detected from each image's natural dimensions. Mapa
   * `id → 'v' | 'h' | 's'`. CSS usa `data-orient` para decidir span de
   * columna y aspect-ratio, así el grid queda sin agujeros aunque el mix
   * sea verticales + horizontales (tetris dense).
   */
  const [orients, setOrients] = useState<Record<string, Orient>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getMedia('wallpaper')
      .then((rows) => {
        if (!mounted) return;
        setItems(rows.filter((r) => r.active !== false));
      })
      .catch((e) => console.error('[PixelSection] getMedia failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  const handleImgLoad = (id: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const r = w / h;
    // 0.95 .. 1.05 → square. <0.95 → vertical. >1.05 → horizontal.
    const o: Orient = r > 1.05 ? 'h' : r < 0.95 ? 'v' : 's';
    setOrients((prev) => (prev[id] === o ? prev : { ...prev, [id]: o }));
  };

  const previewed = expanded ? items : items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  /* Scroll-driven scale: cada tile expone una CSS var --vp (0..1) que
   * marca qué tan centrada está en el viewport. La CSS la usa para
   * transform: scale(...) — tiles cerca del centro crecen, las que se
   * alejan se achican. Sólo aplica en mobile (≤540px) por estética. */
  useEffect(() => {
    if (!items.length) return;
    const el = gridRef.current;
    if (!el) return;
    const isMobile = window.matchMedia('(max-width: 540px)').matches;
    if (!isMobile) return;

    const tiles = Array.from(el.querySelectorAll<HTMLElement>('.wall'));
    if (!tiles.length) return;

    let raf = 0;
    let pending = false;

    const tick = () => {
      pending = false;
      const vh = window.innerHeight;
      const vc = vh / 2;
      for (const t of tiles) {
        const r = t.getBoundingClientRect();
        const tc = r.top + r.height / 2;
        // distance from viewport center, normalized 0..1
        const d = Math.min(1, Math.abs(tc - vc) / vh);
        // closeness 0..1 (1 = centered)
        const k = 1 - d;
        t.style.setProperty('--vp', k.toFixed(3));
      }
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
    // Re-bind when expanded toggles para que las nuevas tiles también
    // reciban su `--vp` y entren al baile del scroll-scale.
  }, [items, expanded]);

  return (
    <section id="pixel">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--magenta)' }}>06 · PIXEL</span>
            </div>
            <h2>wallpapers<br /><em>para tu teléfono</em>.</h2>
          </div>
          <p>
            3 gratis para bajar ya mismo. El pack completo (10 wallpapers 4K · iPhone + desktop) va
            por aporte o lo desbloqueás siendo Baloskier.
          </p>
        </div>

        <div className="wall-grid reveal" ref={gridRef}>
          {items.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '60px 20px',
                textAlign: 'center',
                borderRadius: 22,
                border: '1px dashed rgba(243,239,230,0.14)',
                color: 'rgba(243,239,230,0.55)',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 12,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              próximamente · subiendo wallpapers
            </div>
          ) : (
            previewed.map((m, i) => {
              const locked = m.isLocked || i >= 3;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={(e) => {
                    if (locked) {
                      e.preventDefault();
                      setGateItem(m);
                      return;
                    }
                    const download = m.mediaUrl;
                    if (!download) return;
                    const a = document.createElement('a');
                    a.href = download;
                    a.download = `balosky-wallpaper-${Date.now()}.jpg`;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className={`wall${locked ? ' locked' : ''}`}
                  data-cursor={locked ? 'DESBLOQUEAR' : 'BAJAR'}
                  data-size={sizeFor(i)}
                  data-orient={orients[m.id] ?? undefined}
                  style={{ border: 0, padding: 0, textAlign: 'left' }}
                >
                  {/* loading=eager para los primeros 3 (free, above-fold)
                    * y porque el aspect-ratio 9/16 hace tiles muy altas
                    * en mobile — el lazy-loader nativo no termina de
                    * disparar y quedan rectángulos negros.
                    *
                    * Si la URL real falla (archivo no subido todavía)
                    * swapeamos por un placeholder SVG con gradiente Delirio
                    * + título. Así la grilla nunca se ve "rota" y el usuario
                    * puede ver el layout completo del pack. */}
                  <img
                    src={
                      m.thumbUrl ||
                      m.coverImage ||
                      m.mediaUrl ||
                      getMediaPlaceholder(m.title, { category: m.category, width: 600, height: 1066 })
                    }
                    alt={m.title}
                    loading={i < 6 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={handleImgLoad(m.id)}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallback === '1') return;
                      img.dataset.fallback = '1';
                      img.src = getMediaPlaceholder(m.title, {
                        category: m.category,
                        width: 600,
                        height: 1066,
                      });
                    }}
                  />
                  <div className="w-overlay" />
                  <EarlyDropBadge media={m} />
                  <div className="w-btn">{locked ? 'Baloskiers' : 'Bajar'}</div>
                  <div className="w-meta">
                    <div className="w-name">{m.title}</div>
                    <div className="w-res">{m.duration || '4K'}</div>
                  </div>
                </button>
              );
            })
          )}

          {hasMore && (
            <div className="wall-more-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className={`feed-more${expanded ? ' feed-more--collapse' : ''}`}
                onClick={() => setExpanded((v) => !v)}
                data-cursor={expanded ? 'MENOS' : 'VER'}
              >
                <span>
                  {expanded ? 'Ver menos' : `Ver los ${items.length} wallpapers`}
                </span>
                <span className="feed-more__badge" aria-hidden="true">
                  {expanded ? '↑' : '↓'}
                </span>
              </button>
            </div>
          )}

          <div className="wall-cta reveal">
            <div>
              <h4>¿Querés todos los wallpapers?</h4>
              <p>
                Pack de 10 con archivo para iPhone, Android y escritorio. Actualizo con 2 drops
                nuevos por mes para los Baloskiers — o lo bajás sueltito por un aporte.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <a
                className="cta cta-primary"
                href="/api/checkout/quick?mode=pack-walls"
                data-cursor="PACK"
              >
                <span>Pack 10 · $3.500</span>
                <span className="arr">→</span>
              </a>
              <a
                className="cta"
                href="#club"
                data-cursor="BALOSKIERS"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <span>Baloskiers</span>
                <span className="arr">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <WallpaperGate wallpaper={gateItem} onClose={() => setGateItem(null)} />
    </section>
  );
}
