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
import { formatTimeAgo } from './utils'
import { CommentModal } from './CommentModal'
import { CommentScreen } from './CommentScreen'
import { ReelsDetailScreen } from './VideoDetailScreen'

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
  const [userProfile, setUserProfile] = useState<any>(post.displayName ? { displayName: post.displayName, avatarUrl: post.avatarUrl } : null)
  const [showComments, setShowComments] = useState(false)
  const [showFullComments, setShowFullComments] = useState(false)
  const [showReelDetail, setShowReelDetail] = useState(false)
  const [showFullPost, setShowFullPost] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(propCurrentUserId || null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false)
  const [expandedText, setExpandedText] = useState(false)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePopState = () => {
      if (showReelDetail) setShowReelDetail(false)
      else if (showFullPost) setShowFullPost(false)
      else if (showFullComments) setShowFullComments(false)
      else if (showComments) setShowComments(false)
    }
    
    if (showReelDetail || showFullPost || showFullComments || showComments) {
      window.history.pushState(null, '', window.location.href)
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [showReelDetail, showFullPost, showFullComments, showComments])

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
      } catch (error) {
        console.error('Failed to track impression:', error)
      }
    }

    const timer = setTimeout(trackImpression, 1000) // Track after 1 second
    return () => clearTimeout(timer)
  }, [post.id])

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
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't like - silently ignore or show message
      return
    }

    const wasLiked = liked
    const prevLikes = likes

    // Optimistic update
    setLiked(!wasLiked)
    setLikes(wasLiked ? Math.max(0, likes - 1) : likes + 1)
    
    // Update cache
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, liked: !wasLiked })
    }

    try {
      if (wasLiked) {
        await appwriteService.unlikePost(post.id)
      } else {
        await appwriteService.likePost(post.id)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Revert on error
      setLiked(wasLiked)
      setLikes(prevLikes)
      if (cached) {
        feedCache.setInteraction(post.id, currentUser.$id, { ...cached, liked: wasLiked })
      }
    }
  }

  const handleSave = async () => {
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't save - silently ignore
      return
    }

    const wasSaved = saved

    // Optimistic update
    setSaved(!wasSaved)
    
    // Update cache
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, saved: !wasSaved })
    }

    try {
      await appwriteService.savePost(post.id)
    } catch (error) {
      console.error('Failed to toggle save:', error)
      // Revert on error
      setSaved(wasSaved)
      if (cached) {
        feedCache.setInteraction(post.id, currentUser.$id, { ...cached, saved: wasSaved })
      }
    }
  }

  const handleRepost = async () => {
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't repost - silently ignore
      return
    }

    const wasReposted = reposted
    const prevReposts = reposts

    // Optimistic update
    setReposted(!wasReposted)
    setReposts(wasReposted ? Math.max(0, reposts - 1) : reposts + 1)
    
    // Update cache
    const cached = feedCache.getInteraction(post.id, currentUser.$id)
    if (cached) {
      feedCache.setInteraction(post.id, currentUser.$id, { ...cached, reposted: !wasReposted })
    }

    try {
      await appwriteService.repostPost(post.id)
    } catch (error) {
      console.error('Failed to toggle repost:', error)
      // Revert on error
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
        <div className={`w-full rounded-xl mb-3 overflow-hidden bg-gray-100 dark:bg-gray-800 ${
          feedType === 'watch' ? 'max-h-[70vh]' : 'aspect-square'
        }`}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Post"
              className={`w-full h-full ${
                feedType === 'watch' ? 'object-contain' : 'object-cover'
              }`}
              loading="lazy"
            />
          )}
        </div>
      )
    } else if (post.postType === 'video') {
      const thumbnailUrl = toProxyUrl(post.thumbnailUrl || post.mediaUrls[0])
      
      return (
        <>
          <div
            className="relative w-full rounded-xl mb-3 bg-gray-900 cursor-pointer overflow-hidden"
            style={{ aspectRatio: '4/3' }}
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
                className="w-full h-full object-cover"
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
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg line-clamp-2">{post.title}</h3>
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
              src={videoUrl}
              poster={thumbnailUrl}
              className="w-full rounded-xl mb-3 object-cover"
              style={{ aspectRatio: '9/16' }}
              controls
              preload="metadata"
              autoPlay={false}
              muted
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
            onClick={() => setShowReelDetail(true)}
          >
            <img
              src={thumbnailUrl}
              alt="Reel thumbnail"
              className="w-full h-full object-cover"
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

  if (showFullPost) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setShowFullPost(false)} className="p-2 hover:bg-accent rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Post</h1>
          <div className="w-10" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PostCard post={post} currentUserId={currentUserId || undefined} feedType={feedType} onVideoClick={onVideoClick} onCommentClick={onCommentClick} />
        </div>
      </div>
    )
  }

  if (showReelDetail && post.postType === 'reel') {
    return <ReelsDetailScreen post={post} onClose={() => setShowReelDetail(false)} />
  }

  if (showFullComments) {
    return <CommentScreen post={post} onClose={() => setShowFullComments(false)} />
  }

  return (
    <>
      {showComments && <CommentModal post={post} onClose={() => setShowComments(false)} />}
      <div className="border-b border-gray-200 dark:border-gray-700 relative">
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
              className="text-gray-900 dark:text-white font-bold text-base hover:underline transition-all text-left"
              aria-label={`View ${userProfile?.displayName || 'User'}'s profile`}
            >
              {userProfile?.displayName || 'User'}
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentUserId && currentUserId !== post.userId && !isFollowing && (
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

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-12 right-4 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-x-auto whitespace-nowrap max-w-[calc(100vw-2rem)]">
            <div className="flex items-center">
              {currentUserId === post.userId && (
                <>
                  <button onClick={handleDelete} className="px-4 py-3 text-sm text-red-600 hover:bg-muted transition-colors">
                    Delete
                  </button>
                  <span className="text-border">•</span>
                </>
              )}
              <button className="px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
                Report
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="pb-2" ref={mediaRef} onClick={(e) => {
        if ((post.postType === 'text' || post.postType === 'image' || !post.postType) && !(e.target as HTMLElement).closest('button') && !expandedText) {
          setShowFullPost(true)
        }
      }}>
        {post.textBgColor ? (
          <div
            className={`text-white text-center leading-relaxed p-4 rounded-xl mb-3 max-w-sm ${
              (post.content?.length || 0) < 50
                ? 'text-2xl font-extrabold'
                : (post.content?.length || 0) < 100
                ? 'text-xl font-bold'
                : 'text-lg font-semibold'
            }`}
            style={{ backgroundColor: post.textBgColor ? `#${post.textBgColor.toString(16).padStart(6, '0')}` : undefined }}
          >
            {post.content}
          </div>
        ) : (post.content && !(post.postType === 'video' && (feedType === 'home' || feedType === 'watch'))) ? (
          <div className="text-gray-900 dark:text-white text-base leading-relaxed mb-3">
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
                  <p className={expandedText ? '' : `line-clamp-${maxLines}`}>
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
                          setShowReelDetail(true)
                        } else {
                          setExpandedText(!expandedText)
                        }
                      }}
                      className="text-blue-500 hover:underline text-sm mt-1"
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
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{post.title}</h3>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="pb-3">
        {(feedType as string) === 'reels' ? (
          // Vertical reactions for reels - counts beside icons
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 text-gray-500 dark:text-gray-400 ${liked ? 'text-red-500' : ''}`} aria-label="Like">
              <Heart size={24} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium">{likes || 0}</span>
            </button>
            <button onClick={() => setShowComments(true)} className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Comment">
              <MessageCircle size={24} />
              <span className="text-sm font-medium">{post.comments || 0}</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Repost">
              <Repeat2 size={24} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-medium">{reposts || 0}</span>
            </button>
            <button onClick={handleSave} className={`flex items-center gap-2 hover:text-yellow-500 transition-colors p-2 ${saved ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Bookmark">
              <Bookmark size={24} className={saved ? 'fill-yellow-500' : ''} />
              <span className="text-sm font-medium">Save</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Share">
              <Share size={24} />
              <span className="text-sm font-medium">Share</span>
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
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 rounded-lg ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Repost - ${reposts || 0} reposts`}>
              <Repeat2 size={20} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-medium">{reposts || 0}</span>
            </button>
            <button className={`flex items-center gap-2 hover:text-indigo-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View impressions - ${post.impressions || 0} impressions`}>
              <BarChart2 size={20} />
              <span className="text-sm font-medium">{post.impressions || 0}</span>
            </button>
            <button onClick={() => setShowComments(true)} className={`flex items-center gap-2 hover:text-blue-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View comments - ${post.comments || 0} comments`}>
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{post.comments || 0}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 rounded-lg ${liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Like post - ${likes || 0} likes`}>
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium">{likes || 0}</span>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}