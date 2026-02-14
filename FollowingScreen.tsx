'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'

export function FollowingScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFollowingPosts()

    // Subscribe to new posts from all users (will be filtered by following list)
    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        // Add to feed (will show if from followed user)
        setPosts(prev => [{
          ...newPost,
          id: newPost.$id,
          timestamp: new Date(newPost.$createdAt || newPost.createdAt),
        }, ...prev])
      }
    })

    return unsubscribe
  }, [])

  const loadFollowingPosts = async () => {
    setLoading(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) {
        setPosts([])
        return
      }

      const result = await appwriteService.fetchFollowingFeed(user.$id)
      setPosts(result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[])
    } catch (error) {
      console.error('Failed to load following posts:', error)
      // Fallback to all posts if following feed fails
      try {
        const result = await appwriteService.fetchPosts()
        setPosts(result.documents.map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        })) as Post[])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        setPosts([])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 pb-20 sm:pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts from people you follow</p>
            <p className="text-sm text-muted-foreground mt-2">Follow creators to see their posts here</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              feedType="following"
            />
          ))
        )}
      </div>
    </div>
  )
}
