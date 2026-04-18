import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import apiRouter from './src/server/routes/api.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

// ────────────────────────────────────────────────────────────────────────────
// Balosky public home must stay on the static Delirio landing at `/`.
// Keep `/delirio` mapped to the same file for explicit QA access.
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

app.get('/', serveDelirio);
app.get('/delirio', serveDelirio);

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
