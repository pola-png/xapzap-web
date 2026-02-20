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
    const handlePlay = () => setIsPlaying(true)
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
    togglePlay()
    setShowControls(true)

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close video"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Video Player Container */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
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

        {/* YouTube-Style Controls Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-all transform hover:scale-110 shadow-2xl"
                aria-label="Play video"
              >
                <Play size={40} fill="white" className="ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div
              className="w-full h-1 bg-white/20 rounded-full cursor-pointer group hover:h-1.5 transition-all"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-100 relative"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>

                <span className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Reactions & Comments */}
      <div className="bg-background border-t border-border">
        {/* Reactions Bar */}
        <div className="flex items-center justify-around py-3 px-4 border-b border-border">
          <button
            onClick={handleLike}
            className={`flex flex-col items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'text-foreground hover:text-red-500'}`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart size={24} className={liked ? 'fill-red-500' : ''} />
            <span className="text-xs font-medium">{likes || 0}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-foreground hover:text-blue-500 transition-colors" aria-label="Comments">
            <MessageCircle size={24} />
            <span className="text-xs font-medium">{comments || 0}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-foreground hover:text-green-500 transition-colors" aria-label="Repost">
            <Repeat2 size={24} />
            <span className="text-xs font-medium">{reposts || 0}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-foreground hover:text-purple-500 transition-colors" aria-label="Views">
            <Eye size={24} />
            <span className="text-xs font-medium">{views || 0}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-foreground hover:text-yellow-500 transition-colors" aria-label="Save">
            <Bookmark size={24} />
          </button>
          <button className="flex flex-col items-center gap-1 text-foreground hover:text-blue-500 transition-colors" aria-label="Share">
            <Share size={24} />
          </button>
        </div>

        {/* Comment Input */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                {(post.username || 'U')[0].toUpperCase()}
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
