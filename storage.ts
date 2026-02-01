import { ID } from 'appwrite'
import appwriteService from './appwrite'

class StorageService {
  private static instance: StorageService

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async uploadFile(file: File, path?: string): Promise<string> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file)
      const fileName = path || `${Date.now()}_${file.name}`
      
      // Call Appwrite function that handles Bunny CDN upload
      const response = await fetch('/v1/functions/bunny-upload/executions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': '690641ad0029b51eefe0'
        },
        body: JSON.stringify({
          path: fileName,
          fileBase64: base64
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      return result.url
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  async deleteFile(fileName: string): Promise<void> {
    // Implement delete via Appwrite function if needed
    console.log('Delete not implemented yet:', fileName)
  }

  getFileUrl(fileName: string): string {
    return `https://xapzapolami.b-cdn.net/${fileName}`
  }
}

export const storageService = StorageService.getInstance()
export default storageService