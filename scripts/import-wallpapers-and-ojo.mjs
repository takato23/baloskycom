#!/usr/bin/env node
/**
 * Import the classified WebP dump from ~/Documents/Fotos Wallpapers/webp
 * into the Balosky Postgres `media` table.
 *
 *   Redes_*.webp     → kind = 'foto',      served from /uploads/ojo/
 *   Wallpaper_*.webp → kind = 'wallpaper', served from /uploads/wallpapers/
 *
 * Category is inferred from the filename keywords. Idempotent: each run
 * skips rows whose media_url already exists.
 *
 * Run:
 *   node scripts/import-wallpapers-and-ojo.mjs
 */

import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'public', 'uploads');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

/** Turn `Edificio_Moderno_Curvo` into `Edificio moderno curvo` */
function humanize(stem){
  return stem
    .replace(/_/g, ' ')
    .replace(/\b([A-Z]{2,})\b/g, (m) => m)          // keep NYC, CCK, USA in caps
    .replace(/^(.)(.*)$/, (_, a, b) => a.toUpperCase() + b)
    .trim();
}

/** Infer a display category from the filename stem for wallpapers. */
function categorizeWallpaper(stem){
  const s = stem.toLowerCase();
  if (/silueta/.test(s)) return 'Siluetas';
  if (/arbol|pajaro|niebla|little_island|puerto_madero|postes_agua|puente/.test(s)) return 'Paisaje';
  if (/cck|fachada|ventanas_abstractas/.test(s)) return 'Arquitectura';
  // default: skyscrapers / buildings
  return 'Rascacielos';
}

/** Infer a display category for Redes / street photos. */
function categorizeFoto(stem){
  const s = stem.toLowerCase();
  if (/estatua|memorial|obelisco|torre_monumental|fuente_angel/.test(s)) return 'Estatuas';
  if (/flor|flores|cisne|gallina|arbol/.test(s)) return 'Flora & fauna';
  return 'Calle';
}

function titleOf(stem){ return humanize(stem); }

/** Deterministic ID from filename so repeat imports find the same row. */
function idFor(kind, stem){
  // kind abbreviation matches the "med_<abbr>_<ts>" convention used elsewhere
  const abbr = kind === 'wallpaper' ? 'wa' : 'fo';
  const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40);
  return `med_${abbr}_${slug}`;
}

async function main(){
  const wallpaperDir = path.join(uploadsDir, 'wallpapers');
  const ojoDir = path.join(uploadsDir, 'ojo');
  const wallpapers = fs.readdirSync(wallpaperDir).filter(n => /\.webp$/i.test(n));
  const ojo = fs.readdirSync(ojoDir).filter(n => /\.webp$/i.test(n));

  console.log(`Found ${wallpapers.length} wallpapers and ${ojo.length} fotos`);

  // Max existing sort_order so we append
  const [{ max: maxWp }] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max FROM media WHERE kind = 'wallpaper'`;
  const [{ max: maxFt }] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max FROM media WHERE kind = 'foto'`;
  let wpSort = Number(maxWp) + 1;
  let ftSort = Number(maxFt) + 1;

  let inserted = 0, skipped = 0;

  for (const file of wallpapers){
    const stem = file.replace(/^Wallpaper_/, '').replace(/\.webp$/i, '');
    const url = '/uploads/wallpapers/' + file;
    const existing = await sql`SELECT id FROM media WHERE media_url = ${url} LIMIT 1`;
    if (existing.length) { skipped++; continue; }
    const id = idFor('wallpaper', stem);
    await sql`
      INSERT INTO media (id, kind, title, description, category, media_url, cover_image, duration, is_locked, active, featured, sort_order, created_at)
      VALUES (
        ${id}, 'wallpaper', ${titleOf(stem)}, ${null}, ${categorizeWallpaper(stem)},
        ${url}, ${url}, ${'4K · 2160×3840'},
        ${0}, ${1}, ${0}, ${wpSort++}, ${new Date().toISOString()}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    inserted++;
  }

  for (const file of ojo){
    const stem = file.replace(/^Redes_/, '').replace(/\.webp$/i, '');
    const url = '/uploads/ojo/' + file;
    const existing = await sql`SELECT id FROM media WHERE media_url = ${url} LIMIT 1`;
    if (existing.length) { skipped++; continue; }
    const id = idFor('foto', stem);
    await sql`
      INSERT INTO media (id, kind, title, description, category, media_url, cover_image, duration, is_locked, active, featured, sort_order, created_at)
      VALUES (
        ${id}, 'foto', ${titleOf(stem)}, ${null}, ${categorizeFoto(stem)},
        ${url}, ${url}, ${null},
        ${0}, ${1}, ${0}, ${ftSort++}, ${new Date().toISOString()}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    inserted++;
  }

  console.log(`Inserted ${inserted}, skipped ${skipped} (already present)`);
  const counts = await sql`SELECT kind, category, COUNT(*) FROM media WHERE kind IN ('foto','wallpaper') GROUP BY kind, category ORDER BY kind, category`;
  console.table(counts);
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
