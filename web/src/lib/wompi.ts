/**
 * Llamadas directas al API de Wompi desde el navegador (nunca pasan por
 * nuestro backend): tokenizar la tarjeta y obtener los 2 tokens de
 * aceptación (términos + datos personales) que exige Wompi antes de crear un
 * payment_source. La tarjeta viaja directo al navegador del cliente hacia
 * Wompi -- nuestro backend nunca la ve.
 */

const BASE_SANDBOX = 'https://sandbox.wompi.co/v1'
const BASE_PROD = 'https://production.wompi.co/v1'

function baseUrl(publicKey: string): string {
  return publicKey.startsWith('pub_test_') ? BASE_SANDBOX : BASE_PROD
}

export interface AceptacionWompi {
  acceptanceToken: string
  permalinkTerminos: string
  personalAuthToken: string
  permalinkDatosPersonales: string
}

export async function obtenerAceptacion(publicKey: string): Promise<AceptacionWompi> {
  const res = await fetch(`${baseUrl(publicKey)}/merchants/${publicKey}`)
  if (!res.ok) throw new Error('No se pudo conectar con Wompi')
  const { data } = await res.json()
  return {
    acceptanceToken: data.presigned_acceptance.acceptance_token,
    permalinkTerminos: data.presigned_acceptance.permalink,
    personalAuthToken: data.presigned_personal_data_auth.acceptance_token,
    permalinkDatosPersonales: data.presigned_personal_data_auth.permalink,
  }
}

export interface DatosTarjeta {
  numero: string
  cvc: string
  mes: string
  anio: string
  titular: string
}

/** Devuelve el `token` de Wompi (nunca la tarjeta en sí) para pasarle a nuestro backend. */
export async function tokenizarTarjeta(publicKey: string, tarjeta: DatosTarjeta): Promise<string> {
  const res = await fetch(`${baseUrl(publicKey)}/tokens/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: tarjeta.numero.replace(/\s+/g, ''),
      cvc: tarjeta.cvc,
      exp_month: tarjeta.mes,
      exp_year: tarjeta.anio,
      card_holder: tarjeta.titular,
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    const msg = body?.error?.messages ? Object.values(body.error.messages).flat().join(' ') : 'Tarjeta rechazada'
    throw new Error(String(msg))
  }
  return body.data.id as string
}

/** Marca de la tarjeta a partir del BIN, solo para mostrar el ícono correcto mientras se escribe. */
export function marcaTarjeta(numero: string): 'visa' | 'mastercard' | 'amex' | null {
  const n = numero.replace(/\s+/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  return null
}
