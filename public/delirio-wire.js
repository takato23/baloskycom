/* ============ BACKEND DATA WIRE-UP ============ */
/* Fetches real data from /api/* and replaces mockup placeholders. */
(function(){
  'use strict';

  var fmtK = function(n){ return Math.round((n||0)/1000); };
  var fmtTime = function(iso){
    if (!iso) return '';
    var diff = Date.now() - new Date(iso).getTime();
    var s = Math.floor(diff/1000);
    if (s < 5) return 'Hace unos seg';
    if (s < 60) return 'Hace ' + s + ' seg';
    var m = Math.floor(s/60);
    if (m < 60) return 'Hace ' + m + ' min';
    var h = Math.floor(m/60);
    if (h < 24) return 'Hace ' + h + ' h';
    return 'Hace ' + Math.floor(h/24) + ' d';
  };
  var esc = function(s){
    s = String(s == null ? '' : s);
    return s.replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  };

  /* =====================================================================
   * CHECKOUT MODAL · unificado
   * ---------------------------------------------------------------------
   * Cualquier botón con [data-checkout-type] dispara este modal. Pide
   * email + nombre + (opcional) monto, postea a /api/checkout/create y
   * redirige a Mercado Pago. Al volver de MP, el usuario cae en
   * /pago-exitoso?purchase=<id> que hace polling hasta approved.
   * =================================================================== */
  var _buyCurrent = null;

  function ensureCheckoutModal(){
    if (document.getElementById('buyGate')) return;
    var el = document.createElement('div');
    el.id = 'buyGate';
    el.className = 'wp-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-label', 'Checkout');
    el.innerHTML =
      '<div class="wp-card">'
    +   '<button class="wp-close" id="buyClose" data-cursor="CERRAR" aria-label="Cerrar">&#10006;</button>'
    +   '<div class="wp-eyebrow" id="buyEyebrow">Apoyá</div>'
    +   '<h4 id="buyTitle">Confirmar</h4>'
    +   '<div class="wp-desc" id="buyDesc">Dejá tu mail. Te llevo al pago seguro de Mercado Pago y te mando el link de descarga al volver.</div>'
    +   '<form id="buyForm" autocomplete="off" novalidate>'
    +     '<input type="email" id="buyEmail" name="email" placeholder="tu@mail.com" required aria-label="Email" autocomplete="email" />'
    +     '<div id="buyExtra" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">'
    +       '<input type="text" id="buyName" name="name" placeholder="tu nombre (opcional)" aria-label="Nombre" autocomplete="name" maxlength="80" style="background:transparent;border:0;color:inherit;font:inherit;padding:10px 14px;border-radius:10px;outline:none;" />'
    +       '<input type="number" id="buyAmount" name="amount" placeholder="monto en $ (mínimo 100)" aria-label="Monto" min="100" step="100" style="background:transparent;border:0;color:inherit;font:inherit;padding:10px 14px;border-radius:10px;outline:none;display:none;" />'
    +     '</div>'
    +     '<button type="submit" class="wp-submit" id="buySubmit">Ir a pagar</button>'
    +   '</form>'
    +   '<div class="wp-msg" id="buyMsg" role="status" aria-live="polite"></div>'
    +   '<div class="wp-fine">Pago procesado por Mercado Pago. El link de descarga llega al mail y también queda a la vista al volver.</div>'
    + '</div>';
    document.body.appendChild(el);

    var closeBtn = el.querySelector('#buyClose');
    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);
    el.addEventListener('click', function(ev){ if (ev.target === el) closeCheckoutModal(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && el.classList.contains('open')) closeCheckoutModal();
    });

    var form = el.querySelector('#buyForm');
    form.addEventListener('submit', submitCheckoutForm);
  }

  function openCheckoutModal(opts){
    ensureCheckoutModal();
    _buyCurrent = opts || {};
    var el = document.getElementById('buyGate');
    if (!el) return;

    var eyebrow = el.querySelector('#buyEyebrow');
    var title = el.querySelector('#buyTitle');
    var desc = el.querySelector('#buyDesc');
    var amountInput = el.querySelector('#buyAmount');
    var submit = el.querySelector('#buySubmit');
    var msg = el.querySelector('#buyMsg');
    var email = el.querySelector('#buyEmail');

    if (eyebrow) eyebrow.textContent = _buyCurrent.eyebrow || 'Apoyá';
    if (title) title.textContent = _buyCurrent.title || 'Confirmar tu apoyo';
    if (desc) desc.textContent = _buyCurrent.desc || 'Dejá tu mail. Te llevo al pago seguro y el link de descarga queda en la pantalla de éxito.';
    if (submit) {
      var label = _buyCurrent.amount ? ('Ir a pagar · $' + Number(_buyCurrent.amount).toLocaleString('es-AR')) : 'Ir a pagar';
      submit.textContent = label;
      submit.disabled = false;
    }
    if (msg) { msg.textContent = ''; msg.className = 'wp-msg'; }
    if (amountInput) {
      if (_buyCurrent.editableAmount) {
        amountInput.style.display = '';
        amountInput.value = _buyCurrent.amount ? String(_buyCurrent.amount) : '';
      } else {
        amountInput.style.display = 'none';
        amountInput.value = '';
      }
    }

    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ if (email) email.focus(); }, 50);
    trackPlausible('checkout_open', {
      type: _buyCurrent.type || 'unknown',
      itemId: _buyCurrent.itemId || '',
      amount: _buyCurrent.amount ? Number(_buyCurrent.amount) : 0
    });
  }

  function closeCheckoutModal(){
    var el = document.getElementById('buyGate');
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async function submitCheckoutForm(ev){
    ev.preventDefault();
    if (!_buyCurrent) return;
    var el = document.getElementById('buyGate');
    if (!el) return;
    var email = String((el.querySelector('#buyEmail') || {}).value || '').trim().toLowerCase();
    var name = String((el.querySelector('#buyName') || {}).value || '').trim();
    var amountRaw = Number((el.querySelector('#buyAmount') || {}).value || 0);
    var submit = el.querySelector('#buySubmit');
    var msg = el.querySelector('#buyMsg');

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      if (msg) { msg.textContent = 'Email inválido'; msg.className = 'wp-msg err'; }
      return;
    }

    // Membresías: flujo recurrente — pegamos a /api/subscriptions/create
    // que usa MP Preapproval. Devuelve initPoint igual que checkout.
    if (_buyCurrent.type === 'membership') {
      if (!_buyCurrent.itemId) {
        if (msg) { msg.textContent = 'Plan inválido'; msg.className = 'wp-msg err'; }
        return;
      }
      if (submit) { submit.disabled = true; submit.textContent = 'Creando suscripción…'; }
      try {
        var rs = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ membershipId: _buyCurrent.itemId, email: email })
        });
        var subData = null;
        try { subData = await rs.json(); } catch(_) {}
        if (!rs.ok || !subData) {
          var subErr = (subData && subData.error) || 'No pude crear la suscripción.';
          if (msg) { msg.textContent = subErr; msg.className = 'wp-msg err'; }
          if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
          return;
        }
        trackPlausible('subscription_created', {
          subscriptionId: subData.subscriptionId || '',
          membershipId: _buyCurrent.itemId
        });
        var subTarget = subData.initPoint || subData.sandboxInitPoint;
        if (subTarget) {
          window.location.assign(subTarget);
        } else {
          if (msg) { msg.textContent = 'No recibí el link de MP.'; msg.className = 'wp-msg err'; }
          if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
        }
      } catch (e) {
        console.warn('[subscriptions] create failed', e);
        if (msg) { msg.textContent = 'Error de red. Probá de nuevo.'; msg.className = 'wp-msg err'; }
        if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
      }
      return;
    }

    var body = {
      type: _buyCurrent.type,
      email: email,
      supporterName: name || undefined
    };
    if (_buyCurrent.itemId) body.itemId = _buyCurrent.itemId;
    // amount: override manual > amount del opts (fijo) > nada (campaña con monto libre)
    if (_buyCurrent.editableAmount && amountRaw > 0) {
      body.amount = amountRaw;
    } else if (_buyCurrent.amount) {
      body.amount = Number(_buyCurrent.amount);
    }

    if (submit) { submit.disabled = true; submit.textContent = 'Creando pago…'; }
    if (msg) { msg.textContent = ''; msg.className = 'wp-msg'; }

    try {
      var r = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var data = null;
      try { data = await r.json(); } catch(_) {}
      if (!r.ok || !data) {
        var errTxt = (data && data.error) || 'No pude crear el pago. Probá de nuevo.';
        if (msg) { msg.textContent = errTxt; msg.className = 'wp-msg err'; }
        if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
        return;
      }
      trackPlausible('checkout_created', {
        type: _buyCurrent.type || 'unknown',
        purchaseId: data.purchaseId || ''
      });
      var target = data.initPoint || data.sandboxInitPoint;
      if (target) {
        window.location.assign(target);
      } else {
        if (msg) { msg.textContent = 'No recibí el link de Mercado Pago, intentá de nuevo.'; msg.className = 'wp-msg err'; }
        if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
      }
    } catch (e) {
      console.warn('[checkout] create failed', e);
      if (msg) { msg.textContent = 'Error de red. Probá de nuevo.'; msg.className = 'wp-msg err'; }
      if (submit) { submit.disabled = false; submit.textContent = 'Reintentar'; }
    }
  }

  /* Click interceptor global: cualquier elemento con [data-checkout-type] abre
     el modal. Usamos capture=true para anticiparnos a los onclick que navegan
     al href viejo /checkout/c3. */
  document.addEventListener('click', function(e){
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-checkout-type]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var type = btn.getAttribute('data-checkout-type') || 'campaign';
    var itemId = btn.getAttribute('data-checkout-itemid') || '';
    var amountAttr = btn.getAttribute('data-checkout-amount');
    var amount = amountAttr ? Number(amountAttr) : 0;
    var editable = btn.getAttribute('data-checkout-editable') === '1';
    var title = btn.getAttribute('data-checkout-title') || '';
    var eyebrow = btn.getAttribute('data-checkout-eyebrow') || '';
    var desc = btn.getAttribute('data-checkout-desc') || '';
    openCheckoutModal({
      type: type,
      itemId: itemId,
      amount: amount > 0 ? amount : 0,
      editableAmount: editable,
      title: title,
      eyebrow: eyebrow,
      desc: desc
    });
  }, true);

  async function fetchJSON(url){
    var controller = null;
    var timeout = null;
    try {
      if (window.AbortController) {
        controller = new AbortController();
        timeout = setTimeout(function(){ try { controller.abort(); } catch (_) {} }, 2400);
      }
      var r = await fetch(url, {
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined
      });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.warn('[wire]', url, e && e.message);
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function setImagePreload(href){
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    var existing = document.getElementById('delirio-image-preload');
    if (!href) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    var link = existing || document.createElement('link');
    link.id = 'delirio-image-preload';
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    if (!existing) head.appendChild(link);
  }

  function clearChildren(el){
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function setMultilineHeading(el, primary, secondary){
    if (!el) return;
    clearChildren(el);
    el.appendChild(document.createTextNode(primary || ''));
    el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(secondary || ''));
  }

  function setAmountSummary(el, current, goal){
    if (!el) return;
    clearChildren(el);
    el.appendChild(document.createTextNode('$' + fmtK(current)));
    var detail = document.createElement('span');
    detail.style.fontSize = '0.45em';
    detail.style.color = 'rgba(255,255,255,0.7)';
    detail.textContent = ' k / $' + fmtK(goal) + 'k';
    el.appendChild(detail);
  }

  function setPriceMarkup(el, amount, suffixTag, suffixText){
    if (!el) return;
    clearChildren(el);
    el.appendChild(document.createTextNode('$' + fmtK(amount)));
    if (suffixTag && suffixText) {
      var suffix = document.createElement(suffixTag);
      suffix.textContent = suffixText;
      el.appendChild(suffix);
    }
  }

  function getCafecitoSettings(settings){
    var raw = settings && settings.cafecito ? Number(settings.cafecito.amount) : 0;
    var amount = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 3000;
    var link = settings && settings.cafecito && typeof settings.cafecito.mercadoPagoLink === 'string'
      ? settings.cafecito.mercadoPagoLink.trim()
      : '';
    return { amount: amount, mercadoPagoLink: /^https?:\/\//i.test(link) ? link : '' };
  }

  function setMembershipPrice(el, amount, billingPeriod){
    if (!el) return;
    clearChildren(el);
    el.appendChild(document.createTextNode('$' + fmtK(amount)));
    var small = document.createElement('small');
    small.textContent = 'k / ' + (billingPeriod === 'yearly' ? 'año' : 'mes');
    el.appendChild(small);
  }

  function renderListItems(listEl, items){
    if (!listEl) return;
    clearChildren(listEl);
    (items || []).forEach(function(item){
      var li = document.createElement('li');
      li.textContent = item == null ? '' : String(item);
      listEl.appendChild(li);
    });
  }

  function createLeaderRow(rank, name, amount, kind, isEmpty){
    var row = document.createElement('div');
    row.className = 'leader-row';
    if (isEmpty) {
      row.style.opacity = '0.55';
      row.style.gridTemplateColumns = '1fr';
      var emptyName = document.createElement('span');
      emptyName.className = 'name';
      emptyName.style.textAlign = 'center';
      emptyName.style.padding = '14px';
      emptyName.textContent = name;
      row.appendChild(emptyName);
      return row;
    }
    [['rank', rank], ['name', name], ['amt', '$' + fmtK(amount) + 'k'], ['kind', kind]].forEach(function(part){
      var span = document.createElement('span');
      span.className = part[0];
      span.textContent = part[1];
      row.appendChild(span);
    });
    return row;
  }

  function createFeedEntryNode(m, i, markAsNew){
    var mk = _feedMarkers[i % _feedMarkers.length];
    var who = m.supporterName || m.name || 'Anónimo';
    var entry = document.createElement('div');
    entry.className = 'feed-entry' + (markAsNew ? ' is-new' : '');
    entry.dataset.id = m.id || ('m' + i);

    var marker = document.createElement('span');
    marker.className = 'mk ' + mk;
    entry.appendChild(marker);

    var body = document.createElement('div');
    body.className = 'body';

    var msg = document.createElement('div');
    msg.className = 'msg';
    var whoStrong = document.createElement('b');
    whoStrong.textContent = who;
    msg.appendChild(whoStrong);

    if (m.amount) {
      msg.appendChild(document.createTextNode(' aportó '));
      var amtStrong = document.createElement('b');
      amtStrong.textContent = '$' + fmtK(m.amount) + 'k';
      msg.appendChild(amtStrong);
      if (m.message) {
        msg.appendChild(document.createTextNode(' — "' + String(m.message).substring(0, 140) + '"'));
      }
    } else if (m.message) {
      msg.appendChild(document.createTextNode(': "' + String(m.message).substring(0, 140) + '"'));
    } else {
      msg.appendChild(document.createTextNode(' dejó un mensaje'));
    }

    var time = document.createElement('div');
    time.className = 'time';
    time.textContent = m.ago || fmtTime(m.createdAt);

    body.appendChild(msg);
    body.appendChild(time);
    entry.appendChild(body);

    var pin = document.createElement('button');
    pin.className = 'pin';
    pin.setAttribute('data-cursor', 'FAV');
    pin.setAttribute('aria-label', 'Pin');
    pin.textContent = '★';
    entry.appendChild(pin);

    return entry;
  }

  function createPinnedFeedNode(settings){
    var pinned = settings && settings.pinnedMessage;
    if (!pinned || !pinned.enabled || (!pinned.text && !pinned.author)) return null;

    var entry = document.createElement('div');
    entry.className = 'feed-entry is-pinned';
    entry.dataset.id = 'pinned';
    entry.style.background = 'rgba(250,93,41,0.12)';
    entry.style.border = '1px solid rgba(250,93,41,0.45)';
    entry.style.borderRadius = '10px';
    entry.style.padding = '10px 12px';
    entry.style.marginBottom = '10px';

    var marker = document.createElement('span');
    marker.className = 'mk o';
    entry.appendChild(marker);

    var body = document.createElement('div');
    body.className = 'body';

    var msg = document.createElement('div');
    msg.className = 'msg';
    msg.style.fontFamily = "'Inter Tight',sans-serif";
    msg.style.fontWeight = '700';
    if (pinned.author) {
      var author = document.createElement('b');
      author.textContent = pinned.author;
      msg.appendChild(author);
      msg.appendChild(document.createTextNode(': '));
    }
    msg.appendChild(document.createTextNode(pinned.text || ''));

    var time = document.createElement('div');
    time.className = 'time';
    time.style.color = 'var(--accent)';
    time.style.letterSpacing = '0.1em';
    time.style.textTransform = 'uppercase';
    time.style.fontSize = '10px';
    time.textContent = 'Anclado';

    body.appendChild(msg);
    body.appendChild(time);
    entry.appendChild(body);

    var pin = document.createElement('span');
    pin.className = 'pin';
    pin.setAttribute('aria-hidden', 'true');
    pin.style.color = 'var(--accent)';
    pin.textContent = '★';
    entry.appendChild(pin);

    return entry;
  }

  function analyticsSessionId(){
    try {
      var key = 'balosky_sid';
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
      var id = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(key, id);
      return id;
    } catch (_) {
      return '';
    }
  }

  function trackPlausible(eventName, props){
    var apiEventName = ({
      checkout_open: 'checkout_start',
      subscription_created: 'checkout_created',
      muro_sent: 'media_open',
      photo_open: 'media_open',
      wallpaper_preview_open: 'media_open',
      wallpaper_download: 'media_open',
      song_play: 'media_open',
      konami_triggered: 'media_open'
    })[eventName] || eventName;
    try {
      if (typeof window.plausible === 'function') {
        if (props && Object.keys(props).length) window.plausible(eventName, { props: props });
        else window.plausible(eventName);
      }
    } catch (_) {}
    try {
      if (!window.fetch) return;
      window.fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          eventName: apiEventName,
          path: location.pathname + location.hash,
          target: props && (props.target || props.href || props.title || props.id || props.type || ''),
          sessionId: analyticsSessionId(),
          metadata: props || {}
        })
      }).catch(function(){});
    } catch (_) {}
  }

  (function instrumentMessagePosts(){
    if (window.__baloskyFetchWrapped || typeof window.fetch !== 'function') return;
    window.__baloskyFetchWrapped = true;
    var originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = (init && init.method) || (typeof input !== 'string' && input && input.method) || 'GET';
      return originalFetch(input, init).then(function(response){
        if (response && response.ok && String(method).toUpperCase() === 'POST' && /\/api\/messages(?:\?|$)/.test(url)) {
          trackPlausible('media_open', { target: 'muro_sent' });
        }
        return response;
      });
    };
  })();

  trackPlausible('page_view', {
    target: location.pathname || '/',
    perf: document.documentElement.classList.contains('perf-low') ? 'low' : 'full'
  });

  document.addEventListener('click', function(e){
    var target = e.target;
    if (!(target instanceof Element)) return;
    var social = target.closest('#redes a[href], footer a[href*="instagram"], footer a[href*="spotify"], footer a[href*="youtube"], footer a[href*="tiktok"], footer a[href*="music.apple"]');
    if (social) {
      trackPlausible('social_click', { href: social.getAttribute('href') || '', target: social.textContent || 'social' });
    }
    var cta = target.closest('.cta, .mini-btn, .cafe-fab, .stk-cta');
    if (cta) {
      trackPlausible('cta_click', { href: cta.getAttribute('href') || '', target: cta.textContent || cta.getAttribute('aria-label') || 'cta' });
    }
    var link = target.closest('a[href*="/checkout"]');
    if (!link) return;
    var href = link.getAttribute('href') || '/checkout';
    trackPlausible('checkout_start', { href: href });
  }, true);

  /* -----------------------------------------------------------------------
   * SYNC: enganchar todos los botones de Apoyá al checkout ANTES de
   * cualquier fetch. Así aunque el backend tarde o falle, los botones ya
   * tienen href y son clickeables desde el primer frame.
   *
   * También desactivamos `draggable` en los <a>/<button> dentro de cards
   * con draggable="true" (Cafecito) para que el click no se pierda por el
   * HTML5 drag gesture.
   * --------------------------------------------------------------------- */
  function wireDefaultsSync(){
    try {
      document.querySelectorAll('#apoya a.mini-btn').forEach(function(btn){
        if (!btn.getAttribute('href')) btn.setAttribute('href', '/checkout/c3');
        btn.setAttribute('draggable', 'false');
      });
      document.querySelectorAll('[draggable="true"] a, [draggable="true"] button').forEach(function(el){
        el.setAttribute('draggable', 'false');
      });
      /* Hacer toda la .card clickeable: al hacer click en cualquier parte de la
         card, si no estás tocando un input/button/link/slider, se navega al
         href del mini-btn de esa card. Así el target es grande para mobile. */
      document.querySelectorAll('#apoya .card').forEach(function(card){
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(ev){
          var t = ev.target;
          if (!(t instanceof Element)) return;
          /* Si clickeaste algo que ya tiene su propio comportamiento, no
             hacemos nada (dejamos que el browser haga lo suyo). */
          if (t.closest('a, button, input, textarea, select, label, .split-slider, .milestones, .progress, [role="slider"]')) return;
          var btn = card.querySelector('a.mini-btn');
          if (!btn) return;
          ev.preventDefault();
          /* Si el botón tiene data-checkout-type, delego al modal nuevo. */
          if (btn.hasAttribute('data-checkout-type')) {
            btn.click();
          } else {
            var href = btn.getAttribute('href');
            if (href) {
              trackPlausible('checkout_start', { href: href });
              window.location.assign(href);
            }
          }
        });
      });
    } catch (e) { console.warn('[wire] sync defaults', e); }
  }

  async function main(){
    wireDefaultsSync();
    /* Newsletter form is static: attach before any awaits so it works even if the API is down */
    try { attachNewsletterForm(); } catch(e) { console.warn('[wire] newsletter (early)', e); }
    var results = await Promise.all([
      fetchJSON('/api/campaigns'),
      fetchJSON('/api/messages?limit=10'),
      fetchJSON('/api/products'),
      fetchJSON('/api/settings'),
      fetchJSON('/cafecitos.json')
    ]);
    var campaigns   = Array.isArray(results[0]) ? results[0] : [];
    var messages    = Array.isArray(results[1]) ? results[1] : [];
    var products    = Array.isArray(results[2]) ? results[2] : [];
    var settings    = results[3] || null;
    var cafecitos   = results[4] || null;
    var cafecitoSettings = getCafecitoSettings(settings);

    /* ---------- HERO STATS (4 counters) ---------- */
    try {
      var activeCamps  = campaigns.filter(function(c){ return c.status === 'active'; });
      var totalRaised  = cafecitos && cafecitos.totalAmount
        ? Number(cafecitos.totalAmount)
        : campaigns.reduce(function(a,c){ return a + (Number(c.currentAmount)||0); }, 0);
      var approvedMsgs = cafecitos && cafecitos.totalCount
        ? Number(cafecitos.totalCount)
        : (messages.filter(function(m){ return m.isApproved; }).length || messages.length);
      var uniqueSupporters = cafecitos && cafecitos.uniqueSupporters ? Number(cafecitos.uniqueSupporters) : 0;
      var feedCount = cafecitos && Array.isArray(cafecitos.feed) ? cafecitos.feed.length : messages.length;

      var counts = document.querySelectorAll('.live-strip .count');
      var values = [
        approvedMsgs || 0,     /* Cafecitos reales */
        fmtK(totalRaised),     /* Recaudado · ARS (thousands) */
        uniqueSupporters || 0,
        feedCount || activeCamps.length
      ];
      counts.forEach(function(el, i){
        if (values[i] != null) {
          el.setAttribute('data-t', String(values[i]));
          el.textContent = Number(values[i]).toLocaleString('es-AR');
        }
      });
      var headerMetric = document.getElementById('online');
      if (headerMetric && cafecitos && cafecitos.totalCount) {
        headerMetric.textContent = Number(cafecitos.totalCount).toLocaleString('es-AR') + ' cafecitos';
      }
      var headerAmount = document.getElementById('liveCountdown');
      if (headerAmount && cafecitos && cafecitos.totalAmount) {
        headerAmount.textContent = '$' + (Number(cafecitos.totalAmount) / 1000000).toFixed(2) + 'M reales';
      }
      var feedMetric = document.getElementById('feedOnline');
      if (feedMetric && cafecitos && cafecitos.totalCount) {
        feedMetric.textContent = Number(cafecitos.totalCount).toLocaleString('es-AR') + ' reales';
      }
    } catch (e) { console.warn('[wire] hero stats', e); }

    try {
      document.querySelectorAll('[data-cafecito-price]').forEach(function(el){
        setPriceMarkup(el, cafecitoSettings.amount, 'span', 'k+');
      });
      document.querySelectorAll('[data-cafecito-link]').forEach(function(link){
        var target = cafecitoSettings.mercadoPagoLink || '/cafecito';
        link.setAttribute('href', target);
      });
    } catch (e) { console.warn('[wire] cafecito settings', e); }

    /* ---------- PRODUCTS (Cafecito / Encargo / Sesión) ---------- */
    try {
      var cards = document.querySelectorAll('#apoya .bento .card:not(.c-hero)');
      products.slice(0, cards.length).forEach(function(p, i){
        var card = cards[i];
        if (!card) return;
        if (card.classList.contains('c-cafe')) return;
        var title = card.querySelector('h3, h4');
        if (title) title.textContent = p.title || title.textContent;
        var desc = card.querySelector('p');
        if (desc && p.description) desc.textContent = p.description;
        /* Price text: prefer the explicit .price node, else fall back to .foot > div */
        var priceEl = card.querySelector('.price') || card.querySelector('.foot > div');
        if (priceEl && p.price) {
          setPriceMarkup(priceEl, p.price, 'span', 'k');
          var suffix = priceEl.querySelector('span:last-child');
          if (suffix) suffix.className = 'u';
        }
        /* Wire the mini button to go to checkout with this product's amount. */
        var btn = card.querySelector('a.mini-btn, .foot a');
        if (btn && p.price) {
          btn.setAttribute(
            'href',
            '/checkout/c3?amount=' + encodeURIComponent(p.price)
          );
          btn.setAttribute('data-product-id', p.id || '');
          /* Nuevo: checkout real type=product con itemId fijo y precio cerrado. */
          btn.setAttribute('data-checkout-type', 'product');
          btn.setAttribute('data-checkout-itemid', p.id || '');
          btn.setAttribute('data-checkout-amount', String(p.price));
          btn.removeAttribute('data-checkout-editable');
          btn.setAttribute('data-checkout-title', p.title || 'Balosky · producto');
          btn.setAttribute('data-checkout-eyebrow', 'Producto');
          btn.setAttribute('data-checkout-desc', 'Dejá tu mail para que te llegue el link de descarga. Pago seguro por Mercado Pago.');
        }
      });
    } catch (e) { console.warn('[wire] products', e); }

    /* ---------- FALLBACK: wire any remaining Apoyá mini-btn without href ---------- */
    try {
      document.querySelectorAll('#apoya a.mini-btn').forEach(function(btn){
        if (!btn.getAttribute('href')) {
          btn.setAttribute('href', '/checkout/c3');
        }
      });
    } catch (e) { console.warn('[wire] mini-btn fallback', e); }

    /* ---------- LIVE FEED (right column of muro) ---------- */
    try {
      var realCafeFeed = cafecitos && Array.isArray(cafecitos.feed) ? cafecitos.feed : null;
      renderFeedEntries(realCafeFeed || messages || [], settings);
    } catch (e) { console.warn('[wire] feed', e); }
    /* Cableamos form + auto-refresh una sola vez */
    try { attachMuroForm(); } catch (e) { console.warn('[wire] muroForm', e); }
    try { startMuroRefresh(); } catch (e) { console.warn('[wire] muroRefresh', e); }

    /* ---------- LEADERBOARD ---------- */
    try {
      var board = document.getElementById('leaderList');
      if (board) {
        var cafeTop = cafecitos && Array.isArray(cafecitos.top) ? cafecitos.top : null;
        if (cafeTop && cafeTop.length) {
          clearChildren(board);
          cafeTop.forEach(function(r){
            var row = document.createElement('div');
            row.className = 'leader-row';
            [['rank', r.rank], ['name', r.name], ['amt', r.amt], ['kind', r.kind]].forEach(function(part){
              var span = document.createElement('span');
              span.className = part[0];
              span.textContent = part[1];
              row.appendChild(span);
            });
            board.appendChild(row);
          });
        } else {
          /* Sin aportes todavía: mensaje en estado vacío */
          clearChildren(board);
          board.appendChild(createLeaderRow('', 'El Top se arma solo con cada aporte ✦', 0, '', true));
        }
      }
    } catch (e) { console.warn('[wire] leaderboard', e); }

    /* ---------- SETTINGS (title, social etc) ---------- */
    try {
      if (settings && settings.siteName) {
        /* keep original branding; no-op by default */
      }
    } catch (e) { console.warn('[wire] settings', e); }

    /* ---------- NEW SECTIONS: media + socials ---------- */
    try { await wireVideosIA(); } catch(e) { console.warn('[wire] videos IA', e); }
    try { await wireFotos();    } catch(e) { console.warn('[wire] fotos', e); }
    try { await wireWallpapers(); } catch(e) { console.warn('[wire] wallpapers', e); }
    try { await wireCanciones(); } catch(e) { console.warn('[wire] canciones', e); }
    try { await wireArchivo(); } catch(e) { console.warn('[wire] archivo', e); }
    try { await wireSocials();   } catch(e) { console.warn('[wire] socials', e); }
    try { attachNewsletterForm(); } catch(e) { console.warn('[wire] newsletter', e); }
    try {
      scheduleHashRealign();
    } catch(e) { console.warn('[wire] hash align', e); }
  }

  /* =====================================================================
   * MURO · feed + form + auto-refresh
   * =================================================================== */
  var _feedMarkers = ['o','t','v','g','m'];
  var _feedSettings = null;
  var _feedSeenIds = Object.create(null);

  function renderFeedEntries(messages, settings){
    if (settings) _feedSettings = settings;
    var stream = document.getElementById('feedStream');
    if (!stream) return;
    var approved = (messages || []).filter(function(m){ return m.isApproved !== false; });
    // ordenar más nuevos primero
    approved.sort(function(a,b){
      return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
    });
    var max = 8;
    var pinnedNode = createPinnedFeedNode(_feedSettings || settings);
    var slice = approved.slice(0, pinnedNode ? max - 1 : max);
    // reset seen set to lo que acabamos de renderizar
    _feedSeenIds = Object.create(null);
    slice.forEach(function(m){ if (m && m.id) _feedSeenIds[m.id] = 1; });

    clearChildren(stream);
    if (pinnedNode || slice.length) {
      if (pinnedNode) stream.appendChild(pinnedNode);
      slice.forEach(function(m, i){
        stream.appendChild(createFeedEntryNode(m, i, false));
      });
    } else {
      var emptyEntry = document.createElement('div');
      emptyEntry.className = 'feed-entry';
      emptyEntry.style.opacity = '0.55';
      emptyEntry.style.border = '1px dashed rgba(255,255,255,0.18)';
      emptyEntry.style.borderRadius = '10px';
      emptyEntry.style.padding = '14px';
      var emptyBody = document.createElement('div');
      emptyBody.className = 'body';
      var emptyMsg = document.createElement('div');
      emptyMsg.className = 'msg';
      emptyMsg.style.fontFamily = "'Inter Tight',sans-serif";
      emptyMsg.style.fontWeight = '600';
      emptyMsg.textContent = 'El muro todavía está vacío.';
      var emptyTime = document.createElement('div');
      emptyTime.className = 'time';
      emptyTime.textContent = 'Sé el primero en dejar un mensaje ✦';
      emptyBody.appendChild(emptyMsg);
      emptyBody.appendChild(emptyTime);
      emptyEntry.appendChild(emptyBody);
      stream.appendChild(emptyEntry);
    }
  }

  function prependMessageToFeed(m){
    if (!m || !m.id) return;
    if (_feedSeenIds[m.id]) return;
    _feedSeenIds[m.id] = 1;
    var stream = document.getElementById('feedStream');
    if (!stream) return;
    // Si el estado vacío está, lo limpiamos.
    var empty = stream.querySelector('.feed-entry[style*="dashed"]');
    if (empty) empty.remove();
    var node = createFeedEntryNode(m, 0, true);
    // Si hay pinned, insertar después. Si no, al tope.
    var pinnedNode = stream.querySelector('.feed-entry.is-pinned');
    if (pinnedNode && pinnedNode.nextSibling) {
      stream.insertBefore(node, pinnedNode.nextSibling);
    } else if (pinnedNode) {
      stream.appendChild(node);
    } else {
      stream.insertBefore(node, stream.firstChild);
    }
    // Mantener cap de entries
    var entries = stream.querySelectorAll('.feed-entry:not(.is-pinned)');
    if (entries.length > 10) {
      for (var i = 10; i < entries.length; i++) entries[i].remove();
    }
    // Remove flash class después de la animación para evitar acumular
    setTimeout(function(){ if (node && node.classList) node.classList.remove('is-new'); }, 2400);
  }

  function attachMuroForm(){
    var form = document.getElementById('muroForm');
    if (!form || form.dataset.wired === '1') return;
    form.dataset.wired = '1';
    var nameInput = document.getElementById('muroName');
    var msgInput = document.getElementById('muroMessage');
    var hpInput = document.getElementById('muroHp');
    var submit = document.getElementById('muroSubmit');
    var msgEl = document.getElementById('muroMsg');
    var counter = document.getElementById('muroCount');

    function setStatus(text, cls){
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.className = 'muro-post__msg' + (cls ? ' ' + cls : '');
    }
    function updateCounter(){
      if (!counter || !msgInput) return;
      var n = (msgInput.value || '').length;
      counter.textContent = n + ' / 240';
      counter.classList.remove('is-warn', 'is-bad');
      if (n > 220) counter.classList.add('is-bad');
      else if (n > 180) counter.classList.add('is-warn');
    }

    if (msgInput) {
      msgInput.addEventListener('input', updateCounter);
      updateCounter();
    }

    form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      if (!msgInput) return;
      var message = (msgInput.value || '').trim();
      var name = (nameInput && nameInput.value || '').trim();
      var hp = (hpInput && hpInput.value || '').trim();

      if (message.length < 2) {
        setStatus('Escribí algo un poco más largo.', 'err');
        msgInput.focus();
        return;
      }
      if (message.length > 240) {
        setStatus('Máximo 240 caracteres.', 'err');
        return;
      }

      if (submit) submit.disabled = true;
      setStatus('enviando…', '');

      try {
        var r = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supporterName: name || '',
            message: message,
            isAnonymous: !name,
            website: hp // honeypot
          })
        });

        if (r.status === 204) {
          // honeypot accionado — mostramos igual un ok para no dar hint a bots
          setStatus('listo', 'ok');
          form.reset();
          updateCounter();
          if (submit) submit.disabled = false;
          return;
        }
        if (r.status === 429) {
          setStatus('muchos mensajes en poco tiempo. probá en un rato.', 'err');
          if (submit) submit.disabled = false;
          return;
        }
        if (!r.ok) {
          var err = null;
          try { err = await r.json(); } catch(_) {}
          setStatus((err && err.error) || 'no se pudo enviar', 'err');
          if (submit) submit.disabled = false;
          return;
        }

        var created = await r.json();
        setStatus('listo, aparece arriba ✦', 'ok');
        form.reset();
        updateCounter();
        prependMessageToFeed(created);
        trackPlausible('muro_sent', { named: name ? 1 : 0 });
        // Reactivar después de un pequeño cool-down visual
        setTimeout(function(){ if (submit) submit.disabled = false; }, 1200);
      } catch (e) {
        console.warn('[muro] submit error', e);
        setStatus('error de red, probá de nuevo', 'err');
        if (submit) submit.disabled = false;
      }
    });
  }

  /* Auto-refresh feed: polling cada 15s, pausa cuando la pestaña está hidden. */
  var _muroRefreshTimer = null;
  var _muroRefreshInterval = 15000;
  var _muroRefreshing = false;

  async function refreshMuroOnce(){
    if (_muroRefreshing) return;
    if (document.hidden) return;
    var stream = document.getElementById('feedStream');
    if (!stream) return;
    _muroRefreshing = true;
    try {
      var list = await fetchJSON('/api/messages?limit=10');
      if (!Array.isArray(list)) return;
      // Filtrar aprobados
      list = list.filter(function(m){ return m.isApproved !== false; });
      // orden más nuevos primero
      list.sort(function(a,b){
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      });
      // Detectar nuevos (comparando ids contra _feedSeenIds)
      var fresh = [];
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (!m || !m.id) continue;
        if (!_feedSeenIds[m.id]) fresh.push(m);
      }
      // Si hay nuevos, prepend en orden cronológico asc (el más viejo primero) para
      // que el más reciente quede arriba del stack.
      if (fresh.length) {
        fresh.reverse(); // ahora el más viejo está primero
        fresh.forEach(function(m){ prependMessageToFeed(m); });
      }
    } finally {
      _muroRefreshing = false;
    }
  }

  function startMuroRefresh(){
    if (_muroRefreshTimer) return;
    if (!document.getElementById('feedStream')) return;
    _muroRefreshTimer = setInterval(function(){ refreshMuroOnce(); }, _muroRefreshInterval);
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) refreshMuroOnce();
    });
  }

  /* =====================================================================
   * NEWSLETTER FORM (footer)
   * =================================================================== */
  function attachNewsletterForm(){
    var form = document.getElementById('nlForm');
    if (!form || form.dataset.wired === '1') return;
    form.dataset.wired = '1';

    var input = document.getElementById('nlEmail');
    var btn = document.getElementById('nlSubmit');
    var msg = document.getElementById('nlMsg');

    function setMsg(kind, text){
      if (!msg) return;
      msg.className = 'nl-msg ' + (kind || '');
      msg.textContent = text || '';
    }

    var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      var email = (input && input.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        setMsg('err', 'Mail inválido');
        if (input) input.focus();
        return;
      }
      btn.setAttribute('disabled', 'disabled');
      var originalText = btn.textContent;
      btn.textContent = 'Enviando…';
      setMsg('info', 'Procesando…');
      try {
        var res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, source: 'delirio-footer' })
        });
        var data = null;
        try { data = await res.json(); } catch(_) {}
        if (!res.ok) {
          setMsg('err', (data && data.error) || 'Algo falló, probá de nuevo');
          return;
        }
        if (data && data.duplicate) {
          setMsg('ok', 'Ya estabas adentro. Gracias por volver.');
        } else {
          setMsg('ok', 'Listo. Revisá tu mail.');
          if (input) input.value = '';
        }
      } catch (e) {
        console.warn('[newsletter] error', e);
        setMsg('err', 'Error de red');
      } finally {
        btn.removeAttribute('disabled');
        btn.textContent = originalText;
      }
    });
  }

  function hideSectionById(id){
    var section = document.getElementById(id);
    if (section) section.hidden = true;
  }

  var hashRealignTimers = [];
  var hashRealignInterrupted = false;

  function clearHashRealignTimers(){
    hashRealignTimers.forEach(function(id){ window.clearTimeout(id); });
    hashRealignTimers = [];
  }

  function interruptHashRealign(){
    hashRealignInterrupted = true;
    clearHashRealignTimers();
  }

  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function(evt){
    window.addEventListener(evt, interruptHashRealign, { passive: true });
  });

  function realignHashAfterDynamicContent(){
    if (hashRealignInterrupted) return;
    var raw = (window.location.hash || '').replace(/^#/, '').split('/')[0];
    if (!raw) return;
    var id = decodeURIComponent(raw);
    var section = document.getElementById(id);
    if (!section || section.hidden) return;
    var offset = id === 'apoya'
      ? 0
      : (window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 64 : 94);
    var top = section.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  function scheduleHashRealign(){
    if (!window.location.hash) return;
    clearHashRealignTimers();
    hashRealignInterrupted = false;
    [0, 80, 240, 700, 1400, 2600, 5200, 8200].forEach(function(delay){
      hashRealignTimers.push(window.setTimeout(realignHashAfterDynamicContent, delay));
    });
  }

  window.addEventListener('hashchange', scheduleHashRealign);
  window.addEventListener('load', scheduleHashRealign);

  /* =====================================================================
   * MEDIA · ARCHIVO (section #archivo)
   * =================================================================== */
  function _archiveHref(m){
    if (!m) return '/';
    if (m.kind === 'video_ia' || m.kind === 'panorama_360') return '/laboratorio';
    if (m.kind === 'foto') return '#ojo';
    if (m.kind === 'wallpaper') return '/gallery';
    if (m.kind === 'cancion') return '#sonido';
    return m.embedUrl || m.mediaUrl || '/';
  }

  function _archiveKindLabel(kind){
    return {
      video_ia: 'VIDEO IA',
      foto: 'FOTO',
      wallpaper: 'WALLPAPER',
      cancion: 'CANCIÓN',
      panorama_360: '360'
    }[kind] || 'ARCHIVO';
  }

  async function wireArchivo(){
    var rail = document.getElementById('rail');
    if (!rail) return;
    var items = await fetchJSON('/api/media');
    if (!Array.isArray(items)) items = [];
    items = items.filter(function(m){ return m && m.active !== false; });
    items.sort(function(a, b){
      if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
      var order = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      if (order !== 0) return order;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    items = items.slice(0, 14);

    var intro = ''
      + '<div class="scrawl-arrow" style="position:absolute; top:-18px; left:30px; transform:rotate(60deg); color:var(--teal); z-index:5;">↘</div>'
      + '<div class="scrawl" style="position:absolute; top:-50px; left:70px; color:var(--teal); z-index:5;">agarrá y arrastrá</div>';

    if (!items.length) {
      hideSectionById('archivo');
      return;
    }

    rail.innerHTML = intro + items.map(function(m, i){
      var n = String(i + 1).padStart(2, '0');
      var cls = 'g' + ((i % 5) + 1);
      var title = esc(m.title || 'Sin título');
      var cat = esc([_archiveKindLabel(m.kind), m.category].filter(Boolean).join(' · '));
      var desc = esc(m.description || m.duration || (m.aiTool ? 'Hecho con ' + m.aiTool : 'Cargado desde el archivo real.'));
      var href = esc(_archiveHref(m));
      var img = esc(m.thumbUrl || m.coverImage || ((m.kind === 'foto' || m.kind === 'wallpaper') ? m.mediaUrl : '') || '');
      return '<a data-cursor="ABRIR" class="rail-card ' + cls + '" href="' + href + '">'
        + '<div class="art">' + (img ? '<img src="' + img + '" alt="" loading="lazy" draggable="false"/>' : n) + '</div>'
        + '<div class="info"><div class="cat">' + cat + '</div><h4>' + title + '</h4><p>' + desc + '</p></div>'
        + '</a>';
    }).join('');
  }

  /* =====================================================================
   * MEDIA · VIDEOS IA (section #vision)
   * =================================================================== */
  async function wireVideosIA(){
    var grid = document.getElementById('visionGrid');
    if (!grid) return;
    var items = await fetchJSON('/api/media?kind=video_ia');
    if (!Array.isArray(items) || !items.length) {
      items = [{
        title: 'El molinete del conurbano',
        category: 'IDEAS · IA',
        mediaUrl: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/videos/balosky-molinete-conurbano.web.mp4',
        coverImage: '',
        featured: true,
        duration: ''
      }];
    }

    /* Responsive span layout: 1 big (8), 1 side (4), then 4-col blocks, last is full 12. */
    var spans = ['span-8','span-4','span-4','span-4','span-4','span-12'];
    var html = items.map(function(m, i){
      var span = items.length === 1 ? 'span-12' : spans[i % spans.length];
      var poster = esc(m.coverImage || m.thumbUrl || '');
      var videoSrc = esc(m.mediaUrl || '');
      var srcAttr = (!poster && videoSrc) ? ' src="' + videoSrc + '"' : '';
      var title = esc(m.title || '');
      var cat = esc((m.category || 'VIDEO') + (m.featured ? ' · DESTACADO' : ''));
      var dur = esc(m.duration || '');
      return '<div class="vi-tile ' + span + '" data-cursor="REPRODUCIR" data-video="' + videoSrc + '">'
        +   '<video muted loop playsinline preload="metadata"' + srcAttr + (poster ? ' poster="' + poster + '"' : '') + '></video>'
        +   '<div class="vi-overlay"></div>'
        +   (dur ? '<span class="vi-dur">' + dur + '</span>' : '')
        +   '<div class="vi-play">&#9654;</div>'
        +   '<div class="vi-meta">'
        +     '<div class="vi-cat">' + cat + '</div>'
        +     '<h4>' + title + '</h4>'
        +   '</div>'
        + '</div>';
    }).join('');

    grid.innerHTML = html;
    attachVideoHoverAndModal(grid);
  }

  /* =====================================================================
   * MEDIA · FOTOS (section #ojo · editorial feed, grouped by month)
   * =================================================================== */
  var MONTH_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

  function _photoGroupKey(m){
    var raw = m.createdAt || m.created_at || m.date || '';
    if (raw) {
      var d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return { key: d.getFullYear() + '-' + (d.getMonth()+1), year: d.getFullYear(), month: d.getMonth(), ts: d.getTime() };
      }
    }
    return { key: 'archivo', year: null, month: null, ts: 0 };
  }

  /* Size pattern used to break the editorial rhythm.
     Repeats every 7 tiles: FEAT · third · third · wide · half · half · half. */
  var FEED_PATTERN = ['feat', 'third', 'third', 'wide', 'half', 'half', 'half'];

  /* ----- Estado módulo para fotos: filtros + paginación ----- */
  var _fotoAllItems = [];
  var _fotoFilter = '*';
  var _fotoVisibleCount = 0;
  var FOTO_BATCH_INITIAL = 12;
  var FOTO_BATCH_STEP = 12;

  async function wireFotos(){
    var feed = document.getElementById('masonry');
    if (!feed) return;
    try {
      var items = await fetchJSON('/api/media?kind=foto');
      if (!Array.isArray(items) || !items.length) {
        items = [
          ['med_fo_arbol-otono-gente','Arbol Otono Gente','Flora & fauna','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Arbol_Otono_Gente.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Arbol_Otono_Gente.webp'],
          ['med_fo_autos-autopista-elevada','Autos Autopista Elevada','Calle','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Autos_Autopista_Elevada.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Autos_Autopista_Elevada.webp'],
          ['med_fo_chinatown-noche','Chinatown Noche','Calle','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Chinatown_Noche.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Chinatown_Noche.webp'],
          ['med_fo_estatua-libertad-atardecer','Estatua Libertad Atardecer','Estatuas','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Estatua_Libertad_Atardecer.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Estatua_Libertad_Atardecer.webp'],
          ['med_fo_flor-azul-agapanto','Flor Azul Agapanto','Flora & fauna','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Flor_Azul_Agapanto.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Flor_Azul_Agapanto.webp'],
          ['med_fo_obelisco-buenosaires','Obelisco Buenos Aires','Estatuas','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/ojo/Redes_Obelisco_BuenosAires.webp','https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/thumbs/ojo/Redes_Obelisco_BuenosAires.webp']
        ].map(function(f, i){
          return { id: f[0], title: f[1], category: f[2], mediaUrl: f[3], coverImage: f[4], thumbUrl: f[4], active: true, sortOrder: i };
        });
      }

      _fotoAllItems = items.slice();
      _fotoAllItems.forEach(function(m, i){ m._idx = i; });
      _fotoFilter = '*';
      _fotoVisibleCount = FOTO_BATCH_INITIAL;

      /* Chips de filtro con contadores por categoría */
      var filters = document.getElementById('ojoFilters');
      if (filters) {
        var cats = {};
        var counts = {};
        items.forEach(function(m){
          var c = (m.category || '').toLowerCase().trim();
          if (!c) return;
          cats[c] = (m.category || '').trim();
          counts[c] = (counts[c] || 0) + 1;
        });
        var catEntries = Object.keys(cats).sort(function(a, b){ return counts[b] - counts[a]; });
        var chipsHtml = '<button class="active" data-filter="*" data-cursor="VER">Todo · ' + items.length + '</button>'
          + catEntries.map(function(c){
              return '<button data-filter="' + esc(c) + '" data-cursor="VER">' + esc(cats[c]) + ' · ' + counts[c] + '</button>';
            }).join('');
        filters.innerHTML = chipsHtml;
      }

      _renderFotoGrid(feed);
      attachPhotoFilters();
      attachPhotoLightbox(feed);
    } catch(err) {
      console.error('[wireFotos]', err);
    }
  }

  function _fotoFiltered(){
    if (_fotoFilter === '*') return _fotoAllItems;
    return _fotoAllItems.filter(function(m){
      return (m.category || '').toLowerCase().trim() === _fotoFilter;
    });
  }

  function _renderFotoGrid(feed){
    var list = _fotoFiltered();
    var shown = list.slice(0, _fotoVisibleCount);
    var tilesHtml = shown.map(function(m, i){
      var num = String(i + 1).padStart(3, '0');
      var cat = esc((m.category || '').toLowerCase());
      var catLabel = esc((m.category || '').toUpperCase() || '—');
      var title = esc(m.title || 'Sin título');
      var img = esc(m.thumbUrl || m.coverImage || m.mediaUrl || '');
      return '<figure class="feed-tile no-steal steal-watermark" data-cat="' + cat + '" data-cursor="ABRIR" data-title="' + title + '">'
        +   '<div class="ft-img"><img src="' + img + '" alt="' + title + '" loading="lazy" draggable="false"/></div>'
        +   '<figcaption class="ft-caption">'
        +     '<span class="fc-num">' + num + '</span>'
        +     '<span class="fc-title">' + title + '</span>'
        +     '<span class="fc-cat">' + catLabel + '</span>'
        +   '</figcaption>'
        + '</figure>';
    }).join('');

    var gridHtml = '<div class="feed-grid feed-grid--compact">' + tilesHtml + '</div>';
    var rest = list.length - _fotoVisibleCount;
    if (rest > 0) {
      var more = Math.min(rest, FOTO_BATCH_STEP);
      gridHtml += '<div class="feed-more-wrap">'
        +   '<button class="feed-more" id="fotoVerMas" type="button" data-cursor="VER">'
        +     'mostrar ' + more + ' más '
        +     '<span class="feed-more__badge">' + (list.length - rest) + ' / ' + list.length + '</span>'
        +   '</button>'
        + '</div>';
    } else if (list.length > FOTO_BATCH_INITIAL) {
      gridHtml += '<div class="feed-more-wrap">'
        +   '<button class="feed-more feed-more--collapse" id="fotoVerMenos" type="button" data-cursor="VER">'
        +     'mostrar menos'
        +   '</button>'
        + '</div>';
    }

    feed.innerHTML = gridHtml;
    setImagePreload(shown.length ? (shown[0].thumbUrl || shown[0].coverImage || shown[0].mediaUrl || '') : '');
    _wireFotoMoreBtn(feed);
  }

  function _wireFotoMoreBtn(feed){
    var moreBtn = feed.querySelector('#fotoVerMas');
    if (moreBtn) {
      moreBtn.addEventListener('click', function(){
        _fotoVisibleCount += FOTO_BATCH_STEP;
        _renderFotoGrid(feed);
        /* mantener foco en el nuevo botón */
        var nb = feed.querySelector('#fotoVerMas, #fotoVerMenos');
        if (nb) nb.focus();
      });
    }
    var lessBtn = feed.querySelector('#fotoVerMenos');
    if (lessBtn) {
      lessBtn.addEventListener('click', function(){
        _fotoVisibleCount = FOTO_BATCH_INITIAL;
        _renderFotoGrid(feed);
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* =====================================================================
   * MEDIA · WALLPAPERS (section #pixel)
   * =================================================================== */
  /* ----- Estado módulo para wallpapers ----- */
  var _wallAllItems = [];
  var _wallFilter = '*';
  var _wallVisibleCount = 0;
  var _wallCtaHtml = '';
  var WALL_BATCH_INITIAL = 8;
  var WALL_BATCH_STEP = 8;

  async function wireWallpapers(){
    var grid = document.getElementById('wallGrid');
    if (!grid) return;
    try {
      var items = await fetchJSON('/api/media?kind=wallpaper');
      /* Preserve the wall-cta at the end */
      var cta = grid.querySelector('.wall-cta');
      _wallCtaHtml = cta ? cta.outerHTML : '';
      if (!Array.isArray(items) || !items.length) {
        return;
      }

      _wallAllItems = items.slice();
      _wallFilter = '*';
      _wallVisibleCount = WALL_BATCH_INITIAL;

      /* Chips con contadores */
      var filters = document.getElementById('wallFilters');
      if (filters) {
        var cats = {};
        var counts = {};
        items.forEach(function(m){
          var c = (m.category || '').toLowerCase().trim();
          if (!c) return;
          cats[c] = (m.category || '').trim();
          counts[c] = (counts[c] || 0) + 1;
        });
        var catEntries = Object.keys(cats).sort(function(a, b){ return counts[b] - counts[a]; });
        var chipsHtml = '<button class="active" data-filter="*" data-cursor="VER">Todo · ' + items.length + '</button>'
          + catEntries.map(function(c){
              return '<button data-filter="' + esc(c) + '" data-cursor="VER">' + esc(cats[c]) + ' · ' + counts[c] + '</button>';
            }).join('');
        filters.innerHTML = chipsHtml;
      }

      _renderWallGrid(grid);
      attachWallpaperFilters();
    } catch(err) {
      console.error('[wireWallpapers]', err);
    }
  }

  function _wallFiltered(){
    if (_wallFilter === '*') return _wallAllItems;
    return _wallAllItems.filter(function(m){
      return (m.category || '').toLowerCase().trim() === _wallFilter;
    });
  }

  function _renderWallGrid(grid){
    var list = _wallFiltered();
    var shown = list.slice(0, _wallVisibleCount);
    var html = shown.map(function(m, idx){
      var thumb = esc(m.thumbUrl || m.coverImage || m.mediaUrl || '');
      var full = esc(m.mediaUrl || m.coverImage || '');
      var name = esc(m.title || 'Wallpaper');
      var res = esc(m.description || '4K · 2160×3840');
      var cat = esc((m.category || '').toLowerCase());
      var eagerAttr = idx < 8 ? ' loading="eager" fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
      if (m.isLocked) {
        return '<div class="wall locked no-steal steal-watermark" data-cat="' + cat + '" data-cursor="MAIL" data-wall-locked="1" role="button" tabindex="0"'
          + ' data-wall-id="' + esc(m.id) + '" data-wall-thumb="' + thumb + '" data-wall-full="' + full + '" data-wall-title="' + name + '">'
          + '<img src="' + thumb + '" alt="' + name + '"' + eagerAttr + ' draggable="false"/>'
          + '<div class="w-overlay"></div>'
          + '<span class="w-btn">ver &rarr;</span>'
          + '<div class="w-meta"><span class="w-name">' + name + '</span><span class="w-res">' + res + '</span></div>'
          + '</div>';
      }
      return '<div class="wall no-steal steal-watermark" data-cat="' + cat + '" data-cursor="BAJAR" data-wall-id="' + esc(m.id) + '" data-wall-thumb="' + thumb + '" data-wall-full="' + full + '" data-wall-title="' + name + '">'
        + '<img src="' + thumb + '" alt="' + name + '"' + eagerAttr + ' draggable="false"/>'
        + '<div class="w-overlay"></div>'
        + '<span class="w-btn">&darr; bajar</span>'
        + '<div class="w-meta"><span class="w-name">' + name + '</span><span class="w-res">' + res + '</span></div>'
        + '</div>';
    }).join('');

    var extra = '';
    var rest = list.length - _wallVisibleCount;
    if (rest > 0) {
      var more = Math.min(rest, WALL_BATCH_STEP);
      extra = '<div class="feed-more-wrap wall-more-wrap">'
        +   '<button class="feed-more" id="wallVerMas" type="button" data-cursor="VER">'
        +     'mostrar ' + more + ' más '
        +     '<span class="feed-more__badge">' + (list.length - rest) + ' / ' + list.length + '</span>'
        +   '</button>'
        + '</div>';
    } else if (list.length > WALL_BATCH_INITIAL) {
      extra = '<div class="feed-more-wrap wall-more-wrap">'
        +   '<button class="feed-more feed-more--collapse" id="wallVerMenos" type="button" data-cursor="VER">mostrar menos</button>'
        + '</div>';
    }

    grid.innerHTML = html + _wallCtaHtml + extra;
    attachWallpaperDownloads(grid);
    _wireWallMoreBtn(grid);
  }

  function _wireWallMoreBtn(grid){
    var more = grid.querySelector('#wallVerMas');
    if (more) {
      more.addEventListener('click', function(){
        _wallVisibleCount += WALL_BATCH_STEP;
        _renderWallGrid(grid);
      });
    }
    var less = grid.querySelector('#wallVerMenos');
    if (less) {
      less.addEventListener('click', function(){
        _wallVisibleCount = WALL_BATCH_INITIAL;
        _renderWallGrid(grid);
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function attachWallpaperFilters(){
    var filters = document.getElementById('wallFilters');
    var grid = document.getElementById('wallGrid');
    if (!filters || !grid) return;
    /* Defensive clone-replace to strip old listeners */
    var clone = filters.cloneNode(true);
    filters.parentNode.replaceChild(clone, filters);
    clone.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      clone.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      _wallFilter = btn.getAttribute('data-filter');
      _wallVisibleCount = WALL_BATCH_INITIAL;
      _renderWallGrid(grid);
    });
  }

  /* =====================================================================
   * MEDIA · CANCIONES SUNO (section #sonido)
   * =================================================================== */

  /* Detect streaming platform from embed URL — ported from src/lib/songEmbed.ts.
     Returns { platform, embedSrc, externalUrl, label, shape } or null. */
  function parseSunoEmbed(raw){
    if (!raw) return null;
    var url;
    try { url = new URL(String(raw).trim()); } catch(e){ return null; }
    var host = url.hostname.replace(/^www\./, '').toLowerCase();
    // Spotify
    if (host === 'open.spotify.com' || host === 'spotify.com'){
      var segs = url.pathname.split('/').filter(Boolean);
      if (segs[0] && segs[0].indexOf('intl-') === 0) segs.shift();
      var type = segs[0], id = segs[1];
      if (!type || !id) return null;
      if (['track','album','playlist','artist','episode','show'].indexOf(type) < 0) return null;
      return { platform: 'spotify', embedSrc: 'https://open.spotify.com/embed/' + type + '/' + id + '?utm_source=balosky', externalUrl: url.toString(), label: 'Spotify', shape: 'audio' };
    }
    // YouTube
    if (host === 'youtu.be'){
      var yid = url.pathname.split('/').filter(Boolean)[0];
      if (!yid) return null;
      return { platform: 'youtube', embedSrc: 'https://www.youtube.com/embed/' + yid, externalUrl: url.toString(), label: 'YouTube', shape: 'video' };
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com'){
      var v = url.searchParams.get('v');
      if (v) return { platform: 'youtube', embedSrc: 'https://www.youtube.com/embed/' + v, externalUrl: url.toString(), label: 'YouTube', shape: 'video' };
      var m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) return { platform: 'youtube', embedSrc: 'https://www.youtube.com/embed/' + m[1], externalUrl: url.toString(), label: 'YouTube', shape: 'video' };
      return null;
    }
    // Apple Music
    if (host === 'music.apple.com'){
      var embed = new URL(url.toString());
      embed.hostname = 'embed.music.apple.com';
      return { platform: 'apple-music', embedSrc: embed.toString(), externalUrl: url.toString(), label: 'Apple Music', shape: 'audio' };
    }
    return null;
  }

  /* Turn a title into a URL-safe slug (deep-link anchor). */
  function _slugify(s){
    if (!s) return '';
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  /* strip accents */
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  /* Friendly "hace N días" / "3.2K" style. */
  function _formatPlays(n){
    n = Number(n || 0);
    if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  /* Module-level state for the SUNO list so sort/filter can re-render. */
  var _sunoAllItems = [];
  var _sunoSortMode = 'orden';   /* orden | recientes | titulo | mas */
  var _sunoFilter = '__all';

  async function wireCanciones(){
    var wrap = document.getElementById('sunoWrap');
    if (!wrap) return;
    var items = await fetchJSON('/api/media?kind=cancion');
    if (!Array.isArray(items) || !items.length) {
      items = [
        {
          id: 'med_ca_1776453374762',
          title: 'Robaron a Balosky',
          category: 'Temas Propios',
          mediaUrl: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/robaron-a-a-balosky-1776453374494.mp3',
          coverImage: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/robaron-a-a-balosky-cover-1776453374692.jpg',
          duration: '3:43',
          sortOrder: 1,
          active: true
        },
        {
          id: 'med_ca_1776453374767',
          title: 'Tin Cup Anthem (v2)',
          category: 'Temas Propios',
          mediaUrl: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/tin-cup-anthem-2--1776453374495.mp3',
          coverImage: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/tin-cup-anthem-2-cover-1776453374606.jpg',
          duration: '3:18',
          sortOrder: 2,
          active: true
        },
        {
          id: 'med_ca_1776453375592',
          title: 'Ai, ai, ai, ai',
          category: 'Temas Propios',
          mediaUrl: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/ai-ai-ai-ai--1776453375528.mp3',
          coverImage: 'https://uxry85cxugshfbr5.public.blob.vercel-storage.com/uploads/2026/04/ai-ai-ai-ai-cover-1776453375563.jpg',
          duration: '2:37',
          sortOrder: 5,
          active: true
        }
      ];
    }

    /* Filter soft-deleted, keep original order as baseline */
    items = items.filter(function(m){ return m.active !== false; });
    items.sort(function(a,b){ return (a.sortOrder||0) - (b.sortOrder||0); });
    _sunoAllItems = items;

    /* Collect categories in a canonical order */
    var ORDER = ['Temas Propios', 'Música Temática', 'Electrónica'];
    var groups = {};
    items.forEach(function(m){
      var cat = (m.category || 'Otros').trim() || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    var cats = Object.keys(groups);
    cats.sort(function(a,b){
      var ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    });

    var allCount = items.length;
    var playableCount = items.filter(function(m){ return Boolean(m.mediaUrl || m.embedUrl); }).length;
    var chipsHtml = '<button type="button" class="suno-chip is-active" data-filter="__all">Todas <b>' + allCount + '</b></button>'
      + cats.map(function(c){
          return '<button type="button" class="suno-chip" data-filter="' + esc(c) + '">' + esc(c) + ' <b>' + groups[c].length + '</b></button>';
        }).join('');

    var availabilityHtml = ''
      + '<div class="suno-availability" aria-live="polite">'
        + '<div class="suno-availability__copy">'
          + '<span class="suno-availability__kicker">catálogo disponible</span>'
          + '<strong>' + playableCount + ' de ' + allCount + ' canciones listas para escuchar</strong>'
          + '<small>MP3 propios y links oficiales, ordenados desde el admin.</small>'
        + '</div>'
        + '<div class="suno-availability__actions">'
          + '<button type="button" class="suno-availability__btn" data-suno-action="first" data-cursor="PLAY">Escuchar ahora</button>'
          + '<button type="button" class="suno-availability__btn suno-availability__btn--ghost" data-suno-action="shuffle" data-cursor="RANDOM">Random</button>'
        + '</div>'
      + '</div>';

    var sortHtml = ''
      + '<div class="suno-sort" role="group" aria-label="Ordenar canciones">'
        + '<button type="button" class="suno-sort__btn is-active" data-sort="orden" data-cursor="ORDEN">Orden</button>'
        + '<button type="button" class="suno-sort__btn" data-sort="recientes" data-cursor="NUEVO">Recientes</button>'
        + '<button type="button" class="suno-sort__btn" data-sort="titulo" data-cursor="A–Z">A–Z</button>'
        + '<button type="button" class="suno-sort__btn" data-sort="mas" data-cursor="TOP">+ escuchados</button>'
        + '<button type="button" class="suno-sort__btn suno-sort__shuffle" data-sort="__shuffle" data-cursor="SHUFFLE" aria-label="Reproducir aleatorio">⇋ Random</button>'
      + '</div>';

    wrap.innerHTML = ''
      + availabilityHtml
      + '<div class="suno-controls">'
        + '<div class="suno-chipbar" role="tablist" aria-label="Filtrar canciones">' + chipsHtml + '</div>'
        + sortHtml
      + '</div>'
      + '<div class="suno-grid" id="sunoGrid"></div>';

    _renderSunoGrid();
    attachSunoPlayer(wrap);

    /* Deep link: if the URL arrived as #sonido/<slug>, open that track. */
    _handleSunoHash();
    window.addEventListener('hashchange', _handleSunoHash);
  }

  /* Render the grid using the current _sunoSortMode and _sunoFilter. */
  function _renderSunoGrid(){
    var grid = document.getElementById('sunoGrid');
    if (!grid) return;
    var items = _sunoAllItems.slice();

    if (_sunoFilter !== '__all'){
      items = items.filter(function(m){ return (m.category || '') === _sunoFilter; });
    }

    if (_sunoSortMode === 'recientes'){
      items.sort(function(a,b){ return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    } else if (_sunoSortMode === 'titulo'){
      items.sort(function(a,b){ return String(a.title || '').localeCompare(String(b.title || ''), 'es'); });
    } else if (_sunoSortMode === 'mas'){
      items.sort(function(a,b){ return (b.playCount || 0) - (a.playCount || 0); });
    } else {
      items.sort(function(a,b){ return (a.sortOrder||0) - (b.sortOrder||0); });
    }

    var now = Date.now();
    var FOURTEEN = 14 * 24 * 60 * 60 * 1000;
    grid.innerHTML = items.map(function(m){
      var title = esc(m.title || 'Sin título');
      var cat = esc((m.category || '').trim());
      var dur = esc(m.duration || '');
      var mediaUrl = m.mediaUrl || '';
      var cover = m.coverImage || '';
      var info = parseSunoEmbed(m.embedUrl);
      var plays = Number(m.playCount || 0);
      var createdTs = m.createdAt ? Date.parse(m.createdAt) : NaN;
      var isNew = isFinite(createdTs) && (now - createdTs) < FOURTEEN;
      var slug = _slugify(m.title || m.id);
      var description = m.description ? String(m.description) : '';
      var badge = info
        ? '<span class="suno-badge suno-badge--' + info.platform + '">' + esc(info.label) + '</span>'
        : (mediaUrl ? '<span class="suno-badge suno-badge--mp3">MP3</span>' : '');
      var newRibbon = isNew ? '<span class="suno-card__ribbon">NUEVO</span>' : '';
      var dataAttrs = ''
        + ' data-id="' + esc(m.id) + '"'
        + ' data-title="' + title + '"'
        + ' data-slug="' + esc(slug) + '"'
        + ' data-src="' + esc(mediaUrl) + '"'
        + ' data-embed="' + (info ? esc(info.embedSrc) : '') + '"'
        + ' data-shape="' + (info ? info.shape : 'audio') + '"'
        + ' data-platform="' + (info ? info.platform : (mediaUrl ? 'mp3' : 'none')) + '"'
        + ' data-external="' + (info ? esc(info.externalUrl) : '') + '"'
        + ' data-category="' + cat + '"'
        + ' data-description="' + esc(description) + '"'
        + ' data-cover="' + esc(cover) + '"'
        + ' data-plays="' + plays + '"'
        + ' data-created="' + esc(m.createdAt || '') + '"';
      var coverHtml = cover
        ? '<img class="suno-card__cover" src="' + esc(cover) + '" alt="" loading="lazy"/>'
        : '<div class="suno-card__cover suno-card__cover--fallback"><span>' + esc((m.title || '?').substring(0, 2).toUpperCase()) + '</span></div>';
      var playIcon = info
        ? (info.platform === 'youtube' ? '▶' : '♫')
        : '▶';
      var playsHtml = plays > 0
        ? '<span class="suno-card__plays" aria-label="' + plays + ' reproducciones">▶ ' + _formatPlays(plays) + '</span>'
        : '';
      return '<button type="button" class="suno-card" data-cursor="PLAY"' + dataAttrs + ' aria-label="Reproducir ' + title + '">'
        + '<div class="suno-card__art">'
          + coverHtml
          + '<div class="suno-card__overlay"><span class="suno-card__play" aria-hidden="true">' + playIcon + '</span></div>'
          + (badge ? '<div class="suno-card__badges">' + badge + '</div>' : '')
          + newRibbon
        + '</div>'
        + '<div class="suno-card__body">'
          + '<h4 class="suno-card__title">' + title + '</h4>'
          + '<p class="suno-card__meta">' + (cat ? cat : '—') + (dur ? ' · ' + dur : '') + '</p>'
          + playsHtml
        + '</div>'
      + '</button>';
    }).join('');

    /* Re-wire card clicks only (chips/sort were wired once on outer wrap) */
    _wireSunoCardClicks(grid);
  }

  function _wireSunoCardClicks(grid){
    grid.querySelectorAll('.suno-card').forEach(function(card){
      card.addEventListener('click', function(){ _openSunoModal(card); });
    });
  }

  /* Parse location.hash like "#sonido/mi-tema" and open the matching card. */
  function _handleSunoHash(){
    var h = window.location.hash || '';
    var m = h.match(/^#sonido\/(.+)$/);
    if (!m) return;
    var slug = decodeURIComponent(m[1]);
    /* Defer one frame so the grid is already rendered */
    requestAnimationFrame(function(){
      var card = document.querySelector('.suno-card[data-slug="' + slug.replace(/"/g, '\\"') + '"]');
      if (card) _openSunoModal(card);
    });
  }

  /* =====================================================================
   * SOCIALS (section #redes)
   * =================================================================== */
  async function wireSocials(){
    var container = document.querySelector('#redes .redes-grid');
    if (!container) return;
    var items = await fetchJSON('/api/socials');
    if (!Array.isArray(items) || !items.length) {
      hideSectionById('redes');
      return;
    }

    function socialClass(platform){
      var p = String(platform || '').toLowerCase();
      if (p.includes('insta')) return 'is-instagram';
      if (p.includes('tiktok')) return 'is-tiktok';
      if (p.includes('spotify')) return 'is-spotify';
      if (p.includes('apple')) return 'is-apple';
      if (p.includes('youtube') || p === 'yt') return 'is-youtube';
      return 'is-link';
    }

    function normalizedUrl(value){
      var raw = String(value || '').trim();
      if (!raw) return '#';
      if (/^(https?:|mailto:|tel:|\/|#)/i.test(raw)) return raw;
      return 'https://' + raw;
    }

    var html = items.map(function(s){
      var icon = esc(s.icon || (s.platform || '?').substring(0,2).toUpperCase());
      var name = esc(s.name || s.platform || '');
      var handle = esc(s.handle || '');
      var urlRaw = normalizedUrl(s.url);
      var url = esc(urlRaw);
      var cursor = esc((s.platform || 'LINK').toUpperCase());
      var cls = socialClass(s.platform || s.name);
      var style = '';
      if (s.colorFrom && s.colorTo) {
        style = ' style="--red-from:' + esc(s.colorFrom) + ';--red-to:' + esc(s.colorTo) + ';"';
      }
      var target = /^https?:\/\//i.test(urlRaw) ? ' target="_blank" rel="noopener"' : '';
      return '<a class="red-card ' + cls + '" href="' + url + '"' + target + ' data-cursor="' + cursor + '" aria-label="' + name + ' ' + handle + '"' + style + '>'
        + '<span class="r-asset" aria-hidden="true"><span></span></span>'
        + '<span class="r-glass" aria-hidden="true"></span>'
        + '<div class="r-icon">' + icon + '</div>'
        + '<div><div class="r-name">' + name + '</div><div class="r-handle">' + handle + '</div></div>'
        + '<span class="r-arrow">&#8599;</span>'
        + '</a>';
    }).join('');

    container.innerHTML = html;
  }

  /* =====================================================================
   * Handler attachers (re-usable after innerHTML swap)
   * =================================================================== */
  function attachVideoHoverAndModal(grid){
    var modal = document.getElementById('mediaModal');
    var content = document.getElementById('mmContent');
    if (!modal || !content) return;

    function openMedia(html){
      content.innerHTML = html;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      _syncTouchWatermarkBoost();
      trackPlausible('media_open', { target: 'video_ia' });
    }

    if (!modal.dataset.touchBoostWired) {
      modal.dataset.touchBoostWired = '1';
      var modalObserver = new MutationObserver(function(){
        _syncTouchWatermarkBoost();
      });
      modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    var isTouch = window.matchMedia('(pointer: coarse)').matches;
    grid.querySelectorAll('.vi-tile').forEach(function(tile){
      var v = tile.querySelector('video');
      if (v) {
        var src = tile.getAttribute('data-video');
        /* Set source lazily: on first hover / click */
        var loadSrc = function(){
          if (!v.src && src) {
            var s = document.createElement('source');
            s.src = src;
            v.appendChild(s);
            try { v.load(); } catch(e){}
          }
        };
        if (!isTouch) {
          tile.addEventListener('mouseenter', function(){ loadSrc(); try { v.play(); } catch(e){} });
          tile.addEventListener('mouseleave', function(){ try { v.pause(); v.currentTime = 0; } catch(e){} });
        }
      }
      tile.addEventListener('click', function(e){
        if (e.target.closest('a')) return;
        var src = tile.getAttribute('data-video');
        var title = (tile.querySelector('.vi-meta h4') || {}).textContent || '';
        var cat = (tile.querySelector('.vi-cat') || {}).textContent || '';
        openMedia('<video src="'+esc(src)+'" controls autoplay playsinline></video><div class="mm-caption">'+esc(cat)+' · '+esc(title)+'</div>');
      });
    });
  }

  function attachPhotoLightbox(feed){
    var modal = document.getElementById('mediaModal');
    var content = document.getElementById('mmContent');
    var prevBtn = document.getElementById('mmPrev');
    var nextBtn = document.getElementById('mmNext');
    var counter = document.getElementById('mmCounter');
    if (!modal || !content) return;

    /* Build list of photo descriptors once (filtered to currently visible) */
    function collectItems(){
      var items = [];
      feed.querySelectorAll('.feed-tile').forEach(function(tile){
        if (tile.style.display === 'none') return;
        var img = tile.querySelector('img');
        if (!img) return;
        /* Prefer currentSrc (resolved by the browser) so lazy-loaded tiles still give us a real URL. */
        var src = img.currentSrc || img.src || img.getAttribute('src') || '';
        if (/images\.unsplash\.com/.test(src)) src = src.replace(/w=\d+/, 'w=1800');
        var title = tile.getAttribute('data-title') || '';
        var cat = (tile.querySelector('.fc-cat') || {}).textContent || '';
        var num = (tile.querySelector('.fc-num') || {}).textContent || '';
        var cap = [num, title, cat].filter(Boolean).join(' · ');
        items.push({ src: src, cap: cap });
      });
      return items;
    }

    var state = { items: [], idx: 0 };

    function render(){
      if (!state.items.length) return;
      var cur = state.items[state.idx];
      content.classList.add('is-gallery');
      /* loading="eager" so the image fires immediately inside the modal, onerror as a visible fallback */
      content.innerHTML = '<div class="mm-stage no-steal steal-watermark">'
        +   '<img src="'+esc(cur.src)+'" alt="" loading="eager" decoding="async" draggable="false"'
        +     ' onload="this.parentNode.classList.add(\'is-loaded\')"'
        +     ' onerror="this.parentNode.classList.add(\'is-error\'); this.style.display=\'none\';"/>'
        +   '<div class="mm-spinner" aria-hidden="true"></div>'
        +   '<div class="mm-fallback">no se pudo cargar la imagen · <a href="'+esc(cur.src)+'" target="_blank" rel="noopener">abrir en nueva pestaña</a></div>'
        + '</div>'
        + (cur.cap ? '<div class="mm-caption">'+esc(cur.cap)+'</div>' : '');
      if (counter) {
        counter.hidden = false;
        counter.textContent = (state.idx + 1) + ' / ' + state.items.length;
      }
      if (prevBtn) {
        prevBtn.hidden = state.items.length <= 1;
        prevBtn.disabled = state.idx <= 0;
      }
      if (nextBtn) {
        nextBtn.hidden = state.items.length <= 1;
        nextBtn.disabled = state.idx >= state.items.length - 1;
      }
    }

    function openAt(idx){
      state.items = collectItems();
      if (!state.items.length) return;
      state.idx = Math.max(0, Math.min(idx, state.items.length - 1));
      var current = state.items[state.idx];
      trackPlausible('photo_open', { title: current && current.cap ? current.cap : String(state.idx + 1) });
      render();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      _syncTouchWatermarkBoost();
    }

    function step(delta){
      if (!modal.classList.contains('open') || !state.items.length) return;
      if (!content.classList.contains('is-gallery')) return;
      var next = state.idx + delta;
      if (next < 0 || next >= state.items.length) return;
      state.idx = next;
      render();
    }

    feed.querySelectorAll('.feed-tile').forEach(function(tile){
      tile.addEventListener('click', function(){
        /* Compute visible index of the clicked tile */
        var visibles = [];
        feed.querySelectorAll('.feed-tile').forEach(function(t){
          if (t.style.display !== 'none') visibles.push(t);
        });
        var idx = visibles.indexOf(tile);
        openAt(idx < 0 ? 0 : idx);
      });
    });

    /* Attach controls + keyboard + swipe only once */
    if (!modal.dataset.galleryWired) {
      modal.dataset.galleryWired = '1';

      if (prevBtn) prevBtn.addEventListener('click', function(e){ e.stopPropagation(); step(-1); });
      if (nextBtn) nextBtn.addEventListener('click', function(e){ e.stopPropagation(); step(1); });

      document.addEventListener('keydown', function(e){
        if (!modal.classList.contains('open')) return;
        if (!content.classList.contains('is-gallery')) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      });

      /* Touch swipe */
      var touchStartX = 0, touchStartY = 0, touchActive = false;
      content.addEventListener('touchstart', function(e){
        if (!content.classList.contains('is-gallery')) return;
        var t = e.touches[0];
        touchStartX = t.clientX; touchStartY = t.clientY; touchActive = true;
      }, { passive: true });
      content.addEventListener('touchend', function(e){
        if (!touchActive) return;
        touchActive = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        var dy = t.clientY - touchStartY;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return; /* require horizontal swipe */
        if (dx < 0) step(1); else step(-1);
      }, { passive: true });

      /* When modal closes, reset gallery UI state */
      var resetObserver = new MutationObserver(function(){
        if (!modal.classList.contains('open')) {
          content.classList.remove('is-gallery');
          if (counter) { counter.hidden = true; counter.textContent = ''; }
          if (prevBtn) prevBtn.hidden = true;
          if (nextBtn) nextBtn.hidden = true;
          state.items = [];
          _syncTouchWatermarkBoost();
        }
      });
      resetObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function attachPhotoFilters(){
    var filters = document.getElementById('ojoFilters');
    var feed = document.getElementById('masonry');
    if (!filters || !feed) return;
    /* Defensive clone-replace to strip old listeners */
    var clone = filters.cloneNode(true);
    filters.parentNode.replaceChild(clone, filters);
    clone.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      clone.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      _fotoFilter = btn.getAttribute('data-filter');
      _fotoVisibleCount = FOTO_BATCH_INITIAL;
      _renderFotoGrid(feed);
      attachPhotoLightbox(feed);
    });
  }

  function attachWallpaperDownloads(grid){
    grid.querySelectorAll('.wall.locked').forEach(function(w){
      function openLocked(){
        var id = w.getAttribute('data-wall-id');
        var thumb = w.getAttribute('data-wall-thumb') || '';
        var full = w.getAttribute('data-wall-full') || thumb;
        var title = w.getAttribute('data-wall-title') || 'Wallpaper';
        if (!id) return;
        openWallpaperGate({ id: id, thumb: thumb, full: full, title: title });
      }
      w.addEventListener('click', openLocked);
      w.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLocked();
        }
      });
    });
    grid.querySelectorAll('.wall:not(.locked)').forEach(function(w){
      w.addEventListener('click', function(){
        var id = w.getAttribute('data-wall-id');
        var thumb = w.getAttribute('data-wall-thumb') || '';
        var full = w.getAttribute('data-wall-full') || thumb;
        var title = w.getAttribute('data-wall-title') || 'Wallpaper';
        var res = '';
        var resEl = w.querySelector('.w-res');
        if (resEl) res = resEl.textContent || '';
        if (!id) return;
        openWallpaperPreview({ id: id, thumb: thumb, full: full, title: title, res: res });
      });
    });
    attachWallpaperPreview();
    attachWallpaperGate();
  }

  /* =====================================================================
   * WALLPAPER PHONE PREVIEW (iPhone + Samsung mockups)
   * =================================================================== */
  var _wppReady = false;
  var _wppCurrent = null;
  var _wppDevice = 'ios';

  function _syncTouchWatermarkBoost(){
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    var body = document.body;
    if (!body) return;
    var active = false;
    ['wpPreview', 'wpGate', 'mediaModal'].forEach(function(id){
      var el = document.getElementById(id);
      if (el && el.classList.contains('open')) active = true;
    });
    body.classList.toggle('touch-watermark-boost', active);
  }

  function _setWallpaperPreviewDevice(device){
    _wppDevice = device === 'android' ? 'android' : 'ios';
    var tabs = document.querySelectorAll('#wppTabs button[data-dev]');
    var iph = document.querySelector('#wpPreview .phone-iphone');
    var sam = document.querySelector('#wpPreview .phone-samsung');

    tabs.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-dev') === _wppDevice);
    });
    if (iph) iph.classList.toggle('shown', _wppDevice === 'ios');
    if (sam) sam.classList.toggle('shown', _wppDevice === 'android');
  }

  function _formatLockscreenDate(){
    try {
      var d = new Date();
      var days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return days[d.getDay()] + ' · ' + d.getDate() + ' ' + months[d.getMonth()];
    } catch(_) {
      return 'lunes · 17 abr';
    }
  }
  function _formatLockscreenTime(){
    try {
      var d = new Date();
      var h = d.getHours();
      var m = d.getMinutes();
      return h + ':' + (m < 10 ? '0' : '') + m;
    } catch(_) {
      return '9:41';
    }
  }

  function openWallpaperPreview(wp){
    var pre = document.getElementById('wpPreview');
    if (!pre) return;
    _wppCurrent = wp || null;
    var src = (wp && (wp.thumb || wp.full)) || '';
    var hero = document.getElementById('wppHero');
    var iph = document.getElementById('wppIphone');
    var sam = document.getElementById('wppSamsung');
    var tEl = document.getElementById('wppTitle');
    var rEl = document.getElementById('wppRes');
    if (hero) hero.setAttribute('src', src);
    if (iph) iph.setAttribute('src', src);
    if (sam) sam.setAttribute('src', src);
    if (tEl) tEl.textContent = (wp && wp.title) || 'Wallpaper';
    if (rEl) rEl.textContent = (wp && wp.res) || '4K · 2160×3840';

    var time = _formatLockscreenTime();
    var date = _formatLockscreenDate();
    var it = document.getElementById('wppIphoneTime'); if (it) it.textContent = time;
    var id = document.getElementById('wppIphoneDate'); if (id) id.textContent = date;
    var st = document.getElementById('wppSamsungTime'); if (st) st.textContent = time;
    var sd = document.getElementById('wppSamsungDate'); if (sd) sd.textContent = date;

    _setWallpaperPreviewDevice('ios');
    trackPlausible('wallpaper_preview_open', { id: (wp && wp.id) || '', title: (wp && wp.title) || 'Wallpaper' });
    pre.classList.add('open');
    document.body.style.overflow = 'hidden';
    _syncTouchWatermarkBoost();
  }

  function closeWallpaperPreview(){
    var pre = document.getElementById('wpPreview');
    if (!pre) return;
    pre.classList.remove('open');
    /* Only unlock scroll if the paywall isn't also open */
    var gate = document.getElementById('wpGate');
    if (!gate || !gate.classList.contains('open')) {
      document.body.style.overflow = '';
    }
    _syncTouchWatermarkBoost();
  }

  function attachWallpaperPreview(){
    if (_wppReady) return;
    var pre = document.getElementById('wpPreview');
    if (!pre) return;
    _wppReady = true;

    var closeBtn = document.getElementById('wppClose');
    var cancelBtn = document.getElementById('wppCancel');
    var dlBtn = document.getElementById('wppDownload');
    var tabs = document.querySelectorAll('#wppTabs button[data-dev]');

    if (closeBtn) closeBtn.addEventListener('click', closeWallpaperPreview);
    if (cancelBtn) cancelBtn.addEventListener('click', closeWallpaperPreview);
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        _setWallpaperPreviewDevice(tab.getAttribute('data-dev') || 'ios');
      });
    });
    pre.addEventListener('click', function(e){ if (e.target === pre) closeWallpaperPreview(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && pre.classList.contains('open')) closeWallpaperPreview();
    });

    if (dlBtn) dlBtn.addEventListener('click', function(){
      if (!_wppCurrent) return;
      /* Handoff to existing email-gate flow */
      closeWallpaperPreview();
      openWallpaperGate({
        id: _wppCurrent.id,
        thumb: _wppCurrent.thumb,
        title: _wppCurrent.title,
      });
    });
  }

  /* =====================================================================
   * WALLPAPER PAYWALL (email gate + signed download token)
   * =================================================================== */
  var _wpGateReady = false;
  var _wpCurrent = null;

  function openWallpaperGate(wp){
    var gate = document.getElementById('wpGate');
    if (!gate) return;
    _wpCurrent = wp || null;
    var thumbEl = document.getElementById('wpThumb');
    var titleEl = document.getElementById('wpTitle');
    var msg = document.getElementById('wpMsg');
    var email = document.getElementById('wpEmail');
    if (thumbEl) thumbEl.setAttribute('src', wp && wp.thumb ? wp.thumb : '');
    if (titleEl) titleEl.textContent = wp && wp.title ? ('Descargar · ' + wp.title) : 'Descargalo gratis';
    if (msg) { msg.className = 'wp-msg'; msg.textContent = ''; }
    gate.classList.add('open');
    document.body.style.overflow = 'hidden';
    _syncTouchWatermarkBoost();
    if (email) setTimeout(function(){ try { email.focus(); } catch(_){} }, 60);
  }

  function closeWallpaperGate(){
    var gate = document.getElementById('wpGate');
    if (!gate) return;
    gate.classList.remove('open');
    document.body.style.overflow = '';
    _syncTouchWatermarkBoost();
  }

  function attachWallpaperGate(){
    if (_wpGateReady) return;
    var gate = document.getElementById('wpGate');
    if (!gate) return;
    _wpGateReady = true;

    var closeBtn = document.getElementById('wpClose');
    var form = document.getElementById('wpForm');
    var email = document.getElementById('wpEmail');
    var btn = document.getElementById('wpSubmit');
    var msg = document.getElementById('wpMsg');

    if (closeBtn) closeBtn.addEventListener('click', closeWallpaperGate);
    gate.addEventListener('click', function(e){ if (e.target === gate) closeWallpaperGate(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && gate.classList.contains('open')) closeWallpaperGate();
    });

    var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    function setMsg(kind, text){
      if (!msg) return;
      msg.className = 'wp-msg ' + (kind || '');
      msg.textContent = text || '';
    }

    if (form) form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      if (!_wpCurrent || !_wpCurrent.id) { setMsg('err', 'Wallpaper no disponible'); return; }
      var addr = (email && email.value || '').trim();
      if (!EMAIL_RE.test(addr)) { setMsg('err', 'Mail inválido'); if (email) email.focus(); return; }
      btn.setAttribute('disabled', 'disabled');
      var originalText = btn.textContent;
      btn.textContent = 'Generando…';
      setMsg('info', 'Generando link…');
      try {
        var res = await fetch('/api/wallpapers/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: addr, wallpaperId: _wpCurrent.id })
        });
        var data = null;
        try { data = await res.json(); } catch(_) {}
        if (!res.ok || !data || !data.downloadUrl) {
          setMsg('err', (data && data.error) || 'Algo falló, probá de nuevo');
          return;
        }
        setMsg('ok', 'Listo. Descargando…');
        /* Trigger the download via the signed URL */
        var a = document.createElement('a');
        a.href = data.downloadUrl;
        a.rel = 'noopener';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        trackPlausible('wallpaper_download', { id: _wpCurrent.id, title: _wpCurrent.title || 'Wallpaper' });
        setTimeout(function(){
          if (gate.classList.contains('open')) {
            closeWallpaperGate();
          }
        }, 1200);
      } catch (e) {
        console.warn('[wallpapers] error', e);
        setMsg('err', 'Error de red');
      } finally {
        btn.removeAttribute('disabled');
        btn.textContent = originalText;
      }
    });
  }

  /* --------------------------------------------------------------------
   * Liquid-glass modal player with real-time visualizer
   * ------------------------------------------------------------------ */
  var _sunoModal = null;
  var _sunoAudioCtx = null;
  var _sunoAnalyser = null;
  var _sunoSource = null;
  var _sunoRAF = null;
  var _sunoVizMode = 'bars';
  /* Persistent audio element (for MP3) — survives modal close so the
     mini-player can keep playing. Created lazily on first MP3 open. */
  var _sunoAudio = null;
  /* Currently-open card context */
  var _sunoCurrentCard = null;
  var _sunoMiniPlayer = null;
  /* Queue for prev/next/auto-next: snapshot of visible cards at open time */
  var _sunoQueue = [];
  var _sunoQueueIdx = -1;
  /* Play-count bookkeeping: we only POST once per open to avoid spam. */
  var _sunoLoggedThisOpen = false;

  function attachSunoPlayer(wrap){
    /* Filter chips: show only cards matching selected category (and re-sort) */
    wrap.addEventListener('click', function(e){
      var action = e.target.closest('[data-suno-action]');
      if (action && wrap.contains(action)){
        var kind = action.getAttribute('data-suno-action');
        var cards = Array.prototype.slice.call(wrap.querySelectorAll('.suno-card'));
        if (!cards.length) return;
        var pick = kind === 'shuffle'
          ? cards[Math.floor(Math.random() * cards.length)]
          : cards[0];
        _openSunoModal(pick, { shuffle: kind === 'shuffle' });
        return;
      }
      var chip = e.target.closest('.suno-chip');
      if (chip && wrap.contains(chip)){
        wrap.querySelectorAll('.suno-chip').forEach(function(c){ c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        _sunoFilter = chip.getAttribute('data-filter') || '__all';
        _renderSunoGrid();
        return;
      }
      var sortBtn = e.target.closest('.suno-sort__btn');
      if (sortBtn && wrap.contains(sortBtn)){
        var s = sortBtn.getAttribute('data-sort') || 'orden';
        if (s === '__shuffle'){
          /* Pick a random card from the currently visible grid and play it */
          var cards = Array.prototype.slice.call(wrap.querySelectorAll('.suno-card'));
          if (!cards.length) return;
          var pick = cards[Math.floor(Math.random() * cards.length)];
          _openSunoModal(pick, { shuffle: true });
          return;
        }
        wrap.querySelectorAll('.suno-sort__btn').forEach(function(b){ b.classList.remove('is-active'); });
        sortBtn.classList.add('is-active');
        _sunoSortMode = s;
        _renderSunoGrid();
      }
    });
  }

  function _buildSunoModal(){
    if (_sunoModal) return _sunoModal;
    var m = document.createElement('div');
    m.className = 'suno-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-hidden', 'true');
    m.setAttribute('aria-label', 'Reproductor de canciones');
    m.innerHTML = ''
      + '<div class="suno-modal__backdrop" data-cursor="CERRAR"></div>'
      + '<div class="suno-modal__panel" tabindex="-1">'
        + '<div class="suno-modal__topbar">'
          + '<button type="button" class="suno-modal__nav" data-nav="prev" aria-label="Anterior" data-cursor="ANT">‹</button>'
          + '<button type="button" class="suno-modal__nav" data-nav="shuffle" aria-label="Aleatorio" data-cursor="SHUFFLE">⇋</button>'
          + '<button type="button" class="suno-modal__nav" data-nav="next" aria-label="Siguiente" data-cursor="SIG">›</button>'
          + '<button type="button" class="suno-modal__share" aria-label="Copiar link" data-cursor="LINK">⎘ link</button>'
          + '<button type="button" class="suno-modal__close" aria-label="Cerrar" data-cursor="CERRAR">✕</button>'
        + '</div>'
        + '<div class="suno-modal__viz">'
          + '<div class="suno-viz-gradient"></div>'
          + '<canvas class="suno-viz-canvas" aria-hidden="true"></canvas>'
          + '<img class="suno-modal__cover" alt="" crossorigin="anonymous"/>'
          + '<span class="suno-modal__badge"></span>'
        + '</div>'
        + '<div class="suno-modal__info">'
          + '<h3 class="suno-modal__title" id="sunoModalTitle"></h3>'
          + '<p class="suno-modal__meta"></p>'
        + '</div>'
        + '<div class="suno-modal__tabs" role="tablist" aria-label="Contenido">'
          + '<button type="button" class="suno-modal__tab is-active" data-tab="viz" data-cursor="VIZ">Visualizador</button>'
          + '<button type="button" class="suno-modal__tab" data-tab="lyrics" data-cursor="LETRA">Letra / Prompt</button>'
        + '</div>'
        + '<div class="suno-modal__tabpane" data-pane="viz">'
          + '<div class="suno-modal__viz-toggles" role="tablist" aria-label="Estilo de visualizador">'
            + '<button type="button" data-viz="bars" class="is-active" data-cursor="BARS">Barras</button>'
            + '<button type="button" data-viz="wave" data-cursor="WAVE">Onda</button>'
            + '<button type="button" data-viz="orbit" data-cursor="ORBIT">Órbita</button>'
            + '<button type="button" data-viz="bloom" data-cursor="BLOOM">Bloom</button>'
          + '</div>'
        + '</div>'
        + '<div class="suno-modal__tabpane suno-modal__tabpane--lyrics" data-pane="lyrics" hidden>'
          + '<pre class="suno-modal__lyrics"></pre>'
        + '</div>'
        + '<div class="suno-modal__player"></div>'
        + '<a class="suno-modal__external" target="_blank" rel="noopener" hidden></a>'
      + '</div>';
    document.body.appendChild(m);
    _sunoModal = m;

    m.querySelector('.suno-modal__backdrop').addEventListener('click', _closeSunoModal);
    m.querySelector('.suno-modal__close').addEventListener('click', _closeSunoModal);

    /* Viz style toggles */
    m.querySelectorAll('.suno-modal__viz-toggles button').forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        _sunoVizMode = btn.getAttribute('data-viz') || 'bars';
        m.querySelectorAll('.suno-modal__viz-toggles button').forEach(function(b){
          b.classList.toggle('is-active', b === btn);
        });
      });
    });

    /* Tabs: Viz / Lyrics */
    m.querySelectorAll('.suno-modal__tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        var name = tab.getAttribute('data-tab');
        m.querySelectorAll('.suno-modal__tab').forEach(function(t){ t.classList.toggle('is-active', t === tab); });
        m.querySelectorAll('.suno-modal__tabpane').forEach(function(p){
          p.hidden = p.getAttribute('data-pane') !== name;
        });
      });
    });

    /* Prev / Next / Shuffle navigation */
    m.querySelectorAll('.suno-modal__nav').forEach(function(btn){
      btn.addEventListener('click', function(){
        var kind = btn.getAttribute('data-nav');
        if (kind === 'prev') _sunoStep(-1);
        else if (kind === 'next') _sunoStep(1);
        else if (kind === 'shuffle') _sunoShuffle();
      });
    });

    /* Share / copy link */
    m.querySelector('.suno-modal__share').addEventListener('click', _sunoCopyLink);

    /* Keyboard: Escape to close; ← → prev/next; space play/pause; t toggles tab */
    document.addEventListener('keydown', function(e){
      if (!m.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); _closeSunoModal(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); _sunoStep(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); _sunoStep(1); }
      else if (e.key === ' ' && _sunoAudio && _sunoCurrentCard && (_sunoCurrentCard.getAttribute('data-platform') === 'mp3')) {
        /* Only intercept space when the focus isn't in an input */
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA'){
          e.preventDefault();
          if (_sunoAudio.paused) _sunoAudio.play().catch(function(){});
          else _sunoAudio.pause();
        }
      }
    });

    /* Focus trap inside the panel */
    var panel = m.querySelector('.suno-modal__panel');
    panel.addEventListener('keydown', function(e){
      if (e.key !== 'Tab') return;
      var focusables = panel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      var list = Array.prototype.filter.call(focusables, function(el){ return !el.hasAttribute('hidden') && el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });

    /* Mobile: swipe down on the panel closes it (bottom-sheet gesture). */
    var startY = 0, currentY = 0, dragging = false, dragDistance = 0;
    panel.addEventListener('touchstart', function(e){
      if (window.innerWidth > 520) return;
      if (panel.scrollTop > 0) return;
      if (!e.touches || !e.touches[0]) return;
      startY = e.touches[0].clientY;
      currentY = startY;
      dragging = true;
      dragDistance = 0;
      panel.style.transition = 'none';
    }, { passive: true });
    panel.addEventListener('touchmove', function(e){
      if (!dragging || !e.touches || !e.touches[0]) return;
      currentY = e.touches[0].clientY;
      dragDistance = Math.max(0, currentY - startY);
      if (dragDistance > 0){
        panel.style.transform = 'translateY(' + dragDistance + 'px)';
      }
    }, { passive: true });
    panel.addEventListener('touchend', function(){
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      if (dragDistance > 110){
        _closeSunoModal();
      } else {
        panel.style.transform = '';
      }
      dragDistance = 0;
    });

    return m;
  }

  /* Get the persistent audio element (MP3 path only) */
  function _getSunoAudio(){
    if (_sunoAudio) return _sunoAudio;
    var a = document.createElement('audio');
    a.preload = 'metadata';
    a.className = 'suno-hidden-audio';
    a.setAttribute('playsinline', '');
    a.setAttribute('aria-hidden', 'true');
    document.body.appendChild(a);
    /* Auto-next when current track ends (honoring current queue) */
    a.addEventListener('ended', function(){ _sunoStep(1); });
    _sunoAudio = a;
    return a;
  }

  /* Build the scrubber UI bound to the persistent audio element.
     Replaces native <audio controls> so we have full styling control. */
  function _buildSunoScrubber(){
    var wrap = document.createElement('div');
    wrap.className = 'suno-scrubber';
    wrap.innerHTML = ''
      + '<button type="button" class="suno-scrubber__toggle" aria-label="Reproducir / pausa" data-cursor="PLAY">▶</button>'
      + '<span class="suno-scrubber__time suno-scrubber__time--cur">0:00</span>'
      + '<div class="suno-scrubber__track" role="slider" aria-label="Línea de tiempo" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">'
        + '<div class="suno-scrubber__fill"></div>'
        + '<div class="suno-scrubber__knob"></div>'
      + '</div>'
      + '<span class="suno-scrubber__time suno-scrubber__time--dur">0:00</span>';
    return wrap;
  }

  function _fmtTime(s){
    s = Math.max(0, Math.floor(Number(s) || 0));
    var mm = Math.floor(s / 60);
    var ss = s % 60;
    return mm + ':' + (ss < 10 ? '0' : '') + ss;
  }

  /* Wire a scrubber node to the persistent audio element. */
  function _wireSunoScrubber(scrub, audio){
    var toggle = scrub.querySelector('.suno-scrubber__toggle');
    var track = scrub.querySelector('.suno-scrubber__track');
    var fill = scrub.querySelector('.suno-scrubber__fill');
    var knob = scrub.querySelector('.suno-scrubber__knob');
    var tCur = scrub.querySelector('.suno-scrubber__time--cur');
    var tDur = scrub.querySelector('.suno-scrubber__time--dur');

    function render(){
      var d = audio.duration || 0;
      var c = audio.currentTime || 0;
      var pct = d > 0 ? Math.min(100, (c / d) * 100) : 0;
      fill.style.width = pct + '%';
      knob.style.left = pct + '%';
      tCur.textContent = _fmtTime(c);
      tDur.textContent = _fmtTime(d);
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
      toggle.textContent = audio.paused ? '▶' : '‖';
      toggle.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    }
    toggle.addEventListener('click', function(){
      if (audio.paused) { audio.play().catch(function(){}); }
      else { audio.pause(); }
    });

    var seeking = false;
    function seekFromEvent(clientX){
      var r = track.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      if (audio.duration > 0) audio.currentTime = pct * audio.duration;
    }
    track.addEventListener('pointerdown', function(e){
      seeking = true; track.setPointerCapture(e.pointerId);
      seekFromEvent(e.clientX);
    });
    track.addEventListener('pointermove', function(e){ if (seeking) seekFromEvent(e.clientX); });
    track.addEventListener('pointerup', function(){ seeking = false; });
    track.addEventListener('keydown', function(e){
      if (!audio.duration) return;
      var step = audio.duration * 0.05;
      if (e.key === 'ArrowLeft') { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - step); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); audio.currentTime = Math.min(audio.duration, audio.currentTime + step); }
    });

    /* Event wiring that mirrors audio → UI */
    var handlers = {
      timeupdate: render, durationchange: render, loadedmetadata: render,
      play: render, pause: render, seeking: render, seeked: render, ratechange: render
    };
    Object.keys(handlers).forEach(function(ev){ audio.addEventListener(ev, handlers[ev]); });
    scrub._unwire = function(){ Object.keys(handlers).forEach(function(ev){ audio.removeEventListener(ev, handlers[ev]); }); };

    render();
  }

  /* Compute queue (visible cards) and current index when opening a card */
  function _computeSunoQueue(card){
    var grid = document.getElementById('sunoGrid');
    if (!grid) { _sunoQueue = [card]; _sunoQueueIdx = 0; return; }
    _sunoQueue = Array.prototype.slice.call(grid.querySelectorAll('.suno-card'));
    _sunoQueueIdx = _sunoQueue.indexOf(card);
    if (_sunoQueueIdx < 0) { _sunoQueue = [card]; _sunoQueueIdx = 0; }
  }

  function _sunoStep(delta){
    if (!_sunoQueue.length) return;
    var n = _sunoQueue.length;
    var nextIdx = (_sunoQueueIdx + delta + n) % n;
    _sunoQueueIdx = nextIdx;
    var card = _sunoQueue[nextIdx];
    if (_sunoModal && _sunoModal.classList.contains('is-open')){
      _openSunoModal(card, { keepOpen: true });
    } else {
      _sunoSwitchMiniTrack(card);
    }
  }

  function _sunoShuffle(){
    if (!_sunoQueue.length) return;
    var nextIdx = Math.floor(Math.random() * _sunoQueue.length);
    if (_sunoQueue.length > 1 && nextIdx === _sunoQueueIdx) nextIdx = (nextIdx + 1) % _sunoQueue.length;
    _sunoQueueIdx = nextIdx;
    var card = _sunoQueue[nextIdx];
    if (_sunoModal && _sunoModal.classList.contains('is-open')){
      _openSunoModal(card, { keepOpen: true });
    } else {
      _sunoSwitchMiniTrack(card);
    }
  }

  /* Switch the mini-player's track without re-opening the modal. Only makes
     sense for MP3 tracks — if the next track is an embed, we need the modal. */
  function _sunoSwitchMiniTrack(card){
    var platform = card.getAttribute('data-platform') || '';
    if (platform !== 'mp3'){
      /* Next track is an iframe embed — has to open the modal */
      _openSunoModal(card, { keepOpen: true });
      return;
    }
    _sunoCurrentCard = card;
    _sunoLoggedThisOpen = false;
    var src = card.getAttribute('data-src') || '';
    var audio = _getSunoAudio();
    if (src && audio.src !== src && audio.getAttribute('src') !== src){
      audio.src = src;
    }
    var pl = audio.play(); if (pl && pl.catch) pl.catch(function(){});
    _showSunoMiniPlayer(card);
    setTimeout(function(){ _logSunoPlay(card.getAttribute('data-id')); }, 1500);
  }

  function _sunoCopyLink(){
    if (!_sunoCurrentCard) return;
    var slug = _sunoCurrentCard.getAttribute('data-slug') || '';
    var url = location.origin + location.pathname + '#sonido/' + slug;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url);
      } else {
        var ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(_){}
        document.body.removeChild(ta);
      }
      _sunoToast('Link copiado');
    } catch(e){ _sunoToast('No se pudo copiar'); }
  }

  function _sunoToast(msg){
    if (!_sunoModal) return;
    var existing = _sunoModal.querySelector('.suno-modal__toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.className = 'suno-modal__toast';
    t.textContent = msg;
    _sunoModal.querySelector('.suno-modal__panel').appendChild(t);
    setTimeout(function(){ t.classList.add('is-visible'); }, 10);
    setTimeout(function(){ t.classList.remove('is-visible'); setTimeout(function(){ t.remove(); }, 300); }, 1600);
  }

  /* Extract dominant color from cover image and apply to modal CSS vars. */
  function _applyReactiveColor(coverSrc, panel){
    if (!coverSrc || !panel) {
      panel.style.setProperty('--reactive-r', '250');
      panel.style.setProperty('--reactive-g', '93');
      panel.style.setProperty('--reactive-b', '41');
      return;
    }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      try {
        var c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        var cx = c.getContext('2d');
        cx.drawImage(img, 0, 0, 32, 32);
        var data = cx.getImageData(0, 0, 32, 32).data;
        var r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < data.length; i += 4){
          var R = data[i], G = data[i+1], B = data[i+2], A = data[i+3];
          if (A < 200) continue;
          /* Skip near-black/near-white to get a vibrant color */
          var max = Math.max(R, G, B), min = Math.min(R, G, B);
          if (max < 40 || min > 220) continue;
          if (max - min < 20) continue;
          r += R; g += G; b += B; n++;
        }
        if (n < 8){
          /* Not vibrant enough: fallback to simple mean */
          r = g = b = n = 0;
          for (var j = 0; j < data.length; j += 16){ r += data[j]; g += data[j+1]; b += data[j+2]; n++; }
        }
        r = Math.round(r / Math.max(1, n));
        g = Math.round(g / Math.max(1, n));
        b = Math.round(b / Math.max(1, n));
        panel.style.setProperty('--reactive-r', String(r));
        panel.style.setProperty('--reactive-g', String(g));
        panel.style.setProperty('--reactive-b', String(b));
      } catch(_) { /* CORS-blocked image — keep defaults */ }
    };
    img.onerror = function(){ /* keep defaults */ };
    img.src = coverSrc;
  }

  function _openSunoModal(card, opts){
    opts = opts || {};
    var m = _buildSunoModal();
    var panel = m.querySelector('.suno-modal__panel');
    var wasOpen = m.classList.contains('is-open');
    var isMiniExpansion = opts.fromMini === true;

    /* Snapshot the queue from the visible grid (only on first open of a session,
       or when the user explicitly clicked a card — not when we step through). */
    if (!opts.keepOpen) _computeSunoQueue(card);
    else _sunoQueueIdx = _sunoQueue.indexOf(card);

    _sunoCurrentCard = card;
    _sunoLoggedThisOpen = false;

    /* Origin transform only when opening fresh — during step we keep centered */
    if (!wasOpen){
      if (isMiniExpansion && _sunoMiniPlayer){
        var mr = _sunoMiniPlayer.getBoundingClientRect();
        panel.style.setProperty('--init-tx', (mr.left + mr.width/2 - window.innerWidth/2) + 'px');
        panel.style.setProperty('--init-ty', (mr.top + mr.height/2 - window.innerHeight/2) + 'px');
      } else {
        var rect = card.getBoundingClientRect();
        var cx = rect.left + rect.width/2;
        var cy = rect.top + rect.height/2;
        panel.style.setProperty('--init-tx', (cx - window.innerWidth/2) + 'px');
        panel.style.setProperty('--init-ty', (cy - window.innerHeight/2) + 'px');
      }
    }

    /* Fill content */
    var title = card.getAttribute('data-title') || '';
    var cat = card.getAttribute('data-category') || '';
    var dur = ((card.querySelector('.suno-card__meta') || {}).textContent || '').split('·').pop().trim();
    var coverEl = card.querySelector('.suno-card__cover');
    var coverSrc = card.getAttribute('data-cover') || (coverEl && coverEl.getAttribute && coverEl.getAttribute('src')) || '';
    var platform = card.getAttribute('data-platform') || '';
    var description = card.getAttribute('data-description') || '';

    m.querySelector('.suno-modal__title').textContent = title;
    m.querySelector('.suno-modal__meta').textContent = cat + (dur && dur !== cat ? ' · ' + dur : '');
    var cover = m.querySelector('.suno-modal__cover');
    if (coverSrc){ cover.src = coverSrc; cover.style.display = ''; }
    else { cover.style.display = 'none'; }

    _applyReactiveColor(coverSrc, panel);

    var badgeEl = m.querySelector('.suno-modal__badge');
    var badgeLabel = platform === 'spotify' ? 'Spotify'
      : platform === 'apple-music' ? 'Apple Music'
      : platform === 'youtube' ? 'YouTube'
      : platform === 'mp3' ? 'MP3' : '';
    badgeEl.textContent = badgeLabel;
    badgeEl.className = 'suno-modal__badge' + (platform ? ' suno-modal__badge--' + platform : '');

    /* Lyrics pane — use description if present, otherwise empty state */
    var lyricsPre = m.querySelector('.suno-modal__lyrics');
    if (description && description.trim()){
      lyricsPre.textContent = description;
      lyricsPre.classList.remove('is-empty');
    } else {
      lyricsPre.textContent = 'Sin letra ni prompt público para este tema.';
      lyricsPre.classList.add('is-empty');
    }

    /* Prev/next disabled state */
    var hasQueue = _sunoQueue.length > 1;
    m.querySelectorAll('.suno-modal__nav').forEach(function(n){
      n.hidden = !hasQueue && n.getAttribute('data-nav') !== 'shuffle';
    });

    /* Player */
    var player = m.querySelector('.suno-modal__player');
    var external = m.querySelector('.suno-modal__external');
    var src = card.getAttribute('data-src') || '';
    var embed = card.getAttribute('data-embed') || '';
    var shape = card.getAttribute('data-shape') || 'audio';
    var extUrl = card.getAttribute('data-external') || '';

    /* Clear prior scrubber's audio listeners */
    var prevScrubber = player.querySelector('.suno-scrubber');
    if (prevScrubber && prevScrubber._unwire) prevScrubber._unwire();

    player.innerHTML = '';
    _sunoAnalyser = null;

    if (embed){
      /* Iframe embeds: we can't analyse their audio. Hide mini-player case. */
      var h = shape === 'video' ? 260 : (platform === 'apple-music' ? 175 : 152);
      player.innerHTML = '<iframe src="' + embed + '" width="100%" height="' + h + '" frameborder="0" '
        + 'allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" loading="lazy" '
        + 'sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"></iframe>';
    } else if (src){
      /* MP3 path: use persistent audio element + custom scrubber */
      var audioEl = _getSunoAudio();
      /* Only swap src if it's a different track, so mini-player expansion
         doesn't restart the song */
      if (audioEl.src !== src && audioEl.getAttribute('src') !== src){
        audioEl.src = src;
      }
      var scrub = _buildSunoScrubber();
      player.appendChild(scrub);
      _wireSunoScrubber(scrub, audioEl);
      try { _wireSunoAnalyser(audioEl); } catch(e){ console.warn('[suno] analyser', e); }
      /* Only autoplay on a fresh open or an explicit step */
      if (!isMiniExpansion || audioEl.paused){
        var pl = audioEl.play(); if (pl && pl.catch) pl.catch(function(){});
      }
      /* Log the play once per open after a slight delay (only if it actually plays) */
      setTimeout(function(){ _logSunoPlay(card.getAttribute('data-id')); }, 1500);
    } else {
      player.innerHTML = '<p class="suno-modal__empty">Este tema no tiene reproductor público.</p>';
    }

    if (extUrl){
      external.href = extUrl;
      external.textContent = 'abrir en ' + (platform === 'apple-music' ? 'Apple Music' : platform.charAt(0).toUpperCase() + platform.slice(1));
      external.hidden = false;
    } else {
      external.hidden = true;
    }

    /* Update location hash for shareable deep-link (no scroll) */
    var slug = card.getAttribute('data-slug') || '';
    try {
      if (slug && location.hash !== '#sonido/' + slug){
        history.replaceState(null, '', location.pathname + location.search + '#sonido/' + slug);
      }
    } catch(_){}

    /* Hide mini-player if it's showing */
    if (_sunoMiniPlayer) _sunoMiniPlayer.classList.remove('is-visible');

    document.body.style.overflow = 'hidden';
    m.setAttribute('aria-hidden', 'false');
    panel.style.transform = '';
    panel.style.transition = '';
    void panel.offsetHeight;
    m.classList.add('is-open');

    /* Focus the title for screen readers */
    try { panel.focus(); } catch(_){}

    _startSunoViz(m.querySelector('.suno-viz-canvas'));
  }

  function _closeSunoModal(){
    if (!_sunoModal) return;
    _sunoModal.classList.remove('is-open');
    _sunoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    var panel = _sunoModal.querySelector('.suno-modal__panel');
    if (panel){
      panel.style.transform = '';
      panel.style.transition = '';
    }

    /* If MP3 audio is currently playing, show the mini-player. Otherwise pause. */
    var card = _sunoCurrentCard;
    var platform = card ? card.getAttribute('data-platform') : '';
    var audioPlaying = _sunoAudio && !_sunoAudio.paused && _sunoAudio.currentTime > 0;

    /* Clear the deep link from the URL */
    try { if (/^#sonido\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch(_){}

    /* After panel transition: clear iframe/embed player so it stops.
       Keep the audio element alive — mini-player needs it. */
    setTimeout(function(){
      if (_sunoModal && !_sunoModal.classList.contains('is-open')){
        var p = _sunoModal.querySelector('.suno-modal__player');
        if (p){
          var iframe = p.querySelector('iframe');
          if (iframe) p.innerHTML = '';
          var scrub = p.querySelector('.suno-scrubber');
          if (scrub && scrub._unwire) scrub._unwire();
        }
        _stopSunoViz();
      }
    }, 600);

    if (platform === 'mp3' && audioPlaying){
      _showSunoMiniPlayer(card);
    } else if (_sunoAudio){
      try { _sunoAudio.pause(); } catch(e){}
    }
  }

  /* -------- Play counter ------------------------------------------------ */
  function _logSunoPlay(id){
    if (!id || _sunoLoggedThisOpen) return;
    _sunoLoggedThisOpen = true;
    /* Only count as a play if audio actually advanced (MP3 case) or if it was
       an iframe — iframes we count optimistically on open. */
    if (_sunoAudio && _sunoAudio.paused) return;
    fetch('/api/media/' + encodeURIComponent(id) + '/play', { method: 'POST' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(json){
        if (!json) return;
        var item = _sunoAllItems.find(function(x){ return x.id === id; });
        trackPlausible('song_play', {
          id: id,
          title: item && item.title ? item.title : ''
        });
        var card = document.querySelector('.suno-card[data-id="' + id + '"]');
        if (card){
          card.setAttribute('data-plays', String(json.playCount));
          var chip = card.querySelector('.suno-card__plays');
          if (chip) chip.textContent = '▶ ' + _formatPlays(json.playCount);
          else {
            var body = card.querySelector('.suno-card__body');
            if (body){
              var s = document.createElement('span');
              s.className = 'suno-card__plays';
              s.textContent = '▶ ' + _formatPlays(json.playCount);
              body.appendChild(s);
            }
          }
        }
        if (item) item.playCount = json.playCount;
      })
      .catch(function(){});
  }

  /* -------- Mini-player ------------------------------------------------- */
  function _buildSunoMiniPlayer(){
    if (_sunoMiniPlayer) return _sunoMiniPlayer;
    var mp = document.createElement('div');
    mp.className = 'suno-mini';
    mp.setAttribute('role', 'region');
    mp.setAttribute('aria-label', 'Mini-reproductor');
    mp.innerHTML = ''
      + '<button type="button" class="suno-mini__expand" aria-label="Abrir reproductor" data-cursor="ABRIR">'
        + '<img class="suno-mini__cover" alt=""/>'
        + '<span class="suno-mini__info">'
          + '<span class="suno-mini__title"></span>'
          + '<span class="suno-mini__meta"></span>'
        + '</span>'
      + '</button>'
      + '<div class="suno-mini__progress"><div class="suno-mini__progress-fill"></div></div>'
      + '<button type="button" class="suno-mini__toggle" aria-label="Reproducir / pausa" data-cursor="PLAY">‖</button>'
      + '<button type="button" class="suno-mini__next" aria-label="Siguiente" data-cursor="SIG">›</button>'
      + '<button type="button" class="suno-mini__close" aria-label="Cerrar mini-reproductor" data-cursor="CERRAR">✕</button>';
    document.body.appendChild(mp);
    _sunoMiniPlayer = mp;

    mp.querySelector('.suno-mini__expand').addEventListener('click', function(){
      if (!_sunoCurrentCard) return;
      _openSunoModal(_sunoCurrentCard, { fromMini: true, keepOpen: true });
    });
    mp.querySelector('.suno-mini__toggle').addEventListener('click', function(){
      if (!_sunoAudio) return;
      if (_sunoAudio.paused) _sunoAudio.play().catch(function(){});
      else _sunoAudio.pause();
    });
    mp.querySelector('.suno-mini__next').addEventListener('click', function(){ _sunoStep(1); });
    mp.querySelector('.suno-mini__close').addEventListener('click', function(){
      if (_sunoAudio){ try { _sunoAudio.pause(); } catch(_){} }
      mp.classList.remove('is-visible');
    });
    return mp;
  }

  function _showSunoMiniPlayer(card){
    var mp = _buildSunoMiniPlayer();
    var coverSrc = card.getAttribute('data-cover') || '';
    var title = card.getAttribute('data-title') || '';
    var cat = card.getAttribute('data-category') || '';
    var imgEl = mp.querySelector('.suno-mini__cover');
    if (coverSrc){ imgEl.src = coverSrc; imgEl.style.display = ''; }
    else { imgEl.style.display = 'none'; }
    mp.querySelector('.suno-mini__title').textContent = title;
    mp.querySelector('.suno-mini__meta').textContent = cat || 'Balosky';
    var toggle = mp.querySelector('.suno-mini__toggle');
    var fill = mp.querySelector('.suno-mini__progress-fill');

    function sync(){
      if (!_sunoAudio) return;
      toggle.textContent = _sunoAudio.paused ? '▶' : '‖';
      var d = _sunoAudio.duration || 0, c = _sunoAudio.currentTime || 0;
      fill.style.width = (d > 0 ? (c/d)*100 : 0) + '%';
    }
    if (_sunoAudio){
      /* Attach listeners once; re-entry is safe (same handlers replaced) */
      if (mp._syncHandler) {
        ['timeupdate','play','pause','durationchange'].forEach(function(ev){ _sunoAudio.removeEventListener(ev, mp._syncHandler); });
      }
      mp._syncHandler = sync;
      ['timeupdate','play','pause','durationchange'].forEach(function(ev){ _sunoAudio.addEventListener(ev, sync); });
      sync();
    }
    mp.classList.add('is-visible');
  }

  function _wireSunoAnalyser(audio){
    if (!_sunoAudioCtx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      _sunoAudioCtx = new AC();
    }
    /* iOS Safari: AudioContext starts suspended — resume on the user gesture
       that opened the modal. Also re-resume on first play event just in case. */
    if (_sunoAudioCtx.state === 'suspended'){
      try { _sunoAudioCtx.resume(); } catch(e){}
    }
    var resumeOnPlay = function(){
      if (_sunoAudioCtx && _sunoAudioCtx.state === 'suspended'){
        try { _sunoAudioCtx.resume(); } catch(e){}
      }
    };
    audio.addEventListener('play', resumeOnPlay);
    try {
      _sunoSource = _sunoAudioCtx.createMediaElementSource(audio);
      _sunoAnalyser = _sunoAudioCtx.createAnalyser();
      _sunoAnalyser.fftSize = 256;
      _sunoAnalyser.smoothingTimeConstant = 0.78;
      _sunoSource.connect(_sunoAnalyser);
      _sunoAnalyser.connect(_sunoAudioCtx.destination);
    } catch(e){ /* element already has a source, ignore */ }
  }

  function _startSunoViz(canvas){
    if (!canvas) return;
    var perf = window.BaloskyPerf;
    var ctx = canvas.getContext('2d');
    var freq = null, time = null;
    var start = performance.now();
    var last = 0;

    function loop(){
      _sunoRAF = requestAnimationFrame(loop);
      if (perf && !perf.active()) return;
      var now = performance.now();
      var min = 1000 / (perf && perf.state.low ? 12 : 24);
      if (now - last < min) return;
      last = now;
      var dpr = Math.min(window.devicePixelRatio || 1, perf && perf.state.low ? 1 : 1.5);
      var w = canvas.clientWidth * dpr;
      var h = canvas.clientHeight * dpr;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      var t = (now - start) / 1000;

      if (_sunoAnalyser){
        if (!freq) freq = new Uint8Array(_sunoAnalyser.frequencyBinCount);
        if (!time) time = new Uint8Array(_sunoAnalyser.fftSize);
        _sunoAnalyser.getByteFrequencyData(freq);
        _sunoAnalyser.getByteTimeDomainData(time);
      }

      if (_sunoVizMode === 'bars')  _drawBars(ctx, w, h, freq, t);
      else if (_sunoVizMode === 'wave')  _drawWave(ctx, w, h, time, t);
      else if (_sunoVizMode === 'orbit') _drawOrbit(ctx, w, h, freq, t);
      else if (_sunoVizMode === 'bloom') _drawBloom(ctx, w, h, freq, t);
    }
    loop();
  }

  function _stopSunoViz(){
    if (_sunoRAF) cancelAnimationFrame(_sunoRAF);
    _sunoRAF = null;
  }

  function _drawBars(ctx, w, h, freq, t){
    var bars = 56;
    var gap = 2 * (window.devicePixelRatio || 1);
    var bw = (w - gap*(bars-1)) / bars;
    for (var i = 0; i < bars; i++){
      var v;
      if (freq){ v = (freq[Math.floor(i * freq.length / bars)] || 0) / 255; }
      else { v = 0.25 + 0.32 * Math.abs(Math.sin(t*2 + i*0.28)) + 0.18 * Math.abs(Math.sin(t*5 + i*0.1)); }
      var barH = Math.max(2 * (window.devicePixelRatio || 1), v * h * 0.88);
      var x = i * (bw + gap);
      var grad = ctx.createLinearGradient(0, h, 0, h - barH);
      grad.addColorStop(0, 'rgba(250,93,41,0.95)');
      grad.addColorStop(0.55, 'rgba(255,184,61,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, h - barH, bw, barH);
    }
  }

  function _drawWave(ctx, w, h, time, t){
    ctx.lineCap = 'round';
    // Two lines, mirrored, with glow
    for (var pass = 0; pass < 2; pass++){
      ctx.beginPath();
      var n = 180;
      for (var i = 0; i < n; i++){
        var v;
        if (time){ var idx = Math.floor(i / n * time.length); v = (time[idx] - 128) / 128; }
        else { v = Math.sin(t*3 + i*0.07) * 0.5 + Math.sin(t*6 + i*0.03) * 0.15; }
        var x = i / (n-1) * w;
        var y = h/2 + v * h * 0.4 * (pass ? -1 : 1);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = pass ? 'rgba(255,184,61,0.55)' : 'rgba(250,93,41,0.92)';
      ctx.lineWidth = (pass ? 2.5 : 3.2) * (window.devicePixelRatio || 1);
      ctx.stroke();
    }
  }

  function _drawOrbit(ctx, w, h, freq, t){
    var cx = w/2, cy = h/2;
    var rBase = Math.min(w, h) * 0.18;
    for (var r = 0; r < 3; r++){
      var avg;
      if (freq){
        var from = Math.floor(r * freq.length / 3);
        var to = Math.floor((r+1) * freq.length / 3);
        var sum = 0; for (var k = from; k < to; k++) sum += freq[k];
        avg = (sum / (to - from)) / 255;
      } else { avg = 0.3 + 0.18 * Math.sin(t*(1 + r*0.5)); }
      var radius = rBase + r * 22 * (window.devicePixelRatio || 1) + avg * 60;
      var dots = 40;
      for (var i = 0; i < dots; i++){
        var a = (i / dots) * Math.PI*2 + t * (0.3 + r*0.22);
        var dx = cx + Math.cos(a) * radius;
        var dy = cy + Math.sin(a) * radius;
        var dr = (1.4 + avg * 6) * (window.devicePixelRatio || 1);
        ctx.fillStyle = 'rgba(255,' + Math.floor(184 - r*30) + ',' + Math.floor(61 + r*40) + ',' + (0.45 + avg * 0.4) + ')';
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function _drawBloom(ctx, w, h, freq, t){
    var cx = w/2, cy = h/2;
    var dpr = window.devicePixelRatio || 1;
    // Base gradient disc that pulses
    var pulse = 0;
    if (freq){ var sum = 0; for (var i = 0; i < freq.length; i++) sum += freq[i]; pulse = (sum / freq.length) / 255; }
    else { pulse = 0.35 + 0.22 * Math.sin(t*2); }
    var R = Math.min(w, h) * (0.22 + pulse * 0.2);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(250,93,41,0.75)');
    g.addColorStop(0.8, 'rgba(124,63,255,0.25)');
    g.addColorStop(1, 'rgba(124,63,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fill();
    // Petals
    var pet = 8;
    for (var k = 0; k < pet; k++){
      var a = (k / pet) * Math.PI*2 + t * 0.4;
      var bin = freq ? (freq[Math.floor(k * freq.length / pet)] || 0) / 255 : (0.3 + 0.3*Math.sin(t*3 + k));
      var len = R * (0.5 + bin * 1.1);
      ctx.strokeStyle = 'rgba(255,184,61,' + (0.25 + bin * 0.55) + ')';
      ctx.lineWidth = (2 + bin * 6) * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
