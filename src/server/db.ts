import postgres from 'postgres';
import { DEFAULT_PUBLIC_CONTENT } from '../content/publicContent.js';import { hashPassword, verifyPassword } from './auth.js';
// Map of camelCase column names to snake_case for conversions
const COLUMN_MAP: Record<string, string> = {
  shortDescription: 'short_description',
  fullDescription: 'full_description',
  targetAmount: 'target_amount',
  currentAmount: 'current_amount',
  coverImage: 'cover_image',
  videoUrl: 'video_url',
  isFeatured: 'is_featured',
  sortOrder: 'sort_order',
  stretchGoals: 'stretch_goals',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  supporterName: 'supporter_name',
  creatorResponse: 'creator_response',
  isAnonymous: 'is_anonymous',
  isApproved: 'is_approved',
  campaignId: 'campaign_id',
  deliveryType: 'delivery_type',
  fileUrl: 'file_url',
  externalUrl: 'external_url',
  billingPeriod: 'billing_period',
  isHighlighted: 'is_highlighted',
  passwordHash: 'password_hash',
  discountPercent: 'discount_percent',
  itemId: 'item_id',
  paymentId: 'payment_id',
  messageId: 'message_id',
  externalReference: 'external_reference',
  processedAt: 'processed_at'
};

// Reverse map: snake_case to camelCase
const REVERSE_COLUMN_MAP: Record<string, string> = Object.entries(COLUMN_MAP).reduce(
  (acc, [camel, snake]) => {
    acc[snake] = camel;
    return acc;
  },
  {} as Record<string, string>
);

// Convert camelCase identifiers to snake_case in SQL
function sqlToSnakeCase(sql: string): string {
  let result = sql;
  // Replace known camelCase column names with their snake_case equivalents
  // Sort by length descending to handle longer names first
  const sortedKeys = Object.keys(COLUMN_MAP).sort((a, b) => b.length - a.length);
  for (const camel of sortedKeys) {
    const snake = COLUMN_MAP[camel];
    // Match word boundaries: preceded by space, comma, =, (, etc., and not inside quotes
    const patterns = [
      new RegExp(`\\b${camel}\\b`, 'g'),
      new RegExp(`"${camel}"`, 'g')
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, snake);
    }
  }
  return result;
}

// Convert result rows from snake_case back to camelCase
function snakeToCamelCase(row: any): any {
  if (!row || typeof row !== 'object') return row;

  const converted: any = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = REVERSE_COLUMN_MAP[key] || key;
    converted[camelKey] = value;
  }
  return converted;
}

// Connect to Postgres
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required for Supabase Postgres connection');
}

const sql = postgres(databaseUrl, {
  prepare: false  // Required for pgbouncer transaction pooler mode
});

// Wrapper to convert ? placeholders to $1, $2, etc.
function convertPlaceholders(sqlString: string, params: any[]): [string, any[]] {
  let paramIndex = 1;
  let converted = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sqlString.length; i++) {
    const char = sqlString[i];
    const prevChar = i > 0 ? sqlString[i - 1] : '';

    // Track if we're inside a string
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    // Replace ? with $N only if not in a string
    if (char === '?' && !inString) {
      converted += `$${paramIndex}`;
      paramIndex++;
    } else {
      converted += char;
    }
  }

  return [converted, params];
}

// Database wrapper with .prepare() API
const db = {
  prepare: (sqlString: string) => {
    return {
      get: async (...params: any[]) => {
        const [convertedSql, convertedParams] = convertPlaceholders(
          sqlToSnakeCase(sqlString),
          params
        );
        const results = await sql.unsafe(convertedSql, convertedParams);
        return results.length > 0 ? snakeToCamelCase(results[0]) : undefined;
      },
      all: async (...params: any[]) => {
        const [convertedSql, convertedParams] = convertPlaceholders(
          sqlToSnakeCase(sqlString),
          params
        );
        const results = await sql.unsafe(convertedSql, convertedParams);
        return results.map(snakeToCamelCase);
      },
      run: async (...params: any[]) => {
        const [convertedSql, convertedParams] = convertPlaceholders(
          sqlToSnakeCase(sqlString),
          params
        );
        // For INSERT/UPDATE/DELETE, we don't care about return value
        // but we need to check for errors
        try {
          await sql.unsafe(convertedSql, convertedParams);
          return { changes: 1, lastInsertRowid: null };
        } catch (err) {
          throw err;
        }
      }
    };
  },
  transaction: (fn: () => void) => {
    // Return a wrapper that will be called later
    // In Postgres with pgbouncer, we can't use true transactions in simple way
    // So we'll just return a function that executes the callback synchronously
    return async () => {
      try {
        fn();
      } catch (err) {
        throw err;
      }
    };
  }
};

// Initialize database schema and seed data
async function initDb() {
  // Create tables
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT,
      target_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'ARS',
      cover_image TEXT NOT NULL,
      video_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      is_featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      stretch_goals TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      min_amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      supporter_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      message TEXT,
      creator_response TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      campaign_id TEXT
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      category TEXT NOT NULL,
      cover_image TEXT NOT NULL,
      delivery_type TEXT NOT NULL,
      file_url TEXT,
      external_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      cover_image TEXT,
      category TEXT,
      tags TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      billing_period TEXT NOT NULL,
      description TEXT NOT NULL,
      benefits TEXT NOT NULL,
      is_highlighted INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT now()::text
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS discount_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      supporter_name TEXT NOT NULL,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS processed_payments (
      payment_id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      campaign_id TEXT,
      supporter_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      external_reference TEXT,
      processed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create indexes
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_messages_approved_created
    ON messages(is_approved, created_at DESC)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_messages_campaign
    ON messages(campaign_id)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_campaigns_status_sort
    ON campaigns(status, sort_order)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_products_active_sort
    ON products(active, sort_order)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_memberships_active_sort
    ON memberships(active, sort_order)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_ideas_active_sort
    ON ideas(active, sort_order)
  `);

  // Check if we need to seed data
  const countCampaigns = await db.prepare('SELECT COUNT(*) as count FROM campaigns').all();

  if (countCampaigns.length === 0 || (countCampaigns[0] as any).count === 0) {
    const now = new Date().toISOString();

    // Seed campaigns
    await db.prepare(`
      INSERT INTO campaigns (id, title, slug, shortDescription, targetAmount, currentAmount, currency, coverImage, videoUrl, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c1', 'Misión Japón 🇯🇵', 'mision-japon', 'Bancá este delirio para que pueda documentar el lado B de Tokyo. ¡Prometo vlogs épicos y mucho ramen!', 1500000, 450000, 'ARS', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'active', 1, 1, JSON.stringify([{ amount: 2000000, description: 'Hago un directo de 12 horas desde Akihabara' }, { amount: 3000000, description: 'Sorteo una caja de snacks japoneses entre los aportantes' }]), now, now);

    await db.prepare(`
      INSERT INTO campaigns (id, title, slug, shortDescription, targetAmount, currentAmount, currency, coverImage, videoUrl, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c2', 'Fondo para la nueva cámara 📸', 'nueva-camara', 'La vieja ya no da más. Necesito un upgrade para que los videos no parezcan grabados con una tostadora.', 800000, 120000, 'ARS', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop', null, 'active', 0, 2, null, now, now);

    await db.prepare(`
      INSERT INTO campaigns (id, title, slug, shortDescription, targetAmount, currentAmount, currency, coverImage, videoUrl, status, isFeatured, sortOrder, stretchGoals, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('c3', 'Cafecito de supervivencia ☕', 'cafecito', 'Aporte libre para bancar el contenido del día a día. Todo suma para seguir creando.', 0, 55000, 'ARS', 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop', null, 'active', 0, 3, null, now, now);

    // Seed rewards
    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r1', 'Pack de Stickers Digitales', 'Stickers exclusivos para WhatsApp y Telegram con mis mejores frases.', 1000, 'digital', 'Sticker');

    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r2', 'Te dedico un meme', 'Hago un meme personalizado con tu nombre y lo subo a mis historias de Instagram.', 3000, 'digital', 'Image');

    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r3', 'Chat privado (15 min)', 'Hacemos una videollamada de 15 minutos para charlar de la vida, viajes o lo que quieras.', 10000, 'digital', 'Video');

    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r4', 'Mejores Amigos en IG', 'Te agrego a mi lista de Mejores Amigos en Instagram por 1 mes para contenido exclusivo.', 25000, 'badge', 'Award');

    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r5', 'Desarrollo de Webapp Custom', 'Me encargo de desarrollar tu landing page o webapp sencilla. Incluye diseño brutalista y código fuente.', 150000, 'service', 'Code');

    await db.prepare(`
      INSERT INTO rewards (id, title, description, minAmount, type, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('r6', 'Edición IA Custom', 'Edito 5 fotos o 1 video corto usando IA para tu marca o proyecto personal.', 50000, 'service', 'ImageIcon');

    // Seed messages
    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, creatorResponse, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s1', 'Juan Pérez', 5000, 'Para el sushi en Tokyo pa! Rompela.', '¡Gracias Juan! Prometo subir foto del sushi 🍣', 0, 1, new Date(Date.now() - 7200000).toISOString(), 'c1');

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, creatorResponse, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s2', 'Ana G.', 1500, 'Bancando fuerte el contenido siempre.', null, 0, 1, new Date(Date.now() - 18000000).toISOString(), null);

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, creatorResponse, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s3', 'Matias', 10000, 'Que se venga esa cámara nueva 🚀', '¡Sos un crack Mati! Ya falta menos.', 0, 1, new Date(Date.now() - 86400000).toISOString(), 'c2');

    await db.prepare(`
      INSERT INTO messages (id, supporterName, amount, message, creatorResponse, isAnonymous, isApproved, createdAt, campaignId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s4', 'Sofi', 1000, 'Invitame un cafecito virtual', null, 0, 1, new Date(Date.now() - 86400000).toISOString(), 'c3');

    // Seed settings
    const initialSettings = {
      creatorName: 'Santi Balosky',
      creatorBio: 'Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.',
      creatorAvatar: '/images/santi-avatar.jpeg',
      heroTitle: 'Santi Balosky',
      heroSubtitle: 'Creador de contenido, viajero y catador profesional de alfajores. Bancá este delirio para que siga creando.',
      primaryCTA: 'Invitame un cafecito',
      secondaryCTA: 'Ver recompensas',
      socialLinks: {
        instagram: 'https://instagram.com/santiagobalosky',
        spotify: 'https://open.spotify.com/artist/balosky',
        applemusic: 'https://music.apple.com/artist/balosky',
        youtube: 'https://youtube.com/@santiagobalosky'
      },
      darkModeDefault: false,
      visibleSections: ['hero', 'campaigns', 'rewards', 'wall'],
      supportAmountsSuggested: [1000, 3000, 5000, 10000],
      legalText: 'Pago seguro con Mercado Pago.',
      content: DEFAULT_PUBLIC_CONTENT
    };

    await db.prepare('INSERT INTO settings (id, data) VALUES (?, ?)').run('global', JSON.stringify(initialSettings));

    // Seed products
    await db.prepare(`
      INSERT INTO products (id, title, description, price, category, coverImage, deliveryType, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('p1', 'Guía de Viaje: Tokyo Low Cost', 'Un PDF de 50 páginas con todos mis secretos para viajar a Japón sin fundirte.', 5000, 'ebook', 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=800&auto=format&fit=crop', 'file', 1, 1, 1, now);

    await db.prepare(`
      INSERT INTO products (id, title, description, price, category, coverImage, deliveryType, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('p2', 'Presets de Lightroom', 'Los 5 presets que uso para editar todas mis fotos de Instagram.', 3000, 'digital', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop', 'file', 1, 0, 2, now);

    // Seed memberships
    await db.prepare(`
      INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('m1', 'Bancador Oficial', 2000, 'monthly', 'Acceso a contenido exclusivo y mi gratitud eterna.', JSON.stringify(['Vlogs detrás de escena', 'Mención en videos', 'Grupo de Telegram']), 0, 1, 1, now);

    await db.prepare(`
      INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('m2', 'Productor Ejecutivo', 5000, 'monthly', 'Para los que quieren ser parte activa del canal.', JSON.stringify(['Todo lo anterior', 'Votación de próximos destinos', 'Videollamada mensual grupal']), 1, 1, 2, now);

    // Seed ideas
    await db.prepare(`
      INSERT INTO ideas (id, title, description, url, coverImage, category, tags, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('i1', 'Simulador de Fases Lunares', 'Una webapp que hice cuando hubo eclipse. Elegís una fecha y te muestra la fase de la luna con animación.', 'https://simulador-de-fases-lunares-ebl3vrvoa-baloskys-projects.vercel.app/', 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?q=80&w=800&auto=format&fit=crop', 'Webapp', JSON.stringify(['astronomía', 'experimento', 'vercel']), 1, 1, 1, now);

    // Seed discount codes
    await db.prepare('INSERT INTO discount_codes (id, code, discountPercent, active, createdAt) VALUES (?, ?, ?, ?, ?)').run('d1', 'VERANO20', 20, 1, now);

    // Seed purchases
    await db.prepare('INSERT INTO purchases (id, supporterName, type, itemId, title, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run('pur1', 'Santi Balosky', 'product', 'p1', 'Guía de Viaje: Tokyo Low Cost', now);
  }

  // Idempotent seed for ideas
  const countIdeas = await db.prepare('SELECT COUNT(*) as count FROM ideas').all();
  if (countIdeas.length === 0 || (countIdeas[0] as any).count === 0) {
    const nowIdeas = new Date().toISOString();
    await db.prepare(`
      INSERT INTO ideas (id, title, description, url, coverImage, category, tags, active, featured, sortOrder, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'i1',
      'Simulador de Fases Lunares',
      'Una webapp que hice cuando hubo eclipse. Elegís una fecha y te muestra la fase de la luna con animación.',
      'https://simulador-de-fases-lunares-ebl3vrvoa-baloskys-projects.vercel.app/',
      'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?q=80&w=800&auto=format&fit=crop',
      'Webapp',
      JSON.stringify(['astronomía', 'experimento', 'vercel']),
      1,
      1,
      1,
      nowIdeas
    );
  }

  // Handle user migrations
  const users = await db.prepare('SELECT id, username, password, password_hash FROM users').all();
  for (const user of users) {
    if (!user.passwordHash && user.password) {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(user.password), user.id);
    }
  }

  // Clean up insecure default admin
  const defaultUser = await db.prepare('SELECT id, username, password, password_hash FROM users WHERE username = ?').get('admin');
  if (defaultUser && (defaultUser.password === 'admin123' || verifyPassword('admin123', defaultUser.passwordHash))) {
    await db.prepare('DELETE FROM users WHERE id = ?').run(defaultUser.id);
    console.warn('[auth] Se eliminó el admin por defecto inseguro. Creá un nuevo acceso desde /admin/login usando el bootstrap inicial.');
  }

  // Ensure at least one admin user exists
  const adminUsersCount = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").all();
  if (adminUsersCount.length === 0 || (adminUsersCount[0] as any).count === 0) {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO users (id, username, password, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('admin_default', 'admin', 'admin', hashPassword('admin'), 'admin', now);
    console.warn('[auth] Se creó un admin local por defecto: admin / admin');
  }
}

// Helper functions
export const hasAdminUsers = async () => {
  const result = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").all();
  return result.length > 0 && (result[0] as any).count > 0;
};

export const createAdminUser = async (username: string, password: string) => {
  const now = new Date().toISOString();
  const id = `admin_${Date.now()}`;
  const passwordHash = hashPassword(password);

  await db.prepare(
    'INSERT INTO users (id, username, password, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, password, passwordHash, 'admin', now);

  return { id, username, role: 'admin', createdAt: now };
};

export const updateAdminUserCredentials = async (userId: string, username: string, password: string) => {
  const passwordHash = hashPassword(password);

  await db.prepare(
    'UPDATE users SET username = ?, password = ?, password_hash = ? WHERE id = ?'
  ).run(username, password, passwordHash, userId);
};

// Initialize on module load
await initDb();

export default db;
