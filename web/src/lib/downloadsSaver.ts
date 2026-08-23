import { registerPlugin } from '@capacitor/core'

export interface DownloadsSaverPlugin {
  saveFile(options: { data: string; filename: string; mimeType: string }): Promise<{ saved: boolean }>
}

export const DownloadsSaver = registerPlugin<DownloadsSaverPlugin>('DownloadsSaver')
