-- ============================================================================
-- 0005 — Catálogo de materiales por taller (Ciclo 2 / R10 del rediseño visual)
-- ============================================================================
-- Hasta ahora `catalogo_materiales` era UN catálogo global compartido y de solo
-- lectura. Esta migración le agrega `empresa_id`:
--   - empresa_id IS NULL  → fila base de Costo360, visible para todos los talleres.
--   - empresa_id = <uuid> → material propio de ESE taller (lo agregó al elegir
--     "Otro" en una cotización). Cada taller solo ve/edita los suyos.
-- NO toca el motor de cálculo.
-- ============================================================================

alter table catalogo_materiales
  add column if not exists empresa_id uuid references empresas(id) on delete cascade;

create index if not exists idx_catalogo_empresa on catalogo_materiales(empresa_id);

-- Evita duplicados del mismo material propio dentro de un taller (case-insensitive).
-- Las filas base (empresa_id IS NULL) quedan fuera del índice.
create unique index if not exists catalogo_mat_empresa_uniq
  on catalogo_materiales (empresa_id, lower(categoria), lower(referencia))
  where empresa_id is not null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- SELECT: base (NULL) + los del propio taller.
drop policy if exists catalogo_materiales_select on catalogo_materiales;
create policy catalogo_materiales_select on catalogo_materiales
  for select to authenticated
  using (empresa_id is null or empresa_id = (select empresa_actual()));

-- INSERT/UPDATE/DELETE: SOLO filas del propio taller. Nadie toca las base ni las
-- de otro taller (empresa_id = NULL nunca hace match con = ...).
drop policy if exists catalogo_materiales_insert on catalogo_materiales;
create policy catalogo_materiales_insert on catalogo_materiales
  for insert to authenticated
  with check (empresa_id = (select empresa_actual()));

drop policy if exists catalogo_materiales_update on catalogo_materiales;
create policy catalogo_materiales_update on catalogo_materiales
  for update to authenticated
  using (empresa_id = (select empresa_actual()))
  with check (empresa_id = (select empresa_actual()));

drop policy if exists catalogo_materiales_delete on catalogo_materiales;
create policy catalogo_materiales_delete on catalogo_materiales
  for delete to authenticated
  using (empresa_id = (select empresa_actual()));

grant insert, update, delete on table catalogo_materiales to authenticated;
