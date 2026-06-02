/**
 * Genera un depth map pseudo-real a partir del portrait frontal.
 *
 * El portrait ya tiene fondo oscuro y uniforme, así que la luminancia es
 * un buen proxy de profundidad. Pero aplicada cruda, la camiseta queda
 * tan cerca como la cara. Para arreglar eso, componemos dos pasadas:
 *
 *   A) Luminancia desaturada + contraste + blur (detalle general).
 *   B) Mask radial centrada en la cara (cabeza=1, pies=0) — baja los
 *      hombros hacia atrás.
 *
 * Resultado final = A * B, normalizado. Así la cara queda más adelante
 * que la camiseta, y la camiseta más adelante que el fondo.
 *
 * Uso:
 *   node scripts/_make-hero-depth.mjs
 */

import sharp from 'sharp';
import path from 'path';

const IN = path.resolve('public/uploads/thumbs/balosky-portrait-frente.png');
const OUT = path.resolve('public/uploads/thumbs/balosky-portrait-frente-depth.png');

// Tamaño trabajo: max 800px. Suficiente para el displacement, más chico
// significa blur estable y archivo liviano.
const TARGET_WIDTH = 800;

const srcMeta = await sharp(IN).metadata();
console.log('input:', srcMeta.width, 'x', srcMeta.height);

// A) Luminancia limpiada.
const lumBuffer = await sharp(IN)
  .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
  .greyscale()
  .linear(1.35, -32) // sube contraste y baja el negro base
  .blur(12)
  .normalise()
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data: lumData, info: lumInfo } = lumBuffer;
const W = lumInfo.width;
const H = lumInfo.height;
console.log('luminance pass:', W, 'x', H);

// B) Mask radial centrada en la cara. En este portrait la cara está
// alrededor de y=38% (un pelín arriba del centro). El falloff es
// cuadrático suave: cabeza=1, bordes=0.
const cx = W * 0.5;
const cy = H * 0.38;
const maxR = Math.sqrt(
  Math.max(cx, W - cx) ** 2 + Math.max(cy, H - cy) ** 2,
);

const radial = Buffer.allocUnsafe(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy) / maxR;
    // Falloff: 1 en el centro, ~0 en los bordes. El 1.15 achica un poco
    // el "círculo" de la cara. Curva cuadrática para que decaiga más
    // rápido que lineal.
    const v = Math.max(0, 1 - Math.min(1, r * 1.15));
    radial[y * W + x] = Math.round(v * v * 255);
  }
}

// Composite: lumData * radial / 255 (el >>8 es aprox /256, barato).
const composed = Buffer.allocUnsafe(W * H);
for (let i = 0; i < W * H; i++) {
  composed[i] = (lumData[i] * radial[i]) >> 8;
}

// Final: un último blur corto que suaviza artefactos del multiplicado,
// normalise para estirar el rango, y PNG single-channel.
await sharp(composed, { raw: { width: W, height: H, channels: 1 } })
  .blur(4)
  .normalise()
  .png()
  .toFile(OUT);

const outMeta = await sharp(OUT).metadata();
console.log('output:', outMeta.width, 'x', outMeta.height, '→', OUT);
