#!/usr/bin/env node

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';
import postgres from 'postgres';

const FILES = [
  'uploads/2026/04/robaron-a-a-balosky-1776453374494.mp3',
  'uploads/2026/04/robaron-a-a-balosky-cover-1776453374692.jpg',
  'uploads/2026/04/tin-cup-anthem-2--1776453374495.mp3',
  'uploads/2026/04/tin-cup-anthem-2-cover-1776453374606.jpg',
  'uploads/2026/04/tin-cup-anthem-1--1776453374497.mp3',
  'uploads/2026/04/tin-cup-anthem-1-cover-1776453374668.jpg',
  'uploads/2026/04/ai-ai-ai-ai--1776453375528.mp3',
  'uploads/2026/04/ai-ai-ai-ai-cover-1776453375563.jpg',
  'uploads/2026/04/atencio-n-instagram--1776453376016.mp3',
  'uploads/2026/04/atencio-n-instagram-cover-1776453376120.jpg',
  'uploads/2026/04/y-bueno-locos-clarito-les-digo--1776453376568.mp3',
  'uploads/2026/04/y-bueno-locos-clarito-les-digo-cover-1776453376594.jpg',
  'uploads/2026/04/a-lavarse-la-cola-1776453376710.mp3',
  'uploads/2026/04/a-lavarse-la-cola-cover-1776453376745.jpg',
  'uploads/2026/04/ya-no-se-que-di-a-es-hoy--1776453376928.mp3',
  'uploads/2026/04/ya-no-se-que-di-a-es-hoy-cover-1776453376970.jpg',
  'uploads/2026/04/y-que-noche-tete--1776453377374.mp3',
  'uploads/2026/04/y-que-noche-tete-cover-1776453377430.jpg',
  'uploads/2026/04/esto-es-ciencia-pura--1776453377481.mp3',
  'uploads/2026/04/esto-es-ciencia-pura-cover-1776453377522.jpg',
  'uploads/2026/04/-oh-tecnologi-a-cruel--1776453378117.mp3',
  'uploads/2026/04/-oh-tecnologi-a-cruel-cover-1776453378184.jpg',
  'uploads/2026/04/amigos-no-1--1776453378205.mp3',
  'uploads/2026/04/amigos-no-1-cover-1776453378257.jpg',
  'uploads/2026/04/en-la-cumbre-de-isengard-donde-el-vient-1776453378285.mp3',
  'uploads/2026/04/en-la-cumbre-de-isengard-donde-el-vient--1776453378361.jpg',
  'uploads/2026/04/el-rock-de-dua-lipa-1776453379156.mp3',
  'uploads/2026/04/el-rock-de-dua-lipa-cover-1776453379224.jpg',
  'uploads/2026/04/giorgio-es-experto-en-poner-excusas--1776453379370.mp3',
  'uploads/2026/04/giorgio-es-experto-en-poner-excusas-cove-1776453379432.jpg',
  'uploads/2026/04/giorgio-el-hombre-slop-1776453379436.mp3',
  'uploads/2026/04/giorgio-el-hombre-slop-cover-1776453379491.jpg',
  'uploads/2026/04/el-puente-de-khazad-du-m-1776453379993.mp3',
  'uploads/2026/04/el-puente-de-khazad-du-m-cover-1776453380060.jpg',
  'uploads/2026/04/modo-locomotora-1--1776453380279.mp3',
  'uploads/2026/04/modo-locomotora-1-cover-1776453380440.jpg',
  'uploads/2026/04/otro-tema-de-locomotora-1776453380624.mp3',
  'uploads/2026/04/otro-tema-de-locomotora-cover-1776453381005.jpg',
  'uploads/2026/04/copper-anthem-1776453456263.mp3',
  'uploads/2026/04/copper-anthem-cover-1776453456289.jpg',
  'uploads/2026/04/sen-oras-sen-ores--1776453463113.mp3',
  'uploads/2026/04/sen-oras-sen-ores-cover-1776453463149.jpg',
];

function contentType(file) {
  if (file.endsWith('.mp3')) return 'audio/mpeg';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const uploaded = [];

  for (const rel of FILES) {
    const localPath = path.join(process.cwd(), 'public', rel);
    const oldUrl = `/${rel}`;
    if (!existsSync(localPath)) {
      throw new Error(`Missing local source: ${localPath}`);
    }

    const size = statSync(localPath).size;
    process.stdout.write(`upload ${oldUrl} (${formatMb(size)})... `);
    const body = await readFile(localPath);
    const result = await put(rel, body, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: contentType(rel),
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    console.log(result.url);
    uploaded.push({ oldUrl, newUrl: result.url, size });
  }

  const mapPath = path.join(process.cwd(), 'scripts', '_song-asset-blob-map.json');
  await writeFile(mapPath, JSON.stringify(uploaded, null, 2));

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  let mediaHits = 0;
  let coverHits = 0;
  for (const item of uploaded) {
    const mediaResult = await sql`
      UPDATE media
      SET media_url = ${item.newUrl}
      WHERE media_url = ${item.oldUrl}
    `;
    const coverResult = await sql`
      UPDATE media
      SET cover_image = ${item.newUrl}
      WHERE cover_image = ${item.oldUrl}
    `;
    mediaHits += mediaResult.count || 0;
    coverHits += coverResult.count || 0;
  }
  await sql.end();

  console.log(JSON.stringify({
    uploaded: uploaded.length,
    mediaHits,
    coverHits,
    mapPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
