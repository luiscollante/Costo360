import { useMemo, useState } from "react";
import { ArrowUpRight, Info, Layers3, Plus, RotateCcw, ScanLine, Trash2 } from "lucide-react";
import { optimizarCorte, type PiezaEntrada } from "../lib/nesting";
import "../nesting-studio.css";

/*
 * Simulador de nesting de la landing (2026-09-25, pedido del fundador: "no
 * quiero vender algo que no ofrece Costo360"). Usa EXACTAMENTE el mismo
 * algoritmo de la plataforma (src/lib/nesting.ts, verificado contra el motor
 * de Python con 200 casos) y se opera igual que el módulo Nesting real:
 * lámina con largo y ancho editables + lista de piezas con nombre, largo,
 * ancho y cantidad. El largo va en vertical y el ancho en horizontal, y una
 * pieza solo se rota cuando es la única forma de que quepa.
 */

const PIEZAS_INICIALES: PiezaEntrada[] = [
  { nombre: "Mesón cocina", largo: 2.4, ancho: 0.6, cantidad: 1 },
  { nombre: "Salpicadero", largo: 1.5, ancho: 0.6, cantidad: 1 },
  { nombre: "Isla", largo: 1.2, ancho: 0.9, cantidad: 1 },
];
const LAMINA_INICIAL = { largo: 3.2, ancho: 1.6 };
const MAX_TIPOS = 8;
const MAX_CANTIDAD = 10;

const COLORES = [
  ["#0F3320", "#3FA968"], ["#3A2A0C", "#D4AF37"], ["#2E1810", "#C97B4A"], ["#1E1428", "#A070C0"],
  ["#2A1010", "#C05858"], ["#0C2820", "#4FA898"], ["#1C2410", "#8FA850"], ["#241A08", "#B08840"],
];

const num = (v: number, d = 2) => v.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const medida = (texto: string) => {
  const v = parseFloat(texto.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

function CampoMedida({ id, label, valor, onChange, max }: { id: string; label: string; valor: number; onChange: (v: number) => void; max: number }) {
  const [texto, setTexto] = useState(num(valor));
  return (
    <label className="ns-field" htmlFor={id}>
      <span>{label}</span>
      <span className="ns-input">
        <input
          id={id}
          inputMode="decimal"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            const v = medida(e.target.value);
            if (v > 0 && v <= max) onChange(v);
          }}
          onBlur={() => setTexto(num(valor))}
        />
        <small>m</small>
      </span>
    </label>
  );
}

export function InteractiveStudio() {
  const [lamina, setLamina] = useState(LAMINA_INICIAL);
  const [piezas, setPiezas] = useState<PiezaEntrada[]>(PIEZAS_INICIALES);
  const [version, setVersion] = useState(0); // reinicia los campos al restablecer

  const r = useMemo(() => optimizarCorte(lamina.largo, lamina.ancho, piezas), [lamina, piezas]);
  const total = piezas.reduce((s, p) => s + p.cantidad, 0);

  const cambiar = (i: number, cambio: Partial<PiezaEntrada>) =>
    setPiezas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambio } : p)));

  function restablecer() {
    setLamina(LAMINA_INICIAL);
    setPiezas(PIEZAS_INICIALES);
    setVersion((v) => v + 1);
  }

  // Dibujo: ancho en X, largo en Y (misma convención que el plano real).
  const pad = 0.28;
  const vw = lamina.ancho + pad * 2;
  const vh = lamina.largo + pad * 2;
  const fs = Math.max(lamina.ancho, lamina.largo) / 26;

  return (
    <section className="studio-section section" id="simulador" aria-labelledby="studio-title">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">02 / ANTES DE CORTAR, HAZ LAS CUENTAS</p>
            <h2 id="studio-title">
              ¿Caben todas las piezas?
              <br />
              <span>Compruébalo antes de cortar.</span>
            </h2>
          </div>
          <div>
            <span className="pill">
              <span className="status-dot" /> PRUÉBALO CON TUS MEDIDAS
            </span>
            <p>
              Descubrir que falta material a mitad del trabajo cuesta.
              <br />
              Ingresa tus medidas y revisa cómo acomodar las piezas.
            </p>
          </div>
        </div>

        <div className="studio-window">
          <div className="window-bar">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span>Costo360 <span className="window-path">/ Plano de corte</span></span>
            <span className="demo-label">PRUEBA SIN CUENTA</span>
          </div>

          <div className="ns-body" key={version}>
            <div className="ns-controls">
              <div className="control-heading">
                <Layers3 size={19} />
                <h3>Lámina</h3>
                <button type="button" className="icon-button" onClick={restablecer} aria-label="Restablecer ejemplo" title="Restablecer">
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="ns-row">
                <CampoMedida id="lam-largo" label="Largo" valor={lamina.largo} max={6} onChange={(v) => setLamina((l) => ({ ...l, largo: v }))} />
                <CampoMedida id="lam-ancho" label="Ancho" valor={lamina.ancho} max={3} onChange={(v) => setLamina((l) => ({ ...l, ancho: v }))} />
              </div>
              <p className="ns-area">Área de la lámina <strong>{num(r.areaLamina)} m²</strong></p>

              <div className="control-heading ns-pieces-heading">
                <h3>Piezas</h3>
                <span className="ns-count">{total} {total === 1 ? "pieza" : "piezas"}</span>
              </div>
              <ol className="ns-pieces">
                {piezas.map((p, i) => (
                  <li key={i} style={{ borderLeftColor: COLORES[i % COLORES.length][1] }}>
                    <div className="ns-piece-top">
                      <span className="ns-piece-id">P{String(i + 1).padStart(2, "0")}</span>
                      <input
                        aria-label={`Nombre de la pieza ${i + 1}`}
                        value={p.nombre}
                        maxLength={30}
                        onChange={(e) => cambiar(i, { nombre: e.target.value })}
                      />
                      <button type="button" className="ns-delete" disabled={piezas.length <= 1}
                        onClick={() => setPiezas((ps) => ps.filter((_, j) => j !== i))} aria-label={`Quitar ${p.nombre}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="ns-row ns-row-3">
                      <CampoMedida id={`p${i}-l`} label="Largo" valor={p.largo} max={6} onChange={(v) => cambiar(i, { largo: v })} />
                      <CampoMedida id={`p${i}-a`} label="Ancho" valor={p.ancho} max={3} onChange={(v) => cambiar(i, { ancho: v })} />
                      <label className="ns-field" htmlFor={`p${i}-c`}>
                        <span>Cant.</span>
                        <span className="ns-input">
                          <input id={`p${i}-c`} type="number" min={1} max={MAX_CANTIDAD} value={p.cantidad}
                            onChange={(e) => cambiar(i, { cantidad: Math.min(MAX_CANTIDAD, Math.max(1, Number(e.target.value) || 1)) })} />
                        </span>
                      </label>
                    </div>
                  </li>
                ))}
              </ol>
              <button type="button" className="ns-add" disabled={piezas.length >= MAX_TIPOS}
                onClick={() => setPiezas((ps) => [...ps, { nombre: `Pieza ${ps.length + 1}`, largo: 0.8, ancho: 0.5, cantidad: 1 }])}>
                <Plus size={16} /> Agregar pieza
              </button>
            </div>

            <div className="ns-plan">
              <div className="canvas-heading">
                <span><ScanLine size={17} /> Plano de corte</span>
                <span className="mono">{num(lamina.largo)} × {num(lamina.ancho)} m</span>
              </div>
              <div className="ns-board">
                <div className="ns-board-head">
                  <p className="ns-board-title">PLANO DE CORTE <span>· Placa {num(lamina.largo)} × {num(lamina.ancho)} m</span></p>
                  <span className="ns-board-brand">Costo360</span>
                </div>
                <div className="ns-chips">
                  <span className="ns-chip ns-chip-uso"><i /> USO <strong>{num(r.aprovechamiento, 1)}%</strong></span>
                  <span className="ns-chip ns-chip-retal"><i /> RETAL <strong>{num(r.retal, 1)}%</strong></span>
                </div>
                <svg viewBox={`${-pad} ${-pad} ${vw} ${vh}`} role="img" aria-labelledby="ns-title ns-desc" className="ns-svg">
                  <title id="ns-title">Plano de corte calculado con el motor de Costo360</title>
                  <desc id="ns-desc">
                    {r.colocadas.length} de {total} piezas ubicadas. Aprovechamiento {num(r.aprovechamiento, 1)} por ciento.
                  </desc>
                  <defs>
                    <pattern id="ns-hatch" width={fs * 1.2} height={fs * 1.2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2={fs * 1.2} stroke="#1d4a31" strokeWidth={fs * 0.12} />
                    </pattern>
                  </defs>
                  <rect x={0} y={0} width={lamina.ancho} height={lamina.largo} fill="#0b2a1a" stroke="#2f6b4a" strokeWidth={fs * 0.12} />
                  <rect x={0} y={0} width={lamina.ancho} height={lamina.largo} fill="url(#ns-hatch)" />
                  {/* cotas de la lámina */}
                  <line x1={0} y1={-pad * 0.45} x2={lamina.ancho} y2={-pad * 0.45} stroke="#D4AF37" strokeWidth={fs * 0.08} />
                  <text x={lamina.ancho / 2} y={-pad * 0.6} textAnchor="middle" fill="#D4AF37" fontSize={fs * 0.9}>{num(lamina.ancho)} m</text>
                  <line x1={-pad * 0.45} y1={0} x2={-pad * 0.45} y2={lamina.largo} stroke="#D4AF37" strokeWidth={fs * 0.08} />
                  <text x={-pad * 0.6} y={lamina.largo / 2} textAnchor="middle" fill="#D4AF37" fontSize={fs * 0.9}
                    transform={`rotate(-90 ${-pad * 0.6} ${lamina.largo / 2})`}>{num(lamina.largo)} m</text>
                  {r.colocadas.map((p, k) => {
                    const [fill, stroke] = COLORES[k % COLORES.length];
                    const cx = p.x + p.w / 2;
                    const cy = p.y + p.h / 2;
                    const f = Math.min(fs, p.w / 4, p.h / 3);
                    const etiqueta = `${num(p.anchoOriginal)} × ${num(p.largoOriginal)} m`;
                    // Texto de medidas escalado para que nunca se salga de la pieza.
                    const fMedidas = Math.min(f * 0.85, (p.w * 0.9) / (etiqueta.length * 0.62));
                    return (
                      <g key={k}>
                        <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={fill} stroke={stroke} strokeWidth={fs * 0.1} />
                        {p.rotada && (
                          <>
                            <rect x={p.x} y={p.y} width={p.w} height={Math.min(p.h * 0.18, fs * 1.4)} fill="#c62828" />
                            <text x={cx} y={p.y + Math.min(p.h * 0.13, fs)} textAnchor="middle" fill="#fff" fontSize={Math.min(f, fs * 0.8)} fontWeight="700">ROTADA</text>
                          </>
                        )}
                        <text x={cx} y={cy} textAnchor="middle" fill="#fff" fontSize={f * 1.8} fontWeight="700">{k + 1}</text>
                        <text x={cx} y={cy + f * 1.4} textAnchor="middle" fill="#cfe3d6" fontSize={fMedidas}>
                          {etiqueta}
                        </text>
                        <text x={cx} y={cy + f * 2.4} textAnchor="middle" fill="#9fbfae" fontSize={Math.min(fMedidas * 0.9, (p.w * 0.9) / (p.nombre.length * 0.6))}>
                          {p.nombre}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="dimension-bottom">
                  <span><i className="legend-piece" /> Pieza ubicada</span>
                  <span><i className="ns-legend-rot" /> Rotada 90° (solo si no cabía)</span>
                  <span><i className="legend-free" /> Retal</span>
                </div>
              </div>

              <div className="simulation-results" aria-live="polite" aria-atomic="true">
                <div><span>Aprovechamiento</span><strong>{num(r.aprovechamiento, 1)}<small>%</small></strong></div>
                <div><span>Retal</span><strong>{num(r.areaLamina - r.areaUsada)}<small>m²</small></strong></div>
                <div><span>Piezas ubicadas</span><strong>{r.colocadas.length}<small>/ {total}</small></strong></div>
                <p className={r.noCaben.length ? "placement-warning" : "placement-ok"}>
                  {r.noCaben.length
                    ? `No caben en esta lámina: ${r.noCaben.join(", ")}. Costo360 te lo indica igual antes de cortar.`
                    : "Todas las piezas caben en esta lámina."}
                </p>
              </div>
            </div>
          </div>

          <div className="studio-disclaimer">
            <Info size={16} />
            <p>
              <strong>Es el mismo cálculo de la plataforma.</strong> Aquí no se guarda nada ni se crea una cotización.
              Dentro de Costo360 además descargas el plano, consultas tus láminas y guardas el retal
              sobrante en el banco de retales. Revisa siempre el plano antes de cortar.
            </p>
          </div>
        </div>

        <div className="studio-bottom">
          <p>El material que queda también merece un lugar en tus decisiones.</p>
          <a href="#modulos" className="text-button">Conoce el banco de retales <ArrowUpRight size={17} /></a>
        </div>
      </div>
    </section>
  );
}
