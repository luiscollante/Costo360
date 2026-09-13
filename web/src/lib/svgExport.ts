// Convierte el SVG del plano de Nesting (generado en el backend, ver
// `_generar_svg_nesting` en motor_planos.py) a PNG/PDF del lado del cliente.
// El SVG es autocontenido (defs/patrones propios, sin recursos externos), así
// que el navegador puede rasterizarlo directo con un <img>, sin librerías.
import jsPDF from 'jspdf'

function extraerDimensiones(svg: string): { width: number; height: number } {
  const anchoMatch = svg.match(/<svg[^>]*\swidth="([\d.]+)"/)
  const altoMatch = svg.match(/<svg[^>]*\sheight="([\d.]+)"/)
  return {
    width: anchoMatch ? parseFloat(anchoMatch[1]) : 1000,
    height: altoMatch ? parseFloat(altoMatch[1]) : 700,
  }
}

async function svgToCanvas(svg: string, escala = 2): Promise<HTMLCanvasElement> {
  const { width, height } = extraerDimensiones(svg)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('No se pudo rasterizar el SVG del plano'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width * escala
    canvas.height = height * escala
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function svgToPngBlob(svg: string, escala = 2): Promise<Blob> {
  const canvas = await svgToCanvas(svg, escala)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar el PNG del plano')
  return blob
}

export async function svgToPdfBlob(svg: string, escala = 2): Promise<Blob> {
  const canvas = await svgToCanvas(svg, escala)
  // JPEG en vez de PNG: el plano tiene un patrón de rayado (hatch) que
  // comprime muy mal como PNG (8+ MB) y bien como JPEG (~cientos de KB),
  // sin pérdida perceptible de legibilidad en los textos/cotas.
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  // mm a 96 DPI (estándar CSS/SVG), para que el PDF respete el tamaño real del plano.
  const anchoMm = (canvas.width / escala / 96) * 25.4
  const altoMm = (canvas.height / escala / 96) * 25.4
  const doc = new jsPDF({
    orientation: anchoMm >= altoMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [anchoMm, altoMm],
  })
  doc.addImage(dataUrl, 'JPEG', 0, 0, anchoMm, altoMm)
  return doc.output('blob')
}
