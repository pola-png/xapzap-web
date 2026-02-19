'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'
import { feedCache } from './lib/cache'

export function NewsScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = feedCache.get('news')
    if (cached) {
      setPosts(cached)
      return
    }

    loadNews()

    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        if (newPost.postType === 'news') {
          setPosts(prev => {
            const updated = [{
              ...newPost,
              id: newPost.$id,
              timestamp: new Date(newPost.$createdAt || newPost.createdAt),
            }, ...prev]
            feedCache.set('news', updated)
            return updated
          })
        }
      }
    })

    return unsubscribe
  }, [])

  const loadNews = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchNewsArticles()
      const mapped = result.documents.map((d: any) => ({
        ...d,
        id: d.$id,
        timestamp: new Date(d.$createdAt || d.createdAt),
      })) as Post[]
      setPosts(mapped)
      feedCache.set('news', mapped)
    } catch (error) {
      console.error('Failed to load news:', error)
      try {
        const result = await appwriteService.fetchPosts()
        const news = result.documents.filter((d: any) => d.kind === 'news').map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        }))
        setPosts(news as Post[])
        feedCache.set('news', news as Post[])
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
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No news yet</p>
            <p className="text-sm text-muted-foreground mt-2">Breaking news and updates will appear here</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              feedType="news"
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
