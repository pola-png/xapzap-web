'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Eye, Loader2 } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'
import { normalizeWasabiImage } from './lib/wasabi'
import { parseHashtags } from './lib/hashtag'
import { formatTimeAgo } from './utils'
import { CommentModal } from './CommentModal'
import { CommentScreen } from './CommentScreen'

interface VideoDetailScreenProps {
  post: Post
  onClose: () => void
  isGuest?: boolean
  onGuestAction?: () => void
}

// Horizontal video detail screen (for Watch videos)
export function VideoDetailScreen({ post, onClose, isGuest = false, onGuestAction }: VideoDetailScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)
  const [reposts, setReposts] = useState(post.reposts || 0)
  const [reposted, setReposted] = useState(post.isReposted || false)
  const [comments, setComments] = useState(post.comments || 0)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [impressions, setImpressions] = useState(post.impressions || 0)
  const [views, setViews] = useState(post.views || 0)
  const [showDescription, setShowDescription] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [commentInputFocused, setCommentInputFocused] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentsList, setCommentsList] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [, forceUpdate] = useState(0)
  const [hasEnded, setHasEnded] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [swipeStartX, setSwipeStartX] = useState(0)
  const [selectedCommentForReplies, setSelectedCommentForReplies] = useState<any>(null)
  const [repliesList, setRepliesList] = useState<any[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasCountedView = useRef(false)

  useEffect(() => {
    const handlePopState = () => {
      if (selectedCommentForReplies) {
        setSelectedCommentForReplies(null)
        setRepliesList([])
      } else if (showComments) {
        setShowComments(false)
      }
    }
    
    if (selectedCommentForReplies || showComments) {
      window.history.pushState(null, '', window.location.href)
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [selectedCommentForReplies, showComments])

  useEffect(() => {
    const loadUser = async () => {
      const user = await appwriteService.getCurrentUser()
      setCurrentUserId(user?.$id || null)
      if (user && post.userId) {
        const following = await appwriteService.isFollowing(user.$id, post.userId)
        setIsFollowing(following)
      }
    }
    loadUser()
  }, [])

  // Subscribe to realtime updates for this post
  useEffect(() => {
    if (!post.id) return

    const unsubscribe = appwriteService.subscribeToDocument('posts', post.id, (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.update')) {
        const updatedPost = payload.payload
        setLikes(updatedPost.likes || 0)
        setReposts(updatedPost.reposts || 0)
        setComments(updatedPost.comments || 0)
        setImpressions(updatedPost.impressions || 0)
        setViews(updatedPost.views || 0)
      }
    })

    return unsubscribe
  }, [post.id])

  // Load comments on mount
  useEffect(() => {
    loadComments()
  }, [])

  // Load comments when modal opens
  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments])

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const result = await appwriteService.fetchComments(post.id)
      const user = await appwriteService.getCurrentUser()
      const commentsData = await Promise.all(
        result.documents.map(async (doc: any) => {
          let isLiked = false
          if (user) {
            isLiked = await appwriteService.isCommentLikedBy(user.$id, doc.$id)
          }
          return {
            ...doc,
            isLiked
          }
        })
      )
      setCommentsList(commentsData)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    const user = await appwriteService.getCurrentUser()
    if (!user) return

    const comment = commentsList.find(c => c.$id === commentId)
    if (!comment) return

    const wasLiked = comment.isLiked
    const prevLikes = comment.likes || 0

    setCommentsList(prev => prev.map(c => 
      c.$id === commentId 
        ? { ...c, isLiked: !wasLiked, likes: wasLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1 }
        : c
    ))

    try {
      if (wasLiked) {
        await appwriteService.unlikeComment(commentId)
      } else {
        await appwriteService.likeComment(commentId)
      }
    } catch (error) {
      console.error('Failed to like comment:', error)
      setCommentsList(prev => prev.map(c => 
        c.$id === commentId 
          ? { ...c, isLiked: wasLiked, likes: prevLikes }
          : c
      ))
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return
    try {
      await appwriteService.createComment(post.id, commentText.trim())
      setCommentText('')
      await loadComments()
    } catch (error) {
      console.error('Failed to post comment:', error)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = async () => {
      setIsPlaying(true)
      setShowControls(false)
      if (!hasCountedView.current) {
        hasCountedView.current = true
        try {
          await appwriteService.incrementPostField(post.id, 'views', 1)
        } catch (error) {
          console.error('Failed to track view:', error)
        }
      }
    }
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setHasEnded(true)
      setIsPlaying(false)
      hasCountedView.current = false
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    // Setup media session for device controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: post.title || 'Video',
        artist: post.displayName || 'User',
        artwork: post.thumbnailUrl ? [{ src: post.thumbnailUrl }] : []
      })

      navigator.mediaSession.setActionHandler('play', () => video.play())
      navigator.mediaSession.setActionHandler('pause', () => video.pause())
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        video.currentTime = Math.max(0, video.currentTime - 10)
      })
      navigator.mediaSession.setActionHandler('seekforward', () => {
        video.currentTime = Math.min(video.duration, video.currentTime + 10)
      })
    }

    // Auto-play when component mounts
    video.play().catch(() => {
      // Handle autoplay failure silently
    })

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
      }
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (hasEnded) {
      video.currentTime = 0
      setHasEnded(false)
    }
    
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    video.currentTime = percent * duration
  }

  const handleVideoClick = () => {
    if (isPlaying) {
      setShowControls(!showControls)
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      if (!showControls) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 2000)
      }
    } else {
      togglePlay()
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleLike = async () => {
    const wasLiked = liked
    const prevLikes = likes
    setLiked(!wasLiked)
    setLikes(wasLiked ? Math.max(0, likes - 1) : likes + 1)

    try {
      if (wasLiked) {
        await appwriteService.unlikePost(post.id)
      } else {
        await appwriteService.likePost(post.id)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      setLiked(wasLiked)
      setLikes(prevLikes)
    }
  }

  const handleSave = async () => {
    const wasSaved = saved
    setSaved(!wasSaved)

    try {
      await appwriteService.savePost(post.id)
    } catch (error) {
      console.error('Failed to toggle save:', error)
      setSaved(wasSaved)
    }
  }

  const handleRepost = async () => {
    const wasReposted = reposted
    const prevReposts = reposts
    setReposted(!wasReposted)
    setReposts(wasReposted ? Math.max(0, reposts - 1) : reposts + 1)

    try {
      await appwriteService.repostPost(post.id)
    } catch (error) {
      console.error('Failed to toggle repost:', error)
      setReposted(wasReposted)
      setReposts(prevReposts)
    }
  }

  const handleFollow = async () => {
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)

    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) return
      
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

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const shareData: any = {
          title: post.title || 'Check out this video',
          text: post.content || '',
          url: window.location.href
        }
        
        if (post.thumbnailUrl && navigator.canShare) {
          try {
            const response = await fetch(post.thumbnailUrl.startsWith('/media/') ? `/api/image-proxy?path=${post.thumbnailUrl.substring(1)}` : post.thumbnailUrl)
            const blob = await response.blob()
            const file = new File([blob], 'thumbnail.jpg', { type: blob.type })
            shareData.files = [file]
            if (navigator.canShare(shareData)) {
              await navigator.share(shareData)
              return
            }
          } catch {}
        }
        
        await navigator.share(shareData)
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

  if (selectedCommentForReplies) {
    const loadReplies = async () => {
      setLoadingReplies(true)
      try {
        const result = await appwriteService.fetchComments(post.id)
        const user = await appwriteService.getCurrentUser()
        const replies = await Promise.all(
          result.documents.filter((doc: any) => doc.parentCommentId === selectedCommentForReplies.$id).map(async (doc: any) => {
            let isLiked = false
            if (user) {
              isLiked = await appwriteService.isCommentLikedBy(user.$id, doc.$id)
            }
            return { ...doc, isLiked }
          })
        )
        setRepliesList(replies)
      } catch (error) {
        console.error('Failed to load replies:', error)
      } finally {
        setLoadingReplies(false)
      }
    }
    
    if (repliesList.length === 0 && !loadingReplies) {
      loadReplies()
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header - Outside video */}
      <div className="bg-background/95 backdrop-blur-md p-4 sm:p-5 z-20 flex items-center justify-between border-b border-border/50 shadow-sm transition-all">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {post.userAvatar ? (
            <img src={post.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${post.userAvatar.substring(1)}` : post.userAvatar} alt={post.displayName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-border transition-transform hover:scale-105" />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg shadow-md">
              {(post.displayName || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground font-semibold text-lg sm:text-xl truncate">{post.displayName || 'User'}</h3>
            <span className="text-muted-foreground text-sm sm:text-base">{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-foreground hover:bg-muted rounded-full transition-all hover:scale-105 active:scale-95"
          aria-label="More options"
        >
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Video Player Container */}
      <div className="w-full aspect-video bg-black relative overflow-hidden">
        <video
          ref={videoRef}
          src={post.mediaUrls && post.mediaUrls[0]?.startsWith('/media/') ? `/api/image-proxy?path=${post.mediaUrls[0].substring(1)}` : post.mediaUrls && post.mediaUrls[0]}
          poster={post.thumbnailUrl?.startsWith('/media/') ? `/api/image-proxy?path=${post.thumbnailUrl.substring(1)}` : post.thumbnailUrl}
          className="w-full h-full object-contain transition-opacity duration-300"
          onClick={handleVideoClick}
          muted={isMuted}
          playsInline
          preload="metadata"
          autoPlay
        />

        {/* Speaker Icon - Top Right */}
        {showControls && (
          <button
            onClick={toggleMute}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all hover:scale-110 active:scale-95 z-10 animate-in fade-in slide-in-from-top-2 duration-200"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}

        {/* Duration - Bottom Right */}
        {showControls && (
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-2.5 py-1.5 bg-black/70 backdrop-blur-md rounded-lg text-white text-xs font-medium z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        {/* Center Play/Controls - Show when paused OR when showControls is true */}
        {(!isPlaying || showControls) && !selectedCommentForReplies && !showComments && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRef.current
                  if (video) video.currentTime = Math.max(0, video.currentTime - 10)
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all transform hover:scale-110 active:scale-95 shadow-2xl relative"
                aria-label="Rewind 10 seconds"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="absolute text-[10px] font-bold">10</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all transform hover:scale-110 active:scale-95 shadow-2xl"
                aria-label={isPlaying ? "Pause video" : hasEnded ? "Rewatch video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause size={36} fill="white" />
                ) : hasEnded ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                ) : (
                  <Play size={36} fill="white" className="ml-1" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRef.current
                  if (video) video.currentTime = Math.min(video.duration, video.currentTime + 10)
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all transform hover:scale-110 active:scale-95 shadow-2xl relative"
                aria-label="Forward 10 seconds"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span className="absolute text-[10px] font-bold">10</span>
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar - At bottom of video */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer group hover:h-2 transition-all z-10"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100 relative"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>
      </div>

      {/* Controls Below Video */}
      <div className="bg-background px-4 sm:px-5 pb-2 pt-3">
        {/* Title with Username and View Count */}
        {post.title && (
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-foreground font-bold text-xl sm:text-2xl truncate flex-1">
                {post.title.length > 39 ? post.title.substring(0, 39) : post.title}
              </p>
              {post.title.length > 39 && (
                <button onClick={() => setShowDescription(true)} className="text-primary text-sm whitespace-nowrap flex-shrink-0 hover:underline transition-all">...more</button>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm sm:text-base mt-1">
              {post.username && (
                <p className="text-muted-foreground/70">@{post.username}</p>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground/70">
                <Eye size={16} />
                {views || 0}
              </span>
              <span className="text-muted-foreground/70">{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-14 sm:top-16 right-3 sm:right-4 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-x-auto whitespace-nowrap max-w-[calc(100vw-2rem)]">
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

      {/* Description Modal */}
      {showDescription && !showComments && (
        <div className="fixed inset-x-0 bottom-0 bg-background z-[60] flex flex-col" style={{ top: 'calc(100vw * 9 / 16 + 60px)' }}>
          <div className="w-full py-3 flex justify-center border-b border-border cursor-pointer rounded-t-3xl" onClick={() => setShowDescription(false)}>
            <div className="w-12 h-1 bg-border rounded-full" />
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {post.title && <h3 className="text-foreground font-bold text-2xl mb-4 leading-tight">{post.title}</h3>}
            {post.content && <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap">{parseHashtags(post.content)}</p>}
          </div>
        </div>
      )}

      {/* Replies Overlay */}
      {selectedCommentForReplies && (
        <div className="fixed inset-x-0 bottom-0 bg-background z-[60] flex flex-col animate-in slide-in-from-bottom duration-300" style={{ top: 'calc(100vw * 9 / 16 + 60px)' }}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={() => { 
                setSelectedCommentForReplies(null)
                setRepliesList([])
              }}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">Replies</h1>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="border-b border-border pb-5 mb-5">
              <div className="flex gap-3">
                <img src={selectedCommentForReplies.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${selectedCommentForReplies.userAvatar.substring(1)}` : selectedCommentForReplies.userAvatar || ''} alt={selectedCommentForReplies.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-base">{selectedCommentForReplies.username}</span>
                      <span className="text-sm text-muted-foreground">{formatTimeAgo(new Date(selectedCommentForReplies.createdAt || selectedCommentForReplies.$createdAt))}</span>
                    </div>
                    <p className="text-base leading-relaxed">{selectedCommentForReplies.content}</p>
                  </div>
                </div>
              </div>
            </div>
            {loadingReplies ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : repliesList.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-4">No replies yet</p>
            ) : (
              <div className="space-y-5">
                {repliesList.map((reply: any) => (
                  <div key={reply.$id} className="flex gap-3">
                    <img src={reply.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${reply.userAvatar.substring(1)}` : reply.userAvatar || ''} alt={reply.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1">
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-base">{reply.username}</span>
                          <span className="text-sm text-muted-foreground">{formatTimeAgo(new Date(reply.createdAt || reply.$createdAt))}</span>
                        </div>
                        <p className="text-base leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments Overlay */}
      {showComments && !selectedCommentForReplies && (
        <div className="fixed inset-x-0 bottom-0 bg-background z-[60] flex flex-col animate-in slide-in-from-bottom duration-300 rounded-t-3xl" style={{ top: 'calc(100vw * 9 / 16 + 60px)' }}>
          <div className="w-full py-3 flex justify-center border-b border-border cursor-pointer rounded-t-3xl" onClick={() => setShowComments(false)}>
            <div className="w-12 h-1 bg-border rounded-full" />
          </div>
          {commentInputFocused && (
            <div className="p-3 bg-background border-b border-border">
              <div className="flex items-center gap-2 sm:gap-3">
                {post.userAvatar ? (
                  <img src={post.userAvatar} alt={post.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                    {(post.displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                  className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  autoFocus
                />
                <button 
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pb-20">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : commentsList.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {commentsList.map((comment) => (
                  <div key={comment.$id}>
                    <div className="flex gap-3">
                    <img 
                      src={comment.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${comment.userAvatar.substring(1)}` : comment.userAvatar || ''} 
                      alt={comment.username} 
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = `/profile/${comment.userId}`
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div 
                        className="bg-muted rounded-2xl px-3 py-2 cursor-pointer"
                        onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
                        onTouchEnd={(e) => {
                          const swipeEndX = e.changedTouches[0].clientX
                          if (swipeStartX - swipeEndX > 50) {
                            setReplyTo(comment.$id)
                            setCommentText(`${comment.username} `)
                            setCommentInputFocused(true)
                          }
                        }}
                        onClick={() => handleLikeComment(comment.$id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="font-medium text-sm cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/profile/${comment.userId}`
                            }}
                          >{comment.username}</span>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(new Date(comment.createdAt || comment.$createdAt))}</span>
                        </div>
                        <p className="text-sm">{comment.content.split(' ').map((word: string, i: number) => 
                          word.startsWith('@') ? (
                            <span key={i} className="text-blue-500">{word} </span>
                          ) : (
                            word + ' '
                          )
                        )}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLikeComment(comment.$id)
                          }}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Heart size={18} />
                          <span>Like</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setReplyTo(comment.$id)
                            setCommentText(`${comment.username} `)
                            setCommentInputFocused(true)
                          }}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                          </svg>
                          <span>Reply</span>
                        </button>
                        <div className="flex items-center gap-4 ml-auto">
                          {comment.isLiked && (
                            <span className="flex items-center gap-1.5 text-sm text-red-500">
                              <Heart size={18} className="fill-red-500" />
                              <span>{comment.likes}</span>
                            </span>
                          )}
                          {(comment.replies || 0) > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCommentForReplies(comment)
                              }}
                              className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                              </svg>
                              <span>View {comment.replies} {comment.replies === 1 ? 'reply' : 'replies'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!commentInputFocused && (
            <div className="absolute bottom-0 inset-x-0 p-3 bg-background border-t border-border">
              <div className="flex items-center gap-2 sm:gap-3">
                {post.userAvatar ? (
                  <img src={post.userAvatar} alt={post.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                    {(post.displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                  className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  onFocus={() => setCommentInputFocused(true)}
                />
                <button 
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50">
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Section - Reactions & Comments */}
      <div className="flex-1 bg-background flex flex-col min-h-0 relative">
        {/* Reactions Bar */}
        <div className="flex items-center justify-between gap-2 py-3 sm:py-4 px-4 sm:px-5 bg-primary/10 flex-wrap rounded-lg">
          <button onClick={handleSave} className={`flex items-center justify-center transition-all p-2.5 rounded-lg hover:scale-110 active:scale-95 ${saved ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400 hover:text-yellow-500'}`} aria-label="Save">
            <Bookmark size={24} className={saved ? 'fill-yellow-500' : ''} />
          </button>
          <button onClick={handleShare} className="flex items-center justify-center hover:text-blue-500 transition-all p-2.5 rounded-lg hover:scale-110 active:scale-95 text-gray-500 dark:text-gray-400" aria-label="Share">
            <Share size={24} />
          </button>
          <button onClick={handleRepost} className={`flex items-center gap-2 transition-all p-2.5 rounded-lg hover:scale-110 active:scale-95 ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400 hover:text-green-500'}`} aria-label={`Reposts - ${reposts || 0} reposts`}>
            <Repeat2 size={24} />
            <span className="text-sm sm:text-base font-medium">{reposts || 0}</span>
          </button>
          <button onClick={() => setShowComments(true)} className="flex items-center gap-2 hover:text-blue-500 transition-all p-2.5 rounded-lg hover:scale-110 active:scale-95 text-gray-500 dark:text-gray-400" aria-label={`Comments - ${comments || 0} comments`} onClickCapture={() => {
            const video = videoRef.current
            if (video && !video.paused) {
              video.pause()
            }
          }}>
            <MessageCircle size={24} />
            <span className="text-sm sm:text-base font-medium">{comments || 0}</span>
          </button>
          {currentUserId && currentUserId !== post.userId && (
            <button
              onClick={handleFollow}
              className={`px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-md ${
                isFollowing 
                  ? 'bg-muted text-foreground hover:bg-muted/80' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-all p-2.5 rounded-lg hover:scale-110 active:scale-95 ${liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}
            aria-label={`Like - ${likes || 0} likes`}
          >
            <Heart size={24} className={liked ? 'fill-red-500' : ''} />
            <span className="text-sm sm:text-base font-medium">{likes || 0}</span>
          </button>
        </div>
        {/* Comments Section - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-background">
          {loadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : commentsList.length === 0 ? (
            <p className="text-muted-foreground text-base text-center py-8">No comments yet</p>
          ) : (
            <div className="space-y-5">
              {commentsList.map((comment) => (
                <div 
                  key={comment.$id}
                >
                  <div className="flex gap-3">
                  <img 
                    src={comment.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${comment.userAvatar.substring(1)}` : comment.userAvatar || ''} 
                    alt={comment.username} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = `/profile/${comment.userId}`
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div 
                      className="bg-muted rounded-2xl px-4 py-3 cursor-pointer"
                      onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
                      onTouchEnd={(e) => {
                        const swipeEndX = e.changedTouches[0].clientX
                        if (swipeStartX - swipeEndX > 50) {
                          setReplyTo(comment.$id)
                          setCommentText(`${comment.username} `)
                        }
                      }}
                      onClick={() => handleLikeComment(comment.$id)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span 
                          className="font-semibold text-base cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/profile/${comment.userId}`
                          }}
                        >{comment.username}</span>
                        <span className="text-sm text-muted-foreground">{formatTimeAgo(new Date(comment.createdAt || comment.$createdAt))}</span>
                      </div>
                      <p className="text-base leading-relaxed">{comment.content.split(' ').map((word: string, i: number) => 
                        word.startsWith('@') ? (
                          <span key={i} className="text-blue-500">{word} </span>
                        ) : (
                          word + ' '
                        )
                      )}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-3 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLikeComment(comment.$id)
                        }}
                        className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
                      >
                        <Heart size={20} />
                        <span>Like</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplyTo(comment.$id)
                          setCommentText(`${comment.username} `)
                        }}
                        className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                        </svg>
                        <span>Reply</span>
                      </button>
                      <div className="flex items-center gap-5 ml-auto">
                        {comment.isLiked && (
                          <span className="flex items-center gap-2 text-base text-red-500">
                            <Heart size={20} className="fill-red-500" />
                            <span>{comment.likes}</span>
                          </span>
                        )}
                        {(comment.replies || 0) > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCommentForReplies(comment)
                            }}
                            className="flex items-center gap-2 text-base text-blue-500 hover:text-blue-600 font-medium"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                            </svg>
                            <span>View {comment.replies} {comment.replies === 1 ? 'reply' : 'replies'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input - Fixed at Bottom */}
        <div className="p-3 bg-muted/30 border-t border-border/30">
          <div className="flex items-center gap-2 sm:gap-3">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                {(post.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onFocus={() => {
                setShowComments(true)
                setCommentInputFocused(true)
              }}
            />
            <button 
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md">
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vertical video detail screen (for Reels)
export function ReelsDetailScreen({ post, onClose, isGuest = false, onGuestAction }: VideoDetailScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)
  const [reposts, setReposts] = useState(post.reposts || 0)
  const [reposted, setReposted] = useState(post.isReposted || false)
  const [comments, setComments] = useState(post.comments || 0)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [views, setViews] = useState(post.views || 0)
  const [showComments, setShowComments] = useState(false)
  const [showFullComments, setShowFullComments] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const handlePopState = () => {
      if (showFullComments) setShowFullComments(false)
      else if (showComments) setShowComments(false)
    }
    
    if (showFullComments || showComments) {
      window.history.pushState(null, '', window.location.href)
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [showFullComments, showComments])

  // Subscribe to realtime updates for this post
  useEffect(() => {
    if (!post.id) return

    const unsubscribe = appwriteService.subscribeToDocument('posts', post.id, (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.update')) {
        const updatedPost = payload.payload
        setLikes(updatedPost.likes || 0)
        setReposts(updatedPost.reposts || 0)
        setComments(updatedPost.comments || 0)
        setViews(updatedPost.views || 0)
      }
    })

    return unsubscribe
  }, [post.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      // Auto-advance to next reel (for now, just pause)
      setIsPlaying(false)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    // Auto-play when component mounts
    video.play().catch(() => {
      // Handle autoplay failure silently
    })

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleVideoClick = () => {
    togglePlay()
    setShowControls(true)

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2000)
  }

  const handleLike = async () => {
    try {
      if (liked) {
        await appwriteService.unlikePost(post.id)
        setLiked(false)
        setLikes(Math.max(0, likes - 1))
      } else {
        await appwriteService.likePost(post.id)
        setLiked(true)
        setLikes(likes + 1)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleSave = async () => {
    try {
      await appwriteService.savePost(post.id)
      setSaved(!saved)
    } catch (error) {
      console.error('Failed to toggle save:', error)
    }
  }

  const handleRepost = async () => {
    try {
      await appwriteService.repostPost(post.id)
      setReposted(!reposted)
      setReposts(reposted ? Math.max(0, reposts - 1) : reposts + 1)
    } catch (error) {
      console.error('Failed to toggle repost:', error)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'Check out this reel',
          text: post.content || '',
          url: window.location.href
        })
      }
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  if (showFullComments) {
    return <CommentScreen post={post} onClose={() => setShowFullComments(false)} />
  }

  return (
    <>
      {showComments && <CommentModal post={post} onClose={() => setShowComments(false)} />}
      <div className="fixed inset-0 bg-black z-50">
      {/* Full screen vertical video */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          src={post.mediaUrls && post.mediaUrls[0]?.startsWith('/media/') ? `/api/image-proxy?path=${post.mediaUrls[0].substring(1)}` : post.mediaUrls && post.mediaUrls[0]}
          className="w-full h-full object-cover"
          onClick={handleVideoClick}
          muted={isMuted}
          playsInline
          loop
          preload="auto"
        />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              aria-label="Close reel"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={toggleMute}
              className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              aria-label={isMuted ? "Unmute reel" : "Mute reel"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all transform hover:scale-110"
              aria-label="Play reel"
            >
              <Play size={32} fill="white" />
            </button>
          </div>
        )}

        {/* Right Side Reactions (Vertical) */}
        <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
          <button
            onClick={handleLike}
            className={`flex flex-col items-center gap-1 transition-all ${liked ? 'text-red-500' : 'text-white'}`}
            aria-label={liked ? "Unlike reel" : "Like reel"}
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <Heart size={28} className={liked ? 'fill-red-500' : ''} />
            </div>
            <span className="text-xs font-bold">{likes || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="View comments"
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <MessageCircle size={28} />
            </div>
            <span className="text-xs font-bold">{comments || 0}</span>
          </button>

          <button
            onClick={handleRepost}
            className={`flex flex-col items-center gap-1 transition-all ${reposted ? 'text-green-500' : 'text-white'}`}
            aria-label="Repost reel"
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <Repeat2 size={28} className={reposted ? 'fill-green-500' : ''} />
            </div>
            <span className="text-xs font-bold">{reposts || 0}</span>
          </button>

          <button
            className="flex flex-col items-center gap-1 text-white"
            aria-label="View count"
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <Eye size={28} />
            </div>
            <span className="text-xs font-bold">{views || 0}</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex flex-col items-center gap-1 transition-all ${saved ? 'text-yellow-500' : 'text-white'}`}
            aria-label="Save reel"
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <Bookmark size={28} className={saved ? 'fill-yellow-500' : ''} />
            </div>
            <span className="text-xs font-bold">Save</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="Share reel"
          >
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
              <Share size={28} />
            </div>
            <span className="text-xs font-bold">Share</span>
          </button>
        </div>

        {/* Bottom Content Overlay */}
        <div className="absolute bottom-0 left-0 right-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 z-20">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-3">
              {post.userAvatar ? (
                <img src={post.userAvatar.startsWith('/media/') ? `/api/image-proxy?path=${post.userAvatar.substring(1)}` : post.userAvatar} alt={post.displayName} className="w-14 h-14 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-white font-semibold text-lg">
                  {(post.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-white font-bold text-lg block">{post.displayName || 'User'}</span>
                <span className="text-gray-300 text-sm">{formatTimeAgo(post.createdAt)}</span>
              </div>
            </div>
            {post.content && (
              <p className="text-white text-base leading-relaxed line-clamp-3">{post.content}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="w-full h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
