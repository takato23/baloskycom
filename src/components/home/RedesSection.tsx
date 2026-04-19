import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Social } from '@/types';

/**
 * Port of `<section id="redes">` — social links grid.
 *
 * Antes: tarjetas semitransparentes con la inicial de la red como "ícono".
 * Ahora: glassmorphism con logos SVG reales de cada plataforma y color de
 * marca como acento en hover. El blur + saturate de `backdrop-filter` le
 * da el look "liquid glass" estilo iOS 26.
 *
 * CSS inline con prefijo `rdx-` para que no pise el `.red-card` legacy
 * definido en delirio.css (si alguien cambia esa sección, esto sigue
 * funcionando independiente).
 */

type Platform =
  | 'instagram'
  | 'instagram-foto'
  | 'spotify'
  | 'apple-music'
  | 'youtube'
  | 'tiktok'
  | 'twitch'
  | 'twitter'
  | 'mail'
  | 'generic';

function detectPlatform(name: string): Platform {
  const p = (name || '').toLowerCase();
  if (p.includes('instagram') && (p.includes('foto') || p.includes('@foto'))) return 'instagram-foto';
  if (p.includes('instagram') || p === 'ig') return 'instagram';
  if (p.includes('spotify')) return 'spotify';
  if (p.includes('apple')) return 'apple-music';
  if (p.includes('youtube') || p === 'yt') return 'youtube';
  if (p.includes('tiktok') || p === 'tk') return 'tiktok';
  if (p.includes('twitch')) return 'twitch';
  if (p.includes('twitter') || p === 'x') return 'twitter';
  if (p.includes('mail') || p.includes('email')) return 'mail';
  return 'generic';
}

/** Brand color per platform — used as a soft glow on hover. */
const BRAND: Record<Platform, string> = {
  instagram: '#E4405F',
  'instagram-foto': '#FD7034',
  spotify: '#1DB954',
  'apple-music': '#FA233B',
  youtube: '#FF0000',
  tiktok: '#25F4EE',
  twitch: '#9146FF',
  twitter: '#1DA1F2',
  mail: '#FA5D29',
  generic: '#FA5D29',
};

/**
 * Fondo del chip del ícono — por defecto es el color de marca sólido
 * (estilo app-icon de iOS). Para Instagram usamos el gradiente clásico
 * multicolor. TikTok es el negro con el logo teal/rojo. X es negro.
 * Apple Music usa su propio gradiente rojo→magenta. Así cada chip es
 * inmediatamente reconocible aun en miniatura.
 */
const ICON_BG: Record<Platform, string> = {
  instagram:
    'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
  'instagram-foto':
    'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
  spotify: '#1DB954',
  'apple-music': 'linear-gradient(180deg, #FA233B 0%, #FB5C74 100%)',
  youtube: '#FF0000',
  tiktok: '#010101',
  twitch: '#9146FF',
  twitter: '#000000',
  mail: 'linear-gradient(180deg, #FA5D29 0%, #F02E65 100%)',
  generic: 'linear-gradient(180deg, #FA5D29 0%, #F02E65 100%)',
};

/**
 * Minimal monochrome SVG logos. `fill="currentColor"` so the color follows
 * the text color (accent on hover via the brand gradient behind).
 */
function PlatformLogo({ platform }: { platform: Platform }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };
  switch (platform) {
    case 'instagram':
    case 'instagram-foto':
      return (
        <svg {...common}>
          <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2 0 1.8.3 2.2.4.6.2 1 .4 1.4.9.5.5.7.9.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.3 1.8-.4 2.2-.2.6-.4 1-.9 1.4-.5.5-.9.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.3-2.2-.4-.6-.2-1-.4-1.4-.9-.5-.5-.7-.9-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.3-1.8.4-2.2.2-.6.4-1 .9-1.4.5-.5.9-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1 0-1.7.3-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.1.4-.4 1-.4 2.1-.1 1.3-.1 1.7-.1 4.8s0 3.5.1 4.8c0 1.1.3 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.1 1 .4 2.1.4 1.3.1 1.7.1 4.8.1s3.5 0 4.8-.1c1.1 0 1.7-.3 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.1-.4.4-1 .4-2.1.1-1.3.1-1.7.1-4.8s0-3.5-.1-4.8c0-1.1-.3-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.1-1-.4-2.1-.4-1.3-.1-1.7-.1-4.8-.1zm0 3c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5zm0 8.2c1.8 0 3.2-1.4 3.2-3.2S13.8 8.8 12 8.8 8.8 10.2 8.8 12s1.4 3.2 3.2 3.2zm6.4-8.4c0 .7-.5 1.2-1.2 1.2s-1.2-.5-1.2-1.2.5-1.2 1.2-1.2 1.2.5 1.2 1.2z" />
        </svg>
      );
    case 'spotify':
      return (
        <svg {...common}>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.4-1.5-5.5-1.8-9-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 3.9-.9 7.3-.5 10 1.1.4.2.5.6.2 1zm1.2-2.7c-.3.4-.7.5-1.1.3-2.8-1.7-7-2.2-10.3-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.7-1.1 8.4-.6 11.6 1.4.4.2.5.7.3 1zm.1-2.8c-3.3-2-8.8-2.2-12-1.2-.5.2-1-.1-1.2-.6s.1-1 .6-1.2c3.7-1.1 9.8-.9 13.6 1.4.5.3.6.9.3 1.3-.3.5-.9.6-1.3.3z" />
        </svg>
      );
    case 'apple-music':
      return (
        <svg {...common}>
          <path d="M16.8 3.5c-.3.1-3.2.8-5.1 1.3-.4.1-.7.4-.7.9v10.6c0 .8-.4 1.3-1.2 1.4-.3.1-.7.2-1.1.2-1.3.2-2.3 1.2-2.3 2.4 0 1.2 1 2.1 2.3 1.9 1.4-.2 2.6-1.3 2.6-2.7V9.2c0-.2.2-.4.4-.4 1-.2 3.4-.7 4.5-1 .2-.1.4 0 .4.3v6.8c0 .8-.4 1.3-1.2 1.4-.3.1-.7.2-1.1.2-1.3.2-2.3 1.2-2.3 2.4 0 1.2 1 2.1 2.3 1.9 1.4-.2 2.6-1.3 2.6-2.7V4.5c0-.8-.4-1.2-1.1-1z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6c-1 .3-1.8 1.1-2.1 2.1C0 8 0 12 0 12s0 4 .5 5.8c.3 1 1.1 1.8 2.1 2.1 1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6c1-.3 1.8-1.1 2.1-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M19.6 6.3c-1.4-.9-2.4-2.5-2.6-4.3H13.5v14.3c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .6 0 .9.1V9.9c-.3 0-.6-.1-.9-.1-3.6 0-6.4 2.9-6.4 6.4s2.9 6.4 6.4 6.4 6.4-2.9 6.4-6.4V9.7c1.3.9 2.9 1.5 4.6 1.5V7.6c-1 0-1.9-.4-2.6-.9-.1 0-.3-.2-.4-.3z" />
        </svg>
      );
    case 'twitch':
      return (
        <svg {...common}>
          <path d="M2.1 4.3v14.1h4.8v3.3h2.7l3.3-3.3h3.9L22.5 13V4.3H2.1zm18.1 7.9l-3.3 3.3h-3.9l-3.3 3.3v-3.3H6.6V6.1h13.6v6.1zM17 7.7v5.4h-1.7V7.7H17zm-4.5 0v5.4h-1.7V7.7h1.7z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...common}>
          <path d="M18.9 3H22l-7 8 8.3 10.8h-6.5l-5.1-6.6-5.8 6.6H3l7.5-8.6L2.4 3H9l4.6 6.1L18.9 3zm-1 17.1h1.7L7.3 4.7H5.5l13.4 15.4z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <path d="M3 5h18c.6 0 1 .4 1 1v12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1zm1 2.3V18h16V7.3l-8 5.2-8-5.2zm.6-.3L12 10.8 19.4 7H4.6z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v5l3 3" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
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
      <style>{GLASS_CSS}</style>
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

        <div className="rdx-grid reveal">
          {socials.map((s) => {
            const platform = detectPlatform(s.platform || s.name);
            const brand = BRAND[platform];
            const iconBg = ICON_BG[platform];
            return (
              <a
                key={s.id}
                href={s.url}
                target={s.url.startsWith('mailto:') ? undefined : '_blank'}
                rel={s.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="rdx-card"
                data-platform={platform}
                data-cursor="IR"
                style={{ ['--brand' as string]: brand }}
              >
                <span className="rdx-glow" aria-hidden />
                <span className="rdx-icon" aria-hidden style={{ background: iconBg }}>
                  <span className="rdx-icon-shine" aria-hidden />
                  <PlatformLogo platform={platform} />
                </span>
                <span className="rdx-text">
                  <span className="rdx-name">{s.name}</span>
                  <span className="rdx-handle">{s.handle}</span>
                </span>
                <span className="rdx-arrow" aria-hidden>→</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Liquid-glass card styles. Translucent fill + backdrop-filter blur +
 * saturate gives the iOS-26 liquid-glass look; the brand-color glow on
 * hover ties each card back to its platform.
 */
const GLASS_CSS = `
.rdx-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
  gap:14px;
}
.rdx-card{
  position:relative;
  display:grid;
  grid-template-columns:auto 1fr auto;
  align-items:center;
  gap:14px;
  padding:16px 18px;
  border-radius:18px;
  overflow:hidden;
  color:rgba(243,239,230,0.92);
  text-decoration:none;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 60%),
    rgba(18,16,20,0.55);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:
    0 8px 30px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.14),
    inset 0 -1px 0 rgba(0,0,0,0.25);
  transition:
    transform .3s cubic-bezier(.2,.8,.2,1),
    border-color .3s ease,
    box-shadow .3s ease,
    color .25s ease;
  will-change:transform;
}
.rdx-card:hover{
  transform:translateY(-3px) scale(1.01);
  border-color:color-mix(in oklab, var(--brand) 55%, rgba(255,255,255,0.2));
  color:#fff;
  box-shadow:
    0 14px 48px rgba(0,0,0,0.35),
    0 0 36px color-mix(in oklab, var(--brand) 30%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.18),
    inset 0 -1px 0 rgba(0,0,0,0.28);
}
.rdx-glow{
  position:absolute; inset:-1px;
  border-radius:inherit;
  background:radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--brand) 26%, transparent), transparent 60%);
  opacity:.4;
  pointer-events:none;
  transition:opacity .3s ease;
}
.rdx-card:hover .rdx-glow{ opacity:.9; }
/* App-icon style chip: fondo 100% marca + logo blanco. El inline style
   setea background por plataforma (Instagram gradient, Spotify verde, etc).
   Mantenemos un shine sutil arriba para el look "glass". */
.rdx-icon{
  position:relative;
  width:46px; height:46px;
  display:grid; place-items:center;
  border-radius:13px;
  color:#ffffff;
  border:1px solid rgba(255,255,255,0.18);
  box-shadow:
    0 4px 12px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255,255,255,0.35);
  overflow:hidden;
  transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;
  flex-shrink:0;
}
.rdx-icon > svg{ position:relative; z-index:1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.25)); }
.rdx-icon-shine{
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 60%);
  pointer-events:none;
  opacity:.7;
}
.rdx-card:hover .rdx-icon{
  transform: scale(1.08) rotate(-2deg);
  box-shadow:
    0 10px 24px rgba(0,0,0,0.35),
    0 0 24px color-mix(in oklab, var(--brand) 45%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.45);
}
.rdx-text{ display:flex; flex-direction:column; min-width:0; }
.rdx-name{
  font-weight:800; font-size:15px; letter-spacing:-0.01em;
  line-height:1.2;
  white-space:nowrap; text-overflow:ellipsis; overflow:hidden;
}
.rdx-handle{
  font-family:'JetBrains Mono',ui-monospace,monospace;
  font-size:11px;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:rgba(243,239,230,0.55);
  margin-top:2px;
  white-space:nowrap; text-overflow:ellipsis; overflow:hidden;
}
.rdx-arrow{
  font-size:18px;
  color:rgba(243,239,230,0.45);
  transition: transform .25s ease, color .25s ease;
}
.rdx-card:hover .rdx-arrow{
  transform: translateX(3px);
  color: color-mix(in oklab, var(--brand) 85%, #fff);
}

/* Reduce blur cost on mobile — the blur shader is expensive and the grid
   takes a lot of screen space. Keeps the look, halves the GPU. */
@media (max-width: 640px){
  .rdx-card{
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
  }
}

/* If the browser doesn't support backdrop-filter, fall back to a denser
   background so the text stays readable. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){
  .rdx-card{ background: rgba(18,16,20,0.78); }
}

/* Light mode — flip the base layer so the glass still reads against the
   light page. */
[data-mode="light"] .rdx-card{
  color: rgba(10,9,8,0.85);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 60%),
    rgba(250,245,235,0.55);
  border-color: rgba(10,9,8,0.08);
  box-shadow:
    0 10px 30px rgba(10,9,8,0.08),
    inset 0 1px 0 rgba(255,255,255,0.7);
}
[data-mode="light"] .rdx-handle{ color: rgba(10,9,8,0.55); }
[data-mode="light"] .rdx-arrow{ color: rgba(10,9,8,0.45); }
`;
