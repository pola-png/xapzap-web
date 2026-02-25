'use client'

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StoryBar } from "./StoryBar"
import { PostCard } from "./PostCard"
import { CommentModal } from "./CommentModal"
import { Post } from "./types"
import appwriteService from "./appwriteService"
import { feedCache } from "./lib/cache"
import { useAuthStore } from "./authStore"
import { useFeedStore } from "./feedStore"

export function HomeScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const feedStore = useFeedStore()
  const authStore = useAuthStore()
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false)
  const isAuthenticated = Boolean(authStore.currentUserId || currentUserId)

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

  // Lightweight onboarding banner for visitors/guests
  useEffect(() => {
    // Show prompt only when there is no authenticated user stored
    if (!authStore.currentUserId) {
      setShowOnboardingPrompt(true)
    }
  }, [authStore.currentUserId])

  useEffect(() => {
    const cached = feedStore.getFeed('foryou')
    if (cached && cached.posts.length > 0) {
      setPosts(cached.posts)
      setHasLoaded(true)
      setTimeout(() => window.scrollTo(0, cached.scrollPosition), 0)
      return
    }

    if (!hasLoaded) {
      loadPosts()
    }

    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        setPosts(prev => {
          const updated = [{
            ...newPost,
            id: newPost.$id,
            timestamp: new Date(newPost.$createdAt || newPost.createdAt),
          }, ...prev]
          feedStore.setFeed('foryou', updated)
          return updated
        })
      }
    })

    return unsubscribe
  }, [hasLoaded])

  useEffect(() => {
    const handleScroll = () => {
      feedStore.setScrollPosition('foryou', window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (user) {
        setCurrentUserId(user.$id)
        const result = await appwriteService.fetchForYouFeed(user.$id)
        
        const allPosts: Post[] = await Promise.all(
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
            } as Post
          })
        )

        setPosts(allPosts)
        feedStore.setFeed('foryou', allPosts)
      } else {
        const result = await appwriteService.fetchPosts()
        const allPosts: Post[] = await Promise.all(
          result.documents.map(async (d: any) => {
            const profile = await appwriteService.getProfileByUserId(d.userId)
            return {
              ...d,
              id: d.$id,
              timestamp: new Date(d.$createdAt || d.createdAt),
              displayName: profile?.displayName,
              avatarUrl: profile?.avatarUrl
            } as Post
          })
        )

        setPosts(allPosts)
        feedStore.setFeed('foryou', allPosts)
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
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {isAuthenticated && <StoryBar />}
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
      {showOnboardingPrompt && (
        <div className="mt-3 mb-3 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-secondary))] px-4 py-3 text-sm flex items-center justify-between gap-3">
          <div className="text-[rgb(var(--text-secondary))]">
            <div className="font-semibold text-[rgb(var(--text-primary))] mb-0.5">
              Enjoying the feed?
            </div>
            <div>Sign up to post your own stories, reels, and chat with others.</div>
          </div>
          <button
            onClick={() => {
              setShowOnboardingPrompt(false)
              router.push('/auth/signup')
            }}
            className="shrink-0 px-3 py-1.5 rounded-full bg-[#1DA1F2] text-white text-xs font-semibold hover:bg-[#1A8CD8] transition"
          >
            Sign up
          </button>
        </div>
      )}
      {isAuthenticated && <StoryBar />}
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
