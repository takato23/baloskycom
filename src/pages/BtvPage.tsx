import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { Media, MediaKind } from '@/types';
import '@/styles/btv.css';

const KIND_LABEL: Record<MediaKind, string> = {
  video_ia: 'Video IA',
  cancion: 'Canción',
  foto: 'Ojo',
  wallpaper: 'Wallpaper',
  panorama_360: '360',
};

const KIND_HREF: Record<MediaKind, string> = {
  video_ia: '/laboratorio',
  cancion: '/#sonido',
  foto: '/#ojo',
  wallpaper: '/#pixel',
  panorama_360: '/laboratorio',
};

type MediaBuckets = {
  videos: Media[];
  songs: Media[];
  photos: Media[];
  wallpapers: Media[];
};

const EMPTY_BUCKETS: MediaBuckets = {
  videos: [],
  songs: [],
  photos: [],
  wallpapers: [],
};

const sortMedia = (items: Media[]) =>
  items
    .filter((m) => m.active !== false)
    .slice()
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const sort = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (sort !== 0) return sort;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

const visualUrl = (item?: Media | null) =>
  item?.thumbUrl ||
  item?.coverImage ||
  (item?.kind === 'foto' || item?.kind === 'wallpaper' ? item.mediaUrl : null) ||
  null;

const itemHref = (item: Media) => {
  if (item.kind === 'wallpaper' && item.isLocked) return '/checkout/c3?amount=3500';
  return item.embedUrl || item.mediaUrl || KIND_HREF[item.kind] || '/laboratorio';
};

const itemMeta = (item: Media) =>
  [KIND_LABEL[item.kind], item.category, item.aiTool, item.duration].filter(Boolean).join(' · ');

function MediaVisual({
  item,
  eager = false,
  allowVideo = false,
}: {
  item: Media;
  eager?: boolean;
  allowVideo?: boolean;
}) {
  const image = visualUrl(item);

  if (image) {
    return <img src={image} alt="" loading={eager ? 'eager' : 'lazy'} />;
  }

  if (allowVideo && item.kind === 'video_ia' && item.mediaUrl) {
    return <video src={item.mediaUrl} muted playsInline preload="metadata" />;
  }

  return (
    <span className="btv-empty-art" aria-hidden="true">
      {KIND_LABEL[item.kind]}
    </span>
  );
}

function FeatureCard({ item, index }: { item: Media; index: number }) {
  return (
    <a
      className={index === 0 ? 'btv-universe btv-universe--feature' : 'btv-universe'}
      href={itemHref(item)}
      data-cursor="ABRIR"
    >
      <MediaVisual item={item} eager={index === 0} />
      <span className="btv-universe__status">{itemMeta(item) || KIND_LABEL[item.kind]}</span>
      <span className="btv-universe__body">
        <em>{item.category || KIND_LABEL[item.kind]}</em>
        <strong>{item.title}</strong>
        {(item.description || item.category || item.duration) && (
          <small>{item.description || item.category || item.duration}</small>
        )}
        <b>{item.kind === 'wallpaper' && item.isLocked ? 'Ver pack' : 'Abrir'} →</b>
      </span>
    </a>
  );
}

function EpisodeCard({ item, index }: { item: Media; index: number }) {
  return (
    <a className="btv-episode" href={itemHref(item)} data-cursor="VER">
      <span className="btv-episode__media">
        <MediaVisual item={item} />
        <span className="btv-play" aria-hidden="true">▶</span>
      </span>
      <span className="btv-episode__meta">
        <span>{String(index + 1).padStart(2, '0')} · {itemMeta(item) || KIND_LABEL[item.kind]}</span>
        <strong>{item.title}</strong>
        {(item.description || item.duration || item.category) && (
          <em>{item.description || item.duration || item.category}</em>
        )}
      </span>
    </a>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="btv-empty-row">
      <span>{label}</span>
      <strong>Todavía no hay nada por acá. Pronto.</strong>
    </div>
  );
}

export default function BtvPage() {
  const [media, setMedia] = useState<MediaBuckets>(EMPTY_BUCKETS);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.getMedia('video_ia').catch((error) => {
        console.error('[BtvPage] video_ia failed', error);
        return [] as Media[];
      }),
      api.getMedia('cancion').catch((error) => {
        console.error('[BtvPage] cancion failed', error);
        return [] as Media[];
      }),
      api.getMedia('foto').catch((error) => {
        console.error('[BtvPage] foto failed', error);
        return [] as Media[];
      }),
      api.getMedia('wallpaper').catch((error) => {
        console.error('[BtvPage] wallpaper failed', error);
        return [] as Media[];
      }),
    ]).then(([videos, songs, photos, wallpapers]) => {
      if (!mounted) return;
      setMedia({
        videos: sortMedia(videos),
        songs: sortMedia(songs),
        photos: sortMedia(photos),
        wallpapers: sortMedia(wallpapers),
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const allFeatured = useMemo(
    () => [
      ...media.videos,
      ...media.songs.slice(0, 3),
      ...media.photos.slice(0, 3),
      ...media.wallpapers.slice(0, 3),
    ].slice(0, 8),
    [media],
  );

  const heroItem = media.videos[0] || allFeatured[0] || null;
  const heroTitle = heroItem?.title || 'BTV';
  const heroDescription = heroItem?.description || heroItem?.category || 'Lo último del archivo de Balosky.';
  const totals = {
    videos: media.videos.length,
    songs: media.songs.length,
    photos: media.photos.length,
    wallpapers: media.wallpapers.length,
  };

  return (
    <div className="btv-page">
      <section className="btv-hero" id="btv-top">
        <div className="btv-hero__media" aria-hidden="true">
          {heroItem ? <MediaVisual item={heroItem} eager allowVideo /> : <span className="btv-empty-art">BTV</span>}
          {heroItem?.kind === 'video_ia' && heroItem.mediaUrl && visualUrl(heroItem) && (
            <video src={heroItem.mediaUrl} autoPlay muted loop playsInline />
          )}
        </div>
        <div className="btv-hero__shade" aria-hidden="true" />

        <div className="btv-hero__copy">
          <p className="btv-kicker"><span /> BTV</p>
          <h1>BTV</h1>
          <p className="btv-claim">El canal de Balosky.</p>
          <p className="btv-lede">
            Panel: {totals.videos} IA · {totals.songs} canciones · {totals.photos} fotos · {totals.wallpapers} wallpapers.
          </p>
          <div className="btv-actions">
            <a className="btv-btn btv-btn--hot" href="#catalogo-real">
              Ver archivo
            </a>
            <a className="btv-btn btv-btn--ghost" href="/#prepedido-custom">
              Pedime algo con IA
            </a>
            <a className="btv-btn btv-btn--ghost" href="/cafecito">
              Financiar próximo capítulo
            </a>
          </div>
        </div>

        <aside className="btv-now">
          <p>Ahora en BTV</p>
          <strong>{heroTitle}</strong>
          <span>{heroDescription}</span>
        </aside>
      </section>

      <section className="btv-section btv-section--catalog" id="catalogo-real">
        <div className="btv-section__head">
          <p>Catálogo</p>
          <h2>Todo el archivo, junto.</h2>
          <span>
            Videos IA, canciones, fotos y wallpapers en un solo lugar.
          </span>
        </div>

        {allFeatured.length ? (
          <div className="btv-universe-grid">
            {allFeatured.slice(0, 5).map((item, index) => (
              <FeatureCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <EmptyRow label="Catálogo" />
        )}
      </section>

      <section className="btv-section btv-section--episodes" id="videos-ia">
        <div className="btv-section__head btv-section__head--row">
          <div>
            <p>Videos IA</p>
            <h2>{media.videos.length ? 'Videos con IA.' : 'Pronto, nuevos videos.'}</h2>
          </div>
          <Link className="btv-text-link" to="/laboratorio">Abrir laboratorio →</Link>
        </div>

        {media.videos.length ? (
          <div className="btv-episode-grid">
            {media.videos.slice(0, 6).map((item, index) => (
              <EpisodeCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <EmptyRow label="Videos IA" />
        )}
      </section>

      <section className="btv-section btv-section--episodes" id="canciones">
        <div className="btv-section__head btv-section__head--row">
          <div>
            <p>Canciones</p>
            <h2>{media.songs.length ? 'El sonido de Balosky.' : 'Pronto, nueva música.'}</h2>
          </div>
          <a className="btv-text-link" href="/#sonido">Ir a sonido →</a>
        </div>

        {media.songs.length ? (
          <div className="btv-episode-grid">
            {media.songs.slice(0, 6).map((item, index) => (
              <EpisodeCard key={item.id} item={item} index={index} />
            ))}
          </div>
        ) : (
          <EmptyRow label="Canciones" />
        )}
      </section>

      <section className="btv-lab" id="ojo-pixel">
        <div className="btv-lab__visual" aria-hidden="true">
          {media.photos[0] ? <MediaVisual item={media.photos[0]} /> : <span className="btv-empty-art">Ojo</span>}
        </div>
        <div className="btv-lab__copy">
          <p>Ojo / Pixel</p>
          <h2>Fotos y wallpapers reales.</h2>
          <div className="btv-pipeline" aria-label="Resumen de archivo visual">
            <span><b>{totals.photos}</b> Fotos</span>
            <span><b>{totals.wallpapers}</b> Wallpapers</span>
            <span><b>{media.wallpapers.filter((w) => !w.isLocked).length}</b> Gratis</span>
            <span><b>{media.wallpapers.filter((w) => w.isLocked).length}</b> Pack</span>
          </div>
          <p className="btv-lab__text">
            Esta zona toma imágenes del archivo Ojo y del pack Pixel. Los wallpapers bloqueados mantienen su paywall.
          </p>
          <div className="btv-actions">
            <a className="btv-btn btv-btn--hot" href="/#ojo">Ver Ojo</a>
            <a className="btv-btn btv-btn--ghost" href="/#pixel">Ver Pixel</a>
          </div>
        </div>
      </section>

      <section className="btv-support" id="apoyar">
        <div className="btv-support__head">
          <p>Apoyá el archivo</p>
          <h2>Si querés más, ayudás a producirlo.</h2>
          <span>
            Tu apoyo se transforma en cafecitos, encargos y nuevas piezas.
          </span>
        </div>

        <div className="btv-support__cards">
          <a href="/cafecito" className="btv-support-card">
            <span>☕</span>
            <strong>Cafecito</strong>
            <small>Aporte directo para mantener el archivo vivo.</small>
            <b>Invitar cafecito</b>
          </a>
          <a href="/#prepedido-custom" className="btv-support-card btv-support-card--aqua">
            <span>◇</span>
            <strong>Pedime algo con IA</strong>
            <small>Video, canción, sketch, promo o idea rara.</small>
            <b>Hacer encargo</b>
          </a>
          <a href="/cafecito" className="btv-support-card btv-support-card--acid">
            <span>⚡</span>
            <strong>Próximo contenido</strong>
            <small>Ayudá a producir la próxima pieza.</small>
            <b>Sumar poder</b>
          </a>
        </div>
      </section>
    </div>
  );
}
