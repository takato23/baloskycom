#!/usr/bin/env node

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const outputDir = process.env.BACKUP_DIR || 'backups';
const includeEvents = process.env.INCLUDE_EVENTS === '1';
const includeUsers = process.env.INCLUDE_USERS === '1';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const tableRows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

const skipped = new Set([
  ...(includeEvents ? [] : ['web_events']),
  ...(includeUsers ? [] : ['users']),
]);

const backup = {
  createdAt: new Date().toISOString(),
  source: 'baloskycom',
  format: 'logical-json-v1',
  skipped: [...skipped],
  tables: {},
};

for (const { table_name: tableName } of tableRows) {
  if (skipped.has(tableName)) continue;
  const safeName = tableName.replace(/"/g, '""');
  backup.tables[tableName] = await sql.unsafe(`SELECT * FROM "${safeName}"`);
}

await sql.end();

await mkdir(outputDir, { recursive: true });
const stamp = backup.createdAt.replace(/[:.]/g, '-');
const filePath = path.join(outputDir, `balosky-db-${stamp}.json`);
await writeFile(filePath, JSON.stringify(backup, null, 2));

const counts = Object.fromEntries(
  Object.entries(backup.tables).map(([name, rows]) => [name, rows.length])
);

console.log(`Backup written: ${filePath}`);
console.log(JSON.stringify({ tables: counts, skipped: backup.skipped }, null, 2));
