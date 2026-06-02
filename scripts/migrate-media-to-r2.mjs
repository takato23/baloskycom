#!/usr/bin/env node

import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');
const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const MAP_PATH = process.env.R2_MIGRATION_MAP || 'scripts/_r2-media-migration-map.json';
const DRY_RUN = process.argv.includes('--dry-run');

function requireEnv(name, value) {
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

function localSourceForUrl(url) {
  const pathname = url.startsWith('http')
    ? decodeURIComponent(new URL(url).pathname)
    : url;
  const clean = pathname.replace(/^\/+/, '');

  const candidates = [
    clean,
    path.join('public', clean),
  ];

  const supabasePublicPrefix = '/storage/v1/object/public/balosky-public-media/';
  if (pathname.includes(supabasePublicPrefix)) {
    const objectPath = pathname.split(supabasePublicPrefix)[1];
    candidates.push(path.join('public', objectPath.replace(/^legacy\//, '')));
  }

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function r2KeyForUrl(url, localPath) {
  if (url.includes('/storage/v1/object/public/balosky-public-media/')) {
    const pathname = decodeURIComponent(new URL(url).pathname);
    return pathname
      .split('/storage/v1/object/public/balosky-public-media/')[1]
      .replace(/^legacy\//, '');
  }
  return localPath.replace(/^public\//, '');
}

async function main() {
  requireEnv('R2_ACCOUNT_ID', ACCOUNT_ID);
  requireEnv('R2_ACCESS_KEY_ID', ACCESS_KEY_ID);
  requireEnv('R2_SECRET_ACCESS_KEY', SECRET_ACCESS_KEY);
  requireEnv('R2_BUCKET', BUCKET);
  requireEnv('R2_PUBLIC_BASE_URL', PUBLIC_BASE_URL);

  const sql = postgres(requireEnv('DATABASE_URL', process.env.DATABASE_URL), { prepare: false });
  const rows = await sql.unsafe(`
    SELECT id, kind, title, media_url, cover_image, thumb_url
    FROM media
    WHERE active = 1
      AND concat_ws(' ', media_url, cover_image, thumb_url) NOT LIKE $1
    ORDER BY kind, title
  `, [`${PUBLIC_BASE_URL}%`]);

  const urls = [...new Set(rows
    .flatMap((row) => [row.media_url, row.cover_image, row.thumb_url])
    .filter(Boolean)
    .filter((url) => !url.startsWith(PUBLIC_BASE_URL)))];

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });

  const mapped = [];
  const missing = [];
  let totalBytes = 0;

  for (const oldUrl of urls) {
    const localPath = localSourceForUrl(oldUrl);
    if (!localPath) {
      missing.push({ oldUrl });
      continue;
    }

    const body = await readFile(localPath);
    totalBytes += body.length;
    const key = r2KeyForUrl(oldUrl, localPath);
    const newUrl = `${PUBLIC_BASE_URL}/${key}`;

    if (!DRY_RUN) {
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType(localPath),
        CacheControl: 'public, max-age=31536000, immutable',
      }));
    }

    mapped.push({ oldUrl, newUrl, localPath, key, size: body.length });
    if (mapped.length % 20 === 0) {
      console.log(JSON.stringify({ uploaded: mapped.length, total: urls.length, dryRun: DRY_RUN }));
    }
  }

  if (missing.length) {
    console.log(JSON.stringify({ missing }, null, 2));
    throw new Error('Missing local files for some media URLs');
  }

  let mediaHits = 0;
  let coverHits = 0;
  let thumbHits = 0;
  if (!DRY_RUN) {
    for (const item of mapped) {
      mediaHits += (await sql.unsafe('UPDATE media SET media_url = $1 WHERE media_url = $2', [item.newUrl, item.oldUrl])).count || 0;
      coverHits += (await sql.unsafe('UPDATE media SET cover_image = $1 WHERE cover_image = $2', [item.newUrl, item.oldUrl])).count || 0;
      thumbHits += (await sql.unsafe('UPDATE media SET thumb_url = $1 WHERE thumb_url = $2', [item.newUrl, item.oldUrl])).count || 0;
    }
  }

  await writeFile(MAP_PATH, JSON.stringify(mapped, null, 2));
  await sql.end();

  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    uniqueUrls: urls.length,
    mapped: mapped.length,
    totalMB: +(totalBytes / 1024 / 1024).toFixed(1),
    updates: { mediaHits, coverHits, thumbHits },
    mapPath: MAP_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
