# Correo de Balosky

Estado al 2026-05-31.

## Resumen corto

Hoy `balosky.com` tiene un correo real en Namecheap Private Email:

- Buzon: `hola@balosky.com`
- Webmail: `https://privateemail.com`
- Reenvio activo: todo lo que entra a `hola@balosky.com` se reenvia a `sgorbalan@gmail.com`
- Copia local activa: los mails tambien quedan guardados en el buzon `hola@balosky.com`

No guardar contrasenas en este repo.

## Donde esta configurado

El dominio esta usando nameservers de Namecheap:

```txt
dns1.registrar-servers.com
dns2.registrar-servers.com
```

La casilla esta en Namecheap Private Email. La configuracion del reenvio se hace desde:

```txt
Private Email webmail -> Settings -> Mail -> Auto forward
```

Configuracion aplicada:

```txt
Auto forward: activado
Forward all incoming emails to this address: sgorbalan@gmail.com
Keep a copy of the message: activado
Process subsequent rules: activado
```

## DNS actual

Registros publicos verificados contra `1.1.1.1`:

```txt
MX balosky.com
10 mx1.privateemail.com.
10 mx2.privateemail.com.

TXT balosky.com
"v=spf1 include:spf.privateemail.com ~all"
```

Esto sirve para que `hola@balosky.com` reciba correo por Private Email.

Tambien existe una configuracion separada para envios tecnicos desde el subdominio `send.balosky.com`:

```txt
MX send.balosky.com
10 feedback-smtp.sa-east-1.amazonses.com.

TXT send.balosky.com
"v=spf1 include:amazonses.com ~all"
```

No borrar esos registros sin revisar antes, porque pueden estar relacionados con envios transaccionales o verificacion de proveedor.

## Diferencia importante

Hay dos cosas distintas:

1. `hola@balosky.com` como buzon real.

   Sirve para recibir mails, responder desde webmail y tener una direccion seria de contacto. Ahora reenvia a `sgorbalan@gmail.com`.

2. Los emails automaticos de la web.

   El codigo en `src/server/email.ts` usa Resend para emails transaccionales: confirmaciones, entregas post-pago, agradecimientos, alertas, etc.

   Variables relevantes:

   ```txt
   RESEND_API_KEY
   FROM_EMAIL="Balosky <hola@balosky.com>"
   REPLY_TO_EMAIL="hola@balosky.com"
   ADMIN_EMAIL
   ```

   Si `RESEND_API_KEY` no esta configurada, la app no manda emails reales en desarrollo: los loguea en consola como stub.

## Resend

Estado revisado al 2026-05-31 desde el dashboard de Resend:

- Cuenta usada en Resend: `sgorbalan@gmail.com`.
- Dominio en Resend: `balosky.com`.
- Estado del dominio: `Verified`.
- Region: Sao Paulo `sa-east-1`.
- Proveedor detectado por Resend: Namecheap.
- Mensaje del dashboard: el dominio esta listo para enviar emails.
- API key existente para produccion: `baloskycom-production`.
- Permiso de la key: `Sending access`.
- Ultimo uso de esa key: hace 7 dias.

Registros de Resend verificados en dashboard:

```txt
DKIM
TXT resend._domainkey
Status: Verified

Sending SPF
MX send -> feedback-smtp.sa-east-1.amazonses.com
Status: Verified

TXT send -> v=spf1 include:amazonses.com ~all
Status: Verified

Receiving en Resend
Off
```

Esto esta bien: Resend se usa para enviar emails automaticos, no para recibir correo. La recepcion real la maneja Namecheap Private Email con `hola@balosky.com`.

Variables de entorno en Vercel:

```txt
RESEND_API_KEY: configurada en Preview y Production
FROM_EMAIL: configurada en Development, Preview y Production
REPLY_TO_EMAIL: configurada en Development, Preview y Production
ADMIN_EMAIL: configurada en Development, Preview y Production
```

No se copiaron ni se guardaron valores secretos.

Log real revisado en Resend:

```txt
Endpoint: POST /emails
Status: 200
From: Balosky <hola@balosky.com>
Reply-To: hola@balosky.com
To: hola@balosky.com
Tipo: admin-encargo
```

Conclusion: Resend esta funcionando para emails automaticos de la web. Como ahora `hola@balosky.com` reenvia a `sgorbalan@gmail.com`, las alertas que lleguen a `hola@balosky.com` tambien deberian terminar en Gmail, siempre que el reenvio de Private Email funcione bien.

El SDK local `resend` fue actualizado de `^4.8.0` a `^6.12.4`.

Verificacion local posterior:

```txt
npm run lint: ok
npm run build: ok
```

## Que esta probado

- DNS publico de `balosky.com` resuelve a Namecheap Private Email.
- DNS publico de `send.balosky.com` mantiene los registros de envio/verificacion existentes.
- El reenvio en Private Email quedo activo al reabrir el cuadro de configuracion.
- Se mando una prueba desde Gmail a `hola@balosky.com` y el buzon de Private Email marco 1 mail sin leer.
- Resend tiene `balosky.com` verificado y registros de envio en verde.
- Vercel tiene `RESEND_API_KEY`, `FROM_EMAIL`, `REPLY_TO_EMAIL` y `ADMIN_EMAIL` configuradas.
- Resend muestra logs recientes `POST /emails` con status `200`.
- Prueba real end-to-end hecha desde produccion:
  - Se creo un pre-pedido de prueba con asunto `TEST REENVIO BORRAR`.
  - La web disparo Resend.
  - Resend envio desde `Balosky <hola@balosky.com>` hacia `hola@balosky.com`.
  - El mail llego a Gmail `sgorbalan@gmail.com` en `INBOX`.
  - El pre-pedido de prueba fue eliminado del admin.

## Que falta probar mejor

Nada critico pendiente para el circuito principal.

Opcional: hacer una prueba manual desde una casilla externa cualquiera a `hola@balosky.com` y confirmar que tambien queda copia en el webmail de Private Email. El circuito web -> Resend -> `hola@balosky.com` -> Gmail ya quedo probado.

## Como deberia usarse

Para contacto publico:

```txt
hola@balosky.com
```

Para formularios o respuestas automaticas de la web:

```txt
From: Balosky <hola@balosky.com>
Reply-To: hola@balosky.com
Admin alerts: sgorbalan@gmail.com o hola@balosky.com, segun convenga
```

Si se usa `hola@balosky.com` como remitente automatico con Resend, revisar que el dominio este verificado en Resend y que SPF/DKIM/DMARC esten correctos para evitar spam.

## Riesgos y cuidados

- No mezclar el buzon de recepcion con el proveedor de envios automaticos. Private Email recibe; Resend envia desde la app.
- No borrar registros DNS de `send.balosky.com` sin saber que servicio los usa.
- No publicar contrasenas, codigos de recuperacion ni API keys.
- Si Gmail no recibe reenviados, revisar primero spam/promociones y despues volver al webmail a confirmar que Auto forward siga activo.
- Agregar DMARC mas adelante cuando el flujo de envio este claro.
