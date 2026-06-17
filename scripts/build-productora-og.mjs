#!/usr/bin/env node
/**
 * Genera dist/productora.html: el mismo SPA shell que dist/index.html pero
 * con <title> y los tags og:/twitter: reescritos para la landing comercial.
 *
 * ¿Por qué existe? Los crawlers de WhatsApp/Slack/Twitter no ejecutan JS,
 * y en Vercel `/productora` se sirve como archivo estático (la ruta Express
 * de server.ts que inyecta esto en dev/self-hosted no corre en serverless,
 * porque el bundle de la función excluye dist/**). vercel.json rutea
 * /productora → /productora.html.
 *
 * Mantener las reescrituras en sync con injectProductoraOg() en server.ts.
 */

import fs from 'fs';
import path from 'path';

const dist = path.resolve(process.cwd(), 'dist');
const srcHtml = path.join(dist, 'index.html');
const outHtml = path.join(dist, 'productora.html');

const TITLE = 'Balosky Productora — video para marcas';
const DESCRIPTION =
  'Spots, trailers y piezas con IA para marcas. 223K seguidores, piezas de hasta 5.5M de views. Pensados para el feed: enganchan en segundos y se entienden sin sonido.';

let html = fs.readFileSync(srcHtml, 'utf-8');

html = html
  .replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
  .replace(/(<meta\s+name="description"[\s\S]*?content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/(property="og:title" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(<meta\s+property="og:description"[\s\S]*?content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/(property="og:url" content=")[^"]*(")/, '$1https://balosky.com/productora$2')
  .replace(/(property="og:image:alt" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(name="twitter:title" content=")[^"]*(")/, `$1${TITLE}$2`)
  .replace(/(name="twitter:description" content=")[^"]*(")/, `$1${DESCRIPTION}$2`)
  .replace(/og-card\.jpg/g, 'og-productora.jpg');

html = /<link\s+rel="canonical"/.test(html)
  ? html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, '$1https://balosky.com/productora$2')
  : html.replace(/(<meta\s+property="og:url"[^>]*>)/, '$1\n    <link rel="canonical" href="https://balosky.com/productora" />');

fs.writeFileSync(outHtml, html);
console.log('[build-productora-og] dist/productora.html generado con OG propio');
