import express from 'express';
import db, { createAdminUser, hasAdminUsers, updateAdminUserCredentials } from '../db.js';import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../auth.js';
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

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, supporterName, amount, message, isAnonymous ? 1 : 0, isApproved ? 1 : 0, createdAt, campaignId || null);

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
      res.status(404).json({ error: 'Settings not found' });
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

export default router;
