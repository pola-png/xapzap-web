import { Client, Account, Databases, Storage, ID, Query } from 'appwrite'
import { Chat, Message } from './types'

class AppwriteService {
  private static instance: AppwriteService
  private client: Client
  private account: Account
  private databases: Databases
  private storage: Storage

  // Configuration - matching Flutter app exactly
  private readonly endpoint = 'https://nyc.cloud.appwrite.io/v1'
  private readonly projectId = '690641ad0029b51eefe0'
  private readonly databaseId = 'xapzap_db'

  // Collections - exactly matching Flutter app
  private readonly collections = {
    users: 'users',
    posts: 'posts',
    comments: 'comments',
    profiles: 'profiles',
    follows: 'follows',
    likes: 'likes',
    commentLikes: 'comment_likes',
    reposts: 'reposts',
    reports: 'reports',
    saves: 'saves',
    chats: 'chats',
    messages: 'messages',
    statuses: 'statuses',
    notifications: 'notifications',
    postBoosts: 'post_boosts',
    news: 'news',
    adRevenue: 'ad_revenue_events'
  }

  private readonly mediaBucketId = '6915baaa00381391d7b2'

  private constructor() {
    this.client = new Client()
      .setEndpoint(this.endpoint)
      .setProject(this.projectId)

    this.account = new Account(this.client)
    this.databases = new Databases(this.client)
    this.storage = new Storage(this.client)
  }

  static getInstance(): AppwriteService {
    if (!AppwriteService.instance) {
      AppwriteService.instance = new AppwriteService()
    }
    return AppwriteService.instance
  }

  // Auth methods
  async getCurrentUser() {
    try {
      return await this.account.get()
    } catch {
      return null
    }
  }

  async signUp(email: string, password: string, username: string) {
    try {
      // Create account
      await this.account.create(
        ID.unique(),
        email,
        password,
        username
      )
      
      // Sign in immediately
      await this.signIn(email, password)
      
      // Get the created user
      const user = await this.getCurrentUser()
      if (!user) throw new Error('Failed to get user after signup')
      
      // Create user record in users collection
      await this.databases.createDocument(
        this.databaseId,
        this.collections.users,
        user.$id,
        {
          userId: user.$id,
          username,
          email
        }
      )
      
      // Create profile record
      await this.databases.createDocument(
        this.databaseId,
        this.collections.profiles,
        user.$id,
        {
          userId: user.$id,
          username,
          displayName: username,
          bio: '',
          avatarUrl: '',
          coverUrl: '',
          isAdmin: false,
          isBanned: false
        }
      )
      
      return user
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed')
    }
  }

  async signIn(email: string, password: string) {
    try {
      return await this.account.createEmailPasswordSession(email, password)
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed')
    }
  }

  async signOut() {
    try {
      await this.account.deleteSession('current')
    } catch (error: any) {
      throw new Error(error.message || 'Sign out failed')
    }
  }

  // Admin/Ban checking
  async isCurrentUserAdmin() {
    const user = await this.getCurrentUser()
    if (!user) return false
    
    try {
      const profile = await this.getProfileByUserId(user.$id)
      return profile?.isAdmin || false
    } catch {
      return false
    }
  }

  async isCurrentUserBanned() {
    const user = await this.getCurrentUser()
    if (!user) return false
    
    try {
      const profile = await this.getProfileByUserId(user.$id)
      return profile?.isBanned || false
    } catch {
      return false
    }
  }

  // Posts methods with different algorithms
  async fetchPosts(limit = 20, cursor?: string) {
    const queries = [
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.posts,
      queries
    )
  }

  // For You feed - personalized mix
  async fetchForYouFeed(userId?: string, limit = 20, cursor?: string) {
    try {
      // Get posts from last 7 days for freshness
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      let queries: any[] = [
        Query.greaterThanEqual('$createdAt', sevenDaysAgo.toISOString()),
        Query.limit(limit * 2) // Get more to filter/score
      ]
      if (cursor) queries.push(Query.cursorAfter(cursor))

      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.posts,
        queries
      )

      // Score posts based on engagement and recency
      const scoredPosts = result.documents.map(post => {
        const ageInHours = (Date.now() - new Date(post.$createdAt).getTime()) / (1000 * 60 * 60)
        const engagement = (post.likes || 0) + (post.comments || 0) * 2 + (post.reposts || 0) * 3 + (post.views || 0) * 0.1
        const recencyScore = Math.max(0, 24 - ageInHours) // Higher score for newer posts
        const totalScore = engagement + recencyScore

        return { ...post, score: totalScore }
      })

      // Sort by score and return top posts
      scoredPosts.sort((a, b) => b.score - a.score)
      return {
        ...result,
        documents: scoredPosts.slice(0, limit)
      }
    } catch (error) {
      // Fallback to regular fetch
      return this.fetchPosts(limit, cursor)
    }
  }

  // Watch feed - normal resolution video posts by engagement
  async fetchWatchFeed(limit = 20, cursor?: string) {
    try {
      let queries: any[] = [
        Query.or([
          Query.equal('kind', 'video'),
          Query.equal('postType', 'video')
        ]),
        Query.limit(limit * 3) // Get more to sort by engagement
      ]
      if (cursor) queries.push(Query.cursorAfter(cursor))

      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.posts,
        queries
      )

      // Filter for posts that have video content (excluding reels)
      const videoPosts = result.documents.filter(post =>
        (post.videoUrl || (post.mediaUrls && post.mediaUrls.length > 0) || post.thumbnailUrl) &&
        post.kind !== 'reel' // Exclude reels from watch feed
      )

      // Sort by engagement score
      const sortedPosts = videoPosts
        .map(post => ({
          ...post,
          engagementScore: (post.views || 0) * 0.5 + (post.likes || 0) + (post.comments || 0) * 2 + (post.reposts || 0) * 3
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit)

      return {
        ...result,
        documents: sortedPosts
      }
    } catch (error) {
      console.error('Watch feed error:', error)
      // Fallback: get posts and filter for videos (not reels)
      try {
        const result = await this.fetchPosts(limit * 2)
        const videoPosts = result.documents.filter(post =>
          (post.videoUrl || (post.mediaUrls && post.mediaUrls.length > 0)) &&
          post.kind !== 'reel' &&
          (post.kind === 'video' || post.postType === 'video')
        ).slice(0, limit)

        return {
          ...result,
          documents: videoPosts
        }
      } catch (fallbackError) {
        console.error('Watch feed fallback error:', fallbackError)
        return { documents: [], total: 0 }
      }
    }
  }

  // Reels feed - short videos by engagement
  async fetchReelsFeed(limit = 20, cursor?: string) {
    try {
      let queries: any[] = [
        Query.equal('kind', 'reel'),
        Query.limit(limit * 2)
      ]
      if (cursor) queries.push(Query.cursorAfter(cursor))

      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.posts,
        queries
      )

      // Sort by engagement
      const sortedPosts = result.documents
        .map(post => ({
          ...post,
          engagementScore: (post.likes || 0) + (post.comments || 0) * 2 + (post.reposts || 0) * 3 + (post.views || 0) * 0.3
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit)

      return {
        ...result,
        documents: sortedPosts
      }
    } catch (error) {
      return this.fetchPostsByKind('reel', limit, cursor)
    }
  }

  // Following feed - posts from followed users
  async fetchFollowingFeed(userId: string, limit = 20, cursor?: string) {
    try {
      const followingIds = await this.getFollowingUserIds(userId)
      if (followingIds.length === 0) {
        return { documents: [], total: 0 }
      }

      return await this.fetchPostsByUserIds(followingIds, limit, cursor)
    } catch (error) {
      return { documents: [], total: 0 }
    }
  }

  async getPost(postId: string) {
    return await this.databases.getDocument(
      this.databaseId,
      this.collections.posts,
      postId
    )
  }

  async createPost(data: any) {
    const postId = ID.unique()
    return await this.databases.createDocument(
      this.databaseId,
      this.collections.posts,
      postId,
      {
        ...data,
        postId,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        reposts: 0,
        impressions: 0,
        views: 0
      }
    )
  }

  // Status/Stories methods
  async fetchStatuses(limit = 40) {
    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.statuses,
      [
        Query.orderDesc('timestamp'),
        Query.limit(limit)
      ]
    )
  }

  async createStatus(mediaPath: string, caption = '') {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    const statusId = ID.unique()
    return await this.databases.createDocument(
      this.databaseId,
      this.collections.statuses,
      statusId,
      {
        statusId,
        userId: user.$id,
        mediaPath,
        caption,
        timestamp: new Date().toISOString()
      }
    )
  }

  // News methods
  async fetchNewsArticles(limit = 20, cursor?: string) {
    const queries = [
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.news,
      queries
    )
  }

  // Likes methods
  async isPostLikedBy(userId: string, postId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.likes,
        [
          Query.equal('userId', userId),
          Query.equal('postId', postId),
          Query.limit(1)
        ]
      )
      return result.documents.length > 0
    } catch {
      return false
    }
  }

  async likePost(postId: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    // Check if already liked to prevent duplicates
    const isAlreadyLiked = await this.isPostLikedBy(user.$id, postId)
    if (isAlreadyLiked) return

    await this.databases.createDocument(
      this.databaseId,
      this.collections.likes,
      ID.unique(),
      {
        postId,
        userId: user.$id,
        createdAt: new Date().toISOString()
      }
    )
    await this.incrementPostField(postId, 'likes', 1)
  }

  async unlikePost(postId: string) {
    const user = await this.getCurrentUser()
    if (!user) return

    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.likes,
        [
          Query.equal('userId', user.$id),
          Query.equal('postId', postId)
        ]
      )
      
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.databaseId,
          this.collections.likes,
          doc.$id
        )
      }
      await this.incrementPostField(postId, 'likes', -1)
    } catch {}
  }

  // Reposts methods
  async isPostRepostedBy(userId: string, postId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.reposts,
        [
          Query.equal('userId', userId),
          Query.equal('postId', postId),
          Query.limit(1)
        ]
      )
      return result.documents.length > 0
    } catch {
      return false
    }
  }

  async repostPost(postId: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    const isReposted = await this.isPostRepostedBy(user.$id, postId)
    
    if (isReposted) {
      // Undo repost
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.reposts,
        [
          Query.equal('userId', user.$id),
          Query.equal('postId', postId)
        ]
      )
      
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.databaseId,
          this.collections.reposts,
          doc.$id
        )
      }
      await this.incrementPostField(postId, 'reposts', -1)
    } else {
      // Create repost
      await this.databases.createDocument(
        this.databaseId,
        this.collections.reposts,
        ID.unique(),
        {
          postId,
          userId: user.$id,
          createdAt: new Date().toISOString()
        }
      )
      await this.incrementPostField(postId, 'reposts', 1)
    }
  }

  // Saves methods
  async isPostSavedBy(userId: string, postId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.saves,
        [
          Query.equal('userId', userId),
          Query.equal('postId', postId),
          Query.limit(1)
        ]
      )
      return result.documents.length > 0
    } catch {
      return false
    }
  }

  async savePost(postId: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    const isSaved = await this.isPostSavedBy(user.$id, postId)
    
    if (isSaved) {
      // Unsave
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.saves,
        [
          Query.equal('userId', user.$id),
          Query.equal('postId', postId)
        ]
      )
      
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.databaseId,
          this.collections.saves,
          doc.$id
        )
      }
    } else {
      // Save
      await this.databases.createDocument(
        this.databaseId,
        this.collections.saves,
        ID.unique(),
        {
          postId,
          userId: user.$id,
          createdAt: new Date().toISOString()
        }
      )
    }
  }

  // Chat methods
  async fetchChatsForUser(userId: string) {
    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.chats,
      [Query.search('memberIds', userId)]
    )
  }

  async fetchMessagesForChat(chatId: string, limit = 100) {
    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.messages,
      [
        Query.equal('chatId', chatId),
        Query.orderDesc('timestamp'),
        Query.limit(limit)
      ]
    )
  }

  async sendMessage(chatId: string, content: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    return await this.databases.createDocument(
      this.databaseId,
      this.collections.messages,
      ID.unique(),
      {
        chatId,
        senderId: user.$id,
        content,
        timestamp: new Date().toISOString(),
        readBy: user.$id,
        messageType: 'text'
      }
    )
  }



  // Notifications methods
  async fetchNotifications(userId: string, limit = 20) {
    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.notifications,
      [
        Query.equal('userId', userId),
        Query.orderDesc('timestamp'),
        Query.limit(limit)
      ]
    )
  }

  // Follow methods
  async isFollowing(followerId: string, followingId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.follows,
        [
          Query.equal('followerId', followerId),
          Query.equal('followingId', followingId),
          Query.limit(1)
        ]
      )
      return result.documents.length > 0
    } catch {
      return false
    }
  }

  async followUser(followingId: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    const isAlreadyFollowing = await this.isFollowing(user.$id, followingId)
    if (isAlreadyFollowing) return

    await this.databases.createDocument(
      this.databaseId,
      this.collections.follows,
      ID.unique(),
      {
        followerId: user.$id,
        followingId,
        createdAt: new Date().toISOString()
      }
    )
  }

  async unfollowUser(followingId: string) {
    const user = await this.getCurrentUser()
    if (!user) return

    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.follows,
        [
          Query.equal('followerId', user.$id),
          Query.equal('followingId', followingId)
        ]
      )
      
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.databaseId,
          this.collections.follows,
          doc.$id
        )
      }
    } catch {}
  }

  async getFollowerCount(userId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.follows,
        [
          Query.equal('followingId', userId),
          Query.limit(1)
        ]
      )
      return result.total
    } catch {
      return 0
    }
  }

  async getFollowingCount(userId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.follows,
        [
          Query.equal('followerId', userId),
          Query.limit(1)
        ]
      )
      return result.total
    } catch {
      return 0
    }
  }

  // Profile methods
  async getProfileByUserId(userId: string) {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.profiles,
        [
          Query.equal('userId', userId),
          Query.limit(1)
        ]
      )
      return result.documents.length > 0 ? result.documents[0] : null
    } catch {
      return null
    }
  }

  async updateProfile(userId: string, data: any) {
    try {
      const profile = await this.getProfileByUserId(userId)
      if (profile) {
        return await this.databases.updateDocument(
          this.databaseId,
          this.collections.profiles,
          profile.$id,
          data
        )
      } else {
        return await this.databases.createDocument(
          this.databaseId,
          this.collections.profiles,
          ID.unique(),
          { ...data, userId }
        )
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }

  // Real-time subscriptions with mobile optimization
  subscribeToCollection(collectionId: string, callback: (payload: any) => void) {
    const channel = `databases.${this.databaseId}.collections.${collectionId}.documents`;

    // Add error handling and reconnection logic for mobile
    const handleMessage = (payload: any) => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Realtime callback error:', error);
      }
    };

    const unsubscribe = this.client.subscribe([channel], handleMessage);

    // Handle connection issues (common on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect when tab becomes visible again
        console.log('Reconnecting realtime subscription for', collectionId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Return enhanced unsubscribe function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }

  subscribeToDocument(collectionId: string, documentId: string, callback: (payload: any) => void) {
    const channel = `databases.${this.databaseId}.collections.${collectionId}.documents.${documentId}`;

    const handleMessage = (payload: any) => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Realtime document callback error:', error);
      }
    };

    const unsubscribe = this.client.subscribe([channel], handleMessage);

    // Handle connection issues (common on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Reconnecting document realtime subscription for', documentId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }

  // Additional methods needed for HomeScreen
  async getFollowingUserIds(userId: string): Promise<string[]> {
    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.follows,
        [
          Query.equal('followerId', userId),
          Query.limit(500)
        ]
      )
      return result.documents.map(doc => doc.followingId || doc.followeeId)
    } catch {
      return []
    }
  }

  async fetchPostsByUserIds(userIds: string[], limit = 20, cursor?: string) {
    if (userIds.length === 0) return { documents: [], total: 0 }
    
    const orQueries = userIds.map(id => Query.equal('userId', id))
    const queries = [
      Query.or(orQueries),
      Query.orderDesc('$createdAt'),
      Query.limit(limit)
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.posts,
      queries
    )
  }

  async fetchPostsByKind(kind: string, limit = 20, cursor?: string) {
    const queries = [
      Query.equal('kind', kind),
      Query.orderDesc('createdAt'),
      Query.limit(limit)
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.posts,
      queries
    )
  }

  async fetchLivePosts(limit = 20, cursor?: string) {
    return this.fetchPostsByKind('live', limit, cursor)
  }
  async getUnreadChatCount(userId: string) {
    try {
      const chats = await this.fetchChatsForUser(userId)
      let unreadCount = 0
      
      for (const chat of chats.documents) {
        const memberIds = (chat.memberIds as string).split(',').map(id => id.trim())
        const partnerId = memberIds.find(id => id !== userId)
        if (!partnerId) continue
        
        const messages = await this.fetchMessagesForChat(chat.$id, 30)
        for (const msg of messages.documents) {
          if (msg.senderId === userId) continue
          const readBy = (msg.readBy as string || '').split(',').map(id => id.trim())
          if (!readBy.includes(userId)) {
            unreadCount++
          }
        }
      }
      
      return Math.min(unreadCount, 99)
    } catch {
      return 0
    }
  }

  async getUnreadNotificationCount(userId: string) {
    try {
      const result = await this.fetchNotifications(userId, 50)
      return Math.min(result.documents.length, 99)
    } catch {
      return 0
    }
  }

  // Comments methods
  async fetchComments(postId: string, limit = 50) {
    return await this.databases.listDocuments(
      this.databaseId,
      this.collections.comments,
      [
        Query.equal('postId', postId),
        Query.orderDesc('createdAt'),
        Query.limit(limit)
      ]
    )
  }

  async createComment(postId: string, content: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    const profile = await this.getProfileByUserId(user.$id)
    const username = profile?.displayName || profile?.username || user.name || 'User'
    const avatar = profile?.avatarUrl || ''

    return await this.databases.createDocument(
      this.databaseId,
      this.collections.comments,
      ID.unique(),
      {
        postId,
        userId: user.$id,
        username,
        userAvatar: avatar,
        content,
        likes: 0,
        replies: 0,
        createdAt: new Date().toISOString()
      }
    )
  }

  async likeComment(commentId: string) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User must be signed in')

    await this.databases.createDocument(
      this.databaseId,
      this.collections.commentLikes,
      ID.unique(),
      {
        commentId,
        userId: user.$id,
        createdAt: new Date().toISOString()
      }
    )
    await this.incrementCommentField(commentId, 'likes', 1)
  }

  async unlikeComment(commentId: string) {
    const user = await this.getCurrentUser()
    if (!user) return

    try {
      const result = await this.databases.listDocuments(
        this.databaseId,
        this.collections.commentLikes,
        [
          Query.equal('userId', user.$id),
          Query.equal('commentId', commentId)
        ]
      )
      
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.databaseId,
          this.collections.commentLikes,
          doc.$id
        )
      }
      await this.incrementCommentField(commentId, 'likes', -1)
    } catch {}
  }

  private async incrementCommentField(commentId: string, field: string, delta: number) {
    try {
      const comment = await this.databases.getDocument(
        this.databaseId,
        this.collections.comments,
        commentId
      )
      
      const current = comment[field] || 0
      const newValue = Math.max(0, current + delta)
      
      await this.databases.updateDocument(
        this.databaseId,
        this.collections.comments,
        commentId,
        { [field]: newValue }
      )
    } catch {}
  }
  private async incrementPostField(postId: string, field: string, delta: number) {
    try {
      const post = await this.databases.getDocument(
        this.databaseId,
        this.collections.posts,
        postId
      )

      const current = post[field] || 0
      const newValue = Math.max(0, current + delta)

      await this.databases.updateDocument(
        this.databaseId,
        this.collections.posts,
        postId,
        { [field]: newValue }
      )
    } catch {}
  }

  // Storage methods
  async uploadFile(file: File, fileId: string) {
    const uploadedFile = await this.storage.createFile(
      this.mediaBucketId,
      fileId,
      file
    )

    // Get the file URL
    const fileUrl = this.storage.getFileView(this.mediaBucketId, uploadedFile.$id)

    return {
      id: uploadedFile.$id,
      url: fileUrl as string
    }
  }

  async getFileUrl(fileId: string) {
    const fileUrl = this.storage.getFileView(this.mediaBucketId, fileId)
    return fileUrl as string
  }

}

export const appwriteService = AppwriteService.getInstance()
export default appwriteService