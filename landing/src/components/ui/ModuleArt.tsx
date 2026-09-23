import {
  Check,
  FileText,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

// Decorative illustrations describe modules, never customer data or live results.
export function ModuleArt({ index }: { index: number }) {
  return (
    <div className={`module-art module-art-${index}`} aria-hidden="true">
      {index === 0 && (
        <div className="material-fan">
          <i />
          <i />
          <i />
          <span>
            <Layers3 size={17} /> Tu catálogo, a tu medida.
          </span>
        </div>
      )}
      {index === 1 && (
        <div className="document-stack">
          <div className="doc-back" />
          <div className="doc-front">
            <FileText size={22} />
            <span>COTIZACIÓN</span>
            <i />
            <i />
            <i />
            <b>
              <Check size={14} /> Tu marca. Tu propuesta.
            </b>
          </div>
          <span className="doc-format">
            PDF
            <ArrowShape />
          </span>
        </div>
      )}
      {index === 2 && (
        <div className="mini-kanban">
          {["Por hacer", "En proceso", "Completado"].map((label, i) => (
            <div key={label}>
              <span>{label}</span>
              <i />
              <i />
              {i === 2 && <Check className="kanban-check" size={22} />}
            </div>
          ))}
          <div className="kanban-task">
            <span className="task-dot" /> Corte de piezas
          </div>
        </div>
      )}
      {index === 3 && (
        <div className="role-orbits">
          <div className="role-center">
            <ShieldCheck size={38} />
          </div>
          <span className="role-pill role-admin">
            <LockKeyhole size={14} /> Admin
          </span>
          <span className="role-pill role-manager">
            <UserRound size={14} /> Gerencia
          </span>
          <span className="role-pill role-operator">
            <UserRound size={14} /> Operativo
          </span>
        </div>
      )}
    </div>
  );
}
function ArrowShape() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 11 11 3M3 3h8v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
