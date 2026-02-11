import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, Storage, ID } from 'appwrite'

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('690641ad0029b51eefe0')

const account = new Account(client)
const databases = new Databases(client)
const storage = new Storage(client)

const databaseId = 'xapzap_db'
const collections = {
  posts: 'posts'
}
const mediaBucketId = '6915baaa00381391d7b2'

// Helper function to get current user from session
async function getCurrentUser(request: NextRequest) {
  try {
    // Get session token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') ||
                        request.cookies.get('a_session_690641ad0029b51eefe0')?.value

    if (!sessionToken) {
      return null
    }

    // Create account instance with session
    const account = new Account(client)
    // Set the session token
    client.setJWT(sessionToken)
    return await account.get()
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const postData: any = {}

    // Extract basic post data
    postData.userId = user.$id
    postData.username = user.name || 'User'
    postData.kind = formData.get('kind') || 'image'
    postData.content = formData.get('content') || ''
    postData.title = formData.get('title') || ''
    postData.description = formData.get('description') || ''
    postData.textBgColor = formData.get('textBgColor') || ''

    // Handle file uploads
    const file = formData.get('file') as File
    const thumbnail = formData.get('thumbnail') as File

    if (file) {
      // Upload main file
      const fileId = ID.unique()
      const uploadedFile = await storage.createFile(
        mediaBucketId,
        fileId,
        file
      )

      const fileUrl = storage.getFileView(mediaBucketId, uploadedFile.$id)

      // Set appropriate URL based on post type
      if (postData.kind === 'video' || postData.kind === 'reel') {
        postData.videoUrl = fileUrl
      } else if (postData.kind === 'image') {
        postData.imageUrl = fileUrl
      }
    }

    // Handle thumbnail upload
    if (thumbnail && (postData.kind === 'video' || postData.kind === 'reel')) {
      const thumbnailId = ID.unique()
      const uploadedThumbnail = await storage.createFile(
        mediaBucketId,
        thumbnailId,
        thumbnail
      )

      const thumbnailUrl = storage.getFileView(mediaBucketId, uploadedThumbnail.$id)
      postData.thumbnailUrl = thumbnailUrl
    }

    // Set default values
    postData.createdAt = new Date().toISOString()
    postData.likes = 0
    postData.comments = 0
    postData.reposts = 0
    postData.impressions = 0
    postData.views = 0

    // Create the post
    const postId = ID.unique()
    const post = await databases.createDocument(
      databaseId,
      collections.posts,
      postId,
      postData
    )

    return NextResponse.json({
      success: true,
      post
    })

  } catch (error: any) {
    console.error('Create post error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    )
  }
}