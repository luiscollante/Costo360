import {
  ArrowUpRight,
  ChartNoAxesCombined,
  FileText,
  FolderKanban,
  Layers3,
  Package,
  Settings2,
} from "lucide-react";
export function BentoEcosystem() {
  return (
    <section
      className="section container ecosystem"
      id="modulos"
      aria-labelledby="ecosystem-title"
    >
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">03 / CONECTADO CON TU FORMA DE TRABAJAR</p>
          <h2 id="ecosystem-title">
            Más que cotizar.
            <br />
            <span>Una visión completa de tu taller.</span>
          </h2>
        </div>
        <p>
          Deja de mirar cada dato por separado.
          <br />
          Materiales, propuestas y proyectos,
          <br />
          dentro del mismo ecosistema.
        </p>
      </div>
      <div className="bento-grid">
        <article className="bento-card bento-material">
          <div className="card-kicker">
            <Layers3 size={22} />
            <span>MATERIAL BAJO CONTROL</span>
          </div>
          <h3>
            Lo que tienes.
            <br />
            Lo que puedes aprovechar.
          </h3>
          <p>
            Un catálogo con tus referencias y precios por m². Inventario de
            láminas con dimensiones, proveedor, ubicación y stock mínimo. Y un
            banco de retales para dar visibilidad al material reutilizable.
          </p>
          <div className="material-stack" aria-hidden="true">
            <div className="sample sample-back" />
            <div className="sample sample-middle" />
            <div className="sample sample-front" />
            <span className="sample-label">
              <Package size={15} /> CADA MATERIAL, EN SU LUGAR
            </span>
          </div>
          <div className="card-tags">
            <span>Catálogo editable</span>
            <span>Láminas</span>
            <span>Retales</span>
          </div>
        </article>
        <article className="bento-card bento-pdf">
          <div className="card-kicker">
            <FileText size={21} />
            <span>DEL CÁLCULO A LA PROPUESTA</span>
          </div>
          <h3>Tu trabajo, bien presentado.</h3>
          <p>
            Cotizaciones y cuentas de cobro en PDF profesional para compartir
            con tu cliente.
          </p>
          <div
            className="pdf-preview"
            aria-label="Representación ilustrativa de un documento, no es un PDF real del producto"
          >
            <div className="pdf-paper">
              <img
                src="/logo_versiones_oscuras.png"
                alt=""
                width="640"
                height="213"
                loading="lazy"
              />
              <span className="pdf-heading">Cotización de proyecto</span>
              <span className="pdf-rule" />
              <div>
                <span>Material</span>
                <span>Detalle de piezas</span>
              </div>
              <div>
                <span>Mano de obra</span>
                <span>Insumos</span>
              </div>
              <span className="pdf-rule" />
              <strong>Todo empieza con un desglose claro.</strong>
              <span className="pdf-example">DOCUMENTO ILUSTRATIVO</span>
            </div>
            <span className="pdf-badge">
              <FileText size={17} /> .PDF <ArrowUpRight size={14} />
            </span>
          </div>
        </article>
        <article className="bento-card bento-project">
          <div className="card-kicker">
            <FolderKanban size={21} />
            <span>DESPUÉS DE COTIZAR</span>
          </div>
          <h3>El proyecto sigue. Tú también.</h3>
          <p>
            Tablero Kanban, tareas, hitos con dependencias, registro de horas y
            avisos de plazos o riesgos.
          </p>
          <div
            className="mini-kanban"
            aria-label="Ejemplo visual de organización de tareas"
          >
            <div>
              <span>POR HACER</span>
              <div className="kanban-task">
                <i /> Revisar medidas<span>Preparación</span>
              </div>
            </div>
            <div>
              <span>EN CURSO</span>
              <div className="kanban-task moving-task">
                <i /> Corte de piezas<span>Producción</span>
              </div>
            </div>
            <div>
              <span>LISTO</span>
              <div className="kanban-task">
                <i /> Elegir material<span>Definición</span>
              </div>
            </div>
          </div>
          <span className="illustration-label">Ejemplo ilustrativo</span>
        </article>
        <article className="bento-card bento-data">
          <div className="card-kicker">
            <ChartNoAxesCombined size={22} />
            <span>DECISIONES CON CONTEXTO</span>
          </div>
          <h3>
            Tus números.
            <br />
            Sin perder el panorama.
          </h3>
          <p>
            Consulta ingresos por mes, margen promedio y materiales más
            cotizados en el dashboard. Encuentra cotizaciones por cliente,
            estado, fecha o material.
          </p>
          <div className="data-visual" aria-hidden="true">
            {[38, 62, 45, 76, 56, 88, 68, 96, 79, 100].map((height, i) => (
              <span
                key={i}
                style={{ height: `${height}%`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
            <span className="data-line" />
          </div>
          <span className="illustration-label">
            Gráfico conceptual · No representa métricas reales
          </span>
        </article>
      </div>
      <div className="parameters-strip">
        <span className="parameters-icon">
          <Settings2 size={24} />
        </span>
        <div>
          <h3>No todos los talleres cuestan lo mismo.</h3>
          <p>
            Configura mano de obra, maquinaria, consumibles y merma por
            material. Tus parámetros alimentan tus próximas cotizaciones.
          </p>
        </div>
        <span className="mono">
          TUS REGLAS.
          <br />
          TU COSTO360.
        </span>
      </div>
    </section>
  );
}
