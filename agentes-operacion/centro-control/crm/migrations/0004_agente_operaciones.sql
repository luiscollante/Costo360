BEGIN;
-- 0004 — Agente de operaciones autónomo (ciclo /goal 2026-09-25).
-- Rutinas: 'brief' 06:30 y 'cierre' 18:00 hora Bogotá (pg_cron corre en UTC).
-- Secreto del disparo en Supabase Vault (NUNCA en este archivo):
--   select vault.create_secret('<mismo valor que CRM_AUTO_SECRET en Vercel>', 'cc_auto_secret');

-- 1. Tablas (espejo de crm/db.py: AgentRun y AutoKey).
CREATE TABLE IF NOT EXISTS agent_runs (
  id SERIAL PRIMARY KEY, rutina VARCHAR NOT NULL, fecha VARCHAR NOT NULL,
  estado VARCHAR NOT NULL, intentos INTEGER NOT NULL, iniciada VARCHAR NOT NULL,
  terminada VARCHAR, acciones JSON NOT NULL, telegram_ok BOOLEAN NOT NULL,
  UNIQUE (rutina, fecha));
CREATE TABLE IF NOT EXISTS auto_keys (clave VARCHAR PRIMARY KEY, record_id VARCHAR, created_at VARCHAR NOT NULL);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE auto_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON agent_runs, auto_keys FROM anon, authenticated;
-- Mínimo privilegio: las corridas se crean y actualizan, nunca se borran;
-- las claves de idempotencia solo se insertan.
GRANT SELECT, INSERT, UPDATE ON agent_runs TO crm_app;
GRANT SELECT, INSERT ON auto_keys TO crm_app;
GRANT USAGE, SELECT ON SEQUENCE agent_runs_id_seq TO crm_app;
DROP POLICY IF EXISTS agent_runs_crm_app ON agent_runs;
CREATE POLICY agent_runs_crm_app ON agent_runs FOR ALL TO crm_app USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auto_keys_crm_app ON auto_keys;
CREATE POLICY auto_keys_crm_app ON auto_keys FOR ALL TO crm_app USING (true) WITH CHECK (true);

-- 2. Disparo de una rutina (el endpoint es idempotente: un disparo extra no repite nada).
CREATE OR REPLACE FUNCTION monitor.disparar_agente(rutina text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare sec text;
begin
  select decrypted_secret into sec from vault.decrypted_secrets where name = 'cc_auto_secret';
  if sec is null then
    perform monitor.avisar('⚠️ Agente de operaciones: falta el secreto cc_auto_secret en vault; la rutina "' || rutina || '" no se disparó.');
    return;
  end if;
  perform net.http_get(
    url := 'https://costo360-centro-control.vercel.app/api/cron/agente?r=' || rutina,
    headers := jsonb_build_object('Authorization', 'Bearer ' || sec),
    timeout_milliseconds := 58000);
end $$;

-- 3. Alarma si una rutina no terminó bien (pg_net no reintenta por sí solo).
CREATE OR REPLACE FUNCTION monitor.revisar_agente(rutina text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare hoy text := to_char((now() at time zone 'America/Bogota')::date, 'YYYY-MM-DD');
begin
  if not exists (select 1 from public.agent_runs r where r.rutina = revisar_agente.rutina
                 and r.fecha = hoy and r.estado in ('ok', 'apagado')) then
    perform monitor.avisar('⚠️ Agente de operaciones: la rutina "'
      || case rutina when 'brief' then 'resumen de la mañana' else 'cierre de la tarde' end
      || '" de hoy (' || hoy || ') no se completó. Revisa el Centro de Control.');
  end if;
end $$;

REVOKE ALL ON FUNCTION monitor.disparar_agente(text), monitor.revisar_agente(text) FROM public, anon, authenticated;

-- 4. Horarios (UTC = Bogotá + 5 h). Cada rutina tiene un reintento 15 min
--    después (no hace nada si ya quedó 'ok') y una alarma 30 min después.
select cron.schedule('agente-brief',          '30 11 * * *', $$select monitor.disparar_agente('brief')$$);
select cron.schedule('agente-brief-reintento', '45 11 * * *', $$select monitor.disparar_agente('brief')$$);
select cron.schedule('agente-brief-alarma',   '0 12 * * *',  $$select monitor.revisar_agente('brief')$$);
select cron.schedule('agente-cierre',          '0 23 * * *',  $$select monitor.disparar_agente('cierre')$$);
select cron.schedule('agente-cierre-reintento', '15 23 * * *', $$select monitor.disparar_agente('cierre')$$);
select cron.schedule('agente-cierre-alarma',   '30 23 * * *', $$select monitor.revisar_agente('cierre')$$);
COMMIT;
