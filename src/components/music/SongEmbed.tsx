import React from 'react';
import { parseEmbedUrl, type EmbedInfo } from '@/lib/songEmbed';

/**
 * Render the official player for a Spotify/YouTube/Apple Music URL.
 *
 * Why this component exists: when a track is also published on a streaming
 * platform, we want plays to count there (artist metrics, algorithm, saves).
 * The native `<audio>` on the site never hits those systems, so if the admin
 * set `embedUrl` we defer to the platform's own iframe.
 *
 * Returns `null` if the URL doesn't parse — callers should fall back to the
 * MP3 player in that case.
 */
export function SongEmbed({
  url,
  className,
  title,
}: {
  url: string | null | undefined;
  className?: string;
  title?: string;
}) {
  const info = parseEmbedUrl(url);
  if (!info) return null;
  return <SongEmbedFromInfo info={info} className={className} title={title} />;
}

export function SongEmbedFromInfo({
  info,
  className,
  title,
}: {
  info: EmbedInfo;
  className?: string;
  title?: string;
}) {
  const iframeTitle = title ? `${title} — ${info.label}` : info.label;

  // Spotify has a fixed ~152px tall player; YouTube wants 16:9; Apple wants
  // ~175px. We let callers override via className if they want a bigger block.
  if (info.shape === 'video') {
    return (
      <div className={className ?? 'relative w-full aspect-video overflow-hidden rounded-xl bg-black'}>
        <iframe
          src={info.embedSrc}
          title={iframeTitle}
          className="absolute inset-0 w-full h-full"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // Audio-shaped: Spotify (152px) or Apple (175px).
  const height = info.platform === 'apple-music' ? 175 : 152;
  return (
    <iframe
      src={info.embedSrc}
      title={iframeTitle}
      className={className ?? 'w-full rounded-xl'}
      style={{ height }}
      frameBorder={0}
      allow="autoplay *; encrypted-media *; clipboard-write"
      loading="lazy"
    />
  );
}
