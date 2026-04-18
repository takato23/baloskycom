/**
 * Detect the streaming platform behind a URL and return the data needed to
 * embed it. Supports the shapes we care about for Balosky:
 *   - Spotify track, album, playlist, or artist
 *   - YouTube video (watch, youtu.be, shorts, embed)
 *   - Apple Music song, album, or artist
 *
 * Anything else returns null so callers can fall back to the MP3 player.
 */

export type EmbedPlatform = 'spotify' | 'youtube' | 'apple-music';

export type EmbedInfo = {
  platform: EmbedPlatform;
  /** Fully-formed iframe src. */
  embedSrc: string;
  /** Canonical link the user can click through to. */
  externalUrl: string;
  /** Human label, e.g. "Spotify · track". */
  label: string;
  /** What aspect the iframe wants — "audio" means ~152px tall, "video" means 16:9. */
  shape: 'audio' | 'video';
};

function safeUrl(input: string): URL | null {
  try { return new URL(input.trim()); }
  catch { return null; }
}

export function parseEmbedUrl(raw: string | null | undefined): EmbedInfo | null {
  if (!raw) return null;
  const url = safeUrl(raw);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  // ---- Spotify --------------------------------------------------------------
  // https://open.spotify.com/track/{id}
  // https://open.spotify.com/album/{id}
  // https://open.spotify.com/playlist/{id}
  // https://open.spotify.com/artist/{id}
  if (host === 'open.spotify.com' || host === 'spotify.com') {
    const segments = url.pathname.split('/').filter(Boolean);
    // Strip locale prefix like /intl-es/
    if (segments[0]?.startsWith('intl-')) segments.shift();
    const [type, id] = segments;
    if (!type || !id) return null;
    const knownTypes = ['track', 'album', 'playlist', 'artist', 'episode', 'show'];
    if (!knownTypes.includes(type)) return null;
    return {
      platform: 'spotify',
      embedSrc: `https://open.spotify.com/embed/${type}/${id}?utm_source=balosky`,
      externalUrl: url.toString(),
      label: `Spotify · ${type}`,
      shape: 'audio',
    };
  }

  // ---- YouTube --------------------------------------------------------------
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (!id) return null;
    return {
      platform: 'youtube',
      embedSrc: `https://www.youtube.com/embed/${id}`,
      externalUrl: url.toString(),
      label: 'YouTube · video',
      shape: 'video',
    };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    // /watch?v=ID
    const vId = url.searchParams.get('v');
    if (vId) {
      return {
        platform: 'youtube',
        embedSrc: `https://www.youtube.com/embed/${vId}`,
        externalUrl: url.toString(),
        label: 'YouTube · video',
        shape: 'video',
      };
    }
    // /shorts/ID or /embed/ID
    const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
    if (m) {
      return {
        platform: 'youtube',
        embedSrc: `https://www.youtube.com/embed/${m[1]}`,
        externalUrl: url.toString(),
        label: 'YouTube · video',
        shape: 'video',
      };
    }
    // /playlist?list=ID → embed as a playlist player
    const listId = url.searchParams.get('list');
    if (listId && /^\/playlist/.test(url.pathname)) {
      return {
        platform: 'youtube',
        embedSrc: `https://www.youtube.com/embed/videoseries?list=${listId}`,
        externalUrl: url.toString(),
        label: 'YouTube · playlist',
        shape: 'video',
      };
    }
    return null;
  }

  // ---- Apple Music ----------------------------------------------------------
  // https://music.apple.com/{cc}/{kind}/{slug}/{id}
  // https://music.apple.com/{cc}/{kind}/{slug}/{id}?i={songId}  (song inside album)
  if (host === 'music.apple.com') {
    // Apple's own iframe URL is just the song/album URL with `embed.` prefix.
    // See https://developer.apple.com/documentation/musickit/apple-music-web-embed
    const embedHost = 'embed.music.apple.com';
    const embedUrl = new URL(url.toString());
    embedUrl.hostname = embedHost;
    const kindMatch = url.pathname.match(/^\/[^/]+\/(song|album|artist|playlist|music-video)\//);
    const kind = kindMatch?.[1] || 'track';
    return {
      platform: 'apple-music',
      embedSrc: embedUrl.toString(),
      externalUrl: url.toString(),
      label: `Apple Music · ${kind}`,
      shape: kind === 'album' || kind === 'artist' || kind === 'playlist' ? 'audio' : 'audio',
    };
  }

  return null;
}

/**
 * Short chip-style label for the admin UI — tells the editor what the parser
 * saw without dumping the whole EmbedInfo.
 */
export function describePlatform(raw: string | null | undefined): string | null {
  const info = parseEmbedUrl(raw);
  return info ? info.label : null;
}
