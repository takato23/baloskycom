import { useEffect, useMemo, useState } from 'react';
import type { Media } from '@/types';
import { getMediaPlaceholder } from '@/lib/mediaPlaceholder';

/**
 * Preview modal para wallpapers.
 *
 * Lo que pide el flow:
 *  - Desktop: al clickear un wallpaper, abrir un modal con la hero image
 *    a la izquierda y dos mockups (iPhone + Samsung) a la derecha
 *    mostrando cómo queda puesto en cada teléfono. CTA "Bajar".
 *  - Mobile: mismo modal pero stackeado; la hero image arriba + los dos
 *    mockups reducidos debajo. El botón principal es "Bajar"; si el
 *    browser soporta Web Share API, además mostramos "Compartir".
 *
 * Para los locked (no-free), el botón delega al WallpaperGate (email
 * capture) pidiéndole al caller que lo abra — esta modal se cierra y el
 * padre monta el gate. Evita doble UI.
 */

type Props = {
  wallpaper: Media | null;
  onClose: () => void;
  onRequestGate: (w: Media) => void; // free → null gate, locked → abre gate
  isLocked: boolean;
};

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function pickBestImage(m: Media | null): string {
  if (!m) return '';
  // Preferimos la hi-res para la preview: mediaUrl > coverImage > thumb.
  // Si ninguna funciona, el onError swapea al placeholder SVG.
  return (
    m.mediaUrl ||
    m.coverImage ||
    m.thumbUrl ||
    getMediaPlaceholder(m.title, { category: m.category, width: 1080, height: 1920 })
  );
}

function hhmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fullDate(): string {
  const d = new Date();
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
}

export default function WallpaperPreview({ wallpaper, onClose, onRequestGate, isLocked }: Props) {
  const open = wallpaper !== null;
  const [preflightStatus, setPreflightStatus] = useState<'idle' | 'ok' | 'missing'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const src = useMemo(() => pickBestImage(wallpaper), [wallpaper]);
  const time = useMemo(() => hhmm(), [open, wallpaper?.id]);
  const date = useMemo(() => fullDate(), [open, wallpaper?.id]);

  useEffect(() => {
    if (!open) {
      setPreflightStatus('idle');
      return;
    }
    // Preflight HEAD sólo para paths locales — detecta wallpapers que
    // existen en la DB pero no en el server (migración pendiente).
    const url = wallpaper?.mediaUrl;
    if (!url) {
      setPreflightStatus('missing');
      return;
    }
    if (!url.startsWith('/') || url.startsWith('//')) {
      setPreflightStatus('ok');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (cancelled) return;
        setPreflightStatus(r.ok ? 'ok' : 'missing');
      } catch {
        if (!cancelled) setPreflightStatus('ok'); // red falla → dejá intentar
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, wallpaper?.id, wallpaper?.mediaUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !wallpaper) return null;

  const triggerDownload = async () => {
    if (isLocked) {
      onRequestGate(wallpaper);
      return;
    }
    const url = wallpaper.mediaUrl;
    if (!url) {
      setToast('Este wallpaper todavía no está subido. Volvé en un ratito.');
      window.setTimeout(() => setToast(null), 3500);
      return;
    }
    if (preflightStatus === 'missing') {
      setToast('Este wallpaper todavía no está subido. Volvé en un ratito.');
      window.setTimeout(() => setToast(null), 3500);
      return;
    }
    // Mobile: abrimos en nueva tab → long-press → "Guardar imagen"
    // (iOS Safari ignora <a download> cross-origin).
    if (isMobile()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // Desktop: <a download> con filename custom.
    const a = document.createElement('a');
    a.href = url;
    const ext = url.split('.').pop() || 'jpg';
    a.download = `balosky-${wallpaper.id}.${ext}`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const triggerShare = async () => {
    const url = wallpaper.mediaUrl;
    if (!url) return;
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Wallpaper · ${wallpaper.title}`,
          text: `Wallpaper de Balosky — ${wallpaper.title}`,
          url: absoluteUrl,
        });
      } catch {
        /* user canceled */
      }
      return;
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setToast('Link copiado.');
      window.setTimeout(() => setToast(null), 2500);
    } catch {
      window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const mobile = isMobile();

  return (
    <div
      className="wp-preview open"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${wallpaper.title}`}
      onClick={onClose}
    >
      <div className="wpp-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wpp-close"
          onClick={onClose}
          aria-label="Cerrar"
          data-cursor="CERRAR"
        >
          ✕
        </button>

        {/* Left: hero image (la wallpaper tamaño grande) */}
        <div className="wpp-hero">
          <img
            src={src}
            alt={wallpaper.title}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback === '1') return;
              img.dataset.fallback = '1';
              img.src = getMediaPlaceholder(wallpaper.title, {
                category: wallpaper.category,
                width: 1080,
                height: 1920,
              });
            }}
          />
          <div className="wpp-hero-meta">
            <div className="wpp-title">{wallpaper.title}</div>
            <div className="wpp-res">{wallpaper.duration || '4K'}</div>
          </div>
        </div>

        {/* Right: phone mockups + CTAs */}
        <div className="wpp-right">
          <div>
            <div className="wpp-eyebrow">
              {isLocked ? 'Wallpaper · Baloskier' : 'Wallpaper · Gratis'}
            </div>
            <div className="wpp-heading">
              {isLocked ? 'Abrí el pack completo' : 'Así te queda puesto'}
            </div>
            <div className="wpp-sub">
              {isLocked
                ? 'Dejá tu mail y te mando el link de descarga. También te sumo a la Carta del Delirio.'
                : 'Tocá "Bajar" y se descarga el archivo 4K. En mobile abre la imagen y hacés long-press → Guardar.'}
            </div>
          </div>

          <div className="wpp-phones">
            <div className="phone-mockup phone-iphone">
              <div className="ph-screen">
                <img
                  src={src}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback === '1') return;
                    img.dataset.fallback = '1';
                    img.src = getMediaPlaceholder(wallpaper.title, {
                      category: wallpaper.category,
                      width: 400,
                      height: 866,
                    });
                  }}
                />
                <div className="ph-lock-overlay">
                  <div className="ph-time">{time}</div>
                  <div className="ph-date">{date}</div>
                </div>
              </div>
              <div className="ph-badge">iPhone</div>
            </div>

            <div className="phone-mockup phone-samsung">
              <div className="ph-screen">
                <img
                  src={src}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback === '1') return;
                    img.dataset.fallback = '1';
                    img.src = getMediaPlaceholder(wallpaper.title, {
                      category: wallpaper.category,
                      width: 400,
                      height: 866,
                    });
                  }}
                />
                <div className="ph-lock-overlay">
                  <div className="ph-time">{time}</div>
                  <div className="ph-date">{date}</div>
                </div>
              </div>
              <div className="ph-badge">Samsung</div>
            </div>
          </div>

          <div className="wpp-actions">
            <button
              type="button"
              className="wpp-download"
              onClick={triggerDownload}
              data-cursor={isLocked ? 'DESBLOQUEAR' : 'BAJAR'}
            >
              {isLocked ? 'Desbloquear' : 'Bajar'}
            </button>
            {mobile && canShare && !isLocked && (
              <button
                type="button"
                className="wpp-cancel"
                onClick={triggerShare}
                data-cursor="COMPARTIR"
              >
                Compartir
              </button>
            )}
            <button
              type="button"
              className="wpp-cancel"
              onClick={onClose}
              data-cursor="CERRAR"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,9,8,0.94)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.08em',
            zIndex: 10000,
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
