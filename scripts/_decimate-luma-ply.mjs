/**
 * Decimador de PLY para el scan de Luma.
 *
 * El .ply crudo que tira Luma Genie tiene 1.5M vértices y 3.1M caras (~82MB),
 * inmanejable para un hero web. Este script lo comprime con vertex-clustering:
 *
 *   1) Leemos el header y los bloques binarios.
 *   2) Calculamos AABB y dividimos en grid 3D (ej. 96^3 celdas).
 *   3) Cada vértice → celda. Vértices en la misma celda se promedian
 *      (posición y color).
 *   4) Remapeamos faces al nuevo índice de vértice. Caras donde los 3
 *      vértices colapsaron en la misma celda (degeneradas) se tiran.
 *   5) Re-escribimos PLY binario (float32 en vez de double, más liviano).
 *
 * Ejecutar:
 *   node scripts/_decimate-luma-ply.mjs
 *
 * Input:  public/uploads/3d/balosky-luma-scan-raw.ply
 * Output: public/uploads/3d/balosky-luma-scan.ply
 *
 * Tuning: bajar GRID_SIZE si querés menos vértices (y más chico).
 */

import fs from 'fs';
import path from 'path';

const IN = path.resolve('public/uploads/3d/balosky-luma-scan-raw.ply');
const OUT = path.resolve('public/uploads/3d/balosky-luma-scan.ply');
const GRID_SIZE = 96; // ~96^3 ≈ 880k celdas. Experimentar.

const raw = fs.readFileSync(IN);
console.log('input size:', (raw.length / 1e6).toFixed(1), 'MB');

// --- Parse header ---
const headerEnd = raw.indexOf(Buffer.from('end_header\n'));
if (headerEnd < 0) throw new Error('no end_header');
const headerTxt = raw.slice(0, headerEnd).toString('utf8');
const headerLen = headerEnd + 'end_header\n'.length;

const vMatch = /element vertex (\d+)/.exec(headerTxt);
const fMatch = /element face (\d+)/.exec(headerTxt);
if (!vMatch || !fMatch) throw new Error('header missing vertex/face count');
const nV = parseInt(vMatch[1], 10);
const nF = parseInt(fMatch[1], 10);
console.log('vertices:', nV, ' faces:', nF);

// Layout asumido (el scan de Luma/Open3D):
//   vertex: double x, double y, double z, uchar r, g, b  (8+8+8+1+1+1 = 27 bytes)
//   face:   uchar count(=3), uint i0, i1, i2             (1 + 4*3 = 13 bytes)
const V_STRIDE = 27;
const F_STRIDE = 13;
const vStart = headerLen;
const fStart = vStart + nV * V_STRIDE;
if (fStart + nF * F_STRIDE !== raw.length) {
  console.warn('⚠ tamaño no matchea layout asumido. revisar header:');
  console.warn(headerTxt);
}

// --- Leer vértices ---
const positions = new Float64Array(nV * 3);
const colors = new Uint8Array(nV * 3);
for (let i = 0; i < nV; i++) {
  const off = vStart + i * V_STRIDE;
  positions[i * 3 + 0] = raw.readDoubleLE(off + 0);
  positions[i * 3 + 1] = raw.readDoubleLE(off + 8);
  positions[i * 3 + 2] = raw.readDoubleLE(off + 16);
  colors[i * 3 + 0] = raw[off + 24];
  colors[i * 3 + 1] = raw[off + 25];
  colors[i * 3 + 2] = raw[off + 26];
}

// --- AABB ---
let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (let i = 0; i < nV; i++) {
  const x = positions[i * 3];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}
console.log('aabb x:', minX.toFixed(2), maxX.toFixed(2));
console.log('aabb y:', minY.toFixed(2), maxY.toFixed(2));
console.log('aabb z:', minZ.toFixed(2), maxZ.toFixed(2));

// Tamaño de celda = lado_max / GRID_SIZE. Misma celda en todos los ejes.
const sx = maxX - minX, sy = maxY - minY, sz = maxZ - minZ;
const side = Math.max(sx, sy, sz);
const cell = side / GRID_SIZE;
console.log('cell size:', cell.toFixed(4));

// --- Asignar cada vértice a una celda y acumular promedio ---
// Key: ix * G^2 + iy * G + iz (G grande para que no haya overflow con 96^3 < 2^31)
const G = GRID_SIZE + 2;
const bucket = new Map(); // key -> { sumX, sumY, sumZ, sumR, sumG, sumB, n, newIndex }

for (let i = 0; i < nV; i++) {
  const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
  const ix = Math.min(GRID_SIZE, Math.floor((x - minX) / cell));
  const iy = Math.min(GRID_SIZE, Math.floor((y - minY) / cell));
  const iz = Math.min(GRID_SIZE, Math.floor((z - minZ) / cell));
  const key = ix * G * G + iy * G + iz;
  let b = bucket.get(key);
  if (!b) {
    b = { sx: 0, sy: 0, sz: 0, sr: 0, sg: 0, sb: 0, n: 0, idx: -1 };
    bucket.set(key, b);
  }
  b.sx += x; b.sy += y; b.sz += z;
  b.sr += colors[i * 3]; b.sg += colors[i * 3 + 1]; b.sb += colors[i * 3 + 2];
  b.n += 1;
}

// Map: vId viejo -> vId nuevo
const vertexMap = new Int32Array(nV);
let newVCount = 0;
for (let i = 0; i < nV; i++) {
  const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
  const ix = Math.min(GRID_SIZE, Math.floor((x - minX) / cell));
  const iy = Math.min(GRID_SIZE, Math.floor((y - minY) / cell));
  const iz = Math.min(GRID_SIZE, Math.floor((z - minZ) / cell));
  const key = ix * G * G + iy * G + iz;
  const b = bucket.get(key);
  if (b.idx < 0) b.idx = newVCount++;
  vertexMap[i] = b.idx;
}

const newPos = new Float32Array(newVCount * 3);
const newCol = new Uint8Array(newVCount * 3);
for (const b of bucket.values()) {
  if (b.idx < 0) continue;
  const invN = 1 / b.n;
  newPos[b.idx * 3 + 0] = b.sx * invN;
  newPos[b.idx * 3 + 1] = b.sy * invN;
  newPos[b.idx * 3 + 2] = b.sz * invN;
  newCol[b.idx * 3 + 0] = Math.round(b.sr * invN);
  newCol[b.idx * 3 + 1] = Math.round(b.sg * invN);
  newCol[b.idx * 3 + 2] = Math.round(b.sb * invN);
}
console.log('vertices colapsados:', nV, '→', newVCount,
  `(${((1 - newVCount / nV) * 100).toFixed(1)}% menos)`);

// --- Remap faces, descartar degeneradas y duplicadas ---
const newFaces = []; // flat [i0,i1,i2, i0,i1,i2, ...]
const seenTri = new Set();
for (let f = 0; f < nF; f++) {
  const off = fStart + f * F_STRIDE;
  const count = raw[off];
  if (count !== 3) continue; // esperamos triangulado
  const i0 = raw.readUInt32LE(off + 1);
  const i1 = raw.readUInt32LE(off + 5);
  const i2 = raw.readUInt32LE(off + 9);
  const a = vertexMap[i0], b = vertexMap[i1], c = vertexMap[i2];
  if (a === b || b === c || a === c) continue; // degenerada
  // Dedup (triangulos que colapsaron al mismo set)
  const key = a < b
    ? (a < c ? `${a}|${Math.min(b, c)}|${Math.max(b, c)}` : `${c}|${a}|${b}`)
    : (b < c ? `${b}|${Math.min(a, c)}|${Math.max(a, c)}` : `${c}|${Math.min(a, b)}|${Math.max(a, b)}`);
  if (seenTri.has(key)) continue;
  seenTri.add(key);
  newFaces.push(a, b, c);
}
const newFCount = newFaces.length / 3;
console.log('faces:', nF, '→', newFCount,
  `(${((1 - newFCount / nF) * 100).toFixed(1)}% menos)`);

// --- Escribir PLY de salida (float32 + color por vértice) ---
const outHeader =
  'ply\n' +
  'format binary_little_endian 1.0\n' +
  'comment Decimated from Luma scan via vertex-clustering\n' +
  `comment grid=${GRID_SIZE} source=${path.basename(IN)}\n` +
  `element vertex ${newVCount}\n` +
  'property float x\n' +
  'property float y\n' +
  'property float z\n' +
  'property uchar red\n' +
  'property uchar green\n' +
  'property uchar blue\n' +
  `element face ${newFCount}\n` +
  'property list uchar uint vertex_indices\n' +
  'end_header\n';

const OUT_V_STRIDE = 4 * 3 + 1 * 3; // 15
const OUT_F_STRIDE = 1 + 4 * 3; // 13
const outBuf = Buffer.alloc(
  Buffer.byteLength(outHeader, 'utf8') + newVCount * OUT_V_STRIDE + newFCount * OUT_F_STRIDE,
);
outBuf.write(outHeader, 0, 'utf8');
let p = Buffer.byteLength(outHeader, 'utf8');
for (let i = 0; i < newVCount; i++) {
  outBuf.writeFloatLE(newPos[i * 3], p); p += 4;
  outBuf.writeFloatLE(newPos[i * 3 + 1], p); p += 4;
  outBuf.writeFloatLE(newPos[i * 3 + 2], p); p += 4;
  outBuf[p++] = newCol[i * 3];
  outBuf[p++] = newCol[i * 3 + 1];
  outBuf[p++] = newCol[i * 3 + 2];
}
for (let f = 0; f < newFCount; f++) {
  outBuf[p++] = 3;
  outBuf.writeUInt32LE(newFaces[f * 3], p); p += 4;
  outBuf.writeUInt32LE(newFaces[f * 3 + 1], p); p += 4;
  outBuf.writeUInt32LE(newFaces[f * 3 + 2], p); p += 4;
}

fs.writeFileSync(OUT, outBuf);
const outSize = fs.statSync(OUT).size;
console.log('output:', (outSize / 1e6).toFixed(2), 'MB', '→', OUT);
