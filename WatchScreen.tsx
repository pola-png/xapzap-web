'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PostCard } from './PostCard'
import { CommentModal } from './CommentModal'
import { Post } from './types'
import appwriteService from './appwriteService'
import { feedCache } from './lib/cache'

export function WatchScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    const postId = searchParams.get('post')
    const comments = searchParams.get('comments')
    
    if (postId && comments === 'true') {
      const post = posts.find(p => p.id === postId)
      if (post) {
        setSelectedPost(post)
        setShowComments(true)
      }
    }
  }, [searchParams, posts])

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
    const isInitialLoad = posts.length === 0
    if (isInitialLoad) setLoading(true)
    try {
      const result = await appwriteService.fetchWatchFeed()
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
      feedCache.set('watch', enrichedPosts as Post[])
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load videos:', error)
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  const handleCommentClick = (post: Post) => {
    setSelectedPost(post)
    setShowComments(true)
    router.push(`/watch?post=${post.id}&comments=true`, { scroll: false })
  }

  const handleCloseComments = () => {
    setShowComments(false)
    setSelectedPost(null)
    router.push('/watch', { scroll: false })
  }

  if (showComments && selectedPost) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 pb-20 sm:pb-24">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                feedType="watch"
                onCommentClick={() => handleCommentClick(post)}
              />
            ))}
          </div>
        </div>
        <CommentModal post={selectedPost} onClose={handleCloseComments} />
      </>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 pb-20 sm:pb-24">
        {posts.length === 0 && !loading ? (
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
              onCommentClick={() => handleCommentClick(post)}
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
