import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const ojoDir = path.join(publicDir, 'uploads', 'ojo');

async function pickSourceImage() {
  const files = (await fs.readdir(ojoDir))
    .filter((file) => /\.(avif|jpe?g|png|webp)$/i.test(file))
    .sort();

  if (!files.length) {
    throw new Error(`No source images found in ${ojoDir}`);
  }

  return path.join(ojoDir, files[0]);
}

function ogOverlaySvg() {
  return Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(10,9,8,0.18)"/>
          <stop offset="100%" stop-color="rgba(10,9,8,0.74)"/>
        </linearGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#FA5D29"/>
          <stop offset="100%" stop-color="#F02E65"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#wash)"/>
      <rect x="58" y="56" width="228" height="14" rx="7" fill="url(#line)"/>
      <rect x="58" y="492" width="1084" height="88" rx="24" fill="rgba(10,9,8,0.62)"/>
      <text x="58" y="294" fill="#F3EFE6" font-family="Inter Tight, Inter, sans-serif" font-size="132" font-weight="900" letter-spacing="-5">
        BALOSKY
      </text>
      <text x="62" y="355" fill="#FA5D29" font-family="Inter, sans-serif" font-size="32" font-weight="600">
        donde termina el feed, empezamos nosotros
      </text>
      <text x="86" y="545" fill="#F3EFE6" font-family="Inter, sans-serif" font-size="28" font-weight="600">
        Fotos, música, wallpapers y apoyo directo.
      </text>
    </svg>
  `);
}

function iconOverlaySvg(size: number) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="rgba(10,9,8,0.18)"/>
      <rect x="${Math.round(size * 0.12)}" y="${Math.round(size * 0.12)}" width="${Math.round(size * 0.76)}" height="${Math.round(size * 0.76)}" rx="${Math.round(size * 0.2)}" fill="rgba(10,9,8,0.46)" stroke="rgba(243,239,230,0.16)" />
      <text x="50%" y="58%" text-anchor="middle" fill="#FA5D29" font-family="Inter Tight, Inter, sans-serif" font-size="${Math.round(size * 0.46)}" font-weight="900">B</text>
    </svg>
  `);
}

async function buildOgAssets() {
  const sourcePath = await pickSourceImage();
  const base = sharp(sourcePath);

  await base
    .clone()
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .composite([{ input: ogOverlaySvg() }])
    .jpeg({ quality: 88 })
    .toFile(path.join(publicDir, 'og-card.jpg'));

  await base
    .clone()
    .resize(32, 32, { fit: 'cover', position: 'centre' })
    .composite([{ input: iconOverlaySvg(32) }])
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));

  await base
    .clone()
    .resize(180, 180, { fit: 'cover', position: 'centre' })
    .composite([{ input: iconOverlaySvg(180) }])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log(`OG/icon assets built from ${path.basename(sourcePath)}`);
}

buildOgAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
