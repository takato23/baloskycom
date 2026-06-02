#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const output = process.env.OUTPUT || '';
const includeOk = process.env.INCLUDE_OK === '1';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

function absoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function probableCause(item) {
  const url = item.url || '';
  if (url.includes('/uploads/2026/04/')) {
    return 'DB points to local /uploads/2026/04 file that is not present in this checkout or deploy artifact.';
  }
  if (url.includes('.public.blob.vercel-storage.com')) {
    return 'Vercel Blob object is missing, private, or blocked.';
  }
  if (url.startsWith(baseUrl)) {
    return 'Local public asset missing or blocked by protected-asset guard.';
  }
  return 'Remote asset unavailable or blocked.';
}

async function headStatus(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return { status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const rows = await sql.unsafe(`
  SELECT id, kind, title, media_url, thumb_url, cover_image, is_locked, is_member_only, public_from
  FROM media
  WHERE active = 1
  ORDER BY kind ASC, sort_order ASC, created_at DESC
`);
await sql.end();

const checks = [];
for (const row of rows) {
  for (const field of ['media_url', 'thumb_url', 'cover_image']) {
    const rawUrl = row[field];
    if (!rawUrl) continue;
    checks.push({
      id: row.id,
      kind: row.kind,
      title: row.title,
      field,
      rawUrl,
      url: absoluteUrl(rawUrl),
      isLocked: Boolean(row.is_locked),
      isMemberOnly: Boolean(row.is_member_only),
      publicFrom: row.public_from || null,
    });
  }
}

const seen = new Set();
const uniqueChecks = checks.filter((item) => {
  const key = `${item.field}:${item.url}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const results = [];
for (const item of uniqueChecks) {
  const status = await headStatus(item.url);
  const result = {
    ...item,
    status: status.status,
    ok: status.ok,
    ...(status.error ? { error: status.error } : {}),
  };
  if (!result.ok) result.cause = probableCause(item);
  if (includeOk || !result.ok) results.push(result);
}

const missing = results.filter((r) => !r.ok);
const byKind = missing.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] || 0) + 1;
  return acc;
}, {});

const report = {
  baseUrl,
  checked: uniqueChecks.length,
  missingCount: missing.length,
  missingByKind: byKind,
  missing,
  ...(includeOk ? { results } : {}),
};

if (output === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Media asset audit against ${baseUrl}`);
  console.log(`Checked: ${report.checked}`);
  console.log(`Missing: ${report.missingCount}`);
  if (Object.keys(byKind).length) console.log(`Missing by kind: ${JSON.stringify(byKind)}`);
  for (const item of missing) {
    console.log(`- [${item.status || 'ERR'}] ${item.kind} · ${item.title} · ${item.field}: ${item.rawUrl}`);
    console.log(`  cause: ${item.cause}`);
  }
}

process.exit(missing.length ? 1 : 0);
