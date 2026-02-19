'use client'

import { useState, useEffect, useRef } from 'react'
import { Post } from './types'
import appwriteService from './appwriteService'
import { feedCache } from './lib/cache'
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical, Repeat2 } from 'lucide-react'
import { OptimizedImage } from './components/OptimizedImage'
import { useRouter } from 'next/navigation'
import { generateSlug } from './lib/slug'

export function ReelsScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const touchStartY = useRef(0)
  const impressionTracked = useRef<Set<string>>(new Set())
  const viewTracked = useRef<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const cached = feedCache.get('reels')
    if (cached && cached.length > 0) {
      setPosts(cached)
    } else {
      loadReels()
    }

    const unsubscribe = appwriteService.subscribeToCollection('posts', (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.create')) {
        const newPost = payload.payload
        if (newPost.postType === 'reel') {
          setPosts(prev => {
            const updated = [{
              ...newPost,
              id: newPost.$id,
              timestamp: new Date(newPost.$createdAt || newPost.createdAt),
            }, ...prev]
            feedCache.set('reels', updated)
            return updated
          })
        }
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {})
          const post = posts[index]
          if (post && !impressionTracked.current.has(post.id)) {
            setTimeout(() => {
              appwriteService.incrementPostField(post.id, 'impressions', 1)
              impressionTracked.current.add(post.id)
              setPosts(prev => prev.map(p => 
                p.id === post.id ? { ...p, impressions: (p.impressions || 0) + 1 } : p
              ))
            }, 1000)
          }
        } else {
          video.pause()
        }
      }
    })
  }, [currentIndex, posts])

  const handleVideoPlay = (postId: string) => {
    if (!viewTracked.current.has(postId)) {
      appwriteService.incrementPostField(postId, 'views', 1)
      viewTracked.current.add(postId)
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p
      ))
    }
  }

  const loadReels = async () => {
    const isInitialLoad = posts.length === 0
    if (isInitialLoad) setLoading(true)
    try {
      const result = await appwriteService.fetchReelsFeed()
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
      feedCache.set('reels', enrichedPosts as Post[])
    } catch (error) {
      console.error('Failed to load reels:', error)
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 10) {
      if (e.deltaY > 0 && currentIndex < posts.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY
    const diff = touchStartY.current - touchEndY
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < posts.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }
  }

  const handleReaction = async (postId: string, action: 'like' | 'comment' | 'save' | 'share' | 'repost') => {
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const post = posts.find(p => p.id === postId)
      if (!post) return

      if (action === 'like') {
        await appwriteService.likePost(postId)
        setPosts(prev => prev.map(p => 
          p.id === postId ? { 
            ...p, 
            isLiked: !p.isLiked,
            likes: p.isLiked ? (p.likes || 0) - 1 : (p.likes || 0) + 1
          } : p
        ))
      } else if (action === 'save') {
        await appwriteService.savePost(postId)
        setPosts(prev => prev.map(p => 
          p.id === postId ? { ...p, isSaved: !p.isSaved } : p
        ))
      } else if (action === 'comment') {
        router.push(`/reels/${generateSlug(post.caption || 'reel', postId)}`)
      } else if (action === 'repost') {
        await appwriteService.repostPost(postId)
        setPosts(prev => prev.map(p => 
          p.id === postId ? { 
            ...p, 
            isReposted: !p.isReposted,
            reposts: p.isReposted ? (p.reposts || 0) - 1 : (p.reposts || 0) + 1
          } : p
        ))
      } else if (action === 'share') {
        if (navigator.share) {
          await navigator.share({
            title: post.caption || 'Check out this reel',
            url: window.location.origin + `/reels/${generateSlug(post.caption || 'reel', postId)}`
          })
        }
      }
    } catch (error) {
      console.error('Reaction failed:', error)
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div className="text-center px-6">
          <p className="text-xl mb-2">No reels yet</p>
          <p className="text-sm text-gray-400">Upload a vertical video to create your first reel!</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}vh)` }}
      >
        {posts.map((post, index) => (
          <div key={post.id} className="h-screen w-screen relative">
            <video
              ref={el => videoRefs.current[index] = el}
              src={post.mediaUrl}
              className="h-full w-full object-cover"
              loop
              playsInline
              muted={false}
              onPlay={() => handleVideoPlay(post.id)}
              onClick={(e) => {
                const video = e.currentTarget
                if (video.paused) {
                  video.play()
                } else {
                  video.pause()
                }
              }}
            />

            {/* Right Side Reactions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-10">
              {/* Profile Avatar */}
              <button 
                onClick={() => router.push(`/profile/${post.userId}`)}
                className="relative"
              >
                {post.avatarUrl ? (
                  <OptimizedImage
                    src={post.avatarUrl}
                    alt={post.displayName}
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white">
                    <span className="text-white font-bold text-lg">
                      {post.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </button>

              {/* Like */}
              <button 
                onClick={() => handleReaction(post.id, 'like')}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Heart 
                    className={`w-7 h-7 ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                  />
                </div>
                <span className="text-white text-xs font-semibold">
                  {(post.likes || 0) > 0 ? post.likes : ''}
                </span>
              </button>

              {/* Comment */}
              <button 
                onClick={() => handleReaction(post.id, 'comment')}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">
                  {(post.comments || 0) > 0 ? post.comments : ''}
                </span>
              </button>

              {/* Repost */}
              <button 
                onClick={() => handleReaction(post.id, 'repost')}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Repeat2 
                    className={`w-6 h-6 ${post.isReposted ? 'text-green-500' : 'text-white'}`}
                  />
                </div>
                <span className="text-white text-xs font-semibold">
                  {(post.reposts || 0) > 0 ? post.reposts : ''}
                </span>
              </button>

              {/* Save */}
              <button 
                onClick={() => handleReaction(post.id, 'save')}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Bookmark 
                    className={`w-6 h-6 ${post.isSaved ? 'fill-yellow-500 text-yellow-500' : 'text-white'}`}
                  />
                </div>
              </button>

              {/* Share */}
              <button 
                onClick={() => handleReaction(post.id, 'share')}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </button>

              {/* More */}
              <button className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <MoreVertical className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-20 left-4 right-20 z-10">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">@{post.displayName}</span>
                </div>
                {post.caption && (
                  <p className="text-sm mb-2 line-clamp-2">{post.caption}</p>
                )}
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute right-1/2 translate-x-1/2 top-4 flex flex-col gap-1 z-10">
              {posts.map((_, i) => (
                <div 
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === currentIndex 
                      ? 'w-8 bg-white' 
                      : 'w-1 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
