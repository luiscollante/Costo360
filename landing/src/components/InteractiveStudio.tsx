import { useState } from "react";
import {
  ArrowUpRight,
  Info,
  Layers3,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import { materials } from "../lib/content";
import { layoutPieces } from "../lib/nesting";
const decimal = (value: number, digits = 2) =>
  value.toLocaleString("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export function InteractiveStudio() {
  const [material, setMaterial] = useState(0);
  const [length, setLength] = useState(140);
  const [width, setWidth] = useState(60);
  const [count, setCount] = useState(4);
  const result = layoutPieces(320, 160, length, width, count);
  function reset() {
    setMaterial(0);
    setLength(140);
    setWidth(60);
    setCount(4);
  }
  return (
    <section
      className="studio-section section"
      id="simulador"
      aria-labelledby="studio-title"
    >
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">02 / MENOS SUPOSICIONES. MÁS VISIBILIDAD.</p>
            <h2 id="studio-title">
              No lo imagines.
              <br />
              <span>Muévelo. Mídelo. Entiéndelo.</span>
            </h2>
          </div>
          <div>
            <span className="pill">
              <span className="status-dot" /> SIMULADOR ILUSTRATIVO
            </span>
            <p>
              Una lámina. Tus decisiones.
              <br />
              Cambia las medidas y mira qué sucede.
            </p>
          </div>
        </div>
        <div className="studio-window">
          <div className="window-bar">
            <div className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span>
              Ejemplo local{" "}
              <span className="window-path">/ Distribución de piezas</span>
            </span>
            <span className="demo-label">MODELO ILUSTRATIVO</span>
          </div>
          <div className="studio-body">
            <div className="studio-controls">
              <div className="control-heading">
                <Layers3 size={19} />
                <h3>Define tus piezas</h3>
                <button
                  type="button"
                  className="icon-button"
                  onClick={reset}
                  aria-label="Restablecer demostración"
                  title="Restablecer"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <label className="field-label" htmlFor="demo-material">
                Material de referencia
              </label>
              <select
                id="demo-material"
                value={material}
                onChange={(event) => setMaterial(Number(event.target.value))}
              >
                {materials.map((item, index) => (
                  <option value={index} key={item.name}>
                    {item.name} · {item.reference}
                  </option>
                ))}
              </select>
              <div className="range-label">
                <label htmlFor="piece-length">Largo de cada pieza</label>
                <output htmlFor="piece-length">
                  {length} <span>cm</span>
                </output>
              </div>
              <input
                id="piece-length"
                type="range"
                min="60"
                max="260"
                step="10"
                value={length}
                onChange={(event) => setLength(Number(event.target.value))}
              />
              <div className="range-extents">
                <span>60 cm</span>
                <span>260 cm</span>
              </div>
              <div className="range-label">
                <label htmlFor="piece-width">Ancho de cada pieza</label>
                <output htmlFor="piece-width">
                  {width} <span>cm</span>
                </output>
              </div>
              <input
                id="piece-width"
                type="range"
                min="30"
                max="100"
                step="5"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
              <div className="range-extents">
                <span>30 cm</span>
                <span>100 cm</span>
              </div>
              <div className="quantity-row">
                <span id="quantity-label">Cantidad de piezas</span>
                <div
                  className="stepper"
                  role="group"
                  aria-labelledby="quantity-label"
                >
                  <button
                    type="button"
                    disabled={count <= 1}
                    onClick={() => setCount(count - 1)}
                    aria-label="Quitar una pieza"
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-live="polite">{count}</output>
                  <button
                    type="button"
                    disabled={count >= 8}
                    onClick={() => setCount(count + 1)}
                    aria-label="Agregar una pieza"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              <div className="control-note">
                <Info size={16} />
                <p>
                  Prueba libremente. Esta demo no guarda datos ni crea una
                  cotización.
                </p>
              </div>
            </div>
            <div className="studio-canvas">
              <div className="canvas-heading">
                <span>
                  <ScanLine size={17} /> Plano de distribución
                </span>
                <span className="mono">320 × 160 cm</span>
              </div>
              <div className="cutting-board">
                <div className="dimension-top">320 cm</div>
                <svg
                  viewBox="0 0 320 160"
                  role="img"
                  aria-labelledby="cut-title cut-desc"
                >
                  <title id="cut-title">
                    Distribución ilustrativa de piezas sobre una lámina
                  </title>
                  <desc id="cut-desc">
                    {result.pieces.length} de {count} piezas ubicadas,
                    aprovechamiento de área {decimal(result.utilization, 1)} por
                    ciento. {result.unplaced} piezas sin ubicar.
                  </desc>
                  <defs>
                    <pattern
                      id="stone-pattern"
                      width="320"
                      height="160"
                      patternUnits="userSpaceOnUse"
                    >
                      <image
                        href={materials[material].image}
                        width="320"
                        height="320"
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </pattern>
                    <pattern
                      id="unused-pattern"
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M0 6L6 0" stroke="#E5D5BA" strokeWidth="0.65" />
                    </pattern>
                  </defs>
                  <rect width="320" height="160" fill="#F5E8D2" />
                  <rect width="320" height="160" fill="url(#unused-pattern)" />
                  {result.pieces.map((piece) => (
                    <g key={piece.id} className="cut-piece">
                      <rect
                        x={piece.x + 1}
                        y={piece.y + 1}
                        width={piece.width - 2}
                        height={piece.height - 2}
                        rx="2"
                        fill="url(#stone-pattern)"
                      />
                      <rect
                        x={piece.x + 1}
                        y={piece.y + 1}
                        width={piece.width - 2}
                        height={piece.height - 2}
                        rx="2"
                        fill="#15612E"
                        fillOpacity="0.16"
                        stroke="#15612E"
                        strokeWidth="0.8"
                      />
                      <rect
                        x={piece.x + piece.width / 2 - 23}
                        y={piece.y + piece.height / 2 - 12}
                        width="46"
                        height="24"
                        rx="3"
                        fill="#00311D"
                      />
                      <text
                        x={piece.x + piece.width / 2}
                        y={piece.y + piece.height / 2 - 2}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="6"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        PIEZA {piece.id}
                      </text>
                      <text
                        x={piece.x + piece.width / 2}
                        y={piece.y + piece.height / 2 + 7}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="6"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {piece.width} × {piece.height}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className="dimension-bottom">
                  <span>
                    <i className="legend-piece" /> Pieza ubicada
                  </span>
                  <span>
                    <i className="legend-free" /> Área restante
                  </span>
                </div>
              </div>
              <div
                className="simulation-results"
                aria-live="polite"
                aria-atomic="true"
              >
                <div>
                  <span>Área aprovechada</span>
                  <strong>
                    {decimal(result.utilization, 1)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <span>Área restante</span>
                  <strong>
                    {decimal(result.remainingArea)}
                    <small>m²</small>
                  </strong>
                </div>
                <div>
                  <span>Piezas ubicadas</span>
                  <strong>
                    {result.pieces.length}
                    <small>/ {count}</small>
                  </strong>
                </div>
                <p
                  className={
                    result.unplaced ? "placement-warning" : "placement-ok"
                  }
                >
                  {result.unplaced
                    ? `${result.unplaced} ${result.unplaced === 1 ? "pieza no cabe" : "piezas no caben"} en esta distribución. Ajusta las medidas o la cantidad.`
                    : "Todas las piezas caben en esta distribución ilustrativa."}
                </p>
              </div>
            </div>
          </div>
          <div className="studio-disclaimer">
            <Info size={16} />
            <p>
              <strong>Datos de ejemplo, no una promesa de ahorro.</strong>{" "}
              Modelo local simplificado, sin rotación, ancho de disco ni
              restricciones de veta. El material cambia solo la visualización.
              El motor real de Costo360 usa Guillotine 2D; valida el plano antes
              de cortar.
            </p>
          </div>
        </div>
        <div className="studio-bottom">
          <p>
            El material que queda también merece un lugar en tus decisiones.
          </p>
          <a href="#modulos" className="text-button">
            Conoce el banco de retales <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
    </section>
  );
}
