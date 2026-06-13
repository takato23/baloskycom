import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, Upload, Star, StarOff, Eye, EyeOff, Lock, Unlock, Download,
  LayoutGrid, List, X, CheckSquare, Square, UploadCloud, Loader2, Check, Tag,
  ArrowUp, ArrowDown, Camera, Film, Image as ImageIcon, Mail, Music, Share2, Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/services/api';
import { Media, MediaKind, Social, NewsletterSubscriber } from '@/types';
import { Modal } from '@/components/Modal';
import { parseMp3Metadata, readAudioDuration, formatDuration } from '@/lib/mp3Metadata';
import { parseEmbedUrl } from '@/lib/songEmbed';

type TabKey = 'video_ia' | 'foto' | 'wallpaper' | 'cancion' | 'panorama_360' | 'socials' | 'newsletter';

const TABS: { key: TabKey; label: string; short: string; hint: string; icon: LucideIcon }[] = [
  { key: 'video_ia',     label: 'Videos IA',      short: 'Video',      hint: 'clips, posters y storyboard', icon: Film },
  { key: 'panorama_360', label: 'Panoramas 360°', short: '360',        hint: 'recorridos equirectangulares', icon: Sparkles },
  { key: 'foto',         label: 'Fotos',          short: 'Foto',       hint: 'series y archivo visual', icon: Camera },
  { key: 'wallpaper',    label: 'Wallpapers',     short: 'Pixel',      hint: 'descargas y previews', icon: ImageIcon },
  { key: 'cancion',      label: 'Canciones SUNO', short: 'Sonido',     hint: 'covers, audios y embeds', icon: Music },
  { key: 'socials',      label: 'Redes Sociales', short: 'Redes',      hint: 'links públicos', icon: Share2 },
  { key: 'newsletter',   label: 'Newsletter',     short: 'Mail',       hint: 'suscriptores', icon: Mail },
];

const mediaTabPath: Record<TabKey, string> = {
  video_ia: '/admin/media/videos',
  panorama_360: '/admin/media/panoramas',
  foto: '/admin/media/fotos',
  wallpaper: '/admin/media/wallpapers',
  cancion: '/admin/media/canciones',
  socials: '/admin/media/socials',
  newsletter: '/admin/media/newsletter',
};

const MEDIA_META: Record<MediaKind, {
  title: string;
  eyebrow: string;
  cta: string;
  description: string;
  accent: string;
}> = {
  video_ia: {
    title: 'Videos IA',
    eyebrow: 'clips + storyboard',
    cta: 'Subir video',
    description: 'Cargá el video, poster, prompt y frames de proceso para que cada pieza tenga contexto.',
    accent: 'from-violet-500/28 to-cyan-400/14',
  },
  panorama_360: {
    title: 'Panoramas 360',
    eyebrow: 'mirar alrededor',
    cta: 'Subir panorama 360',
    description: 'Usá imágenes equirectangulares 2:1. Podés destacarlas, ordenarlas, activarlas u ocultarlas sin tocar código.',
    accent: 'from-cyan-400/28 to-emerald-300/14',
  },
  foto: {
    title: 'Fotos',
    eyebrow: 'ojo + archivo',
    cta: 'Subir foto',
    description: 'Series visuales, backstage, cámaras y material que después aparece en el laboratorio público.',
    accent: 'from-orange-400/24 to-pink-400/14',
  },
  wallpaper: {
    title: 'Wallpapers',
    eyebrow: 'pixel + descarga',
    cta: 'Subir wallpaper',
    description: 'Piezas visuales de alta resolución, con thumbnail, estado activo y bloqueo si hace falta.',
    accent: 'from-pink-500/24 to-violet-500/14',
  },
  cancion: {
    title: 'Canciones',
    eyebrow: 'suno + sonido',
    cta: 'Subir canción',
    description: 'Subí MP3, pegá embeds, completá covers y mantené ordenada la biblioteca musical.',
    accent: 'from-amber-300/24 to-red-400/14',
  },
};

type KindConfig = {
  mediaUrlLabel: string;
  accept: string;
  coverLabel: string;
  coverAccept: string;
  categoryLabel: string;
  supportsDuration: boolean;
  supportsLock: boolean;
  /** Default view when opening this tab */
  defaultView: 'list' | 'grid';
  /** True if the primary uploaded file is the image itself (for auto-fill resolution) */
  primaryIsImage: boolean;
};

const KIND_FIELDS: Record<MediaKind, KindConfig> = {
  video_ia:     { mediaUrlLabel: 'Video (URL o subir .mp4)',             accept: 'video/*', coverLabel: 'Poster / thumbnail',           coverAccept: 'image/*', categoryLabel: 'Categoría (ej. FILM · 2026)',       supportsDuration: true,  supportsLock: false, defaultView: 'list', primaryIsImage: false },
  foto:         { mediaUrlLabel: '—',                                     accept: '',        coverLabel: 'Foto (URL o subir)',           coverAccept: 'image/*', categoryLabel: 'Categoría / filtro (ej. ba, sur)',  supportsDuration: false, supportsLock: false, defaultView: 'grid', primaryIsImage: true  },
  wallpaper:    { mediaUrlLabel: 'Archivo alta-res (4K)',                 accept: 'image/*', coverLabel: 'Thumbnail (preview)',          coverAccept: 'image/*', categoryLabel: 'Categoría',                         supportsDuration: false, supportsLock: true,  defaultView: 'grid', primaryIsImage: true  },
  cancion:      { mediaUrlLabel: 'Audio (URL o subir .mp3)',              accept: 'audio/*', coverLabel: 'Cover del track (opcional)',   coverAccept: 'image/*', categoryLabel: 'Género / shelf (ej. Electrónico)',  supportsDuration: true,  supportsLock: false, defaultView: 'list', primaryIsImage: false },
  panorama_360: { mediaUrlLabel: 'Panorama 360 equirectangular 2:1 (JPG/PNG)', accept: 'image/*', coverLabel: 'Thumbnail / vista previa',    coverAccept: 'image/*', categoryLabel: 'Categoría (ej. estudio, viaje)',    supportsDuration: false, supportsLock: false, defaultView: 'grid', primaryIsImage: true  },
};

function emptyMedia(kind: MediaKind): Partial<Media> {
  return {
    kind,
    title: '',
    description: '',
    category: '',
    isMemberOnly: false,
    mediaUrl: '',
    embedUrl: '',
    coverImage: '',
    duration: '',
    aspectRatio: null,
    showDescription: true,
    showPrompt: true,
    showTool: true,
    assetUrls: [],
    isLocked: false,
    active: true,
    featured: false,
    sortOrder: 0,
    publicFrom: null,
  };
}

function assetUrlsToText(urls?: string[] | null): string {
  return Array.isArray(urls) ? urls.join('\n') : '';
}

function textToAssetUrls(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function emptySocial(): Partial<Social> {
  return {
    platform: '',
    name: '',
    handle: '',
    url: '',
    icon: '',
    colorFrom: '#FA5D29',
    colorTo: '#F02E65',
    active: true,
    sortOrder: 0,
  };
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
function filenameToTitle(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')      // drop extension
    .replace(/[-_]+/g, ' ')        // snake/kebab → spaces
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Convierte un ISO UTC en el formato que espera un <input type="datetime-local">
 * (YYYY-MM-DDTHH:mm en hora local del usuario). Devuelve '' si no hay valor.
 */
function toLocalDatetime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function readImageDimensions(file: File): Promise<{ w: number; h: number } | null> {
  if (!file.type.startsWith('image/')) return null;
  if (typeof (window as any).createImageBitmap === 'function') {
    try {
      const bmp = await (window as any).createImageBitmap(file);
      const dims = { w: bmp.width, h: bmp.height };
      try { (bmp as any).close?.(); } catch { /* noop */ }
      return dims;
    } catch { /* fallthrough */ }
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function readVideoMetadata(file: File): Promise<{ w: number; h: number; durationSec: number | null } | null> {
  if (!file.type.startsWith('video/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (value: { w: number; h: number; durationSec: number | null } | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      const durationSec = Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : null;
      done(w && h ? { w, h, durationSec } : null);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

function aspectRatioFromDimensions(w: number, h: number): Media['aspectRatio'] {
  if (!w || !h) return null;
  const ratio = w / h;
  if (Math.abs(ratio - (9 / 16)) < 0.12) return '9:16';
  if (Math.abs(ratio - (16 / 9)) < 0.18) return '16:9';
  if (Math.abs(ratio - 1) < 0.16) return '1:1';
  return ratio < 1 ? '9:16' : '16:9';
}

export default function AdminMedia({ defaultTab = 'video_ia' }: { defaultTab?: TabKey }) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/80 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
        <div className="relative p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.16),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,.16),transparent_34%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Admin · Laboratorio</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white sm:text-6xl">Carga y archivo.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Subí videos IA, panoramas 360, fotos, wallpapers y canciones sin pelearte con una tabla vieja. Todo queda listo para mostrarse como capítulo del sitio.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <a href="/laboratorio" className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white text-sm font-black !text-zinc-950">
                Ver público
              </a>
              <Link
                to={mediaTabPath.panorama_360}
                className="flex min-h-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-100"
              >
                + Panorama 360
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              to={mediaTabPath[t.key]}
              className={
                'group flex min-h-24 flex-col justify-between rounded-[22px] border p-3 text-left transition-colors ' +
                (activeTab === t.key
                ? 'border-white bg-white !text-zinc-950 shadow-[0_18px_60px_rgba(255,255,255,0.09)]'
                  : 'border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/20 hover:bg-zinc-900')
              }
            >
              <span className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{t.short}</span>
              </span>
              <span>
                <span className="block text-sm font-black leading-tight">{t.label}</span>
                <span className="mt-1 block text-[11px] font-medium leading-tight opacity-60">{t.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {activeTab === 'video_ia'     && <MediaPanel kind="video_ia" />}
      {activeTab === 'foto'         && <MediaPanel kind="foto" />}
      {activeTab === 'wallpaper'    && <MediaPanel kind="wallpaper" />}
      {activeTab === 'cancion'      && <MediaPanel kind="cancion" />}
      {activeTab === 'panorama_360' && <MediaPanel kind="panorama_360" />}
      {activeTab === 'socials'      && <SocialsPanel />}
      {activeTab === 'newsletter'   && <NewsletterPanel />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Shared file upload button (single file, URL + Upload)
 * Optional onDims callback: if the uploaded file is an image, reports its dims.
 * ------------------------------------------------------------------------- */
function UploadField({
  label,
  accept,
  value,
  onChange,
  onDims,
  onVideoMeta,
  hint,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  onDims?: (dims: { w: number; h: number } | null) => void;
  onVideoMeta?: (meta: { w: number; h: number; durationSec: number | null } | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [storage, setStorage] = useState<string>('');
  const [err, setErr] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    setErr('');
    try {
      const dimsPromise = file.type.startsWith('image/') ? readImageDimensions(file) : Promise.resolve(null);
      const videoMetaPromise = file.type.startsWith('video/') ? readVideoMetadata(file) : Promise.resolve(null);
      const [res, dims, videoMeta] = await Promise.all([api.uploadFile(file), dimsPromise, videoMetaPromise]);
      onChange(res.url);
      setStorage(res.storage || '');
      if (onDims) onDims(dims);
      if (onVideoMeta) onVideoMeta(videoMeta);
    } catch (e: any) {
      setErr(e?.message || 'Error al subir');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL o subí un archivo →"
          className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 text-zinc-900 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !accept}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-[var(--accent,#FA5D29)] rounded-lg transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Subiendo...' : 'Subir'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept || undefined}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      {value && (
        <p className="text-[11px] text-zinc-600 truncate" title={value}>
          ✓ {storage ? `${storage.toUpperCase()} · ` : ''}{value}
        </p>
      )}
    </div>
  );
}

function AssetUploadField({
  urls,
  onChange,
  title = 'Assets visuales',
  description = 'Subí frames, posters o referencias. Se suman a la lista de URLs de abajo.',
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  title?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const addUrls = (next: string[]) => {
    const merged = Array.from(new Set([...urls, ...next].map((u) => u.trim()).filter(Boolean)));
    onChange(merged);
  };

  const removeUrl = (url: string) => {
    onChange(urls.filter((u) => u !== url));
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    setUploading(true);
    setErr('');
    try {
      const uploaded = await Promise.all(arr.map((file) => api.uploadFile(file)));
      addUrls(uploaded.map((u) => u.url));
    } catch (e: any) {
      setErr(e?.message || 'Error al subir assets');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500">
            {title}
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent,#FA5D29)] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Subiendo...' : 'Subir assets'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length) handleFiles(files);
          }}
        />
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      {urls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {urls.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Quitar asset"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * EmbedUrlField — Spotify / YouTube / Apple Music link with live platform
 * detection. Pasting a recognised URL shows a green chip so the editor knows
 * the embed will actually render; an unrecognised URL shows a warning.
 * ------------------------------------------------------------------------- */
function EmbedUrlField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const trimmed = value.trim();
  const info = trimmed ? parseEmbedUrl(trimmed) : null;
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
        Embed externo (Spotify / YouTube / Apple Music)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://open.spotify.com/track/... · https://youtu.be/... · https://music.apple.com/..."
        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 text-zinc-900 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
      />
      {trimmed && info && (
        <p className="text-[11px] text-emerald-400">
          ✓ Detectado: {info.label}. Se va a mostrar el player de la plataforma (los plays cuentan allá).
        </p>
      )}
      {trimmed && !info && (
        <p className="text-[11px] text-amber-400">
          ⚠ No reconozco este link. Probá con una URL de open.spotify.com, youtube.com/youtu.be, o music.apple.com.
        </p>
      )}
      {!trimmed && (
        <p className="text-[11px] text-zinc-500">
          Opcional. Si lo dejás vacío usamos el MP3 (si hay). Si lo ponés, tiene prioridad sobre el MP3.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Bulk drop zone — drag&drop, click, and paste (clipboard) support
 * Each accepted file becomes a job; on completion, creates a Media row.
 * ------------------------------------------------------------------------- */
type BulkJob = {
  id: string;
  file: File;
  previewUrl: string | null;   // object URL, cleaned up on unmount
  status: 'pending' | 'uploading' | 'creating' | 'done' | 'error';
  progress: number;            // 0..1 (uploadFile doesn't expose progress, so this is fake granularity)
  dims: { w: number; h: number } | null;
  /** Pre-reserved sortOrder so concurrent jobs don't collide on the same number. */
  sortOrder: number;
  mediaUrl?: string;
  createdId?: string;
  error?: string;
};

function BulkDropZone({
  kind,
  onCreated,
  getNextSortOrder,
}: {
  kind: MediaKind;
  onCreated: (m: Media) => void;
  /** Called synchronously when new jobs are queued; returns the next available
   * sortOrder and reserves N slots so concurrent uploads don't collide. */
  getNextSortOrder: (count: number) => number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const config = KIND_FIELDS[kind];

  // Cleanup preview URLs on unmount
  useEffect(() => () => { jobs.forEach(j => { if (j.previewUrl) URL.revokeObjectURL(j.previewUrl); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateJob = (id: string, patch: Partial<BulkJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  };

  const acceptFilter = (f: File): boolean => {
    if (kind === 'foto' || kind === 'wallpaper' || kind === 'panorama_360') return f.type.startsWith('image/');
    if (kind === 'video_ia') return f.type.startsWith('video/') || f.type.startsWith('image/'); // allow poster images here too
    if (kind === 'cancion') return f.type.startsWith('audio/') || f.type.startsWith('image/');
    return true;
  };

  const runJob = useCallback(async (job: BulkJob) => {
    try {
      updateJob(job.id, { status: 'uploading', progress: 0.1 });

      const isAudio = job.file.type.startsWith('audio/') || /\.(mp3|m4a|wav|flac)$/i.test(job.file.name);

      // For MP3s, try to pull ID3 metadata (cover, title, duration) BEFORE we
      // commit the row — Suno MP3s have APIC cover art and TIT2 title.
      const metaPromise: Promise<import('@/lib/mp3Metadata').Mp3Metadata> =
        (kind === 'cancion' && isAudio)
          ? parseMp3Metadata(job.file).catch((err) => {
              console.warn('[bulk upload] id3 parse failed', err);
              return {};
            })
          : Promise.resolve({});

      const dimsPromise = job.file.type.startsWith('image/') ? readImageDimensions(job.file) : Promise.resolve(null);
      const videoMetaPromise = job.file.type.startsWith('video/') ? readVideoMetadata(job.file) : Promise.resolve(null);

      const [up, dims, videoMeta, meta] = await Promise.all([
        api.uploadFile(job.file),
        dimsPromise,
        videoMetaPromise,
        metaPromise,
      ]);
      const detectedDims = dims || (videoMeta ? { w: videoMeta.w, h: videoMeta.h } : null);
      updateJob(job.id, { status: 'creating', progress: 0.7, mediaUrl: up.url, dims: detectedDims });

      const fallbackTitle = filenameToTitle(job.file.name);
      const title = (kind === 'cancion' && meta.title) ? meta.title : fallbackTitle;
      const description = (kind === 'cancion' && meta.artist)
        ? meta.artist
        : (dims ? `${dims.w}×${dims.h}` : '');

      const base: Partial<Media> = {
        kind,
        title,
        description,
        category: '',
        isMemberOnly: false,
        mediaUrl: up.url,
        coverImage: up.url,
        aspectRatio: null,
        showDescription: true,
        showPrompt: true,
        showTool: true,
        assetUrls: [],
        isLocked: false,
        active: true,
        featured: false,
        sortOrder: job.sortOrder,
      };

      // Kind-specific tweaks
      if (kind === 'foto') {
        base.mediaUrl = up.url;
        base.coverImage = up.url;
      } else if (kind === 'video_ia') {
        // If a video was uploaded, we don't have a poster yet; leave cover blank.
        if (job.file.type.startsWith('video/')) {
          base.coverImage = '';
          if (videoMeta) {
            base.aspectRatio = aspectRatioFromDimensions(videoMeta.w, videoMeta.h);
            if (videoMeta.durationSec != null) base.duration = formatDuration(videoMeta.durationSec);
            if (!base.description) base.description = `${videoMeta.w}×${videoMeta.h}`;
          }
        }
      } else if (kind === 'cancion') {
        // Audio: start with no cover, then fill in from ID3 if we found one.
        base.coverImage = '';

        // Upload embedded APIC cover art as a separate image file and point
        // coverImage at the resulting URL. If the upload fails we just fall
        // back to the empty cover — the user can still edit it by hand.
        if (isAudio && meta.cover) {
          const ext = /png/i.test(meta.cover.mime) ? 'png'
                    : /webp/i.test(meta.cover.mime) ? 'webp'
                    : 'jpg';
          const baseName = job.file.name.replace(/\.[^.]+$/, '');
          try {
            const coverFile = new File(
              [meta.cover.blob],
              `${baseName}-cover.${ext}`,
              { type: meta.cover.mime || 'image/jpeg' },
            );
            const coverUp = await api.uploadFile(coverFile);
            base.coverImage = coverUp.url;
          } catch (err) {
            console.warn('[bulk upload] cover upload failed', err);
          }
        }

        // Duration: prefer ID3 TLEN, otherwise read via <audio>.
        if (isAudio) {
          let durSec = meta.durationSec ?? null;
          if (durSec == null) {
            durSec = await readAudioDuration(job.file);
          }
          if (durSec != null) base.duration = formatDuration(durSec);
        }
      }

      const created = await api.createMedia(base);
      onCreated(created);
      updateJob(job.id, { status: 'done', progress: 1, createdId: created.id });
    } catch (e: any) {
      console.error('[bulk upload] job failed', job.file.name, e);
      updateJob(job.id, { status: 'error', error: e?.message || 'Error' });
    }
  }, [kind, onCreated]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(acceptFilter);
    if (!arr.length) return;
    // Reserve a contiguous sortOrder range up-front so parallel jobs don't
    // stomp on each other by reading the same "max" before any have committed.
    const firstSort = getNextSortOrder(arr.length);
    const newJobs: BulkJob[] = arr.map((file, i) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
      progress: 0,
      dims: null,
      sortOrder: firstSort + i,
    }));
    setJobs(prev => [...prev, ...newJobs]);
    // Kick off uploads (limited concurrency of 3)
    const CONCURRENCY = 3;
    let idx = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, newJobs.length) }, async () => {
      while (idx < newJobs.length) {
        const j = newJobs[idx++];
        await runJob(j);
      }
    });
    Promise.all(workers); // fire-and-forget
  }, [runJob, getNextSortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag & drop handlers
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer?.items?.length) setIsDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.target === zoneRef.current) setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  // Paste from clipboard (images only, globally while panel is visible)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.files?.length) return;
      const files = Array.from(e.clipboardData.files).filter(acceptFilter);
      if (!files.length) return;
      addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearDone = () => {
    setJobs(prev => {
      prev.filter(j => j.status === 'done' || j.status === 'error').forEach(j => {
        if (j.previewUrl) URL.revokeObjectURL(j.previewUrl);
      });
      return prev.filter(j => j.status !== 'done' && j.status !== 'error');
    });
  };

  const allDone = jobs.length > 0 && jobs.every(j => j.status === 'done' || j.status === 'error');
  const doneCount = jobs.filter(j => j.status === 'done').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;

  return (
    <div className="space-y-3">
      <div
        ref={zoneRef}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ' +
          (isDragging
            ? 'border-violet-500 bg-violet-500/10 text-violet-200'
            : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900')
        }
      >
        <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-70" />
        <p className="text-sm font-medium text-zinc-200">
          Arrastrá archivos acá, o <span className="text-violet-400 underline">elegilos</span>
        </p>
        <p className="text-[11px] text-zinc-500 mt-1">
          También podés pegar con <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">⌘V</kbd> una imagen del portapapeles.
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">
          {kind === 'foto' || kind === 'wallpaper'
            ? 'Imágenes JPG / PNG / WebP / AVIF'
            : kind === 'panorama_360'
              ? 'Panorama equirectangular 2:1 JPG / PNG (ej. 6000×3000)'
              : kind === 'video_ia'
                ? 'Videos MP4/WebM o imágenes como poster'
                : 'Audio MP3/WAV o una imagen como cover'}
          {' · hasta 200 MB por archivo · sin compresión automática · subidas en paralelo'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={config.accept || undefined}
          className="hidden"
          onChange={(e) => { const fs = e.target.files; if (fs?.length) addFiles(fs); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        />
      </div>

      {jobs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 text-xs text-zinc-400">
            <span>
              {jobs.length} {jobs.length === 1 ? 'archivo' : 'archivos'} · {doneCount} listos
              {errorCount > 0 && <span className="text-red-400"> · {errorCount} error{errorCount === 1 ? '' : 'es'}</span>}
            </span>
            {allDone && (
              <button onClick={clearDone} className="text-zinc-500 hover:text-zinc-200">
                Limpiar
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center gap-3 px-4 py-2.5">
                {j.previewUrl ? (
                  <img src={j.previewUrl} alt="" className="w-10 h-10 rounded object-cover border border-zinc-800 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-zinc-800 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{j.file.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {(j.file.size / (1024 * 1024)).toFixed(1)} MB
                    {j.dims ? ` · ${j.dims.w}×${j.dims.h}` : ''}
                    {j.error ? <span className="text-red-400"> · {j.error}</span> : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 flex-shrink-0">
                  {j.status === 'done' && <span className="flex items-center gap-1 text-emerald-400"><Check className="w-4 h-4" /> listo</span>}
                  {j.status === 'error' && <span className="text-red-400">error</span>}
                  {(j.status === 'uploading' || j.status === 'creating' || j.status === 'pending') && (
                    <span className="flex items-center gap-1 text-violet-300"><Loader2 className="w-4 h-4 animate-spin" /> {j.status === 'uploading' ? 'subiendo' : j.status === 'creating' ? 'creando' : 'en cola'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Selection bar — batch actions on selected media rows
 * ------------------------------------------------------------------------- */
const CATEGORY_SUGGESTIONS: Record<MediaKind, string[]> = {
  wallpaper:    ['paisaje', 'ciudad', 'edificio', 'interior', 'retrato', 'objeto', 'abstracto', 'otros'],
  foto:         ['paisaje', 'ciudad', 'retrato', 'backstage', 'ba', 'viaje', 'otros'],
  video_ia:     ['FILM · 2026', 'short', 'visual', 'promo'],
  cancion:      ['Electrónico', 'Pop', 'Indie', 'Ambient', 'Colab'],
  panorama_360: ['estudio', 'casa', 'ba', 'viaje', 'backstage', 'naturaleza', 'otros'],
};

function SelectionBar({
  count,
  kind,
  fields,
  onClear,
  onBatch,
  onDelete,
}: {
  count: number;
  kind: MediaKind;
  fields: KindConfig;
  onClear: () => void;
  onBatch: (patch: Partial<Media>) => void;
  onDelete: () => void;
}) {
  const [catOpen, setCatOpen] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const suggestions = CATEGORY_SUGGESTIONS[kind] || [];

  const applyCategory = (value: string) => {
    onBatch({ category: value });
    setCatOpen(false);
    setCustomCat('');
  };

  return (
    <div className="sticky top-20 z-10 flex flex-wrap items-center gap-2 bg-violet-950/80 backdrop-blur border border-violet-500/40 text-violet-100 rounded-xl px-3 py-2 text-sm">
      <span className="font-medium">{count} seleccionado{count === 1 ? '' : 's'}</span>
      <div className="flex-1" />
      <button onClick={() => onBatch({ active: true })}   className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Eye className="w-4 h-4" />Activar</button>
      <button onClick={() => onBatch({ active: false })}  className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><EyeOff className="w-4 h-4" />Ocultar</button>
      <button onClick={() => onBatch({ isMemberOnly: true })} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Lock className="w-4 h-4" />Sólo miembros</button>
      <button onClick={() => onBatch({ isMemberOnly: false })} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Unlock className="w-4 h-4" />Público</button>
      <button onClick={() => onBatch({ featured: true })} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Star className="w-4 h-4" />Destacar</button>
      <button onClick={() => onBatch({ featured: false })} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><StarOff className="w-4 h-4" />Quitar ★</button>
      <div className="relative">
        <button
          onClick={() => setCatOpen(v => !v)}
          className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"
        >
          <Tag className="w-4 h-4" />Categoría
        </button>
        {catOpen && (
          <div className="absolute right-0 mt-2 w-60 bg-zinc-950 border border-violet-500/40 rounded-xl shadow-2xl p-2 z-20">
            <div className="text-[10px] uppercase tracking-wider text-violet-300 px-2 pt-1 pb-1">Preset</div>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => applyCategory(s)}
                  className="px-2 py-1 text-xs rounded-md bg-violet-900/40 hover:bg-violet-700 text-violet-100"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="border-t border-violet-500/20 pt-2 px-1 flex gap-1">
              <input
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customCat.trim()) applyCategory(customCat.trim()); }}
                placeholder="Custom…"
                className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500"
              />
              <button
                onClick={() => customCat.trim() && applyCategory(customCat.trim())}
                className="px-2 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-500 text-white"
              >OK</button>
            </div>
            <button
              onClick={() => applyCategory('')}
              className="w-full mt-2 px-2 py-1 text-xs rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            >Vaciar categoría</button>
          </div>
        )}
      </div>
      {fields.supportsLock && (
        <>
          <button onClick={() => onBatch({ isLocked: true })}  className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Lock className="w-4 h-4" />Lockear</button>
          <button onClick={() => onBatch({ isLocked: false })} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60 flex items-center gap-1"><Unlock className="w-4 h-4" />Liberar</button>
        </>
      )}
      <button onClick={onDelete} className="px-2.5 py-1 rounded-md hover:bg-red-900/70 bg-red-900/40 text-red-200 flex items-center gap-1"><Trash2 className="w-4 h-4" />Borrar</button>
      <button onClick={onClear} className="px-2.5 py-1 rounded-md hover:bg-violet-900/60"><X className="w-4 h-4" /></button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * MediaPanel — CRUD for video_ia, foto, wallpaper, cancion
 * ------------------------------------------------------------------------- */
function MediaPanel({ kind }: { kind: MediaKind }) {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Media> | null>(null);
  const fields = KIND_FIELDS[kind];
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(fields.defaultView);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [backfilling, setBackfilling] = useState(false);
  // Auto-cover in-modal: loading state mientras consultamos Spotify/YT/Apple.
  const [resolvingCover, setResolvingCover] = useState(false);
  const [coverResolveNote, setCoverResolveNote] = useState<string>('');
  const meta = MEDIA_META[kind];

  const load = async () => {
    setLoading(true);
    try {
      const rows = await api.getAdminMedia(kind);
      setItems(rows);
    } catch (e) {
      console.error('[admin/media] load', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setViewMode(fields.defaultView);
    setShowUploader(false);
    setSelectedIds(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  /**
   * Pick the next unused sortOrder (max + 1). Used both by the "Nuevo" modal
   * and the bulk uploader so new ítems always queue up at the end of the list.
   * For bulk uploads we also reserve a contiguous range to avoid collisions
   * between concurrent jobs.
   */
  const itemsRef = useRef<Media[]>(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const sortReservationRef = useRef(0);
  const getNextSortOrder = useCallback((count: number = 1): number => {
    const currentMax = itemsRef.current.reduce(
      (acc, it) => Math.max(acc, it.sortOrder || 0), 0,
    );
    const base = Math.max(currentMax, sortReservationRef.current) + 1;
    sortReservationRef.current = base + count - 1;
    return base;
  }, []);

  const openNew = () => {
    setEditing({ ...emptyMedia(kind), sortOrder: getNextSortOrder(1) });
    setCoverResolveNote('');
    setModalOpen(true);
  };
  const openEdit = (m: Media) => {
    setEditing(m);
    setCoverResolveNote('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      if (editing.id) {
        const updated = await api.updateMedia(editing.id, editing);
        setItems(items.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await api.createMedia(editing);
        setItems([...items, created]);
      }
      setModalOpen(false); setEditing(null);
    } catch (e) {
      console.error('[admin/media] save', e);
      alert('Error al guardar. Revisá la consola.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este ítem?')) return;
    try {
      await api.deleteMedia(id);
      setItems(items.filter(x => x.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      console.error('[admin/media] delete', e);
    }
  };

  const toggle = async (m: Media, patch: Partial<Media>) => {
    try {
      const updated = await api.updateMedia(m.id, patch);
      setItems(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch (e) {
      console.error('[admin/media] toggle', e);
    }
  };

  const handleBulkCreated = useCallback((created: Media) => {
    setItems(prev => [...prev, created]);
  }, []);

  /**
   * Corre el endpoint de backfill para canciones sin cover. Rellena los
   * coverImage de los tracks que tengan URL de YouTube/Spotify/Apple Music
   * y no tengan portada cargada. Pensado para un click del admin.
   */
  const handleBackfillCovers = async () => {
    if (!window.confirm('¿Intentar rellenar las portadas de las canciones que no tienen? Usa YouTube/Spotify/Apple Music como fuente.')) return;
    setBackfilling(true);
    try {
      const result = await api.backfillMediaCovers();
      // Recargamos para ver los covers nuevos.
      await load();
      const failedCount = result.failures.length;
      if (failedCount === 0) {
        alert(`Listo. ${result.updated} de ${result.scanned} canciones ya tienen cover.`);
      } else {
        const preview = result.failures
          .slice(0, 5)
          .map((f) => `· ${f.title} (${f.reason})`)
          .join('\n');
        alert(
          `Actualizadas: ${result.updated}\nSin resolver: ${failedCount}\n\n${preview}${failedCount > 5 ? '\n…' : ''}`,
        );
      }
    } catch (e) {
      console.error('[admin/media] backfill covers', e);
      alert('Error al rellenar covers. Revisá la consola.');
    } finally {
      setBackfilling(false);
    }
  };

  /**
   * Auto-rellena `coverImage` del ítem en edición usando el URL de embed /
   * mediaUrl actual. Llama al endpoint `/media/resolve-cover` que conoce
   * YouTube / Spotify / Apple Music.
   */
  const handleResolveCoverFromUrl = async () => {
    if (!editing) return;
    const candidate = (editing.embedUrl || editing.mediaUrl || '').trim();
    if (!candidate) {
      setCoverResolveNote('Primero pegá el URL de YouTube/Spotify/Apple.');
      return;
    }
    setResolvingCover(true);
    setCoverResolveNote('');
    try {
      const result = await api.resolveMediaCover(candidate);
      if (result.coverUrl) {
        setEditing((prev) => (prev ? { ...prev, coverImage: result.coverUrl! } : prev));
        setCoverResolveNote(`✓ Cover de ${result.platform} aplicado.`);
      } else {
        setCoverResolveNote(`No pude encontrar cover desde ${result.platform}.`);
      }
    } catch (e) {
      console.error('[admin/media] resolve cover', e);
      setCoverResolveNote('Error al resolver. Probá de nuevo.');
    } finally {
      setResolvingCover(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map(i => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatch = async (patch: Partial<Media>) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const results = await Promise.allSettled(ids.map(id => api.updateMedia(id, patch)));
    const updatedById = new Map<string, Media>();
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') updatedById.set(ids[i], r.value);
    });
    setItems(prev => prev.map(x => updatedById.get(x.id) || x));
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures) alert(`${failures} fallaron. El resto se actualizó.`);
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!window.confirm(`¿Eliminar ${ids.length} ítem${ids.length === 1 ? '' : 's'}? No se puede deshacer.`)) return;
    const results = await Promise.allSettled(ids.map(id => api.deleteMedia(id)));
    const okIds = new Set(ids.filter((_, i) => results[i].status === 'fulfilled'));
    setItems(prev => prev.filter(x => !okIds.has(x.id)));
    clearSelection();
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures) alert(`${failures} no se pudieron borrar.`);
  };

  const sortedItems = useMemo(() => {
    return items.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [items]);

  /**
   * Swap sortOrder with the neighbor above/below in the currently-sorted list.
   * We update state optimistically so the row visibly jumps, then fire two
   * API calls. If either fails we reload to re-sync with the server.
   */
  const handleMove = async (m: Media, direction: 'up' | 'down') => {
    const idx = sortedItems.findIndex(x => x.id === m.id);
    if (idx < 0) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sortedItems.length) return;
    const neighbor = sortedItems[neighborIdx];
    const a = m.sortOrder || 0;
    const b = neighbor.sortOrder || 0;
    // If both happen to share the same sortOrder (legacy data), force a gap.
    const newA = a === b ? (direction === 'up' ? b - 1 : b + 1) : b;
    const newB = a === b ? a : a;
    // Optimistic UI
    setItems(prev => prev.map(x =>
      x.id === m.id ? { ...x, sortOrder: newA } :
      x.id === neighbor.id ? { ...x, sortOrder: newB } :
      x
    ));
    try {
      await Promise.all([
        api.updateMedia(m.id, { sortOrder: newA }),
        api.updateMedia(neighbor.id, { sortOrder: newB }),
      ]);
    } catch (e) {
      console.error('[admin/media] reorder failed', e);
      load(); // fall back to server state
    }
  };

  const persistOrder = async (nextItems: Media[]) => {
    setItems(nextItems);
    try {
      await Promise.all(
        nextItems.map((item, index) => (
          item.sortOrder === index + 1
            ? Promise.resolve(item)
            : api.updateMedia(item.id, { sortOrder: index + 1 })
        )),
      );
      await load();
    } catch (e) {
      console.error('[admin/media] bulk reorder failed', e);
      alert('No pude guardar todo el orden. Recargo para sincronizar.');
      load();
    }
  };

  const handleLatestFirst = async () => {
    const next = items
      .slice()
      .sort((a, b) => {
        const bt = new Date(b.createdAt || 0).getTime();
        const at = new Date(a.createdAt || 0).getTime();
        return bt - at;
      })
      .map((item, index) => ({ ...item, sortOrder: index + 1 }));
    await persistOrder(next);
  };

  const handleNormalizeOrder = async () => {
    const next = sortedItems.map((item, index) => ({ ...item, sortOrder: index + 1 }));
    await persistOrder(next);
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/70 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
        <div className={`bg-gradient-to-br ${meta.accent} p-4 sm:p-5`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">{meta.eyebrow}</p>
              <h3 className="mt-1 text-3xl font-black tracking-[-0.07em] text-white sm:text-5xl">{meta.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{meta.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
                <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1">
                  {loading ? 'Cargando...' : `${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`}
                </span>
                {kind === 'panorama_360' && (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                    Recomendado: imagen 2:1
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
              <button
                onClick={openNew}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black !text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4" />
                {meta.cta}
              </button>
              <button
                onClick={() => setShowUploader(v => !v)}
                className={
                  'flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition-colors ' +
                  (showUploader
                    ? 'border-cyan-300/40 bg-cyan-300/12 text-cyan-100'
                    : 'border-white/10 bg-black/24 text-zinc-200 hover:border-white/20')
                }
              >
                <UploadCloud className="h-4 w-4" />
                {showUploader ? 'Cerrar carga masiva' : 'Subir varios'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-zinc-950/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {items.length > 0 && (
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 px-3 text-xs font-black text-zinc-400 hover:text-zinc-100"
              title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            >
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-11 items-center rounded-2xl border border-white/10 bg-black/24 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={'grid h-9 w-10 place-items-center rounded-xl ' + (viewMode === 'list' ? 'bg-white !text-zinc-950' : 'text-zinc-500 hover:text-zinc-200')}
              title="Vista lista"
            ><List className="w-4 h-4" /></button>
            <button
              onClick={() => setViewMode('grid')}
              className={'grid h-9 w-10 place-items-center rounded-xl ' + (viewMode === 'grid' ? 'bg-white !text-zinc-950' : 'text-zinc-500 hover:text-zinc-200')}
              title="Vista grid"
            ><LayoutGrid className="w-4 h-4" /></button>
          </div>
          {kind === 'cancion' && (
            <button
              onClick={handleBackfillCovers}
              disabled={backfilling}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/24 px-3 text-sm font-black text-zinc-300 transition-colors hover:text-white disabled:opacity-50"
              title="Busca cover en YouTube/Spotify/Apple Music para todas las canciones sin portada"
            >
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {backfilling ? 'Rellenando covers…' : 'Rellenar covers faltantes'}
            </button>
          )}
          {kind === 'panorama_360' && items.length > 1 && (
            <>
              <button
                onClick={handleLatestFirst}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/18"
                title="Pone primero las escenas más nuevas que acabás de subir"
              >
                <ArrowUp className="w-4 h-4" />
                Últimas arriba
              </button>
              <button
                onClick={handleNormalizeOrder}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/24 px-3 text-sm font-black text-zinc-300 transition-colors hover:text-white"
                title="Reescribe el orden como 1, 2, 3... respetando la vista actual"
              >
                <List className="w-4 h-4" />
                Orden limpio
              </button>
            </>
          )}
        </div>
      </div>

      {showUploader && <BulkDropZone kind={kind} onCreated={handleBulkCreated} getNextSortOrder={getNextSortOrder} />}

      {selectedIds.size > 0 && (
        <SelectionBar
          count={selectedIds.size}
          kind={kind}
          fields={fields}
          onClear={clearSelection}
          onBatch={handleBatch}
          onDelete={handleBatchDelete}
        />
      )}

      {loading ? (
        <div className="rounded-[24px] border border-white/10 bg-zinc-950/70 p-8 text-sm text-zinc-500">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/15 bg-zinc-950/70 p-8 text-center text-zinc-500 sm:p-12">
          <Sparkles className="mx-auto mb-3 h-7 w-7 text-zinc-600" />
          <p className="text-lg font-black tracking-[-0.03em] text-zinc-200">Todavía no hay {meta.title.toLowerCase()}.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6">
            Usá "{meta.cta}" para crear uno a mano o activá "Subir varios" para cargar una tanda desde el celular o la compu.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedItems.map((m, i) => (
            <GridTile
              key={m.id}
              m={m}
              selected={selectedIds.has(m.id)}
              onToggleSelect={() => toggleSelect(m.id)}
              onEdit={() => openEdit(m)}
              onDelete={() => handleDelete(m.id)}
              onToggle={(patch) => toggle(m, patch)}
              onMoveUp={i > 0 ? () => handleMove(m, 'up') : undefined}
              onMoveDown={i < sortedItems.length - 1 ? () => handleMove(m, 'down') : undefined}
              showLock={fields.supportsLock}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedItems.map((m, i) => (
            <ListRow
              key={m.id}
              m={m}
              selected={selectedIds.has(m.id)}
              onToggleSelect={() => toggleSelect(m.id)}
              onEdit={() => openEdit(m)}
              onDelete={() => handleDelete(m.id)}
              onToggle={(patch) => toggle(m, patch)}
              onMoveUp={i > 0 ? () => handleMove(m, 'up') : undefined}
              onMoveDown={i < sortedItems.length - 1 ? () => handleMove(m, 'down') : undefined}
              showLock={fields.supportsLock}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? (editing.title || 'Editar') : 'Nuevo ítem'}
        eyebrow={editing?.id ? `media · ${editing.kind || kind}` : `nuevo · ${kind}`}
        size="2xl"
      >
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Título</label>
              <input
                type="text"
                required
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">{fields.categoryLabel}</label>
              <input
                type="text"
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                list={kind === 'cancion' ? 'cancion-categories' : undefined}
              />
              {/* Suggested categories surface in an autocomplete picker so the
                  admin doesn't have to spell the same bucket five different
                  ways. Browsers still allow free-form input. */}
              {kind === 'cancion' && (
                <datalist id="cancion-categories">
                  <option value="Electrónica" />
                  <option value="Música Temática" />
                  <option value="Temas Propios" />
                </datalist>
              )}
            </div>
            {kind !== 'foto' && (
              <UploadField
                label={fields.mediaUrlLabel}
                accept={fields.accept}
                value={editing.mediaUrl || ''}
                onChange={(url) => setEditing({
                  ...editing,
                  mediaUrl: url,
                  ...(kind === 'panorama_360' && !editing.coverImage ? { coverImage: url } : {}),
                })}
                onDims={(dims) => {
                  if (!dims) return;
                  if ((kind === 'wallpaper') && !editing.description) {
                    setEditing(prev => prev ? { ...prev, description: `${dims.w}×${dims.h}` } : prev);
                  }
                  if ((kind === 'panorama_360') && !editing.description) {
                    setEditing(prev => prev ? { ...prev, description: `${dims.w}×${dims.h} · equirectangular 360` } : prev);
                  }
                }}
                onVideoMeta={(meta) => {
                  if (!meta || kind !== 'video_ia') return;
                  setEditing(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      aspectRatio: prev.aspectRatio || aspectRatioFromDimensions(meta.w, meta.h),
                      duration: prev.duration || (meta.durationSec != null ? formatDuration(meta.durationSec) : prev.duration),
                      description: prev.description || `${meta.w}×${meta.h}`,
                    };
                  });
                }}
                hint={kind === 'video_ia'
                  ? 'La subida guarda el archivo tal cual. Detecto ratio/duración, pero no lo comprimo ni le bajo calidad automáticamente.'
                  : kind === 'panorama_360'
                    ? 'Usá una imagen 2:1. Ejemplo: 6000×3000, 4096×2048 o similar. Si no cargás thumbnail aparte, uso esta misma imagen como preview.'
                  : undefined}
              />
            )}
            {kind === 'cancion' && (
              <EmbedUrlField
                value={editing.embedUrl || ''}
                onChange={(v) => setEditing({ ...editing, embedUrl: v })}
              />
            )}
            <UploadField
              label={fields.coverLabel}
              accept={fields.coverAccept}
              value={editing.coverImage || ''}
              onChange={(url) => setEditing({ ...editing, coverImage: url, ...(kind === 'foto' ? { mediaUrl: url } : {}) })}
              onDims={(dims) => {
                if (!dims) return;
                if (kind === 'foto' && !editing.description) {
                  setEditing(prev => prev ? { ...prev, description: `${dims.w}×${dims.h}` } : prev);
                }
              }}
              hint={kind === 'foto' ? 'La foto se usa como cover y como full-size.' : undefined}
            />
            {kind === 'cancion' && (
              <div className="flex flex-wrap items-center gap-2 -mt-1">
                <button
                  type="button"
                  onClick={handleResolveCoverFromUrl}
                  disabled={resolvingCover}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                  title="Busca la portada en YouTube/Spotify/Apple Music a partir del URL"
                >
                  {resolvingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {resolvingCover ? 'Buscando…' : 'Obtener cover desde URL'}
                </button>
                {coverResolveNote && (
                  <span className={
                    'text-[11px] ' + (coverResolveNote.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600')
                  }>
                    {coverResolveNote}
                  </span>
                )}
              </div>
            )}
            <div>
              <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Descripción</label>
              <textarea
                rows={2}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
              />
            </div>
            {kind === 'video_ia' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
                    Herramienta IA
                  </label>
                  <input
                    type="text"
                    placeholder="Sora · Veo 3 · Runway Gen-3 · Kling"
                    value={editing.aiTool || ''}
                    onChange={(e) => setEditing({ ...editing, aiTool: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                    list="ai-tool-suggestions"
                  />
                  <datalist id="ai-tool-suggestions">
                    <option value="Sora" />
                    <option value="Veo 3" />
                    <option value="Runway Gen-3" />
                    <option value="Kling" />
                    <option value="Pika" />
                    <option value="Luma Dream Machine" />
                    <option value="Hailuo" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
                    Resultado (se muestra en /productora)
                  </label>
                  <input
                    type="text"
                    placeholder="2.1M views · hecho en 5 días"
                    maxLength={80}
                    value={editing.resultNote || ''}
                    onChange={(e) => setEditing({ ...editing, resultNote: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
                    Prompt
                  </label>
                  <textarea
                    rows={3}
                    placeholder="El prompt que usaste para generar el video — se muestra en /laboratorio"
                    value={editing.aiPrompt || ''}
                    onChange={(e) => setEditing({ ...editing, aiPrompt: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
                    Assets usados
                  </label>
                  <AssetUploadField
                    urls={editing.assetUrls || []}
                    onChange={(urls) => setEditing({ ...editing, assetUrls: urls })}
                    title="Storyboard / frames del video"
                    description="Subí frames, bocetos, referencias o pasos de generación. En /laboratorio se ven como rail de proceso."
                  />
                  <textarea
                    rows={3}
                    placeholder="También podés pegar URLs manualmente, una por línea."
                    value={assetUrlsToText(editing.assetUrls)}
                    onChange={(e) => setEditing({ ...editing, assetUrls: textToAssetUrls(e.target.value) })}
                    className="mt-3 w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 leading-snug">
                    Se muestran en /laboratorio como muro en desktop y carrusel horizontal en mobile.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">
                    Aspecto
                  </label>
                  <select
                    value={editing.aspectRatio || ''}
                    onChange={(e) => setEditing({ ...editing, aspectRatio: (e.target.value || null) as any })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors"
                  >
                    <option value="">Auto (default 9:16)</option>
                    <option value="9:16">9:16 · Vertical (Reels/TikTok)</option>
                    <option value="16:9">16:9 · Horizontal (YouTube)</option>
                    <option value="1:1">1:1 · Cuadrado</option>
                  </select>
                  <p className="mt-1 text-[11px] text-zinc-500 leading-snug">
                    Si todos los videos visibles comparten un aspecto la grilla lo usa. Si hay mezcla, cae a 1:1 para que nada se recorte.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2.5">
                  <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500">
                    Qué mostrar públicamente
                  </div>
                  <label className="flex items-center gap-2.5 text-sm text-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editing.showTool !== false}
                      onChange={(e) => setEditing({ ...editing, showTool: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                    />
                    Herramienta IA <span className="text-zinc-400">· chip en la card</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editing.showDescription !== false}
                      onChange={(e) => setEditing({ ...editing, showDescription: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                    />
                    Descripción <span className="text-zinc-400">· en el modal</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-zinc-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editing.showPrompt !== false}
                      onChange={(e) => setEditing({ ...editing, showPrompt: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                    />
                    Prompt <span className="text-zinc-400">· en el modal</span>
                  </label>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              {fields.supportsDuration && (
                <div>
                  <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Duración</label>
                  <input
                    type="text"
                    placeholder={kind === 'cancion' ? '3:42' : '0:24 · GEN-3'}
                    value={editing.duration || ''}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Orden</label>
                <input
                  type="number"
                  value={editing.sortOrder ?? 0}
                  onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-3">
              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                />
                Visible
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editing.featured}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                />
                Destacado
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editing.isMemberOnly}
                  onChange={(e) => setEditing({ ...editing, isMemberOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                />
                Sólo miembros <span className="text-zinc-400">· oculto en el público</span>
              </label>
              {fields.supportsLock && (
                <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!editing.isLocked}
                    onChange={(e) => setEditing({ ...editing, isLocked: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-[var(--accent,#FA5D29)] focus:ring-[var(--accent,#FA5D29)]/30"
                  />
                  Lockeado <span className="text-zinc-400">· paywall</span>
                </label>
              )}
            </div>

            {/* Early-drop: ventana en la que el contenido sólo lo ven Baloskiers.
                Cuando pasa la fecha, se libera para todos automáticamente.
                Guardamos como ISO UTC; el input datetime-local es local. */}
            <div className="space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <label className="block text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                Early drop (sólo Baloskiers hasta)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={toLocalDatetime(editing.publicFrom)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditing({ ...editing, publicFrom: v ? new Date(v).toISOString() : null });
                  }}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/30"
                />
                {editing.publicFrom && (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, publicFrom: null })}
                    className="px-2.5 py-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Si ponés una fecha, el ítem queda como <b>adelanto para Baloskiers</b>: sólo los miembros
                autenticados pueden verlo hasta ese momento. Después se libera al público. Dejá en blanco para comportamiento normal.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-5 border-t border-zinc-100 -mx-7 px-7 -mb-6 pb-6 bg-zinc-50/50">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-[var(--accent,#FA5D29)] rounded-lg transition-colors shadow-sm">
                {editing.id ? 'Guardar cambios' : 'Crear ítem'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Grid tile (thumbnail card)
 * ------------------------------------------------------------------------- */
function GridTile({
  m, selected, onToggleSelect, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, showLock,
}: {
  m: Media;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (patch: Partial<Media>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showLock: boolean;
}) {
  const cover = m.coverImage || m.mediaUrl || '';
  return (
    <div
      className={
        'group relative overflow-hidden rounded-xl bg-zinc-900 border transition-all ' +
        (selected ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-zinc-800 hover:border-zinc-700')
      }
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={
          'absolute top-2 left-2 z-10 w-6 h-6 rounded flex items-center justify-center transition-colors ' +
          (selected ? 'bg-violet-600 text-white' : 'bg-black/60 text-zinc-300 hover:bg-black/80')
        }
        title="Seleccionar"
      >
        {selected ? <Check className="w-4 h-4" /> : <Square className="w-3.5 h-3.5" />}
      </button>

      {/* Thumb */}
      <button onClick={onEdit} className="block w-full aspect-square bg-zinc-950 overflow-hidden text-left">
        {cover ? (
          <img src={cover} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">sin preview</div>
        )}
      </button>

      {/* Badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        {m.featured && <span className="text-[9px] uppercase tracking-wider bg-violet-600 text-white px-1.5 py-0.5 rounded-full">★</span>}
        {m.isMemberOnly && <span className="text-[9px] uppercase tracking-wider bg-fuchsia-700 text-white px-1.5 py-0.5 rounded-full">Miembros</span>}
        {m.isLocked && <span className="text-[9px] uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.5 rounded-full">Lock</span>}
        {m.publicFrom && <span className="text-[9px] uppercase tracking-wider bg-sky-700 text-white px-1.5 py-0.5 rounded-full">Early</span>}
        {m.kind === 'video_ia' && (m.assetUrls?.length || 0) > 0 && (
          <span className="text-[9px] uppercase tracking-wider bg-cyan-700 text-white px-1.5 py-0.5 rounded-full">
            {m.assetUrls?.length} assets
          </span>
        )}
        {!m.active && <span className="text-[9px] uppercase tracking-wider bg-zinc-700 text-zinc-200 px-1.5 py-0.5 rounded-full">Oculto</span>}
      </div>

      {(onMoveUp || onMoveDown) && (
        <div className="absolute left-2 top-10 z-10 flex flex-col gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            disabled={!onMoveUp}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/62 text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black/62 disabled:hover:text-white"
            title="Mover arriba"
            aria-label="Mover arriba"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            disabled={!onMoveDown}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/62 text-white shadow-[0_10px_28px_rgba(0,0,0,0.32)] transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-black/62 disabled:hover:text-white"
            title="Mover abajo"
            aria-label="Mover abajo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-sm text-white font-medium truncate" title={m.title}>{m.title || '(sin título)'}</p>
        <p className="text-[11px] text-zinc-500 truncate">
          {m.description || m.category || '—'}
        </p>
      </div>

      {/* Quick actions (visible on hover) */}
      <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggle({ featured: !m.featured }); }} className="p-1.5 bg-black/60 hover:bg-black text-white rounded" title="Destacar">
          {m.featured ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggle({ active: !m.active }); }} className="p-1.5 bg-black/60 hover:bg-black text-white rounded" title="Mostrar/Ocultar">
          {m.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        {showLock && (
          <button onClick={(e) => { e.stopPropagation(); onToggle({ isLocked: !m.isLocked }); }} className="p-1.5 bg-black/60 hover:bg-black text-white rounded" title="Lockeado">
            {m.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 bg-black/60 hover:bg-black text-white rounded" title="Editar">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded" title="Eliminar">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * List row (compact horizontal)
 * ------------------------------------------------------------------------- */
function ListRow({
  m, selected, onToggleSelect, onEdit, onDelete, onToggle, onMoveUp, onMoveDown, showLock,
}: {
  m: Media;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (patch: Partial<Media>) => void;
  /** Undefined = row is at the top / bottom and can't move further. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showLock: boolean;
}) {
  return (
    <div
      className={
        'bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 transition-colors ' +
        (selected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-zinc-800')
      }
    >
      <button
        onClick={onToggleSelect}
        className={
          'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ' +
          (selected ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700')
        }
        title="Seleccionar"
      >
        {selected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3 h-3" />}
      </button>
      {m.coverImage ? (
        <img src={m.coverImage} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-800 flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center text-zinc-600 text-xs">
          sin cover
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-white font-medium truncate">{m.title}</h3>
          {m.featured && <span className="text-[10px] uppercase tracking-wider bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full">Destacado</span>}
          {m.isMemberOnly && <span className="text-[10px] uppercase tracking-wider bg-fuchsia-600/20 text-fuchsia-300 px-2 py-0.5 rounded-full">Sólo miembros</span>}
          {m.isLocked && <span className="text-[10px] uppercase tracking-wider bg-amber-600/20 text-amber-300 px-2 py-0.5 rounded-full">Lockeado</span>}
          {m.publicFrom && <span className="text-[10px] uppercase tracking-wider bg-sky-600/20 text-sky-300 px-2 py-0.5 rounded-full">Early drop</span>}
          {m.kind === 'video_ia' && (m.assetUrls?.length || 0) > 0 && (
            <span className="text-[10px] uppercase tracking-wider bg-cyan-600/20 text-cyan-300 px-2 py-0.5 rounded-full">
              {m.assetUrls?.length} assets
            </span>
          )}
          {!m.active && <span className="text-[10px] uppercase tracking-wider bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">Oculto</span>}
          {m.embedUrl && parseEmbedUrl(m.embedUrl) && (
            <span
              className="text-[10px] uppercase tracking-wider bg-emerald-600/20 text-emerald-300 px-2 py-0.5 rounded-full"
              title={m.embedUrl}
            >
              {parseEmbedUrl(m.embedUrl)!.platform === 'spotify' ? 'Spotify'
                : parseEmbedUrl(m.embedUrl)!.platform === 'youtube' ? 'YouTube'
                : 'Apple Music'}
            </span>
          )}
        </div>
        <p className="text-zinc-500 text-xs mt-0.5 truncate">
          {m.category || '—'}{m.duration ? ` · ${m.duration}` : ''}{m.description ? ` · ${m.description}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex flex-col mr-1">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title="Mover arriba"
            aria-label="Mover arriba"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title="Mover abajo"
            aria-label="Mover abajo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => onToggle({ featured: !m.featured })} className="p-2 text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 rounded-lg" title="Destacar">
          {m.featured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
        </button>
        <button onClick={() => onToggle({ active: !m.active })} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" title="Mostrar/Ocultar">
          {m.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        {showLock && (
          <button onClick={() => onToggle({ isLocked: !m.isLocked })} className="p-2 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded-lg" title="Paywall">
            {m.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}
        <button onClick={onEdit} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" title="Editar">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg" title="Eliminar">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Socials panel
 * ------------------------------------------------------------------------- */
function SocialsPanel() {
  const [items, setItems] = useState<Social[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Social> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await api.getAdminSocials();
      setItems(rows);
    } catch (e) {
      console.error('[admin/socials] load', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(emptySocial()); setModalOpen(true); };
  const openEdit = (s: Social) => { setEditing(s); setModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      if (editing.id) {
        const updated = await api.updateSocial(editing.id, editing);
        setItems(items.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await api.createSocial(editing);
        setItems([...items, created]);
      }
      setModalOpen(false); setEditing(null);
    } catch (e) {
      console.error('[admin/socials] save', e);
      alert('Error al guardar');
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta red?')) return;
    try {
      await api.deleteSocial(id);
      setItems(items.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {items.length} {items.length === 1 ? 'red' : 'redes'}
        </p>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium">
          <Plus className="w-4 h-4" />
          Nueva red
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
          Sin redes cargadas todavía. Sumá tus links (IG, Spotify, Twitch, etc.).
        </div>
      ) : (
        <div className="grid gap-3">
          {items
            .slice()
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map(s => (
              <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold"
                  style={{ background: `linear-gradient(135deg, ${s.colorFrom || '#FA5D29'}, ${s.colorTo || '#F02E65'})` }}
                >
                  {s.icon || (s.platform || '?').substring(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{s.name}</h3>
                  <p className="text-zinc-500 text-xs truncate">{s.handle} · {s.url}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(s)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing?.id ? 'Editar red' : 'Nueva red'}>
        {editing && (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Plataforma (slug)</label>
                <input type="text" required placeholder="instagram, spotify, twitch..." value={editing.platform || ''} onChange={(e) => setEditing({ ...editing, platform: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Nombre visible</label>
                <input type="text" required value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Handle / descripción</label>
              <input type="text" value={editing.handle || ''} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
            </div>
            <div>
              <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">URL</label>
              <input type="text" required value={editing.url || ''} onChange={(e) => setEditing({ ...editing, url: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Ícono</label>
                <input type="text" placeholder="IG, ▶, ♪..." value={editing.icon || ''} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Color from</label>
                <input type="color" value={editing.colorFrom || '#FA5D29'} onChange={(e) => setEditing({ ...editing, colorFrom: e.target.value })} className="w-full h-10 rounded-lg border border-zinc-200 cursor-pointer" />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Color to</label>
                <input type="color" value={editing.colorTo || '#F02E65'} onChange={(e) => setEditing({ ...editing, colorTo: e.target.value })} className="w-full h-10 rounded-lg border border-zinc-200 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-zinc-500 mb-1.5">Orden</label>
                <input type="number" value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50/70 focus:border-[var(--accent,#FA5D29)] focus:ring-2 focus:ring-[var(--accent,#FA5D29)]/20 focus:bg-white focus:outline-none transition-colors placeholder:text-zinc-400" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-black">
                  <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                  Visible
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-[var(--accent,#FA5D29)] rounded-lg transition-colors">
                {editing.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Newsletter panel (read-only list + CSV export)
 * ------------------------------------------------------------------------- */
function NewsletterPanel() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await api.listNewsletter();
        setItems(rows);
      } catch (e) { console.error('[admin/newsletter] load', e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleExport = () => {
    const csv = 'email,source,active,createdAt\n' + items.map(s =>
      [s.email, s.source || '', s.active ? '1' : '0', s.createdAt].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `newsletter-${Date.now()}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{items.length} suscriptores</p>
        <button onClick={handleExport} disabled={!items.length} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl font-medium">
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>
      {loading ? (
        <p className="text-zinc-500 text-sm">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
          Todavía no hay suscriptores. El form del footer los captura.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Fuente</th>
                <th className="text-left px-4 py-3">Alta</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white font-mono">{s.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.source || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{new Date(s.createdAt).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">
                    {s.active
                      ? <span className="text-[10px] uppercase tracking-wider bg-emerald-600/20 text-emerald-300 px-2 py-0.5 rounded-full">Activo</span>
                      : <span className="text-[10px] uppercase tracking-wider bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">Baja</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
