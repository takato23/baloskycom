# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

"Balosky" — a creator-support platform for Santi Balosky (@santiagobalosky, 234K IG followers). Supporters can contribute to campaigns, buy products, subscribe to memberships, and leave messages. Payments go through Mercado Pago (Argentina). The UI is in Spanish. Target domain: balosky.com.

## Commands

- `npm run dev` — Start dev server (Express + Vite middleware on port 3000)
- `npm run build` — Vite production build
- `npm run lint` — TypeScript type-check (`tsc --noEmit`)
- No test runner is configured

## Architecture

**Monorepo, single process:** An Express server (`server.ts`) serves both the API and the Vite-powered React SPA in dev mode. In production, Express serves the built `dist/` folder.

### Backend (Express + Supabase Postgres)

- `src/server/routes/api.ts` — All REST endpoints (CRUD for campaigns, products, memberships, messages, settings, discount codes, purchases, encargos, analytics events, plus Mercado Pago checkout/webhooks)
- `src/server/db.ts` — Postgres connection via the `postgres` client (`DATABASE_URL`), schema, seed data, migrations. Exposes a thin `prepare()`/`run()` shim with `?`→`$N` placeholder conversion.
- `src/server/auth.ts` — Password hashing (scrypt) and JWT auth
- Database: **Supabase Postgres** via `DATABASE_URL` (not SQLite — the old better-sqlite3 setup was migrated)
- Mercado Pago webhook at `POST /api/webhook/mercadopago`

### Frontend (React + React Router + Tailwind v4)

- `src/App.tsx` — Route definitions. Layout wraps all routes.
- `src/context/AppContext.tsx` — Global state: campaigns, rewards, messages, settings, darkMode, currency
- `src/services/api.ts` — Fetch wrapper for all API endpoints
- `src/types/index.ts` — Shared TypeScript interfaces
- `src/content/publicContent.ts` — Default editable content with normalization

### Design System — Artefakt Style

Single design inspired by Artefakt/Thomas Monavon with dark/light mode toggle:
- CSS variables in `src/index.css`: `--black`, `--white`, `--accent` (#FA5D29), `--grey`, `--muted`, `--border`
- `[data-mode="dark"]` inverts the palette
- Typography: `t-hero` (900, -0.06em), `t-section` (800, -0.04em), `t-eyebrow` (500, 0.2em uppercase), `t-body` (400, #999)
- Animation: `reveal` (fade-up), `clip-reveal` (clip-path), `perspective-section` (3D entry), `stroke-fill` (outline→fill)
- Font: Inter Tight for display, Inter for body

### Effects Components (`src/components/effects/`)

Desktop-only effects (disabled on mobile via `useIsMobile` hook):
- `CustomCursor.tsx` — Liquid cursor with context labels (VIEW/OPEN/GO)
- `Particles.tsx` — Canvas particle system with mouse repulsion
- `FilmGrain.tsx` — Canvas grain (desktop) / CSS SVG grain (mobile)
- `AsciiTrail.tsx` — Fading ASCII characters on mouse movement
- `ScrollProgress.tsx` — Orange bar + percentage indicator
- `LoadingScreen.tsx` — ASCII dissolve "BALOSKY" + curtain split

Mobile-specific:
- `TouchRipple.tsx` — ASCII character ring on tap

Easter egg:
- `KonamiEasterEgg.tsx` — ↑↑↓↓←→←→BA triggers MODO DELIRIO

### Custom Hooks (`src/hooks/`)

- `useIsMobile(breakpoint?)` — MediaQuery-based mobile detection
- `useScrollReveal()` — IntersectionObserver ref hook
- `useMagnetic(radius?, strength?)` — Mouse-following transform on elements

### Key Patterns

- Path alias: `@/` maps to `./src/`
- Booleans stored as 0/1, converted in API responses
- `settings` table: single JSON blob (id=`global`)
- Currency: ARS, USD, CRYPTO (Mercado Pago only processes ARS)
- Campaign `c3` ("Cafecito") is the catch-all for general contributions
- Dark mode persisted in localStorage, respects prefers-color-scheme

## Environment Variables

Copy `.env.example` to `.env`:
- `DATABASE_URL` — Supabase Postgres connection string (required)
- `JWT_SECRET` — Admin auth tokens
- `MP_ACCESS_TOKEN` — Mercado Pago credentials
- `APP_URL` — Public URL for MP webhooks (also drives the CORS allowlist)
- `RESEND_API_KEY` / `FROM_EMAIL` / `ADMIN_EMAIL` — Lead/purchase email notifications (Resend)
- `PRODUCTORA_WHATSAPP` — Número (solo dígitos) para el botón de WhatsApp directo en /productora
- `GEMINI_API_KEY` — Exposed to frontend via Vite define

## Social Links

- Instagram: @santiagobalosky
- Spotify / Apple Music: Balosky
- YouTube: @santiagobalosky
