import { useEffect, useMemo, useState } from 'react';
import type { Media } from '@/types';

/**
 * SUNO modal — lightweight version of the static home's liquid-glass player.
 *
 * Phase 2.3 coverage:
 * - ESC / backdrop click / close button → close
 * - Prev/next buttons walk the visible track list
 * - Spotify / Apple Music / YouTube render via platform iframe
 * - Direct MP3/WAV/M4A renders a native `<audio>` control
 * - Shows cover + title + metadata + open-external link
 *
 * The full viz/lyrics tabs from the static page are intentionally skipped
 * — they belong to the liquid-glass visualizer, which is a separate
 * rabbit hole. If Santi wants them back they can land as a follow-up.
 */

type Props = {
  items: Media[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
};

type Platform = 'spotify' | 'apple-music' | 'youtube' | 'mp3' | 'none';

function detectPlatform(url: string | null | undefined): Platform {
  if (!url) return 'none';
  const u = url.toLowerCase();
  if (u.includes('spotify')) return 'spotify';
  if (u.includes('music.apple') || u.includes('apple.co')) return 'apple-music';
  if (u.includes('youtu')) return 'youtube';
  if (u.endsWith('.mp3') || u.includes('.mp3?') || u.endsWith('.wav') || u.endsWith('.m4a'))
    return 'mp3';
  return 'none';
}

/**
 * Convert a Spotify/Apple/YouTube URL to its embed form. Spotify expects
 * `/embed/track/:id`, YouTube expects `youtube.com/embed/:id`, Apple's
 * `embed.music.apple.com` subdomain. Falls back to the raw URL if parsing
 * doesn't match any known pattern — the iframe will still render something.
 */
function toEmbed(url: string, platform: Platform): string {
  try {
    if (platform === 'spotify') {
      // https://open.spotify.com/track/ID → /embed/track/ID
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    if (platform === 'apple-music') {
      return url.replace('music.apple.com', 'embed.music.apple.com');
    }
    if (platform === 'youtube') {
      const u = new URL(url);
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.slice(7);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    /* noop */
  }
  return url;
}

/**
 * True if the URL is "openable" in a new tab — i.e. points to an external
 * resource (Spotify, YouTube, Apple Music, etc). Internal /uploads/ paths
 * are NOT openable because if the file is missing they fall through to the
 * SPA and render the NotFound page ("tal vez moví la página..."), which is
 * worse than hiding the button.
 */
function isOpenableExternal(url: string | null | undefined): boolean {
  if (!url) return false;
  if (/^https?:\/\//i.test(url)) return true;
  return false;
}

export default function SunoModal({ items, index, onClose, onNavigate }: Props) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const [isMounted, setIsMounted] = useState(false);
  const [audioError, setAudioError] = useState(false);

  // Reset audio error state whenever we switch tracks.
  useEffect(() => {
    setAudioError(false);
  }, [item?.id]);

  // Small delay so the open-transition lands after mount (matches static home).
  useEffect(() => {
    if (!open) {
      setIsMounted(false);
      return;
    }
    const t = window.setTimeout(() => setIsMounted(true), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index! > 0) onNavigate(index! - 1);
      else if (e.key === 'ArrowRight' && index! < items.length - 1) onNavigate(index! + 1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, index, items.length, onClose, onNavigate]);

  const platform = useMemo<Platform>(() => {
    if (!item) return 'none';
    return detectPlatform(item.embedUrl || item.mediaUrl);
  }, [item]);

  const externalUrl = item?.embedUrl || item?.mediaUrl || '';
  const embedSrc = useMemo(() => {
    if (!item) return '';
    const src = item.embedUrl || item.mediaUrl || '';
    if (platform === 'spotify' || platform === 'apple-music' || platform === 'youtube') {
      return toEmbed(src, platform);
    }
    return '';
  }, [item, platform]);

  if (!open || !item) return null;

  return (
    <div
      className={`suno-modal${isMounted ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="suno-modal__backdrop" onClick={onClose} />
      <div className="suno-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="suno-modal__topbar">
          <button
            type="button"
            className="suno-modal__nav"
            onClick={() => index! > 0 && onNavigate(index! - 1)}
            disabled={index === 0}
            aria-label="Anterior"
            data-cursor="ANTERIOR"
          >
            ‹
          </button>
          <button
            type="button"
            className="suno-modal__nav"
            onClick={() => index! < items.length - 1 && onNavigate(index! + 1)}
            disabled={index === items.length - 1}
            aria-label="Siguiente"
            data-cursor="SIGUIENTE"
          >
            ›
          </button>
          {isOpenableExternal(externalUrl) && (
            <a
              className="suno-modal__share"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="ABRIR"
            >
              abrir
            </a>
          )}
          <button
            type="button"
            className="suno-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
            data-cursor="CERRAR"
          >
            ✕
          </button>
        </div>

        <div className="suno-modal__viz">
          <div className="suno-viz-gradient" />
          {item.coverImage && (
            <img src={item.coverImage} alt={item.title} className="suno-modal__cover" />
          )}
          {platform !== 'none' && platform !== 'mp3' && (
            <span className={`suno-modal__badge suno-modal__badge--${platform}`}>{platform}</span>
          )}
        </div>

        <div className="suno-modal__info">
          <div className="suno-modal__title">{item.title}</div>
          <div className="suno-modal__meta">
            {[item.category, item.duration].filter(Boolean).join(' · ') || 'SUNO'}
          </div>
        </div>

        <div className="suno-modal__player">
          {platform === 'spotify' && embedSrc && (
            <iframe
              key={item.id}
              src={embedSrc}
              title={item.title}
              height={152}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          )}
          {platform === 'apple-music' && embedSrc && (
            <iframe
              key={item.id}
              src={embedSrc}
              title={item.title}
              height={175}
              allow="autoplay *; encrypted-media *;"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
              loading="lazy"
            />
          )}
          {platform === 'youtube' && embedSrc && (
            <iframe
              key={item.id}
              src={embedSrc}
              title={item.title}
              height={200}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          )}
          {platform === 'mp3' && item.mediaUrl && !audioError && (
            <audio
              key={item.id}
              controls
              src={item.mediaUrl}
              preload="metadata"
              onError={() => setAudioError(true)}
              onPlay={(e) => {
                // Media Session API — muestra título/cover/artista en el
                // lock screen de iOS/Android + controles en notification.
                // Así el audio se puede manejar con la app minimizada
                // (play/pause/next/prev desde el sistema), que es lo que
                // Santi llama "persistencia escuchar si minimizamos".
                if ('mediaSession' in navigator) {
                  try {
                    navigator.mediaSession.metadata = new MediaMetadata({
                      title: item.title,
                      artist: 'Balosky',
                      album: item.category || 'Canciones',
                      artwork: item.coverImage
                        ? [
                            { src: item.coverImage, sizes: '512x512', type: 'image/jpeg' },
                            { src: item.coverImage, sizes: '256x256', type: 'image/jpeg' },
                          ]
                        : [],
                    });
                    const audioEl = e.currentTarget;
                    navigator.mediaSession.setActionHandler('play', () => audioEl.play());
                    navigator.mediaSession.setActionHandler('pause', () => audioEl.pause());
                    navigator.mediaSession.setActionHandler('previoustrack',
                      () => index! > 0 && onNavigate(index! - 1));
                    navigator.mediaSession.setActionHandler('nexttrack',
                      () => index! < items.length - 1 && onNavigate(index! + 1));
                  } catch {
                    /* API no soportada — seguimos con audio normal */
                  }
                }
              }}
            >
              Tu navegador no puede reproducir audio.
            </audio>
          )}
          {platform === 'mp3' && audioError && (
            <p className="suno-modal__empty">
              El audio no está disponible por ahora.
            </p>
          )}
          {platform === 'none' && (
            <p className="suno-modal__empty">Sin fuente reproducible todavía.</p>
          )}
        </div>

        {isOpenableExternal(externalUrl) && (
          <a
            className="suno-modal__external"
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            escuchar en {platform === 'none' ? 'origen' : platform}
          </a>
        )}
      </div>
    </div>
  );
}
