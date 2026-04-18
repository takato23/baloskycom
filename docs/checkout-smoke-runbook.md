# Smoke test · Checkout end-to-end (MP sandbox)

Este runbook ejecuta un pago real con **Mercado Pago sandbox** y verifica que el loop completo funcione: checkout → redirect a MP → pago aprobado → webhook → email + download link.

El script offline ya corre automático:

```bash
npx tsx scripts/_smoke-checkout.ts   # verifica token JWT + template de email
```

Lo que sigue requiere un entorno con URL pública (ngrok / tunel) porque MP necesita **HTTPS** para el webhook.

## 0 · Pre-requisitos

1. Cuenta de test en Mercado Pago: <https://www.mercadopago.com.ar/developers/panel/app>
2. Credenciales TEST (sandbox) de la app:
   - `TEST-...` access token
3. Usuario comprador de test (NO usar tu cuenta real):
   - Creá uno en <https://www.mercadopago.com.ar/developers/panel/test-users>
   - Guardá user + password del **comprador test**
4. Tarjeta de test (cualquiera del panel MP):
   - `Mastercard 5031 7557 3453 0604`, CVV `123`, vencimiento `11/30`
   - Para aprobado: titular `APRO`
   - Para rechazado: titular `OTHE`, `CONT`, etc.
5. Túnel HTTPS al `localhost:3000`:
   ```bash
   ngrok http 3000    # o cloudflared tunnel
   ```
   Copiá la URL `https://<random>.ngrok-free.app`.

## 1 · Configurar `.env` local

```dotenv
JWT_SECRET="<cadena-larga-y-random>"
MP_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxxxxxxxxx"
APP_URL="https://<random>.ngrok-free.app"
DATABASE_URL="postgres://..."

# Email: dejá RESEND_API_KEY vacío para modo stub (el mail sale por consola).
# O poné tu API key de Resend si querés ver el email real en tu inbox.
RESEND_API_KEY=""
FROM_EMAIL="Balosky <hola@balosky.com>"
REPLY_TO_EMAIL="hola@balosky.com"
```

## 2 · Levantar el server

```bash
npm run dev
# server running on http://localhost:3000
```

Confirmá que la URL pública responde:

```bash
curl -s https://<random>.ngrok-free.app/api/health
# {"status":"ok"}
```

## 3 · Cargar un wallpaper locked de prueba (si no existe)

Necesitás un wallpaper con `isLocked=1` para probar el flow `pack`. Desde el panel admin `/admin/media` subí uno o usá el script bulk-upload. Anotá su `id` (tipo `med_xxx`).

Como alternativa, probá con un **producto** (`products`) o con un aporte a campaña (`c3` siempre existe).

## 4 · Crear el checkout vía API

```bash
curl -sS -X POST https://<random>.ngrok-free.app/api/checkout/create \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "pack",
    "itemId": "<med_xxx>",
    "email": "tu-email-de-test@ejemplo.com",
    "supporterName": "Santi test",
    "message": "Smoke test"
  }'
```

Esperado:

```json
{
  "purchaseId": "pur_xxxxxxxx_yyyy",
  "preferenceId": "1234567890-abcd-...",
  "initPoint":    "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandboxInitPoint": "https://sandbox.mercadopago.com.ar/..."
}
```

Chequeá que la row exista en DB:

```sql
SELECT id, status, amount, email, externalReference, preferenceId FROM purchases WHERE id = 'pur_xxxxxxxx_yyyy';
```

## 5 · Ejecutar el pago en MP sandbox

Abrí `sandboxInitPoint` en una ventana **privada/incógnita**. Iniciá sesión con el **usuario comprador** de test (no con tu user real). Completá con la tarjeta de test (titular `APRO` para aprobar).

Al aprobar, MP redirige a:

```
https://<random>.ngrok-free.app/pago-exitoso?purchase=pur_xxxxxxxx_yyyy&...
```

## 6 · Verificaciones en el server

Simultáneamente MP pega el webhook a `https://<random>.ngrok-free.app/api/webhook/mercadopago`. En los logs del server debería verse:

- `paymentClient.get(...)` responde con `status: 'approved'`
- `processApprovedPayment` encuentra el `purchaseId` en `metadata` o `external_reference`
- Se genera download_token (JWT 48h)
- `sendDeliveryEmail` se llama → en modo stub imprime el bloque `========== [email · dev stub] ==========`
- `purchases.status = 'paid'`, `emailSentAt` queda seteado
- `processed_payments` agrega row para idempotencia

### 6a · Check DB

```sql
SELECT id, status, paidAt, emailSentAt, downloadToken IS NOT NULL AS has_token
FROM purchases WHERE id = 'pur_xxxxxxxx_yyyy';
-- status='paid', paidAt!=null, emailSentAt!=null, has_token=true
```

### 6b · Check endpoint de status

```bash
curl -sS https://<random>.ngrok-free.app/api/purchases/pur_xxxxxxxx_yyyy/status | jq
# { "id":"pur_...", "status":"paid", "downloadToken":"eyJhbGci...", ... }
```

### 6c · Check /pago-exitoso (browser)

La página debería mostrar:

- eyebrow "listo"
- headline "ya es tuyo."
- botón "Descargar ahora →" habilitado
- meta con producto + monto + ref

Al apretarlo navega a `/api/download/<token>` y el browser descarga el archivo.

### 6d · Check /api/download/:token directo

```bash
curl -sI "https://<random>.ngrok-free.app/api/download/<token>" | head -5
# HTTP/2 302
# location: <mediaUrl del wallpaper>
# content-disposition: attachment; filename="balosky-<slug>.jpg"
```

## 7 · Idempotencia (volver a pegar el webhook)

MP reintenta webhooks. Pegá el mismo webhook dos veces:

```bash
curl -sS -X POST https://<random>.ngrok-free.app/api/webhook/mercadopago \
  -H 'Content-Type: application/json' \
  -d '{"action":"payment.updated","data":{"id":"<paymentId>"}}'

# Repetir el mismo curl. En los logs: already-processed.
# emailSentAt no se actualiza, downloadToken no cambia.
```

## 8 · Token expirado

Forzar expiración (en DB):

```sql
UPDATE purchases SET downloadExpiresAt = NOW()::text WHERE id = 'pur_xxxxxxxx_yyyy';
```

`curl /api/download/<token>` sigue sirviendo mientras el JWT interno siga vigente (la validación es doble: JWT exp + downloadExpiresAt stored). Esperá los 48h o ajustá el JWT manualmente para ver:

```
HTTP/2 401
Token expirado. Si tu compra fue aprobada, respondé el mail y te paso un link nuevo.
```

## 9 · Rollback

Para limpiar después del smoke:

```sql
DELETE FROM processed_payments WHERE paymentId IN (SELECT paymentId FROM purchases WHERE email LIKE '%test%');
DELETE FROM messages           WHERE id LIKE 'msg_%' AND supporterName = 'Santi test';
DELETE FROM purchases          WHERE email LIKE '%test%';
```

## 10 · Checklist rápido

- [ ] `/api/checkout/create` devuelve `purchaseId` + `initPoint`
- [ ] Purchase row queda con `status='pending'`
- [ ] Pago en sandbox redirige a `/pago-exitoso?purchase=<id>`
- [ ] Webhook llega y el log muestra `processed`
- [ ] `status='paid'`, `downloadToken` seteado, `emailSentAt` seteado
- [ ] `/api/purchases/:id/status` devuelve `downloadToken` cuando paid
- [ ] `/api/download/:token` redirige a mediaUrl con Content-Disposition
- [ ] Email (stub o real) llega con link correcto y expira en 48 h
- [ ] Reprocessamiento del mismo webhook no duplica email

Si algún paso falla, mirá `server.log` con el `paymentId` y `purchaseId` de esa compra.
