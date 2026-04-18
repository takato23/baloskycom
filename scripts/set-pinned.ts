/**
 * Setear (o limpiar) el mensaje anclado del muro.
 *
 * Usos:
 *   npx tsx scripts/set-pinned.ts "Santi" "Gracias por bancar el disco nuevo ✦"
 *   npx tsx scripts/set-pinned.ts --off         # desactiva el pinned
 *   npx tsx scripts/set-pinned.ts --show        # muestra el pinned actual
 *
 * El mensaje se guarda dentro del JSON de `settings` (id='global'), bajo la
 * clave `pinnedMessage: { enabled, author, text }`. El wire script del muro
 * lo lee automáticamente en cada carga.
 */

import db from '../src/server/db.js';

type SettingsRow = { data: string };

async function loadSettings(): Promise<Record<string, unknown>> {
  const row = (await db
    .prepare('SELECT data FROM settings WHERE id = ?')
    .get('global')) as SettingsRow | undefined;
  if (!row) throw new Error("No hay fila de settings (id='global'). Ejecutá el server una vez primero para generarla.");
  return JSON.parse(row.data);
}

async function saveSettings(next: Record<string, unknown>): Promise<void> {
  await db
    .prepare('UPDATE settings SET data = ? WHERE id = ?')
    .run(JSON.stringify(next), 'global');
}

async function main() {
  const args = process.argv.slice(2);
  const settings = await loadSettings();

  if (args[0] === '--show' || args.length === 0) {
    console.log('[pinned] Actual:', settings.pinnedMessage || '(ninguno)');
    if (args.length === 0) {
      console.log('\nUso:');
      console.log('  npx tsx scripts/set-pinned.ts "Autor" "Texto del mensaje"');
      console.log('  npx tsx scripts/set-pinned.ts --off');
      console.log('  npx tsx scripts/set-pinned.ts --show');
    }
    process.exit(0);
  }

  if (args[0] === '--off') {
    settings.pinnedMessage = { enabled: false, author: '', text: '' };
    await saveSettings(settings);
    console.log('[pinned] Desactivado.');
    process.exit(0);
  }

  const [author, text] = args;
  if (!text) {
    console.error('Falta el texto. Uso: npx tsx scripts/set-pinned.ts "Autor" "Texto"');
    process.exit(1);
  }

  settings.pinnedMessage = {
    enabled: true,
    author: String(author || '').trim(),
    text: String(text).trim(),
  };
  await saveSettings(settings);
  console.log('[pinned] Seteado:', settings.pinnedMessage);
  console.log('Refrescá la home para verlo arriba del feed del muro.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[set-pinned] ERROR:', err);
  process.exit(1);
});
