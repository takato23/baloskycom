# Checkout & delivery · estado actual y plan

**Fecha:** abril 2026
**Autor:** diagnóstico pre-Epic 1
**Archivos revisados:** `src/server/routes/api.ts`, `src/server/db.ts`, `.env.example`, `public/delirio.html`, `public/delirio-wire.js`

---

## 1. Qué hay hoy (funcionando)

### Endpoints Mercado Pago existentes

| Endpoint | Qué hace |
|---|---|
| `POST /api/checkout/preference` | Crea preference MP (monto libre + campaignId + metadata con supporterName/message). Devuelve `init_point` y `sandbox_init_point`. **Genérico, no conoce productos/wallpapers.** |
| `GET /api/checkout/status/:paymentId` | Consulta payment en MP. Si está approved, llama `processApprovedPayment`. Útil para polling desde la página de retorno. |
| `POST /api/webhook/mercadopago` | Recibe notificaciones de MP. Extrae paymentId, consulta a MP, llama `processApprovedPayment`. Dispara Discord webhook opcional. |
| `processApprovedPayment(payment)` (función interna) | Valida `status === 'approved'`, chequea idempotencia en `processed_payments`, crea una `message` en el muro con el aporte como mensaje, incrementa `campaigns.currentAmount`, registra en `processed_payments`. |

### Flujo wallpaper email-gate (gratis)

| Endpoint | Qué hace |
|---|---|
| `POST /api/wallpapers/request` | Recibe `{email, wallpaperId}`. Valida que el wallpaper exista, esté activo y **NO sea `isLocked`**. Guarda lead en `wallpaper_leads`. Upsert newsletter subscriber. Firma JWT `{wid, em, typ:'wp-dl'}` con 15 min de expiración. Devuelve `downloadUrl` en la respuesta JSON. |
| `GET /api/wallpapers/download?token=...` | Verifica JWT. Si válido, setea `Content-Disposition` y hace 302 redirect al `mediaUrl` del wallpaper. |

### Tablas DB relevantes

- `purchases` — existe pero **NO se usa en el flujo actual**. Solo la llena el seed. Columnas: `id, supporter_name, type, item_id, title, created_at`.
- `processed_payments` — lleva la trazabilidad de payments MP ya procesados (idempotencia).
- `messages` — se llena cada vez que entra un pago approved (el muro).
- `campaigns.currentAmount` — se incrementa con cada pago.
- `wallpaper_leads` — emails capturados por el gate.
- `newsletter_subscribers` — emails globales con `source`.
- `media` — tabla unificada, wallpapers con `isLocked=true` requieren compra.

---

## 2. Qué NO hay (el gap a cerrar)

1. **No hay servicio de email.** El `wallpaper-gate` solo devuelve el link en la response JSON. Si el user cierra la pestaña, pierde el link. Los buyers post-pago MP no reciben nada.
2. **No hay conexión pago → entrega.** Cuando alguien paga un wallpaper locked (pack 10) vía MP, `processApprovedPayment` solo crea un mensaje en el muro. **Nunca genera download_token ni entrega el archivo.**
3. **No hay columna `download_token`/`download_expires_at` en `purchases`.** La tabla está pelada.
4. **No hay página `/pago-exitoso`** que detecte retorno desde MP. Los `back_urls` apuntan a `/checkout/success`, `/checkout/failure`, `/checkout/pending` que probablemente no existan como rutas.
5. **Los botones del HTML (`#apoya`, "pack 10" en wallpapers locked) probablemente no están cableados** al nuevo flow — algunos linkean a `/checkout/c3?amount=3500` estilo URL-string.
6. **No hay checkout por producto específico.** Hoy todo va al "aporte genérico" con monto libre. Para comprar un wallpaper o pack puntual hay que enviarlo como metadata.

---

## 3. Plan de cierre (Epics 1 — tasks #40–#45)

### 3.1. Servicio de email: **Resend** (elegido)

**Por qué Resend sobre nodemailer+SMTP:**
- API moderna (HTTP simple, sin SMTP config).
- 3.000 mails/mes gratis — más que suficiente para este volumen.
- DKIM/SPF manejado por ellos (menos fricción para que no caiga en spam).
- Templates en HTML o React Email.
- Logs y webhooks de entrega out-of-the-box.
- Trivial de testear: sin API key, logueamos en console en dev.

**Alternativa considerada:** `nodemailer` + SMTP Gmail/SendGrid. Rechazada porque Gmail SMTP tiene rate limits bajos y SendGrid tiene UX más pesada.

**Setup:**
```bash
npm install resend
```

**Variables nuevas en `.env.example`:**
```
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="Balosky <hola@balosky.com>"
REPLY_TO_EMAIL="hola@balosky.com"
```

### 3.2. Migración DB (en `src/server/db.ts`)

Agregar columnas a `purchases`:
```sql
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount INTEGER;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS download_token TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS download_expires_at TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS email_sent_at TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS external_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_purchases_ext_ref ON purchases(external_reference);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
```

### 3.3. Flujo end-to-end diseñado

```
USER CLICKS "APOYAR / COMPRAR"
  ↓
POST /api/checkout/create  {type, itemId, amount, email}
  ↓
  crea purchase row status='pending' + external_reference único
  ↓
  crea preference MP con:
    - external_reference = purchase.id
    - back_urls: /pago-exitoso?purchase=<id>
    - metadata: {purchaseId, itemId, type, email}
  ↓
  devuelve {preferenceId, initPoint}
  ↓
USER redirigido a MP, paga
  ↓
MP dispara webhook → /api/webhook/mercadopago
  ↓
processApprovedPayment() extendido:
  - extrae purchaseId del metadata/external_reference
  - updatea purchases.status='paid', payment_id, amount
  - genera download_token JWT 48h {purchaseId, itemId, type}
  - guarda token + expires en purchases
  - llama sendDeliveryEmail({to, title, downloadUrl, expiresAt})
  - sigue haciendo lo que ya hace (message en muro, currentAmount)
  ↓
PARALELO: MP redirige user a /pago-exitoso?purchase=<id>
  ↓
Página estática hace poll a /api/purchases/:id/status cada 3s
  ↓
Cuando status='paid' muestra botón "Descargar ahora" con token
  ↓
User clickea → /api/wallpapers/download?token=... → 302 al archivo
  ↓
Simultáneamente recibe email con el mismo link (válido 48h)
```

### 3.4. Nuevos endpoints

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/checkout/create` | POST | Unificado. Reemplaza `/checkout/preference` (lo dejamos por retrocompatibilidad). |
| `/api/purchases/:id/status` | GET | Devuelve `{status, downloadToken?, title, amount}` para la página de éxito. Sin auth, pero solo devuelve `downloadToken` si es `paid`. |
| `/api/download/:token` | GET | Generaliza `/wallpapers/download` para cualquier tipo de producto (wallpaper, pack, producto). |

### 3.5. Páginas

- `public/pago-exitoso.html` — página estática, lee `?purchase=<id>`, polling + branding coherente con delirio.
- `public/pago-fallido.html` — mensaje + link a reintentar.
- `public/pago-pendiente.html` — mensaje de "esperando confirmación".

### 3.6. UI cambios en `public/delirio-wire.js`

- Cablear botones `#apoya` (monto + MP link).
- Cablear card de pack 10 en wallpapers locked.
- Agregar input de email obligatorio antes del checkout (para mandar el mail).
- LocalStorage: guardar purchases del user para mostrar "ya lo compraste, bajar otra vez" si vuelve.

---

## 4. Riesgos / cosas a mirar

1. **Pgbouncer + transactions** — el código ya nota que no hay transacciones reales. El flujo de `processApprovedPayment` es idempotente gracias a `processed_payments`, pero hay que mantener esa garantía en los nuevos inserts.
2. **Double-delivery** — si MP reenvía el webhook, `processed_payments` lo blokea, pero hay que verificar que `email_sent_at` también sea idempotente (no mandar 2 mails por el mismo pago).
3. **Wallpaper locked vs free** — el endpoint `/wallpapers/download` hoy rechaza locked. Hay que relajarlo o crear uno nuevo que valide via `purchases.download_token`.
4. **Back_urls con localhost** — MP rechaza redirects a localhost. Para dev hay que usar ngrok o similar.
5. **Rate limit** — el `publicLimiter` ya está (60 req/min). `skip` para webhook. OK.
6. **Spam de emails** — agregar rate limit por email en `/api/checkout/create` (máx 5 checkouts por email por hora).

---

## 5. Decisiones cerradas

- ✅ Email: **Resend**.
- ✅ Token expira en **48h** (balance entre UX y seguridad).
- ✅ Delivery dual: email + página post-pago con download directo.
- ✅ Extendemos `purchases` en lugar de crear tabla nueva `orders`.
- ✅ `/api/checkout/preference` queda como legacy para no romper nada existente; el nuevo es `/api/checkout/create`.

---

## 6. Orden de ejecución (tasks #40–#45)

1. **#40** — Setup Resend + template HTML.
2. Migración DB (extensión de `purchases`). **Nota:** agregar al task #42 o crear un task separado si resulta invasivo.
3. **#41** — `POST /api/checkout/create`.
4. **#42** — Webhook extendido con generación de token + sendEmail.
5. **#43** — Página `/pago-exitoso` + endpoint `/api/purchases/:id/status`.
6. **#44** — UI cableada en `delirio-wire.js`.
7. **#45** — Smoke test end-to-end con credenciales TEST de MP.

Estimado total: **4–6 horas** de desarrollo concentrado.
