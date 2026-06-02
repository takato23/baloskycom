import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Delirio design system — loaded after index.css so its tokens (5 themes,
// explosive palette, keyframes, chrome classes) override the legacy Artefakt
// ones. Phase 1 of the Delirio-to-React migration.
import './styles/delirio.css';
// Redesign — liquid-glass tokens scoped under `.rdz-scope`. Carga última así
// ningún selector anterior la pisa, pero como todo vive bajo `.rdz-*` no
// contamina las secciones Artefakt/Delirio existentes.
import './styles/redesign.css';

const STALE_ASSET_RELOAD_KEY = 'balosky:stale-asset-reload-at';
const STALE_ASSET_RELOAD_WINDOW_MS = 20_000;

function reloadOnceForFreshAssets() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(STALE_ASSET_RELOAD_KEY) || 0);
    const recentlyReloaded =
      Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < STALE_ASSET_RELOAD_WINDOW_MS;
    if (recentlyReloaded) return;
    sessionStorage.setItem(STALE_ASSET_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage can fail in private contexts; reloading once is still useful.
  }

  window.location.reload();
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnceForFreshAssets();
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String((event.reason as Error | undefined)?.message || event.reason || '');
  if (
    /dynamically imported module|importing a module script|Failed to fetch|module script/i.test(message)
  ) {
    event.preventDefault();
    reloadOnceForFreshAssets();
  }
});

window.addEventListener('load', () => {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(STALE_ASSET_RELOAD_KEY);
    } catch {
      // No-op: only a loop guard.
    }
  }, STALE_ASSET_RELOAD_WINDOW_MS);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* PWA — registramos el Service Worker sólo en producción. En dev queda
 * fuera para no cachear HMR chunks (causa refresh loops). El SW usa
 * network-first para el shell + API y stale-while-revalidate para
 * /uploads, /models, /audio, /images. Con el manifest.webmanifest ya
 * linkeado en index.html, el browser ofrece "Add to Home Screen". */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] register failed', err));
  });
}
