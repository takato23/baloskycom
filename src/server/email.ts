/**
 * Email service · Balosky
 * ----------------------------------------------------------------------
 * Envío de emails transaccionales (entrega post-pago, confirmaciones).
 * Usa Resend como proveedor. Si no hay RESEND_API_KEY en env, funciona
 * en modo "dev stub": loguea en consola el HTML + asunto y devuelve ok.
 *
 * Uso:
 *   import { sendDeliveryEmail } from './email.js';
 *   await sendDeliveryEmail({
 *     to: 'user@ejemplo.com',
 *     productTitle: 'Wallpaper Delirio Rojo',
 *     downloadUrl: 'https://balosky.com/api/download/abc...',
 *     expiresAt: new Date(Date.now() + 48*3600*1000),
 *     amount: 3500,
 *     purchaseId: 'pur_xxx',
 *   });
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Balosky <hola@balosky.com>';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'hola@balosky.com';
// Dirección que recibe alertas cuando cae un aporte nuevo, un encargo, o
// una suscripción. Por defecto cae al mismo inbox que usamos como reply-to.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || REPLY_TO_EMAIL;

// WhatsApp de alertas vía CallMeBot (gratis, sin cuenta Meta Business).
// Setup una sola vez: agendá +34 644 71 81 99 y mandale por WhatsApp
// "I allow callmebot to send me messages" — te responde con tu apikey.
// Después completá WHATSAPP_ALERT_PHONE y WHATSAPP_CALLMEBOT_APIKEY en .env.
const WHATSAPP_ALERT_PHONE = process.env.WHATSAPP_ALERT_PHONE || '';
const WHATSAPP_CALLMEBOT_APIKEY = process.env.WHATSAPP_CALLMEBOT_APIKEY || '';

let resendClient: Resend | null = null;
if (RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
} else if (process.env.NODE_ENV !== 'test') {
  console.warn(
    '[email] RESEND_API_KEY no configurado — los emails se loguean en consola en modo dev stub.'
  );
}

export type SendResult = {
  ok: boolean;
  id?: string;
  stub?: boolean;
  error?: string;
};

/* ---------------------------------------------------------------------
 * Template: entrega post-pago
 * Brand: Balosky (negro + naranja #FA5D29, Inter Tight, JetBrains Mono)
 * ------------------------------------------------------------------- */

type DeliveryEmailArgs = {
  to: string;
  productTitle: string;
  downloadUrl: string;
  expiresAt: Date;
  amount?: number;
  purchaseId?: string;
  supporterName?: string;
};

function formatAmount(amount?: number): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '';
  return '$' + amount.toLocaleString('es-AR');
}

function formatExpires(d: Date): string {
  try {
    const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dd = d.getDate();
    const mm = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]} ${dd} ${mm} · ${hh}:${mi} hs`;
  } catch (_) {
    return d.toISOString();
  }
}

export function buildDeliveryEmailHtml(args: DeliveryEmailArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  const amountLine = args.amount
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Aporte</td><td style="padding:6px 0;color:#f3efe6;font-size:15px;font-weight:600;text-align:right;">${escapeHtml(formatAmount(args.amount))}</td></tr>`
    : '';
  const idLine = args.purchaseId
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Ref</td><td style="padding:6px 0;color:#777;font-size:12px;font-family:monospace;text-align:right;">${escapeHtml(args.purchaseId)}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tu descarga · Balosky</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#f3efe6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#0f0d0b;border:1px solid #1f1b17;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 16px 36px;border-bottom:1px solid #1f1b17;">
              <div style="font-family:'Inter Tight',Inter,sans-serif;font-weight:900;letter-spacing:-0.04em;font-size:28px;color:#f3efe6;line-height:1;">
                BALOSKY<span style="color:#FA5D29;">.</span>
              </div>
              <div style="font-family:monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#FA5D29;margin-top:6px;">
                entrega confirmada
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#f3efe6;">${greeting}</p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#c9c4bb;">
                Gracias por apoyar. Tu compra de <strong style="color:#f3efe6;">${escapeHtml(args.productTitle)}</strong> se procesó correctamente.
              </p>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td align="center" style="background:#FA5D29;border-radius:999px;">
                    <a href="${escapeHtml(args.downloadUrl)}" target="_blank"
                       style="display:inline-block;padding:14px 28px;color:#0a0a0a;font-family:'Inter Tight',Inter,sans-serif;font-size:14px;font-weight:800;letter-spacing:.02em;text-decoration:none;text-transform:uppercase;">
                      Descargar ahora &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#999;">
                Si el botón no abre, copiá este link:
              </p>
              <p style="margin:0 0 24px 0;font-size:11px;line-height:1.5;color:#FA5D29;word-break:break-all;font-family:monospace;">
                ${escapeHtml(args.downloadUrl)}
              </p>

              <!-- Meta -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #1f1b17;margin-top:8px;padding-top:16px;">
                ${amountLine}
                <tr>
                  <td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Válido hasta</td>
                  <td style="padding:6px 0;color:#f3efe6;font-size:13px;text-align:right;">${escapeHtml(formatExpires(args.expiresAt))}</td>
                </tr>
                ${idLine}
              </table>

              <p style="margin:28px 0 0 0;font-size:12px;line-height:1.55;color:#777;">
                El link es personal y expira automáticamente. Si tenés cualquier problema, respondé este mail y te ayudo.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#080706;border-top:1px solid #1f1b17;">
              <p style="margin:0;font-size:11px;color:#666;line-height:1.5;">
                Balosky · donde termina el feed, empezamos nosotros.<br/>
                <a href="https://balosky.com" style="color:#999;text-decoration:none;">balosky.com</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/santiagobalosky" style="color:#999;text-decoration:none;">@santiagobalosky</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDeliveryEmailText(args: DeliveryEmailArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const amountLine = args.amount ? `Aporte: ${formatAmount(args.amount)}\n` : '';
  const refLine = args.purchaseId ? `Ref: ${args.purchaseId}\n` : '';

  return `${greeting}

Gracias por apoyar. Tu compra de "${args.productTitle}" se procesó correctamente.

Descargá acá (link personal, válido hasta ${formatExpires(args.expiresAt)}):
${args.downloadUrl}

${amountLine}${refLine}
Si tenés problemas, respondé este mail y te ayudo.

Balosky
https://balosky.com
@santiagobalosky
`;
}

/* ---------------------------------------------------------------------
 * Sender
 * ------------------------------------------------------------------- */

export async function sendDeliveryEmail(args: DeliveryEmailArgs): Promise<SendResult> {
  const subject = `Tu descarga: ${args.productTitle} — Balosky`;
  const html = buildDeliveryEmailHtml(args);
  const text = buildDeliveryEmailText(args);

  if (!resendClient) {
    console.log('\n========== [email · dev stub] ==========');
    console.log('To:', args.to);
    console.log('From:', FROM_EMAIL);
    console.log('Subject:', subject);
    console.log('Download URL:', args.downloadUrl);
    console.log('Expires:', args.expiresAt.toISOString());
    console.log('Text preview:\n' + text.slice(0, 400));
    console.log('========================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'delivery' },
        ...(args.purchaseId ? [{ name: 'purchase', value: args.purchaseId.slice(0, 64) }] : []),
      ],
    });

    if (result.error) {
      console.error('[email] Resend error:', result.error);
      return { ok: false, error: String(result.error.message || result.error) };
    }

    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    console.error('[email] send failed:', e);
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Helper plano: mandar cualquier email simple (útil para leads, admin alerts)
 * ------------------------------------------------------------------- */

export async function sendPlainEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!resendClient) {
    console.log('\n========== [email · dev stub · plain] ==========');
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    console.log('HTML length:', params.html.length);
    console.log('================================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      replyTo: params.replyTo || REPLY_TO_EMAIL,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (result.error) {
      return { ok: false, error: String(result.error.message || result.error) };
    }
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Template: confirmación de aporte (cafecito / encargo / producto no-download)
 * ---------------------------------------------------------------------
 * Distinto a `sendDeliveryEmail` — éste NO entrega un descargable. Es el
 * "gracias che" que le llega al que te metió un cafecito, te pidió una
 * canción con IA, o te agendó un zoom. Cuenta qué viene después para que
 * no se quede con la duda.
 * ------------------------------------------------------------------- */

export type ThanksEmailArgs = {
  to: string;
  supporterName?: string;
  amount?: number;
  itemTitle: string;
  /** Si es true, el cuerpo cambia para ser "recibí tu encargo, te respondo en 72h". */
  isEncargo?: boolean;
  /** Línea libre de copy que aparece bajo el título. Ej: "Te mando la canción en 72h." */
  nextSteps?: string;
  purchaseId?: string;
};

function buildThanksEmailHtml(args: ThanksEmailArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';

  const heading = args.isEncargo ? 'recibí tu encargo ✓' : 'gracias por el aporte ✓';
  const defaultNext = args.isEncargo
    ? 'Te respondo en máximo <strong style="color:#f3efe6;">72 horas</strong> con lo que me pediste. Si necesito alguna aclaración extra, te escribo a este mismo mail.'
    : 'Tu aporte ya se sumó al muro y lo vas a ver aparecer en balosky.com. Si dejaste mensaje, ya quedó publicado.';
  const next = args.nextSteps ? escapeHtml(args.nextSteps) : defaultNext;

  const amountLine = args.amount
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Aporte</td><td style="padding:6px 0;color:#f3efe6;font-size:15px;font-weight:600;text-align:right;">${escapeHtml(formatAmount(args.amount))}</td></tr>`
    : '';
  const itemLine = args.itemTitle
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Concepto</td><td style="padding:6px 0;color:#f3efe6;font-size:14px;text-align:right;">${escapeHtml(args.itemTitle)}</td></tr>`
    : '';
  const idLine = args.purchaseId
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Ref</td><td style="padding:6px 0;color:#777;font-size:12px;font-family:monospace;text-align:right;">${escapeHtml(args.purchaseId)}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Gracias · Balosky</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#f3efe6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#0f0d0b;border:1px solid #1f1b17;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 36px 16px 36px;border-bottom:1px solid #1f1b17;">
          <div style="font-family:'Inter Tight',Inter,sans-serif;font-weight:900;letter-spacing:-0.04em;font-size:28px;color:#f3efe6;line-height:1;">BALOSKY<span style="color:#FA5D29;">.</span></div>
          <div style="font-family:monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#FA5D29;margin-top:6px;">${heading}</div>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#f3efe6;">${greeting}</p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#c9c4bb;">${next}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #1f1b17;margin-top:8px;padding-top:16px;">
            ${itemLine}
            ${amountLine}
            ${idLine}
          </table>
          <p style="margin:28px 0 0 0;font-size:12px;line-height:1.55;color:#777;">¿Dudas o algo que quieras cambiar? Respondé este mail y te contesto yo.</p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#080706;border-top:1px solid #1f1b17;">
          <p style="margin:0;font-size:11px;color:#666;line-height:1.5;">Balosky · donde termina el feed, empezamos nosotros.<br/><a href="https://balosky.com" style="color:#999;text-decoration:none;">balosky.com</a>&nbsp;·&nbsp;<a href="https://instagram.com/santiagobalosky" style="color:#999;text-decoration:none;">@santiagobalosky</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildThanksEmailText(args: ThanksEmailArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const head = args.isEncargo ? 'Recibí tu encargo.' : 'Gracias por el aporte.';
  const next = args.nextSteps
    ? args.nextSteps
    : args.isEncargo
      ? 'Te respondo en máximo 72 horas con lo que me pediste.'
      : 'Tu aporte ya se sumó al muro en balosky.com.';
  const meta: string[] = [];
  if (args.itemTitle) meta.push(`Concepto: ${args.itemTitle}`);
  if (args.amount) meta.push(`Aporte: ${formatAmount(args.amount)}`);
  if (args.purchaseId) meta.push(`Ref: ${args.purchaseId}`);

  return `${greeting}

${head}

${next}

${meta.join('\n')}

¿Dudas? Respondé este mail.

Balosky
https://balosky.com
@santiagobalosky
`;
}

export async function sendThanksEmail(args: ThanksEmailArgs): Promise<SendResult> {
  const subject = args.isEncargo
    ? `Recibí tu encargo — Balosky`
    : `Gracias por el aporte — Balosky`;
  const html = buildThanksEmailHtml(args);
  const text = buildThanksEmailText(args);

  if (!resendClient) {
    console.log('\n========== [email · dev stub · thanks] ==========');
    console.log('To:', args.to);
    console.log('Subject:', subject);
    console.log('Item:', args.itemTitle, '· Amount:', args.amount, '· Encargo:', Boolean(args.isEncargo));
    console.log('=================================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: args.isEncargo ? 'encargo' : 'thanks' },
        ...(args.purchaseId ? [{ name: 'purchase', value: args.purchaseId.slice(0, 64) }] : []),
      ],
    });
    if (result.error) return { ok: false, error: String(result.error.message || result.error) };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Template: bienvenida Baloskier (subscription authorized)
 * ---------------------------------------------------------------------
 * Se dispara cuando MP confirma la preapproval. Lleva un magic-link para
 * que el nuevo miembro entre a /club sin friccionar login — el link le
 * da sesión automática.
 * ------------------------------------------------------------------- */

export type WelcomeBaloskierArgs = {
  to: string;
  supporterName?: string;
  membershipName?: string;
  /** URL que levanta sesión del member automáticamente. */
  magicLoginUrl: string;
  expiresAt: Date;
  amount?: number;
};

function buildWelcomeBaloskierHtml(args: WelcomeBaloskierArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  const tier = args.membershipName ? escapeHtml(args.membershipName) : 'Baloskier';
  const amountLine = args.amount
    ? `<tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Mensualidad</td><td style="padding:6px 0;color:#f3efe6;font-size:15px;font-weight:600;text-align:right;">${escapeHtml(formatAmount(args.amount))}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Bienvenido Baloskier · Balosky</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#f3efe6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#0f0d0b;border:1px solid #1f1b17;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 36px 16px 36px;border-bottom:1px solid #1f1b17;">
          <div style="font-family:'Inter Tight',Inter,sans-serif;font-weight:900;letter-spacing:-0.04em;font-size:28px;color:#f3efe6;line-height:1;">BALOSKY<span style="color:#FA5D29;">.</span></div>
          <div style="font-family:monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#FA5D29;margin-top:6px;">ya sos baloskier</div>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#f3efe6;">${greeting}</p>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:#f3efe6;"><strong>Bienvenido a <span style="color:#FA5D29;">${tier}</span>.</strong></p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#c9c4bb;">Tu suscripción quedó autorizada en Mercado Pago. A partir de ahora tenés acceso anticipado a videos, wallpapers, sesiones mensuales por zoom, y el archivo privado.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px 0;"><tr><td align="center" style="background:#FA5D29;border-radius:999px;">
            <a href="${escapeHtml(args.magicLoginUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#0a0a0a;font-family:'Inter Tight',Inter,sans-serif;font-size:14px;font-weight:800;letter-spacing:.02em;text-decoration:none;text-transform:uppercase;">entrar al club &rarr;</a>
          </td></tr></table>
          <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#999;">Este link te da sesión automática — no necesitás contraseña. Guardá este mail, podés usarlo de nuevo hasta ${escapeHtml(formatExpires(args.expiresAt))}.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #1f1b17;margin-top:16px;padding-top:16px;">
            ${amountLine}
            <tr><td style="padding:6px 0;color:#999;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Tier</td><td style="padding:6px 0;color:#f3efe6;font-size:14px;text-align:right;">${tier}</td></tr>
          </table>
          <p style="margin:28px 0 0 0;font-size:12px;line-height:1.55;color:#777;">Podés cancelar cuando quieras desde tu cuenta de Mercado Pago. Cualquier duda, respondé este mail.</p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#080706;border-top:1px solid #1f1b17;">
          <p style="margin:0;font-size:11px;color:#666;line-height:1.5;">Balosky · donde termina el feed, empezamos nosotros.<br/><a href="https://balosky.com" style="color:#999;text-decoration:none;">balosky.com</a>&nbsp;·&nbsp;<a href="https://instagram.com/santiagobalosky" style="color:#999;text-decoration:none;">@santiagobalosky</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildWelcomeBaloskierText(args: WelcomeBaloskierArgs): string {
  const name = (args.supporterName || '').trim();
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const tier = args.membershipName || 'Baloskier';
  return `${greeting}

Bienvenido a ${tier}. Ya sos Baloskier.

Tu suscripción quedó autorizada en Mercado Pago. Accedé al Club con este link (te da sesión automática):

${args.magicLoginUrl}

Válido hasta ${formatExpires(args.expiresAt)}.

${args.amount ? `Mensualidad: ${formatAmount(args.amount)}\n` : ''}Podés cancelar cuando quieras desde tu cuenta de Mercado Pago.

Balosky
https://balosky.com
@santiagobalosky
`;
}

export async function sendWelcomeBaloskier(args: WelcomeBaloskierArgs): Promise<SendResult> {
  const subject = `Bienvenido Baloskier · tu acceso al Club`;
  const html = buildWelcomeBaloskierHtml(args);
  const text = buildWelcomeBaloskierText(args);

  if (!resendClient) {
    console.log('\n========== [email · dev stub · welcome-baloskier] ==========');
    console.log('To:', args.to);
    console.log('Membership:', args.membershipName);
    console.log('Magic URL:', args.magicLoginUrl);
    console.log('============================================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      tags: [{ name: 'type', value: 'welcome-baloskier' }],
    });
    if (result.error) return { ok: false, error: String(result.error.message || result.error) };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Template: magic-link (solo auth, no delivery)
 * ---------------------------------------------------------------------
 * Antes reusábamos `sendDeliveryEmail` para esto, pero le mostraba al
 * miembro un botón "Descargar" para entrar al club — confuso. Este
 * template es específico para el login de miembros.
 * ------------------------------------------------------------------- */

export type MagicLinkEmailArgs = {
  to: string;
  magicUrl: string;
  expiresAt: Date;
};

function buildMagicLinkEmailHtml(args: MagicLinkEmailArgs): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Tu acceso · Balosky</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#f3efe6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#0f0d0b;border:1px solid #1f1b17;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 36px 16px 36px;border-bottom:1px solid #1f1b17;">
          <div style="font-family:'Inter Tight',Inter,sans-serif;font-weight:900;letter-spacing:-0.04em;font-size:28px;color:#f3efe6;line-height:1;">BALOSKY<span style="color:#FA5D29;">.</span></div>
          <div style="font-family:monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#FA5D29;margin-top:6px;">tu acceso al club</div>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#f3efe6;">Hola,</p>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#c9c4bb;">Tocá el botón y entrás al Club sin contraseña. Es un link personal — no lo compartas.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px 0;"><tr><td align="center" style="background:#FA5D29;border-radius:999px;">
            <a href="${escapeHtml(args.magicUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#0a0a0a;font-family:'Inter Tight',Inter,sans-serif;font-size:14px;font-weight:800;letter-spacing:.02em;text-decoration:none;text-transform:uppercase;">entrar al club &rarr;</a>
          </td></tr></table>
          <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#999;">Si el botón no abre, copiá este link:</p>
          <p style="margin:0 0 24px 0;font-size:11px;line-height:1.5;color:#FA5D29;word-break:break-all;font-family:monospace;">${escapeHtml(args.magicUrl)}</p>
          <p style="margin:0;font-size:12px;color:#777;">Válido hasta ${escapeHtml(formatExpires(args.expiresAt))}. Si no pediste este mail, ignoralo.</p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#080706;border-top:1px solid #1f1b17;">
          <p style="margin:0;font-size:11px;color:#666;line-height:1.5;">Balosky · donde termina el feed, empezamos nosotros.<br/><a href="https://balosky.com" style="color:#999;text-decoration:none;">balosky.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildMagicLinkEmailText(args: MagicLinkEmailArgs): string {
  return `Hola,

Entrá al Club Balosky sin contraseña con este link personal (válido hasta ${formatExpires(args.expiresAt)}):

${args.magicUrl}

Si no pediste este mail, ignoralo.

Balosky
https://balosky.com
`;
}

export async function sendMagicLinkEmail(args: MagicLinkEmailArgs): Promise<SendResult> {
  const subject = 'Tu acceso al Club Balosky';
  const html = buildMagicLinkEmailHtml(args);
  const text = buildMagicLinkEmailText(args);

  if (!resendClient) {
    console.log('\n========== [email · dev stub · magic-link] ==========');
    console.log('To:', args.to);
    console.log('Magic URL:', args.magicUrl);
    console.log('=====================================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      tags: [{ name: 'type', value: 'magic-link' }],
    });
    if (result.error) return { ok: false, error: String(result.error.message || result.error) };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Admin alert — Santi se entera cuando cae un aporte / encargo / sub nueva.
 * No queremos que tenga que pollear el admin dashboard.
 * ------------------------------------------------------------------- */

export type AdminAlertArgs = {
  kind: 'purchase' | 'subscription' | 'encargo' | 'cafecito' | 'lead';
  summary: string;
  details?: Record<string, string | number | undefined | null>;
};

/**
 * WhatsApp paralelo al mail de alerta. Fire-and-forget: si CallMeBot está
 * caído o no configurado, el alert por email sigue su curso normal.
 */
async function sendWhatsAppAlert(text: string): Promise<void> {
  if (!WHATSAPP_ALERT_PHONE || !WHATSAPP_CALLMEBOT_APIKEY) return;
  const url =
    'https://api.callmebot.com/whatsapp.php' +
    `?phone=${encodeURIComponent(WHATSAPP_ALERT_PHONE)}` +
    `&apikey=${encodeURIComponent(WHATSAPP_CALLMEBOT_APIKEY)}` +
    `&text=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) console.error('[whatsapp-alert] CallMeBot respondió', res.status);
  } catch (e) {
    console.error('[whatsapp-alert] error:', e);
  }
}

export async function sendAdminAlert(args: AdminAlertArgs): Promise<SendResult> {
  const subject = `[Balosky] ${args.kind.toUpperCase()} · ${args.summary}`;
  const rows = Object.entries(args.details || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#999;font-size:11px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(k)}</td><td style="padding:4px 0;color:#f3efe6;font-size:13px;">${escapeHtml(String(v))}</td></tr>`
    )
    .join('');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0a0a0a;font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#f3efe6;">
  <div style="max-width:520px;margin:0 auto;background:#0f0d0b;border:1px solid #1f1b17;border-radius:12px;padding:24px;">
    <div style="font-family:monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#FA5D29;">${escapeHtml(args.kind)} · nuevo</div>
    <h2 style="margin:8px 0 16px 0;font-family:'Inter Tight',sans-serif;font-weight:800;font-size:20px;color:#f3efe6;">${escapeHtml(args.summary)}</h2>
    <table style="border-collapse:collapse;">${rows}</table>
  </div>
</body></html>`;

  const textLines = Object.entries(args.details || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const text = `[Balosky] ${args.kind} — ${args.summary}\n\n${textLines}\n`;

  // WhatsApp en paralelo (no bloquea ni afecta el resultado del email).
  void sendWhatsAppAlert(`🔔 ${args.kind.toUpperCase()} · ${args.summary}\n${textLines.slice(0, 500)}`);

  if (!resendClient) {
    console.log('\n========== [email · dev stub · admin-alert] ==========');
    console.log('To:', ADMIN_EMAIL, '· Subject:', subject);
    console.log(text);
    console.log('======================================================\n');
    return { ok: true, stub: true };
  }

  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      tags: [{ name: 'type', value: `admin-${args.kind}` }],
    });
    if (result.error) return { ok: false, error: String(result.error.message || result.error) };
    return { ok: true, id: result.data?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* ---------------------------------------------------------------------
 * Utils
 * ------------------------------------------------------------------- */

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const __emailInternal = { escapeHtml, formatAmount, formatExpires };
