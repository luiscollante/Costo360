import { Capacitor } from '@capacitor/core'
import { DownloadsSaver } from '@/lib/downloadsSaver'
import { showToast } from '@/lib/toast'

export async function downloadFile(blob: Blob, filename: string, mimeType: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await blobToBase64(blob)
      await DownloadsSaver.saveFile({ data: base64Data, filename, mimeType })
      showToast('success', `${filename} guardado en Descargas`)
      return
    }

    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', `${filename} descargado`)
  } catch (err) {
    showToast('error', `No se pudo descargar ${filename}. Intenta de nuevo.`)
    throw err
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.substring(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}
