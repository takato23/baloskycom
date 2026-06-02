#!/usr/bin/env node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import sharp from 'sharp';

const BUCKET = process.env.SUPABASE_MEDIA_BUCKET || 'balosky-public-media';
const WIDTH = Number(process.env.PANORAMA_THUMB_WIDTH || 720);
const QUALITY = Number(process.env.PANORAMA_THUMB_QUALITY || 72);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function basenameFromUrl(url) {
  const pathname = url.startsWith('http')
    ? new URL(url).pathname
    : url;
  return path.basename(decodeURIComponent(pathname)).replace(/\.[^.]+$/, '');
}

async function main() {
  const sql = postgres(requireEnv('DATABASE_URL'), { prepare: false });
  const supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  const rows = await sql.unsafe(`
    SELECT id, title, media_url, cover_image
    FROM media
    WHERE kind = 'panorama_360'
      AND active = 1
      AND COALESCE(media_url, cover_image) IS NOT NULL
    ORDER BY sort_order ASC, created_at DESC
  `);

  await mkdir('public/uploads/thumbs/panoramas', { recursive: true });

  let generated = 0;
  let updated = 0;
  let originalBytes = 0;
  let thumbBytes = 0;
  const skipped = [];

  for (const row of rows) {
    const base = basenameFromUrl(row.media_url || row.cover_image);
    const sourceCandidates = [
      `public/uploads/panoramas/${base}.png`,
      `public/uploads/panoramas/${base}.jpg`,
      `public/uploads/panoramas/${base}.jpeg`,
      `public/uploads/panoramas/${base}.webp`,
    ];
    const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));
    if (!sourcePath) {
      skipped.push({ id: row.id, title: row.title, reason: 'missing local panorama source', base });
      continue;
    }

    const outFile = `${base}.webp`;
    const outPath = `public/uploads/thumbs/panoramas/${outFile}`;
    await sharp(sourcePath)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(outPath);

    const objectPath = `thumbs/panoramas/${outFile}`;
    const body = await readFile(outPath);
    const upload = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType: 'image/webp',
      upsert: true,
    });
    if (upload.error) throw upload.error;

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    const result = await sql.unsafe(
      'UPDATE media SET thumb_url = $1 WHERE id = $2',
      [publicUrl, row.id],
    );

    originalBytes += (await stat(sourcePath)).size;
    thumbBytes += body.length;
    generated += 1;
    updated += result.count || 0;
  }

  await sql.end();

  console.log(JSON.stringify({
    generated,
    updated,
    skipped,
    originalMB: +(originalBytes / 1024 / 1024).toFixed(2),
    thumbsMB: +(thumbBytes / 1024 / 1024).toFixed(2),
    reductionPct: originalBytes ? +(100 - (thumbBytes / originalBytes * 100)).toFixed(1) : 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
