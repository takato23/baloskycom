import express from 'express';
import db from '../db';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev';

// Configure Mercado Pago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000' 
});

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
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
  
  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// --- PRODUCTS ---
router.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY sortOrder ASC').all();
  res.json(products.map((p: any) => ({
    ...p,
    active: Boolean(p.active),
    featured: Boolean(p.featured)
  })));
});

router.post('/products', requireAuth, (req, res) => {
  const p = req.body;
  const id = `prod_${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO products (id, title, description, price, category, coverImage, deliveryType, fileUrl, externalUrl, active, featured, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, p.title, p.description, p.price, p.category, p.coverImage, p.deliveryType, p.fileUrl || null, p.externalUrl || null, p.active ? 1 : 0, p.featured ? 1 : 0, p.sortOrder || 0, createdAt);
  
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

router.put('/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const p = req.body;
  db.prepare(`
    UPDATE products 
    SET title = ?, description = ?, price = ?, category = ?, coverImage = ?, deliveryType = ?, fileUrl = ?, externalUrl = ?, active = ?, featured = ?, sortOrder = ?
    WHERE id = ?
  `).run(p.title, p.description, p.price, p.category, p.coverImage, p.deliveryType, p.fileUrl || null, p.externalUrl || null, p.active ? 1 : 0, p.featured ? 1 : 0, p.sortOrder || 0, id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

router.delete('/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- MEMBERSHIPS ---
router.get('/memberships', (req, res) => {
  const memberships = db.prepare('SELECT * FROM memberships ORDER BY sortOrder ASC').all();
  res.json(memberships.map((m: any) => ({
    ...m,
    benefits: JSON.parse(m.benefits),
    isHighlighted: Boolean(m.isHighlighted),
    active: Boolean(m.active)
  })));
});

router.post('/memberships', requireAuth, (req, res) => {
  const m = req.body;
  const id = `memb_${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, m.name, m.price, m.billingPeriod, m.description, JSON.stringify(m.benefits || []), m.isHighlighted ? 1 : 0, m.active ? 1 : 0, m.sortOrder || 0, createdAt);
  
  res.json(db.prepare('SELECT * FROM memberships WHERE id = ?').get(id));
});

router.put('/memberships/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const m = req.body;
  db.prepare(`
    UPDATE memberships 
    SET name = ?, price = ?, billingPeriod = ?, description = ?, benefits = ?, isHighlighted = ?, active = ?, sortOrder = ?
    WHERE id = ?
  `).run(m.name, m.price, m.billingPeriod, m.description, JSON.stringify(m.benefits || []), m.isHighlighted ? 1 : 0, m.active ? 1 : 0, m.sortOrder || 0, id);
  res.json(db.prepare('SELECT * FROM memberships WHERE id = ?').get(id));
});

router.delete('/memberships/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM memberships WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- CAMPAIGNS ---
router.get('/campaigns', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY sortOrder ASC').all();
  res.json(campaigns.map((c: any) => ({
    ...c,
    active: c.status === 'active',
    isFeatured: Boolean(c.isFeatured)
  })));
});

router.post('/campaigns', requireAuth, (req, res) => {
  const c = req.body;
  const id = `camp_${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO campaigns (id, title, slug, shortDescription, fullDescription, videoUrl, targetAmount, currentAmount, currency, coverImage, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, c.title, c.slug || id, c.shortDescription, c.fullDescription || null, c.videoUrl || null, c.targetAmount, c.currentAmount || 0, c.currency || 'ARS', c.coverImage, c.status || 'active', c.isFeatured ? 1 : 0, c.sortOrder || 0, c.stretchGoals ? JSON.stringify(c.stretchGoals) : null, createdAt, createdAt);
  
  res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
});

router.put('/campaigns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const stmt = db.prepare(`
    UPDATE campaigns 
    SET title = ?, shortDescription = ?, fullDescription = ?, videoUrl = ?, targetAmount = ?, currentAmount = ?, coverImage = ?, status = ?, isFeatured = ?, sortOrder = ?, stretchGoals = ?, updatedAt = ?
    WHERE id = ?
  `);
  
  stmt.run(
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
  
  const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/campaigns/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- REWARDS ---
router.get('/rewards', (req, res) => {
  const rewards = db.prepare('SELECT * FROM rewards').all();
  res.json(rewards);
});

// --- USERS ---
router.get('/users', requireAuth, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, role, createdAt FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.delete('/users/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- MESSAGES ---
router.get('/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC').all();
  res.json(messages.map((m: any) => ({
    ...m,
    isAnonymous: Boolean(m.isAnonymous),
    isApproved: Boolean(m.isApproved)
  })));
});

router.put('/messages/:id/approve', requireAuth, (req, res) => {
  const { id } = req.params;
  const { isApproved } = req.body;
  db.prepare('UPDATE messages SET isApproved = ? WHERE id = ?').run(isApproved ? 1 : 0, id);
  res.json({ success: true });
});

router.put('/messages/:id/response', requireAuth, (req, res) => {
  const { id } = req.params;
  const { creatorResponse } = req.body;
  db.prepare('UPDATE messages SET creatorResponse = ? WHERE id = ?').run(creatorResponse, id);
  res.json({ success: true });
});

router.post('/messages', (req, res) => {
  const { supporterName, amount, message, isAnonymous, isApproved, campaignId } = req.body;
  const id = `msg_${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, supporterName, amount, message, isAnonymous ? 1 : 0, isApproved ? 1 : 0, createdAt, campaignId || null);
  
  // Update campaign amount if applicable
  if (campaignId) {
    db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, campaignId);
  } else {
    // Add to general 'c3' if no campaign
    db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, 'c3');
  }

  const newMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.json(newMessage);
});

router.delete('/messages/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- DISCOUNT CODES ---
router.get('/discount-codes', requireAuth, (req, res) => {
  const codes = db.prepare('SELECT * FROM discount_codes').all();
  res.json(codes.map((c: any) => ({ ...c, active: Boolean(c.active) })));
});

router.post('/discount-codes', requireAuth, (req, res) => {
  const { code, discountPercent, active } = req.body;
  const id = `dc_${Date.now()}`;
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO discount_codes (id, code, discountPercent, active, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, code, discountPercent, active ? 1 : 0, createdAt);
  res.json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(id));
});

router.put('/discount-codes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { code, discountPercent, active } = req.body;
  db.prepare('UPDATE discount_codes SET code = ?, discountPercent = ?, active = ? WHERE id = ?').run(code, discountPercent, active ? 1 : 0, id);
  res.json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(id));
});

router.delete('/discount-codes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM discount_codes WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- PURCHASES ---
router.get('/purchases', requireAuth, (req, res) => {
  const purchases = db.prepare('SELECT * FROM purchases ORDER BY createdAt DESC').all();
  res.json(purchases);
});

router.post('/purchases', requireAuth, (req, res) => {
  const { supporterName, type, itemId, title } = req.body;
  const id = `pur_${Date.now()}`;
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO purchases (id, supporterName, type, itemId, title, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(id, supporterName, type, itemId, title, createdAt);
  res.json(db.prepare('SELECT * FROM purchases WHERE id = ?').get(id));
});

router.delete('/purchases/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- SETTINGS ---
router.get('/settings', (req, res) => {
  const row = db.prepare('SELECT data FROM settings WHERE id = ?').get('global') as any;
  if (row) {
    res.json(JSON.parse(row.data));
  } else {
    res.status(404).json({ error: 'Settings not found' });
  }
});

router.put('/settings', requireAuth, (req, res) => {
  const data = req.body;
  db.prepare('UPDATE settings SET data = ? WHERE id = ?').run(JSON.stringify(data), 'global');
  res.json(data);
});

// --- MERCADO PAGO ---
router.post('/checkout/preference', async (req, res) => {
  try {
    const { amount, title, campaignId, supporterName, message } = req.body;

    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: campaignId || 'general',
            title: title || 'Aporte a Creador',
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${req.headers.origin}/checkout/success`,
          failure: `${req.headers.origin}/checkout/failure`,
          pending: `${req.headers.origin}/checkout/pending`
        },
        auto_return: 'approved',
        metadata: {
          campaignId,
          supporterName,
          message
        },
        notification_url: `${req.headers.origin}/api/webhook/mercadopago`
      }
    });

    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error('Mercado Pago Error:', error);
    res.status(500).json({ error: 'Error creating preference' });
  }
});

// --- WEBHOOK ---
router.post('/webhook/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      console.log('Payment received:', data.id);
      
      // NOTE: In a real environment, you would fetch the payment details from MP API using data.id
      // to verify the payment status and get the metadata.
      // For this MVP, we will simulate fetching the metadata from the payment
      // and creating the message/updating the campaign.
      
      // If we could fetch it, it would look like this:
      /*
      const payment = await mpClient.payment.get({ id: data.id });
      if (payment.status === 'approved') {
        const { campaignId, supporterName, message } = payment.metadata;
        const amount = payment.transaction_amount;
      */
      
      // --- SIMULATED WEBHOOK PROCESSING FOR TESTING ---
      // We are simulating the data that would normally come from the MP API
      // This allows us to test the webhook locally without a real MP token
      
      // We'll extract the metadata from the request body if it was sent (for testing)
      // or use dummy data if it wasn't.
      const metadata = req.body.metadata || {};
      const campaignId = metadata.campaignId || null;
      const supporterName = metadata.supporterName || 'Anónimo (Webhook)';
      const message = metadata.message || 'Gracias por el apoyo!';
      const amount = req.body.transaction_amount || 100; // Default amount
      
      // Create message
      const id = `msg_${Date.now()}`;
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO messages (id, supporterName, amount, message, isAnonymous, isApproved, createdAt, campaignId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, supporterName, amount, message, !supporterName ? 1 : 0, 1, createdAt, campaignId);
      
      // Update campaign
      if (campaignId) {
        db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, campaignId);
      } else {
        db.prepare('UPDATE campaigns SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, 'c3');
      }

      // --- DISCORD WEBHOOK ---
      try {
        const settingsRow = db.prepare('SELECT data FROM settings WHERE id = ?').get('global') as any;
        if (settingsRow) {
          const settings = JSON.parse(settingsRow.data);
          if (settings.discordWebhookUrl) {
            await fetch(settings.discordWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `🎉 **¡Nuevo Aporte!**\n**${supporterName}** acaba de aportar **$${amount}**.\nMensaje: "${message}"`
              })
            });
          }
        }
      } catch (e) {
        console.error('Error sending Discord webhook:', e);
      }

      // --- DIGITAL PRODUCT DELIVERY LOGIC ---
      // In a real application, you would check if the payment was for a specific product
      // or membership, and then trigger an email with the download link or access instructions.
      // For this MVP, we'll just log that the delivery process would start here.
      if (metadata.productId) {
        console.log(`Triggering delivery for product ${metadata.productId} to ${metadata.payerEmail || 'unknown email'}`);
        // Example: await emailService.sendProductDeliveryEmail(metadata.payerEmail, metadata.productId);
      } else if (metadata.membershipId) {
        console.log(`Activating membership ${metadata.membershipId} for ${metadata.payerEmail || 'unknown email'}`);
        // Example: await userService.activateMembership(metadata.payerUserId, metadata.membershipId);
      }
      // --------------------------------------
      
      console.log('Simulated webhook processed successfully');
      // ------------------------------------------------
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Error');
  }
});

export default router;
