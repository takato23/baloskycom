import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './src/server/routes/api.js';
import db from './src/server/db.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);
const configuredAppUrl = process.env.APP_URL?.trim();
const allowedOrigins = new Set<string>();

if (configuredAppUrl) {
  try {
    allowedOrigins.add(new URL(configuredAppUrl).origin);
  } catch (error) {
    console.warn('[server] Invalid APP_URL, skipping CORS allowlist entry:', error);
  }
}

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
};

app.set('trust proxy', isProduction ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

// ────────────────────────────────────────────────────────────────────────────
// Balosky public home: serve the original static Delirio landing at `/`.
// The React home experiments remain available from SPA routes such as
// `/home-preview`, but the public index starts from the live balosky.com base.
// These routes must be registered before the Vite middleware so the raw HTML
// wins over the SPA shell in development.
// ────────────────────────────────────────────────────────────────────────────
const PUBLIC_DIR_DEV = path.join(process.cwd(), 'public');
const PUBLIC_DIR_PROD = path.join(process.cwd(), 'dist');
const publicDir = process.env.NODE_ENV === 'production' ? PUBLIC_DIR_PROD : PUBLIC_DIR_DEV;
const delirioHtmlPath = path.join(publicDir, 'delirio.html');

const serveDelirio = (_req: express.Request, res: express.Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(delirioHtmlPath, (err) => {
    if (err) {
      console.error('[delirio] sendFile error:', err);
      if (!res.headersSent) res.status(500).send('Delirio HTML not found');
    }
  });
};

if (!isVercel) {
  app.get('/', serveDelirio);
  app.get('/delirio', serveDelirio);
  app.get('/balosflix', (_req, res) => res.redirect(308, '/btv'));
}

// Post-checkout pages (served as static HTML in dev via express.static; in prod
// we need explicit routes because app.get('*') falls through to dist/index.html).
const servePage = (file: string) => (_req: express.Request, res: express.Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, file), (err) => {
    if (err) {
      console.error(`[${file}] sendFile error:`, err);
      if (!res.headersSent) res.status(500).send(`${file} not found`);
    }
  });
};
if (!isVercel) {
  app.get('/pago-exitoso', servePage('pago-exitoso.html'));
  app.get('/pago-pendiente', servePage('pago-pendiente.html'));
  app.get('/pago-fallido', servePage('pago-fallido.html'));
  app.get('/club', servePage('club.html'));
  app.get('/privacidad', servePage('privacidad.html'));
  app.get('/terminos', servePage('terminos.html'));
}

const isPotentialPaidAssetPath = (pathname: string) =>
  pathname.startsWith('/uploads/') || pathname.startsWith('/audio/') || pathname.startsWith('/videos/');

const shouldBlockDirectAsset = async (pathname: string) => {
  if (!isPotentialPaidAssetPath(pathname)) return false;

  const protectedMedia: any = await db.prepare(`
    SELECT id, isLocked, isMemberOnly, publicFrom
    FROM media
    WHERE mediaUrl = ?
    LIMIT 1
  `).get(pathname);

  if (protectedMedia) {
    const publicFromMs = protectedMedia.publicFrom ? new Date(protectedMedia.publicFrom).getTime() : null;
    const earlyOnly = publicFromMs !== null && publicFromMs > Date.now();
    if (protectedMedia.isLocked || protectedMedia.isMemberOnly || earlyOnly) return true;
  }

  const paidProduct: any = await db.prepare(`
    SELECT id
    FROM products
    WHERE fileUrl = ? AND active = 1
    LIMIT 1
  `).get(pathname);

  return Boolean(paidProduct);
};

const protectedAssetGuard: express.RequestHandler = async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  try {
    const pathname = decodeURIComponent(req.path);
    if (await shouldBlockDirectAsset(pathname)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(403).json({
        error: 'protected_asset',
        detail: 'Usá el link de descarga firmado.'
      });
    }
  } catch (error) {
    console.error('[protected-assets] guard error:', error);
    return res.status(500).json({ error: 'asset_guard_error' });
  }

  return next();
};

app.use(protectedAssetGuard);

// Expose the wire-up script and other /public files directly in dev.
// (In production, Vite copies /public into /dist, so the dist static handler
// below already serves them.)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(PUBLIC_DIR_DEV, { index: false }));
}

// Vite middleware for development (conditional setup below)
let viteLocked = false;

async function setupVite() {
  if (viteLocked || process.env.NODE_ENV === 'production') return;
  viteLocked = true;

  const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

// Any path under /uploads/, /audio/, /videos/ or that ends in a media-ish
// extension must NOT fall through to the SPA. If it didn't match the static
// handler above (file missing, wrong case, whatever), return a proper 404
// instead of serving index.html — otherwise the React router renders
// NotFound on routes that were supposed to be direct file fetches, and the
// user sees "Tal vez moví la página..." when clicking a broken MP3.
const DIRECT_FILE_RX = /\.(mp3|wav|m4a|ogg|flac|mp4|mov|webm|jpg|jpeg|png|gif|webp|svg|avif|pdf|zip)$/i;
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/audio/') ||
    req.path.startsWith('/videos/') ||
    DIRECT_FILE_RX.test(req.path)
  ) {
    return res.status(404).json({ error: 'file_not_found', path: req.path });
  }
  return next();
});

// For production, serve static files
if (process.env.NODE_ENV === 'production' && !isVercel) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Initialize Vite for development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  setupVite().catch(err => console.error('Vite setup error:', err));
}

// For local development
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
