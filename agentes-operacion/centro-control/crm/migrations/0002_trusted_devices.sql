-- 0002 — Dispositivos reconocidos ("Recordar este dispositivo", 30 días). Aplicada 2026-09-24.
CREATE TABLE trusted_devices (id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, token_hash VARCHAR NOT NULL, label VARCHAR NOT NULL, expires VARCHAR NOT NULL, created_at VARCHAR NOT NULL, PRIMARY KEY (id), FOREIGN KEY(user_id) REFERENCES users (id), UNIQUE (token_hash));
CREATE INDEX ix_trusted_devices_user_id ON trusted_devices (user_id);
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices FORCE ROW LEVEL SECURITY;
REVOKE ALL ON trusted_devices FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trusted_devices TO crm_app;
CREATE POLICY trusted_devices_crm_app ON trusted_devices FOR ALL TO crm_app USING (true) WITH CHECK (true);
