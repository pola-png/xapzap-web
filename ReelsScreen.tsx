'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'

export function ReelsScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReels()
  }, [])

  const loadReels = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchReelsFeed()
      setPosts(result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[])
    } catch (error) {
      console.error('Failed to load reels:', error)
      // Fallback to client-side filtering
      try {
        const result = await appwriteService.fetchPosts()
        const reels = result.documents.filter((d: any) => d.kind === 'reel').map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        }))
        setPosts(reels as Post[])
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
      </div>
    </div>
  )
}
