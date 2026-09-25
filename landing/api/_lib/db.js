// Postgres del chat (proyecto Supabase costo360-operaciones, esquema `atencion`,
// rol `atencion_writer` con permisos solo sobre ese esquema). Pooler Supavisor
// en modo transacción (6543) → sin sentencias preparadas.
import postgres from "postgres";
import { createHash } from "node:crypto";

let _sql = null;
export function sql() {
  if (!_sql) {
    const url = process.env.ATENCION_DATABASE_URL;
    if (!url) throw new Error("ATENCION_DATABASE_URL no configurada");
    _sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 8, ssl: "require" });
  }
  return _sql;
}

export const hashIp = (ip) =>
  createHash("sha256").update((process.env.ATENCION_IP_SALT || "c360") + "|" + ip).digest("hex").slice(0, 32);

const LIMITES = { ip_mensajes: 30, sesion_turnos: 16, global_mensajes: 500 };
export const TOPE_USD_DIA = Number(process.env.ATENCION_DAILY_USD || "4");

/** Suma 1 al contador y devuelve true si sigue dentro del límite. Hora Colombia. */
async function contar(clave, limite) {
  const [r] = await sql()`
    insert into atencion.limites (clave, dia, conteo)
    values (${clave}, (now() at time zone 'America/Bogota')::date, 1)
    on conflict (clave, dia) do update set conteo = atencion.limites.conteo + 1
    returning conteo`;
  return r.conteo <= limite;
}

export async function permitido(ipHash, sesion) {
  const [ip, ses, glob] = await Promise.all([
    contar("ip:" + ipHash, LIMITES.ip_mensajes),
    contar("sesion:" + sesion, LIMITES.sesion_turnos),
    contar("global", LIMITES.global_mensajes),
  ]);
  return ip && ses && glob;
}

export async function chatEncendido() {
  const [r] = await sql()`select valor from atencion.config where clave = 'chat_activo'`;
  return !r || r.valor !== "0";
}

/** Reserva presupuesto ANTES de llamar a Gemini (auditoría). false = sin cupo hoy. */
export async function reservar(usdEstimado) {
  const [r] = await sql()`
    insert into atencion.presupuesto (dia, usd, llamadas)
    values ((now() at time zone 'America/Bogota')::date, ${usdEstimado}, 1)
    on conflict (dia) do update set usd = atencion.presupuesto.usd + ${usdEstimado},
                                    llamadas = atencion.presupuesto.llamadas + 1
    returning usd`;
  return Number(r.usd) <= TOPE_USD_DIA;
}

export async function ajustar(usdEstimado, usdReal) {
  await sql()`update atencion.presupuesto set usd = greatest(0, usd - ${usdEstimado} + ${usdReal})
              where dia = (now() at time zone 'America/Bogota')::date`;
}

export async function registrarTurno(sesion, datos) {
  await sql()`insert into atencion.turnos (sesion, intencion, valido, respaldo, plan_sugerido, usd, ms)
              values (${sesion}, ${datos.intencion}, ${datos.valido}, ${datos.respaldo},
                      ${datos.plan_sugerido}, ${datos.usd}, ${datos.ms})`;
}

export async function guardarLead(lead) {
  const [r] = await sql()`
    insert into atencion.leads (sesion, nombre, whatsapp, correo, taller, necesidad, plan_sugerido,
                                usuarios, resumen, consentimiento_version, ip_hash)
    values (${lead.sesion}, ${lead.nombre}, ${lead.whatsapp}, ${lead.correo}, ${lead.taller},
            ${lead.necesidad}, ${lead.plan_sugerido}, ${lead.usuarios}, ${lead.resumen},
            ${lead.consentimiento_version}, ${lead.ip_hash})
    on conflict (sesion) do nothing
    returning id`;
  return r?.id ?? null;
}
