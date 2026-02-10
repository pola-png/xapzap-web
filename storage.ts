import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

class StorageService {
  private static instance: StorageService
  private s3Client: S3Client

  // Wasabi configuration
  private readonly wasabiConfig = {
    region: process.env.WASABI_REGION || 'us-east-1',
    endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY || '',
      secretAccessKey: process.env.WASABI_SECRET_KEY || ''
    }
  }

  private readonly bucketName = process.env.WASABI_BUCKET || 'xapzap-media'
  private readonly cdnBaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.xapzap.com'

  private constructor() {
    this.s3Client = new S3Client(this.wasabiConfig)
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async uploadFile(file: File, path?: string): Promise<string> {
    try {
      const fileName = path || `${Date.now()}_${file.name}`

      // Convert file to buffer
      const buffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)

      const uploadParams = {
        Bucket: this.bucketName,
        Key: `public/${fileName}`, // Store in public folder
        Body: uint8Array,
        ContentType: file.type
        // ACL removed - using bucket policy for public access
      }

      const command = new PutObjectCommand(uploadParams)
      await this.s3Client.send(command)

      // Return CDN URL with /media/ prefix for routing
      return `${this.cdnBaseUrl}/media/${fileName}`
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    // Implement delete if needed
    console.log('Delete not implemented yet:', fileName)
  }

  getFileUrl(fileName: string): string {
    // Return permanent CDN URL with /media/ prefix
    return `${this.cdnBaseUrl}/media/${fileName}`
  }



  // Utility method to extract filename from CDN URL
  extractFileName(cdnUrl: string): string {
    return cdnUrl.replace(`${this.cdnBaseUrl}/media/`, '')
  }
}

export const storageService = StorageService.getInstance()
export default storageService