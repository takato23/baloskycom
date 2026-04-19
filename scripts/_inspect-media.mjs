// One-off: ver qué media rows tenemos en Supabase y con qué URLs.
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const rows = await sql`
  SELECT kind, id, title, media_url, thumb_url
  FROM media
  WHERE kind IN ('cancion','wallpaper','foto','video_ia')
  ORDER BY kind, id
`;

console.log('Total:', rows.length);
const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log('By kind:', byKind);

for (const k of Object.keys(byKind)) {
  console.log('\n--- ' + k + ' (' + byKind[k] + ') ---');
  for (const r of rows.filter((r) => r.kind === k)) {
    console.log(`${r.id.padEnd(20)} | ${(r.title || '').slice(0, 38).padEnd(38)} | media=${r.media_url} | thumb=${r.thumb_url || ''}`);
  }
}

await sql.end();
