/**
 * Motor de nesting 2D de Costo360, traducido 1:1 desde
 * `backend/motor/motor_planos.py` (`_maxrects_pack` + `_buscar_mejor_empaque`
 * + `optimizar_corte_2d`) para que el simulador de la landing haga EXACTAMENTE
 * lo mismo que la plataforma (pedido del fundador 2026-09-25: no vender algo
 * que Costo360 no hace). Si cambia el motor del backend, actualizar aquí.
 *
 * - Maximal Rectangles con 4 órdenes de piezas × 4 heurísticas (16
 *   combinaciones); gana la que coloca más piezas, luego la de mayor área
 *   usada, luego la de menos piezas rotadas.
 * - Una pieza se rota 90° SOLO si es la única forma de que quepa (la veta
 *   de la piedra importa).
 * - Convención de ejes: el LARGO va en el eje Y (vertical) y el ANCHO en el
 *   eje X (horizontal), para la lámina y para cada pieza. Medidas en metros.
 */
export type PiezaEntrada = { nombre: string; largo: number; ancho: number; cantidad: number };
export type PiezaColocada = {
  nombre: string; x: number; y: number; w: number; h: number;
  rotada: boolean; largoOriginal: number; anchoOriginal: number; indice: number;
};
export type ResultadoNesting = {
  colocadas: PiezaColocada[];
  noCaben: string[];
  areaLamina: number;
  areaUsada: number;
  aprovechamiento: number; // %
  retal: number; // %
};

type Rect = [number, number, number, number]; // x, y, w, h
type Item = { nombre: string; largo: number; ancho: number; indice: number };

const EPS = 1e-9;
const cabe = (w: number, h: number, fr: Rect) => w <= fr[2] + EPS && h <= fr[3] + EPS;
const contenido = (a: Rect, b: Rect) =>
  a[0] >= b[0] - EPS && a[1] >= b[1] - EPS && a[0] + a[2] <= b[0] + b[2] + EPS && a[1] + a[3] <= b[1] + b[3] + EPS;

const ORDENES: Record<string, (it: Item) => number> = {
  area: (it) => it.largo * it.ancho,
  lado_mayor: (it) => Math.max(it.largo, it.ancho),
  lado_menor: (it) => Math.min(it.largo, it.ancho),
  perimetro: (it) => it.largo + it.ancho,
};
const HEURISTICAS = ["bssf", "blsf", "baf", "bl"] as const;

function maxrectsPack(binW: number, binH: number, items: Item[], orden: string, heuristica: string) {
  let libres: Rect[] = [[0, 0, binW, binH]];
  const colocadas: PiezaColocada[] = [];
  const noCaben: string[] = [];
  // sort estable, descendente (igual que sorted(..., reverse=True) de Python)
  const ordenados = items.map((it, i) => ({ it, i }))
    .sort((a, b) => ORDENES[orden](b.it) - ORDENES[orden](a.it) || a.i - b.i)
    .map((x) => x.it);

  for (const item of ordenados) {
    const iw = item.ancho; // eje X
    const ih = item.largo; // eje Y
    if (iw <= 0 || ih <= 0) { noCaben.push(item.nombre); continue; }
    const cabeSinRotar = libres.some((fr) => cabe(iw, ih, fr));
    const candidatos: [boolean, number, number][] = cabeSinRotar ? [[false, iw, ih]] : [[false, iw, ih], [true, ih, iw]];

    let best: [number, number, number, boolean, number, number] | null = null;
    for (const [fx, fy, fw, fh] of libres) {
      for (const [rotada, pw, ph] of candidatos) {
        if (pw > fw + EPS || ph > fh + EPS) continue;
        let score: number;
        if (heuristica === "bssf") score = Math.min(fw - pw, fh - ph);
        else if (heuristica === "blsf") score = Math.max(fw - pw, fh - ph);
        else if (heuristica === "baf") score = fw * fh - pw * ph;
        else score = fy * 1_000_000 + fx;
        if (best === null || score < best[0]) best = [score, fx, fy, rotada, pw, ph];
      }
    }
    if (best === null) { noCaben.push(item.nombre); continue; }

    const [, px, py, rotada, pw, ph] = best;
    colocadas.push({ nombre: item.nombre, x: px, y: py, w: pw, h: ph, rotada,
      anchoOriginal: iw, largoOriginal: ih, indice: item.indice });

    const [rx0, ry0, rx1, ry1] = [px, py, px + pw, py + ph];
    const sobrevivientes: Rect[] = [];
    let nuevos: Rect[] = [];
    for (const fr of libres) {
      const [fx, fy, fw, fh] = fr;
      const [fx1, fy1] = [fx + fw, fy + fh];
      const [ix0, iy0, ix1, iy1] = [Math.max(fx, rx0), Math.max(fy, ry0), Math.min(fx1, rx1), Math.min(fy1, ry1)];
      if (ix0 >= ix1 - EPS || iy0 >= iy1 - EPS) { sobrevivientes.push(fr); continue; }
      if (rx0 > fx + EPS) nuevos.push([fx, fy, rx0 - fx, fh]);
      if (rx1 < fx1 - EPS) nuevos.push([rx1, fy, fx1 - rx1, fh]);
      if (ry0 > fy + EPS) nuevos.push([fx, fy, fw, ry0 - fy]);
      if (ry1 < fy1 - EPS) nuevos.push([fx, ry1, fw, fy1 - ry1]);
    }
    nuevos = nuevos.filter((r) => r[2] > 1e-6 && r[3] > 1e-6);
    const sobrevivientesFinal = sobrevivientes.filter((s) => !nuevos.some((n) => contenido(s, n)));
    const nuevosFinales = nuevos.filter((n, i) =>
      !sobrevivientesFinal.some((s) => contenido(n, s)) && !nuevos.some((n2, j) => j !== i && contenido(n, n2)));
    libres = [...sobrevivientesFinal, ...nuevosFinales];
  }
  return { colocadas, noCaben };
}

export function optimizarCorte(laminaLargo: number, laminaAncho: number, piezas: PiezaEntrada[]): ResultadoNesting {
  const items: Item[] = [];
  piezas.forEach((p, indice) => {
    const cant = Math.max(1, Math.floor(p.cantidad) || 1);
    for (let i = 0; i < cant; i++) {
      items.push({ nombre: p.nombre + (cant > 1 ? ` (${i + 1})` : ""), largo: p.largo, ancho: p.ancho, indice });
    }
  });
  // bin_w (eje X) = ancho real; bin_h (eje Y) = largo real.
  let mejor: { score: [number, number, number]; colocadas: PiezaColocada[]; noCaben: string[] } | null = null;
  if (items.length) {
    for (const orden of Object.keys(ORDENES)) {
      for (const h of HEURISTICAS) {
        const { colocadas, noCaben } = maxrectsPack(laminaAncho, laminaLargo, items, orden, h);
        const area = colocadas.reduce((s, p) => s + p.w * p.h, 0);
        const score: [number, number, number] = [-colocadas.length, -area, colocadas.filter((p) => p.rotada).length];
        const menor = !mejor || score[0] < mejor.score[0] || (score[0] === mejor.score[0] &&
          (score[1] < mejor.score[1] || (score[1] === mejor.score[1] && score[2] < mejor.score[2])));
        if (menor) mejor = { score, colocadas, noCaben };
      }
    }
  }
  const colocadas = mejor?.colocadas ?? [];
  const areaLamina = laminaAncho * laminaLargo;
  const areaUsada = colocadas.reduce((s, p) => s + p.w * p.h, 0);
  const aprovechamiento = areaLamina > 0 ? (areaUsada / areaLamina) * 100 : 0;
  return { colocadas, noCaben: mejor?.noCaben ?? [], areaLamina, areaUsada, aprovechamiento,
    retal: Math.max(0, 100 - aprovechamiento) };
}
