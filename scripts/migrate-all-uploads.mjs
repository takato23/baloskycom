// Migración wholesale: sube TODOS los archivos de /public/uploads/ a
// Vercel Blob y actualiza las filas de `media` en Supabase para que
// `media_url` y `thumb_url` apunten al CDN del Blob.
//
// Qué migra (incluye): public/uploads/wallpapers, public/uploads/ojo,
// public/uploads/thumbs (ojo + wallpapers), public/uploads/videos, y todo
// lo que cuelgue de public/uploads/YYYY/MM (fotos/videos viejos).
//
// Qué NO migra: archivos que ya están en la DB apuntando a
// https://*.public.blob.vercel-storage.com (los salta — idempotente).
//
// Cómo se corre:
//   node scripts/migrate-all-uploads.mjs            # dry run, imprime plan
//   node scripts/migrate-all-uploads.mjs --apply    # sube al blob
//   node scripts/migrate-all-uploads.mjs --apply --db  # sube Y actualiza DB
//
// Variables requeridas en .env:
//   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
//   DATABASE_URL=postgres://...

import 'dotenv/config';
import { readFile, stat } from 'node:fs/promises';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const ROOT = join(process.cwd());
const PUBLIC_DIR = join(ROOT, 'public');
const UPLOADS_DIR = join(PUBLIC_DIR, 'uploads');

const APPLY = process.argv.includes('--apply');
const UPDATE_DB = process.argv.includes('--db');
const ONLY_ARG = process.argv.find((a) => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.slice('--only='.length) : null; // substring filter sobre el rel path
const MAX_MB_ARG = process.argv.find((a) => a.startsWith('--max-mb='));
const MAX_BYTES = MAX_MB_ARG ? Number(MAX_MB_ARG.slice('--max-mb='.length)) * 1024 * 1024 : Infinity;

function mime(ext) {
  const m = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav'
  };
  return m[ext.toLowerCase()] || 'application/octet-stream';
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (s.isFile()) acc.push(p);
  }
  return acc;
}

function human(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Falta BLOB_READ_WRITE_TOKEN en .env');
    process.exit(1);
  }
  if (UPDATE_DB && !process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en .env (requerido con --db)');
    process.exit(1);
  }

  const files = walk(UPLOADS_DIR)
    .map((abs) => {
      const rel = '/' + relative(PUBLIC_DIR, abs).split(/[\\/]/).join('/');
      const ext = abs.slice(abs.lastIndexOf('.'));
      const size = statSync(abs).size;
      // blob key: replicamos la ruta sin el "/" inicial
      const blobKey = rel.replace(/^\//, '');
      return { abs, rel, blobKey, ext, size, contentType: mime(ext) };
    })
    .filter((f) => (ONLY ? f.rel.includes(ONLY) : true))
    .filter((f) => f.size <= MAX_BYTES)
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  console.log(`\n${files.length} archivos, ${human(totalSize)} totales`);
  console.log(`Modo: ${APPLY ? 'APPLY' : 'dry-run'}${UPDATE_DB ? ' + DB' : ''}\n`);

  if (!APPLY) {
    for (const f of files) {
      console.log(`  ${f.rel.padEnd(70)} ${human(f.size).padStart(8)}`);
    }
    console.log('\nCorre con --apply para subir.');
    return;
  }

  const uploaded = [];
  let idx = 0;
  for (const f of files) {
    idx++;
    process.stdout.write(`[${String(idx).padStart(3)}/${files.length}] ${f.rel} (${human(f.size)})... `);
    try {
      const buf = await readFile(f.abs);
      const { url } = await put(f.blobKey, buf, {
        access: 'public',
        contentType: f.contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        allowOverwrite: true,
        addRandomSuffix: false
      });
      console.log('OK');
      uploaded.push({ oldUrl: f.rel, newUrl: url, size: f.size });
    } catch (err) {
      console.log('FAIL:', err?.message || err);
    }
  }

  console.log(`\nSubidos: ${uploaded.length}/${files.length}`);

  // Escribir mapping a un JSON para referencia + para el paso --db
  const mapPath = join(ROOT, 'scripts', '_blob-migration-map.json');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(mapPath, JSON.stringify(uploaded, null, 2));
  console.log(`Mapping escrito en ${mapPath}`);

  if (!UPDATE_DB) {
    console.log('\nCorre con --apply --db para actualizar la DB automáticamente.');
    console.log('O agarrá el JSON y armá los UPDATE a mano.');
    return;
  }

  // Update DB
  console.log('\nActualizando DB...');
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  let mediaHits = 0;
  let thumbHits = 0;
  for (const u of uploaded) {
    const r1 = await sql`UPDATE media SET media_url = ${u.newUrl} WHERE media_url = ${u.oldUrl}`;
    const r2 = await sql`UPDATE media SET thumb_url = ${u.newUrl} WHERE thumb_url = ${u.oldUrl}`;
    // También: campañas y productos que tengan cover_image o media_url apuntando al mismo path.
    await sql`UPDATE campaigns SET cover_image = ${u.newUrl} WHERE cover_image = ${u.oldUrl}`;
    await sql`UPDATE campaigns SET video_url = ${u.newUrl} WHERE video_url = ${u.oldUrl}`;
    await sql`UPDATE products  SET cover_image = ${u.newUrl} WHERE cover_image = ${u.oldUrl}`;
    await sql`UPDATE products  SET file_url    = ${u.newUrl} WHERE file_url    = ${u.oldUrl}`;
    mediaHits += r1.count || 0;
    thumbHits += r2.count || 0;
  }
  await sql.end();
  console.log(`media_url filas actualizadas: ${mediaHits}`);
  console.log(`thumb_url filas actualizadas: ${thumbHits}`);
  console.log('Listo. Verificá con un refresh.');
}

main().catch((e) => {
  console.error('Fallo:', e);
  process.exit(1);
});
