import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './src/server/routes/api.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
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
// Balosky public home is now served by the React SPA (HomePreview at `/`).
// The legacy static landing remains available at `/delirio` as a backup —
// flip the index back to `serveDelirio` here (and the `/` route in App.tsx)
// if we ever need to revert.
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

app.get('/delirio', serveDelirio);

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
app.get('/pago-exitoso', servePage('pago-exitoso.html'));
app.get('/pago-pendiente', servePage('pago-pendiente.html'));
app.get('/pago-fallido', servePage('pago-fallido.html'));
app.get('/club', servePage('club.html'));

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

// For production, serve static files
if (process.env.NODE_ENV === 'production') {
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
