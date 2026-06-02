type AnalyticsEventName =
  | 'page_view'
  | 'cta_click'
  | 'checkout_start'
  | 'checkout_created'
  | 'social_click'
  | 'media_open'
  | 'encargo_start'
  | 'encargo_created';

type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

const PLAUSIBLE_SRC = 'https://plausible.io/js/script.manual.tagged-events.outbound-links.js';
const PLAUSIBLE_DOMAIN = 'balosky.com';
const SESSION_KEY = 'balosky_sid';
const PLAUSIBLE_SCRIPT_ID = 'balosky-plausible';
const SENSITIVE_RE = /([^\s@]+@[^\s@]+\.[^\s@]+)|(payment|payer|purchase|external[_-]?reference|preference|token|password|secret|access[_-]?token|mp_)/i;

const IGNORED_PUBLIC_PATHS = ['/admin', '/preview-', '/home-preview', '/preview-full', '/preview-v2'];
const SOCIAL_HOST_RE = /(instagram|spotify|music\.apple|youtube|youtu\.be|tiktok|x\.com|twitter|threads|twitch|soundcloud|linktr\.ee|wa\.me|whatsapp)/i;
const CHECKOUT_PATH_RE = /^\/(cafecito|checkout)(\/|$)|^\/api\/checkout\/quick/i;
const CTA_PATH_RE = /^\/(productora|btv|laboratorio|club|wall|vip|portfolio|gallery|blog|ideas|agenda-publica)(\/|$)/i;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export const shouldTrackPublicPath = (pathname = window.location.pathname) => {
  return !IGNORED_PUBLIC_PATHS.some((path) => pathname.startsWith(path));
};

export const ensurePlausibleLoaded = () => {
  if (typeof window === 'undefined') return;
  if (!shouldTrackPublicPath()) return;
  if (document.getElementById(PLAUSIBLE_SCRIPT_ID)) return;

  window.plausible = window.plausible || function plausibleQueue() {
    ((window.plausible as any).q = (window.plausible as any).q || []).push(arguments);
  };

  const script = document.createElement('script');
  script.id = PLAUSIBLE_SCRIPT_ID;
  script.defer = true;
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  script.src = PLAUSIBLE_SRC;
  document.head.appendChild(script);
};

export const analyticsSessionId = () => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch (_) {
    return '';
  }
};

const cleanValue = (value: unknown, max = 120) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, max);
  if (!cleaned || SENSITIVE_RE.test(cleaned)) return undefined;
  return cleaned;
};

const cleanMetadata = (metadata?: AnalyticsMetadata) => {
  const clean: Record<string, string | number | boolean> = {};
  if (!metadata) return clean;

  for (const [key, value] of Object.entries(metadata)) {
    const safeKey = key.replace(/[^\w.-]/g, '').slice(0, 40);
    if (!safeKey) continue;
    const safeValue = cleanValue(value);
    if (safeValue !== undefined) clean[safeKey] = safeValue;
  }

  return clean;
};

const publicPath = () => `${window.location.pathname}${window.location.hash || ''}`;

export const trackEvent = (
  eventName: AnalyticsEventName,
  metadata?: AnalyticsMetadata,
  options: { target?: string; path?: string } = {},
) => {
  if (typeof window === 'undefined') return;
  if (!shouldTrackPublicPath(window.location.pathname)) return;

  const safeMetadata = cleanMetadata(metadata);
  const path = cleanValue(options.path || publicPath(), 180);
  const target = cleanValue(options.target || String(safeMetadata.target || ''), 160);

  ensurePlausibleLoaded();

  try {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, Object.keys(safeMetadata).length ? { props: safeMetadata } : undefined);
    }
  } catch (_) {}

  try {
    window.fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        path: path || '/',
        target: target || '',
        sessionId: analyticsSessionId(),
        metadata: safeMetadata,
      }),
    }).catch(() => {});
  } catch (_) {}
};

export const trackPageView = (route: string) => {
  trackEvent('page_view', { route }, { path: route });
};

export const classifyTrackedClick = (rawHref?: string | null) => {
  if (!rawHref) return null;
  if (SENSITIVE_RE.test(rawHref)) return null;

  let url: URL;
  try {
    url = new URL(rawHref, window.location.origin);
  } catch (_) {
    return null;
  }

  const sameOrigin = url.origin === window.location.origin;
  const href = sameOrigin ? `${url.pathname}${url.hash || ''}` : `${url.origin}${url.pathname}`;

  if (sameOrigin && CHECKOUT_PATH_RE.test(url.pathname)) {
    return { eventName: 'checkout_start' as const, href, kind: 'checkout' };
  }

  if (sameOrigin && CTA_PATH_RE.test(url.pathname)) {
    return { eventName: 'cta_click' as const, href, kind: 'internal' };
  }

  if (!sameOrigin && SOCIAL_HOST_RE.test(url.hostname)) {
    return { eventName: 'social_click' as const, href, kind: 'social', host: url.hostname };
  }

  return null;
};
