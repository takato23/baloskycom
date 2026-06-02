#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const createMpPreference = process.env.CREATE_MP_PREFERENCE === '1';
const assetPaths = (process.env.ASSET_PATHS || [
  '/models/santi-head.opt.glb',
  '/uploads/thumbs/balosky-hero-loop-first.png',
].join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const results = [];

async function request(path, init = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const res = await fetch(url, {
    redirect: 'manual',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');
  return { url, res, body };
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'ok' : 'fail';
  console.log(`${mark.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function expectStatus(name, path, expected, init) {
  const { res } = await request(path, init);
  const ok = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
  record(name, ok, `${res.status} ${path}`);
}

async function main() {
  console.log(`Balosky production smoke against ${baseUrl}`);
  console.log(
    createMpPreference
      ? 'Crea una preference real de MP con email smoke, pero NO realiza pagos.\n'
      : 'No crea pagos reales: sólo valida rechazos seguros y endpoints públicos.\n'
  );

  await expectStatus('health', '/api/health', 200);
  await expectStatus('privacidad', '/privacidad', 200);
  await expectStatus('terminos', '/terminos', 200);
  await expectStatus('media wallpapers public', '/api/media?kind=wallpaper', 200);
  await expectStatus('newsletter invalid email rejected or rate-limited', '/api/newsletter', [400, 429], {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email', source: 'smoke' }),
  });
  await expectStatus('messages honeypot silent or rate-limited', '/api/messages', [204, 429], {
    method: 'POST',
    body: JSON.stringify({ supporterName: 'Smoke', message: 'hola', website: 'bot' }),
  });
  await expectStatus('checkout invalid email rejected before MP', '/api/checkout/create', 400, {
    method: 'POST',
    body: JSON.stringify({ type: 'campaign', itemId: 'c3', amount: 1000, email: 'bad' }),
  });
  await expectStatus('checkout amount tampering rejected before MP', '/api/checkout/create', 400, {
    method: 'POST',
    body: JSON.stringify({ type: 'pack', itemId: 'pack-wallpapers', amount: 1, email: 'smoke@example.com' }),
  });

  if (createMpPreference) {
    const uniqueEmail = `smoke+${Date.now()}@example.com`;
    const checkout = await request('/api/checkout/create', {
      method: 'POST',
      body: JSON.stringify({
        type: 'pack',
        email: uniqueEmail,
        supporterName: 'Smoke Test',
        message: 'Smoke test sin pago real',
      }),
    });
    const checkoutOk =
      checkout.res.status === 200 &&
      checkout.body?.purchaseId?.startsWith?.('pur_') &&
      checkout.body?.preferenceId &&
      (checkout.body?.initPoint || checkout.body?.sandboxInitPoint);
    record('checkout valid pack creates MP preference', checkoutOk, `${checkout.res.status} ${checkout.body?.purchaseId || 'no purchase'}`);

    if (checkout.body?.purchaseId) {
      const status = await request(`/api/purchases/${encodeURIComponent(checkout.body.purchaseId)}/status`);
      record(
        'new checkout remains pending before payment',
        status.res.status === 200 && status.body?.status === 'pending' && !status.body?.downloadToken,
        `${status.res.status} ${status.body?.status || 'no status'}`
      );
    }
  }

  await expectStatus('wallpaper gate invalid email rejected or rate-limited', '/api/wallpapers/request', [400, 429], {
    method: 'POST',
    body: JSON.stringify({ email: 'bad', wallpaperId: 'missing' }),
  });

  const publicMedia = await request('/api/media?kind=wallpaper');
  const forgedMedia = await request('/api/media?kind=wallpaper', {
    headers: { Authorization: 'Bearer definitely-invalid' },
  });
  const samePayload = JSON.stringify(publicMedia.body) === JSON.stringify(forgedMedia.body);
  record('invalid admin token does not unlock media', samePayload, `public=${publicMedia.res.status} forged=${forgedMedia.res.status}`);

  const wallpapers = Array.isArray(publicMedia.body) ? publicMedia.body : [];
  const freeWallpapers = wallpapers.slice(0, 3);
  const paidWallpapers = wallpapers.slice(3);
  const freeHaveUrls = freeWallpapers.every((m) => m && typeof m.mediaUrl === 'string' && m.mediaUrl.length > 0 && !m.isLocked);
  const paidAreRedacted = paidWallpapers.length === 0 || paidWallpapers.every((m) => m && m.mediaUrl === null && m.isLocked === true);
  record('wallpaper public API exposes only first 3 originals', freeHaveUrls && paidAreRedacted, `${freeWallpapers.length} free, ${paidWallpapers.length} redacted`);
  if (paidWallpapers[0]?.id) {
    const paidDetail = await request(`/api/media/${encodeURIComponent(paidWallpapers[0].id)}`);
    record('wallpaper detail keeps pack original redacted', paidDetail.body?.mediaUrl === null && paidDetail.body?.isLocked === true, `${paidDetail.res.status} ${paidWallpapers[0].id}`);
  }

  const videos = await request('/api/media?kind=video_ia');
  const firstVideoUrl = Array.isArray(videos.body) ? videos.body.find((m) => m?.mediaUrl)?.mediaUrl : null;
  if (firstVideoUrl) {
    const { res } = await request(firstVideoUrl, { method: 'HEAD' });
    record('video media asset reachable', res.status >= 200 && res.status < 400, `HEAD ${res.status}`);
  } else {
    record('video media asset reachable', false, 'no video mediaUrl');
  }

  for (const path of assetPaths) {
    const { res } = await request(path, { method: 'HEAD' });
    record(`asset ${path}`, res.status >= 200 && res.status < 400, `HEAD ${res.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} smoke checks failed.`);
    process.exit(1);
  }

  console.log('\nAll smoke checks passed.');
}

main().catch((error) => {
  console.error('Smoke failed with exception:', error);
  process.exit(1);
});
