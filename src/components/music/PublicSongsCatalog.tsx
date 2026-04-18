/**
 * Public catalog of `cancion` media rows. Used under the MUSIC section of the
 * home page. Shows everything uploaded from admin with:
 *   - category pills to filter (Electrónica / Música Temática / Temas Propios)
 *   - per-track embed preview when `embedUrl` is set (Spotify / Apple Music /
 *     YouTube) — plays on the platform so streams count
 *   - fallback to a native `<audio>` player when only `mediaUrl` exists
 *
 * Why this is a separate component from HomeMusicSection: the existing section
 * is wired to `settings.content.home.music.tracks` (a static list from site
 * settings) and has a lot of player/visualizer state. This block reads the
 * `/api/media` endpoint directly so new uploads show up without having to
 * duplicate them into settings.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { Media } from '@/types';
import { SongEmbed } from '@/components/music/SongEmbed';
import { parseEmbedUrl } from '@/lib/songEmbed';
import { cn } from '@/lib/utils';
import { Play, Music as MusicIcon, ExternalLink } from 'lucide-react';

const ALL_LABEL = 'Todas';

function platformLabel(embedUrl: string | null | undefined): string | null {
  const info = parseEmbedUrl(embedUrl);
  if (!info) return null;
  return info.platform === 'spotify' ? 'Spotify'
    : info.platform === 'youtube' ? 'YouTube'
    : 'Apple Music';
}

export default function PublicSongsCatalog() {
  const [songs, setSongs] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_LABEL);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getMedia('cancion')
      .then((rows) => {
        if (cancelled) return;
        // Hide anything the admin soft-deleted (active === false) and sort by
        // the explicit order set in admin.
        const visible = rows
          .filter((m) => m.active !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setSongs(visible);
      })
      .catch((err) => !cancelled && setError(err?.message ?? 'Error cargando canciones'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of songs) {
      const c = (s.category || '').trim();
      if (c) set.add(c);
    }
    return [ALL_LABEL, ...Array.from(set).sort()];
  }, [songs]);

  const visible = useMemo(
    () => activeCategory === ALL_LABEL
      ? songs
      : songs.filter((s) => (s.category || '').trim() === activeCategory),
    [songs, activeCategory]
  );

  if (loading) return null; // the parent section already has a header; silently skip
  if (error) {
    return (
      <div className="mt-8 text-sm text-[var(--muted)]">
        No pude cargar el catálogo ({error}).
      </div>
    );
  }
  if (!songs.length) return null;

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <p className="t-eyebrow">Catálogo · {songs.length} tema{songs.length === 1 ? '' : 's'}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] px-3 py-2 border transition-colors',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--white)]'
                    : 'border-[var(--white)]/20 text-[var(--white)] hover:border-[var(--accent)]'
                )}
                data-hover
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((song) => {
          const isOpen = openId === song.id;
          const platform = platformLabel(song.embedUrl);
          const hasEmbed = !!platform;
          const hasAudio = !!song.mediaUrl;

          return (
            <div
              key={song.id}
              className={cn(
                'border transition-colors',
                isOpen
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--white)]/10 hover:border-[var(--accent)]/40'
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : song.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
                data-hover
              >
                <div
                  className="w-12 h-12 flex-shrink-0 overflow-hidden bg-[var(--white)]/5 flex items-center justify-center"
                  style={song.coverImage ? undefined : { color: 'var(--accent)' }}
                >
                  {song.coverImage ? (
                    <img
                      src={song.coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <MusicIcon size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{song.title}</p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {song.category || 'Sin categoría'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {platform && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {platform}
                    </span>
                  )}
                  <Play size={16} className={isOpen ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
                </div>
              </button>

              {isOpen && (
                <div className="p-3 pt-0">
                  {hasEmbed ? (
                    <SongEmbed url={song.embedUrl!} title={song.title} />
                  ) : hasAudio ? (
                    <audio
                      src={song.mediaUrl!}
                      controls
                      preload="metadata"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-xs text-[var(--muted)] italic">
                      Sin reproductor — este tema aún no tiene MP3 ni embed.
                    </p>
                  )}

                  {hasEmbed && (
                    <a
                      href={song.embedUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                      data-hover
                    >
                      Abrir en {platform} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!visible.length && (
        <div className="mt-4 text-sm text-[var(--muted)] italic">
          No hay temas en {activeCategory}.
        </div>
      )}
    </div>
  );
}
