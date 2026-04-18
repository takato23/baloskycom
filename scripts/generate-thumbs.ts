import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import postgres from 'postgres';

type MediaRow = {
  id: string;
  kind: 'foto' | 'wallpaper';
  media_url: string;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sql = postgres(databaseUrl, { prepare: false });
const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const imageExt = /\.(avif|gif|jpe?g|png|webp)$/i;

function toAbsolutePublicPath(mediaUrl: string) {
  return path.join(publicDir, mediaUrl.replace(/^\/+/, ''));
}

function toThumbUrl(mediaUrl: string) {
  const relative = mediaUrl.replace(/^\/uploads\//, '');
  const dir = path.posix.dirname(relative);
  const base = path.posix.basename(relative, path.posix.extname(relative));
  return `/${path.posix.join('uploads', 'thumbs', dir === '.' ? '' : dir, `${base}.webp`)}`;
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function generateThumb(row: MediaRow) {
  const sourcePath = toAbsolutePublicPath(row.media_url);
  const thumbUrl = toThumbUrl(row.media_url);
  const thumbPath = toAbsolutePublicPath(thumbUrl);

  await ensureDir(thumbPath);
  await sharp(sourcePath)
    .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  await sql`
    UPDATE media
    SET thumb_url = ${thumbUrl}
    WHERE id = ${row.id}
  `;

  return { ...row, thumbUrl };
}

async function main() {
  await sql`ALTER TABLE media ADD COLUMN IF NOT EXISTS thumb_url TEXT`;

  const rows = await sql<MediaRow[]>`
    SELECT id, kind, media_url
    FROM media
    WHERE kind IN ('foto', 'wallpaper')
      AND thumb_url IS NULL
      AND media_url IS NOT NULL
    ORDER BY
      CASE kind
        WHEN 'foto' THEN 0
        WHEN 'wallpaper' THEN 1
        ELSE 2
      END,
      sort_order ASC,
      created_at ASC
  `;

  const localRows = rows.filter((row) => row.media_url.startsWith('/uploads/') && imageExt.test(row.media_url));
  const remoteSkipped = rows.length - localRows.length;

  let generated = 0;
  for (const row of localRows) {
    await generateThumb(row);
    generated += 1;
    console.log(`thumb ${generated}/${localRows.length} → ${row.kind} ${row.id}`);
  }

  console.log(`generated: ${generated}`);
  console.log(`skipped-remote-or-non-image: ${remoteSkipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
