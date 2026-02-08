'use client'

import { useEffect, useState } from 'react'
import { StoryBar } from './StoryBar'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'

export function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const result = await appwriteService.fetchPosts(20)
      setPosts(result.documents as unknown as Post[])
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[680px] mx-auto">
      <StoryBar />
      <div className="mt-4 space-y-0">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No posts yet</div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}