#!/usr/bin/env node
/**
 * Genera versiones livianas de los videos de /productora.
 *
 * Problema que resuelve: los trabajos del feed `video_ia` son los MP4
 * originales de Instagram (8–45 MB cada uno) servidos desde Supabase con
 * `Cache-Control: no-cache`. La landing los usaba para TODO: el loop del
 * hero, el preview al hover y el autoplay mobile. Resultado: ~20 MB de
 * video para pintar el hero y hasta 110 MB si recorrías la grilla.
 *
 * Este script descarga los videos del feed y produce:
 *   - public/videos/productora/hero-loop.mp4      → 8s, 720p, sin audio (~1-2 MB)
 *   - public/videos/productora/previews/<id>.mp4  → 6s, 480p, sin audio (~300-600 KB)
 *   - public/videos/productora/manifest.json      → mapa id → preview (+ hero)
 *
 * La página usa el preview para hover/autoplay y recién carga el MP4
 * completo de Supabase cuando alguien toca play con sonido.
 *
 * Uso:  node scripts/build-productora-previews.mjs [--api http://localhost:3000]
 * Requiere: ffmpeg en PATH y el dev server corriendo (para leer el feed).
 * Re-ejecutalo cuando agregues videos nuevos al feed.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const API = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : 'http://localhost:3000';

const OUT_DIR = join(process.cwd(), 'public', 'videos', 'productora');
const PREVIEWS_DIR = join(OUT_DIR, 'previews');
const TMP = join(tmpdir(), 'balosky-prod-previews');
const MAX_WORKS = 8;

mkdirSync(PREVIEWS_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

const res = await fetch(`${API}/api/media?kind=video_ia`);
if (!res.ok) throw new Error(`API ${res.status} — ¿está corriendo el dev server?`);
const rows = (await res.json())
  .filter((r) => r.active !== false && r.mediaUrl)
  .slice(0, MAX_WORKS);

console.log(`Feed video_ia: ${rows.length} videos a procesar\n`);

const mb = (p) => (statSync(p).size / 1e6).toFixed(1);

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} ${url}`);
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

function transcode(src, dest, { seconds, height, crf }) {
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', src,
    '-t', String(seconds),
    '-vf', `scale=-2:${height}:flags=lanczos,fps=24`,
    '-an',
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', 'veryfast',
    '-movflags', '+faststart',
    dest,
  ]);
}

const manifest = { hero: null, items: {} };

for (let i = 0; i < rows.length; i++) {
  const m = rows[i];
  const tmpFile = join(TMP, `${m.id}.mp4`);
  process.stdout.write(`[${i + 1}/${rows.length}] ${m.title} ... `);
  try {
    await download(m.mediaUrl, tmpFile);

    const previewPath = join(PREVIEWS_DIR, `${m.id}.mp4`);
    transcode(tmpFile, previewPath, { seconds: 6, height: 480, crf: 30 });
    manifest.items[m.id] = `/videos/productora/previews/${m.id}.mp4`;
    let line = `${mb(tmpFile)} MB → preview ${mb(previewPath)} MB`;

    // El primer video del feed es el que usa el hero.
    if (i === 0) {
      const heroPath = join(OUT_DIR, 'hero-loop.mp4');
      transcode(tmpFile, heroPath, { seconds: 8, height: 720, crf: 28 });
      manifest.hero = '/videos/productora/hero-loop.mp4';
      line += ` · hero ${mb(heroPath)} MB`;
    }
    console.log(line);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  } finally {
    if (existsSync(tmpFile)) rmSync(tmpFile);
  }
}

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${Object.keys(manifest.items).length} previews + hero → public/videos/productora/manifest.json`);
