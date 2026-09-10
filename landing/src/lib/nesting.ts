/** Modelo didáctico local. No importa ni replica el motor de producción.
 * Guillotine sencillo, sin rotación, espesor de disco, vetas ni restricciones de taller.
 * Los porcentajes son exclusivamente el cociente de áreas de ESTA simulación.
 */
export type Piece = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Rectangle = Omit<Piece, "id">;
export function layoutPieces(
  slabWidth: number,
  slabHeight: number,
  pieceWidth: number,
  pieceHeight: number,
  count: number,
) {
  if (
    ![slabWidth, slabHeight, pieceWidth, pieceHeight, count].every(
      Number.isFinite,
    ) ||
    Math.min(slabWidth, slabHeight, pieceWidth, pieceHeight) <= 0 ||
    count < 0 ||
    count > 100
  )
    throw new Error("Dimensiones o cantidad inválidas");
  const free: Rectangle[] = [
    { x: 0, y: 0, width: slabWidth, height: slabHeight },
  ];
  const pieces: Piece[] = [];
  for (let i = 0; i < Math.floor(count); i++) {
    const index = free.findIndex(
      (rect) => rect.width >= pieceWidth && rect.height >= pieceHeight,
    );
    if (index < 0) break;
    const rect = free.splice(index, 1)[0];
    pieces.push({
      id: i + 1,
      x: rect.x,
      y: rect.y,
      width: pieceWidth,
      height: pieceHeight,
    });
    if (rect.width > pieceWidth)
      free.push({
        x: rect.x + pieceWidth,
        y: rect.y,
        width: rect.width - pieceWidth,
        height: pieceHeight,
      });
    if (rect.height > pieceHeight)
      free.push({
        x: rect.x,
        y: rect.y + pieceHeight,
        width: rect.width,
        height: rect.height - pieceHeight,
      });
  }
  const usedArea = pieces.length * pieceWidth * pieceHeight;
  const totalArea = slabWidth * slabHeight;
  return {
    pieces,
    free,
    usedArea: usedArea / 10000,
    remainingArea: (totalArea - usedArea) / 10000,
    utilization: (usedArea / totalArea) * 100,
    unplaced: Math.floor(count) - pieces.length,
  };
}
