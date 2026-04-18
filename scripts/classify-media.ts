/**
 * Auto-categorizador de media usando Gemini.
 *
 * Baja cada imagen del servidor, la manda a Gemini 2.5 Flash con una taxonomía fija,
 * y PATCHea el campo `category` de cada item.
 *
 * Uso:
 *   npx tsx scripts/classify-media.ts --kind=wallpaper [opciones]
 *
 * Variables de entorno:
 *   GEMINI_API_KEY  (obligatoria)
 *   BALOSKY_URL     (default http://localhost:3000)
 *   BALOSKY_USER / BALOSKY_PASS  (o BALOSKY_TOKEN)
 *
 * Opciones:
 *   --kind=<wallpaper|foto>   Requerido. Solo funciona con imágenes.
 *   --only-empty              Solo items sin categoría (default true).
 *   --all                     Sobreescribe categorías existentes.
 *   --dry-run                 Lista lo que haría sin PATCHear.
 *   --concurrency=<n>         Default 3.
 *
 * Taxonomías (podés editar TAXONOMY):
 *   wallpaper: paisaje · ciudad · edificio · interior · retrato · objeto · abstracto · otros
 *   foto:      paisaje · ciudad · retrato · backstage · viaje · otros
 */

import process from 'node:process';

const TAXONOMY: Record<string, string[]> = {
  wallpaper: ['paisaje', 'ciudad', 'edificio', 'interior', 'retrato', 'objeto', 'abstracto', 'otros'],
  foto:      ['paisaje', 'ciudad', 'retrato', 'backstage', 'viaje', 'otros'],
};

interface Args {
  kind: 'wallpaper' | 'foto';
  onlyEmpty: boolean;
  dryRun: boolean;
  concurrency: number;
}

function parseArgs(argv: string[]): Args {
  const get = (n: string) => {
    const m = argv.find(a => a.startsWith(`--${n}=`));
    return m ? m.split('=').slice(1).join('=') : undefined;
  };
  const flag = (n: string) => argv.includes(`--${n}`);

  const kind = (get('kind') || '') as 'wallpaper' | 'foto';
  if (!TAXONOMY[kind]) {
    console.error('✖ --kind requerido (wallpaper o foto).');
    process.exit(1);
  }
  const all = flag('all');
  return {
    kind,
    onlyEmpty: !all,
    dryRun: flag('dry-run'),
    concurrency: Number(get('concurrency') || 3),
  };
}

async function login(baseUrl: string): Promise<string> {
  const preToken = process.env.BALOSKY_TOKEN;
  if (preToken) return preToken;
  const user = process.env.BALOSKY_USER;
  const pass = process.env.BALOSKY_PASS;
  if (!user || !pass) {
    console.error('✖ Falta auth: BALOSKY_TOKEN o BALOSKY_USER + BALOSKY_PASS.');
    process.exit(1);
  }
  const r = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!r.ok) {
    console.error(`✖ Login ${r.status}: ${await r.text()}`);
    process.exit(1);
  }
  const d = await r.json() as { token?: string };
  if (!d.token) { console.error('✖ Login sin token.'); process.exit(1); }
  return d.token;
}

interface MediaItem {
  id: string;
  title: string;
  mediaUrl: string;
  coverImage?: string;
  category?: string;
  kind: string;
}

async function fetchMedia(baseUrl: string, kind: string, token: string): Promise<MediaItem[]> {
  const r = await fetch(`${baseUrl}/api/media?kind=${kind}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) { console.error(`✖ fetch /api/media ${r.status}`); process.exit(1); }
  return r.json() as Promise<MediaItem[]>;
}

async function fetchImageBase64(baseUrl: string, url: string): Promise<{ data: string; mime: string }> {
  const full = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  const r = await fetch(full);
  if (!r.ok) throw new Error(`fetch image ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  const mime = r.headers.get('content-type') || 'image/webp';
  // base64 encode
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  const data = Buffer.from(buf).toString('base64');
  return { data, mime };
}

async function classify(
  ai: any,
  imgB64: string,
  imgMime: string,
  taxonomy: string[]
): Promise<string> {
  const list = taxonomy.join(' | ');
  const prompt = [
    'Sos un clasificador de wallpapers/fotos. Elegí UNA categoría de esta lista:',
    list,
    'Reglas:',
    '- "paisaje" = naturaleza, montaña, bosque, mar, cielo, sin edificios dominantes.',
    '- "ciudad" = skyline, calle urbana, varios edificios a la vista, tráfico.',
    '- "edificio" = un edificio o fachada dominando el frame (arquitectura).',
    '- "interior" = adentro de un espacio (cuarto, bar, museo, auto).',
    '- "retrato" = persona(s) como sujeto principal.',
    '- "objeto" = objeto específico (comida, auto, planta, flor, detalle).',
    '- "abstracto" = textura, patrón, luz, sin sujeto claro.',
    '- "otros" = no encaja en nada de arriba.',
    'Respondé con UNA sola palabra de la lista, en minúscula, sin explicación ni puntuación.',
  ].join('\n');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: imgMime, data: imgB64 } },
      ],
    }],
  });
  const text = (res.text || res.response?.text?.() || '').toString().trim().toLowerCase();
  // Matchear contra taxonomy
  const match = taxonomy.find(t => text === t || text.startsWith(t));
  return match || 'otros';
}

async function patchCategory(
  baseUrl: string,
  token: string,
  id: string,
  category: string
): Promise<void> {
  const r = await fetch(`${baseUrl}/api/media/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category }),
  });
  if (!r.ok) throw new Error(`PATCH ${r.status}: ${await r.text()}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (process.env.BALOSKY_URL || 'http://localhost:3000').replace(/\/$/, '');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('✖ GEMINI_API_KEY requerida.'); process.exit(1); }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new (GoogleGenAI as any)({ apiKey });

  const token = await login(baseUrl);
  const all = await fetchMedia(baseUrl, args.kind, token);
  const targets = args.onlyEmpty ? all.filter(m => !m.category || m.category.trim() === '') : all;

  console.log(`→ ${args.kind}: ${all.length} totales · ${targets.length} para clasificar`);
  if (!targets.length) { console.log('No hay nada pendiente.'); return; }

  if (args.dryRun) {
    targets.forEach(t => console.log(`  · ${t.title}  (${t.mediaUrl})`));
    return;
  }

  const taxonomy = TAXONOMY[args.kind];
  const counts: Record<string, number> = {};
  let done = 0;
  let fail = 0;
  let idx = 0;

  const worker = async () => {
    while (idx < targets.length) {
      const myIdx = idx++;
      const t = targets[myIdx];
      const label = `[${myIdx + 1}/${targets.length}]`;
      try {
        const imgUrl = t.coverImage || t.mediaUrl;
        const { data, mime } = await fetchImageBase64(baseUrl, imgUrl);
        const cat = await classify(ai, data, mime, taxonomy);
        await patchCategory(baseUrl, token, t.id, cat);
        counts[cat] = (counts[cat] || 0) + 1;
        console.log(`${label} ✓ ${t.title}  →  ${cat}`);
        done++;
      } catch (e: any) {
        console.log(`${label} ✗ ${t.title}  — ${e.message || e}`);
        fail++;
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(args.concurrency, targets.length) },
    () => worker()
  );
  await Promise.all(workers);

  console.log(`\nListo: ${done} clasificados · ${fail} fallaron`);
  console.log('Distribución:');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v}`));
}

main().catch(e => {
  console.error('✖ Error fatal:', e);
  process.exit(1);
});
