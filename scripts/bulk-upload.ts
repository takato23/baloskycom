/**
 * Bulk-upload de archivos a la plataforma Balosky.
 *
 * Uso:
 *   npx tsx scripts/bulk-upload.ts <carpeta> --kind=<video_ia|foto|wallpaper|cancion> [opciones]
 *
 * Ejemplos:
 *   # Subir todas las fotos de ~/Pictures/wallpapers-abril como wallpapers
 *   npx tsx scripts/bulk-upload.ts ~/Pictures/wallpapers-abril --kind=wallpaper
 *
 *   # Con login explícito (si no seteaste env vars)
 *   BALOSKY_USER=admin BALOSKY_PASS=xxx \
 *     npx tsx scripts/bulk-upload.ts ~/Desktop/fotos --kind=foto
 *
 *   # Apuntando a producción
 *   BALOSKY_URL=https://balosky.com \
 *     npx tsx scripts/bulk-upload.ts ~/Pictures/pack --kind=wallpaper
 *
 * Variables de entorno:
 *   BALOSKY_URL    (default: http://localhost:3000)
 *   BALOSKY_USER   admin username
 *   BALOSKY_PASS   admin password
 *   BALOSKY_TOKEN  JWT pre-obtenido (salteás el login si lo pasás)
 *
 * Opciones:
 *   --kind=<kind>       Requerido. Tipo de media.
 *   --category=<str>    Categoría aplicada a todos los items (opcional).
 *   --locked            Crea los items como lockeados (paywall premium).
 *   --inactive          Los crea ocultos (active: false) — para revisar antes.
 *   --concurrency=<n>   Subidas en paralelo (default: 3).
 *   --dry-run           Lista lo que subiría sin tocar la API.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type MediaKind = 'video_ia' | 'foto' | 'wallpaper' | 'cancion';

interface Args {
  folder: string;
  kind: MediaKind;
  category?: string;
  locked: boolean;
  inactive: boolean;
  concurrency: number;
  dryRun: boolean;
}

const EXT_BY_KIND: Record<MediaKind, RegExp> = {
  video_ia:  /\.(mp4|webm|mov|m4v)$/i,
  foto:      /\.(jpg|jpeg|png|webp|avif|gif)$/i,
  wallpaper: /\.(jpg|jpeg|png|webp|avif)$/i,
  cancion:   /\.(mp3|wav|m4a|aac|ogg|flac)$/i,
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac',
};

function parseArgs(argv: string[]): Args {
  const folder = argv[0];
  if (!folder || folder.startsWith('--')) {
    console.error('✖ Primera posición debe ser la carpeta. Ej: npx tsx scripts/bulk-upload.ts ./fotos --kind=foto');
    process.exit(1);
  }

  const get = (name: string): string | undefined => {
    const match = argv.find(a => a.startsWith(`--${name}=`));
    return match ? match.split('=').slice(1).join('=') : undefined;
  };
  const flag = (name: string): boolean => argv.includes(`--${name}`);

  const kind = (get('kind') || '') as MediaKind;
  if (!['video_ia', 'foto', 'wallpaper', 'cancion'].includes(kind)) {
    console.error('✖ --kind debe ser uno de: video_ia, foto, wallpaper, cancion');
    process.exit(1);
  }

  return {
    folder: path.resolve(folder.replace(/^~/, process.env.HOME || '')),
    kind,
    category: get('category'),
    locked: flag('locked'),
    inactive: flag('inactive'),
    concurrency: Number(get('concurrency') || 3),
    dryRun: flag('dry-run'),
  };
}

async function login(baseUrl: string): Promise<string> {
  const preToken = process.env.BALOSKY_TOKEN;
  if (preToken) return preToken;

  const user = process.env.BALOSKY_USER;
  const pass = process.env.BALOSKY_PASS;
  if (!user || !pass) {
    console.error('✖ Falta auth: seteá BALOSKY_TOKEN o BALOSKY_USER + BALOSKY_PASS.');
    process.exit(1);
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!res.ok) {
    console.error(`✖ Login falló: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json() as { token?: string };
  if (!data.token) {
    console.error('✖ Login no devolvió token.');
    process.exit(1);
  }
  return data.token;
}

function filenameToTitle(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function uploadFile(baseUrl: string, token: string, filePath: string): Promise<{ url: string; size: number }> {
  const data = await readFile(filePath);
  const name = path.basename(filePath);
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = MIME_BY_EXT[ext] || 'application/octet-stream';

  const form = new FormData();
  const blob = new Blob([data], { type });
  form.append('file', blob, name);

  const res = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed ${res.status} ${await res.text()}`);
  const json = await res.json() as { url: string; size: number };
  return json;
}

async function createMediaRow(baseUrl: string, token: string, payload: any): Promise<{ id: string }> {
  const res = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`media failed ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (process.env.BALOSKY_URL || 'http://localhost:3000').replace(/\/$/, '');

  const stats = await stat(args.folder).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    console.error(`✖ No es una carpeta: ${args.folder}`);
    process.exit(1);
  }

  const entries = await readdir(args.folder, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && EXT_BY_KIND[args.kind].test(e.name) && !e.name.startsWith('.'))
    .map(e => path.join(args.folder, e.name))
    .sort();

  if (!files.length) {
    console.error(`✖ No encontré archivos para --kind=${args.kind} en ${args.folder}`);
    console.error(`  Extensiones aceptadas: ${EXT_BY_KIND[args.kind]}`);
    process.exit(1);
  }

  console.log(`→ ${files.length} archivo${files.length === 1 ? '' : 's'} a subir como ${args.kind}`);
  console.log(`  destino: ${baseUrl}`);
  if (args.category) console.log(`  categoría: ${args.category}`);
  if (args.locked) console.log('  lockeados (paywall)');
  if (args.inactive) console.log('  inactivos (no visibles hasta aprobar)');

  if (args.dryRun) {
    console.log('\n[DRY-RUN] Archivos que subiría:');
    files.forEach(f => console.log('  ·', path.basename(f)));
    return;
  }

  const token = await login(baseUrl);
  console.log('✓ Login OK\n');

  let ok = 0;
  let fail = 0;
  let idx = 0;

  const worker = async (workerId: number) => {
    while (idx < files.length) {
      const myIdx = idx++;
      const filePath = files[myIdx];
      const base = path.basename(filePath);
      const num = `[${myIdx + 1}/${files.length}]`;
      try {
        const sz = (await stat(filePath)).size;
        const up = await uploadFile(baseUrl, token, filePath);
        const title = filenameToTitle(base);
        const payload: any = {
          kind: args.kind,
          title,
          description: '',
          category: args.category || '',
          mediaUrl: up.url,
          coverImage: (args.kind === 'cancion' || args.kind === 'video_ia') ? '' : up.url,
          duration: '',
          isLocked: args.locked,
          active: !args.inactive,
          featured: false,
          sortOrder: 0,
        };
        const created = await createMediaRow(baseUrl, token, payload);
        console.log(`${num} ✓ ${base}  (${(sz / 1024 / 1024).toFixed(1)}MB) → id=${created.id}`);
        ok++;
      } catch (e: any) {
        console.log(`${num} ✗ ${base}  — ${e.message || e}`);
        fail++;
      }
    }
  };

  const workers = Array.from({ length: Math.min(args.concurrency, files.length) }, (_, i) => worker(i));
  await Promise.all(workers);

  console.log(`\nListo: ${ok} ok · ${fail} fail`);
  if (fail) process.exit(1);
}

main().catch(e => {
  console.error('✖ Error fatal:', e);
  process.exit(1);
});
