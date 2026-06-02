-- Applied to Supabase project gtsjzdagqlgxhbnwowtz on 2026-05-19.
-- Purpose: close direct PostgREST access to application tables after Supabase
-- Security Advisor reported rls_disabled_in_public and sensitive_columns_exposed.
--
-- The app reads and writes these tables through the server-side API using the
-- backend DATABASE_URL. The browser should not access public tables directly
-- through the Supabase anon/authenticated roles.

begin;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

alter table public.campaigns enable row level security;
alter table public.discount_codes enable row level security;
alter table public.encargos enable row level security;
alter table public.ideas enable row level security;
alter table public.media enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.processed_payments enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.rewards enable row level security;
alter table public.settings enable row level security;
alter table public.socials enable row level security;
alter table public.subscriptions enable row level security;
alter table public.users enable row level security;
alter table public.wallpaper_leads enable row level security;
alter table public.web_events enable row level security;

commit;
