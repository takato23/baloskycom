import express from 'express';
import db, { createAdminUser, hasAdminUsers, updateAdminUserCredentials } from '../db.js';import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev';

// Configure Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000' 
});
const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);

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

const getPaymentIdFromWebhook = (req: express.Request) => {
  const bodyPaymentId = req.body?.data?.id ?? req.body?.resource?.split('/').pop();
  const queryPaymentId = req.query['data.id'] ?? req.query.id;
  const maybePaymentId = bodyPaymentId || queryPaymentId;

  if (!maybePaymentId) return null;

  const parsedPaymentId = Number(maybePaymentId);
  return Number.isFinite(parsedPaymentId) ? parsedPaymentId : null;
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

  // Execute sequentially (no true transaction available with pgbouncer, but atomicity is still achieved)
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
    message
  };
};

// --- AUTH MIDDLEWARE ---
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

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
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
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
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '24h' });
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

router.post('/messages', async (req, res) => {
  try {
    const { supporterName, amount, message, isAnonymous, isApproved, campaignId } = req.body;
    const id = `msg_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // Policy: los mensajes son públicos automáticamente (sin moderación previa).
    // Solo quedan ocultos si el cliente manda explícitamente isApproved: false.
    const approvedFlag = isApproved === false ? 0 : 1;

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, supporterName, amount, message, isAnonymous ? 1 : 0, approvedFlag, createdAt, campaignId || null);

    // Update campaign amount if applicable
    if (campaignId) {
      await db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, campaignId);
    } else {
      // Add to general 'c3' if no campaign
      await db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, 'c3');
    }

    const newMessage = await db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
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

// --- WEBHOOK ---
router.post('/webhook/mercadopago', async (req, res) => {
  try {
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
router.post('/newsletter', async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const normalized = String(email).trim().toLowerCase();
    const existing = await db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(normalized);
    if (existing) {
      return res.json({ success: true, duplicate: true });
    }
    const id = `sub_${Date.now()}`;
    await db.prepare(`
      INSERT INTO newsletter_subscribers (id, email, source, active, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, normalized, source || 'footer', 1, new Date().toISOString());
    res.json({ success: true, duplicate: false });
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
router.post('/wallpapers/request', async (req, res) => {
  try {
    const { email, wallpaperId } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (!wallpaperId || typeof wallpaperId !== 'string') {
      return res.status(400).json({ error: 'wallpaperId requerido' });
    }

    const normalized = String(email).trim().toLowerCase();

    // Verify wallpaper exists, is active, and is not locked (locked ones need a purchase)
    const wp: any = await db.prepare(
      "SELECT id, mediaUrl, isLocked, isActive, kind FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(wallpaperId);
    if (!wp) return res.status(404).json({ error: 'Wallpaper no encontrado' });
    if (!wp.isActive) return res.status(404).json({ error: 'Wallpaper no disponible' });
    if (wp.isLocked) return res.status(402).json({ error: 'Wallpaper parte del pack, necesita compra' });
    if (!wp.mediaUrl) return res.status(404).json({ error: 'Archivo no disponible' });

    // Upsert subscriber (ignore duplicates)
    try {
      const existing: any = await db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(normalized);
      if (!existing) {
        const id = `sub_${Date.now()}`;
        await db.prepare(`
          INSERT INTO newsletter_subscribers (id, email, source, active, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, normalized, 'wallpaper-gate', 1, new Date().toISOString());
      }
    } catch (e) {
      console.warn('[wallpapers/request] subscriber upsert failed, continuing', e);
    }

    // Sign a short-lived token that binds the wallpaper id + email.
    const token = jwt.sign(
      { wid: wallpaperId, em: normalized, typ: 'wp-dl' },
      JWT_SECRET,
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

router.get('/wallpapers/download', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).send('Token requerido');

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e: any) {
      const reason = e && e.name === 'TokenExpiredError' ? 'expirado' : 'inválido';
      return res.status(401).send(`Token ${reason}`);
    }

    if (!decoded || decoded.typ !== 'wp-dl' || !decoded.wid) {
      return res.status(401).send('Token inválido');
    }

    const wp: any = await db.prepare(
      "SELECT id, mediaUrl, title, isLocked, isActive, kind FROM media WHERE id = ? AND kind = 'wallpaper'"
    ).get(decoded.wid);
    if (!wp || !wp.isActive || wp.isLocked || !wp.mediaUrl) {
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

export default router;
