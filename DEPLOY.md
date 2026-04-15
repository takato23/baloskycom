# Deploy a Railway

Guía para poner `balosky.com` en vivo en Railway (Express + SQLite + Mercado Pago).

## 1. Pushear el commit local a GitHub

Desde tu terminal en la carpeta del proyecto:

```bash
cd "/Volumes/SSD EXTERNO/Rescate Descargas/bancame---santi-balosky"
git push origin main
```

Si GitHub te pide usuario/token, usá tu usuario de GitHub y un **Personal Access Token** (no tu contraseña) con permiso `repo`. Lo generás en https://github.com/settings/tokens.

## 2. Crear el proyecto en Railway

1. Ir a https://railway.app y logearte (podés usar GitHub).
2. `+ New Project` → `Deploy from GitHub repo` → elegir `takato23/baloskycom`.
3. Railway detecta Nixpacks automáticamente y empieza el primer build leyendo `railway.json` + `nixpacks.toml`. **Dejalo correr** mientras configurás las variables de entorno abajo.

## 3. Variables de entorno

En el panel de Railway, tab **Variables**, agregar:

| Key | Value |
|---|---|
| `JWT_SECRET` | (copialo del `.env` local — empieza con `f2ad5962...`) |
| `MP_ACCESS_TOKEN` | (copialo del `.env` local — empieza con `APP_USR-6774097...`) |
| `APP_URL` | (lo completás después del paso 5 con tu URL pública de Railway) |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |

Opcional (ya estaban en `.env.example` pero pueden quedar vacías):
`GEMINI_API_KEY`, `NEXT_PUBLIC_NOTEBOOK_PUBLIC_URL`, `NEXT_PUBLIC_AUDIO_OVERVIEW_URL`, etc.

## 4. Montar volumen persistente para la SQLite

**Crítico**: sin esto, cada redeploy te borra aportes, mensajes y productos.

1. En el servicio, tab **Settings** → scroll a **Volumes** → `+ New Volume`.
2. Mount Path: `/data`
3. Size: 1GB alcanza y sobra.
4. `Add`.

(Esto hace match con `DATA_DIR=/data` que ya setteaste.)

## 5. Generar el dominio público

1. **Settings** → **Networking** → `Generate Domain`.
2. Railway te da algo tipo `balosky-production.up.railway.app`. Copialo.
3. Volvé a **Variables** y actualizá `APP_URL` con la URL completa (ej: `https://balosky-production.up.railway.app`).
4. Railway redeploya solo.

Opcional: en **Settings** → **Networking** → `+ Custom Domain` podés apuntar `balosky.com` (hay que tocar DNS en tu registrar, te paso los pasos cuando lo tengas).

## 6. Configurar el webhook de Mercado Pago

En el panel de MP (https://www.mercadopago.com.ar/developers/panel/app/6774097064739656/):

1. `Webhooks` → `Configurar notificaciones`.
2. URL: `https://TU-DOMINIO-RAILWAY/api/webhook/mercadopago`
3. Eventos: marcá **Pagos**.
4. `Guardar`.

Esto hace que MP avise a tu server cuando alguien paga, y el server actualiza el aporte en la DB automáticamente.

## 7. Smoke test

1. Abrí `https://TU-DOMINIO-RAILWAY/api/health` → debe devolver `{"status":"ok"}`.
2. Abrí la home del sitio → debería verse igual que en local.
3. Probá un aporte de $100 con la **Cafecito c3** (catch-all).
4. Verificá que el aporte aparece en `/admin` después de pagar.

## 8. Conectar el link a tu bio de Instagram

Cuando el paso 7 funcione end-to-end, reemplazá el link de cafecito por el de tu Railway (o tu custom domain). Listo: la gente que te apoya desde IG paga directo a tu MP, sin cafecito en el medio.

## Notas

- **Vercel**: queda abandonado con la versión vieja. Si querés que no publique más, entrá a https://vercel.com/dashboard → proyecto `baloskycom` → Settings → Git → Disconnect, o directamente eliminá el proyecto de Vercel.
- **Primer deploy**: si falla el build, casi siempre es `better-sqlite3` que necesita toolchain nativa. El `nixpacks.toml` ya la incluye (`gcc`, `gnumake`, `python3`), pero si hay drama mirá los logs y mandámelos.
- **Backups de la DB**: Railway tiene snapshots de volúmenes. Igual, de vez en cuando bajá `/data/database.sqlite` por seguridad.
