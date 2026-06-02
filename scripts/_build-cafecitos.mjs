#!/usr/bin/env node
/**
 * Genera src/content/cafecitos.ts y public/cafecitos.json a partir de
 * data/cafecitos.csv (export real de cafecito.app — @santiagobalosky).
 *
 * Por qué es build-time y no runtime:
 *  · el CSV son 48KB y tiene ruido (filas anónimas, mensajes con "Gracias por
 *    tu aporte" genérico que auto-completa cafecito.app, caracteres raros);
 *  · el procesado (normalización, agregación por nombre, filtro, cap de
 *    caracteres) no cambia entre renders;
 *  · así el bundle / la home estática sólo llevan los datos ya limpios, no el
 *    CSV crudo ni el parser.
 *
 * Rebuildear: `node scripts/_build-cafecitos.mjs`
 *
 * Lo que genera:
 *  · CAFECITOS_TOP: top 10 nombres por plata total, con rótulo de "kind" según
 *    el tamaño del aporte (CAFECITO / ÓRBITA / DISCO / ENCARGO).
 *  · CAFECITOS_FEED: mensajes con texto sustancioso (nombre no vacío,
 *    mensaje > 15 caracteres, no spam de "Gracias por tu aporte"), ordenados
 *    por fecha desc, con timestamp humanizado ("Hace X").
 *  · CAFECITOS_TOTAL_COUNT / CAFECITOS_TOTAL_AMOUNT: para mostrar stats reales
 *    en el muro o donde sea.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'data', 'cafecitos.csv');
const OUT_PATH = join(ROOT, 'src', 'content', 'cafecitos.ts');
const OUT_JSON_PATH = join(ROOT, 'public', 'cafecitos.json');

/** Parser CSV mínimo — comillas dobles, escape "" dentro de campo, saltos de
 *  línea dentro de campo respetados. No usamos papaparse porque el build no
 *  debería depender de node_modules. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // ignore
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "$ 1.999,00" → 1999 (solo pesos enteros). */
function parseARS(s) {
  if (!s) return 0;
  const clean = s.replace(/[^\d,]/g, '').replace(',', '.');
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** "22/04/2026 13:48" → Date (hora local AR). */
function parseDate(s) {
  if (!s) return null;
  const [d, t] = s.split(' ');
  if (!d) return null;
  const [dd, mm, yyyy] = d.split('/').map(Number);
  const [hh, min] = (t ?? '00:00').split(':').map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, hh || 0, min || 0);
}

/** Mensajes genéricos autogenerados por cafecito.app — son ruido. */
const GENERIC_MESSAGES = new Set([
  'gracias por tu aporte',
  'gracias por tu aporte!',
  'gracias por tu aporte ',
  'genio',
  'crack',
  'groso',
  '',
]);

function isGeneric(msg) {
  const normalized = msg.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return true;
  if (GENERIC_MESSAGES.has(normalized)) return true;
  if (normalized.length < 16) return true;
  return false;
}

/** En cafecito.app todo entra como "cafecito". No hay ENCARGO / DISCO /
 *  ÓRBITA — eso lo inventé yo y Santi lo corrigió. Mostramos count compacto
 *  con emoji: "× 170 ☕". Tipográficamente limpio, informativo
 *  (cuántos aportes distintos acumuló esa persona) y honesto. */
function describeUnits(qtyTotal) {
  if (qtyTotal <= 1) return '× 1 ☕';
  return `× ${qtyTotal} ☕`;
}

function formatK(amount) {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `$${amount}`;
}

function humanizeAgo(date, now) {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `Hace ${diffD} d`;
  const diffMo = Math.round(diffD / 30);
  return `Hace ${diffMo} mes${diffMo > 1 ? 'es' : ''}`;
}

// ── Main ──────────────────────────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);
const [header, ...data] = rows;
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const records = data
  .filter((r) => r.length >= header.length)
  .map((r) => ({
    name: (r[idx['Nombre']] ?? '').trim(),
    message: (r[idx['Mensaje']] ?? '').trim(),
    qty: Number.parseInt(r[idx['Cantidad']] ?? '0', 10) || 0,
    total: parseARS(r[idx['Total']] ?? ''),
    date: parseDate(r[idx['Fecha']] ?? ''),
  }))
  .filter((r) => r.total > 0);

// ── Top leaderboard: agregar por nombre, ignorar anónimos ──────────────────
const byName = new Map();
for (const r of records) {
  if (!r.name) continue; // anónimos no van al top público
  const key = r.name.toLowerCase();
  const prev = byName.get(key) ?? { name: r.name, total: 0, count: 0, qtySum: 0 };
  prev.total += r.total;
  prev.count += 1;
  prev.qtySum += r.qty;
  byName.set(key, prev);
}

const topList = [...byName.values()]
  .sort((a, b) => b.total - a.total)
  .slice(0, 10)
  .map((r, i) => ({
    rank: String(i + 1).padStart(2, '0'),
    name: r.name,
    amt: formatK(r.total),
    kind: describeUnits(r.qtySum),
  }));

// ── Feed: mensajes con chicha, ordenados por fecha desc ───────────────────
const now = new Date();
const feedCandidates = records
  .filter((r) => r.name && r.message && !isGeneric(r.message))
  .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
  .slice(0, 30)
  .map((r) => ({
    id: `cf_${r.date?.getTime() ?? Math.random().toString(36).slice(2)}`,
    name: r.name,
    amount: r.total,
    message: r.message.slice(0, 220),
    ago: r.date ? humanizeAgo(r.date, now) : 'Hace un tiempo',
  }));

// ── Stats agregadas ────────────────────────────────────────────────────────
const totalCount = records.length;
const totalAmount = records.reduce((acc, r) => acc + r.total, 0);
const uniqueSupporters = byName.size;

// ── Emitir TS ──────────────────────────────────────────────────────────────
const banner = `/**
 * ⚠️  ARCHIVO GENERADO — no editar a mano.
 * Se regenera con \`node scripts/_build-cafecitos.mjs\` leyendo data/cafecitos.csv
 * (export real de cafecito.app de @santiagobalosky).
 *
 * Genera: TOP leaderboard (agregado por nombre), FEED de mensajes reales con
 * chicha (sin "Gracias por tu aporte" genérico), totales.
 */`;

const ts = `${banner}

export type CafecitoTopRow = {
  rank: string;
  name: string;
  amt: string;
  /** Ej: "25 cafecitos" — cantidad real de cafecitos que mandó la persona.
   *  Antes acá iban labels inventados (ENCARGO / DISCO / ÓRBITA). */
  kind: string;
};

export type CafecitoFeedEntry = {
  id: string;
  name: string;
  amount: number;
  message: string;
  ago: string;
};

export const CAFECITOS_TOP: CafecitoTopRow[] = ${JSON.stringify(topList, null, 2)};

export const CAFECITOS_FEED: CafecitoFeedEntry[] = ${JSON.stringify(feedCandidates, null, 2)};

export const CAFECITOS_TOTAL_COUNT = ${totalCount};
export const CAFECITOS_TOTAL_AMOUNT = ${totalAmount};
export const CAFECITOS_UNIQUE_SUPPORTERS = ${uniqueSupporters};
`;

writeFileSync(OUT_PATH, ts);

const jsonPayload = {
  generatedAt: new Date().toISOString(),
  totalCount,
  totalAmount,
  uniqueSupporters,
  top: topList,
  feed: feedCandidates,
};
mkdirSync(dirname(OUT_JSON_PATH), { recursive: true });
writeFileSync(OUT_JSON_PATH, JSON.stringify(jsonPayload, null, 2) + '\n');

console.log(`[cafecitos] escritos ${OUT_PATH}`);
console.log(`[cafecitos] escritos ${OUT_JSON_PATH}`);
console.log(`  · registros parseados: ${records.length}`);
console.log(`  · nombres únicos: ${uniqueSupporters}`);
console.log(`  · total ARS: $${totalAmount.toLocaleString('es-AR')}`);
console.log(`  · TOP 10 filas: ${topList.length}`);
console.log(`  · FEED entries: ${feedCandidates.length}`);
