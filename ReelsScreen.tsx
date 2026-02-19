'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'
import { feedCache } from './lib/cache'

export function ReelsScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = feedCache.get('reels')
    if (cached) {
      setPosts(cached)
      return
    }

    loadReels()

    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        if (newPost.postType === 'reel') {
          setPosts(prev => {
            const updated = [{
              ...newPost,
              id: newPost.$id,
              timestamp: new Date(newPost.$createdAt || newPost.createdAt),
            }, ...prev]
            feedCache.set('reels', updated)
            return updated
          })
        }
      }
    })

    return unsubscribe
  }, [])

  const loadReels = async () => {
    const isInitialLoad = posts.length === 0
    if (isInitialLoad) setLoading(true)
    try {
      const result = await appwriteService.fetchReelsFeed()
      const user = await appwriteService.getCurrentUser()
      
      const enrichedPosts = await Promise.all(
        result.documents.map(async (d: any) => {
          const profile = await appwriteService.getProfileByUserId(d.userId)
          const interactions = user ? await Promise.all([
            appwriteService.isPostLikedBy(user.$id, d.$id),
            appwriteService.isPostSavedBy(user.$id, d.$id),
            appwriteService.isPostRepostedBy(user.$id, d.$id)
          ]) : [false, false, false]
          
          return {
            ...d,
            id: d.$id,
            timestamp: new Date(d.$createdAt || d.createdAt),
            displayName: profile?.displayName || 'User',
            avatarUrl: profile?.avatarUrl || '',
            isLiked: interactions[0],
            isSaved: interactions[1],
            isReposted: interactions[2]
          }
        })
      )
      
      setPosts(enrichedPosts as Post[])
      feedCache.set('reels', enrichedPosts as Post[])
    } catch (error) {
      console.error('Failed to load reels:', error)
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 pb-20 sm:pb-24">
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No reels yet</p>
            <p className="text-sm text-muted-foreground">Upload a vertical video using the "+" button to create your first reel!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              feedType="reels"
            />
          ))
        )}
        {loading && posts.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  )
}
