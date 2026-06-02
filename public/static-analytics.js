(function () {
  var SESSION_KEY = 'balosky_sid';
  var SENSITIVE_RE = /([^\s@]+@[^\s@]+\.[^\s@]+)|(payment|payer|purchase|external[_-]?reference|preference|token|password|secret|access[_-]?token|mp_)/i;
  var SOCIAL_HOST_RE = /(instagram|spotify|music\.apple|youtube|youtu\.be|tiktok|x\.com|twitter|threads|twitch|soundcloud|linktr\.ee|wa\.me|whatsapp)/i;
  var CHECKOUT_PATH_RE = /^\/(cafecito|checkout)(\/|$)|^\/api\/checkout\/quick/i;
  var CTA_PATH_RE = /^\/(btv|laboratorio|club|wall|vip|portfolio|gallery|blog|ideas|agenda-publica)(\/|$)/i;

  function sessionId() {
    try {
      var existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var id = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (_) {
      return '';
    }
  }

  function clean(value, max) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    var cleaned = value.trim().replace(/\s+/g, ' ').slice(0, max || 120);
    if (!cleaned || SENSITIVE_RE.test(cleaned)) return undefined;
    return cleaned;
  }

  function cleanMetadata(metadata) {
    var out = {};
    Object.keys(metadata || {}).forEach(function (key) {
      var safeKey = String(key).replace(/[^\w.-]/g, '').slice(0, 40);
      var safeValue = clean(metadata[key], 120);
      if (safeKey && safeValue !== undefined) out[safeKey] = safeValue;
    });
    return out;
  }

  function track(eventName, metadata, target) {
    if (!window.fetch) return;
    var safeMetadata = cleanMetadata(metadata);
    var safeTarget = clean(target || safeMetadata.href || '', 160) || '';
    try {
      window.fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          eventName: eventName,
          path: location.pathname + (location.hash || ''),
          target: safeTarget,
          sessionId: sessionId(),
          metadata: safeMetadata
        })
      }).catch(function () {});
    } catch (_) {}
  }

  function labelFrom(element) {
    return (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  }

  function classify(rawHref) {
    if (!rawHref || SENSITIVE_RE.test(rawHref)) return null;
    var url;
    try {
      url = new URL(rawHref, window.location.origin);
    } catch (_) {
      return null;
    }

    var sameOrigin = url.origin === window.location.origin;
    var href = sameOrigin ? url.pathname + (url.hash || '') : url.origin + url.pathname;

    if (sameOrigin && CHECKOUT_PATH_RE.test(url.pathname)) return { eventName: 'checkout_start', href: href, kind: 'checkout' };
    if (sameOrigin && CTA_PATH_RE.test(url.pathname)) return { eventName: 'cta_click', href: href, kind: 'internal' };
    if (!sameOrigin && SOCIAL_HOST_RE.test(url.hostname)) return { eventName: 'social_click', href: href, kind: 'social', host: url.hostname };
    return null;
  }

  track('page_view', { route: location.pathname + (location.hash || '') });

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!target) return;
    var classified = classify(target.getAttribute('href'));
    if (!classified) return;
    track(classified.eventName, {
      href: classified.href,
      kind: classified.kind,
      host: classified.host || '',
      label: labelFrom(target)
    }, classified.href);
  }, true);
})();
