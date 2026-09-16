import { useEffect, useRef } from 'react'
import { orbShaderSource } from './orb-shader-source'
import { createOrbUniformSnapshot, ORB_IDLE, ORB_THINKING } from './orb-params'

export type OrbEstado = 'idle' | 'thinking'

// Del preset "siri" que el fundador compartió: activation=0.22 (idle→thinking,
// rápido, "reaccionó") y transition=0.65 (thinking→idle, más suave, "se calma").
const _ACTIVATION_MS = 220
const _SETTLE_MS = 650
const _COLOR_OFFSET = 40 // debe calzar con orb-params.ts

// Constantes reales de la spec de WebGPU (GPUBufferUsageFlags), a mano —
// a propósito, en vez de usar el global `GPUBufferUsage`: el proyecto no
// declara los tipos de WebGPU (no hay `@webgpu/types` como dependencia), y
// el build real de Vercel (a diferencia del entorno local) no los resuelve
// como ambientales — usar el global rompía `npm run build` en producción.
const _GPU_BUFFER_USAGE_UNIFORM = 0x40
const _GPU_BUFFER_USAGE_COPY_DST = 0x8

const _SEEDS: Record<OrbEstado, Float32Array> = {
  idle: Float32Array.from(createOrbUniformSnapshot(ORB_IDLE)),
  thinking: Float32Array.from(createOrbUniformSnapshot(ORB_THINKING)),
}

function _srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
function _linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}
function _mixSrgb(from: number, to: number, t: number): number {
  return _linearToSrgb(_srgbToLinear(from) + (_srgbToLinear(to) - _srgbToLinear(from)) * t)
}

/** ¿Este navegador puede mostrar la esfera? WebGPU todavía no existe en
 * Safari ni en buena parte de navegadores móviles (decisión del fundador,
 * 2026-09-16: usar el shimmer dorado ya existente como respaldo ahí). Se
 * cachea en el módulo — el soporte de WebGPU de un navegador no cambia
 * mientras la pestaña está abierta. */
let _soportado: boolean | null = null
export function orbEsSoportado(): boolean {
  if (_soportado === null) _soportado = typeof navigator !== 'undefined' && 'gpu' in navigator
  return _soportado
}

/**
 * Esfera líquida de marca de Cost — shader WGSL real de
 * github.com/LerSent001/orb (MIT), estilo "siri", con la paleta de Costo360
 * en vez de la de ejemplo del editor (ver `orb-params.ts`). Reemplaza al
 * ícono `Sparkles` estático como señal ambiental de "ocupado o no" — el
 * texto de `FilaPaso`/`Pensando` en `CostChat.tsx` sigue siendo quien
 * comunica QUÉ está pasando, la esfera es solo el pulso visual.
 *
 * Quien la usa (`CostChat.tsx`) debe llamar a `orbEsSoportado()` ANTES de
 * montar este componente y mostrar el shimmer dorado en su lugar si no hay
 * WebGPU — este componente no intenta ese respaldo por su cuenta (no tiene
 * forma de "avisarle" al padre que falló sin quedar un hueco vacío en la fila).
 */
export function CostOrb({
  estado,
  size = 28,
  className,
}: {
  estado: OrbEstado
  size?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setEstadoRef = useRef<((e: OrbEstado) => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !orbEsSoportado()) return

    let detenido = false
    let destruido = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sin `@webgpu/types` como dependencia, ver nota arriba
    let device: any = null
    let frameId = 0
    let estadoActual: OrbEstado = estado
    let destinoTransicion: OrbEstado = estado
    let desdeU = Float32Array.from(_SEEDS[estado])
    let haciaU = Float32Array.from(_SEEDS[estado])
    const mostradoU = Float32Array.from(_SEEDS[estado])
    let transicionDesde = 0
    let duracionTransicion = 0
    let ultimoFrameEn: number | null = null
    let faseMovimiento = 0

    function progresoTransicion(ahora: number): number {
      if (duracionTransicion === 0) return 1
      const crudo = Math.min(1, Math.max(0, (ahora - transicionDesde) / duracionTransicion))
      return destinoTransicion === 'thinking' ? 1 - (1 - crudo) ** 3 : crudo * crudo * (3 - 2 * crudo)
    }

    function muestrearTransicion(ahora: number): Float32Array {
      const progreso = progresoTransicion(ahora)
      for (let i = 3; i < mostradoU.length; i++) {
        const esColor = i >= _COLOR_OFFSET && (i - _COLOR_OFFSET) % 4 < 3
        mostradoU[i] = esColor
          ? _mixSrgb(desdeU[i], haciaU[i], progreso)
          : desdeU[i] + (haciaU[i] - desdeU[i]) * progreso
      }
      return mostradoU
    }

    function cambiarEstado(siguiente: OrbEstado) {
      if (siguiente === estadoActual) return
      const ahora = performance.now()
      muestrearTransicion(ahora)
      desdeU = Float32Array.from(mostradoU)
      haciaU = Float32Array.from(_SEEDS[siguiente])
      destinoTransicion = siguiente
      transicionDesde = ahora
      duracionTransicion = siguiente === 'thinking' ? _ACTIVATION_MS : _SETTLE_MS
      estadoActual = siguiente
    }
    setEstadoRef.current = cambiarEstado

    async function iniciar() {
      const gpu = (navigator as unknown as { gpu: any }).gpu
      const adapter = await gpu.requestAdapter()
      if (!adapter) throw new Error('Sin adaptador WebGPU disponible')
      device = await adapter.requestDevice()
      if (destruido) { device.destroy(); return }
      const context = canvas!.getContext('webgpu') as any
      if (!context) throw new Error('No se pudo crear el contexto WebGPU')
      const format = gpu.getPreferredCanvasFormat()
      context.configure({ device, format, alphaMode: 'premultiplied' })

      const shader = device.createShaderModule({ code: orbShaderSource })
      // Un error de validación de WebGPU (shader inválido, layout mal armado)
      // normalmente NO lanza una excepción de JS — se reporta aparte, así que
      // sin esto el canvas se queda negro en silencio y nadie se entera nunca
      // por qué (hallazgo real del fundador, 2026-09-16: la esfera se veía
      // negra en producción sin ningún error visible).
      const compilacion = await shader.getCompilationInfo()
      const errores = compilacion.messages.filter((m: { type: string }) => m.type === 'error')
      if (errores.length) {
        throw new Error(`Shader WGSL inválido: ${errores.map((m: { message: string }) => m.message).join(' | ')}`)
      }
      device.addEventListener('uncapturederror', (event: { error: { message: string } }) => {
        // eslint-disable-next-line no-console -- única forma real de enterarse de un error de WebGPU (no lanza excepción)
        console.error('[CostOrb] Error de WebGPU:', event.error.message)
      })
      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs_main' },
        fragment: {
          module: shader,
          entryPoint: 'fs_main',
          targets: [{
            format,
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          }],
        },
        primitive: { topology: 'triangle-list' },
      })
      const valores = new Float32Array(mostradoU)
      const uniformBuffer = device.createBuffer({
        size: valores.byteLength,
        usage: _GPU_BUFFER_USAGE_UNIFORM | _GPU_BUFFER_USAGE_COPY_DST,
      })
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      })
      device.lost.then(() => { detenido = true })

      function cuadro(ahora: number) {
        if (detenido) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const ancho = Math.max(1, Math.floor(canvas!.clientWidth * dpr))
        const alto = Math.max(1, Math.floor(canvas!.clientHeight * dpr))
        if (canvas!.width !== ancho || canvas!.height !== alto) {
          canvas!.width = ancho
          canvas!.height = alto
        }
        valores.set(muestrearTransicion(ahora))
        const delta = ultimoFrameEn === null ? 0 : Math.min(0.1, Math.max(0, (ahora - ultimoFrameEn) / 1000))
        ultimoFrameEn = ahora
        faseMovimiento += delta * Math.max(valores[3], 0)
        valores[0] = ancho
        valores[1] = alto
        valores[2] = faseMovimiento / Math.max(valores[3], 0.001)
        device!.queue.writeBuffer(uniformBuffer, 0, valores)

        const encoder = device!.createCommandEncoder()
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        })
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(3)
        pass.end()
        device!.queue.submit([encoder.finish()])
        frameId = requestAnimationFrame(cuadro)
      }
      frameId = requestAnimationFrame(cuadro)
    }

    iniciar().catch((error: unknown) => {
      detenido = true
      // eslint-disable-next-line no-console -- sin esto, un fallo de WebGPU se veía como un círculo negro sin ninguna pista en consola
      console.error('[CostOrb] No se pudo iniciar la esfera:', error)
    })

    return () => {
      detenido = true
      destruido = true
      setEstadoRef.current = null
      cancelAnimationFrame(frameId)
      device?.destroy()
    }
    // Deliberado: solo se monta una vez — `estado` se aplica vía el efecto de
    // abajo (llamando a `cambiarEstado`), nunca reiniciando todo el pipeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setEstadoRef.current?.(estado)
  }, [estado])

  if (!orbEsSoportado()) return null

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
