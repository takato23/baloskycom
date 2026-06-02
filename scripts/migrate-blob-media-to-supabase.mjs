#!/usr/bin/env node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const BLOB_HOST = process.env.LEGACY_BLOB_HOST || 'uxry85cxugshfbr5.public.blob.vercel-storage.com';
const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'balosky-public-media';
const PREFIX = process.env.SUPABASE_MIGRATION_PREFIX || 'legacy';
const MAP_PATH = process.env.SUPABASE_MIGRATION_MAP || 'scripts/_supabase-media-migration-map.json';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

async function main() {
  const sql = postgres(requireEnv('DATABASE_URL'), { prepare: false });
  const supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  const rows = await sql.unsafe(`
    SELECT id, kind, title, media_url, cover_image, thumb_url
    FROM media
    WHERE concat_ws(' ', media_url, cover_image, thumb_url) LIKE $1
    ORDER BY kind, title
  `, [`%${BLOB_HOST}%`]);

  const urls = [...new Set(rows
    .flatMap((row) => [row.media_url, row.cover_image, row.thumb_url])
    .filter((url) => url && url.includes(BLOB_HOST)))];

  const urlMap = new Map();
  let uploaded = 0;
  let totalBytes = 0;
  const missing = [];

  for (const oldUrl of urls) {
    const rel = decodeURIComponent(new URL(oldUrl).pathname.replace(/^\/+/, ''));
    const localPath = path.join('public', rel);
    if (!existsSync(localPath)) {
      missing.push({ oldUrl, localPath });
      continue;
    }

    const body = await readFile(localPath);
    totalBytes += body.length;
    const objectPath = `${PREFIX}/${rel}`;
    const upload = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType: contentType(rel),
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    urlMap.set(oldUrl, publicUrl);
    uploaded += 1;
    if (uploaded % 20 === 0) {
      console.log(JSON.stringify({ uploaded, total: urls.length }));
    }
  }

  if (missing.length) {
    console.log(JSON.stringify({ missing }, null, 2));
    throw new Error('Missing local files for some legacy Blob URLs');
  }

  let mediaHits = 0;
  let coverHits = 0;
  let thumbHits = 0;
  for (const [oldUrl, newUrl] of urlMap.entries()) {
    mediaHits += (await sql.unsafe('UPDATE media SET media_url = $1 WHERE media_url = $2', [newUrl, oldUrl])).count || 0;
    coverHits += (await sql.unsafe('UPDATE media SET cover_image = $1 WHERE cover_image = $2', [newUrl, oldUrl])).count || 0;
    thumbHits += (await sql.unsafe('UPDATE media SET thumb_url = $1 WHERE thumb_url = $2', [newUrl, oldUrl])).count || 0;
  }

  const remaining = await sql.unsafe(`
    SELECT kind,
      count(*) FILTER (WHERE media_url LIKE $1)::int AS media_blob,
      count(*) FILTER (WHERE cover_image LIKE $1)::int AS cover_blob,
      count(*) FILTER (WHERE thumb_url LIKE $1)::int AS thumb_blob
    FROM media
    GROUP BY kind
    ORDER BY kind
  `, [`%${BLOB_HOST}%`]);

  await writeFile(MAP_PATH, JSON.stringify(
    [...urlMap.entries()].map(([oldUrl, newUrl]) => ({ oldUrl, newUrl })),
    null,
    2,
  ));
  await sql.end();

  console.log(JSON.stringify({
    uniqueUrls: urls.length,
    uploaded,
    totalMB: +(totalBytes / 1024 / 1024).toFixed(1),
    updates: { mediaHits, coverHits, thumbHits },
    remaining,
    mapPath: MAP_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
