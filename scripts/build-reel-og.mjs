#!/usr/bin/env node
/**
 * Genera dist/reel.html: el mismo SPA shell que dist/index.html pero con
 * <title> y los tags og:/twitter: reescritos para el showreel.
 *
 * Mismo motivo que build-productora-og.mjs: los crawlers de WhatsApp/Slack
 * no ejecutan JS, y en Vercel la ruta Express de server.ts no corre en
 * serverless. vercel.json rutea /reel → /reel.html.
 *
 * Mantener en sync con REEL_META en server.ts.
 */

import fs from 'fs';
import path from 'path';

const dist = path.resolve(process.cwd(), 'dist');
const srcHtml = path.join(dist, 'index.html');
const outHtml = path.join(dist, 'reel.html');

const TITLE = 'Showreel — Santi Balosky, creativo IA';
const DESCRIPTION =
  'El reel: spots, campañas y piezas con IA en un minuto. Si te cierra el tono, hablamos.';

let html = fs.readFileSync(srcHtml, 'utf-8');

html = html
  .replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
  .replace(/(<meta\s+name="description"[\s\S]*?content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/(property="og:title" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(<meta\s+property="og:description"[\s\S]*?content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/(property="og:url" content=")[^"]*(")/, '$1https://balosky.com/reel$2')
  .replace(/(property="og:image:alt" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(name="twitter:title" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(name="twitter:description" content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/og-card\.jpg/g, 'og-productora.jpg');

fs.writeFileSync(outHtml, html);
console.log('[build-reel-og] dist/reel.html generado con OG propio');
