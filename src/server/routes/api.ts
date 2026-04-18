import express from 'express';
import db, { createAdminUser, hasAdminUsers, updateAdminUserCredentials } from '../db.js';import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { sendDeliveryEmail } from '../email.js';
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

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/webhook/mercadopago' || Boolean(req.headers.authorization)
});

router.use(publicLimiter);

/* Rate-limit estricto para escritura pública sin auth (muro, leads).
   5 posts por IP cada 5 min — suficiente para uso humano, ahoga bots. */
const writePublicLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.headers.authorization),
  message: { error: 'Demasiados intentos. Esperá unos minutos.' }
});

const getBaseUrl = (req: express.Request) => {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const origin = req.headers.origin;
  if (origin) return origin.replace(/\/$/, '');

  return `${req.protocol}://${req.get('host')}`;
};

const getNotificationUrl = (req: express.Request) => {
  const baseUrl = getBaseUrl(req);

  try {
    const hostname = new URL(baseUrl).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return undefined;
    }
  } catch (error) {
    console.warn('Invalid APP_URL/origin for Mercado Pago webhook:', error);
    return undefined;
  }

  return `${baseUrl}/api/webhook/mercadopago`;
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
      if (!purchaseRow.emailSentAt && finalEmail) {
        try {
          const sendResult = await sendDeliveryEmail({
            to: finalEmail,
            productTitle,
            downloadUrl,
            expiresAt: downloadExpiresAt,
            amount,
            purchaseId,
            supporterName: rawSupporterName || undefined,
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

// --- AUTH MIDDLEWARE ---
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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

router.post('/auth/bootstrap', async (req, res) => {
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

router.post('/auth/login', async (req, res) => {
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
router.get('/messages', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500);
    const messages = await db
      .prepare('SELECT * FROM messages ORDER BY createdAt DESC LIMIT ?')
      .all(limit);
    res.json(messages.map((m: any) => ({
      ...m,
      isAnonymous: Boolean(m.isAnonymous),
      isApproved: Boolean(m.isApproved)
    })));
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

    const newMessage: any = await db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.json(newMessage);
  } catch (e) {
    console.error('[POST /messages]', e);
    res.status(500).json({ error: 'database error' });
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
      res.json(JSON.parse(row.data));
    } else {
      /* Graceful fallback: return empty object so the frontend doesn't log a 404. */
      res.json({});
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

// --- MERCADO PAGO ---
router.post('/checkout/preference', async (req, res) => {
  try {
    const { amount, title, campaignId, supporterName, message } = req.body;
    const normalizedAmount = Number(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const baseUrl = getBaseUrl(req);
    const notificationUrl = getNotificationUrl(req);

    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: campaignId || 'general',
            title: title || 'Aporte a Creador',
            quantity: 1,
            unit_price: normalizedAmount,
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`
        },
        auto_return: 'approved',
        external_reference: `${campaignId || 'general'}-${Date.now()}`,
        metadata: {
          campaignId,
          supporterName: typeof supporterName === 'string' ? supporterName.trim() : '',
          message: typeof message === 'string' ? message.trim() : ''
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
    res.status(500).json({ error: 'Error creating preference' });
  }
});

router.get('/checkout/status/:paymentId', async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);

    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment id' });
    }

    const payment = await paymentClient.get({ id: paymentId });
    const processingResult = payment.status === 'approved' ? await processApprovedPayment(payment) : null;

    res.json({
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      processed: processingResult?.reason === 'processed' || processingResult?.reason === 'already-processed'
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

const resolveItemTitleAndPrice = async (type: CheckoutType, itemId: string | undefined, overrideAmount: number | undefined) => {
  if (type === 'wallpaper' || type === 'pack') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare(
      "SELECT id, title, isLocked, active, mediaUrl FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Wallpaper no disponible' as const };
    // Packs por defecto 3500 ARS; wallpapers sueltos 1200 ARS; override permitido
    const defaultPrice = type === 'pack' ? 3500 : 1200;
    const amount = Number.isFinite(Number(overrideAmount)) && Number(overrideAmount) > 0 ? Number(overrideAmount) : defaultPrice;
    return { ok: true as const, title: row.title || 'Wallpaper', amount, itemId: row.id };
  }
  if (type === 'product') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare('SELECT id, title, price, active, deliveryType, fileUrl, externalUrl FROM products WHERE id = ?').get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Producto no disponible' as const };
    const amount = Number.isFinite(Number(overrideAmount)) && Number(overrideAmount) > 0 ? Number(overrideAmount) : Number(row.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Precio inválido' as const };
    return { ok: true as const, title: row.title || 'Producto', amount, itemId: row.id };
  }
  if (type === 'membership') {
    if (!itemId) return { ok: false, error: 'itemId requerido' as const };
    const row: any = await db.prepare('SELECT id, name, price, active FROM memberships WHERE id = ?').get(itemId);
    if (!row || !row.active) return { ok: false, error: 'Membership no disponible' as const };
    const amount = Number.isFinite(Number(overrideAmount)) && Number(overrideAmount) > 0 ? Number(overrideAmount) : Number(row.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Precio inválido' as const };
    return { ok: true as const, title: row.name || 'Membresía', amount, itemId: row.id };
  }
  // type === 'campaign' (aporte a campaña, monto libre)
  const amount = Number(overrideAmount);
  if (!Number.isFinite(amount) || amount < 1) return { ok: false, error: 'Monto inválido' as const };
  const campaignId = itemId || 'c3';
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
        auto_return: 'approved',
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
    if (row.status === 'paid' && row.downloadToken) {
      base.downloadToken = row.downloadToken;
      base.downloadExpiresAt = row.downloadExpiresAt;
    }

    res.json(base);
  } catch (e) {
    console.error('[GET /purchases/:id/status]', e);
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

    const payment = await paymentClient.get({ id: paymentId });
    const processingResult = await processApprovedPayment(payment);

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
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Partition by year/month to keep the folder tidy
    const d = new Date();
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dest = path.join(UPLOADS_DIR, year, month);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const safeBase = path.parse(file.originalname).name
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${safeBase || 'file'}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — enough for short videos + hi-res images
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image|video|audio)\//.test(file.mimetype);
    if (!allowed) return cb(new Error('Tipo de archivo no permitido. Solo image/video/audio.'));
    cb(null, true);
  }
});

router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'No file uploaded' });
    // Path relative to /public so it's served as static
    const rel = path.relative(path.join(process.cwd(), 'public'), f.path);
    const url = '/' + rel.split(path.sep).join('/');
    res.json({
      url,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size
    });
  } catch (e) {
    console.error('[POST /upload]', e);
    res.status(500).json({ error: 'upload failed' });
  }
});

// --- MEDIA (video_ia, foto, wallpaper, cancion) ---
const mapMedia = (m: any) => ({
  ...m,
  thumbUrl: m.thumbUrl || null,
  isLocked: Boolean(m.isLocked),
  active: Boolean(m.active),
  featured: Boolean(m.featured),
  playCount: Number(m.playCount || 0)
});

router.get('/media', async (req, res) => {
  try {
    const { kind } = req.query;
    const rows = kind
      ? await db.prepare('SELECT * FROM media WHERE kind = ? ORDER BY sortOrder ASC, createdAt DESC').all(String(kind))
      : await db.prepare('SELECT * FROM media ORDER BY kind ASC, sortOrder ASC').all();
    res.json(rows.map(mapMedia));
  } catch (e) {
    console.error('[GET /media]', e);
    res.status(500).json({ error: 'database error' });
  }
});

router.get('/media/:id', async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(mapMedia(row));
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
    await db.prepare(`
      INSERT INTO media (id, kind, title, description, category, mediaUrl, thumbUrl, embedUrl, coverImage, duration, aiTool, aiPrompt, isLocked, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, m.kind, m.title, m.description || null, m.category || null,
      m.mediaUrl || null, m.thumbUrl || null, m.embedUrl || null, m.coverImage || null, m.duration || null,
      m.aiTool || null, m.aiPrompt || null,
      m.isLocked ? 1 : 0,
      m.active === false ? 0 : 1,
      m.featured ? 1 : 0,
      m.sortOrder || 0,
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
    if (m.isLocked !== undefined)    cols.push(['isLocked', m.isLocked ? 1 : 0]);
    if (m.active !== undefined)      cols.push(['active', m.active === false ? 0 : 1]);
    if (m.featured !== undefined)    cols.push(['featured', m.featured ? 1 : 0]);
    if (m.sortOrder !== undefined)   cols.push(['sortOrder', Number(m.sortOrder) || 0]);

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

// --- SOCIALS ---
const mapSocial = (s: any) => ({ ...s, active: Boolean(s.active) });

router.get('/socials', async (_req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM socials WHERE active = 1 ORDER BY sortOrder ASC').all();
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
    const { email, source } = req.body;
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
    if (wp.isLocked) return res.status(402).json({ error: 'Wallpaper parte del pack, necesita compra' });
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
      return res.redirect(302, row.mediaUrl);
    };

    if (finalKind === 'wallpaper' || finalKind === 'pack') {
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
      if (delivery === 'digital' && row.fileUrl) {
        const ext = (row.fileUrl.match(/\.([a-z0-9]+)(\?|$)/i) || [, 'pdf'])[1];
        res.setHeader('Content-Disposition', `attachment; filename="balosky-${safeTitle}.${ext}"`);
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
    const decoded: any = jwt.verify(decodeURIComponent(match[1]), JWT_SECRET);
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
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      const baseUrl = getBaseUrl(req);
      const magicUrl = `${baseUrl}/api/members/verify/${token}`;
      try {
        await sendDeliveryEmail({
          to: email,
          productTitle: 'Acceso al Club Balosky',
          downloadUrl: magicUrl,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          amount: 0,
          purchaseId: member.id,
          supporterName: ''
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
      decoded = jwt.verify(token, JWT_SECRET);
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
      JWT_SECRET,
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
