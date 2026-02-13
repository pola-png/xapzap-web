import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Databases, ID } from 'appwrite'
import storageService from '../../../../storage'

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('690641ad0029b51eefe0')

const account = new Account(client)
const databases = new Databases(client)

const databaseId = 'xapzap_db'
const collections = {
  posts: 'posts'
}



// Helper function to get authenticated services
async function getAuthenticatedServices(request: NextRequest) {
  // Get session token
  const authHeader = request.headers.get('authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  if (!sessionToken) {
    return null
  }

  // Create authenticated client for database operations
  const authClient = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('690641ad0029b51eefe0')
    .setJWT(sessionToken)

  const authAccount = new Account(authClient)
  const authDatabases = new Databases(authClient)

  // Verify user
  const user = await authAccount.get()

  return {
    user,
    databases: authDatabases
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated services
    const auth = await getAuthenticatedServices(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { user, databases } = auth

    const formData = await request.formData()
    const postData: any = {}

    // Extract basic post data
    postData.userId = user.$id
    postData.username = user.name || 'User'
    postData.postType = formData.get('kind') as string || 'image' // Use postType instead of kind
    postData.content = formData.get('content') as string || ''
    postData.title = formData.get('title') as string || ''

    // Handle file uploads to Wasabi
    const file = formData.get('file') as File
    const thumbnail = formData.get('thumbnail') as File

    if (file) {
      // Upload main file to Wasabi - returns CDN URL directly
      const fileUrl = await storageService.uploadFile(file)

      // Set appropriate URL based on post type
      if (postData.postType === 'video' || postData.postType === 'reel') {
        postData.videoUrl = fileUrl
      } else if (postData.postType === 'image') {
        postData.imageUrl = fileUrl
      }
    } else {
      // Text-only post - set background color if provided
      const textBgColorHex = formData.get('textBgColor') as string
      if (textBgColorHex) {
        // Convert hex to integer (remove # and parse as hex)
        postData.textBgColor = parseInt(textBgColorHex.replace('#', ''), 16)
      }
    }

    // Handle thumbnail upload to Wasabi
    if (thumbnail && (postData.postType === 'video' || postData.postType === 'reel')) {
      // Upload thumbnail to Wasabi - returns CDN URL directly
      const thumbnailUrl = await storageService.uploadFile(thumbnail)
      postData.thumbnailUrl = thumbnailUrl
    }

    // Set default values matching database schema
    postData.createdAt = new Date().toISOString()
    postData.likes = 0
    postData.comments = 0
    postData.reposts = 0
    postData.shares = 0 // Required field
    postData.impressions = 0
    postData.views = 0
    postData.isBoosted = false // Required field

    // Create the post using authenticated database client
    const postId = ID.unique()
    postData.postId = postId // Required field for document structure
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
