'use client'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StoryBar } from "./StoryBar"
import { PostCard } from "./PostCard"
import { CommentModal } from "./CommentModal"
import { Post } from "./types"
import appwriteService from "./appwriteService"
import { feedCache } from "./lib/cache"

export function HomeScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    // Handle URL params for comment modal
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
    // Check cache first
    const cached = feedCache.get('home')
    if (cached) {
      setPosts(cached)
      setHasLoaded(true)
      
      // Load fresh data in background
      loadPosts()
      return
    }

    if (!hasLoaded) {
      loadPosts()
    }

    // Subscribe to new posts
    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        setPosts(prev => {
          const updated = [{
            ...newPost,
            id: newPost.$id,
            timestamp: new Date(newPost.$createdAt || newPost.createdAt),
          }, ...prev]
          feedCache.set('home', updated)
          return updated
        })
      }
    })

    return unsubscribe
  }, [hasLoaded])

  const loadPosts = async () => {
    const isInitialLoad = posts.length === 0
    if (isInitialLoad) setLoading(true)
    
    try {
      const user = await appwriteService.getCurrentUser()
      if (user) {
        setCurrentUserId(user.$id)
        const result = await appwriteService.fetchForYouFeed(user.$id)
        
        // Enrich posts with profile data and user interactions
        const enrichedPosts = await Promise.all(
          result.documents.map(async (d: any) => {
            const profile = await appwriteService.getProfileByUserId(d.userId)
            const [isLiked, isSaved, isReposted] = await Promise.all([
              appwriteService.isPostLikedBy(user.$id, d.$id),
              appwriteService.isPostSavedBy(user.$id, d.$id),
              appwriteService.isPostRepostedBy(user.$id, d.$id)
            ])
            
            return {
              ...d,
              id: d.$id,
              timestamp: new Date(d.$createdAt || d.createdAt),
              displayName: profile?.displayName,
              avatarUrl: profile?.avatarUrl,
              isLiked,
              isSaved,
              isReposted
            }
          })
        )
        
        setPosts(enrichedPosts as Post[])
        feedCache.set('home', enrichedPosts as Post[])
      } else {
        const result = await appwriteService.fetchPosts()
        const enrichedPosts = await Promise.all(
          result.documents.map(async (d: any) => {
            const profile = await appwriteService.getProfileByUserId(d.userId)
            return {
              ...d,
              id: d.$id,
              timestamp: new Date(d.$createdAt || d.createdAt),
              displayName: profile?.displayName,
              avatarUrl: profile?.avatarUrl
            }
          })
        )
        setPosts(enrichedPosts as Post[])
        feedCache.set('home', enrichedPosts as Post[])
      }
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  const handleCommentClick = (post: Post) => {
    setSelectedPost(post)
    setShowComments(true)
    router.push(`/?post=${post.id}&comments=true`, { scroll: false })
  }

  const handleCloseComments = () => {
    setShowComments(false)
    setSelectedPost(null)
    router.push('/', { scroll: false })
  }

  if (showComments && selectedPost) {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <StoryBar />
          <div className="space-y-4 pb-20 sm:pb-24">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                feedType="home"
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
      <StoryBar />
      <div className="space-y-4 pb-20 sm:pb-24">
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              feedType="home"
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
