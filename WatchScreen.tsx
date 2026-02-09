'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'

export function WatchScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchWatchFeed()
      setPosts(result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[])
    } catch (error) {
      console.error('Failed to load videos:', error)
      // Fallback to client-side filtering
      try {
        const result = await appwriteService.fetchPosts()
        const videos = result.documents.filter((d: any) => d.kind === 'video' || d.videoUrl).map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        }))
        setPosts(videos as Post[])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No videos yet</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
