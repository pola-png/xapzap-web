import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// Wasabi configuration
const wasabiConfig = {
  region: process.env.WASABI_REGION || 'us-east-1',
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY || '',
    secretAccessKey: process.env.WASABI_SECRET_KEY || ''
  }
}

const bucketName = process.env.WASABI_BUCKET || 'xapzap-media'
const s3Client = new S3Client(wasabiConfig)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    console.log('Proxy request - path:', path)

    if (!path) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
    }

    // Construct the S3 key - use path directly (private files)
    const key = path.startsWith('/') ? path.substring(1) : path
    console.log('Proxy request - key:', key)

    // Fetch image from Wasabi
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Get content type from metadata or default to jpeg
    const contentType = response.ContentType || 'image/jpeg'

    // Return image with caching headers - pass the stream directly
    return new NextResponse(response.Body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'CDN-Cache-Control': 'max-age=31536000',
        'Vercel-CDN-Cache-Control': 'max-age=31536000'
      }
    })

  } catch (error) {
    console.error('Image proxy error:', error)

    // Return a fallback image or error response
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}