import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/services/api';
import type { Media, MediaKind } from '@/types';

/**
 * Port of `<section id="archivo">` — drag-to-scroll archive rail.
 *
 * The rail uses native horizontal scrolling plus a mousedown grab handler so
 * desktop users can fling it. Touch scrolling works out of the box. Entries
 * come from /api/media: no fake discos, giras or drops.
 */

type RailItem = {
  n: string;
  cls: 'g1' | 'g2' | 'g3' | 'g4' | 'g5';
  cat: string;
  title: string;
  desc: string;
  href: string;
  image?: string | null;
};

const KIND_LABEL: Record<MediaKind, string> = {
  video_ia: 'VIDEO IA',
  foto: 'FOTO',
  wallpaper: 'WALLPAPER',
  cancion: 'CANCIÓN',
  panorama_360: '360',
};

function archiveHref(m: Media) {
  if (m.kind === 'video_ia' || m.kind === 'panorama_360') return '/laboratorio';
  if (m.kind === 'foto') return '/#ojo';
  if (m.kind === 'wallpaper') return '/#pixel';
  if (m.kind === 'cancion') return '/#sonido';
  return m.embedUrl || m.mediaUrl || '/';
}

function toRailItem(m: Media, index: number): RailItem {
  const cat = [KIND_LABEL[m.kind], m.category].filter(Boolean).join(' · ');
  const desc =
    m.description ||
    m.duration ||
    (m.kind === 'video_ia' && m.aiTool ? `Hecho con ${m.aiTool}` : '') ||
    'Parte del archivo de Balosky.';
  return {
    n: String(index + 1).padStart(2, '0'),
    cls: `g${(index % 5) + 1}` as RailItem['cls'],
    cat,
    title: m.title || 'Sin título',
    desc,
    href: archiveHref(m),
    image: m.thumbUrl || m.coverImage || (m.kind === 'foto' || m.kind === 'wallpaper' ? m.mediaUrl : null),
  };
}

export default function ArchivoSection() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getMedia()
      .then((rows) => {
        if (!mounted) return;
        setMedia(rows.filter((m) => m.active !== false));
      })
      .catch((err) => console.error('[ArchivoSection] getMedia failed', err));
    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo(
    () =>
      media
        .slice()
        .sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          const sort = (a.sortOrder || 0) - (b.sortOrder || 0);
          if (sort !== 0) return sort;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        })
        .slice(0, 14)
        .map(toRailItem),
    [media],
  );

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: MouseEvent) => {
      down = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('dragging');
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    };
    const onUp = () => {
      down = false;
      el.classList.remove('dragging');
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <section id="archivo">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--gold)', color: '#0a0908' }}>
                09 · ARCHIVO
              </span>
            </div>
            <h2>archivo vivo<br /><em>en movimiento</em>.</h2>
          </div>
          <p>
            Un índice vivo de todo el universo: videos IA, fotos, wallpapers, canciones y
            panoramas.
          </p>
        </div>
      </div>
      <div className="wrap">
        <div
          ref={railRef}
          className="rail reveal annot-wrap"
          data-cursor="ARRASTRAME"
        >
          <div
            className="scrawl-arrow"
            style={{
              position: 'absolute',
              top: -18,
              left: 30,
              transform: 'rotate(60deg)',
              color: 'var(--teal)',
              zIndex: 5,
            }}
          >
            ↘
          </div>
          <div
            className="scrawl"
            style={{
              position: 'absolute',
              top: -50,
              left: 70,
              color: 'var(--teal)',
              zIndex: 5,
            }}
          >
            agarrá y arrastrá
          </div>
          {items.map((it) => (
            <a key={`${it.n}-${it.title}`} href={it.href} data-cursor="ABRIR" className={`rail-card ${it.cls}`}>
              <div className="art">
                {it.image ? <img src={it.image} alt="" loading="lazy" draggable={false} /> : it.n}
              </div>
              <div className="info">
                <div className="cat">{it.cat}</div>
                <h4>{it.title}</h4>
                <p>{it.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
