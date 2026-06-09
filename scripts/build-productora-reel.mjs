#!/usr/bin/env node
/**
 * Showreel BORRADOR para /productora — v0 automática.
 *
 * Corta los primeros segundos de cada video del feed `video_ia`, los
 * normaliza a 1080×1920 (9:16) y los concatena con un tema propio
 * ("Temas Propios" del feed) de fondo, con fade out al final.
 *
 * ⚠️ Esto es un BORRADOR para validar la estructura: el showreel real lo
 * tiene que editar Santi eligiendo los mejores momentos de cada pieza
 * (este script corta a ciegas desde el segundo 1). Cuando exista la
 * versión editada, reemplazar public/videos/productora/reel-draft.mp4.
 *
 * Uso:  node scripts/build-productora-reel.mjs [--api http://localhost:3000]
 * Requiere: ffmpeg en PATH y el dev server corriendo.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const API = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : 'http://localhost:3000';

const OUT_DIR = join(process.cwd(), 'public', 'videos', 'productora');
const TMP = join(tmpdir(), 'balosky-prod-reel');
const CLIP_SECONDS = 4;
const CLIP_OFFSET = 1; // saltea el arranque frío de cada pieza
const MAX_CLIPS = 7;

mkdirSync(OUT_DIR, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} ${url}`);
  writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

// 1. Videos del feed
const videosRes = await fetch(`${API}/api/media?kind=video_ia`);
if (!videosRes.ok) throw new Error('¿Está corriendo el dev server?');
const videos = (await videosRes.json())
  .filter((r) => r.active !== false && r.mediaUrl)
  .slice(0, MAX_CLIPS);

// 2. Un tema propio para la cama de audio
const songsRes = await fetch(`${API}/api/media?kind=cancion`);
const songs = songsRes.ok ? (await songsRes.json()).filter((s) => s.mediaUrl) : [];
const song = songs.find((s) => /instagr/i.test(s.title)) || songs[0] || null;

console.log(`Reel draft: ${videos.length} clips × ${CLIP_SECONDS}s` + (song ? ` · música: "${song.title}"` : ' · sin música'));

// 3. Descargar y normalizar cada clip a 1080x1920 / 24fps / sin audio
const clipPaths = [];
for (let i = 0; i < videos.length; i++) {
  const m = videos[i];
  const raw = join(TMP, `raw-${i}.mp4`);
  const clip = join(TMP, `clip-${i}.mp4`);
  process.stdout.write(`[${i + 1}/${videos.length}] ${m.title} ... `);
  try {
    await download(m.mediaUrl, raw);
    ff([
      '-ss', String(CLIP_OFFSET),
      '-i', raw,
      '-t', String(CLIP_SECONDS),
      '-vf', 'scale=-2:1920:flags=lanczos,crop=1080:1920,fps=24,setsar=1',
      '-an',
      '-c:v', 'libx264', '-crf', '21', '-preset', 'fast',
      clip,
    ]);
    clipPaths.push(clip);
    console.log('ok');
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  } finally {
    if (existsSync(raw)) rmSync(raw);
  }
}

if (clipPaths.length < 3) throw new Error('Muy pocos clips procesados para armar un reel.');

// 4. Concat
const listFile = join(TMP, 'list.txt');
writeFileSync(listFile, clipPaths.map((p) => `file '${p}'`).join('\n'));
const silent = join(TMP, 'reel-silent.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent]);

// 5. Cama de audio con fade out + branding final
const out = join(OUT_DIR, 'reel-draft.mp4');
const totalSeconds = clipPaths.length * CLIP_SECONDS;
if (song) {
  const mp3 = join(TMP, 'music.mp3');
  await download(song.mediaUrl, mp3);
  ff([
    '-i', silent,
    '-i', mp3,
    '-t', String(totalSeconds),
    '-filter_complex', `[1:a]atrim=0:${totalSeconds},afade=t=in:st=0:d=0.8,afade=t=out:st=${totalSeconds - 1.6}:d=1.6[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    out,
  ]);
} else {
  ff(['-i', silent, '-c', 'copy', '-movflags', '+faststart', out]);
}

// 6. Registrar en el manifest para que la landing muestre el botón "Ver reel"
const manifestPath = join(OUT_DIR, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf-8')) : { hero: null, items: {} };
manifest.reel = '/videos/productora/reel-draft.mp4';
manifest.reelSeconds = totalSeconds;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

rmSync(TMP, { recursive: true, force: true });
console.log(`\nListo: ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB, ${totalSeconds}s)`);
