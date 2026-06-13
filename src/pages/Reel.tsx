import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { api } from '@/services/api';
import { trackEvent } from '@/lib/analytics';
import PageMeta from '@/components/PageMeta';
import '@/styles/reel.css';

/**
 * /reel — la tarjeta de presentación.
 *
 * Un link limpio para pitchear por DM/WhatsApp: abre el showreel fullscreen
 * sin nav, sin footer, sin distracciones. Arranca muteado (autoplay policy);
 * un tap activa el sonido. Única salida: el CTA a /productora#consulta.
 *
 * Fuente del video: el reel de scripts/build-productora-previews.mjs
 * (manifest.json). Si no hay reel armado, cae al primer trabajo del feed
 * de videos IA; si tampoco hay, redirige a /productora.
 */
export default function Reel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const manifest = await fetch('/videos/productora/manifest.json').then((r) =>
          r.ok ? r.json() : null,
        );
        if (mounted && manifest?.reel) {
          setSrc(manifest.reel);
          return;
        }
        const works = await api.getMedia('video_ia');
        const first = works.find((m) => m.active !== false && m.mediaUrl);
        if (mounted && first?.mediaUrl) {
          setSrc(first.mediaUrl);
          return;
        }
        if (mounted) window.location.replace('/productora');
      } catch {
        if (mounted) window.location.replace('/productora');
      } finally {
        if (mounted) setChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (src) trackEvent('media_open', { source: 'reel', kind: 'showreel' }, { target: src });
  }, [src]);

  const toggleSound = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = !muted;
    setMuted(next);
    vid.muted = next;
    if (vid.paused) vid.play().catch(() => {});
    trackEvent('cta_click', { source: 'reel', target: next ? 'mute' : 'unmute' }, { target: 'reel_sound' });
  };

  return (
    <div className="reel-page">
      <PageMeta
        title="Showreel — Santi Balosky, creativo IA"
        description="El reel: spots, campañas y piezas con IA en un minuto. Si te cierra el tono, hablamos."
        keywords={['showreel', 'reel', 'video', 'IA', 'productora', 'Balosky']}
        ogTitle="Showreel — Santi Balosky"
        ogDescription="Spots, campañas y piezas con IA en un minuto."
      />

      {src && (
        <video
          ref={videoRef}
          className="reel-page__video"
          src={src}
          autoPlay
          muted={muted}
          loop
          playsInline
          controls={false}
          onClick={toggleSound}
        />
      )}

      {!src && checked && <div className="reel-page__loading">cargando reel…</div>}

      <header className="reel-page__brand">
        <a href="/" aria-label="Balosky — inicio">
          BALOSKY<span>.</span>
        </a>
        <p>creativo IA · buenos aires</p>
      </header>

      {src && (
        <button type="button" className="reel-page__sound" onClick={toggleSound}>
          {muted ? '🔇 tocá para escuchar' : '🔊 sonido'}
        </button>
      )}

      <footer className="reel-page__cta">
        <p>¿Te cierra el tono?</p>
        <a
          href="/productora#consulta"
          onClick={() => trackEvent('cta_click', { source: 'reel', target: 'consulta' }, { target: 'reel_cta' })}
        >
          Trabajemos
          <ArrowUpRight size={16} />
        </a>
      </footer>
    </div>
  );
}
