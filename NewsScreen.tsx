'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'

export function NewsScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchNewsArticles()
      setPosts(result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[])
    } catch (error) {
      console.error('Failed to load news:', error)
      // Fallback to filtering posts
      try {
        const result = await appwriteService.fetchPosts()
        const news = result.documents.filter((d: any) => d.kind === 'news').map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        }))
        setPosts(news as Post[])
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
            <p className="text-muted-foreground">No news yet</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
