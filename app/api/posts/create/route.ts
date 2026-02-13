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
    console.log('=== AUTH DEBUG START ===')

    // Log all headers
    console.log('All headers:', Object.fromEntries(request.headers.entries()))

    // Log all cookies
    const allCookies = request.cookies.getAll()
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))

    // Try multiple ways to get the session
    const authHeader = request.headers.get('authorization')
    const sessionToken = authHeader?.replace('Bearer ', '')

    console.log('Auth header:', authHeader ? 'present' : 'missing')
    console.log('Session token from header:', sessionToken ? 'present' : 'missing')

    // Try different cookie names
    const cookieNames = [
      'a_session_690641ad0029b51eefe0',
      'a_session_690641ad0029b51eefe0_legacy',
      'session'
    ]

    let cookieValue = null
    let foundCookieName = null
    for (const cookieName of cookieNames) {
      const cookie = request.cookies.get(cookieName)
      if (cookie?.value) {
        cookieValue = cookie.value
        foundCookieName = cookieName
        console.log(`Found cookie: ${cookieName}`)
        break
      }
    }

    const finalToken = sessionToken || cookieValue

    if (!finalToken) {
      console.log('❌ No session token found in headers or cookies')
      console.log('=== AUTH DEBUG END ===')
      return null
    }

    console.log(`✅ Using session token from ${sessionToken ? 'header' : `cookie ${foundCookieName}`}:`, finalToken.substring(0, 20) + '...')

    // Create client with JWT (session token is actually a JWT)
    const sessionClient = new Client()
      .setEndpoint('https://nyc.cloud.appwrite.io/v1')
      .setProject('690641ad0029b51eefe0')
      .setJWT(finalToken)

    const sessionAccount = new Account(sessionClient)
    const user = await sessionAccount.get()
    console.log('✅ Authenticated user:', user.$id)
    console.log('=== AUTH DEBUG END ===')
    return user
  } catch (error) {
    console.error('❌ Auth error:', error)
    console.log('=== AUTH DEBUG END ===')
    return null
  }
}

// Helper function to get authenticated services
async function getAuthenticatedServices(request: NextRequest) {
  // Get session token
  const authHeader = request.headers.get('authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  if (!sessionToken) {
    return null
  }

  // Create authenticated client
  const authClient = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('690641ad0029b51eefe0')
    .setJWT(sessionToken)

  const authAccount = new Account(authClient)
  const authDatabases = new Databases(authClient)
  const authStorage = new Storage(authClient)

  // Verify user
  const user = await authAccount.get()

  return {
    user,
    databases: authDatabases,
    storage: authStorage
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

    const { user, databases, storage } = auth

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

    // Create the post using authenticated database client
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
