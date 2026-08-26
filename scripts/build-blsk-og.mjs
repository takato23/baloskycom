#!/usr/bin/env node
/**
 * Genera el OG card de `/productora` en la marca BLSK.
 *
 * El card viejo (`public/og-productora.jpg`) es naranja BALOSKY y dice
 * "SANTI BALOSKY · CREATIVO IA": desde el rebrand contradice al propio texto
 * del card. Este arma el reemplazo respetando el manual (docs/blsk-marca.md):
 * base negra, tipografía marfil, wordmark en maestra mono y **una sola señal**
 * — el punto final del titular, que es el gesto que el manual habilita
 * explícitamente ("en piezas señal ese punto final puede ser rojo").
 *
 * No se renderiza acá: `sharp`/librsvg no tiene Inter Tight ni IBM Plex Mono
 * instaladas y saldría con la tipografía equivocada. El flujo es:
 *
 *   1. node scripts/build-blsk-og.mjs html <out.html>   → arma el HTML
 *   2. abrirlo en un navegador a 1200x630 y capturar     → PNG
 *   3. node scripts/build-blsk-og.mjs jpg <in.png> <out.jpg>
 *
 * El paso 2 usa un navegador de verdad para que las fuentes vengan de Google
 * Fonts. El HTML es autocontenido (el logo va embebido en base64), así que se
 * puede abrir con doble click para revisar el diseño.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const LOGO = path.join(root, 'public/brand/blsk/svg/BLSK_primary_white_mono.svg');

// Copy del card original: se conserva tal cual, sólo cambia el sistema visual.
const LINES = ['video que', 'la gente mira'];
const OUTLINE_LINE = 'hasta el final';
const PILL = 'disponible para proyectos';
const FOOT_LEFT = 'balosky.com/productora';
const FOOT_RIGHT = 'campañas · spots · ia';

function buildHtml() {
  const logo = fs.readFileSync(LOGO).toString('base64');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@900&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />
<style>
  /* Paleta BLSK. — docs/blsk-marca.md */
  :root {
    --black: #0a0a0a;
    --ivory: #f3f0e8;
    --signal: #ff3b1f;
    --grey: #8f8f8f;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: var(--black);
    color: var(--ivory);
    padding: 68px 72px 60px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    -webkit-font-smoothing: antialiased;
  }
  .top { display: flex; align-items: center; justify-content: space-between; }
  /* Maestra mono: la señal de esta pieza es el punto del titular, así que el
     logo no puede ser la versión señal (precedencia del manual). */
  .logo { height: 44px; width: auto; display: block; }
  .pill {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(243, 240, 232, 0.86);
    border: 1px solid rgba(243, 240, 232, 0.3);
    border-radius: 999px;
    padding: 11px 22px;
  }
  h1 {
    font-family: 'Inter Tight', system-ui, sans-serif;
    font-weight: 900;
    font-size: 132px;
    line-height: 0.87;
    letter-spacing: -0.045em;
  }
  /* Contorno: el mismo recurso que el wordmark de cierre del sitio. */
  .outline {
    color: transparent;
    -webkit-text-stroke: 2.5px var(--ivory);
  }
  /* LA señal. Una sola en toda la pieza. */
  .dot { color: var(--signal); -webkit-text-stroke: 0; }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--grey);
  }
</style>
</head>
<body>
  <div class="top">
    <img class="logo" src="data:image/svg+xml;base64,${logo}" alt="BLSK." />
    <span class="pill">${PILL}</span>
  </div>

  <h1>${LINES.map((l) => `<div>${l}</div>`).join('\n    ')}
    <div class="outline">${OUTLINE_LINE}<span class="dot">.</span></div>
  </h1>

  <div class="foot">
    <span>${FOOT_LEFT}</span>
    <span>${FOOT_RIGHT}</span>
  </div>

  <script>
    // Marca cuando las fuentes terminaron de cargar, para no capturar el FOUT.
    document.fonts.ready.then(() => document.documentElement.setAttribute('data-ready', '1'));
  </script>
</body>
</html>
`;
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'html') {
  const out = rest[0] || path.join(root, 'og-blsk.html');
  fs.writeFileSync(out, buildHtml());
  console.log(out);
} else if (cmd === 'jpg') {
  const [src, dest] = rest;
  if (!src || !dest) throw new Error('uso: build-blsk-og.mjs jpg <in.png> <out.jpg>');
  const { default: sharp } = await import('sharp');
  await sharp(src).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(dest);
  console.log(`${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
} else {
  console.error('uso: build-blsk-og.mjs html <out.html> | jpg <in.png> <out.jpg>');
  process.exit(1);
}
