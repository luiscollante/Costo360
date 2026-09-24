import { api } from '@/api/client'

// Voz de Cost (ElevenLabs) — texto-a-voz y voz-a-texto. La clave real vive
// solo en el backend (`ELEVENLABS_API_KEY`); el navegador nunca la ve, solo
// llama a estos 2 endpoints propios. Timeout más largo que el default de
// `api` (10s) porque generar/transcribir audio real toma más que una
// consulta normal a la base de datos.
const _TIMEOUT_VOZ = 60_000 // respuestas largas de Cost se leen completas (nunca se cortan)

/** Convierte el texto de un mensaje de Cost a voz. Devuelve el audio (mp3) listo para reproducir. */
export async function hablar(texto: string): Promise<Blob> {
  const { data } = await api.post('/api/voz/hablar', { texto }, { responseType: 'blob', timeout: _TIMEOUT_VOZ })
  return data as Blob
}

/** Transcribe un audio grabado en el navegador (el micrófono) a texto. */
export async function escuchar(audio: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  const { data } = await api.postForm<{ texto: string }>('/api/voz/escuchar', form, { timeout: _TIMEOUT_VOZ })
  return data.texto
}
