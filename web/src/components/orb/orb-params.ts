// Parámetros de la esfera líquida de Cost — estilo "siri" del editor real
// (github.com/LerSent001/orb, MIT), con los colores de marca de Costo360 en
// vez de la paleta de ejemplo del editor (dorado #FFD86B / cian / rosa /
// morado). El resto de los valores (forma, movimiento, vidrio) son los
// exactos del preset "siri" que el fundador compartió por URL — sin tocar,
// es una decisión de forma ya validada, solo se reemplaza la paleta.
//
// Solo existen 2 estados en este efecto (ver `orbStateNames` del editor
// original): "idle" (en reposo) y "thinking" (activo) — cubre tanto
// "pensando" como "actuando/trabajando" de Cost, ya que la actividad fina
// (qué paso está corriendo) ya la comunica el texto de `FilaPaso` en
// `CostChat.tsx`; la esfera es solo la señal ambiental de "ocupado o no".

export interface OrbUniformParams {
  glassEnabled: boolean
  radius: number
  metalScale: number
  metalAngle: number
  metalOffset: number
  metalPhase: number
  particleDensity: number
  ribbonCount: number
  particleSize: number
  particleBloom: number
  sheen: number
  gloss: number
  glassOpacity: number
  shellMidAlpha: number
  shellEdgeAlpha: number
  edgeSoftness: number
  shellInner: string
  shellMid: string
  shellEdge: string
  sheenColor: string
  specColor: string
  canvasColor: string
  speed: number
  contourDeform: number
  bandDensity: number
  chromaticShift: number
  metalStretch: number
  metalEvolution: number
  metalRoughness: number
  metalDepth: number
  ribbonWidth: number
  ribbonTwist: number
  ribbonFold: number
  ribbonBreath: number
  zoom: number
  warp: number
  ridgeAmt: number
  sharp: number
  shade: number
  exposure: number
  edgeGlow: number
  colorA: string
  colorB: string
  colorC: string
  colorD: string
  highlightColor: string
  glowColor: string
}

// Layout exacto del buffer de uniforms del shader original — ver
// `orb-uniforms.ts` del editor. No cambiar sin revisar `effect.wgsl`.
export const ORB_UNIFORM_FLOAT_COUNT = 136
const COLOR_OFFSET = 40
const STYLE_FLOW_INDEX_SIRI = 9 // Cost usa siempre el estilo "siri" — nunca los otros 12 del editor

const PALETTE_STOPS = [
  '#F7FBFF', '#EFF6FD', '#E0EEF9', '#D4E6F7', '#BBD5F3', '#A6C7F0',
  '#87B0EB', '#6F9EE8', '#6F9EE8', '#6F9EE8', '#6F9EE8', '#6F9EE8',
] as const

function rgb(hex: string): [number, number, number, number] {
  const v = hex.slice(1)
  return [
    Number.parseInt(v.slice(0, 2), 16) / 255,
    Number.parseInt(v.slice(2, 4), 16) / 255,
    Number.parseInt(v.slice(4, 6), 16) / 255,
    1,
  ]
}

export function writeOrbUniforms(
  target: Float32Array,
  width: number,
  height: number,
  time: number,
  p: OrbUniformParams,
): void {
  target.fill(0)
  target[0] = width
  target[1] = height
  target[2] = time
  target.set(
    [
      p.speed, p.radius, p.zoom, p.warp, p.ridgeAmt, p.sharp, p.shade, p.sheen, p.gloss,
      p.shellMidAlpha, p.shellEdgeAlpha, p.exposure, STYLE_FLOW_INDEX_SIRI, p.edgeSoftness, p.edgeGlow, 0,
      p.glassEnabled ? 1 : 0, p.glassOpacity, p.contourDeform, p.bandDensity, p.chromaticShift,
      p.metalScale, p.metalStretch, p.metalAngle, p.metalOffset, p.metalPhase, p.metalEvolution,
      p.metalRoughness, p.metalDepth, p.particleDensity, p.ribbonCount, p.ribbonWidth, p.ribbonTwist,
      p.ribbonFold, p.ribbonBreath, p.particleSize, p.particleBloom,
    ],
    3,
  )
  const colors = [
    p.colorA, p.colorB, p.colorC, p.colorD, p.highlightColor,
    p.shellInner, p.shellMid, p.shellEdge, p.sheenColor, p.specColor, p.canvasColor, p.glowColor,
    ...PALETTE_STOPS,
  ]
  colors.forEach((hex, i) => target.set(rgb(hex), COLOR_OFFSET + i * 4))
}

export function createOrbUniformSnapshot(p: OrbUniformParams): number[] {
  const values = new Float32Array(ORB_UNIFORM_FLOAT_COUNT)
  writeOrbUniforms(values, 1, 1, 0, p)
  return Array.from(values)
}

// Parámetros de forma/vidrio compartidos entre "idle" y "thinking" — el
// editor original solo hace variar color+movimiento entre estados, nunca
// estos (ver `orbStateColorKeys`/`orbStateNumericKeys` del editor).
const COMPARTIDO = {
  glassEnabled: true,
  radius: 0.72,
  metalScale: 0.77,
  metalAngle: 65,
  metalOffset: 0,
  metalPhase: 0,
  particleDensity: 0.72,
  ribbonCount: 5,
  particleSize: 1.2,
  particleBloom: 0.7,
  sheen: 0.28,
  gloss: 0.24,
  glassOpacity: 0.44,
  shellMidAlpha: 0.18,
  shellEdgeAlpha: 0.18,
  edgeSoftness: 0.005,
  // Vidrio en tonos cálidos/marca en vez del celeste de ejemplo del editor.
  shellInner: '#FFFBF0',
  shellMid: '#F7DFA0',
  shellEdge: '#8FBFA0',
  sheenColor: '#FFF8E7',
  specColor: '#FFEFC2',
  canvasColor: '#04140B',
}

/** Activo — "Cost está pensando/actuando/trabajando". Forma y movimiento
 * son los del preset "siri" tal cual el fundador lo compartió; solo la
 * paleta cambió a los colores de marca (dorado + esmeralda). */
export const ORB_THINKING: OrbUniformParams = {
  ...COMPARTIDO,
  speed: 0.82,
  contourDeform: 0,
  bandDensity: 2,
  chromaticShift: 0.42,
  metalStretch: 0.23,
  metalEvolution: 1,
  metalRoughness: 0.22,
  metalDepth: 0.25,
  ribbonWidth: 0.42,
  ribbonTwist: 1.25,
  ribbonFold: 0.55,
  ribbonBreath: 0.3,
  zoom: 0.36,
  warp: 3.2,
  ridgeAmt: 0.5,
  sharp: 2.2,
  shade: 0.12,
  exposure: 2.3,
  edgeGlow: 0.12,
  colorA: '#FFE9A8', // dorado casi blanco — el brillo más alto de la mezcla
  colorB: '#1FA750', // esmeralda más vivo que el de marca, para contraste real
  colorC: '#D4AF37', // brand-gold
  colorD: '#0B3D1C', // esmeralda muy oscuro — da el rango de contraste
  highlightColor: '#FFF6E0', // crema casi blanco de marca
  glowColor: '#D4AF37',
}

/** En reposo — mismos multiplicadores de forma que usa el estilo "siri" del
 * editor original para su idle (ver `idleProfilesByStyle.siri.numeric`), con
 * una versión apagada/desaturada de la paleta de marca en vez de los tonos
 * genéricos de ejemplo. */
export const ORB_IDLE: OrbUniformParams = {
  ...COMPARTIDO,
  speed: ORB_THINKING.speed * 0.3,
  contourDeform: ORB_THINKING.contourDeform * 0.3,
  bandDensity: ORB_THINKING.bandDensity,
  chromaticShift: ORB_THINKING.chromaticShift,
  metalStretch: ORB_THINKING.metalStretch,
  metalEvolution: ORB_THINKING.metalEvolution,
  metalRoughness: ORB_THINKING.metalRoughness,
  metalDepth: ORB_THINKING.metalDepth,
  ribbonWidth: ORB_THINKING.ribbonWidth,
  ribbonTwist: ORB_THINKING.ribbonTwist,
  ribbonFold: ORB_THINKING.ribbonFold,
  ribbonBreath: ORB_THINKING.ribbonBreath,
  zoom: ORB_THINKING.zoom * 0.94,
  warp: ORB_THINKING.warp * 0.52,
  ridgeAmt: ORB_THINKING.ridgeAmt * 0.48,
  sharp: ORB_THINKING.sharp * 0.9,
  shade: ORB_THINKING.shade,
  exposure: ORB_THINKING.exposure * 0.68,
  edgeGlow: ORB_THINKING.edgeGlow,
  colorA: '#B8A15E',
  colorB: '#4A7A5A',
  colorC: '#8A7440',
  colorD: '#2E4A3A',
  highlightColor: '#C9BFA0',
  glowColor: '#8A7440',
}
