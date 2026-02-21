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
    
    if (postId && comments) {
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
    if (cached && cached.length > 0) {
      setPosts(cached)
      setHasLoaded(true)
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
    setLoading(true)
    setPosts([])
    try {
      const user = await appwriteService.getCurrentUser()
      if (user) {
        setCurrentUserId(user.$id)
        const result = await appwriteService.fetchForYouFeed(user.$id)
        
        const allPosts: Post[] = []
        for (let i = 0; i < result.documents.length; i++) {
          const d: any = result.documents[i]
          const profile = await appwriteService.getProfileByUserId(d.userId)
          const [isLiked, isSaved, isReposted] = await Promise.all([
            appwriteService.isPostLikedBy(user.$id, d.$id),
            appwriteService.isPostSavedBy(user.$id, d.$id),
            appwriteService.isPostRepostedBy(user.$id, d.$id)
          ])
          
          const enrichedPost = {
            ...d,
            id: d.$id,
            timestamp: new Date(d.$createdAt || d.createdAt),
            displayName: profile?.displayName,
            avatarUrl: profile?.avatarUrl,
            isLiked,
            isSaved,
            isReposted
          }
          
          allPosts.push(enrichedPost)
          setPosts([...allPosts])
        }
        feedCache.set('home', allPosts)
      } else {
        const result = await appwriteService.fetchPosts()
        const allPosts: Post[] = []
        for (let i = 0; i < result.documents.length; i++) {
          const d: any = result.documents[i]
          const profile = await appwriteService.getProfileByUserId(d.userId)
          const enrichedPost = {
            ...d,
            id: d.$id,
            timestamp: new Date(d.$createdAt || d.createdAt),
            displayName: profile?.displayName,
            avatarUrl: profile?.avatarUrl
          }
          allPosts.push(enrichedPost)
          setPosts([...allPosts])
        }
        feedCache.set('home', allPosts)
      }
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
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
    const isFullscreen = searchParams.get('comments') === 'fullscreen'
    
    if (isFullscreen) {
      return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={handleCloseComments}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Comments</h1>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-muted-foreground text-sm text-center py-8">Full screen comments</p>
          </div>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {selectedPost.avatarUrl ? (
                <img src={selectedPost.avatarUrl} alt={selectedPost.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                  {(selectedPost.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <button className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md">
                Post
              </button>
            </div>
          </div>
        </div>
      )
    }
    
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
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            feedType="home"
            onCommentClick={() => handleCommentClick(post)}
          />
        ))}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  )
}
