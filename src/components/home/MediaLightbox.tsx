import { useEffect, useMemo, useState } from 'react';
import type { Media } from '@/types';

/**
 * Shared fullscreen lightbox used by Visión (video) and Ojo (photo).
 *
 * Features:
 * - ESC / click backdrop → close
 * - ←/→ keyboard navigation + on-screen `.mm-nav` buttons
 * - Body scroll lock while open
 * - `1 / N` counter in the top-left
 * - Video items autoplay unmuted (direct user gesture); photos render an
 *   `<img>` tag. Embeds (YouTube/Vimeo/Spotify for video) fall back to
 *   an iframe.
 *
 * The modal mounts with `display:flex` when `index != null`, and unmounts
 * on close so `<video>` tears down cleanly.
 */

export type LightboxMode = 'video' | 'photo';

type Props = {
  items: Media[];
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  mode: LightboxMode;
};

export default function MediaLightbox({ items, index, onClose, onNavigate, mode }: Props) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const [stageState, setStageState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Reset stage state whenever the active item changes.
  useEffect(() => {
    if (!open) return;
    setStageState('loading');
  }, [open, item?.id]);

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

  const counter = useMemo(() => {
    if (!open) return '';
    return `${index! + 1} / ${items.length}`;
  }, [open, index, items.length]);

  if (!open || !item) return null;

  const prevDisabled = index === 0;
  const nextDisabled = index === items.length - 1;

  return (
    <div
      className="media-modal open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="mm-counter">{counter}</div>
      <button
        type="button"
        className="mm-close"
        onClick={onClose}
        data-cursor="CERRAR"
        aria-label="Cerrar"
      >
        ✕
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            className="mm-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              if (!prevDisabled) onNavigate(index! - 1);
            }}
            disabled={prevDisabled}
            aria-label="Anterior"
            data-cursor="ANTERIOR"
          >
            ‹
          </button>
          <button
            type="button"
            className="mm-nav next"
            onClick={(e) => {
              e.stopPropagation();
              if (!nextDisabled) onNavigate(index! + 1);
            }}
            disabled={nextDisabled}
            aria-label="Siguiente"
            data-cursor="SIGUIENTE"
          >
            ›
          </button>
        </>
      )}

      <div
        className="mm-content is-gallery"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mm-stage${stageState === 'loaded' ? ' is-loaded' : ''}${
            stageState === 'error' ? ' is-error' : ''
          }`}
        >
          <div className="mm-spinner" aria-hidden />

          {mode === 'video' && item.embedUrl && (
            <iframe
              key={item.id}
              src={item.embedUrl}
              title={item.title}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onLoad={() => setStageState('loaded')}
              style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 12 }}
            />
          )}

          {mode === 'video' && !item.embedUrl && item.mediaUrl && (
            <video
              key={item.id}
              src={item.mediaUrl}
              poster={item.coverImage || undefined}
              controls
              autoPlay
              playsInline
              onLoadedData={() => setStageState('loaded')}
              onError={() => setStageState('error')}
            />
          )}

          {mode === 'photo' && (
            <img
              key={item.id}
              src={item.coverImage || item.mediaUrl || ''}
              alt={item.title}
              onLoad={() => setStageState('loaded')}
              onError={() => setStageState('error')}
            />
          )}

          {/* Fallback visible solo en estado de error. NO linkeamos al
           * `item.mediaUrl` porque si el archivo original no existe el
           * target termina en un 404 (o peor, en el NotFound de React
           * pidiendo "volver al inicio"). Mejor mostrar un mensaje
           * estático — el usuario ya puede cerrar el modal con ESC o el
           * botón ✕. */}
          <div className="mm-fallback">
            · este archivo todavía no está disponible ·
            <br />
            <span style={{ opacity: 0.6, fontSize: 11, letterSpacing: '0.18em' }}>
              próximamente
            </span>
          </div>
        </div>

        <div className="mm-caption">
          {[item.aiTool, item.category, item.title, item.duration].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}
