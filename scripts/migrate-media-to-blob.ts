/**
 * Migra los archivos pesados de /public a Vercel Blob.
 *
 * Uso:
 *   1. Instalar SDK:  npm i -D @vercel/blob
 *   2. En Vercel dashboard -> Storage -> Create Blob Store (si no tenés uno).
 *   3. Connect Project, y copiá el token BLOB_READ_WRITE_TOKEN a .env.local
 *   4. Correr:  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx npx tsx scripts/migrate-media-to-blob.ts
 *
 * El script sube los archivos y imprime al final:
 *   - Las nuevas URLs (https://xxxxx.public.blob.vercel-storage.com/...)
 *   - Un SQL UPDATE para la fila de Supabase que tiene mediaUrl
 *   - Los comandos `sed` para parchar AgendaPublica.tsx y db.ts
 *
 * Idempotente: si ya existe un blob con el mismo path, lo reemplaza (allowOverwrite).
 */

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { put } from '@vercel/blob';

const ROOT = join(import.meta.dirname, '..');

// Cargar .env.local primero (preferido) y caer a .env
loadEnv({ path: join(ROOT, '.env.local') });
loadEnv({ path: join(ROOT, '.env') });

type FileSpec = {
  localPath: string;      // relativo a la raíz del repo
  blobKey: string;        // key dentro del blob store
  oldPublicUrl: string;   // URL que hay que reemplazar en el código/DB
  contentType: string;
};

const FILES: FileSpec[] = [
  {
    localPath: 'public/uploads/videos/balosky-molinete-conurbano.mp4',
    blobKey: 'videos/balosky-molinete-conurbano.mp4',
    oldPublicUrl: '/uploads/videos/balosky-molinete-conurbano.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'public/uploads/2026/04/harry-potter-argento.mp4',
    blobKey: 'videos/harry-potter-argento.mp4',
    oldPublicUrl: '/uploads/2026/04/harry-potter-argento.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'public/agenda-publica/media/attention-machine-en.mp4',
    blobKey: 'agenda-publica/attention-machine-en.mp4',
    oldPublicUrl: '/agenda-publica/media/attention-machine-en.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'public/agenda-publica/media/attention-machine-es.mp4',
    blobKey: 'agenda-publica/attention-machine-es.mp4',
    oldPublicUrl: '/agenda-publica/media/attention-machine-es.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'public/agenda-publica/media/attention-machine-es.m4a',
    blobKey: 'agenda-publica/attention-machine-es.m4a',
    oldPublicUrl: '/agenda-publica/media/attention-machine-es.m4a',
    contentType: 'audio/mp4',
  },
  {
    localPath: 'public/agenda-publica/media/attention-machine-slides.pptx',
    blobKey: 'agenda-publica/attention-machine-slides.pptx',
    oldPublicUrl: '/agenda-publica/media/attention-machine-slides.pptx',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
];

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('ERROR: falta BLOB_READ_WRITE_TOKEN en el entorno.');
    console.error('   Obtenelo en Vercel dashboard -> Storage -> tu Blob Store -> .env.local');
    process.exit(1);
  }

  console.log(`Subiendo ${FILES.length} archivos a Vercel Blob...\n`);

  const results: Array<{ spec: FileSpec; newUrl: string; size: number }> = [];

  for (const spec of FILES) {
    const absPath = join(ROOT, spec.localPath);

    try {
      const info = await stat(absPath);
      process.stdout.write(`  ${spec.blobKey} (${formatBytes(info.size)})... `);

      const buf = await readFile(absPath);
      const { url } = await put(spec.blobKey, buf, {
        access: 'public',
        contentType: spec.contentType,
        allowOverwrite: true,
        addRandomSuffix: false,
      });

      console.log('OK');
      results.push({ spec, newUrl: url, size: info.size });
    } catch (err: any) {
      console.log(`FAIL (${err?.message ?? err})`);
    }
  }

  console.log('\n==============================================');
  console.log('RESUMEN DE UPLOAD');
  console.log('==============================================\n');
  for (const r of results) {
    console.log(`${r.spec.oldPublicUrl}`);
    console.log(`  -> ${r.newUrl}`);
    console.log(`  (${formatBytes(r.size)})\n`);
  }

  console.log('==============================================');
  console.log('PASO 1 — SQL para Supabase');
  console.log('==============================================');
  console.log('Pegá esto en el SQL Editor de Supabase:\n');
  for (const r of results) {
    const likePattern = r.spec.oldPublicUrl.replace(/'/g, "''");
    const newUrl = r.newUrl.replace(/'/g, "''");
    console.log(
      `UPDATE campaigns SET "mediaUrl" = '${newUrl}' WHERE "mediaUrl" = '${likePattern}';`
    );
    console.log(
      `UPDATE products  SET "mediaUrl" = '${newUrl}' WHERE "mediaUrl" = '${likePattern}';`
    );
  }

  console.log('\n==============================================');
  console.log('PASO 2 — Comandos sed para el código');
  console.log('==============================================');
  console.log('Correlos desde la raíz del repo:\n');
  for (const r of results) {
    const from = r.spec.oldPublicUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const to = r.newUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    console.log(
      `grep -rl "${r.spec.oldPublicUrl}" src/ | xargs sed -i '' 's|${from}|${to}|g'`
    );
  }

  console.log('\n==============================================');
  console.log('PASO 3 — Commit y push');
  console.log('==============================================');
  console.log('git add -A && git commit -m "media: migrate big files to Vercel Blob" && git push\n');

  console.log('Listo. Vercel re-deployará automáticamente.');
}

main().catch((err) => {
  console.error('Fallo:', err);
  process.exit(1);
});
