#!/usr/bin/env node

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const VIDEO = {
  oldUrl: '/uploads/videos/balosky-molinete-conurbano.web.mp4',
  localPath: 'public/uploads/videos/balosky-molinete-conurbano.web.mp4',
  blobKey: 'uploads/videos/balosky-molinete-conurbano.web.mp4',
  contentType: 'video/mp4',
};

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const body = await readFile(path.join(process.cwd(), VIDEO.localPath));
  const { url: videoUrl } = await put(VIDEO.blobKey, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: VIDEO.contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  const videoResult = await sql`
    UPDATE media
    SET media_url = ${videoUrl}
    WHERE media_url = ${VIDEO.oldUrl}
  `;

  const covers = await sql`
    UPDATE media
    SET cover_image = thumb_url
    WHERE active = 1
      AND cover_image LIKE '/uploads/%'
      AND thumb_url LIKE 'https://%.public.blob.vercel-storage.com/%'
  `;

  await sql.end();

  const mapPath = path.join(process.cwd(), 'scripts', '_public-media-blob-map.json');
  await writeFile(mapPath, JSON.stringify({
    video: {
      ...VIDEO,
      newUrl: videoUrl,
      size: statSync(path.join(process.cwd(), VIDEO.localPath)).size,
    },
    updated: {
      videoRows: videoResult.count || 0,
      coverRows: covers.count || 0,
    },
  }, null, 2));

  console.log(JSON.stringify({
    videoRows: videoResult.count || 0,
    coverRows: covers.count || 0,
    videoUrl,
    mapPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
