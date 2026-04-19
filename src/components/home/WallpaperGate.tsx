import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Media } from '@/types';

/**
 * Wallpaper paywall — the email-gate modal.
 *
 * Opens when a locked `.wall` tile is clicked. User types an email, we
 * subscribe them to the newsletter (source: `wallpaper_gate`) and, on
 * success, trigger a direct download of the hi-res asset via an anchor.
 *
 * The separate iPhone/Samsung phone-preview modal from the static home is
 * deferred — that's mostly a design flourish and can land later. The gate
 * is the actual conversion surface.
 */

type Props = {
  wallpaper: Media | null;
  onClose: () => void;
};

type Status = 'idle' | 'loading' | 'ok' | 'dup' | 'err';

function download(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function WallpaperGate({ wallpaper, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const open = wallpaper !== null;

  // Reset state on open/close so reopening the same modal doesn't leak
  // success/error messaging from the last try.
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setStatus('idle');
    setMsg('');
  }, [open, wallpaper?.id]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    setMsg('Enviando...');
    try {
      const res = await api.subscribeNewsletter(email, 'wallpaper_gate');
      if (res?.duplicate) {
        setStatus('dup');
        setMsg('Ya estabas en la lista. Acá va tu wallpaper.');
      } else if (res?.success) {
        setStatus('ok');
        setMsg('Listo. Abriendo tu wallpaper...');
      } else {
        setStatus('err');
        setMsg('No pudimos registrarte. Probá de nuevo.');
        return;
      }
      const url = wallpaper.mediaUrl || wallpaper.coverImage;
      if (url) {
        // Preflight — if the file is missing the server now returns 404
        // (vs. the SPA fallback that used to render NotFound in a new tab).
        // Swallow the preflight error and show a friendly message instead
        // of triggering the download.
        try {
          const head = await fetch(url, { method: 'HEAD' });
          if (!head.ok) {
            setStatus('err');
            setMsg('El wallpaper todavía no está subido. Te avisamos cuando esté listo.');
            return;
          }
        } catch {
          /* Network error — still try the download; worst case the new tab opens blank. */
        }
        download(url, `balosky-wallpaper-${wallpaper.id}.jpg`);
      }
    } catch (err) {
      console.error('[WallpaperGate] subscribe failed', err);
      setStatus('err');
      setMsg('Algo salió mal. Probá de nuevo en un segundo.');
    }
  };

  return (
    <div
      className="wp-gate open"
      role="dialog"
      aria-modal="true"
      aria-label={`Descargar ${wallpaper.title}`}
      onClick={onClose}
    >
      <div className="wp-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wp-close"
          onClick={onClose}
          aria-label="Cerrar"
          data-cursor="CERRAR"
        >
          ✕
        </button>
        <div className="wp-eyebrow">Wallpaper gratis</div>
        <h4>Descargalo gratis</h4>
        <div className="wp-desc">
          Dejá tu mail y te mando el link de descarga. Te sumo a la Carta del Delirio (podés bajarte
          cuando quieras).
        </div>
        {(wallpaper.thumbUrl || wallpaper.coverImage || wallpaper.mediaUrl) && (
          <div className="wp-thumb">
            <img
              src={wallpaper.thumbUrl || wallpaper.coverImage || wallpaper.mediaUrl || ''}
              alt={wallpaper.title}
              onError={(e) => {
                // Hide the thumb container if the image fails — the gate
                // still works without a preview.
                const wrap = e.currentTarget.parentElement as HTMLElement | null;
                if (wrap) wrap.style.display = 'none';
              }}
            />
          </div>
        )}
        <form onSubmit={submit} autoComplete="off" noValidate>
          <input
            type="email"
            name="email"
            placeholder="tu@mail.com"
            required
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="wp-submit"
            disabled={status === 'loading'}
            data-cursor="BAJAR"
          >
            {status === 'loading' ? 'Enviando...' : 'Bajar'}
          </button>
        </form>
        <div
          className={`wp-msg${
            status === 'ok' || status === 'dup' ? ' ok' : status === 'err' ? ' err' : ' info'
          }`}
          role="status"
          aria-live="polite"
        >
          {msg}
        </div>
        <div className="wp-fine">
          Al enviar aceptás recibir la newsletter. Sin spam, cancelás cuando quieras.
        </div>
      </div>
    </div>
  );
}
