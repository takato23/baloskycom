/**
 * Reset del muro de Balosky.
 *
 * Uso:
 *   npx tsx scripts/reset-muro.ts
 *
 * Borra TODOS los mensajes existentes (incluidos los seed iniciales) para
 * que el muro arranque vacío. Los nuevos mensajes que entren por la web
 * quedan públicos automáticamente (POST /api/messages ya no requiere
 * aprobación manual).
 *
 * Este comando NO toca campañas ni aportes monetarios reales — solo la
 * tabla `messages`.
 */

import db from '../src/server/db.js';

async function main() {
  const before = (await db
    .prepare('SELECT COUNT(*) as count FROM messages')
    .get()) as { count: number };

  console.log('[reset-muro] Mensajes actuales: ' + before.count);
  await db.prepare('DELETE FROM messages').run();

  const after = (await db
    .prepare('SELECT COUNT(*) as count FROM messages')
    .get()) as { count: number };
  console.log('[reset-muro] Mensajes después del reset: ' + after.count);
  console.log('Listo. El muro arranca vacío ✦');
  process.exit(0);
}

main().catch((err) => {
  console.error('[reset-muro] ERROR:', err);
  process.exit(1);
});
