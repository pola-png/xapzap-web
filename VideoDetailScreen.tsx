'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2 } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'

interface VideoDetailScreenProps {
  post: Post
  onClose: () => void
  isGuest?: boolean
  onGuestAction?: () => void
}

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

    // Auto-play when component mounts
    video.play().catch(() => {
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
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          aria-label="Close video"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Video Container */}
      <div className="w-full h-full flex items-center justify-center relative">
        <video
          ref={videoRef}
          src={post.videoUrl || (post.mediaUrls && post.mediaUrls[0])}
          className="w-full h-full object-contain"
          onClick={handleVideoClick}
          muted={isMuted}
          playsInline
        />

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all transform hover:scale-110"
                aria-label="Play video"
              >
                <Play size={32} fill="white" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div
                className="w-full h-1 bg-white/30 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-100 group-hover:bg-red-500"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <span className="text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info Panel */}
      <div className="absolute bottom-24 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:bottom-20">
        <div className="max-w-md mx-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
                {(post.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-white font-semibold text-base block truncate">{post.username || 'User'}</span>
              <span className="text-gray-300 text-sm">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Content */}
          {post.content && (
            <p className="text-white text-sm leading-relaxed mb-3 line-clamp-3">{post.content}</p>
          )}

          {/* Reactions */}
          <div className="flex items-center gap-4 overflow-x-auto">
            <button
              className="flex items-center gap-2 hover:text-yellow-500 transition-colors p-2 text-gray-300 flex-shrink-0"
              aria-label="Save video"
            >
              <Bookmark size={20} />
              <span className="text-sm font-medium hidden sm:inline">Save</span>
            </button>
            <button
              className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-300 flex-shrink-0"
              aria-label="Share video"
            >
              <Share size={20} />
              <span className="text-sm font-medium hidden sm:inline">Share</span>
            </button>
            <button
              className="flex items-center gap-2 hover:text-green-500 transition-colors p-2 text-gray-300 flex-shrink-0"
              aria-label="Repost video"
            >
              <Repeat2 size={20} />
              <span className="text-sm font-medium hidden sm:inline">{reposts || 0}</span>
            </button>
            <button
              className="flex items-center gap-2 hover:text-indigo-500 transition-colors p-2 text-gray-300 flex-shrink-0"
              aria-label="View impressions"
            >
              <BarChart2 size={20} />
              <span className="text-sm font-medium hidden sm:inline">{impressions || 0}</span>
            </button>
            <button
              className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-300 flex-shrink-0"
              aria-label="View comments"
            >
              <MessageCircle size={20} />
              <span className="text-sm font-medium hidden sm:inline">{comments || 0}</span>
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 flex-shrink-0 ${liked ? 'text-red-500' : 'text-gray-300'}`}
              aria-label={liked ? "Unlike video" : "Like video"}
            >
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium hidden sm:inline">{likes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
