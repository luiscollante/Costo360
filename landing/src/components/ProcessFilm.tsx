import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  Pause,
  Play,
  Ruler,
  SlidersHorizontal,
} from "lucide-react";

const chapters = [
  {
    title: "Cada medida tiene un lugar.",
    text: "Define material, dimensiones y cantidades. Empieza por las piezas que realmente necesita tu proyecto.",
    label: "Define las piezas",
    icon: Ruler,
  },
  {
    title: "Cada costo, una razón.",
    text: "Material, mano de obra, insumos y riesgo de rotura. Un desglose con los parámetros de tu taller, no con tarifas inventadas.",
    label: "Revisa el desglose",
    icon: SlidersHorizontal,
  },
  {
    title: "Tu propuesta, lista para compartir.",
    text: "Genera una cotización en PDF profesional. Lleva la información del cálculo a la conversación con tu cliente.",
    label: "Presenta tu trabajo",
    icon: FileText,
  },
];

/** Motion design rendered locally; not a video or a recording of the product. */
export function ProcessFilm({ paused }: { paused: boolean }) {
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (paused || !playing || !visible) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setChapter((current) => (current + 1) % chapters.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, playing, visible, chapter]);
  const current = chapters[chapter];
  return (
    <div
      ref={ref}
      className={`process-film chapter-${chapter} ${playing && !paused && visible ? "film-playing" : ""}`}
    >
      <div className="film-topline">
        <span>
          <span className="status-dot" /> DEL OFICIO A LOS DATOS
        </span>
        <span>RECORRIDO ANIMADO / 03 ESCENAS</span>
      </div>
      <div className="film-body">
        <div className="film-art" aria-hidden="true">
          <div className="film-orbit" />
          <div className="film-slab">
            <div className="film-piece piece-a" />
            <div className="film-piece piece-b" />
            <div className="film-piece piece-c" />
            <div className="film-measure measure-x">
              <span>LARGO</span>
            </div>
            <div className="film-measure measure-y">
              <span>ANCHO</span>
            </div>
            <div className="film-laser" />
          </div>
          <div className="film-costs">
            <div>
              <SlidersHorizontal size={17} />
              <strong>El costo, desglosado.</strong>
            </div>
            {["Material", "Mano de obra", "Insumos", "Riesgo de rotura"].map(
              (label, i) => (
                <div key={label}>
                  <span>{label}</span>
                  <i style={{ width: `${65 - i * 11}px` }} />
                </div>
              ),
            )}
            <div className="film-total">
              <Check size={15} />
              <span>Las reglas de tu taller</span>
            </div>
          </div>
          <div className="film-document">
            <img
              src="/logo_versiones_oscuras.png"
              width="640"
              height="213"
              alt=""
              loading="lazy"
            />
            <span>COTIZACIÓN DE PROYECTO</span>
            <div className="document-line" />
            <div className="document-line short" />
            <div className="document-material" />
            <div className="document-line" />
            <div className="document-line short" />
            <div className="film-pdf">
              <FileText size={17} /> PDF PROFESIONAL
            </div>
          </div>
          <span className="film-art-caption">
            Representación conceptual · No es una captura del producto
          </span>
        </div>
        <div className="film-copy">
          <span className="film-count">
            0{chapter + 1}
            <span> / 03</span>
          </span>
          <h3>{current.title}</h3>
          <p>{current.text}</p>
          <a href="#simulador" className="text-button">
            Ahora pruébalo tú <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <div className="film-controls">
        <div
          className="film-chapters"
          role="group"
          aria-label="Escenas del recorrido animado"
        >
          {chapters.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              aria-pressed={chapter === index}
              onClick={() => {
                setChapter(index);
                setPlaying(false);
              }}
              className={chapter === index ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
              <i key={`${chapter}-${index}-${playing}`} />
            </button>
          ))}
        </div>
        <button
          className="film-play icon-button"
          type="button"
          aria-label={playing ? "Pausar recorrido" : "Reproducir recorrido"}
          aria-pressed={playing}
          onClick={() => setPlaying(!playing)}
          disabled={paused}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
      </div>
    </div>
  );
}
