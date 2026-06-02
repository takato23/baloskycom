/*
 * Balosky — Service Worker (PWA básico).
 *
 * Estrategia:
 *  · App shell (/index.html, /favicon) → cache local liviano. La home `/`
 *    queda siempre network-first para no dejar una portada vieja en celulares.
 *  · Uploads / media (/uploads/**, /models/**, /audio/**) → stale-while-
 *    revalidate, así la segunda visita carga desde cache y mientras
 *    tanto actualiza en background si hay wifi.
 *  · API (/api/**) → network-first con fallback a cache. Nunca servimos
 *    data stale si hay red; si no hay, aunque sea mostramos lo último
 *    que vimos en vez de un spinner eterno.
 *  · Todo lo demás → network-first con fallback a index.html para que
 *    rutas de React Router que caigan sin red todavía muestren el shell.
 *
 * El audio de SonidoSection (via <audio> en SunoModal) sigue sonando
 * con la app minimizada por comportamiento nativo del browser. Este SW
 * no interfiere — solo acelera la recarga.
 */

const VERSION = 'balosky-v4-cafecito-fast-entry-20260507';
const SHELL = 'shell-' + VERSION;
const MEDIA = 'media-' + VERSION;
const API = 'api-' + VERSION;

const SHELL_URLS = [
  '/index.html',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

function isMedia(url) {
  return (
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/models/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/images/')
  );
}

function isApi(url) {
  return url.pathname.startsWith('/api/');
}

function isAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.wasm')
  );
}

function isHtmlResponse(res) {
  return (res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Sólo mismo origen — no queremos cachear YouTube/Spotify/CDNs externos.
  if (url.origin !== self.location.origin) return;

  if (isApi(url)) {
    event.respondWith(networkFirst(req, API));
    return;
  }
  if (isMedia(url)) {
    event.respondWith(staleWhileRevalidate(req, MEDIA));
    return;
  }
  if (isAsset(url)) {
    event.respondWith(networkOnlyAsset(req, SHELL));
    return;
  }
  // Shell / HTML / JS / CSS
  event.respondWith(networkFirstWithShellFallback(req, SHELL));
});

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstWithShellFallback(req, cacheName) {
  const url = new URL(req.url);
  const isDocument = req.mode === 'navigate' || req.destination === 'document' || url.pathname === '/';
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) {
      if (!isDocument) {
        const cache = await caches.open(cacheName);
        cache.put(req, res.clone());
      }
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (!isDocument) {
      return new Response('offline', { status: 503 });
    }
    // Router fallback: si el user navega a /laboratorio sin red, devolvemos
    // el index.html cacheado y React Router resuelve la ruta client-side.
    const shell = await caches.match('/index.html');
    if (shell) return shell;
    return new Response('offline', { status: 503 });
  }
}

async function networkOnlyAsset(req, cacheName) {
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (!res || !res.ok || isHtmlResponse(res)) {
      return new Response('asset not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const cache = await caches.open(cacheName);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached && !isHtmlResponse(cached)) return cached;
    return new Response('asset offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
