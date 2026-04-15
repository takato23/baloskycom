import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './src/server/routes/api.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

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
