import express from 'express';
import db, { createAdminUser, hasAdminUsers, updateAdminUserCredentials } from '../db.js';import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import {
  sendDeliveryEmail,
  sendThanksEmail,
  sendWelcomeBaloskier,
  sendMagicLinkEmail,
  sendAdminAlert
} from '../email.js';
import { detectMessageLead } from '../leadDetection.js';
const router = express.Router();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET?.trim();
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN?.trim();

if (!JWT_SECRET && IS_PRODUCTION) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

if (!MP_ACCESS_TOKEN && IS_PRODUCTION) {
  throw new Error('MP_ACCESS_TOKEN environment variable is required in production');
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-local-jwt-secret';

// Configure Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000' 
});
const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);
const DEFAULT_CAFECITO_AMOUNT = 3000;
const DEFAULT_PAYPAL_LINK = 'https://paypal.me/balosky';
const DEFAULT_PAYPAL_CURRENCY = 'USD';
const DEFAULT_PAYPAL_UNIT_AMOUNT = 3;

const isDevLocalRequest = (req: express.Request) => {
  if (IS_PRODUCTION) return false;
  const host = req.hostname;
  const ip = req.ip || req.socket.remoteAddress || '';
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::ffff:127.0.0.1'
  );
};

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevLocalRequest(req) || req.path === '/webhook/mercadopago' || Boolean(req.headers.authorization)
});

router.use(publicLimiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isDevLocalRequest,
  message: { error: 'Demasiados intentos. Esperá unos minutos.' }
});

/* Rate-limit estricto para escritura pública sin auth (muro, leads).
   5 posts por IP cada 5 min — suficiente para uso humano, ahoga bots. */
const writePublicLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevLocalRequest(req) || Boolean(req.headers.authorization),
  message: { error: 'Demasiados intentos. Esperá unos minutos.' }
});

const eventLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevLocalRequest(req) || Boolean(req.headers.authorization),
  message: { error: 'Demasiados eventos. Esperá unos minutos.' }
});

const isLocalBaseUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

const getRequestBaseUrl = (req: express.Request) => {
  const origin = req.get('origin')?.trim();
  if (origin) return origin.replace(/\/$/, '');

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  return host ? `${proto}://${host}`.replace(/\/$/, '') : '';
};

const getBaseUrl = (req: express.Request) => {
  const configuredUrl = process.env.APP_URL?.trim();
  const requestUrl = getRequestBaseUrl(req);

  if (configuredUrl) {
    const normalized = configuredUrl.replace(/\/$/, '');
    if (!isLocalBaseUrl(normalized)) return normalized;
    if (requestUrl && !isLocalBaseUrl(requestUrl)) return requestUrl;
    return normalized;
  }

  return requestUrl || `${req.protocol}://${req.get('host')}`;
};

const getNotificationUrl = (req: express.Request) => {
  const baseUrl = getBaseUrl(req);

  try {
    const hostname = new URL(baseUrl).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return undefined;
    }
  } catch (error) {
    console.warn('Invalid APP_URL/origin for Mercado Pago webhook:', error);
    return undefined;
  }

  return `${baseUrl}/api/webhook/mercadopago`;
};

const shouldUseAutoReturn = (baseUrl: string) => {
  try {
    const hostname = new URL(baseUrl).hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
};

const getClientIp = (req: express.Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || req.socket.remoteAddress || null;
};

const upsertNewsletterSubscriber = async (email: string, source: string) => {
  const existing = await db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email) as { id: string } | undefined;
  if (existing) {
    return { duplicate: true };
  }

  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.prepare(`
    INSERT INTO newsletter_subscribers (id, email, source, active, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email, source, 1, new Date().toISOString());

  return { duplicate: false };
};

const getPaymentIdFromWebhook = (req: express.Request) => {
  const bodyPaymentId = req.body?.data?.id ?? req.body?.resource?.split('/').pop();
  const queryPaymentId = req.query['data.id'] ?? req.query.id;
  const maybePaymentId = bodyPaymentId || queryPaymentId;

  if (!maybePaymentId) return null;

  const parsedPaymentId = Number(maybePaymentId);
  return Number.isFinite(parsedPaymentId) ? parsedPaymentId : null;
};

const isExternalHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isPayPalUrl = (value: string) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      /^https?:$/i.test(url.protocol) &&
      (host === 'paypal.me' || host.endsWith('.paypal.me') || host === 'paypal.com' || host.endsWith('.paypal.com'))
    );
  } catch {
    return false;
  }
};

const normalizePaypalCurrency = (value: unknown) => {
  const currency = String(value || DEFAULT_PAYPAL_CURRENCY).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_PAYPAL_CURRENCY;
};

const normalizePaypalUnitAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100) / 100
    : DEFAULT_PAYPAL_UNIT_AMOUNT;
};

const formatPaypalAmount = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const buildPaypalCheckoutUrl = (paypalLink: string, amount: number, currency: string) => {
  if (!paypalLink || !isPayPalUrl(paypalLink)) return '';

  const url = new URL(paypalLink);
  const host = url.hostname.toLowerCase();
  const amountToken = `${formatPaypalAmount(amount)}${normalizePaypalCurrency(currency)}`;

  if (host === 'paypal.me' || host.endsWith('.paypal.me') || url.pathname.toLowerCase().startsWith('/paypalme/')) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${amountToken}`;
    url.search = '';
    url.hash = '';
  }

  return url.toString();
};

const getStoredSettings = async () => {
  const row = await db.prepare('SELECT data FROM settings WHERE id = ?').get('global') as any;
  if (!row?.data) return {};
  try {
    return JSON.parse(row.data) || {};
  } catch {
    return {};
  }
};

const withCafecitoPaymentDefaults = (settings: any) => {
  const cafecito = settings?.cafecito || {};
  const amount = Number(cafecito.amount);
  const mercadoPagoLink = typeof cafecito.mercadoPagoLink === 'string'
    ? cafecito.mercadoPagoLink.trim()
    : '';
  const paypalLink = typeof cafecito.paypalLink === 'string'
    ? cafecito.paypalLink.trim()
    : DEFAULT_PAYPAL_LINK;

  return {
    ...settings,
    cafecito: {
      ...cafecito,
      amount: Number.isFinite(amount) && amount >= 1 ? Math.round(amount) : DEFAULT_CAFECITO_AMOUNT,
      mercadoPagoLink,
      paypalLink,
      paypalCurrency: normalizePaypalCurrency(cafecito.paypalCurrency),
      paypalUnitAmount: normalizePaypalUnitAmount(cafecito.paypalUnitAmount),
    },
  };
};

const getCafecitoSettings = async () => {
  const settings: any = withCafecitoPaymentDefaults(await getStoredSettings());
  const amount = Number(settings?.cafecito?.amount);
  const mercadoPagoLink = typeof settings?.cafecito?.mercadoPagoLink === 'string'
    ? settings.cafecito.mercadoPagoLink.trim()
    : '';
  const paypalLink = typeof settings?.cafecito?.paypalLink === 'string'
    ? settings.cafecito.paypalLink.trim()
    : '';

  return {
    amount: Number.isFinite(amount) && amount >= 1 ? Math.round(amount) : DEFAULT_CAFECITO_AMOUNT,
    mercadoPagoLink: isExternalHttpUrl(mercadoPagoLink) ? mercadoPagoLink : '',
    paypalLink: isPayPalUrl(paypalLink) ? paypalLink : '',
    paypalCurrency: normalizePaypalCurrency(settings?.cafecito?.paypalCurrency),
    paypalUnitAmount: normalizePaypalUnitAmount(settings?.cafecito?.paypalUnitAmount),
  };
};

const isCafecitoCampaign = (campaignId: unknown) => String(campaignId || 'c3') === 'c3';
const clampCafecitoQuantity = (value: unknown) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 99);
};

/* Genera un token de descarga firmado, válido 48h. Atado al purchaseId
   y al itemId del producto. Lo verifica /api/download/:token (general) o
   /api/wallpapers/download (wallpapers gratis). */
const DOWNLOAD_TOKEN_TTL_HOURS = 48;
const generateDownloadToken = (purchaseId: string, itemId: string, type: string) => {
  const expiresInSec = DOWNLOAD_TOKEN_TTL_HOURS * 3600;
  const token = jwt.sign(
    { pid: purchaseId, iid: itemId, typ: 'dl', kind: type },
    EFFECTIVE_JWT_SECRET,
    { expiresIn: expiresInSec }
  );
  const expiresAt = new Date(Date.now() + expiresInSec * 1000);
  return { token, expiresAt };
};

const processApprovedPayment = async (payment: Awaited<ReturnType<Payment['get']>>) => {
  if (!payment.id || payment.status !== 'approved') {
    return { processed: false, reason: 'payment-not-approved' as const };
  }

  const paymentId = String(payment.id);
  const existing = await db
    .prepare('SELECT paymentId FROM processed_payments WHERE paymentId = ?')
    .get(paymentId) as { paymentId: string } | undefined;

  if (existing) {
    return { processed: false, reason: 'already-processed' as const };
  }

  const metadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
  const rawCampaignId = typeof metadata.campaignId === 'string' ? metadata.campaignId.trim() : '';
  const fallbackCampaignId = 'c3';
  const campaignExists = rawCampaignId
    ? (await db.prepare('SELECT id FROM campaigns WHERE id = ?').get(rawCampaignId) as { id: string } | undefined)
    : undefined;
  const campaignId = campaignExists?.id || fallbackCampaignId;

  const rawSupporterName = typeof metadata.supporterName === 'string' ? metadata.supporterName.trim() : '';
  const supporterName = rawSupporterName || 'Anónimo';
  const message = typeof metadata.message === 'string' ? metadata.message.trim() : '';
  const amount = Number(payment.transaction_amount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid transaction amount for payment ${paymentId}`);
  }

  const messageId = `msg_${Date.now()}_${paymentId}`;
  const processedAt = new Date().toISOString();
  const createdAt = payment.date_approved || payment.date_created || processedAt;

  /* ---------- DELIVERY: si el pago tiene purchaseId en metadata, marcar
     paid + generar download_token + mandar email. Idempotente vía
     `processed_payments.payment_id` PK + `purchases.email_sent_at`. ---- */
  const purchaseIdFromMeta = typeof metadata.purchaseId === 'string' ? metadata.purchaseId.trim() : '';
  const purchaseIdFromExtRef = typeof payment.external_reference === 'string' && payment.external_reference.startsWith('pur_')
    ? payment.external_reference
    : '';
  const purchaseId = purchaseIdFromMeta || purchaseIdFromExtRef;
  const purchaseType = typeof metadata.type === 'string' ? metadata.type.trim() : '';
  const itemIdFromMeta = typeof metadata.itemId === 'string' ? metadata.itemId.trim() : '';
  const buyerEmail = typeof metadata.email === 'string' ? metadata.email.trim().toLowerCase() : '';

  let deliveryInfo: { downloadUrl?: string; productTitle?: string; emailSent?: boolean } = {};

  if (purchaseId) {
    const purchaseRow: any = await db.prepare(
      'SELECT id, status, title, email, itemId, type, downloadToken, emailSentAt FROM purchases WHERE id = ?'
    ).get(purchaseId);

    if (purchaseRow) {
      const finalEmail = buyerEmail || purchaseRow.email;
      const finalItemId = itemIdFromMeta || purchaseRow.itemId || '';
      const finalType = purchaseType || purchaseRow.type || '';
      const productTitle = purchaseRow.title || 'tu compra';

      // Generate token only if not already there (idempotent)
      let downloadToken: string = purchaseRow.downloadToken || '';
      let downloadExpiresAt: Date;
      if (!downloadToken) {
        const fresh = generateDownloadToken(purchaseId, finalItemId, finalType);
        downloadToken = fresh.token;
        downloadExpiresAt = fresh.expiresAt;
      } else {
        // Reuse existing; estimate expiry from JWT decode
        try {
          const decoded: any = jwt.decode(downloadToken);
          downloadExpiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + DOWNLOAD_TOKEN_TTL_HOURS * 3600 * 1000);
        } catch {
          downloadExpiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_HOURS * 3600 * 1000);
        }
      }

      const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'https://balosky.com';
      const downloadUrl = `${baseUrl}/api/download/${encodeURIComponent(downloadToken)}`;

      // Update purchase row → paid
      await db.prepare(`
        UPDATE purchases
        SET status = ?, paymentId = ?, paidAt = ?, downloadToken = ?, downloadExpiresAt = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        'paid',
        paymentId,
        processedAt,
        downloadToken,
        downloadExpiresAt.toISOString(),
        processedAt,
        purchaseId
      );

      // Send email — only if not previously sent (idempotent across webhook retries)
      // Branching por tipo:
      //   - product/wallpaper/pack → sendDeliveryEmail (lleva downloadUrl real)
      //   - campaign (cafecito, encargo, aporte libre) → sendThanksEmail
      //   - membership se maneja aparte (processPreapproval + sendWelcomeBaloskier)
      const isEncargo = /\[ENCARGO/i.test(message) || /encargo/i.test(productTitle);
      const needsDelivery = ['product', 'wallpaper', 'pack'].includes(finalType);
      if (!purchaseRow.emailSentAt && finalEmail) {
        try {
          const sendResult = needsDelivery
            ? await sendDeliveryEmail({
                to: finalEmail,
                productTitle,
                downloadUrl,
                expiresAt: downloadExpiresAt,
                amount,
                purchaseId,
                supporterName: rawSupporterName || undefined,
              })
            : await sendThanksEmail({
                to: finalEmail,
                supporterName: rawSupporterName || undefined,
                amount,
                itemTitle: productTitle,
                isEncargo,
                purchaseId
              });
          if (sendResult.ok) {
            await db.prepare('UPDATE purchases SET emailSentAt = ? WHERE id = ?')
              .run(new Date().toISOString(), purchaseId);
            deliveryInfo.emailSent = true;
          } else {
            console.error('[processApprovedPayment] email send failed:', sendResult.error);
          }
        } catch (emailErr) {
          console.error('[processApprovedPayment] email exception:', emailErr);
        }
      }

      /* Admin alert — Santi se entera apenas cae algo. Se manda siempre
         que la sub no estaba ya en estado final (idempotencia vía
         emailSentAt del purchase). */
      if (!purchaseRow.emailSentAt) {
        await sendAdminAlert({
          kind: isEncargo ? 'encargo' : (finalType === 'campaign' ? 'cafecito' : 'purchase'),
          summary: `${productTitle} · $${amount.toLocaleString('es-AR')} ARS · ${finalEmail || 'sin email'}`,
          details: {
            supporterName: rawSupporterName,
            email: finalEmail,
            amount,
            type: finalType,
            itemId: finalItemId,
            purchaseId,
            paymentId,
            message: message ? message.slice(0, 300) : ''
          }
        }).catch((e) => console.error('[processApprovedPayment] admin alert error', e));
      }

      deliveryInfo.downloadUrl = downloadUrl;
      deliveryInfo.productTitle = productTitle;
    } else {
      console.warn('[processApprovedPayment] purchase not found for id', purchaseId);
    }
  }

  /* ---------- MURO + CAMPAÑA (siempre, como antes) ----------
     Mantenemos el comportamiento existente: cualquier aporte aprobado se
     manifiesta en el muro y suma al campaign 'c3' (Cafecito) por default. */
  await db.prepare(`
    INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, supporterName, amount, message || null, rawSupporterName ? 0 : 1, 1, createdAt, campaignId);

  await db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, campaignId);

  await db.prepare(`
    INSERT INTO processed_payments (paymentId, messageId, campaignId, supporterName, amount, status, externalReference, processedAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId,
    messageId,
    campaignId,
    supporterName,
    amount,
    payment.status,
    payment.external_reference || null,
    processedAt,
    createdAt
  );

  /* Admin alert para el path legacy (cafecitos sin purchaseId capturado).
     Idempotencia garantizada por la PK de processed_payments arriba: si el
     webhook reintenta, `existing` arriba corta el flow antes de llegar acá. */
  if (!purchaseId) {
    await sendAdminAlert({
      kind: 'cafecito',
      summary: `${supporterName} · $${amount.toLocaleString('es-AR')} ARS · ${campaignId}`,
      details: {
        supporterName,
        amount,
        campaignId,
        paymentId,
        message: message ? message.slice(0, 300) : ''
      }
    }).catch((e) => console.error('[processApprovedPayment] legacy admin alert error', e));
  }

  return {
    processed: true,
    reason: 'processed' as const,
    campaignId,
    supporterName,
    amount,
    message,
    purchaseId: purchaseId || undefined,
    downloadUrl: deliveryInfo.downloadUrl,
    productTitle: deliveryInfo.productTitle,
    emailSent: deliveryInfo.emailSent
  };
};

const getPurchaseIdFromPayment = (payment: Awaited<ReturnType<Payment['get']>>) => {
  const metadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
  const purchaseIdFromMeta = typeof metadata.purchaseId === 'string' ? metadata.purchaseId.trim() : '';
  const purchaseIdFromExtRef =
    typeof payment.external_reference === 'string' && payment.external_reference.startsWith('pur_')
      ? payment.external_reference
      : '';
  return purchaseIdFromMeta || purchaseIdFromExtRef;
};

const PURCHASE_STATUS_BY_MP_STATUS: Record<string, string> = {
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  authorized: 'pending',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'refunded'
};

const syncPurchaseStatusFromPayment = async (payment: Awaited<ReturnType<Payment['get']>>) => {
  const purchaseId = getPurchaseIdFromPayment(payment);
  const paymentId = payment.id ? String(payment.id) : '';
  const mpStatus = String(payment.status || '').toLowerCase();
  const nextStatus = PURCHASE_STATUS_BY_MP_STATUS[mpStatus];

  if (!purchaseId || !nextStatus) {
    return { synced: false, reason: 'not-a-purchase-payment' as const };
  }

  const row: any = await db.prepare('SELECT id, status FROM purchases WHERE id = ?').get(purchaseId);
  if (!row) {
    console.warn('[payments] status sync skipped: purchase not found', { purchaseId, paymentId, mpStatus });
    return { synced: false, reason: 'purchase-not-found' as const };
  }

  // Do not downgrade a delivered purchase unless MP reports money reversal.
  if (row.status === 'paid' && !['refunded', 'charged_back'].includes(mpStatus)) {
    return { synced: false, reason: 'already-paid' as const };
  }

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE purchases
    SET status = ?, paymentId = COALESCE(paymentId, ?), updatedAt = ?
    WHERE id = ?
  `).run(nextStatus, paymentId || null, now, purchaseId);

  console.info('[payments] purchase status synced', { purchaseId, paymentId, mpStatus, purchaseStatus: nextStatus });
  return { synced: true, reason: 'synced' as const, purchaseId, status: nextStatus };
};

// --- AUTH MIDDLEWARE ---
const verifyAdminAuthHeader = (authHeader: string | undefined) => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET);
  } catch {
    return null;
  }
};

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const decoded = verifyAdminAuthHeader(req.headers.authorization);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  (req as any).user = decoded;
  next();
};

// --- AUTH ---
router.get('/auth/status', async (_req, res) => {
  try {
    const hasAdmin = await hasAdminUsers();
    res.json({ hasAdmin, bootstrapAvailable: !hasAdmin });
  } catch (e) {
    console.error('[GET /auth/status]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/auth/bootstrap', authLimiter, async (req, res) => {
  try {
    const hasAdmin = await hasAdminUsers();
    if (hasAdmin) {
      return res.status(409).json({ error: 'Admin already configured' });
    }

    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must have at least 3 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must have at least 8 characters' });
    }

    const user = await createAdminUser(username, password);
    const token = jwt.sign({ id: user.id, username: user.username }, EFFECTIVE_JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({ token, user });
  } catch (e) {
    console.error('[POST /auth/bootstrap]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db
      .prepare('SELECT id, username, passwordHash, role FROM users WHERE username = ?')
      .get(username) as any;

    if (user && verifyPassword(password, user.passwordHash)) {
      const token = jwt.sign({ id: user.id, username: user.username }, EFFECTIVE_JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    console.error('[POST /auth/login]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.get('/auth/me', requireAuth, async (req, res) => {
  const user = (req as any).user || {};
  res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

router.put('/auth/credentials', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must have at least 3 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must have at least 8 characters' });
    }

    const existingUser = await db
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .get(username, userId) as { id: string } | undefined;

    if (existingUser) {
      return res.status(409).json({ error: 'Username already in use' });
    }

    await updateAdminUserCredentials(userId, username, password);
    const token = jwt.sign({ id: userId, username }, EFFECTIVE_JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, user: { id: userId, username } });
  } catch (e) {
    console.error('[PUT /auth/credentials]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- PRODUCTS ---
router.get('/products', async (req, res) => {
  try {
    const products = await db.prepare('SELECT * FROM products ORDER BY sortOrder ASC').all();
    res.json(products.map((p: any) => ({
      ...p,
      active: Boolean(p.active),
      featured: Boolean(p.featured)
    })));
  } catch (e) {
    console.error('[GET /products]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/products', requireAuth, async (req, res) => {
  try {
    const p = req.body;
    const id = `prod_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO products (id, title, description, price, category, coverImage, deliveryType, fileUrl, externalUrl, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, p.title, p.description, p.price, p.category, p.coverImage, p.deliveryType, p.fileUrl || null, p.externalUrl || null, p.active ? 1 : 0, p.featured ? 1 : 0, p.sortOrder || 0, createdAt);

    const result = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[POST /products]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;
    await db.prepare(`
      UPDATE products
      SET title = ?, description = ?, price = ?, category = ?, coverImage = ?, deliveryType = ?, fileUrl = ?, externalUrl = ?, active = ?, featured = ?, sortOrder = ?
      WHERE id = ?
    `).run(p.title, p.description, p.price, p.category, p.coverImage, p.deliveryType, p.fileUrl || null, p.externalUrl || null, p.active ? 1 : 0, p.featured ? 1 : 0, p.sortOrder || 0, id);
    const result = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[PUT /products/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /products/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- IDEAS ---
const mapIdeaRow = (row: any) => ({
  ...row,
  tags: row?.tags ? (() => { try { return JSON.parse(row.tags); } catch { return []; } })() : [],
  active: Boolean(row?.active),
  featured: Boolean(row?.featured)
});

router.get('/ideas', async (_req, res) => {
  try {
    const ideas = await db.prepare('SELECT * FROM ideas ORDER BY sortOrder ASC, createdAt DESC').all();
    res.json(ideas.map(mapIdeaRow));
  } catch (e) {
    console.error('[GET /ideas]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/ideas', requireAuth, async (req, res) => {
  try {
    const i = req.body;
    const id = `idea_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO ideas (id, title, description, url, coverImage, category, tags, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      i.title,
      i.description,
      i.url,
      i.coverImage || null,
      i.category || null,
      i.tags ? JSON.stringify(i.tags) : null,
      i.active === false ? 0 : 1,
      i.featured ? 1 : 0,
      i.sortOrder || 0,
      createdAt
    );

    const row = await db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    res.json(mapIdeaRow(row));
  } catch (e) {
    console.error('[POST /ideas]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/ideas/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const i = req.body;
    await db.prepare(`
      UPDATE ideas
      SET title = ?, description = ?, url = ?, coverImage = ?, category = ?, tags = ?, active = ?, featured = ?, sortOrder = ?
      WHERE id = ?
    `).run(
      i.title,
      i.description,
      i.url,
      i.coverImage || null,
      i.category || null,
      i.tags ? JSON.stringify(i.tags) : null,
      i.active === false ? 0 : 1,
      i.featured ? 1 : 0,
      i.sortOrder || 0,
      id
    );
    const row = await db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    res.json(mapIdeaRow(row));
  } catch (e) {
    console.error('[PUT /ideas/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/ideas/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /ideas/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- MEMBERSHIPS ---
router.get('/memberships', async (req, res) => {
  try {
    const memberships = await db.prepare('SELECT * FROM memberships ORDER BY sortOrder ASC').all();
    res.json(memberships.map((m: any) => ({
      ...m,
      benefits: JSON.parse(m.benefits),
      isHighlighted: Boolean(m.isHighlighted),
      active: Boolean(m.active)
    })));
  } catch (e) {
    console.error('[GET /memberships]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/memberships', requireAuth, async (req, res) => {
  try {
    const m = req.body;
    const id = `memb_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, m.name, m.price, m.billingPeriod, m.description, JSON.stringify(m.benefits || []), m.isHighlighted ? 1 : 0, m.active ? 1 : 0, m.sortOrder || 0, createdAt);

    const result = await db.prepare('SELECT * FROM memberships WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[POST /memberships]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/memberships/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const m = req.body;
    await db.prepare(`
      UPDATE memberships
      SET name = ?, price = ?, billingPeriod = ?, description = ?, benefits = ?, isHighlighted = ?, active = ?, sortOrder = ?
      WHERE id = ?
    `).run(m.name, m.price, m.billingPeriod, m.description, JSON.stringify(m.benefits || []), m.isHighlighted ? 1 : 0, m.active ? 1 : 0, m.sortOrder || 0, id);
    const result = await db.prepare('SELECT * FROM memberships WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[PUT /memberships/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/memberships/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM memberships WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /memberships/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- CAMPAIGNS ---
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await db.prepare('SELECT * FROM campaigns ORDER BY sortOrder ASC').all();
    res.json(campaigns.map((c: any) => ({
      ...c,
      active: c.status === 'active',
      isFeatured: Boolean(c.isFeatured)
    })));
  } catch (e) {
    console.error('[GET /campaigns]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/campaigns', requireAuth, async (req, res) => {
  try {
    const c = req.body;
    const id = `camp_${Date.now()}`;
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO campaigns (id, title, slug, shortDescription, fullDescription, videoUrl, targetAmount, currentAmount, currency, coverImage, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, c.title, c.slug || id, c.shortDescription, c.fullDescription || null, c.videoUrl || null, c.targetAmount, c.currentAmount || 0, c.currency || 'ARS', c.coverImage, c.status || 'active', c.isFeatured ? 1 : 0, c.sortOrder || 0, c.stretchGoals ? JSON.stringify(c.stretchGoals) : null, createdAt, createdAt);

    const result = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[POST /campaigns]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await db.prepare(`
      UPDATE campaigns
      SET title = ?, shortDescription = ?, fullDescription = ?, videoUrl = ?, targetAmount = ?, currentAmount = ?, coverImage = ?, status = ?, isFeatured = ?, sortOrder = ?, stretchGoals = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      updates.title,
      updates.shortDescription,
      updates.fullDescription || null,
      updates.videoUrl || null,
      updates.targetAmount,
      updates.currentAmount,
      updates.coverImage,
      updates.status,
      updates.isFeatured ? 1 : 0,
      updates.sortOrder || 0,
      updates.stretchGoals ? JSON.stringify(updates.stretchGoals) : null,
      new Date().toISOString(),
      id
    );

    const updated = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    res.json(updated);
  } catch (e) {
    console.error('[PUT /campaigns/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /campaigns/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- REWARDS ---
router.get('/rewards', async (req, res) => {
  try {
    const rewards = await db.prepare('SELECT * FROM rewards').all();
    res.json(rewards);
  } catch (e) {
    console.error('[GET /rewards]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- MESSAGES ---
const PUBLIC_EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PUBLIC_PHONE_RE = /(?:\+?\d[\s().-]*){8,}/g;

const redactPublicText = (value: unknown): string | null => {
  if (value == null) return null;
  return String(value)
    .replace(PUBLIC_EMAIL_RE, '[email oculto]')
    .replace(PUBLIC_PHONE_RE, '[tel oculto]');
};

const toPublicMessage = (m: any) => ({
  ...m,
  supporterName: redactPublicText(m.supporterName) || 'Anónimo',
  message: redactPublicText(m.message) || '',
  creatorResponse: redactPublicText(m.creatorResponse),
  isAnonymous: Boolean(m.isAnonymous),
  isApproved: Boolean(m.isApproved)
});

router.get('/messages', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500);
    const messages = await db
      .prepare('SELECT * FROM messages ORDER BY createdAt DESC LIMIT ?')
      .all(limit);
    res.json(messages.map(toPublicMessage));
  } catch (e) {
    console.error('[GET /messages]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/messages/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    await db.prepare('UPDATE messages SET isApproved = ? WHERE id = ?').run(isApproved ? 1 : 0, id);
    res.json({ success: true });
  } catch (e) {
    console.error('[PUT /messages/:id/approve]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/messages/:id/response', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { creatorResponse } = req.body;
    await db.prepare('UPDATE messages SET creatorResponse = ? WHERE id = ?').run(creatorResponse, id);
    res.json({ success: true });
  } catch (e) {
    console.error('[PUT /messages/:id/response]', e);
    res.status(500).json({ error: 'database error' });
  }
});

/* POST /api/messages — mensaje público al muro.
 * --------------------------------------------------------------------------
 * Este endpoint NO cobra: es para dejar mensajes (textos) al muro. Los
 * aportes en plata entran sólo vía MP (processApprovedPayment), que sí
 * pueden sumar al currentAmount de la campaña.
 *
 * Reglas:
 *   - Nombre opcional, máx 60 chars. Si viene vacío → 'Anónimo'.
 *   - Mensaje requerido, máx 240 chars, min 2.
 *   - campaignId opcional; si viene, debe existir (si no existe, cae a null).
 *   - Honeypot 'website' (o 'hp_field'): si viene con valor, 204 silencioso.
 *   - Amount se ignora acá (lo fuerza el webhook). Bots que mandan amount
 *     grande para inflar el contador quedan out.
 *   - Rate limit: writePublicLimiter (5 / 5 min por IP).
 *   - Mensajes creados con isApproved=1 (policy actual: post-moderación).
 */
const MESSAGE_MAX_LEN = 240;
const MESSAGE_MIN_LEN = 2;
const NAME_MAX_LEN = 60;

router.post('/messages', writePublicLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot — los bots llenan campos "ocultos" que un usuario real ni ve.
    if ((body.website && String(body.website).trim()) || (body.hp_field && String(body.hp_field).trim())) {
      // 204 mudo — al bot le parece que funcionó, pero no creamos nada.
      return res.status(204).end();
    }

    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (rawMessage.length < MESSAGE_MIN_LEN) {
      return res.status(400).json({ error: 'Mensaje muy corto' });
    }
    if (rawMessage.length > MESSAGE_MAX_LEN) {
      return res.status(400).json({ error: `Mensaje muy largo (máx ${MESSAGE_MAX_LEN})` });
    }

    const rawName = typeof body.supporterName === 'string' ? body.supporterName.trim().slice(0, NAME_MAX_LEN) : '';
    const isAnonymous = body.isAnonymous === true || !rawName;
    const supporterName = rawName || 'Anónimo';

    // Validar campaignId si viene; si no existe, lo mandamos a null
    let campaignId: string | null = null;
    if (typeof body.campaignId === 'string' && body.campaignId.trim()) {
      const candidate = body.campaignId.trim();
      const exists = await db
        .prepare('SELECT id FROM campaigns WHERE id = ?')
        .get(candidate) as { id: string } | undefined;
      campaignId = exists ? exists.id : null;
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      supporterName,
      0, // amount siempre 0 acá — sólo el webhook aprobado lo levanta
      rawMessage,
      isAnonymous ? 1 : 0,
      1,
      createdAt,
      campaignId
    );

    const leadSignal = detectMessageLead(rawMessage);
    if (leadSignal.shouldNotify) {
      const adminUrl = `${getBaseUrl(req)}/admin/messages`;
      await sendAdminAlert({
        kind: 'lead',
        summary: `${supporterName} · ${leadSignal.reasons.join(', ')}`,
        details: {
          supporterName,
          reason: leadSignal.reasons.join(', '),
          message: rawMessage,
          campaignId,
          messageId: id,
          adminUrl
        }
      }).catch((alertError) => console.error('[POST /messages] lead alert error', alertError));
    }

    const newMessage: any = await db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.json(toPublicMessage(newMessage));
  } catch (e) {
    console.error('[POST /messages]', e);
    res.status(500).json({ error: 'database error' });
  }
});

/**
 * POST /api/encargos — pre-pedidos de videos IA / consultoría / proyectos.
 *
 * Santi aclaró: "son todas cosas a charlar, no hacen la compra por ahí, acá
 * hacen un pre pedido, y me mandan lo que quieren y me tiene que llegar".
 * Este endpoint es el backend de ese flujo. La gente llena el form en el
 * MonetizacionHub (tab A MEDIDA) o en la card de VIDEO IA de PUNTUAL, se
 * crea una fila con status='nuevo' y Santi la revisa desde /admin.
 *
 * No hay flujo de pago acá. Cuando Santi confirma por email/IG, recién
 * ahí se emite un checkout manual o una subscription si corresponde.
 *
 * Rate limit: writePublicLimiter (mismo que messages/newsletter/wallpapers).
 * Honeypot: mismo pattern que /messages.
 */
const ENCARGO_NAME_MAX = 80;
const ENCARGO_CONTACT_MAX = 160;
const ENCARGO_BRIEF_MIN = 10;
const ENCARGO_BRIEF_MAX = 1200;
const ENCARGO_REFERENCE_MAX = 500;
const ENCARGO_PACKAGES = new Set([
  'reel', 'spot', 'historia', 'consultoria', 'serie', 'web', 'proyecto', 'custom',
  // Paquetes de la landing /productora (pack pauta de 3 variantes, campaña
  // con distribución en la cuenta de Santi, y retainer mensual de canal 24/7).
  'pack', 'campania', 'canal',
]);
const ENCARGO_STATUSES = new Set(['nuevo', 'respondido', 'cotizado', 'ganado', 'perdido']);
const ENCARGO_PAYMENT_RE = /\[ENCARGO\]|\bencargo\b/i;

const normalizeEncargoStatus = (status: unknown) => {
  const raw = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (raw === 'pending') return 'nuevo';
  if (raw === 'contacted') return 'respondido';
  if (raw === 'confirmed' || raw === 'done') return 'ganado';
  if (raw === 'cancelled' || raw === 'canceled') return 'perdido';
  return ENCARGO_STATUSES.has(raw) ? raw : 'nuevo';
};

// Anclas de la landing /productora — valor default del deal al crearse.
const ENCARGO_PACKAGE_VALUES: Record<string, number> = {
  spot: 500,
  pack: 900,
  campania: 2500,
  canal: 1500,
};

const mapEncargoRow = (row: any) => ({
  ...row,
  packageId: row.packageId || row.package_id || 'custom',
  referenceUrl: row.referenceUrl || row.reference_url || null,
  status: normalizeEncargoStatus(row.status),
  estimatedValue: row.estimatedValue ?? row.estimated_value ?? null,
});

router.get('/encargos', requireAuth, async (_req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT *
      FROM encargos
      ORDER BY createdAt DESC
      LIMIT 250
    `).all();
    res.json(rows.map(mapEncargoRow));
  } catch (e) {
    console.error('[GET /encargos]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/encargos/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const status = normalizeEncargoStatus(req.body?.status);
    const updatedAt = new Date().toISOString();

    await db
      .prepare('UPDATE encargos SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, updatedAt, id);

    const row = await db.prepare('SELECT * FROM encargos WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Encargo no encontrado' });
    res.json(mapEncargoRow(row));
  } catch (e) {
    console.error('[PUT /encargos/:id/status]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/encargos/:id/value', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body?.value;
    const parsed = raw === null || raw === '' ? null : Number(raw);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000)) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    const value = parsed === null ? null : Math.round(parsed);
    const updatedAt = new Date().toISOString();

    await db
      .prepare('UPDATE encargos SET estimated_value = ?, updatedAt = ? WHERE id = ?')
      .run(value, updatedAt, id);

    const row = await db.prepare('SELECT * FROM encargos WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Encargo no encontrado' });
    res.json(mapEncargoRow(row));
  } catch (e) {
    console.error('[PUT /encargos/:id/value]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/encargos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM encargos WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /encargos/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

/**
 * GET /api/productora/slots — disponibilidad pública del mes.
 *
 * Un "slot" es un encargo ganado este mes en el CRM (status='ganado',
 * fecha de última actualización dentro del mes corriente). La capacidad
 * mensual sale de settings.productora.slotsPerMonth (default 4, tope 20).
 * Devuelve sólo números agregados — nada del contenido de los deals — para
 * que la landing muestre escasez real y verificable, no inventada.
 */
router.get('/productora/slots', async (_req, res) => {
  try {
    const settings: any = await getStoredSettings();
    const configured = Number(settings?.productora?.slotsPerMonth);
    const total = Number.isFinite(configured) ? Math.max(1, Math.min(20, Math.round(configured))) : 4;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const rows = await db.prepare('SELECT * FROM encargos LIMIT 500').all();
    const taken = (rows as any[]).filter((row) => {
      if (normalizeEncargoStatus(row.status) !== 'ganado') return false;
      const stamp = row.updatedAt || row.updated_at || row.createdAt || row.created_at || '';
      const ts = Date.parse(stamp);
      return Number.isFinite(ts) && ts >= monthStart.getTime();
    }).length;

    // WhatsApp comercial: PRODUCTORA_WHATSAPP pisa al teléfono de alertas.
    // Sólo dígitos (formato wa.me). Si no hay número, el front oculta el botón.
    const rawPhone = process.env.PRODUCTORA_WHATSAPP || process.env.WHATSAPP_ALERT_PHONE || '';
    const whatsapp = rawPhone.replace(/\D/g, '') || null;

    res.json({ total, taken: Math.min(taken, total), remaining: Math.max(0, total - taken), whatsapp });
  } catch (e) {
    console.error('[GET /productora/slots]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/encargos', writePublicLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot — igual que en /messages, los bots llenan campos ocultos.
    if ((body.website && String(body.website).trim()) || (body.hp_field && String(body.hp_field).trim())) {
      return res.status(204).end();
    }

    const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, ENCARGO_NAME_MAX) : '';
    if (!rawName) {
      return res.status(400).json({ error: 'Faltan tus datos de contacto (nombre)' });
    }

    const rawContact = typeof body.contact === 'string' ? body.contact.trim().slice(0, ENCARGO_CONTACT_MAX) : '';
    if (!rawContact) {
      return res.status(400).json({ error: 'Dejame cómo contactarte (email o @IG)' });
    }

    const rawBrief = typeof body.brief === 'string' ? body.brief.trim() : '';
    if (rawBrief.length < ENCARGO_BRIEF_MIN) {
      return res.status(400).json({ error: 'Contame un poco más de lo que necesitás' });
    }
    if (rawBrief.length > ENCARGO_BRIEF_MAX) {
      return res.status(400).json({ error: `Brief muy largo (máx ${ENCARGO_BRIEF_MAX})` });
    }

    const rawPackage = typeof body.packageId === 'string' ? body.packageId.trim().toLowerCase() : '';
    const packageId = ENCARGO_PACKAGES.has(rawPackage) ? rawPackage : 'custom';

    const rawReference =
      typeof body.referenceUrl === 'string' ? body.referenceUrl.trim().slice(0, ENCARGO_REFERENCE_MAX) : '';

    const id = `enc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    const estimatedValue = ENCARGO_PACKAGE_VALUES[packageId] ?? null;
    await db
      .prepare(
        `INSERT INTO encargos (id, name, contact, package_id, brief, reference_url, status, created_at, estimated_value)
         VALUES (?, ?, ?, ?, ?, ?, 'nuevo', ?, ?)`,
      )
      .run(id, rawName, rawContact, packageId, rawBrief, rawReference || null, createdAt, estimatedValue);

    const adminUrl = `${getBaseUrl(req)}/admin/encargos`;
    await sendAdminAlert({
      kind: 'encargo',
      summary: `${rawName} · ${packageId} · ${rawContact}`,
      details: {
        name: rawName,
        contact: rawContact,
        packageId,
        brief: rawBrief.slice(0, 600),
        referenceUrl: rawReference || '',
        encargoId: id,
        adminUrl
      }
    }).catch((alertError) => console.error('[POST /encargos] admin alert error', alertError));

    // Auto-reply al lead: si dejó un email, le confirmamos al toque que el
    // brief llegó y le damos el reel para que siga caliente mientras Santi
    // responde. Fire-and-forget — si Resend no está configurado, el servicio
    // lo loguea en consola (dev stub) y no rompe nada.
    const contactEmail = rawContact.match(/[^\s<>,;]+@[^\s<>,;]+\.[^\s<>,;]+/)?.[0];
    if (contactEmail) {
      sendThanksEmail({
        to: contactEmail,
        supporterName: rawName,
        itemTitle: `Consulta productora · ${packageId}`,
        isEncargo: true,
        nextSteps:
          'Me llegó tu consulta. La leo y te respondo en menos de 24 horas con una propuesta concreta y un número. Mientras tanto, mirá el reel: balosky.com/reel — así ves el tono de lo que hago.',
        purchaseId: id,
      }).catch((ackError) => console.error('[POST /encargos] ack email error', ackError));
    }

    res.json({ ok: true, id });
  } catch (e) {
    console.error('[POST /encargos]', e);
    res.status(500).json({ error: 'No pudimos guardar tu pedido. Probá de nuevo o escribime por IG.' });
  }
});

router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /messages/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- DISCOUNT CODES ---
router.get('/discount-codes', requireAuth, async (req, res) => {
  try {
    const codes = await db.prepare('SELECT * FROM discount_codes').all();
    res.json(codes.map((c: any) => ({ ...c, active: Boolean(c.active) })));
  } catch (e) {
    console.error('[GET /discount-codes]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/discount-codes', requireAuth, async (req, res) => {
  try {
    const { code, discountPercent, active } = req.body;
    const id = `dc_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await db.prepare('INSERT INTO discount_codes (id, code, discountPercent, active, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, code, discountPercent, active ? 1 : 0, createdAt);
    const result = await db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[POST /discount-codes]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/discount-codes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountPercent, active } = req.body;
    await db.prepare('UPDATE discount_codes SET code = ?, discountPercent = ?, active = ? WHERE id = ?').run(code, discountPercent, active ? 1 : 0, id);
    const result = await db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[PUT /discount-codes/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/discount-codes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM discount_codes WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /discount-codes/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- PURCHASES ---
router.get('/purchases', requireAuth, async (req, res) => {
  try {
    const purchases = await db.prepare('SELECT * FROM purchases ORDER BY createdAt DESC').all();
    res.json(purchases);
  } catch (e) {
    console.error('[GET /purchases]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/purchases', requireAuth, async (req, res) => {
  try {
    const { supporterName, type, itemId, title } = req.body;
    const id = `pur_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await db.prepare('INSERT INTO purchases (id, supporterName, type, itemId, title, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(id, supporterName, type, itemId, title, createdAt);
    const result = await db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    res.json(result);
  } catch (e) {
    console.error('[POST /purchases]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/purchases/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /purchases/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- SETTINGS ---
router.get('/settings', async (req, res) => {
  try {
    const row = await db.prepare('SELECT data FROM settings WHERE id = ?').get('global') as any;
    if (row) {
      res.json(withCafecitoPaymentDefaults(JSON.parse(row.data)));
    } else {
      /* Graceful fallback: return empty object so the frontend doesn't log a 404. */
      res.json(withCafecitoPaymentDefaults({}));
    }
  } catch (e) {
    console.error('[GET /settings]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/settings', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    await db.prepare('UPDATE settings SET data = ? WHERE id = ?').run(JSON.stringify(data), 'global');
    res.json(data);
  } catch (e) {
    console.error('[PUT /settings]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- LIGHTWEIGHT PUBLIC ANALYTICS ---
const EVENT_NAMES = new Set([
  'page_view',
  'cta_click',
  'checkout_start',
  'checkout_created',
  'social_click',
  'media_open',
  'encargo_start',
  'encargo_created'
]);
const SENSITIVE_EVENT_RE = /([^\s@]+@[^\s@]+\.[^\s@]+)|(payment|payer|purchase|external[_-]?reference|preference|token|password|secret|access[_-]?token|mp_)/i;

const cleanEventValue = (value: unknown, max = 160) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
};

const summarizeUserAgent = (ua: string) => {
  const raw = cleanEventValue(ua, 220);
  if (!raw) return '';
  const browser = /Edg\//.test(raw) ? 'Edge'
    : /Chrome\//.test(raw) ? 'Chrome'
    : /Safari\//.test(raw) && !/Chrome\//.test(raw) ? 'Safari'
    : /Firefox\//.test(raw) ? 'Firefox'
    : 'Other';
  const os = /Android/i.test(raw) ? 'Android'
    : /iPhone|iPad|iPod/i.test(raw) ? 'iOS'
    : /Mac OS X/i.test(raw) ? 'macOS'
    : /Windows/i.test(raw) ? 'Windows'
    : /Linux/i.test(raw) ? 'Linux'
    : 'Unknown';
  return `${browser} · ${os}`;
};

const sanitizeEventMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const allowed: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>).slice(0, 12)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 40);
    if (!safeKey || SENSITIVE_EVENT_RE.test(safeKey)) continue;
    if (typeof value === 'string') {
      const cleaned = cleanEventValue(value, 120);
      if (cleaned && !SENSITIVE_EVENT_RE.test(cleaned)) allowed[safeKey] = cleaned;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      allowed[safeKey] = value;
    } else if (typeof value === 'boolean') {
      allowed[safeKey] = value;
    }
  }
  return allowed;
};

const createEventId = () => `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const insertWebEvent = async (args: {
  eventName: string;
  path: string;
  target?: string;
  sessionId?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) => {
  const metadataJson = JSON.stringify(sanitizeEventMetadata(args.metadata || {}));
  await db.prepare(`
    INSERT INTO web_events (id, eventName, path, target, sessionId, userAgent, metadataJson, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    createEventId(),
    args.eventName,
    cleanEventValue(args.path, 180) || '/',
    cleanEventValue(args.target, 160) || null,
    cleanEventValue(args.sessionId, 80) || null,
    cleanEventValue(args.userAgent, 220) || null,
    metadataJson,
    new Date().toISOString()
  );
};

router.post('/events', eventLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const eventName = cleanEventValue(body.eventName, 48);
    if (!EVENT_NAMES.has(eventName)) {
      return res.status(400).json({ error: 'Evento inválido' });
    }

    const pathValue = cleanEventValue(body.path, 180) || '/';
    const target = cleanEventValue(body.target, 160);
    const sessionId = cleanEventValue(body.sessionId, 80);
    const metadata = sanitizeEventMetadata(body.metadata);
    const metadataJson = JSON.stringify(metadata);

    if (
      SENSITIVE_EVENT_RE.test(pathValue) ||
      SENSITIVE_EVENT_RE.test(target) ||
      SENSITIVE_EVENT_RE.test(sessionId) ||
      metadataJson.length > 1200
    ) {
      return res.status(400).json({ error: 'Evento inválido' });
    }

    await insertWebEvent({
      eventName,
      path: pathValue,
      target,
      sessionId,
      userAgent: summarizeUserAgent(String(req.headers['user-agent'] || '')),
      metadata,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[POST /events]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.get('/events/summary', requireAuth, async (req, res) => {
  try {
    const requestedDays = Number(req.query.days);
    const days = Number.isFinite(requestedDays)
      ? Math.min(90, Math.max(1, Math.round(requestedDays)))
      : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const rows = await db.prepare(`
      SELECT eventName, COUNT(*)::int AS count
      FROM web_events
      WHERE createdAt >= ?
      GROUP BY eventName
    `).all(since) as any[];

    const topPaths = await db.prepare(`
      SELECT path, COUNT(*)::int AS count
      FROM web_events
      WHERE createdAt >= ? AND eventName = 'page_view' AND path IS NOT NULL
      GROUP BY path
      ORDER BY count DESC
      LIMIT 8
    `).all(since) as any[];

    const recentEvents = await db.prepare(`
      SELECT id, eventName, path, target, metadataJson, createdAt
      FROM web_events
      WHERE createdAt >= ?
      ORDER BY createdAt DESC
      LIMIT 40
    `).all(since) as any[];

    const recent = await db.prepare(`
      SELECT id, eventName, path, target, metadataJson, createdAt
      FROM web_events
      WHERE eventName IN ('encargo_start', 'encargo_created')
      ORDER BY createdAt DESC
      LIMIT 20
    `).all() as any[];

    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.eventName)] = Number(row.count || 0);
      return acc;
    }, {});
    const starts = counts.encargo_start || 0;
    const created = counts.encargo_created || 0;

    res.json({
      days,
      counts,
      topPaths: topPaths.map((row) => ({
        path: String(row.path || '/'),
        count: Number(row.count || 0),
      })),
      encargo: {
        starts,
        created,
        conversionRate: starts > 0 ? Math.round((created / starts) * 1000) / 10 : 0,
      },
      recentEvents: recentEvents.map((row) => {
        let metadata = {};
        try {
          metadata = row.metadataJson ? JSON.parse(row.metadataJson) : {};
        } catch {
          metadata = {};
        }
        return { ...row, metadata };
      }),
      recentEncargoEvents: recent.map((row) => {
        let metadata = {};
        try {
          metadata = row.metadataJson ? JSON.parse(row.metadataJson) : {};
        } catch {
          metadata = {};
        }
        return { ...row, metadata };
      }),
    });
  } catch (e) {
    console.error('[GET /events/summary]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- MERCADO PAGO ---
router.post('/checkout/preference', async (req, res) => {
  try {
    const { amount, title, campaignId, supporterName, message, email } = req.body;
    const normalizedAmount = Number(amount);
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    const normalizedCampaignId = typeof campaignId === 'string' ? campaignId.trim() : '';

    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (normalizedEmail && !EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (
      ENCARGO_PAYMENT_RE.test(normalizedTitle) ||
      ENCARGO_PAYMENT_RE.test(normalizedMessage) ||
      ENCARGO_PAYMENT_RE.test(normalizedCampaignId)
    ) {
      return res.status(400).json({ error: 'Los encargos entran como pre-pedido y se pagan después de cotizar.' });
    }

    const cafecitoSettings = isCafecitoCampaign(campaignId)
      ? await getCafecitoSettings()
      : null;
    if (cafecitoSettings?.mercadoPagoLink) {
      return res.json({
        init_point: cafecitoSettings.mercadoPagoLink,
        sandbox_init_point: cafecitoSettings.mercadoPagoLink
      });
    }
    const finalAmount = cafecitoSettings
      ? Math.max(normalizedAmount, cafecitoSettings.amount)
      : normalizedAmount;

    const baseUrl = getBaseUrl(req);
    const notificationUrl = getNotificationUrl(req);
    const autoReturn = shouldUseAutoReturn(baseUrl) ? 'approved' : undefined;

    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: campaignId || 'general',
            title: normalizedTitle || 'Aporte a Creador',
            quantity: 1,
            unit_price: finalAmount,
            currency_id: 'ARS'
          }
        ],
        ...(normalizedEmail ? { payer: { email: normalizedEmail } } : {}),
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`
        },
        ...(autoReturn ? { auto_return: autoReturn } : {}),
        external_reference: `${campaignId || 'general'}-${Date.now()}`,
        metadata: {
          campaignId,
          email: normalizedEmail,
          supporterName: typeof supporterName === 'string' ? supporterName.trim() : '',
          message: normalizedMessage
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {})
      }
    });

    res.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });
  } catch (error) {
    console.error('Mercado Pago Error:', error);
    const detail =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Error creating preference';
    res.status(500).json({ error: 'Error creating preference', detail });
  }
});

/**
 * GET /checkout/quick
 *
 * CTA de "1 click → pago". Se usa como `<a href="/api/checkout/quick?mode=cafecito">`
 * y hace 302 directo al init_point de MP sin intermediario ni JS. Para PayPal,
 * `/api/checkout/quick?mode=cafecito&provider=paypal&qty=3` va a PayPal.Me.
 *
 * Modos soportados:
 *   - cafecito     → monto configurado en Ajustes, campaignId=c3
 *   - pack-images  → $80.000 ARS, campaignId=c3 (pack 5 imágenes IA)
 *   - pack-walls   → $3.500 ARS, campaignId=c3 (pack 10 wallpapers)
 *   - libre        → monto custom via ?amount= (mínimo $100), campaignId=c3
 *
 * Los encargos IA no entran por quick checkout: van a pre-pedido y se cotizan.
 */
const QUICK_CHECKOUT_MODES: Record<string, { amount: number; title: string; campaignId: string }> = {
  'pack-images': { amount: 80000,  title: 'Pack 5 imágenes IA — Balosky',           campaignId: 'c3' },
  'pack-walls':  { amount: 3500,   title: 'Pack 10 wallpapers 4K — Balosky',        campaignId: 'c3' },
};

router.get('/checkout/quick', async (req, res) => {
  try {
    const rawMode = typeof req.query.mode === 'string' ? req.query.mode.trim() : '';
    const rawAmount = typeof req.query.amount === 'string' ? req.query.amount : '';
    const rawQty = req.query.qty ?? req.query.q ?? req.query.cafecitos;
    const provider = typeof req.query.provider === 'string'
      ? req.query.provider.trim().toLowerCase()
      : '';
    const preset = QUICK_CHECKOUT_MODES[rawMode];

    let amount: number;
    let title: string;
    let campaignId: string;
    let purchaseId = '';
    let quantity = 1;

    if (rawMode === 'cafecito') {
      const cafecitoSettings = await getCafecitoSettings();
      const hasExplicitCafecitoValue = Boolean(rawAmount) || rawQty !== undefined;
      quantity = clampCafecitoQuantity(rawQty);

      if (provider === 'paypal') {
        const paypalAmount = cafecitoSettings.paypalUnitAmount * quantity;
        const paypalUrl = buildPaypalCheckoutUrl(
          cafecitoSettings.paypalLink,
          paypalAmount,
          cafecitoSettings.paypalCurrency
        );
        await insertWebEvent({
          eventName: 'checkout_created',
          path: '/api/checkout/quick',
          target: 'paypal',
          userAgent: summarizeUserAgent(String(req.headers['user-agent'] || '')),
          metadata: {
            source: 'quick_checkout',
            mode: rawMode,
            provider: 'paypal',
            qty: quantity,
            amount: paypalAmount,
            currency: cafecitoSettings.paypalCurrency,
          },
        });
        return res.redirect(302, paypalUrl || '/cafecito?paypal=missing');
      }

      if (cafecitoSettings.mercadoPagoLink && !hasExplicitCafecitoValue) {
        return res.redirect(302, cafecitoSettings.mercadoPagoLink);
      }
      const parsedAmount = Number(rawAmount);
      amount = Number.isFinite(parsedAmount) && parsedAmount >= cafecitoSettings.amount
        ? Math.round(parsedAmount)
        : cafecitoSettings.amount * quantity;
      title = quantity === 1
        ? 'Cafecito para Balosky'
        : `${quantity} cafecitos para Balosky`;
      campaignId = 'c3';
      purchaseId = `pur_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    } else if (rawMode === 'zoom') {
      return res.redirect(302, '/#prepedido-consultoria');
    } else if (preset) {
      amount = preset.amount;
      title = preset.title;
      campaignId = preset.campaignId;
    } else if (rawMode === 'libre') {
      const parsed = Number(rawAmount);
      if (!Number.isFinite(parsed) || parsed < 100) {
        return res.redirect(302, '/checkout?error=invalid-amount');
      }
      amount = parsed;
      title = 'Aporte libre a Balosky';
      campaignId = 'c3';
    } else {
      return res.redirect(302, '/checkout');
    }

    const baseUrl = getBaseUrl(req);
    const notificationUrl = getNotificationUrl(req);
    const autoReturn = shouldUseAutoReturn(baseUrl) ? 'approved' : undefined;
    const nowIso = new Date().toISOString();

    if (purchaseId) {
      await db.prepare(`
        INSERT INTO purchases (
          id, supporterName, type, itemId, title, createdAt,
          email, status, amount, externalReference, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        purchaseId,
        'Anónimo',
        'campaign',
        campaignId,
        title,
        nowIso,
        '',
        'pending',
        amount,
        purchaseId,
        nowIso
      );
    }

    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: campaignId,
            title,
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: purchaseId
            ? `${baseUrl}/pago-exitoso?purchase=${encodeURIComponent(purchaseId)}`
            : `${baseUrl}/checkout/success`,
          failure: purchaseId
            ? `${baseUrl}/pago-fallido?purchase=${encodeURIComponent(purchaseId)}`
            : `${baseUrl}/checkout/failure`,
          pending: purchaseId
            ? `${baseUrl}/pago-pendiente?purchase=${encodeURIComponent(purchaseId)}`
            : `${baseUrl}/checkout/pending`,
        },
        ...(autoReturn ? { auto_return: autoReturn } : {}),
        external_reference: purchaseId || `${campaignId}-${rawMode}-${Date.now()}`,
        metadata: {
          campaignId,
          mode: rawMode,
          quickFlow: true,
          ...(purchaseId ? {
            purchaseId,
            type: 'campaign',
            itemId: campaignId,
            quantity,
            cafecitoUnitAmount: Math.round(amount / quantity),
          } : {}),
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      },
    });

    const target = result.init_point || result.sandbox_init_point;
    if (!target) {
      console.error('[GET /checkout/quick] no init_point in MP response');
      return res.redirect(302, '/checkout?error=mp-unavailable');
    }
    if (purchaseId && result.id) {
      await db.prepare('UPDATE purchases SET preferenceId = ?, updatedAt = ? WHERE id = ?')
        .run(result.id, new Date().toISOString(), purchaseId);
    }
    await insertWebEvent({
      eventName: 'checkout_created',
      path: '/api/checkout/quick',
      target: rawMode || 'quick',
      userAgent: summarizeUserAgent(String(req.headers['user-agent'] || '')),
      metadata: {
        source: 'quick_checkout',
        mode: rawMode || 'quick',
        provider: 'mercadopago',
        qty: quantity,
        amount,
        currency: 'ARS',
      },
    });
    return res.redirect(302, target);
  } catch (error) {
    console.error('[GET /checkout/quick] error:', error);
    return res.redirect(302, '/checkout?error=mp-error');
  }
});

router.get('/checkout/status/:paymentId', async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);

    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment id' });
    }

    const payment = await paymentClient.get({ id: paymentId });
    const processingResult = payment.status === 'approved'
      ? await processApprovedPayment(payment)
      : await syncPurchaseStatusFromPayment(payment);

    res.json({
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      processed: processingResult?.reason === 'processed' || processingResult?.reason === 'already-processed',
      synced: processingResult?.reason === 'synced'
    });
  } catch (error) {
    console.error('[GET /checkout/status/:paymentId]', error);
    res.status(500).json({ error: 'Error fetching payment status' });
  }
});

/* ---------------------------------------------------------------------
 * CHECKOUT UNIFICADO
 * POST /api/checkout/create
 * ---------------------------------------------------------------------
 * Unifica el flow de compra para wallpapers, packs, productos y apoyos.
 * Crea una row en `purchases` con status='pending' + external_reference
 * único, crea preference MP con back_urls a /pago-exitoso?purchase=<id>,
 * y devuelve { purchaseId, initPoint, preferenceId }.
 *
 * Body:
 *   type: 'wallpaper' | 'pack' | 'product' | 'campaign' | 'membership'
 *   itemId?: string            (id del wallpaper/producto/campaign/membership)
 *   amount?: number            (override en ARS; sino se calcula del item)
 *   email: string              (obligatorio para delivery)
 *   supporterName?: string
 *   message?: string
 *
 * Respuesta:
 *   { purchaseId, initPoint, preferenceId, sandboxInitPoint? }
 * ------------------------------------------------------------------- */

type CheckoutType = 'wallpaper' | 'pack' | 'product' | 'campaign' | 'membership';
const ALLOWED_CHECKOUT_TYPES: readonly CheckoutType[] = ['wallpaper', 'pack', 'product', 'campaign', 'membership'];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendPublicFileIfLocal = (res: express.Response, publicUrl: string) => {
  if (!publicUrl.startsWith('/') || publicUrl.startsWith('//')) return false;

  const pathname = decodeURIComponent(new URL(publicUrl, 'http://local').pathname);
  const publicRoot = path.resolve(process.cwd(), 'public');
  const fullPath = path.resolve(publicRoot, pathname.replace(/^\/+/, ''));
  if (!fullPath.startsWith(publicRoot + path.sep)) return false;

  res.sendFile(fullPath);
  return true;
};

const resolveItemTitleAndPrice = async (type: CheckoutType, itemId: string | undefined, overrideAmount: number | undefined) => {
  if (type === 'pack') {
    const packPrice = 3500;
    if (overrideAmount !== undefined && Number(overrideAmount) !== packPrice) {
      return { ok: false, error: 'Monto inválido para pack' as const };
    }
    if (itemId) {
      const row: any = await db.prepare(
        "SELECT id, active FROM media WHERE id = ? AND kind = 'wallpaper'"
      ).get(itemId);
      if (!row || !row.active) return { ok: false, error: 'Wallpaper no disponible' as const };
    }
    return {
      ok: true as const,
      title: 'Pack 10 wallpapers 4K',
      amount: packPrice,
      itemId: itemId || 'pack-wallpapers'
    };
  }
  if (type === 'wallpaper') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare(
      "SELECT id, title, isLocked, active, mediaUrl FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Wallpaper no disponible' as const };
    const amount = 1200;
    if (overrideAmount !== undefined && Number(overrideAmount) !== amount) {
      return { ok: false, error: 'Monto inválido para wallpaper' as const };
    }
    return { ok: true as const, title: row.title || 'Wallpaper', amount, itemId: row.id };
  }
  if (type === 'product') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare('SELECT id, title, price, active, deliveryType, fileUrl, externalUrl FROM products WHERE id = ?').get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Producto no disponible' as const };
    const amount = Number(row.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Precio inválido' as const };
    if (overrideAmount !== undefined && Number(overrideAmount) !== amount) {
      return { ok: false, error: 'Monto inválido para producto' as const };
    }
    return { ok: true as const, title: row.title || 'Producto', amount, itemId: row.id };
  }
  if (type === 'membership') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare('SELECT id, name, price, active FROM memberships WHERE id = ?').get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Membership no disponible' as const };
    const amount = Number(row.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Precio inválido' as const };
    if (overrideAmount !== undefined && Number(overrideAmount) !== amount) {
      return { ok: false, error: 'Monto inválido para membership' as const };
    }
    return { ok: true as const, title: row.name || 'Membresía', amount, itemId: row.id };
  }
  const campaignId = itemId || 'c3';
  const rawAmount = Number(overrideAmount);
  if (!Number.isFinite(rawAmount) || rawAmount < 1) return { ok: false, error: 'Monto inválido' as const };
  const cafecitoSettings = isCafecitoCampaign(campaignId) ? await getCafecitoSettings() : null;
  const amount = cafecitoSettings ? Math.max(rawAmount, cafecitoSettings.amount) : rawAmount;
  const row: any = await db.prepare('SELECT id, title FROM campaigns WHERE id = ?').get(campaignId);
  const title = row?.title ? `Aporte · ${row.title}` : 'Aporte a Balosky';
  return { ok: true as const, title, amount, itemId: campaignId };
};

router.post('/checkout/create', async (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || '').trim().toLowerCase() as CheckoutType;
    if (!ALLOWED_CHECKOUT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type inválido' });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const supporterName = typeof body.supporterName === 'string' ? body.supporterName.trim().slice(0, 80) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
    const itemIdRaw = typeof body.itemId === 'string' ? body.itemId.trim() : undefined;
    const amountRaw = body.amount !== undefined ? Number(body.amount) : undefined;

    if (ENCARGO_PAYMENT_RE.test(message) || ENCARGO_PAYMENT_RE.test(itemIdRaw || '')) {
      return res.status(400).json({ error: 'Los encargos entran como pre-pedido y se pagan después de cotizar.' });
    }

    const resolution = await resolveItemTitleAndPrice(type, itemIdRaw, amountRaw);
    if (!resolution.ok) {
      return res.status(400).json({ error: resolution.error });
    }
    const { title, amount, itemId: resolvedItemId } = resolution;

    const purchaseId = `pur_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const externalReference = purchaseId;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO purchases (
        id, supporterName, type, itemId, title, createdAt,
        email, status, amount, externalReference, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      purchaseId,
      supporterName || 'Anónimo',
      type,
      resolvedItemId || '',
      title,
      nowIso,
      email,
      'pending',
      amount,
      externalReference,
      nowIso
    );

    const baseUrl = getBaseUrl(req);
    const notificationUrl = getNotificationUrl(req);
    const autoReturn = shouldUseAutoReturn(baseUrl) ? 'approved' : undefined;

    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: resolvedItemId || purchaseId,
            title: title.slice(0, 256),
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS'
          }
        ],
        payer: { email },
        back_urls: {
          success: `${baseUrl}/pago-exitoso?purchase=${encodeURIComponent(purchaseId)}`,
          failure: `${baseUrl}/pago-fallido?purchase=${encodeURIComponent(purchaseId)}`,
          pending: `${baseUrl}/pago-pendiente?purchase=${encodeURIComponent(purchaseId)}`
        },
        ...(autoReturn ? { auto_return: autoReturn } : {}),
        external_reference: externalReference,
        metadata: {
          purchaseId,
          type,
          itemId: resolvedItemId || '',
          email,
          supporterName,
          message,
          // Legacy: mantenemos campaignId para que processApprovedPayment siga metiendo mensaje al muro
          campaignId: type === 'campaign' ? resolvedItemId : 'c3'
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {})
      }
    });

    // Guardamos preference_id para referencia
    if (result.id) {
      await db.prepare('UPDATE purchases SET preferenceId = ?, updatedAt = ? WHERE id = ?')
        .run(result.id, new Date().toISOString(), purchaseId);
    }

    console.info('[checkout] created', {
      purchaseId,
      preferenceId: result.id,
      type,
      itemId: resolvedItemId || '',
      amount
    });

    res.json({
      purchaseId,
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point
    });
  } catch (error: any) {
    console.error('[POST /checkout/create]', error);
    res.status(500).json({ error: 'Error creando checkout', detail: String(error?.message || error) });
  }
});

/* GET /api/purchases/:id/status
 * Usado por la página /pago-exitoso para hacer polling hasta que el
 * webhook marque el purchase como 'paid'. NO requiere auth (el id
 * funciona como secret-ish — 20 chars random), pero sólo devuelve el
 * downloadToken si status='paid' y el requestor viene con el email
 * correcto (double-check opcional vía ?email=...). */
router.get('/purchases/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!id || !id.startsWith('pur_')) {
      return res.status(400).json({ error: 'Invalid purchase id' });
    }
    const row: any = await db.prepare(`
      SELECT id, status, title, amount, email, downloadToken, downloadExpiresAt, paidAt, type, itemId
      FROM purchases WHERE id = ?
    `).get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const base: any = {
      id: row.id,
      status: row.status || 'pending',
      title: row.title,
      amount: row.amount,
      type: row.type,
      itemId: row.itemId,
      paidAt: row.paidAt
    };

    // Expose downloadToken only when paid. Don't leak email or token otherwise.
    if (row.status === 'paid' && row.downloadToken && ['product', 'wallpaper', 'pack'].includes(row.type)) {
      base.downloadToken = row.downloadToken;
      base.downloadExpiresAt = row.downloadExpiresAt;
    }

    res.json(base);
  } catch (e) {
    console.error('[GET /purchases/:id/status]', e);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/purchases/:id/followup', writePublicLimiter, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!id || !id.startsWith('pur_')) {
      return res.status(400).json({ error: 'Invalid purchase id' });
    }

    const row: any = await db.prepare(`
      SELECT id, status, title, amount, type, itemId, paymentId
      FROM purchases WHERE id = ?
    `).get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'paid') {
      return res.status(409).json({ error: 'Todavía no pudimos confirmar el pago.' });
    }

    const body = req.body || {};
    const supporterName = typeof body.supporterName === 'string'
      ? body.supporterName.trim().slice(0, NAME_MAX_LEN)
      : '';
    const message = typeof body.message === 'string'
      ? body.message.trim().slice(0, 500)
      : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const visibility = body.visibility === 'private' ? 'private' : 'public';

    if (!supporterName && !message && !email) {
      return res.status(400).json({ error: 'No hay datos para guardar.' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (message && message.length < MESSAGE_MIN_LEN) {
      return res.status(400).json({ error: 'Mensaje muy corto' });
    }

    const finalName = supporterName || 'Anónimo';
    const nowIso = new Date().toISOString();

    await db.prepare(`
      UPDATE purchases
      SET supporterName = ?,
          email = COALESCE(NULLIF(email, ''), ?),
          contactEmail = ?,
          supporterMessage = ?,
          messageVisibility = ?,
          followupAt = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      finalName,
      email || '',
      email || '',
      message || '',
      visibility,
      nowIso,
      nowIso,
      id
    );

    if (visibility === 'public' && (supporterName || message)) {
      const processed: any = await db.prepare(`
        SELECT messageId FROM processed_payments
        WHERE externalReference = ? OR paymentId = ?
        ORDER BY processedAt DESC
        LIMIT 1
      `).get(id, row.paymentId || '');

      if (processed?.messageId) {
        await db.prepare(`
          UPDATE messages
          SET supporterName = ?, message = ?, isAnonymous = ?, isApproved = ?
          WHERE id = ?
        `).run(
          finalName,
          message || null,
          supporterName ? 0 : 1,
          1,
          processed.messageId
        );
      }
    }

    await sendAdminAlert({
      kind: 'cafecito',
      summary: `${finalName} · post pago · $${Number(row.amount || 0).toLocaleString('es-AR')} ARS`,
      details: {
        purchaseId: id,
        title: row.title,
        amount: row.amount,
        supporterName: finalName,
        email: email || '',
        visibility,
        message: message ? message.slice(0, 500) : ''
      }
    }).catch((alertError) => console.error('[POST /purchases/:id/followup] admin alert error', alertError));

    res.json({ success: true });
  } catch (e) {
    console.error('[POST /purchases/:id/followup]', e);
    res.status(500).json({ error: 'server error' });
  }
});

// --- WEBHOOK ---
router.post('/webhook/mercadopago', async (req, res) => {
  try {
    /* MP manda varios topics por la misma URL:
     *   - topic/type='payment' → payments one-shot (checkout)
     *   - topic/type='preapproval' o 'subscription_preapproval'
     *   - topic/type='authorized_payment' (cobros recurrentes exitosos)
     * Ruteamos según el tipo. */
    const topic = String(
      req.body?.type || req.body?.topic || req.query.topic || req.query.type || ''
    ).toLowerCase();
    const rawId = req.body?.data?.id ?? req.body?.resource?.split('/').pop() ??
      req.query['data.id'] ?? req.query.id;

    if (topic.includes('preapproval') || topic === 'subscription_preapproval') {
      const preapprovalId = String(rawId || '');
      if (!preapprovalId) return res.status(200).send('Ignored (no id)');
      await processPreapproval(preapprovalId).catch((err) =>
        console.error('[webhook/preapproval] process error', err)
      );
      return res.status(200).send('OK');
    }

    // Fallback: one-shot payment flow (checkout).
    const paymentId = getPaymentIdFromWebhook(req);

    if (!paymentId) {
      return res.status(200).send('Ignored');
    }

    console.info('[webhook/mercadopago] received', { topic: topic || 'payment', id: paymentId });

    const payment = await paymentClient.get({ id: paymentId });
    const processingResult = payment.status === 'approved'
      ? await processApprovedPayment(payment)
      : await syncPurchaseStatusFromPayment(payment);

    if (processingResult.reason === 'processed') {
      try {
        const settingsRow = await db.prepare('SELECT data FROM settings WHERE id = ?').get('global') as any;
        if (settingsRow) {
          const settings = JSON.parse(settingsRow.data);
          if (settings.discordWebhookUrl) {
            await fetch(settings.discordWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `🎉 **¡Nuevo Aporte!**\n**${processingResult.supporterName}** acaba de aportar **$${processingResult.amount}**.\nMensaje: "${processingResult.message || 'Sin mensaje'}"`
              })
            });
          }
        }
      } catch (discordError) {
        console.error('Error sending Discord webhook:', discordError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[POST /webhook/mercadopago]', error);
    res.status(500).send('Error');
  }
});

// --- FILE UPLOAD (admin) ---
//
// Estrategia costo-cero primero:
// - Supabase Storage es el default porque el free tier corta al agotarse.
// - R2/Vercel Blob quedan bloqueados salvo opt-in explícito: son usage-based.
// - En dev sin storage remoto, caemos al disco.
const MEDIA_ALLOW_USAGE_BILLED_STORAGE = process.env.MEDIA_ALLOW_USAGE_BILLED_STORAGE === 'true';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET = process.env.R2_BUCKET?.trim();
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, '');
const R2_ENABLED = MEDIA_ALLOW_USAGE_BILLED_STORAGE && Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_BASE_URL);
const SUPABASE_MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET?.trim();
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();
const BLOB_ENABLED = MEDIA_ALLOW_USAGE_BILLED_STORAGE && Boolean(BLOB_TOKEN);
const USE_LOCAL_UPLOADS = !R2_ENABLED && !SUPABASE_MEDIA_BUCKET && !BLOB_ENABLED && !process.env.VERCEL;
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (USE_LOCAL_UPLOADS && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Muxer siempre en memoria — en prod lo mandamos al blob, en dev lo
// escribimos al disco nosotros mismos. Simplifica el branching y evita el
// tmpfile intermedio de disk storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — enough for short videos + hi-res images
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image|video|audio)\//.test(file.mimetype);
    if (!allowed) return cb(new Error('Tipo de archivo no permitido. Solo image/video/audio.'));
    cb(null, true);
  }
});

function kindFolder(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'other';
}

function safeName(originalname: string): string {
  const base = path.parse(originalname).name
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'file';
  const ext = path.extname(originalname).toLowerCase();
  return `${base}-${Date.now()}${ext}`;
}

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!R2_ENABLED || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
    throw new Error('R2 storage is not configured');
  }
  const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_BASE_URL}/${key}`;
}

async function uploadToSupabaseStorage(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!SUPABASE_MEDIA_BUCKET || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase media storage is not configured');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const upload = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).upload(key, body, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw upload.error;
  return supabase.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(key).data.publicUrl;
}

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'No file uploaded' });
    const filename = safeName(f.originalname);
    const key = `uploads/${kindFolder(f.mimetype)}/${filename}`;

    if (R2_ENABLED) {
      const url = await uploadToR2(key, f.buffer, f.mimetype);
      return res.json({
        url,
        filename,
        mimetype: f.mimetype,
        size: f.size,
        storage: 'r2'
      });
    }

    if (SUPABASE_MEDIA_BUCKET) {
      const url = await uploadToSupabaseStorage(key, f.buffer, f.mimetype);
      return res.json({
        url,
        filename,
        mimetype: f.mimetype,
        size: f.size,
        storage: 'supabase'
      });
    }

    // Legacy fallback opt-in: evitar para media viral; Vercel Blob tiene
    // límite de transfer bajo en Hobby y ya nos dejó URLs públicas en 403.
    if (BLOB_ENABLED && BLOB_TOKEN) {
      const { put } = await import('@vercel/blob');
      const { url } = await put(key, f.buffer, {
        access: 'public',
        contentType: f.mimetype,
        token: BLOB_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true
      });
      return res.json({
        url,
        filename,
        mimetype: f.mimetype,
        size: f.size,
        storage: 'blob'
      });
    }

    if (!USE_LOCAL_UPLOADS) {
      return res.status(500).json({
        error: 'upload_storage_not_configured',
        detail: 'Configurá SUPABASE_MEDIA_BUCKET para el modo costo-cero con corte por free tier. R2/Blob requieren MEDIA_ALLOW_USAGE_BILLED_STORAGE=true porque pueden generar overages.'
      });
    }

    // Dev fallback: disco local, mismo esquema YYYY/MM que antes para no
    // romper rutas ya guardadas en la DB de desarrollo.
    const d = new Date();
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dest = path.join(UPLOADS_DIR, year, month);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const fullPath = path.join(dest, filename);
    fs.writeFileSync(fullPath, f.buffer);
    const rel = path.relative(path.join(process.cwd(), 'public'), fullPath);
    const url = '/' + rel.split(path.sep).join('/');
    res.json({
      url,
      filename,
      mimetype: f.mimetype,
      size: f.size,
      storage: 'local'
    });
  } catch (e) {
    console.error('[POST /upload]', e);
    res.status(500).json({ error: 'upload failed' });
  }
});

// --- MEDIA (video_ia, foto, wallpaper, cancion) ---
/**
 * Early drops: si `publicFrom` es una fecha futura, el item está en ventana
 * early — sólo los Baloskiers lo ven completo. A los no-miembros les mandamos
 * la tarjeta con la miniatura pero sin `mediaUrl` (no se puede abrir/bajar).
 * El flag `isEarlyDrop` + `publicFrom` le dice al frontend que muestre el
 * badge y el CTA a sumarse.
 *
 * viewerFull = true cuando el request viene del admin o de un Baloskier
 * autenticado (cookie de sesión). En ese caso no hay redacción.
 */
const PUBLIC_FREE_WALLPAPER_LIMIT = 3;

const mapMedia = (m: any, viewerFull: boolean = true, forceLocked: boolean = false) => {
  const publicFromMs = m.publicFrom ? new Date(m.publicFrom).getTime() : null;
  const inEarlyWindow = publicFromMs !== null && publicFromMs > Date.now();
  const lockedForViewer = Boolean(m.isLocked) || forceLocked || inEarlyWindow;
  const shouldRedact = lockedForViewer && !viewerFull;
  const assetUrls = (() => {
    if (Array.isArray(m.assetUrls)) return m.assetUrls.filter(Boolean);
    if (!m.assetUrls || typeof m.assetUrls !== 'string') return [];
    try {
      const parsed = JSON.parse(m.assetUrls);
      return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string' && u.trim()).map((u) => u.trim()) : [];
    } catch {
      return m.assetUrls.split(/\r?\n|,/).map((u: string) => u.trim()).filter(Boolean);
    }
  })();

  return {
    ...m,
    thumbUrl: m.thumbUrl || null,
    // Redactamos el archivo jugable/bajable si el item no está disponible
    // para este viewer: early/member/paywall siguen mostrando preview.
    mediaUrl: shouldRedact ? null : m.mediaUrl,
    isLocked: lockedForViewer,
    isMemberOnly: Boolean(m.isMemberOnly),
    active: Boolean(m.active),
    featured: Boolean(m.featured),
    playCount: Number(m.playCount || 0),
    aspectRatio: m.aspectRatio || null,
    publicFrom: m.publicFrom || null,
    isEarlyDrop: inEarlyWindow,
    // Default true when column is null/undefined (older rows) so nothing changes
    // for content the admin hasn't touched yet.
    showDescription: m.showDescription === 0 || m.showDescription === false ? false : true,
    showPrompt: m.showPrompt === 0 || m.showPrompt === false ? false : true,
    showTool: m.showTool === 0 || m.showTool === false ? false : true,
    assetUrls: shouldRedact ? [] : assetUrls
  };
};

const getPublicFreeWallpaperIds = async () => {
  const rows: any[] = await db.prepare(`
    SELECT id
    FROM media
    WHERE kind = 'wallpaper' AND active = 1
    ORDER BY sortOrder ASC, createdAt DESC
    LIMIT ?
  `).all(PUBLIC_FREE_WALLPAPER_LIMIT);
  return new Set(rows.map((r) => String(r.id)));
};

/* viewerHasFullAccess: admin OR socio del club. Si es true, ve todo
 * (incluido is_member_only y los early drops sin redactar). */
function viewerHasFullAccess(req: express.Request) {
  if (verifyAdminAuthHeader(req.headers.authorization)) return true;
  return Boolean(readMemberFromCookie(req));
}

router.get('/media', async (req, res) => {
  try {
    const { kind } = req.query;
    const rows = kind
      ? await db.prepare('SELECT * FROM media WHERE kind = ? ORDER BY sortOrder ASC, createdAt DESC').all(String(kind))
      : await db.prepare('SELECT * FROM media ORDER BY kind ASC, sortOrder ASC').all();

    const viewerFull = viewerHasFullAccess(req);
    // is_member_only sigue siendo filtro duro — no aparece en la lista para
    // no-miembros. Los early drops sí aparecen, pero con la URL redactada.
    const filtered = viewerFull ? rows : rows.filter((r: any) => !r.isMemberOnly);

    let publicWallpaperIndex = 0;
    res.json(filtered.map((r: any) => {
      let forceLocked = false;
      if (!viewerFull && r.kind === 'wallpaper') {
        publicWallpaperIndex += 1;
        forceLocked = publicWallpaperIndex > PUBLIC_FREE_WALLPAPER_LIMIT;
      }
      return mapMedia(r, viewerFull, forceLocked);
    }));
  } catch (e) {
    console.error('[GET /media]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const viewerFull = viewerHasFullAccess(req);
    if (!viewerFull && row.isMemberOnly) {
      return res.status(404).json({ error: 'Not found' });
    }
    let forceLocked = false;
    if (!viewerFull && row.kind === 'wallpaper') {
      const freeWallpaperIds = await getPublicFreeWallpaperIds();
      forceLocked = !freeWallpaperIds.has(row.id);
    }
    res.json(mapMedia(row, viewerFull, forceLocked));
  } catch (e) {
    console.error('[GET /media/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/media', requireAuth, async (req, res) => {
  try {
    const m = req.body;
    if (!m.kind || !m.title) return res.status(400).json({ error: 'kind and title required' });
    const id = m.id || `med_${m.kind.slice(0,2)}_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const isMemberOnly = m.isMemberOnly ? 1 : 0;
    const aspectRatio = (['9:16','16:9','1:1'].includes(String(m.aspectRatio)) ? m.aspectRatio : null);
    const showDesc = m.showDescription === false ? 0 : 1;
    const showPrompt = m.showPrompt === false ? 0 : 1;
    const showTool = m.showTool === false ? 0 : 1;
    const assetUrls = Array.isArray(m.assetUrls)
      ? JSON.stringify(m.assetUrls.map((u: unknown) => String(u).trim()).filter(Boolean))
      : JSON.stringify([]);
    // Early drop: aceptamos ISO string o timestamp. Si no parsea, lo ignoramos.
    const publicFrom = m.publicFrom ? (() => {
      const d = new Date(m.publicFrom);
      return isNaN(d.getTime()) ? null : d.toISOString();
    })() : null;
    await db.prepare(`
      INSERT INTO media (id, kind, title, description, category, mediaUrl, thumbUrl, embedUrl, coverImage, duration, aiTool, aiPrompt, resultNote, assetUrls, isMemberOnly, aspectRatio, showDescription, showPrompt, showTool, isLocked, active, featured, sortOrder, publicFrom, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, m.kind, m.title, m.description || null, m.category || null,
      m.mediaUrl || null, m.thumbUrl || null, m.embedUrl || null, m.coverImage || null, m.duration || null,
      m.aiTool || null, m.aiPrompt || null, m.resultNote || null, assetUrls,
      isMemberOnly, aspectRatio, showDesc, showPrompt, showTool,
      m.isLocked ? 1 : 0,
      m.active === false ? 0 : 1,
      m.featured ? 1 : 0,
      m.sortOrder || 0,
      publicFrom,
      createdAt
    );
    const row = await db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    res.json(mapMedia(row));
  } catch (e) {
    console.error('[POST /media]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/media/:id', requireAuth, async (req, res) => {
  try {
    const m = req.body;
    // Build a partial UPDATE so callers can patch a single field (e.g. just
    // `{ sortOrder: 3 }` from the reorder buttons) without wiping everything
    // else out. Booleans need the 1/0 coercion; strings get null-coerced so
    // empty inputs clear the column.
    type Col = [colName: string, value: unknown];
    const cols: Col[] = [];
    if (m.kind !== undefined)        cols.push(['kind', m.kind]);
    if (m.title !== undefined)       cols.push(['title', m.title]);
    if (m.description !== undefined) cols.push(['description', m.description || null]);
    if (m.category !== undefined)    cols.push(['category', m.category || null]);
    if (m.mediaUrl !== undefined)    cols.push(['mediaUrl', m.mediaUrl || null]);
    if (m.thumbUrl !== undefined)    cols.push(['thumbUrl', m.thumbUrl || null]);
    if (m.embedUrl !== undefined)    cols.push(['embedUrl', m.embedUrl || null]);
    if (m.coverImage !== undefined)  cols.push(['coverImage', m.coverImage || null]);
    if (m.duration !== undefined)    cols.push(['duration', m.duration || null]);
    if (m.aiTool !== undefined)      cols.push(['aiTool', m.aiTool || null]);
    if (m.aiPrompt !== undefined)    cols.push(['aiPrompt', m.aiPrompt || null]);
    if (m.resultNote !== undefined)  cols.push(['resultNote', m.resultNote || null]);
    if (m.assetUrls !== undefined) {
      const assetUrls = Array.isArray(m.assetUrls)
        ? m.assetUrls.map((u: unknown) => String(u).trim()).filter(Boolean)
        : [];
      cols.push(['assetUrls', JSON.stringify(assetUrls)]);
    }
    if (m.isMemberOnly !== undefined) cols.push(['isMemberOnly', m.isMemberOnly ? 1 : 0]);
    if (m.aspectRatio !== undefined) {
      const valid = ['9:16','16:9','1:1'].includes(String(m.aspectRatio));
      cols.push(['aspectRatio', valid ? m.aspectRatio : null]);
    }
    if (m.showDescription !== undefined) cols.push(['showDescription', m.showDescription === false ? 0 : 1]);
    if (m.showPrompt !== undefined)      cols.push(['showPrompt', m.showPrompt === false ? 0 : 1]);
    if (m.showTool !== undefined)        cols.push(['showTool', m.showTool === false ? 0 : 1]);
    if (m.isLocked !== undefined)    cols.push(['isLocked', m.isLocked ? 1 : 0]);
    if (m.active !== undefined)      cols.push(['active', m.active === false ? 0 : 1]);
    if (m.featured !== undefined)    cols.push(['featured', m.featured ? 1 : 0]);
    if (m.sortOrder !== undefined)   cols.push(['sortOrder', Number(m.sortOrder) || 0]);
    if (m.publicFrom !== undefined) {
      // null/'' limpian la columna (vuelve a ser público normal). Fecha válida
      // la guardamos como ISO; inválida la ignoramos para no romper.
      if (!m.publicFrom) {
        cols.push(['publicFrom', null]);
      } else {
        const d = new Date(m.publicFrom);
        if (!isNaN(d.getTime())) cols.push(['publicFrom', d.toISOString()]);
      }
    }

    if (cols.length) {
      const setClause = cols.map(([c]) => `${c} = ?`).join(', ');
      const values = cols.map(([, v]) => v);
      await db.prepare(`UPDATE media SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    }
    const row = await db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    res.json(mapMedia(row));
  } catch (e) {
    console.error('[PUT /media/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/media/:id', requireAuth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /media/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// POST /api/media/:id/play — increment playCount (no auth required).
// Used by the SUNO public player to track listens.
router.post('/media/:id/play', async (req, res) => {
  try {
    await db.prepare('UPDATE media SET play_count = COALESCE(play_count, 0) + 1 WHERE id = ?').run(req.params.id);
    const row: any = await db.prepare('SELECT play_count FROM media WHERE id = ?').get(req.params.id);
    res.json({ playCount: Number(row?.playCount || 0) });
  } catch (e) {
    console.error('[POST /media/:id/play]', e);
    res.status(500).json({ error: 'database error' });
  }
});

/**
 * POST /api/media/resolve-cover
 *
 * Dado un URL de track (Spotify, YouTube, Apple Music), devuelve la URL de
 * la portada que le corresponde. Endpoint liviano — solo parsea/oEmbed,
 * no guarda nada. El admin lo usa para autocompletar `coverImage` cuando
 * pegás un link de Suno/Spotify/YT y el cover no se adivinó del ID3.
 *
 * Body: { url: string }
 * Resp: { coverUrl: string | null, platform: 'spotify'|'youtube'|'apple-music'|'unknown' }
 */
router.post('/media/resolve-cover', requireAuth, async (req, res) => {
  try {
    const raw = String(req.body?.url || '').trim();
    if (!raw) return res.status(400).json({ error: 'url required' });

    const lower = raw.toLowerCase();
    let coverUrl: string | null = null;
    let platform: 'spotify' | 'youtube' | 'apple-music' | 'unknown' = 'unknown';

    // --- YouTube ---
    // Saca el video ID de youtu.be/ID, /watch?v=ID, /embed/ID, /shorts/ID, etc.
    // No necesita API key: la CDN de thumbnails es pública.
    if (lower.includes('youtu')) {
      platform = 'youtube';
      try {
        const u = new URL(raw);
        let id = u.searchParams.get('v');
        if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1).split('/')[0];
        if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.slice(7).split('/')[0];
        if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.slice(8).split('/')[0];
        if (id) {
          // maxresdefault puede 404ear en videos sin HD; hqdefault siempre existe.
          coverUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        }
      } catch {
        /* URL inválida — caemos a unknown */
      }
    }

    // --- Spotify ---
    // Usa el oEmbed público (no requiere auth).
    // https://open.spotify.com/oembed?url=<trackUrl>
    else if (lower.includes('spotify')) {
      platform = 'spotify';
      try {
        const oembed = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`,
          { headers: { 'User-Agent': 'baloskycom/1.0' } },
        );
        if (oembed.ok) {
          const data: any = await oembed.json();
          if (data?.thumbnail_url) coverUrl = String(data.thumbnail_url);
        }
      } catch (err) {
        console.warn('[resolve-cover] spotify oembed failed', err);
      }
    }

    // --- Apple Music ---
    // iTunes Lookup API devuelve artworkUrl100. Reemplazamos 100x100 por 600x600
    // para mejor resolución en la card.
    else if (lower.includes('music.apple') || lower.includes('apple.co')) {
      platform = 'apple-music';
      try {
        const u = new URL(raw);
        // El id del track viene en ?i= cuando es un single track dentro de álbum,
        // o en el path cuando es un álbum/song directo.
        let id = u.searchParams.get('i');
        if (!id) {
          // /album/name/123456789 → 123456789
          const parts = u.pathname.split('/').filter(Boolean);
          for (const p of parts.reverse()) {
            if (/^\d{5,}$/.test(p)) {
              id = p;
              break;
            }
          }
        }
        if (id) {
          const lookup = await fetch(
            `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`,
            { headers: { 'User-Agent': 'baloskycom/1.0' } },
          );
          if (lookup.ok) {
            const data: any = await lookup.json();
            const art = data?.results?.[0]?.artworkUrl100;
            if (art && typeof art === 'string') {
              coverUrl = art.replace('100x100bb.jpg', '600x600bb.jpg')
                             .replace('100x100bb.png', '600x600bb.png');
            }
          }
        }
      } catch (err) {
        console.warn('[resolve-cover] apple lookup failed', err);
      }
    }

    res.json({ coverUrl, platform });
  } catch (e) {
    console.error('[POST /media/resolve-cover]', e);
    res.status(500).json({ error: 'resolve failed' });
  }
});

/**
 * POST /api/media/backfill-covers
 *
 * Recorre todas las canciones (`kind='cancion'`) sin `coverImage` y, para
 * cada una con un URL resolvable (Spotify/YouTube/Apple), autocompleta la
 * portada usando la misma lógica de `/media/resolve-cover`. Devuelve el
 * conteo de tracks actualizadas. Pensado para un botón "rellenar covers
 * faltantes" en el admin.
 */
router.post('/media/backfill-covers', requireAuth, async (_req, res) => {
  try {
    const rows: any[] = await db.prepare(
      "SELECT id, title, mediaUrl, embedUrl FROM media WHERE kind = 'cancion' AND (coverImage IS NULL OR coverImage = '')"
    ).all();

    let updated = 0;
    const failures: { id: string; title: string; reason: string }[] = [];

    for (const row of rows) {
      const url = String(row.embedUrl || row.mediaUrl || '').trim();
      if (!url) {
        failures.push({ id: row.id, title: row.title, reason: 'sin URL' });
        continue;
      }

      // Reusamos la lógica del endpoint haciéndonos un fetch interno simple.
      // Duplicamos un poco por simplicidad — mantener en sync con resolve-cover.
      const lower = url.toLowerCase();
      let coverUrl: string | null = null;

      try {
        if (lower.includes('youtu')) {
          const u = new URL(url);
          let id = u.searchParams.get('v');
          if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1).split('/')[0];
          if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.slice(7).split('/')[0];
          if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.slice(8).split('/')[0];
          if (id) coverUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        } else if (lower.includes('spotify')) {
          const oembed = await fetch(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
            { headers: { 'User-Agent': 'baloskycom/1.0' } },
          );
          if (oembed.ok) {
            const data: any = await oembed.json();
            if (data?.thumbnail_url) coverUrl = String(data.thumbnail_url);
          }
        } else if (lower.includes('music.apple') || lower.includes('apple.co')) {
          const u = new URL(url);
          let id = u.searchParams.get('i');
          if (!id) {
            const parts = u.pathname.split('/').filter(Boolean);
            for (const p of parts.reverse()) {
              if (/^\d{5,}$/.test(p)) { id = p; break; }
            }
          }
          if (id) {
            const lookup = await fetch(
              `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`,
              { headers: { 'User-Agent': 'baloskycom/1.0' } },
            );
            if (lookup.ok) {
              const data: any = await lookup.json();
              const art = data?.results?.[0]?.artworkUrl100;
              if (art && typeof art === 'string') {
                coverUrl = art.replace('100x100bb.jpg', '600x600bb.jpg')
                               .replace('100x100bb.png', '600x600bb.png');
              }
            }
          }
        }
      } catch (err) {
        failures.push({
          id: row.id,
          title: row.title,
          reason: err instanceof Error ? err.message : 'error',
        });
        continue;
      }

      if (coverUrl) {
        await db.prepare('UPDATE media SET coverImage = ? WHERE id = ?').run(coverUrl, row.id);
        updated++;
      } else {
        failures.push({ id: row.id, title: row.title, reason: 'no resolvable' });
      }
    }

    res.json({ updated, scanned: rows.length, failures });
  } catch (e) {
    console.error('[POST /media/backfill-covers]', e);
    res.status(500).json({ error: 'backfill failed' });
  }
});

// --- SOCIALS ---
const mapSocial = (s: any) => ({ ...s, active: Boolean(s.active) });

router.get('/socials', async (req, res) => {
  try {
    const isAdmin = Boolean(verifyAdminAuthHeader(req.headers.authorization));
    const rows = isAdmin
      ? await db.prepare('SELECT * FROM socials ORDER BY active DESC, sortOrder ASC').all()
      : await db.prepare('SELECT * FROM socials WHERE active = 1 ORDER BY sortOrder ASC').all();
    res.json(rows.map(mapSocial));
  } catch (e) {
    console.error('[GET /socials]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.post('/socials', requireAuth, async (req, res) => {
  try {
    const s = req.body;
    if (!s.platform || !s.name || !s.url) return res.status(400).json({ error: 'platform, name, url required' });
    const id = s.id || `soc_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await db.prepare(`
      INSERT INTO socials (id, platform, name, handle, url, icon, colorFrom, colorTo, active, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, s.platform, s.name, s.handle || '', s.url,
      s.icon || null, s.colorFrom || null, s.colorTo || null,
      s.active === false ? 0 : 1,
      s.sortOrder || 0,
      createdAt
    );
    const row = await db.prepare('SELECT * FROM socials WHERE id = ?').get(id);
    res.json(mapSocial(row));
  } catch (e) {
    console.error('[POST /socials]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.put('/socials/:id', requireAuth, async (req, res) => {
  try {
    const s = req.body;
    await db.prepare(`
      UPDATE socials
      SET platform = ?, name = ?, handle = ?, url = ?,
          icon = ?, colorFrom = ?, colorTo = ?,
          active = ?, sortOrder = ?
      WHERE id = ?
    `).run(
      s.platform, s.name, s.handle || '', s.url,
      s.icon || null, s.colorFrom || null, s.colorTo || null,
      s.active === false ? 0 : 1,
      s.sortOrder || 0,
      req.params.id
    );
    const row = await db.prepare('SELECT * FROM socials WHERE id = ?').get(req.params.id);
    res.json(mapSocial(row));
  } catch (e) {
    console.error('[PUT /socials/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.delete('/socials/:id', requireAuth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM socials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /socials/:id]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- NEWSLETTER ---
router.post('/newsletter', writePublicLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    if ((body.website && String(body.website).trim()) || (body.hp_field && String(body.hp_field).trim())) {
      return res.status(204).end();
    }

    const { email, source } = body;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const normalized = String(email).trim().toLowerCase();
    const result = await upsertNewsletterSubscriber(normalized, source || 'footer');
    res.json({ success: true, duplicate: result.duplicate });
  } catch (e) {
    console.error('[POST /newsletter]', e);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/newsletter', requireAuth, async (_req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM newsletter_subscribers ORDER BY createdAt DESC').all();
    res.json(rows.map((r: any) => ({ ...r, active: Boolean(r.active) })));
  } catch (e) {
    console.error('[GET /newsletter]', e);
    res.status(500).json({ error: 'database error' });
  }
});

// --- WALLPAPERS PAYWALL (email gate + signed download token) ---
// 1. User submits email → we upsert a newsletter subscriber and return a short-lived signed URL.
// 2. Browser hits GET /wallpapers/download?token=... → we verify, then redirect to the underlying file.
router.post('/wallpapers/request', writePublicLimiter, async (req, res) => {
  try {
    const { email, wallpaperId } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (!wallpaperId || typeof wallpaperId !== 'string') {
      return res.status(400).json({ error: 'wallpaperId requerido' });
    }

    const normalized = String(email).trim().toLowerCase();
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
    const ip = getClientIp(req);

    // Verify wallpaper exists, is active, and is not locked (locked ones need a purchase)
    const wp: any = await db.prepare(
      "SELECT id, mediaUrl, isLocked, active, kind FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(wallpaperId);
    if (!wp) return res.status(404).json({ error: 'Wallpaper no encontrado' });
    if (!wp.active) return res.status(404).json({ error: 'Wallpaper no disponible' });
    const freeWallpaperIds = await getPublicFreeWallpaperIds();
    if (wp.isLocked || !freeWallpaperIds.has(wp.id)) {
      return res.status(402).json({ error: 'Wallpaper parte del pack, necesita compra' });
    }
    if (!wp.mediaUrl) return res.status(404).json({ error: 'Archivo no disponible' });

    await db.prepare(`
      INSERT INTO wallpaper_leads (email, wallpaperId, userAgent, ip)
      VALUES (?, ?, ?, ?)
    `).run(normalized, wallpaperId, userAgent, ip);

    try {
      await upsertNewsletterSubscriber(normalized, 'wallpaper-gate');
    } catch (e) {
      console.warn('[wallpapers/request] subscriber upsert failed, continuing', e);
    }

    // Sign a short-lived token that binds the wallpaper id + email.
    const token = jwt.sign(
      { wid: wallpaperId, em: normalized, typ: 'wp-dl' },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: '15m' }
    );

    const baseUrl = getBaseUrl(req);
    const downloadUrl = `${baseUrl}/api/wallpapers/download?token=${encodeURIComponent(token)}`;
    res.json({ success: true, downloadUrl, email: normalized });
  } catch (e) {
    console.error('[POST /wallpapers/request]', e);
    res.status(500).json({ error: 'server error' });
  }
});

/* GET /api/download/:token
 * ----------------------------------------------------------------------
 * Endpoint general de entrega post-compra. Consume el JWT firmado por
 * `generateDownloadToken` (payload: { pid, iid, typ:'dl', kind }).
 *
 * Reglas:
 *  - JWT válido, no expirado, con typ='dl'
 *  - Purchase existe, status='paid', downloadToken coincide con el token
 *  - Según `kind`:
 *      wallpaper|pack → redirige a media.mediaUrl
 *      product        → si deliveryType='digital' y fileUrl, redirige;
 *                        si deliveryType='physical', página "en camino"
 *                        (el producto físico no se "descarga")
 *      campaign|membership → página de agradecimiento
 *
 *  Nunca filtra mediaUrl crudo si el purchase no está paid.
 *  Content-Disposition sugiere un filename amigable basado en el título.
 * ------------------------------------------------------------------- */
router.get('/download/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(400).send('Token requerido');

    let decoded: any;
    try {
      decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch (e: any) {
      const reason = e && e.name === 'TokenExpiredError' ? 'expirado' : 'inválido';
      return res.status(401).send(`Token ${reason}. Si tu compra fue aprobada, respondé el mail y te paso un link nuevo.`);
    }

    if (!decoded || decoded.typ !== 'dl' || !decoded.pid) {
      return res.status(401).send('Token inválido');
    }

    const purchaseId = String(decoded.pid);
    const itemId = typeof decoded.iid === 'string' ? decoded.iid : '';
    const kind = typeof decoded.kind === 'string' ? decoded.kind : '';

    const purchase: any = await db.prepare(`
      SELECT id, status, title, email, itemId, type, downloadToken, downloadExpiresAt
      FROM purchases WHERE id = ?
    `).get(purchaseId);

    if (!purchase) return res.status(404).send('Compra no encontrada');
    if (purchase.status !== 'paid') {
      return res.status(402).send('Tu pago todavía no fue confirmado. Si ya pagaste, esperá unos minutos o respondé el mail.');
    }
    if (!purchase.downloadToken || purchase.downloadToken !== token) {
      return res.status(401).send('Token no coincide con la compra (quizás fue regenerado). Respondé el mail y te paso el link vigente.');
    }

    // Double-check expiry vs stored date (belt and suspenders — JWT lib ya validó exp)
    if (purchase.downloadExpiresAt) {
      const exp = new Date(purchase.downloadExpiresAt).getTime();
      if (Number.isFinite(exp) && Date.now() > exp) {
        return res.status(401).send('El link expiró. Respondé el mail y te paso uno nuevo.');
      }
    }

    const finalKind = kind || purchase.type || '';
    const finalItemId = itemId || purchase.itemId || '';
    const productTitle: string = purchase.title || 'balosky-descarga';
    const safeTitle = productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'descarga';

    // Helper: redirige al mediaUrl con Content-Disposition sugerido
    const deliverMediaRow = (row: any) => {
      if (!row || !row.mediaUrl) {
        return res.status(404).send('Archivo no disponible');
      }
      const ext = (row.mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'jpg'])[1];
      res.setHeader('Content-Disposition', `attachment; filename="balosky-${safeTitle}.${ext}"`);
      if (sendPublicFileIfLocal(res, row.mediaUrl)) return;
      return res.redirect(302, row.mediaUrl);
    };

    if (finalKind === 'pack') {
      const fileId = typeof req.query.file === 'string' ? req.query.file.trim() : '';
      if (fileId) {
        const row: any = await db.prepare(
          "SELECT id, mediaUrl, title, active FROM media WHERE id = ? AND kind = 'wallpaper'"
        ).get(fileId);
        if (!row || !row.active) return res.status(404).send('Wallpaper no disponible');
        return deliverMediaRow(row);
      }

      const rows: any[] = await db.prepare(`
        SELECT id, title, description, thumbUrl, coverImage, mediaUrl
        FROM media
        WHERE kind = 'wallpaper' AND active = 1 AND mediaUrl IS NOT NULL AND mediaUrl != ''
        ORDER BY sortOrder ASC, createdAt DESC
      `).all();

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const list = rows.map((row) => {
        const href = `/api/download/${encodeURIComponent(token)}?file=${encodeURIComponent(row.id)}`;
        const thumb = row.thumbUrl || row.coverImage || '';
        return `<a class="item" href="${href}">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" />` : '<span class="thumb">WP</span>'}
          <span><strong>${escapeHtml(row.title || 'Wallpaper')}</strong><em>${escapeHtml(row.description || '4K')}</em></span>
          <b>descargar</b>
        </a>`;
      }).join('');

      return res.status(200).send(`<!doctype html>
        <html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Balosky · Pack wallpapers</title>
        <style>
          body{margin:0;background:#0a0908;color:#f3efe6;font-family:Inter,system-ui,sans-serif;padding:32px 18px}
          main{max-width:760px;margin:0 auto}
          h1{font-size:clamp(34px,7vw,72px);line-height:.92;letter-spacing:-.05em;margin:0 0 12px;color:#FA5D29}
          p{color:#bdb5a9;line-height:1.55;margin:0 0 24px}
          .grid{display:grid;gap:10px}
          .item{display:grid;grid-template-columns:72px 1fr auto;align-items:center;gap:14px;padding:10px;border:1px solid #2a241f;color:inherit;text-decoration:none;background:#11100e}
          img,.thumb{width:72px;height:92px;object-fit:cover;background:#1b1714;display:grid;place-items:center;color:#FA5D29;font-weight:900}
          strong{display:block;font-size:15px}.item em{display:block;color:#8f877d;font-size:12px;font-style:normal;margin-top:4px}.item b{font-size:11px;text-transform:uppercase;color:#FA5D29}
        </style>
        <main>
          <h1>Pack wallpapers</h1>
          <p>Tu compra está confirmada. Este link es personal y vence automáticamente; bajá los wallpapers desde acá.</p>
          <div class="grid">${list || '<p>No hay wallpapers disponibles para entregar.</p>'}</div>
        </main></html>`);
    }

    if (finalKind === 'wallpaper') {
      if (!finalItemId) return res.status(404).send('Item no encontrado');
      const row: any = await db.prepare(
        "SELECT id, mediaUrl, title, active FROM media WHERE id = ? AND kind = 'wallpaper'"
      ).get(finalItemId);
      if (!row || !row.active) return res.status(404).send('Wallpaper no disponible');
      return deliverMediaRow(row);
    }

    if (finalKind === 'product') {
      if (!finalItemId) return res.status(404).send('Producto no encontrado');
      const row: any = await db.prepare(
        'SELECT id, title, deliveryType, fileUrl, externalUrl, active FROM products WHERE id = ?'
      ).get(finalItemId);
      if (!row || !row.active) return res.status(404).send('Producto no disponible');

      const delivery = String(row.deliveryType || '').toLowerCase();
      if ((delivery === 'digital' || delivery === 'file') && row.fileUrl) {
        const ext = (row.fileUrl.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'pdf'])[1];
        res.setHeader('Content-Disposition', `attachment; filename="balosky-${safeTitle}.${ext}"`);
        if (sendPublicFileIfLocal(res, row.fileUrl)) return;
        return res.redirect(302, row.fileUrl);
      }
      if (row.externalUrl) {
        return res.redirect(302, row.externalUrl);
      }
      // Sin archivo aún (producto físico o pendiente)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!doctype html><meta charset="utf-8"><title>Balosky · ${productTitle}</title>
        <body style="background:#0a0a0a;color:#f3efe6;font-family:Inter,system-ui,sans-serif;padding:48px 20px;text-align:center">
          <h1 style="color:#FA5D29;letter-spacing:-.04em">Gracias por tu compra</h1>
          <p style="max-width:520px;margin:16px auto;line-height:1.6;color:#c9c4bb">Tu compra de <strong>${productTitle}</strong> está confirmada. Si es un producto físico, te escribo en las próximas horas para coordinar envío.</p>
          <p><a href="https://balosky.com" style="color:#FA5D29">volver a balosky.com</a></p>
        </body>`);
    }

    // campaign / membership → agradecimiento
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><meta charset="utf-8"><title>Balosky · Gracias</title>
      <body style="background:#0a0a0a;color:#f3efe6;font-family:Inter,system-ui,sans-serif;padding:48px 20px;text-align:center">
        <h1 style="color:#FA5D29;letter-spacing:-.04em">Gracias por apoyar</h1>
        <p style="max-width:520px;margin:16px auto;line-height:1.6;color:#c9c4bb">Tu aporte llegó. Se siente.</p>
        <p><a href="https://balosky.com" style="color:#FA5D29">volver a balosky.com</a></p>
      </body>`);
  } catch (e) {
    console.error('[GET /download/:token]', e);
    res.status(500).send('server error');
  }
});

router.get('/wallpapers/download', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).send('Token requerido');

    let decoded: any;
    try {
      decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch (e: any) {
      const reason = e && e.name === 'TokenExpiredError' ? 'expirado' : 'inválido';
      return res.status(401).send(`Token ${reason}`);
    }

    if (!decoded || decoded.typ !== 'wp-dl' || !decoded.wid) {
      return res.status(401).send('Token inválido');
    }

    const wp: any = await db.prepare(
      "SELECT id, mediaUrl, title, isLocked, active, kind FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(decoded.wid);
    if (!wp || !wp.active || wp.isLocked || !wp.mediaUrl) {
      return res.status(404).send('Wallpaper no disponible');
    }

    // Suggest a friendly filename; browser may override via the remote URL's headers.
    const safeTitle = String(wp.title || 'wallpaper').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'wallpaper';
    const ext = (wp.mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'jpg'])[1];
    res.setHeader('Content-Disposition', `attachment; filename="balosky-${safeTitle}.${ext}"`);
    // Redirect to the underlying file (works for both /uploads/* and remote URLs).
    res.redirect(302, wp.mediaUrl);
  } catch (e) {
    console.error('[GET /wallpapers/download]', e);
    res.status(500).send('server error');
  }
});

/* ==========================================================================
 * CLUB · MEMBRESÍAS RECURRENTES (MP Preapproval)
 * ========================================================================== */

const MP_API = 'https://api.mercadopago.com';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || '';

const FREQUENCY_MAP: Record<string, { frequency: number; type: 'months' | 'days' }> = {
  monthly: { frequency: 1, type: 'months' },
  yearly: { frequency: 12, type: 'months' },
  weekly: { frequency: 7, type: 'days' }
};

function resolveMembershipFrequency(billingPeriod: string | undefined) {
  const key = (billingPeriod || 'monthly').toLowerCase();
  return FREQUENCY_MAP[key] || FREQUENCY_MAP.monthly;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

router.post('/subscriptions/create', writePublicLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const membershipId = typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!membershipId) return res.status(400).json({ error: 'membershipId requerido' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email inválido' });
    }

    const membership: any = await db
      .prepare('SELECT id, name, price, billingPeriod, active FROM memberships WHERE id = ?')
      .get(membershipId);
    if (!membership || !membership.active) {
      return res.status(404).json({ error: 'Plan no disponible' });
    }

    const amount = Number(membership.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Plan mal configurado (price)' });
    }

    const freq = resolveMembershipFrequency(membership.billingPeriod);
    const subscriptionId = makeId('sub');
    const now = new Date().toISOString();
    const baseUrl = getBaseUrl(req);

    await db.prepare(`
      INSERT INTO subscriptions (id, email, membershipId, status, amount, frequency, createdAt, updatedAt)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(subscriptionId, email, membershipId, amount, membership.billingPeriod || 'monthly', now, now);

    if (!MP_TOKEN) {
      console.warn('[subscriptions/create] MP_ACCESS_TOKEN missing — devolvemos stub');
      return res.json({
        subscriptionId,
        initPoint: `${baseUrl}/club?sub=${subscriptionId}&dev=stub`,
        stub: true
      });
    }

    const preapprovalBody = {
      reason: `Balosky · ${membership.name}`,
      external_reference: subscriptionId,
      payer_email: email,
      back_url: `${baseUrl}/club?sub=${subscriptionId}`,
      auto_recurring: {
        frequency: freq.frequency,
        frequency_type: freq.type,
        transaction_amount: amount,
        currency_id: 'ARS'
      },
      status: 'pending'
    };

    const mpResp = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preapprovalBody)
    });

    const mpJson: any = await mpResp.json().catch(() => ({}));
    if (!mpResp.ok) {
      console.error('[subscriptions/create] MP error:', mpResp.status, mpJson);
      await db.prepare("UPDATE subscriptions SET status='failed', updatedAt=? WHERE id=?")
        .run(new Date().toISOString(), subscriptionId);
      return res.status(502).json({ error: 'MP preapproval falló', detail: mpJson?.message || mpJson });
    }

    const preapprovalId = mpJson.id || mpJson.preapproval_id;
    const initPoint = mpJson.init_point || mpJson.sandbox_init_point;

    await db.prepare(`
      UPDATE subscriptions
      SET mpPreapprovalId = ?, updatedAt = ?
      WHERE id = ?
    `).run(preapprovalId, new Date().toISOString(), subscriptionId);

    res.json({
      subscriptionId,
      preapprovalId,
      initPoint,
      sandboxInitPoint: mpJson.sandbox_init_point
    });
  } catch (e: any) {
    console.error('[POST /subscriptions/create]', e);
    res.status(500).json({ error: 'server error', detail: String(e?.message || e) });
  }
});

async function processPreapproval(preapprovalId: string) {
  if (!MP_TOKEN) {
    console.warn('[processPreapproval] sin MP_TOKEN, skip');
    return { ok: false, reason: 'no-token' };
  }
  const resp = await fetch(`${MP_API}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` }
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('[processPreapproval] MP fetch error', resp.status, data);
    return { ok: false, reason: 'mp-error' };
  }

  const extRef = data.external_reference || '';
  const status = data.status;
  const nextPayment = data.next_payment_date || null;
  const email = String(data.payer_email || '').toLowerCase();

  const sub: any = await db
    .prepare('SELECT id, email, membershipId, memberId, status FROM subscriptions WHERE id = ? OR mpPreapprovalId = ?')
    .get(extRef, preapprovalId);
  if (!sub) {
    console.warn('[processPreapproval] subscription no encontrada', preapprovalId, extRef);
    return { ok: false, reason: 'sub-not-found' };
  }

  let memberId = sub.memberId;
  if (status === 'authorized' && email) {
    const existing: any = await db.prepare('SELECT id FROM members WHERE email = ?').get(email);
    if (existing?.id) {
      memberId = existing.id;
    } else {
      memberId = makeId('mem');
      const mnow = new Date().toISOString();
      await db.prepare('INSERT INTO members (id, email, createdAt) VALUES (?, ?, ?)')
        .run(memberId, email, mnow);
    }
  }

  const now = new Date().toISOString();
  const wasJustAuthorized = status === 'authorized' && sub.status !== 'authorized';

  await db.prepare(`
    UPDATE subscriptions
    SET status = ?, memberId = ?, nextPaymentAt = ?, mpPreapprovalId = ?,
        authorizedAt = COALESCE(authorizedAt, ?),
        updatedAt = ?
    WHERE id = ?
  `).run(
    status || sub.status,
    memberId,
    nextPayment,
    preapprovalId,
    status === 'authorized' ? now : null,
    now,
    sub.id
  );

  /* ---------- Bienvenida al Baloskier nuevo ----------
     Sólo la mandamos la primera vez que la sub pasa a `authorized`
     (detectado con el diff entre sub.status previo y el status nuevo).
     Llevamos magic-login token para que entre al /club sin fricción. */
  if (wasJustAuthorized && memberId && email) {
    try {
      const membership: any = await db
        .prepare('SELECT id, name, price FROM memberships WHERE id = ?')
        .get(sub.membershipId);

      const magicToken = jwt.sign(
        { typ: 'member-verify', mid: memberId, email },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: '30d' }
      );
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'https://balosky.com';
      const magicLoginUrl = `${appUrl}/api/members/verify/${magicToken}`;

      await sendWelcomeBaloskier({
        to: email,
        membershipName: membership?.name || 'Baloskier',
        magicLoginUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: membership?.price ? Number(membership.price) : undefined
      }).catch((e) => console.error('[processPreapproval] welcome email error', e));

      await sendAdminAlert({
        kind: 'subscription',
        summary: `Baloskier nuevo · ${membership?.name || sub.membershipId} · ${email}`,
        details: {
          email,
          membership: membership?.name || sub.membershipId,
          subscriptionId: sub.id,
          amount: membership?.price,
          preapprovalId
        }
      }).catch((e) => console.error('[processPreapproval] admin alert error', e));
    } catch (welcomeErr) {
      console.error('[processPreapproval] welcome flow exception', welcomeErr);
    }
  }

  return { ok: true, status, memberId, subscriptionId: sub.id, email };
}

router.get('/subscriptions/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!id.startsWith('sub_')) return res.status(400).json({ error: 'id inválido' });
    const row: any = await db
      .prepare('SELECT id, status, email, membershipId, authorizedAt FROM subscriptions WHERE id = ?')
      .get(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({
      id: row.id,
      status: row.status,
      membershipId: row.membershipId,
      authorizedAt: row.authorizedAt
    });
  } catch (e) {
    console.error('[GET /subscriptions/:id/status]', e);
    res.status(500).json({ error: 'server error' });
  }
});

/* ==========================================================================
 * MEMBERS · Magic-link auth
 * ========================================================================== */

const MEMBER_COOKIE = 'balosky_member';
const MEMBER_COOKIE_TTL = 30 * 24 * 3600;

function setMemberCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${MEMBER_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MEMBER_COOKIE_TTL}`,
    'Path=/',
    ...(secure ? ['Secure'] : [])
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function clearMemberCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${MEMBER_COOKIE}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Path=/',
    ...(secure ? ['Secure'] : [])
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function readMemberFromCookie(req: express.Request): { id: string; email: string } | null {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|; )${MEMBER_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const decoded: any = jwt.verify(decodeURIComponent(match[1]), EFFECTIVE_JWT_SECRET);
    if (decoded?.typ !== 'member' || !decoded?.mid) return null;
    return { id: decoded.mid, email: decoded.email };
  } catch {
    return null;
  }
}

const magicLinkLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isDevLocalRequest,
  message: { error: 'Demasiados pedidos. Revisá tu bandeja o esperá unos minutos.' }
});

router.post('/members/request-link', magicLinkLimiter, async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email inválido' });
    }
    const member: any = await db.prepare('SELECT id, email FROM members WHERE email = ?').get(email);
    // No revelamos si existe o no — respuesta idéntica.
    if (member) {
      const token = jwt.sign(
        { typ: 'member-verify', mid: member.id, email: member.email },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: '30m' }
      );
      const baseUrl = getBaseUrl(req);
      const magicUrl = `${baseUrl}/api/members/verify/${token}`;
      try {
        await sendMagicLinkEmail({
          to: email,
          magicUrl,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        });
      } catch (e) {
        console.error('[members/request-link] email send failed', e);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[POST /members/request-link]', e);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/members/verify/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    let decoded: any;
    try {
      decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch (e: any) {
      const reason = e?.name === 'TokenExpiredError' ? 'expired' : 'invalid';
      return res.redirect(302, `/club?auth=${reason}`);
    }
    if (decoded?.typ !== 'member-verify' || !decoded?.mid) {
      return res.redirect(302, '/club?auth=invalid');
    }
    const member: any = await db.prepare('SELECT id, email FROM members WHERE id = ?').get(decoded.mid);
    if (!member) return res.redirect(302, '/club?auth=gone');

    const sessionToken = jwt.sign(
      { typ: 'member', mid: member.id, email: member.email },
      EFFECTIVE_JWT_SECRET,
      { expiresIn: `${MEMBER_COOKIE_TTL}s` }
    );
    setMemberCookie(res, sessionToken);
    await db.prepare('UPDATE members SET lastLoginAt = ? WHERE id = ?')
      .run(new Date().toISOString(), member.id);
    res.redirect(302, '/club?auth=ok');
  } catch (e) {
    console.error('[GET /members/verify]', e);
    res.redirect(302, '/club?auth=error');
  }
});

router.get('/members/me', async (req, res) => {
  const session = readMemberFromCookie(req);
  if (!session) return res.json({ member: null });
  try {
    const member: any = await db
      .prepare('SELECT id, email, name, createdAt, lastLoginAt FROM members WHERE id = ?')
      .get(session.id);
    if (!member) return res.json({ member: null });

    const activeSub: any = await db.prepare(`
      SELECT s.id, s.status, s.membershipId, s.nextPaymentAt, m.name AS membershipName
      FROM subscriptions s LEFT JOIN memberships m ON m.id = s.membershipId
      WHERE s.memberId = ? AND s.status = 'authorized'
      ORDER BY s.authorizedAt DESC LIMIT 1
    `).get(member.id);

    res.json({
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        since: member.createdAt,
        lastLoginAt: member.lastLoginAt
      },
      subscription: activeSub ? {
        id: activeSub.id,
        status: activeSub.status,
        membershipId: activeSub.membershipId,
        membershipName: activeSub.membershipName,
        nextPaymentAt: activeSub.nextPaymentAt
      } : null
    });
  } catch (e) {
    console.error('[GET /members/me]', e);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/members/logout', async (_req, res) => {
  clearMemberCookie(res);
  res.json({ ok: true });
});

export default router;
export { processPreapproval, readMemberFromCookie };
