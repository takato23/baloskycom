import fs from 'fs';
import path from 'path';

const distRoot = path.resolve(process.cwd(), 'dist');

const pruneTargets = [
  'uploads/videos',
  'uploads/3d',
  'uploads/2026',
  'uploads/ojo',
  'uploads/wallpapers',
  'uploads/thumbs/ojo',
  'uploads/thumbs/wallpapers',
  'agenda-publica/media',
];

let removed = 0;

for (const target of pruneTargets) {
  const fullPath = path.join(distRoot, target);
  if (!fullPath.startsWith(distRoot + path.sep)) {
    throw new Error(`Refusing to prune outside dist: ${target}`);
  }
  if (!fs.existsSync(fullPath)) continue;
  fs.rmSync(fullPath, { recursive: true, force: true });
  removed += 1;
}

console.log(`[prune-dist-public] removed ${removed} heavy public asset path(s) from dist`);
