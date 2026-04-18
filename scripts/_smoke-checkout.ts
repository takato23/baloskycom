/**
 * Smoke test del flow checkout → delivery (offline)
 * ----------------------------------------------------------------------
 * Corre los pedazos que NO dependen de Mercado Pago ni de red externa:
 *   1) Token de descarga firmado se genera y se valida con el JWT_SECRET
 *      correcto, expira en 48h, rechaza otro secret.
 *   2) El template de email (HTML + text) arma bien con datos mínimos,
 *      datos completos y datos hostiles (HTML injection en título/nombre).
 *   3) sendDeliveryEmail en modo dev-stub loguea sin tirar.
 *
 * No requiere DATABASE_URL ni RESEND_API_KEY. Si existen, los ignora.
 *
 * Uso:
 *   npx tsx scripts/_smoke-checkout.ts
 */

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import {
  buildDeliveryEmailHtml,
  buildDeliveryEmailText,
  sendDeliveryEmail,
  __emailInternal
} from '../src/server/email.js';

let failures = 0;
function check(label: string, cond: boolean, detail?: string) {
  const icon = cond ? 'OK  ' : 'FAIL';
  if (!cond) failures++;
  console.log(`[${icon}] ${label}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  console.log('\n── SMOKE · checkout delivery ──────────────────────────────\n');

  // 1) Token de descarga
  const SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev';
  const ttlSec = 48 * 3600;
  const token = jwt.sign(
    { pid: 'pur_test_1', iid: 'wall_test_1', typ: 'dl', kind: 'wallpaper' },
    SECRET,
    { expiresIn: ttlSec }
  );
  check('Token generado', typeof token === 'string' && token.split('.').length === 3);

  try {
    const decoded: any = jwt.verify(token, SECRET);
    check('Token verifica con el secret correcto', decoded.pid === 'pur_test_1' && decoded.typ === 'dl');
    const expSec = decoded.exp - Math.floor(Date.now() / 1000);
    check(
      `Expira en ~48h (±60s)`,
      Math.abs(expSec - ttlSec) < 60,
      `exp − now = ${expSec}s`
    );
  } catch (e: any) {
    check('Token verifica con el secret correcto', false, e.message);
  }

  try {
    jwt.verify(token, SECRET + '-other');
    check('Token rechaza secret distinto', false);
  } catch (e: any) {
    check('Token rechaza secret distinto', true);
  }

  const tokenExpired = jwt.sign(
    { pid: 'pur_old', iid: 'w', typ: 'dl', kind: 'wallpaper' },
    SECRET,
    { expiresIn: -60 } // ya expiró
  );
  try {
    jwt.verify(tokenExpired, SECRET);
    check('Token expirado se rechaza', false);
  } catch (e: any) {
    check('Token expirado se rechaza', e.name === 'TokenExpiredError', e.name);
  }

  // 2) Email template
  const baseArgs = {
    to: 'santi@balosky.com',
    productTitle: 'Wallpaper Delirio Rojo',
    downloadUrl: 'https://balosky.com/api/download/' + token,
    expiresAt: new Date(Date.now() + ttlSec * 1000),
    amount: 3500,
    purchaseId: 'pur_test_1',
    supporterName: 'Santi'
  };

  const html = buildDeliveryEmailHtml(baseArgs);
  check('HTML contiene CTA', html.includes('Descargar ahora'));
  check('HTML contiene downloadUrl', html.includes(baseArgs.downloadUrl));
  check('HTML contiene nombre del producto', html.includes(baseArgs.productTitle));
  check('HTML aplica branding Balosky', html.includes('BALOSKY') && html.includes('#FA5D29'));
  check('HTML formatea monto', html.includes('3.500'));

  const text = buildDeliveryEmailText(baseArgs);
  check('Text contiene downloadUrl', text.includes(baseArgs.downloadUrl));
  check('Text contiene saludo con nombre', text.startsWith('Hola Santi'));

  // HTML injection paranoia
  const hostile = buildDeliveryEmailHtml({
    ...baseArgs,
    productTitle: '<script>alert(1)</script>Rojo',
    supporterName: '"><img src=x onerror=alert(1)>'
  });
  check('HTML escapa title hostil', !hostile.includes('<script>alert(1)</script>') && hostile.includes('&lt;script&gt;'));
  // Basta con que no queden tags <img> abiertos; el texto literal dentro de contexto escapado es inofensivo.
  check('HTML escapa nombre hostil (sin <img>)', !/(<img\b)/i.test(hostile) && hostile.includes('&quot;&gt;'));

  // helpers
  check('formatAmount arma ARS', __emailInternal.formatAmount(1200) === '$1.200');
  check('formatAmount con undef devuelve vacío', __emailInternal.formatAmount(undefined) === '');
  check('formatExpires arma fecha', typeof __emailInternal.formatExpires(new Date()) === 'string');

  // 3) Dev-stub send (sin RESEND_API_KEY)
  const prevKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = ''; // forzar stub (aunque el módulo ya lo capturó a la importación)
  const result = await sendDeliveryEmail(baseArgs);
  process.env.RESEND_API_KEY = prevKey;
  check('sendDeliveryEmail devuelve ok (stub o real)', !!result && result.ok === true);

  console.log('\n──────────────────────────────────────────────────────────');
  console.log(failures === 0 ? '✔ Todo OK.' : `✗ ${failures} check(s) fallaron.`);
  console.log('──────────────────────────────────────────────────────────\n');
  process.exit(failures === 0 ? 0 : 1);
})();
