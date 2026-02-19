'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { VideoDetailScreen } from './VideoDetailScreen'
import { Post } from './types'
import appwriteService from './appwriteService'
import { feedCache } from './lib/cache'

export function WatchScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const cached = feedCache.get('watch')
    if (cached) {
      setPosts(cached)
      setHasLoaded(true)
      return
    }

    if (!hasLoaded) {
      loadVideos()
    }

    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        if (newPost.postType === 'video') {
          setPosts(prev => {
            const updated = [{
              ...newPost,
              id: newPost.$id,
              timestamp: new Date(newPost.$createdAt || newPost.createdAt),
            }, ...prev]
            feedCache.set('watch', updated)
            return updated
          })
        }
      }
    })

    return unsubscribe
  }, [hasLoaded])

  const loadVideos = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchWatchFeed()
      const mapped = result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[]
      setPosts(mapped)
      feedCache.set('watch', mapped)
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load videos:', error)
      try {
        const result = await appwriteService.fetchPosts()
        const videos = result.documents.filter((d: any) => d.kind === 'video' || d.videoUrl).map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        }))
        setPosts(videos as Post[])
        feedCache.set('watch', videos as Post[])
        setHasLoaded(true)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
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
            <p className="text-muted-foreground">No videos yet</p>
            <p className="text-sm text-muted-foreground mt-2">Videos from creators you follow will appear here</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              feedType="watch"
            />
          ))
        )}
      </div>
    </div>
  )
}
