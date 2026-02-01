import { ID } from 'appwrite'

class StorageService {
  private static instance: StorageService
  private readonly bunnyStorageZone = 'xapzap'
  private readonly bunnyStorageHost = 'storage.bunnycdn.com'
  private readonly bunnyStorageKey = process.env.NEXT_PUBLIC_BUNNY_STORAGE_KEY || ''
  private readonly bunnyCdnBaseUrl = 'https://xapzapolami.b-cdn.net'

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async uploadFile(file: File, path?: string): Promise<string> {
    const fileName = path || `${Date.now()}_${file.name}`
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`https://${this.bunnyStorageHost}/${this.bunnyStorageZone}/${fileName}`, {
        method: 'PUT',
        headers: {
          'AccessKey': this.bunnyStorageKey,
        },
        body: file
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      return `${this.bunnyCdnBaseUrl}/${fileName}`
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const response = await fetch(`https://${this.bunnyStorageHost}/${this.bunnyStorageZone}/${fileName}`, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.bunnyStorageKey,
        }
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      throw error
    }
  }

  getFileUrl(fileName: string): string {
    return `${this.bunnyCdnBaseUrl}/${fileName}`
  }
}

export const storageService = StorageService.getInstance()
export default storageService