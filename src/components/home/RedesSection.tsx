import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Social } from '@/types';

/**
 * Port of `<section id="redes">` — social links grid.
 *
 * Fetches `/api/socials` and renders a `.red-card` per entry. The static
 * home uses platform-specific gradient classes (ig/igf/tw/sp/am/yt/tk/ml)
 * for the hover background — we mirror that mapping here.
 */

function platformClass(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('instagram') && (p.includes('foto') || p.includes('@foto'))) return 'igf';
  if (p.includes('instagram')) return 'ig';
  if (p.includes('twitch')) return 'tw';
  if (p.includes('spotify')) return 'sp';
  if (p.includes('apple')) return 'am';
  if (p.includes('youtube')) return 'yt';
  if (p.includes('tiktok')) return 'tk';
  if (p.includes('mail') || p.includes('email')) return 'ml';
  return '';
}

function iconLetter(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

const FALLBACK: Social[] = [
  {
    id: 'f1',
    platform: 'Instagram',
    name: 'Instagram',
    handle: '@santiagobalosky',
    url: 'https://instagram.com/santiagobalosky',
    icon: null,
    active: true,
    sortOrder: 0,
  },
  {
    id: 'f2',
    platform: 'Instagram foto',
    name: '@fotobalosky',
    handle: 'fotografía',
    url: 'https://instagram.com/fotobalosky',
    icon: null,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'f3',
    platform: 'Spotify',
    name: 'Spotify',
    handle: 'Balosky',
    url: 'https://open.spotify.com/artist/balosky',
    icon: null,
    active: true,
    sortOrder: 2,
  },
  {
    id: 'f4',
    platform: 'Apple Music',
    name: 'Apple Music',
    handle: 'Balosky',
    url: 'https://music.apple.com/ar/artist/balosky',
    icon: null,
    active: true,
    sortOrder: 3,
  },
  {
    id: 'f5',
    platform: 'YouTube',
    name: 'YouTube',
    handle: '@santiagobalosky',
    url: 'https://youtube.com/@santiagobalosky',
    icon: null,
    active: true,
    sortOrder: 4,
  },
  {
    id: 'f6',
    platform: 'TikTok',
    name: 'TikTok',
    handle: '@santiagobalosky',
    url: 'https://tiktok.com/@santiagobalosky',
    icon: null,
    active: true,
    sortOrder: 5,
  },
  {
    id: 'f7',
    platform: 'Twitch',
    name: 'Twitch',
    handle: 'balosky',
    url: 'https://twitch.tv/balosky',
    icon: null,
    active: true,
    sortOrder: 6,
  },
  {
    id: 'f8',
    platform: 'Mail',
    name: 'Mail directo',
    handle: 'hola@balosky.com',
    url: 'mailto:hola@balosky.com',
    icon: null,
    active: true,
    sortOrder: 7,
  },
];

export default function RedesSection() {
  const [socials, setSocials] = useState<Social[]>(FALLBACK);

  useEffect(() => {
    let mounted = true;
    api
      .getSocials()
      .then((rows) => {
        if (!mounted) return;
        const active = rows.filter((r) => r.active !== false);
        if (active.length > 0) setSocials(active);
      })
      .catch((e) => console.error('[RedesSection] getSocials failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="redes">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--teal)', color: '#0a0908' }}>
                10 · REDES
              </span>
            </div>
            <h2>en todos<br /><em>los lados</em>.</h2>
          </div>
          <p>
            Seguime donde te quede más cómodo. Instagram es donde más paso, pero todo el contenido
            está distribuido.
          </p>
        </div>

        <div className="redes-grid reveal">
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target={s.url.startsWith('mailto:') ? undefined : '_blank'}
              rel={s.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className={`red-card ${platformClass(s.platform)}`}
              data-cursor="IR"
            >
              <div className="r-icon">{iconLetter(s.icon || s.name || s.platform)}</div>
              <div>
                <div className="r-name">{s.name}</div>
                <div className="r-handle">{s.handle}</div>
              </div>
              <div className="r-arrow">→</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
