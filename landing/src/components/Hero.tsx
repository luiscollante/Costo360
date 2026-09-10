import { useState, type PointerEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Layers3,
  MoveUpRight,
  Play,
  ScanLine,
} from "lucide-react";
import { materials } from "../lib/content";
import { Particles } from "./ui/Particles";

export function Hero({ paused }: { paused: boolean }) {
  const [selected, setSelected] = useState(0);
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 95, damping: 22 });
  const rotateY = useSpring(y, { stiffness: 95, damping: 22 });
  const material = materials[selected];
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (paused || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set(-((event.clientY - box.top) / box.height - 0.5) * 10);
    y.set(((event.clientX - box.left) / box.width - 0.5) * 10);
  }
  return (
    <section
      className="hero container"
      id="inicio"
      aria-labelledby="hero-title"
    >
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" /> SOFTWARE PARA TALLERES DE PIEDRA
        </div>
        <h1 id="hero-title">
          Tu oficio es
          <br />
          la piedra.
          <br />
          <span>
            Tu margen,
            <br className="mobile-break" /> no se improvisa.
          </span>
        </h1>
        <p className="hero-description">
          De la primera medida a la cotización final. Conecta costos, cortes y
          proyectos en un solo lugar, con las reglas de{" "}
          <strong>tu taller.</strong>
        </p>
        <div className="hero-buttons">
          <a className="button" href="#solucion">
            Conoce Costo360 <ArrowUpRight size={19} />
          </a>
          <a href="#simulador" className="text-button">
            <span className="play-icon">
              <Play size={13} fill="currentColor" />
            </span>{" "}
            Explorar la demo
          </a>
        </div>
        <div className="hero-notes">
          <span>
            <Check size={14} /> Hecho para Colombia
          </span>
          <span>
            <Check size={14} /> Acceso por invitación
          </span>
        </div>
      </div>
      <div
        className="hero-scene"
        onPointerMove={tilt}
        onPointerLeave={() => {
          x.set(0);
          y.set(0);
        }}
      >
        <div className="scene-grid" aria-hidden="true" />
        <Particles paused={paused} />
        <div className="scene-heading">
          <span>
            <span className="status-dot" /> DEL MATERIAL A LA DECISIÓN
          </span>
          <ScanLine size={18} />
        </div>
        <div className="orbit orbit-one" aria-hidden="true" />
        <div className="orbit orbit-two" aria-hidden="true" />
        <motion.div
          className="slab-stage"
          style={{
            rotateX: paused ? 0 : rotateX,
            rotateY: paused ? 0 : rotateY,
          }}
        >
          <div className="slab-float">
            <div
              className={`stone-slab stone-${selected}`}
              style={{ backgroundImage: `url('${material.image}')` }}
            >
              <div className="stone-grid" />
              <span className="cut-line cut-line-one" />
              <span className="cut-line cut-line-two" />
              <span className="cut-line cut-line-three" />
              <div className="slab-stamp">
                <Layers3 size={19} />
                <span>
                  C360
                  <br />
                  MATERIAL STUDIO
                </span>
              </div>
            </div>
            <div className="slab-shadow" />
          </div>
        </motion.div>
        <div className="scene-tag tag-top">
          <span className="tag-icon">
            <ScanLine size={18} />
          </span>
          <div>
            <span className="micro-label">CADA PIEZA CUENTA</span>
            <strong>Visualiza tu despiece</strong>
          </div>
          <MoveUpRight size={16} />
        </div>
        <div className="scene-tag tag-bottom">
          <span className="tag-icon">
            <Check size={18} />
          </span>
          <div>
            <span className="micro-label">COSTOS A TU MEDIDA</span>
            <strong>Tu material. Tus tarifas.</strong>
          </div>
        </div>
        <div className="material-picker">
          <div className="material-info" aria-live="polite">
            <span className="micro-label">EXPLORA EL MATERIAL</span>
            <strong>
              {material.name} <span>/ {material.reference}</span>
            </strong>
          </div>
          <div
            className="material-swatches"
            role="group"
            aria-label="Material de la visualización"
          >
            {materials.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={`swatch ${selected === index ? "selected" : ""}`}
                style={{ backgroundImage: `url('${item.image}')` }}
                aria-label={`Ver ${item.name}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              />
            ))}
          </div>
        </div>
        <span className="scene-caption">
          Visualización conceptual · No es una captura del producto
        </span>
      </div>
      <a className="hero-scroll" href="#solucion">
        <ArrowDown size={15} /> DEL OFICIO A LOS DATOS{" "}
        <span className="scroll-line" />
      </a>
    </section>
  );
}
