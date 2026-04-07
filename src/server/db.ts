import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'database.sqlite'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    shortDescription TEXT NOT NULL,
    fullDescription TEXT,
    targetAmount INTEGER NOT NULL,
    currentAmount INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ARS',
    coverImage TEXT NOT NULL,
    videoUrl TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    isFeatured INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    stretchGoals TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    minAmount INTEGER NOT NULL,
    type TEXT NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    supporterName TEXT NOT NULL,
    amount INTEGER NOT NULL,
    message TEXT,
    creatorResponse TEXT,
    isAnonymous INTEGER NOT NULL DEFAULT 0,
    isApproved INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    campaignId TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    coverImage TEXT NOT NULL,
    deliveryType TEXT NOT NULL,
    fileUrl TEXT,
    externalUrl TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    billingPeriod TEXT NOT NULL,
    description TEXT NOT NULL,
    benefits TEXT NOT NULL,
    isHighlighted INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discount_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discountPercent INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supporterName TEXT NOT NULL,
    type TEXT NOT NULL,
    itemId TEXT NOT NULL,
    title TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

// Add new columns to existing tables if they don't exist (SQLite ALTER TABLE limitations workaround)
try { db.exec('ALTER TABLE campaigns ADD COLUMN stretchGoals TEXT;'); } catch (e) { /* Ignore if exists */ }
try { db.exec('ALTER TABLE campaigns ADD COLUMN videoUrl TEXT;'); } catch (e) { /* Ignore if exists */ }
try { db.exec('ALTER TABLE messages ADD COLUMN creatorResponse TEXT;'); } catch (e) { /* Ignore if exists */ }

// Seed initial data if empty
const countCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number };
if (countCampaigns.count === 0) {
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, title, slug, shortDescription, targetAmount, currentAmount, currency, coverImage, videoUrl, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const stretchGoalsJapon = JSON.stringify([
    { amount: 2000000, description: 'Hago un directo de 12 horas desde Akihabara' },
    { amount: 3000000, description: 'Sorteo una caja de snacks japoneses entre los aportantes' }
  ]);
  
  insertCampaign.run('c1', 'Misión Japón 🇯🇵', 'mision-japon', 'Bancá este delirio para que pueda documentar el lado B de Tokyo. ¡Prometo vlogs épicos y mucho ramen!', 1500000, 450000, 'ARS', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'active', 1, 1, stretchGoalsJapon, now, now);
  insertCampaign.run('c2', 'Fondo para la nueva cámara 📸', 'nueva-camara', 'La vieja ya no da más. Necesito un upgrade para que los videos no parezcan grabados con una tostadora.', 800000, 120000, 'ARS', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop', null, 'active', 0, 2, null, now, now);
  insertCampaign.run('c3', 'Cafecito de supervivencia ☕', 'cafecito', 'Aporte libre para bancar el contenido del día a día. Todo suma para seguir creando.', 0, 55000, 'ARS', 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop', null, 'active', 0, 3, null, now, now);

  const insertReward = db.prepare(`
    INSERT INTO rewards (id, title, description, minAmount, type, icon)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertReward.run('r1', 'Pack de Stickers Digitales', 'Stickers exclusivos para WhatsApp y Telegram con mis mejores frases.', 1000, 'digital', 'Sticker');
  insertReward.run('r2', 'Te dedico un meme', 'Hago un meme personalizado con tu nombre y lo subo a mis historias de Instagram.', 3000, 'digital', 'Image');
  insertReward.run('r3', 'Chat privado (15 min)', 'Hacemos una videollamada de 15 minutos para charlar de la vida, viajes o lo que quieras.', 10000, 'digital', 'Video');
  insertReward.run('r4', 'Mejores Amigos en IG', 'Te agrego a mi lista de Mejores Amigos en Instagram por 1 mes para contenido exclusivo.', 25000, 'badge', 'Award');
  insertReward.run('r5', 'Desarrollo de Webapp Custom', 'Me encargo de desarrollar tu landing page o webapp sencilla. Incluye diseño brutalista y código fuente.', 150000, 'service', 'Code');
  insertReward.run('r6', 'Edición IA Custom', 'Edito 5 fotos o 1 video corto usando IA para tu marca o proyecto personal.', 50000, 'service', 'ImageIcon');

  const insertMessage = db.prepare(`
    INSERT INTO messages (id, supporterName, amount, message, creatorResponse, isAnonymous, isApproved, createdAt, campaignId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMessage.run('s1', 'Juan Pérez', 5000, 'Para el sushi en Tokyo pa! Rompela.', '¡Gracias Juan! Prometo subir foto del sushi 🍣', 0, 1, new Date(Date.now() - 7200000).toISOString(), 'c1');
  insertMessage.run('s2', 'Ana G.', 1500, 'Bancando fuerte el contenido siempre.', null, 0, 1, new Date(Date.now() - 18000000).toISOString(), null);
  insertMessage.run('s3', 'Matias', 10000, 'Que se venga esa cámara nueva 🚀', '¡Sos un crack Mati! Ya falta menos.', 0, 1, new Date(Date.now() - 86400000).toISOString(), 'c2');
  insertMessage.run('s4', 'Sofi', 1000, 'Invitame un cafecito virtual', null, 0, 1, new Date(Date.now() - 86400000).toISOString(), 'c3');

  const initialSettings = {
    creatorName: 'Santi Balosky',
    creatorBio: 'Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.',
    creatorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop',
    heroTitle: 'Santi Balosky',
    heroSubtitle: 'Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.',
    primaryCTA: 'Invitame un cafecito',
    secondaryCTA: 'Ver recompensas',
    socialLinks: {
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      twitter: 'https://twitter.com'
    },
    defaultTheme: 'brutalist',
    visibleSections: ['hero', 'campaigns', 'rewards', 'wall'],
    supportAmountsSuggested: [1000, 3000, 5000, 10000],
    legalText: 'Pago seguro simulado (MVP)'
  };
  
  db.prepare('INSERT INTO settings (id, data) VALUES (?, ?)').run('global', JSON.stringify(initialSettings));

  // Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, title, description, price, category, coverImage, deliveryType, active, featured, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run('p1', 'Guía de Viaje: Tokyo Low Cost', 'Un PDF de 50 páginas con todos mis secretos para viajar a Japón sin fundirte.', 5000, 'ebook', 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=800&auto=format&fit=crop', 'file', 1, 1, 1, now);
  insertProduct.run('p2', 'Presets de Lightroom', 'Los 5 presets que uso para editar todas mis fotos de Instagram.', 3000, 'digital', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop', 'file', 1, 0, 2, now);

  // Seed Memberships
  const insertMembership = db.prepare(`
    INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMembership.run('m1', 'Bancador Oficial', 2000, 'monthly', 'Acceso a contenido exclusivo y mi gratitud eterna.', JSON.stringify(['Vlogs detrás de escena', 'Mención en videos', 'Grupo de Telegram']), 0, 1, 1, now);
  insertMembership.run('m2', 'Productor Ejecutivo', 5000, 'monthly', 'Para los que quieren ser parte activa del canal.', JSON.stringify(['Todo lo anterior', 'Votación de próximos destinos', 'Videollamada mensual grupal']), 1, 1, 2, now);

  // Seed Admin User
  db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run('u1', 'admin', 'admin123');

  // Seed Discount Codes
  db.prepare('INSERT INTO discount_codes (id, code, discountPercent, active, createdAt) VALUES (?, ?, ?, ?, ?)').run('d1', 'VERANO20', 20, 1, now);

  // Seed Purchases
  db.prepare('INSERT INTO purchases (id, supporterName, type, itemId, title, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run('pur1', 'Santi Balosky', 'product', 'p1', 'Guía de Viaje: Tokyo Low Cost', now);
}

export default db;
