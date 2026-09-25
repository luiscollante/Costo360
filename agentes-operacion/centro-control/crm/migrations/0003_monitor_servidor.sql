-- 0003 — Vigilante de caídas (aplicada 2026-09-25 en costo360-operaciones).
-- pg_cron revisa cada 5 min /api/health de la app de los talleres y del Centro
-- de Control con pg_net; 2 fallos seguidos (~10 min) → aviso por Telegram, y
-- otro aviso al recuperarse. Vive en la BD del Centro de Control a propósito:
-- un servidor caído no puede avisar de su propia caída, y Vercel Hobby solo
-- permite crons diarios.
-- Secretos en Supabase Vault (NUNCA en este archivo):
--   select vault.create_secret('<token del bot>', 'telegram_bot_token');
--   select vault.create_secret('<chat id>', 'telegram_chat_id');
create extension if not exists pg_net;
create extension if not exists pg_cron;
create schema if not exists monitor;
revoke all on schema monitor from public, anon, authenticated;
create table monitor.estado (
  servicio text primary key, url text not null, ultimo_request bigint,
  fallos int not null default 0, caido boolean not null default false,
  caido_desde timestamptz, actualizado timestamptz not null default now());
insert into monitor.estado (servicio, url) values
  ('Servidor de Costo360 (app de los talleres)', 'https://costo360-backend.vercel.app/api/health'),
  ('Centro de Control', 'https://costo360-centro-control.vercel.app/api/health');
-- monitor.avisar(texto) y monitor.revisar(): ver la definición aplicada en la BD
-- (security definer, search_path vacío, sin permisos para anon/authenticated/crm_app).
select cron.schedule('monitor-servidor', '*/5 * * * *', 'select monitor.revisar()');
