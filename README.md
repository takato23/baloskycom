# Bancame

Sitio para aportes, campañas, contenido para aportantes y administración básica.

## Correr local

1. Instalá dependencias con `npm install`
2. Creá `.env.local` a partir de `.env.example`
3. Levantá el proyecto con `npm run dev`
4. Abrí [http://localhost:3000](http://localhost:3000)

## Admin

- Entrá a `/admin/login`
- Si no existe ningún admin, el sistema te deja crear el primer acceso desde esa misma pantalla
- Si ya existe, iniciás sesión normalmente
- Desde `/admin/settings` podés rotar usuario y contraseña del panel

## Qué conviene editar desde el panel

- `Configuración`: textos públicos, links, avatar, bio y template visual
- `Misiones`: campañas activas y su metadata
- `Mensajes`: moderación y respuestas públicas
- `Productos` y `Membresías`: solo si realmente los vas a ofrecer

## Qué conviene editar en código

- Lógica de checkout y pagos
- Estructura de features nuevas
- Componentes, layouts y comportamiento del frontend

## Mercado Pago

- Configurá `MP_ACCESS_TOKEN` con un token real de Mercado Pago
- Configurá `APP_URL` con la URL pública donde corre la app
- Si `APP_URL` apunta a `localhost`, el checkout igual puede abrir, pero el webhook no va a poder acreditar aportes automáticamente desde Mercado Pago
