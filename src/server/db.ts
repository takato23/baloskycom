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
  wallpaperId: 'wallpaper_id',
  paymentId: 'payment_id',
  messageId: 'message_id',
  externalReference: 'external_reference',
  processedAt: 'processed_at',
  userAgent: 'user_agent',
  mediaUrl: 'media_url',
  thumbUrl: 'thumb_url',
  embedUrl: 'embed_url',
  playCount: 'play_count',
  aiTool: 'ai_tool',
  aiPrompt: 'ai_prompt',
  isLocked: 'is_locked',
  colorFrom: 'color_from',
  colorTo: 'color_to',
  preferenceId: 'preference_id',
  downloadToken: 'download_token',
  downloadExpiresAt: 'download_expires_at',
  emailSentAt: 'email_sent_at',
  paidAt: 'paid_at',
  memberId: 'member_id',
  membershipId: 'membership_id',
  mpPreapprovalId: 'mp_preapproval_id',
  nextPaymentAt: 'next_payment_at',
  authorizedAt: 'authorized_at',
  cancelledAt: 'cancelled_at',
  lastLoginAt: 'last_login_at',
  isMemberOnly: 'is_member_only',
  aspectRatio: 'aspect_ratio',
  showDescription: 'show_description',
  showPrompt: 'show_prompt',
  showTool: 'show_tool',
  publicFrom: 'public_from'
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

  /* Extensión idempotente de purchases para el flujo checkout + delivery.
     No rompe filas existentes (seed). Se corre en cada boot. */
  await sql.unsafe(`
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount INTEGER;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_id TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS preference_id TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS external_reference TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS download_token TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS download_expires_at TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS email_sent_at TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid_at TEXT;
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TEXT;
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_purchases_ext_ref ON purchases(external_reference);
    CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
    CREATE INDEX IF NOT EXISTS idx_purchases_status_created ON purchases(status, created_at DESC);
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

  // Unified media table for video_ia, foto, wallpaper, cancion
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      media_url TEXT,
      thumb_url TEXT,
      embed_url TEXT,
      cover_image TEXT,
      duration TEXT,
      is_locked INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  // Migration: add embed_url to existing media tables that were created before
  // this column existed. `ADD COLUMN IF NOT EXISTS` is Postgres 9.6+.
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS thumb_url TEXT
  `);
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS embed_url TEXT
  `);
  // Migration: add play_count for SUNO catalog "más escuchados" ordering.
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS play_count INTEGER NOT NULL DEFAULT 0
  `);
  // Migration: AI metadata for video_ia (Laboratorio IA page).
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS ai_tool TEXT
  `);
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS ai_prompt TEXT
  `);

  // Social links
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS socials (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      color_from TEXT,
      color_to TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Newsletter subscribers
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      source TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS wallpaper_leads (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      wallpaper_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_agent TEXT,
      ip TEXT
    )
  `);

  /* ==== CLUB / MEMBRESÍAS RECURRENTES =====================================
   * members: persona con acceso al club. Se crea al aprobarse un preapproval.
   * subscriptions: mapea membership ↔ MP preapproval. Una row por intento.
   * Status aceptados (espejo de MP):
   *   pending | authorized | paused | cancelled
   * -------------------------------------------------------------------- */
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      member_id TEXT,
      email TEXT NOT NULL,
      membership_id TEXT NOT NULL,
      mp_preapproval_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      amount INTEGER NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      next_payment_at TEXT,
      authorized_at TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status
    ON subscriptions(status)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_email
    ON subscriptions(email)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_member
    ON subscriptions(member_id)
  `);

  /* Flag que marca contenido sólo visible al miembro activo.
   * Se filtra en cualquier GET público de /api/media. */
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS is_member_only INTEGER NOT NULL DEFAULT 0
  `);

  /* Aspecto del video para la grilla inteligente.
   * Valores esperados: '9:16' | '16:9' | '1:1'. Nullable: default 9:16 para
   * video_ia cuando no se especifica. */
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS aspect_ratio TEXT
  `);

  /* Flags per-item para que el admin elija qué mostrar públicamente.
   * Default 1 (todo visible) para no romper items existentes. */
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS show_description INTEGER NOT NULL DEFAULT 1
  `);
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS show_prompt INTEGER NOT NULL DEFAULT 1
  `);
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS show_tool INTEGER NOT NULL DEFAULT 1
  `);

  /* Early drops: fecha a partir de la cual este item pasa a ser público.
   * NULL = no hay ventana early (se comporta como siempre: público si no
   * is_member_only, privado si sí). Fecha futura = sólo Baloskiers hasta
   * esa fecha, después público. Pasada la fecha se comporta como null. */
  await sql.unsafe(`
    ALTER TABLE media ADD COLUMN IF NOT EXISTS public_from TIMESTAMPTZ
  `);

  /* Cleanup: el HP argento se sembró con un id mientras no existía el .mp4,
   * lo que causaba una card rota al lado del molinete. Si seguís teniendo el
   * archivo, lo podés volver a crear desde /admin/media con ese mismo id. */
  await sql.unsafe(`DELETE FROM media WHERE id = 'med_vi_hp_argento'`).catch(() => {});

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
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_media_kind_active_sort
    ON media(kind, active, sort_order)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_socials_active_sort
    ON socials(active, sort_order)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_wallpaper_leads_email
    ON wallpaper_leads(email)
  `);
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_wallpaper_leads_wallpaper
    ON wallpaper_leads(wallpaper_id, created_at DESC)
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

  // Idempotent seed for the 3 Club tiers (base / orbita / cerrada).
  // Estos ids son los que ClubSection.tsx pasa al endpoint
  // POST /api/subscriptions/create. Se inserta solo si no existen, así
  // no piso planes que el admin haya creado o renombrado vía UI.
  const clubTiers: Array<[string, string, number, string, string[], number, number]> = [
    [
      'base',
      'Base',
      3000,
      'Demos, voice-notes mensuales y muro privado.',
      ['Demos + voice-notes mensuales', 'Muro privado de miembros', '10% off en encargos', 'Nombre en créditos web'],
      0,
      1,
    ],
    [
      'orbita',
      'Órbita',
      9000,
      'Lo de Base + vivos privados, descuentos y entrevistas en proceso.',
      ['Todo lo de Base', 'Vivo privado mensual (Q&A)', '25% off + early a drops', 'Entrevistas en proceso', 'Early a merch limitado'],
      1,
      2,
    ],
    [
      'cerrada',
      'Órbita cerrada',
      25000,
      'Lo de Órbita + 1:1 trimestral y feedback personal.',
      ['Todo lo de Órbita', 'Zoom 1:1 trimestral', 'Feedback personal', 'Invitación prioritaria a lives', 'Merch físico trimestral'],
      0,
      3,
    ],
  ];
  const nowClub = new Date().toISOString();
  for (const [id, name, price, description, benefits, isHighlighted, sortOrder] of clubTiers) {
    const existing = await db
      .prepare('SELECT id FROM memberships WHERE id = ?')
      .get(id);
    if (!existing) {
      await db
        .prepare(
          `INSERT INTO memberships (id, name, price, billingPeriod, description, benefits, isHighlighted, active, sortOrder, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, name, price, 'monthly', description, JSON.stringify(benefits), isHighlighted, 1, sortOrder, nowClub);
    }
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

  // ===================================================================
  // SEEDS DESHABILITADOS (socials + media mockups)
  // Para volver a popular la DB con mocks (videos IA, fotos, wallpapers,
  // canciones, y redes sociales) cambiar SEED_MOCKS a true.
  // ===================================================================
  const SEED_MOCKS = false as boolean;
  if (SEED_MOCKS) {
    // Idempotent seed for socials (redes sociales reales)
    const countSocials = await db.prepare('SELECT COUNT(*) as count FROM socials').all();
    if (countSocials.length === 0 || (countSocials[0] as any).count === 0) {
      const nowSoc = new Date().toISOString();
      const socialsSeed: Array<[string, string, string, string, string, string, string, string, number]> = [
        ['soc_ig',  'instagram',   'Instagram',    '@santiagobalosky · 176K', 'https://instagram.com/santiagobalosky',     'IG', '#F02E65', '#FFB83D', 1],
        ['soc_igf', 'instagram',   'Foto Balosky', '@fotobalosky',            'https://instagram.com/fotobalosky',         '📷', '#7C3FFF', '#F02E65', 2],
        ['soc_tw',  'twitch',      'Twitch',       'balosky · streams',       'https://twitch.tv/balosky',                 'TV', '#9146FF', '#5c2bb5', 3],
        ['soc_yt',  'youtube',     'YouTube',      '@santiagobalosky',        'https://youtube.com/@santiagobalosky',      '▶',  '#FF0000', '#b50000', 4],
        ['soc_sp',  'spotify',     'Spotify',      'Balosky',                 'https://open.spotify.com/artist/balosky',   '♪',  '#1DB954', '#146c37', 5],
        ['soc_am',  'apple-music', 'Apple Music',  'Balosky',                 'https://music.apple.com/ar/artist/balosky', '◉',  '#FA586A', '#C5326D', 6],
        ['soc_tk',  'tiktok',      'TikTok',       '@santiagobalosky',        'https://tiktok.com/@santiagobalosky',       '♬',  '#FE2C55', '#25F4EE', 7],
        ['soc_ml',  'mail',        'Mail',         'hola@balosky.com',        'mailto:hola@balosky.com',                   '@',  '#FA5D29', '#F02E65', 8],
      ];
      for (const s of socialsSeed) {
        await db.prepare(`
          INSERT INTO socials (id, platform, name, handle, url, icon, colorFrom, colorTo, active, sortOrder, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], 1, s[8], nowSoc);
      }
    }

    // Idempotent seed for media (videos IA, fotos, wallpapers, canciones)
    const countMedia = await db.prepare('SELECT COUNT(*) as count FROM media').all();
    if (countMedia.length === 0 || (countMedia[0] as any).count === 0) {
      const nowMed = new Date().toISOString();
      // Shape: [id, kind, title, description, category, mediaUrl, coverImage, duration, isLocked, featured, sortOrder]
      const mediaSeed: Array<[string, string, string, string | null, string | null, string | null, string | null, string | null, number, number, number]> = [
        // VIDEOS IA
        ['med_vi_01', 'video_ia', 'Caballo blanco en la niebla', 'Generado con Gen-3 · prompt: "horse running in fog, cinematic, blue hour"', 'FILM · 2026', 'https://cdn.coverr.co/videos/coverr-a-running-horse-2864/1080p.mp4', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1400&auto=format&fit=crop', '0:24 · GEN-3', 0, 1, 1],
        ['med_vi_02', 'video_ia', 'Neón líquido', 'Loop · experimento de color saturado', 'VISUAL · LOOP', 'https://cdn.coverr.co/videos/coverr-neon-lights-5566/1080p.mp4', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop', '0:12', 0, 0, 2],
        ['med_vi_03', 'video_ia', 'Mar de plástico', 'Experimento LUT · waves generado', 'EXPERIMENTO · LUT', 'https://cdn.coverr.co/videos/coverr-waves-crashing-on-the-shore-0036/1080p.mp4', 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?q=80&w=1000&auto=format&fit=crop', '0:18', 0, 0, 3],
        ['med_vi_04', 'video_ia', 'Luces tarde', 'Clip nocturno de Buenos Aires', 'CLIP · BUENOS AIRES', 'https://cdn.coverr.co/videos/coverr-city-traffic-lights-0321/1080p.mp4', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1000&auto=format&fit=crop', '0:15', 0, 0, 4],
        ['med_vi_05', 'video_ia', 'Azul desde arriba', 'Drone cinematográfico oceánico', 'CINEMATIC · DRONE', 'https://cdn.coverr.co/videos/coverr-aerial-view-of-the-ocean-0568/1080p.mp4', 'https://images.unsplash.com/photo-1498855592-0a0c7a99b7e4?q=80&w=1000&auto=format&fit=crop', '0:20', 0, 0, 5],
        ['med_vi_06', 'video_ia', 'Lo que queda del bosque', 'Corto generado con IA · destacado 2026', 'CORTO · 2026', 'https://cdn.coverr.co/videos/coverr-walking-in-the-forest-5677/1080p.mp4', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1800&auto=format&fit=crop', '1:02 · DESTACADO', 0, 1, 6],
        // FOTOS @fotobalosky
        ['med_ft_01', 'foto', 'Buenos Aires 01', null, 'ba',      null, 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?q=80&w=900&auto=format&fit=crop', null, 0, 0, 1],
        ['med_ft_02', 'foto', 'Patagonia 01',    null, 'sur',     null, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=900&auto=format&fit=crop', null, 0, 0, 2],
        ['med_ft_03', 'foto', 'Noche 35mm',      null, 'noche',   null, 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=900&auto=format&fit=crop', null, 0, 0, 3],
        ['med_ft_04', 'foto', 'Retrato 01',      null, 'retrato', null, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=900&auto=format&fit=crop', null, 0, 0, 4],
        ['med_ft_05', 'foto', 'San Telmo',       null, 'ba',      null, 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=900&auto=format&fit=crop', null, 0, 0, 5],
        ['med_ft_06', 'foto', 'El Chaltén',      null, 'sur',     null, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=900&auto=format&fit=crop', null, 0, 0, 6],
        ['med_ft_07', 'foto', 'Neón',            null, 'noche',   null, 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?q=80&w=900&auto=format&fit=crop', null, 0, 0, 7],
        ['med_ft_08', 'foto', 'Retrato 35mm',    null, 'retrato', null, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=900&auto=format&fit=crop', null, 0, 0, 8],
        ['med_ft_09', 'foto', 'Palermo',         null, 'ba',      null, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=900&auto=format&fit=crop', null, 0, 0, 9],
        // WALLPAPERS
        ['med_wp_01', 'wallpaper', 'Neón porteño',        '4K · 2160×3840', null, 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=2160&auto=format&fit=crop', 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=800&auto=format&fit=crop', '4K · iPhone', 0, 0, 1],
        ['med_wp_02', 'wallpaper', 'Montaña al amanecer', '4K · 2160×3840', null, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2160&auto=format&fit=crop', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop', '4K · iPhone', 0, 0, 2],
        ['med_wp_03', 'wallpaper', 'Chaltén puro',        '4K · 2160×3840', null, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2160&auto=format&fit=crop', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop', '4K · iPhone', 0, 0, 3],
        ['med_wp_04', 'wallpaper', 'Pack completo',       '10 × 4K · iPhone + desktop', null, '/checkout/c3?amount=3500', 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?q=80&w=800&auto=format&fit=crop', null, 1, 0, 4],
        // CANCIONES SUNO
        ['med_cn_01', 'cancion', 'Protocolo nocturno', 'Techno · SUNO experimento', 'Electrónico', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3', null, '3:42', 0, 0, 1],
        ['med_cn_02', 'cancion', 'Ciudad líquida',     'Ambient · SUNO',            'Electrónico', 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3', null, '4:10', 0, 0, 2],
        ['med_cn_03', 'cancion', 'Loop 4AM',           'Deep House · SUNO',         'Electrónico', 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', null, '5:08', 0, 0, 3],
        ['med_cn_04', 'cancion', 'Carta sin mandar',   'Folk · acústico SUNO',      'Folk',        'https://cdn.pixabay.com/download/audio/2022/10/30/audio_347111d6ea.mp3', null, '2:58', 0, 0, 4],
        ['med_cn_05', 'cancion', 'Abuelo',             'Acústico',                  'Folk',        'https://cdn.pixabay.com/download/audio/2021/10/23/audio_1c7d07bfc3.mp3', null, '3:21', 0, 0, 5],
        ['med_cn_06', 'cancion', 'Ruta sur',           'Folk · carretera',          'Folk',        'https://cdn.pixabay.com/download/audio/2023/06/11/audio_2e07bd43e1.mp3', null, '4:02', 0, 0, 6],
        ['med_cn_07', 'cancion', 'Máquina en reposo',  'Ambient experimental',      'Experimental', 'https://cdn.pixabay.com/download/audio/2022/08/04/audio_d3c15d82b1.mp3', null, '5:50', 0, 0, 7],
        ['med_cn_08', 'cancion', 'Ruido dulce',        'Noise',                     'Experimental', 'https://cdn.pixabay.com/download/audio/2022/02/15/audio_dd64862e5f.mp3', null, '2:18', 0, 0, 8],
        ['med_cn_09', 'cancion', 'Nadie escucha (demo)', 'Rock · demo para SUNO',   'Rock',         'https://cdn.pixabay.com/download/audio/2023/05/15/audio_0efb58b9a1.mp3', null, '3:12', 0, 0, 9],
        ['med_cn_10', 'cancion', 'Órbita bis',         'Pop · versión SUNO',        'Rock',         'https://cdn.pixabay.com/download/audio/2023/03/28/audio_7c6b3a6147.mp3', null, '3:34', 0, 0, 10],
      ];
      for (const m of mediaSeed) {
        await db.prepare(`
          INSERT INTO media (id, kind, title, description, category, mediaUrl, coverImage, duration, isLocked, active, featured, sortOrder, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], 1, m[9], m[10], nowMed);
      }
    }

  }

  // Per-id idempotent seeds for Santi's real video_ia pieces. Lives OUTSIDE
  // the "empty campaigns" branch above so these videos land in production DBs
  // (which already have campaigns seeded) on every boot. Each entry is
  // inserted once (by id); renaming or deleting from /admin keeps it gone.
  const realVideos: Array<{
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    mediaUrl: string;
    coverImage: string | null;
    duration: string | null;
    aiTool: string | null;
    aiPrompt: string | null;
    featured: 0 | 1;
    sortOrder: number;
  }> = [
    {
      // Subido a /public/uploads/videos/. Cubre la subcategoría "ideas con AI".
      id: 'med_vi_molinete_conurbano',
      title: 'El molinete del conurbano',
      description: 'La épica del molinete del tren en hora pico, contada como western generado con IA.',
      category: 'IDEAS · IA',
      mediaUrl: '/uploads/videos/balosky-molinete-conurbano.mp4',
      coverImage: null,
      duration: null,
      aiTool: 'Veo 3',
      aiPrompt: 'Argentine subway turnstile rush hour, cinematic western tone, dust and chaos, 9:16',
      featured: 1,
      sortOrder: 1,
    },
  ];
  const nowVid = new Date().toISOString();
  for (const v of realVideos) {
    const existing = await db.prepare('SELECT id FROM media WHERE id = ?').get(v.id);
    if (!existing) {
      await db.prepare(`
        INSERT INTO media (id, kind, title, description, category, mediaUrl, coverImage, duration, aiTool, aiPrompt, isLocked, active, featured, sortOrder, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        v.id, 'video_ia', v.title, v.description, v.category,
        v.mediaUrl, v.coverImage, v.duration,
        v.aiTool, v.aiPrompt,
        0, 1, v.featured, v.sortOrder, nowVid,
      );
    }
  }

  // Ensure Santi's real artist socials exist. Idempotent: checks by id, so
  // if you rename/remove one from /admin it won't come back. Only the first
  // run (or explicit re-enable with a new id) inserts.
  const artistSocials: Array<{
    id: string; platform: string; name: string; handle: string; url: string;
    icon: string; colorFrom: string; colorTo: string; sortOrder: number;
  }> = [
    {
      id: 'soc_artist_sp', platform: 'spotify', name: 'Spotify',
      handle: 'Balosky', url: 'https://open.spotify.com/artist/78X93Q2GliSAizEATBNJUp',
      icon: '♪', colorFrom: '#1DB954', colorTo: '#146c37', sortOrder: 10,
    },
    {
      id: 'soc_artist_am', platform: 'apple-music', name: 'Apple Music',
      handle: 'Balosky', url: 'https://music.apple.com/ar/artist/balosky/1842867947',
      icon: '◉', colorFrom: '#FA586A', colorTo: '#C5326D', sortOrder: 11,
    },
    {
      id: 'soc_artist_yt', platform: 'youtube', name: 'YouTube',
      handle: '@Santiagobalosky', url: 'https://www.youtube.com/@Santiagobalosky',
      icon: '▶', colorFrom: '#FF0000', colorTo: '#b50000', sortOrder: 12,
    },
  ];
  const nowSoc = new Date().toISOString();
  for (const s of artistSocials) {
    const existing = await db.prepare('SELECT id FROM socials WHERE id = ?').get(s.id);
    if (!existing) {
      await db.prepare(`
        INSERT INTO socials (id, platform, name, handle, url, icon, colorFrom, colorTo, active, sortOrder, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(s.id, s.platform, s.name, s.handle, s.url, s.icon, s.colorFrom, s.colorTo, 1, s.sortOrder, nowSoc);
    }
  }

  // Handle user migrations
  const users = await db.prepare('SELECT id, username, password, password_hash FROM users').all();
  for (const user of users) {
    if (!user.passwordHash && user.password) {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(user.password), user.id);
    }
    if (user.password) {
      await db.prepare('UPDATE users SET password = NULL WHERE id = ?').run(user.id);
    }
  }

  // Clean up insecure default admin
  const defaultUser = await db.prepare('SELECT id, username, password, password_hash FROM users WHERE username = ?').get('admin');
  if (defaultUser && (
    defaultUser.password === 'admin123' ||
    defaultUser.password === 'admin' ||
    verifyPassword('admin123', defaultUser.passwordHash) ||
    verifyPassword('admin', defaultUser.passwordHash)
  )) {
    await db.prepare('DELETE FROM users WHERE id = ?').run(defaultUser.id);
    console.warn('[auth] Se eliminó el admin por defecto inseguro. Creá un nuevo acceso desde /admin/login usando el bootstrap inicial.');
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
  ).run(id, username, null, passwordHash, 'admin', now);

  return { id, username, role: 'admin', createdAt: now };
};

export const updateAdminUserCredentials = async (userId: string, username: string, password: string) => {
  const passwordHash = hashPassword(password);

  await db.prepare(
    'UPDATE users SET username = ?, password = ?, password_hash = ? WHERE id = ?'
  ).run(username, null, passwordHash, userId);
};

// Initialize on module load
await initDb();

export default db;
