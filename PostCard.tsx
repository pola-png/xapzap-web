'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Play, ArrowLeft } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'
import { OptimizedImage } from './components/OptimizedImage'
import { normalizeWasabiImageArray, normalizeWasabiImage } from './lib/wasabi'
import { feedCache } from './lib/cache'
import { generateSlug } from './lib/slug'
import { parseHashtags } from './lib/hashtag'
import { formatCount, formatTimeAgo } from './utils'
import { CommentModal } from './CommentModal'
import { CommentScreen } from './CommentScreen'
import { ReelsDetailScreen } from './VideoDetailScreen'
import { VerifiedBadge } from './components/VerifiedBadge'
import { hasVerifiedBadge } from './lib/verification'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
  currentUserId?: string
  feedType?: 'home' | 'watch' | 'following' | 'news' | 'reels'
  onVideoClick?: (post: Post) => void
  onCommentClick?: () => void
}

export const PostCard = ({ post, currentUserId: propCurrentUserId, feedType = 'home', onVideoClick, onCommentClick }: PostCardProps) => {
  const router = useRouter()
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [reposted, setReposted] = useState(post.isReposted || false)
  const [reposts, setReposts] = useState(post.reposts || 0)
  const [userProfile, setUserProfile] = useState<any>(
    post.displayName ? { displayName: post.displayName, avatarUrl: post.avatarUrl, isVerified: (post as any).isVerified } : null
  )
  const [showComments, setShowComments] = useState(false)
  const [showFullComments, setShowFullComments] = useState(false)
  const [showReelDetail, setShowReelDetail] = useState(false)
  const [showFullPost, setShowFullPost] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(propCurrentUserId || null)
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null)
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false)
  const [expandedText, setExpandedText] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const mediaRef = useRef<HTMLDivElement>(null)
  const reelDetailHistoryActiveRef = useRef(false)
  const fullPostHistoryActiveRef = useRef(false)
  const commentsHistoryActiveRef = useRef(false)
  const fullCommentsHistoryActiveRef = useRef(false)
  const ignoreNextOverlayPopStateRef = useRef(false)

  useEffect(() => {
    const hasOpenOverlay = showReelDetail || showFullPost || showFullComments || showComments

    if (!hasOpenOverlay) {
      return
    }

    const scrollY = window.scrollY
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousWidth = document.body.style.width
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.width = previousWidth
      window.scrollTo(0, scrollY)
    }
  }, [showReelDetail, showFullPost, showFullComments, showComments])

  useEffect(() => {
    const handleOverlayPopState = () => {
      if (ignoreNextOverlayPopStateRef.current) {
        ignoreNextOverlayPopStateRef.current = false
        return
      }

      if (fullCommentsHistoryActiveRef.current && showFullComments) {
        fullCommentsHistoryActiveRef.current = false
        setShowFullComments(false)
        return
      }

      if (commentsHistoryActiveRef.current && showComments) {
        commentsHistoryActiveRef.current = false
        setShowComments(false)
        return
      }

      if (reelDetailHistoryActiveRef.current && showReelDetail) {
        reelDetailHistoryActiveRef.current = false
        setShowReelDetail(false)
        return
      }

      if (fullPostHistoryActiveRef.current && showFullPost) {
        fullPostHistoryActiveRef.current = false
        setShowFullPost(false)
      }
    }

    window.addEventListener('popstate', handleOverlayPopState)
    return () => window.removeEventListener('popstate', handleOverlayPopState)
  }, [showReelDetail, showFullPost, showFullComments, showComments])

  const pushOverlayHistoryState = (stateKey: string) => {
    window.history.pushState({ ...(window.history.state || {}), [stateKey]: true }, '', window.location.href)
  }

  const consumeOverlayHistoryState = (isHistoryActiveRef: { current: boolean }) => {
    if (!isHistoryActiveRef.current) return
    isHistoryActiveRef.current = false
    ignoreNextOverlayPopStateRef.current = true
    window.history.back()
  }

  const openReelDetail = () => {
    if (!reelDetailHistoryActiveRef.current) {
      pushOverlayHistoryState('xapzapReelDetail')
      reelDetailHistoryActiveRef.current = true
    }
    setShowReelDetail(true)
  }

  const closeReelDetail = () => {
    setShowReelDetail(false)
    consumeOverlayHistoryState(reelDetailHistoryActiveRef)
  }

  const openFullPost = () => {
    if (!fullPostHistoryActiveRef.current) {
      pushOverlayHistoryState('xapzapFullPost')
      fullPostHistoryActiveRef.current = true
    }
    setShowFullPost(true)
  }

  const closeFullPost = () => {
    setShowFullPost(false)
    consumeOverlayHistoryState(fullPostHistoryActiveRef)
  }

  const openComments = () => {
    if (!commentsHistoryActiveRef.current) {
      pushOverlayHistoryState('xapzapCommentModal')
      commentsHistoryActiveRef.current = true
    }
    setShowComments(true)
    
    const logCommentEvent = async () => {
      const user = await appwriteService.getCurrentUser()
      if (user && post.userId) {
        await appwriteService.logFeedEvent({
          userId: user.$id,
          postId: post.id,
          creatorId: post.userId,
          feed: feedType,
          eventType: 'comment',
          position: 0
        })
      }
    }
    logCommentEvent()
  }

  const closeComments = () => {
    setShowComments(false)
    consumeOverlayHistoryState(commentsHistoryActiveRef)
  }

  const closeFullComments = () => {
    setShowFullComments(false)
    consumeOverlayHistoryState(fullCommentsHistoryActiveRef)
  }

  useEffect(() => {
    if (!showFullComments || fullCommentsHistoryActiveRef.current) return
    pushOverlayHistoryState('xapzapFullComments')
    fullCommentsHistoryActiveRef.current = true
  }, [showFullComments])

  // Check if current user has liked/saved/reposted - skip if already in post data
  useEffect(() => {
    const loadUser = async () => {
      const user = await appwriteService.getCurrentUser()
      setCurrentUserId(user?.$id || null)
      if (user && post.userId && user.$id !== post.userId) {
        const following = await appwriteService.isFollowing(user.$id, post.userId)
        setIsFollowing(following)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!mediaRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadMedia(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(mediaRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (post.isLiked !== undefined) return // Already have interaction data
    
    const checkUserInteractions = async () => {
      const user = await appwriteService.getCurrentUser()
      if (!user) return

      // Check cache first
      const cached = feedCache.getInteraction(post.id, user.$id)
      if (cached) {
        setLiked(cached.liked)
        setSaved(cached.saved)
        setReposted(cached.reposted)
        return
      }

      const [isLiked, isSaved, isReposted] = await Promise.all([
        appwriteService.isPostLikedBy(user.$id, post.id),
        appwriteService.isPostSavedBy(user.$id, post.id),
        appwriteService.isPostRepostedBy(user.$id, post.id)
      ])

      setLiked(isLiked)
      setSaved(isSaved)
      setReposted(isReposted)
      
      // Cache the result
      feedCache.setInteraction(post.id, user.$id, { liked: isLiked, saved: isSaved, reposted: isReposted })
    }

    checkUserInteractions()
  }, [post.id, post.isLiked])

  // Fetch user profile data - skip if already in post data
  useEffect(() => {
    if (post.displayName) return // Already have profile data
    
    const fetchUserProfile = async () => {
      if (!post.userId) return

      // Check cache first
      const cached = feedCache.getProfile(post.userId)
      if (cached) {
        setUserProfile(cached)
        return
      }

      try {
        const profile = await appwriteService.getProfileByUserId(post.userId)
        setUserProfile(profile)
        feedCache.setProfile(post.userId, profile)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }

    fetchUserProfile()
  }, [post.userId, post.displayName])

  // Track impression when post is viewed (only once)
  useEffect(() => {
    let tracked = false
    const trackImpression = async () => {
      if (tracked) return
      tracked = true
      try {
        await appwriteService.incrementPostField(post.id, 'impressions', 1)
        
        const user = await appwriteService.getCurrentUser()
        if (user && post.userId) {
          await appwriteService.logFeedEvent({
            userId: user.$id,
            postId: post.id,
            creatorId: post.userId,
            feed: feedType,
            eventType: 'impression',
            position: 0
          })
        }
      } catch (error) {
        console.error('Failed to track impression:', error)
      }
    }

    const timer = setTimeout(trackImpression, 1000)
    return () => clearTimeout(timer)
  }, [post.id, post.userId, feedType])

  // Subscribe to realtime updates for this post
  useEffect(() => {
    if (!post.id) return

    const unsubscribe = appwriteService.subscribeToDocument('posts', post.id, (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.update')) {
        const updatedPost = payload.payload
        setLikes(updatedPost.likes || 0)
        setReposts(updatedPost.reposts || 0)
      }
    })

    return unsubscribe
  }, [post.id])

  const handleLike = async () => {
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) return

    const wasLiked = liked
    const prevLikes = likes

    setLiked(!wasLiked)
    setLikes(wasLiked ? Math.max(0, likes - 1) : likes + 1)
    
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, liked: !wasLiked })
    }

    try {
      if (wasLiked) {
        await appwriteService.unlikePost(post.id)
      } else {
        await appwriteService.likePost(post.id)
        if (post.userId) {
          await appwriteService.logFeedEvent({
            userId: currentUser.$id,
            postId: post.id,
            creatorId: post.userId,
            feed: feedType,
            eventType: 'like',
            position: 0
          })
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setLiked(wasLiked)
      setLikes(prevLikes)
      if (cached) {
        feedCache.setInteraction(post.id, currentUser.$id, { ...cached, liked: wasLiked })
      }
    }
  }

  const handleSave = async () => {
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) return

    const wasSaved = saved
    setSaved(!wasSaved)
    
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, saved: !wasSaved })
    }

    try {
      await appwriteService.savePost(post.id)
      if (!wasSaved && post.userId) {
        await appwriteService.logFeedEvent({
          userId: currentUser.$id,
          postId: post.id,
          creatorId: post.userId,
          feed: feedType,
          eventType: 'save',
          position: 0
        })
      }
    } catch (error) {
      console.error('Failed to toggle save:', error)
      setSaved(wasSaved)
      if (cached) {
        feedCache.setInteraction(post.id, currentUser.$id, { ...cached, saved: wasSaved })
      }
    }
  }

  const handleRepost = async () => {
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) return

    const wasReposted = reposted
    const prevReposts = reposts

    setReposted(!wasReposted)
    setReposts(wasReposted ? Math.max(0, reposts - 1) : reposts + 1)
    
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, reposted: !wasReposted })
    }

    try {
      await appwriteService.repostPost(post.id)
      if (!wasReposted && post.userId) {
        await appwriteService.logFeedEvent({
          userId: currentUser.$id,
          postId: post.id,
          creatorId: post.userId,
          feed: feedType,
          eventType: 'repost',
          position: 0
        })
      }
    } catch (error) {
      console.error('Failed to toggle repost:', error)
      setReposted(wasReposted)
      setReposts(prevReposts)
      if (cached) {
        feedCache.setInteraction(post.id, currentUser.$id, { ...cached, reposted: wasReposted })
      }
    }
  }

  const handleShare = async () => {
    try {
      const postUrl = post.postType === 'reel' 
        ? `${window.location.origin}/reels/${generateSlug(post.title || post.content?.substring(0, 30) || 'reel', post.id)}`
        : `${window.location.origin}/watch/${generateSlug(post.title || 'video', post.id)}`
      
      if (navigator.share) {
        await navigator.share({
          title: post.title || post.content || 'Check this out',
          text: post.content || '',
          url: postUrl
        })
        
        const user = await appwriteService.getCurrentUser()
        if (user && post.userId) {
          await appwriteService.logFeedEvent({
            userId: user.$id,
            postId: post.id,
            creatorId: post.userId,
            feed: feedType,
            eventType: 'share',
            position: 0
          })
        }
      }
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await appwriteService.deletePost(post.id)
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const handleFollow = async () => {
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) return

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)

    try {
      if (wasFollowing) {
        await appwriteService.unfollowUser(post.userId)
      } else {
        await appwriteService.followUser(post.userId)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      setIsFollowing(wasFollowing)
    }
  }

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null
    if (!shouldLoadMedia) return <div className="w-full aspect-square rounded-xl mb-3 bg-gray-100 dark:bg-gray-800" />

    const toProxyUrl = (url: string) => {
      if (url.startsWith('/media/')) {
        return `/api/image-proxy?path=${url.substring(1)}`
      }
      return url
    }

    const imageUrl = toProxyUrl(post.mediaUrls[0])

    if (post.postType === 'image') {
      return (
        <div 
          className="w-full rounded-xl mb-3 overflow-hidden bg-gray-100 dark:bg-gray-800 relative"
          style={{ aspectRatio: '1/1.2' }}
        >
          <div
            className="w-full h-full cursor-pointer"
            onClick={openFullPost}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const touchEndX = e.changedTouches[0].clientX
              const diff = touchStartX - touchEndX
              if (Math.abs(diff) > 50) {
                e.stopPropagation()
                if (diff > 0 && currentImageIndex < post.mediaUrls.length - 1) {
                  setCurrentImageIndex(prev => prev + 1)
                } else if (diff < 0 && currentImageIndex > 0) {
                  setCurrentImageIndex(prev => prev - 1)
                }
              }
            }}
          >
            <img
              src={toProxyUrl(post.mediaUrls[currentImageIndex])}
              alt="Post"
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          </div>
          {post.mediaUrls.length > 1 && (
            <div className="absolute top-3 right-3 flex gap-1.5">
              {post.mediaUrls.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white w-6' : 'bg-white/60'
                  }`} 
                />
              ))}
            </div>
          )}
        </div>
      )
    } else if (post.postType === 'video') {
      const thumbnailUrl = toProxyUrl(post.thumbnailUrl || post.mediaUrls[0])
      
      return (
        <>
          <div
            className="relative w-full rounded-xl mb-3 bg-gray-900 cursor-pointer overflow-hidden"
            onClick={() => {
              if (onVideoClick) {
                onVideoClick(post)
              } else {
                router.push(`/watch/${generateSlug(post.title || 'video', post.id)}`)
              }
            }}
          >
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
          {post.title && (
            <div className="mb-3 px-2">
              <h3 className="text-gray-900 dark:text-white font-bold text-xl leading-snug line-clamp-2">{post.title}</h3>
            </div>
          )}
        </>
      )
    } else if (post.postType === 'reel') {
      const videoUrl = toProxyUrl(post.mediaUrls[0])
      const thumbnailUrl = toProxyUrl(post.thumbnailUrl || post.mediaUrls[0])
      
      // Reel display - 1:1 on feeds, 9:16 on reels/details
      if ((feedType as string) === 'reels') {
        // Reels page - 9:16 vertical
        return (
          <div className="relative">
            <video
              ref={(el) => {
                if (el) {
                  el.muted = true
                }
              }}
              src={videoUrl}
              poster={thumbnailUrl}
              className="w-full rounded-xl mb-3 object-cover"
              style={{ aspectRatio: '9/16' }}
              controls
              preload="metadata"
            />
            {/* Title overlay on reels */}
            {post.title && (
              <div className="absolute top-4 left-4 right-4 bg-black/60 rounded-lg p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-2">{post.title}</h3>
              </div>
            )}
          </div>
        )
      } else {
        // Other feeds - 1:1 square
        return (
          <div
            className="relative w-full rounded-xl mb-3 bg-black cursor-pointer overflow-hidden aspect-square"
            onClick={openReelDetail}
          >
            <img
              src={thumbnailUrl}
              alt="Reel thumbnail"
              className="w-full h-full object-cover object-top"
            />
            {/* Reel overlay */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
              </div>
            </div>
            {/* Title below reel */}
            {post.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-1">{post.title}</h3>
              </div>
            )}
          </div>
        )
      }
    }

    return null
  }

  return (
    <>
      {showFullPost && post.postType === 'image' && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80">
            <button onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              closeFullPost()
            }} className="p-2 hover:bg-white/10 rounded-full text-white">
              <ArrowLeft size={24} />
            </button>
            <div className="text-white text-sm">{currentImageIndex + 1} / {post.mediaUrls.length}</div>
            <div className="w-10" />
          </div>
          <div 
            className="flex-1 relative flex items-center justify-center"
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const touchEndX = e.changedTouches[0].clientX
              const diff = touchStartX - touchEndX
              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentImageIndex < post.mediaUrls.length - 1) {
                  setCurrentImageIndex(prev => prev + 1)
                } else if (diff < 0 && currentImageIndex > 0) {
                  setCurrentImageIndex(prev => prev - 1)
                }
              }
            }}
          >
            {(() => {
              const currentImageUrl = post.mediaUrls[currentImageIndex] || post.mediaUrls[0]
              const proxiedImageUrl = currentImageUrl.startsWith('/media/')
                ? `/api/image-proxy?path=${currentImageUrl.substring(1)}`
                : currentImageUrl
              return (
            <img
              src={proxiedImageUrl}
              alt="Post"
              className="max-w-full max-h-full object-contain"
            />
              )
            })()}
          </div>
        </div>
      )}
      {showReelDetail && post.postType === 'reel' && (
        <ReelsDetailScreen post={post} onClose={closeReelDetail} />
      )}
      {showFullComments && <CommentScreen post={post} onClose={closeFullComments} />}
      {showComments && <CommentModal post={post} onClose={closeComments} />}
      <div className="border-b border-gray-200 dark:border-gray-700 relative font-semibold tracking-[0.02em]">
      {(() => {
        const showVerifiedBadge = hasVerifiedBadge(userProfile || post)
        return (
      <>
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push(`/profile/${post.userId}`)}
            className="hover:opacity-80 transition-opacity flex-shrink-0"
            aria-label={`View ${userProfile?.displayName || userProfile?.username || post.username}'s profile`}
          >
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl.startsWith('/media/') ? `/api/image-proxy?path=${userProfile.avatarUrl.substring(1)}` : userProfile.avatarUrl}
                alt={userProfile.displayName || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white font-semibold">
                {(userProfile?.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => router.push(`/profile/${post.userId}`)}
              className="text-gray-900 dark:text-white font-extrabold text-[21px] sm:text-[22px] leading-[1.35] hover:underline transition-all text-left flex items-center gap-1"
              aria-label={`View ${userProfile?.displayName || 'User'}'s profile`}
            >
              {showVerifiedBadge && <VerifiedBadge className="h-4 w-4 shrink-0" />}
              {userProfile?.displayName || 'User'}
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-[13px] ml-2 font-semibold">{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentUserId && currentUserId !== post.userId && isFollowing === false && (
            <button
              onClick={handleFollow}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 bg-blue-500 text-white hover:bg-blue-600"
            >
              Follow
            </button>
          )}
          <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" aria-label="More options">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
      </>
        )
      })()}

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-12 right-4 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-x-auto whitespace-nowrap max-w-[calc(100vw-2rem)]">
            <div className="flex items-center">
              {currentUserId === post.userId && (
                <>
                  <button onClick={handleDelete} className="px-4 py-3 text-sm font-semibold text-red-600 hover:bg-muted transition-colors">
                    Delete
                  </button>
                  <span className="text-border">•</span>
                </>
              )}
              <button className="px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Report
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="pb-2" ref={mediaRef} onClick={(e) => {
        if (post.postType === 'image' && !(e.target as HTMLElement).closest('button') && !expandedText) {
          openFullPost()
        }
      }}>
        {post.textBgColor ? (
          <div
            className={`text-white text-center leading-[1.75] tracking-[0.03em] p-4 rounded-xl mb-3 max-w-sm ${
              (post.content?.length || 0) < 50
                ? 'text-3xl font-extrabold'
                : (post.content?.length || 0) < 100
                ? 'text-2xl font-bold'
                : 'text-xl font-semibold'
            }`}
            style={{ backgroundColor: post.textBgColor ? `#${post.textBgColor.toString(16).padStart(6, '0')}` : undefined }}
          >
            {post.content}
          </div>
        ) : (post.content && !(post.postType === 'video' && (feedType === 'home' || feedType === 'watch'))) ? (
          <div className="text-gray-900 dark:text-white text-[17px] leading-[1.85] tracking-[0.03em] mb-3 font-medium">
            {(() => {
              const contentLength = post.content.length
              let maxLines = 2
              
              if (post.postType === 'reel') {
                maxLines = 2
              } else if (post.postType === 'video') {
                maxLines = 2
              } else if (contentLength >= 1000) {
                maxLines = 5
              } else if (contentLength >= 400) {
                maxLines = 3
              } else {
                maxLines = 2
              }
              
              const needsTruncation = post.content.split('\n').length > maxLines || contentLength > maxLines * 80
              
              return (
                <>
                  <p className={`leading-[1.8] tracking-[0.03em] ${expandedText ? '' : `line-clamp-${maxLines}`}`}>
                    {parseHashtags(post.content)}
                  </p>
                  {needsTruncation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (post.postType === 'video') {
                          if (onVideoClick) {
                            onVideoClick(post)
                          } else {
                            router.push(`/watch/${generateSlug(post.title || 'video', post.id)}`)
                          }
                        } else if (post.postType === 'reel') {
                          openReelDetail()
                        } else {
                          setExpandedText(!expandedText)
                        }
                      }}
                      className="text-blue-500 hover:underline text-sm font-semibold mt-1"
                    >
                      {expandedText ? 'Show less' : 'more'}
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        ) : null}

        {/* Display media from mediaUrls array */}
        {renderMedia()}

        {post.postType === 'news' && post.title && (
          <div className="border-l-4 border-blue-500 pl-4 mb-3">
            <h3 className="post-title font-extrabold text-xl text-gray-900 dark:text-white leading-snug">
              {post.title}
            </h3>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="pb-3 tracking-normal">
        {(feedType as string) === 'reels' ? (
          // Vertical reactions for reels - counts beside icons
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 text-gray-500 dark:text-gray-400 ${liked ? 'text-red-500' : ''}`} aria-label="Like">
              <Heart size={24} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-bold">{formatCount(likes)}</span>
            </button>
            <button onClick={openComments} className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Comment">
              <MessageCircle size={24} />
              <span className="text-sm font-bold">{formatCount(post.comments || 0)}</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Repost">
              <Repeat2 size={24} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-bold">{formatCount(reposts)}</span>
            </button>
            <button onClick={handleSave} className={`flex items-center gap-2 hover:text-yellow-500 transition-colors p-2 ${saved ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Bookmark">
              <Bookmark size={24} className={saved ? 'fill-yellow-500' : ''} />
              <span className="text-sm font-bold">Save</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Share">
              <Share size={24} />
              <span className="text-sm font-bold">Share</span>
            </button>
          </div>
        ) : (
          // Horizontal reactions for other feeds - icon only on mobile
          <div className="flex items-center justify-between gap-2">
            <button onClick={handleSave} className={`flex items-center justify-center hover:text-yellow-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400 ${saved ? 'text-yellow-500' : ''}`} aria-label={`Save post - ${saved ? 'saved' : 'not saved'}`}>
              <Bookmark size={20} className={saved ? 'fill-yellow-500' : ''} />
            </button>
            <button onClick={handleShare} className={`flex items-center justify-center hover:text-blue-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label="Share post">
              <Share size={20} />
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 rounded-lg ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Repost - ${formatCount(reposts)} reposts`}>
              <Repeat2 size={20} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-bold">{formatCount(reposts)}</span>
            </button>
            <button className={`flex items-center gap-2 hover:text-indigo-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View impressions - ${formatCount(post.impressions || 0)} impressions`}>
              <BarChart2 size={20} />
              <span className="text-sm font-bold">{formatCount(post.impressions || 0)}</span>
            </button>
            <button onClick={openComments} className={`flex items-center gap-2 hover:text-blue-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View comments - ${formatCount(post.comments || 0)} comments`}>
              <MessageCircle size={20} />
              <span className="text-sm font-bold">{formatCount(post.comments || 0)}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 rounded-lg ${liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Like post - ${formatCount(likes)} likes`}>
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-bold">{formatCount(likes)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
