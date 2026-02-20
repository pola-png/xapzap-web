'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Eye } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'
import { normalizeWasabiImage } from './lib/wasabi'

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
  const [comments, setComments] = useState(post.comments || 0)
  const [impressions, setImpressions] = useState(post.impressions || 0)
  const [views, setViews] = useState(post.views || 0)
  const [showDescription, setShowDescription] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => {
      setIsPlaying(true)
      setShowControls(false)
    }
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    // Track view when video starts playing
    const trackView = async () => {
      try {
        await appwriteService.incrementPostField(post.id, 'views', 1)
      } catch (error) {
        console.error('Failed to track view:', error)
      }
    }

    // Auto-play when component mounts
    video.play().then(() => {
      trackView()
    }).catch(() => {
      // Handle autoplay failure silently
    })

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
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

  const handleFollow = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) return
      
      if (isFollowing) {
        await appwriteService.unfollowUser(post.userId)
        setIsFollowing(false)
      } else {
        await appwriteService.followUser(post.userId)
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header - Outside video */}
      <div className="bg-black/90 backdrop-blur-sm p-4 z-20">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close video"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Video Player Container */}
      <div className="w-full aspect-video bg-black relative">
        <video
          ref={videoRef}
          src={post.mediaUrls && post.mediaUrls[0]?.startsWith('/media/') ? `/api/image-proxy?path=${post.mediaUrls[0].substring(1)}` : post.mediaUrls && post.mediaUrls[0]}
          poster={post.thumbnailUrl?.startsWith('/media/') ? `/api/image-proxy?path=${post.thumbnailUrl.substring(1)}` : post.thumbnailUrl}
          className="w-full h-full object-contain"
          onClick={handleVideoClick}
          muted={isMuted}
          playsInline
          preload="auto"
        />

        {/* Speaker Icon - Top Right */}
        {showControls && (
          <button
            onClick={toggleMute}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        )}

        {/* Duration - Bottom Right */}
        {showControls && (
          <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-medium z-10">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        {/* Center Play/Controls - Show when paused OR when showControls is true */}
        {(!isPlaying || showControls) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRef.current
                  if (video) video.currentTime = Math.max(0, video.currentTime - 10)
                }}
                className="w-16 h-16 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all transform hover:scale-110 shadow-2xl relative"
                aria-label="Rewind 10 seconds"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="absolute text-xs font-bold">10</span>
              </button>
              <button
                onClick={togglePlay}
                className="w-20 h-20 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all transform hover:scale-110 shadow-2xl"
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" className="ml-1" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRef.current
                  if (video) video.currentTime = Math.min(video.duration, video.currentTime + 10)
                }}
                className="w-16 h-16 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all transform hover:scale-110 shadow-2xl relative"
                aria-label="Forward 10 seconds"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <span className="absolute text-xs font-bold">10</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Below Video */}
      <div className="bg-black px-4 py-3">
        {/* Title and Description */}
        <div className="mb-3">
          {post.title && (
            <div className="flex items-baseline gap-1 mb-1">
              <p className="text-white font-bold text-xl truncate flex-1">
                {post.title.length > 23 ? post.title.substring(0, 23) : post.title}
              </p>
              {post.title.length > 23 && (
                <button onClick={() => setShowDescription(true)} className="text-white/90 text-xs whitespace-nowrap flex-shrink-0">...more</button>
              )}
            </div>
          )}
          {post.content && (
            <div className="flex items-baseline gap-1">
              <p className="text-white/70 text-xs truncate flex-1">
                {post.content.length > 30 ? post.content.substring(0, 30) : post.content}
              </p>
              {post.content.length > 30 && (
                <button onClick={() => setShowDescription(true)} className="text-white/90 text-xs whitespace-nowrap flex-shrink-0">...more</button>
              )}
            </div>
          )}
        </div>

        {/* Video Owner Info */}
        <div className="flex items-start gap-3 mb-3">
          {post.userAvatar ? (
            <img src={post.userAvatar} alt={post.displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {(post.displayName || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm">{post.displayName || 'User'}</h3>
              <span className="flex items-center gap-1 text-white/60 text-xs flex-shrink-0">
                <BarChart2 size={14} />
                {impressions || 0}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isFollowing && (
              <button
                onClick={handleFollow}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Follow
              </button>
            )}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full h-1 bg-white/20 rounded-full cursor-pointer group hover:h-1.5 transition-all"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-white rounded-full transition-all duration-100 relative"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="absolute top-[240px] right-4 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[150px]">
          <button className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2">
            <span>Report</span>
          </button>
        </div>
      )}

      {/* Description Modal */}
      {showDescription && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end" onClick={() => setShowDescription(false)}>
          <div className="bg-background w-full max-h-[60vh] rounded-t-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ bottom: 0 }}>
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            {post.title && <h3 className="text-foreground font-semibold text-lg mb-3">{post.title}</h3>}
            {post.content && <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>}
          </div>
        </div>
      )}

      {/* Bottom Section - Reactions & Comments */}
      <div className="flex-1 bg-background flex flex-col">
        {/* Reactions Bar */}
        <div className="flex items-center justify-between gap-1 py-3 px-2 border-b border-border">
          <button className="flex items-center justify-center hover:text-yellow-500 transition-colors p-1.5 rounded-lg text-foreground" aria-label="Save">
            <Bookmark size={18} />
          </button>
          <button className="flex items-center justify-center hover:text-blue-500 transition-colors p-1.5 rounded-lg text-foreground" aria-label="Share">
            <Share size={18} />
          </button>
          <button className="flex items-center gap-1 hover:text-amber-500 transition-colors p-1.5 rounded-lg text-foreground" aria-label={`Reposts - ${reposts || 0} reposts`}>
            <Repeat2 size={18} />
            <span className="text-xs font-medium">{reposts || 0}</span>
          </button>
          <button className="flex items-center gap-1 hover:text-green-500 transition-colors p-1.5 rounded-lg text-foreground" aria-label={`Views - ${views || 0} views`}>
            <Eye size={18} />
            <span className="text-xs font-medium">{views || 0}</span>
          </button>
          <button className="flex items-center gap-1 hover:text-blue-500 transition-colors p-1.5 rounded-lg text-foreground" aria-label={`Comments - ${comments || 0} comments`}>
            <MessageCircle size={18} />
            <span className="text-xs font-medium">{comments || 0}</span>
          </button>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 hover:text-red-500 transition-colors p-1.5 rounded-lg ${liked ? 'text-red-500' : 'text-foreground'}`}
            aria-label={`Like - ${likes || 0} likes`}
          >
            <Heart size={18} className={liked ? 'fill-red-500' : ''} />
            <span className="text-xs font-medium">{likes || 0}</span>
          </button>
        </div>

        {/* Comments Section - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">No comments yet</p>
        </div>

        {/* Comment Input - Fixed at Bottom */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-center gap-3">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.displayName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                {(post.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
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
  const [isMuted, setIsMuted] = useState(true) // Reels are typically muted by default
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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

  return (
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
                <img src={post.userAvatar} alt={post.username} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-white font-semibold">
                  {(post.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-white font-bold text-base block">{post.username || 'User'}</span>
                <span className="text-gray-300 text-xs">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {post.content && (
              <p className="text-white text-sm leading-relaxed line-clamp-3">{post.content}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-16 left-4 right-4 z-20">
          <div className="w-full h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
