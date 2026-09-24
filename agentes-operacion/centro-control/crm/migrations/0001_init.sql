-- 0001 — Esquema inicial del Centro de Control en línea (Postgres, proyecto
-- Supabase SEPARADO de los datos de los talleres). Generado desde crm/db.py.
-- Timestamps como texto ISO UTC a propósito (la lógica compara cadenas).

CREATE TABLE rate_events (
	id SERIAL NOT NULL, 
	key VARCHAR NOT NULL, 
	ts VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_rate_events_ts ON rate_events (ts);
CREATE INDEX ix_rate_events_key ON rate_events (key);

CREATE TABLE records (
	id VARCHAR NOT NULL, 
	kind VARCHAR NOT NULL, 
	parent_id VARCHAR, 
	identity VARCHAR, 
	data JSON NOT NULL, 
	version INTEGER NOT NULL, 
	archived BOOLEAN NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES records (id), 
	UNIQUE (identity)
);
CREATE INDEX ix_records_kind ON records (kind);
CREATE INDEX ix_records_parent_id ON records (parent_id);

CREATE TABLE security_log (
	id SERIAL NOT NULL, 
	user_id VARCHAR, 
	event VARCHAR NOT NULL, 
	detail JSON NOT NULL, 
	created_at VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE usage (
	day VARCHAR NOT NULL, 
	calls INTEGER NOT NULL, 
	input_tokens INTEGER NOT NULL, 
	output_tokens INTEGER NOT NULL, 
	PRIMARY KEY (day)
);

CREATE TABLE users (
	id VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	password VARCHAR NOT NULL, 
	role VARCHAR NOT NULL, 
	active BOOLEAN NOT NULL, 
	totp_secret VARCHAR, 
	totp_last_step INTEGER, 
	PRIMARY KEY (id), 
	UNIQUE (email)
);

CREATE TABLE audit (
	id VARCHAR NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	record_id VARCHAR NOT NULL, 
	action VARCHAR NOT NULL, 
	origin VARCHAR NOT NULL, 
	before JSON, 
	after JSON NOT NULL, 
	created_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id), 
	FOREIGN KEY(record_id) REFERENCES records (id)
);
CREATE INDEX ix_audit_record_id ON audit (record_id);

CREATE TABLE messages (
	id SERIAL NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	role VARCHAR NOT NULL, 
	text VARCHAR NOT NULL, 
	evidence JSON NOT NULL, 
	created_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);
CREATE INDEX ix_messages_actor_id ON messages (actor_id);

CREATE TABLE proposals (
	id VARCHAR NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	kind VARCHAR NOT NULL, 
	action VARCHAR NOT NULL, 
	record_id VARCHAR, 
	payload JSON NOT NULL, 
	before JSON, 
	version INTEGER, 
	state VARCHAR NOT NULL, 
	origin VARCHAR NOT NULL, 
	result JSON, 
	created_at VARCHAR NOT NULL, 
	expires VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id), 
	FOREIGN KEY(record_id) REFERENCES records (id)
);
CREATE INDEX ix_proposals_actor_id ON proposals (actor_id);

CREATE TABLE recovery_codes (
	id VARCHAR NOT NULL, 
	user_id VARCHAR NOT NULL, 
	code_hash VARCHAR NOT NULL, 
	used BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_recovery_codes_user_id ON recovery_codes (user_id);

CREATE TABLE sessions (
	token_hash VARCHAR NOT NULL, 
	user_id VARCHAR NOT NULL, 
	csrf VARCHAR NOT NULL, 
	expires VARCHAR NOT NULL, 
	mfa BOOLEAN NOT NULL, 
	last_seen VARCHAR, 
	PRIMARY KEY (token_hash), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

-- Blindaje: nada expuesto por la API de datos de Supabase; RLS deny-all.
ALTER TABLE rate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON rate_events FROM anon, authenticated;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON records FROM anon, authenticated;
ALTER TABLE security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_log FORCE ROW LEVEL SECURITY;
REVOKE ALL ON security_log FROM anon, authenticated;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage FORCE ROW LEVEL SECURITY;
REVOKE ALL ON usage FROM anon, authenticated;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON users FROM anon, authenticated;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON audit FROM anon, authenticated;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
REVOKE ALL ON messages FROM anon, authenticated;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON proposals FROM anon, authenticated;
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON recovery_codes FROM anon, authenticated;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON sessions FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Rol de la aplicación con mínimo privilegio (sin BYPASSRLS; RLS le da acceso vía políticas).
-- La contraseña se fija aparte (ALTER ROLE crm_app PASSWORD ...), nunca en este archivo.
CREATE ROLE crm_app LOGIN NOINHERIT;
GRANT USAGE ON SCHEMA public TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_events TO crm_app;
CREATE POLICY rate_events_crm_app ON rate_events FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON records TO crm_app;
CREATE POLICY records_crm_app ON records FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON security_log TO crm_app;
CREATE POLICY security_log_crm_app ON security_log FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON usage TO crm_app;
CREATE POLICY usage_crm_app ON usage FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO crm_app;
CREATE POLICY users_crm_app ON users FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON audit TO crm_app;
CREATE POLICY audit_crm_app ON audit FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO crm_app;
CREATE POLICY messages_crm_app ON messages FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON proposals TO crm_app;
CREATE POLICY proposals_crm_app ON proposals FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON recovery_codes TO crm_app;
CREATE POLICY recovery_codes_crm_app ON recovery_codes FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO crm_app;
CREATE POLICY sessions_crm_app ON sessions FOR ALL TO crm_app USING (true) WITH CHECK (true);
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_app;
-- Bitácora de auditoría: la app puede escribir pero nunca editar ni borrar.
REVOKE UPDATE, DELETE ON audit, security_log FROM crm_app;
