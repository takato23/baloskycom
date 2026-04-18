/**
 * Minimal ID3v2.3/.4 parser for browser-side MP3 metadata extraction.
 *
 * We don't want to pull in a dependency just to read a handful of frames, and
 * Suno MP3s are well-behaved (UTF-8 / UTF-16 encoded text frames, JPEG cover
 * art in a single APIC frame). This covers:
 *   - TIT2 (title)
 *   - TPE1 (lead artist)
 *   - TALB (album)
 *   - TLEN (length in ms)
 *   - APIC (attached picture / cover art)
 *
 * If the file has no ID3v2 header or the tag is malformed, the parser returns
 * an empty object rather than throwing — callers should treat all fields as
 * best-effort.
 */

export type Mp3Cover = { mime: string; blob: Blob };

export type Mp3Metadata = {
  title?: string;
  artist?: string;
  album?: string;
  durationSec?: number;
  cover?: Mp3Cover | null;
};

/** Read a 4-byte synchsafe integer (ID3v2.4 sizes). */
function readSyncSafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

/** Read a 4-byte big-endian unsigned integer (ID3v2.3 frame sizes). */
function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] * 0x1000000) +
    ((bytes[offset + 1] << 16) >>> 0) +
    ((bytes[offset + 2] << 8) >>> 0) +
    bytes[offset + 3]
  );
}

/**
 * Strip U+FFFD replacement characters. Suno often truncates its own title
 * bytes mid-UTF-8-codepoint, which leaves a `�` at the end of the string —
 * rather than ship that to the DB we just drop it and trim whitespace.
 * We only strip leading/trailing `�` because a middle `�` usually signals
 * corruption worth surfacing to the user.
 */
function cleanReplacementChars(s: string): string {
  return s.replace(/^\uFFFD+/, '').replace(/\uFFFD+$/, '').trim();
}

/** Decode an ID3 text frame payload, respecting its leading encoding byte. */
function decodeText(bytes: Uint8Array): string {
  if (!bytes.length) return '';
  const enc = bytes[0];
  let content = bytes.slice(1);
  // Trim trailing nulls (common in fixed-width padding)
  let end = content.length;
  while (end > 0 && content[end - 1] === 0) end--;
  content = content.slice(0, end);
  try {
    switch (enc) {
      case 0: // ISO-8859-1
        return cleanReplacementChars(new TextDecoder('iso-8859-1').decode(content));
      case 1: {
        // UTF-16 with BOM
        const hasLE = content[0] === 0xff && content[1] === 0xfe;
        const hasBE = content[0] === 0xfe && content[1] === 0xff;
        const label = hasBE ? 'utf-16be' : 'utf-16le';
        const payload = hasLE || hasBE ? content.slice(2) : content;
        return cleanReplacementChars(new TextDecoder(label).decode(payload));
      }
      case 2: // UTF-16BE without BOM (v2.4)
        return cleanReplacementChars(new TextDecoder('utf-16be').decode(content));
      case 3: // UTF-8 (v2.4)
        return cleanReplacementChars(new TextDecoder('utf-8').decode(content));
      default:
        return cleanReplacementChars(new TextDecoder('utf-8').decode(content));
    }
  } catch {
    return cleanReplacementChars(new TextDecoder('utf-8').decode(content));
  }
}

/** Parse an APIC frame payload into { mime, blob }. */
function parseApic(frame: Uint8Array): Mp3Cover | null {
  if (frame.length < 4) return null;
  const enc = frame[0];

  // MIME type: null-terminated ASCII
  let i = 1;
  while (i < frame.length && frame[i] !== 0) i++;
  const mime = new TextDecoder('iso-8859-1').decode(frame.slice(1, i)) || 'image/jpeg';
  i++; // skip MIME terminator

  if (i >= frame.length) return null;
  i++; // skip picture-type byte

  // Description: null-terminated, encoding-aware
  if (enc === 1 || enc === 2) {
    // UTF-16 — terminator is two zero bytes on a 2-byte boundary
    while (i < frame.length - 1) {
      if (frame[i] === 0 && frame[i + 1] === 0) { i += 2; break; }
      i += 2;
    }
  } else {
    while (i < frame.length && frame[i] !== 0) i++;
    i++; // skip terminator
  }
  if (i >= frame.length) return null;

  const imgBytes = frame.slice(i);
  return { mime, blob: new Blob([imgBytes], { type: mime }) };
}

/**
 * Parse ID3v2 metadata from an MP3/M4A file. Reads only the first 1 MB so
 * we don't slurp the entire track into memory — the tag always lives at the
 * start of the file and almost never exceeds a few hundred KB.
 */
export async function parseMp3Metadata(file: File): Promise<Mp3Metadata> {
  const out: Mp3Metadata = {};
  const headBytes = await file
    .slice(0, Math.min(file.size, 1024 * 1024))
    .arrayBuffer();
  const bytes = new Uint8Array(headBytes);

  if (bytes.length < 10) return out;
  // "ID3" magic
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return out;

  const versionMajor = bytes[3]; // 3 or 4 in practice
  const flags = bytes[5];
  const tagSize = readSyncSafeInt(bytes, 6);
  const tagEnd = 10 + tagSize;

  let pos = 10;

  // Skip extended header if present (v2.3 and v2.4 both flag it at 0x40)
  if (flags & 0x40) {
    if (pos + 4 > bytes.length) return out;
    const extSize = versionMajor === 4
      ? readSyncSafeInt(bytes, pos)
      : readUint32BE(bytes, pos);
    pos += 4 + extSize;
  }

  const frameHeaderSize = versionMajor >= 3 ? 10 : 6;

  while (pos + frameHeaderSize <= Math.min(tagEnd, bytes.length)) {
    // End of frames → padding zeros
    if (bytes[pos] === 0) break;

    const id = String.fromCharCode(
      bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]
    );

    let frameSize: number;
    if (versionMajor === 4) {
      frameSize = readSyncSafeInt(bytes, pos + 4);
    } else {
      frameSize = readUint32BE(bytes, pos + 4);
    }

    if (frameSize <= 0 || pos + frameHeaderSize + frameSize > bytes.length) break;

    const dataStart = pos + frameHeaderSize;
    const data = bytes.slice(dataStart, dataStart + frameSize);

    try {
      if (id === 'TIT2') out.title = decodeText(data) || out.title;
      else if (id === 'TPE1') out.artist = decodeText(data) || out.artist;
      else if (id === 'TALB') out.album = decodeText(data) || out.album;
      else if (id === 'TLEN') {
        const ms = parseInt(decodeText(data).trim(), 10);
        if (Number.isFinite(ms) && ms > 0) out.durationSec = Math.round(ms / 1000);
      } else if (id === 'APIC') {
        const cov = parseApic(data);
        if (cov) out.cover = cov;
      }
    } catch (err) {
      // Swallow per-frame parse errors — we'd rather return partial metadata
      // than fail the whole upload. A single garbled frame shouldn't blow
      // up the good ones around it.
      console.warn('[mp3Metadata] frame parse failed', id, err);
    }

    pos = dataStart + frameSize;
  }

  return out;
}

/**
 * Read an audio file's duration via a short-lived <audio> element.
 * Used as a fallback when the file has no TLEN frame (most Suno MP3s don't).
 */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => done(null);
    audio.src = url;
    // Safety net: some browsers never fire loadedmetadata for weird files
    setTimeout(() => done(null), 5000);
  });
}

/** Format a number of seconds as "m:ss". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
