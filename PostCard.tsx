'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Flag, Edit3, Trash2, X } from 'lucide-react'
import { Post } from './types'
import { cn } from './utils'
import { VideoPlayer } from './VideoPlayer'
import { useRealtimePost } from './realtime'
import appwriteService from './appwriteService'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
  isDetail?: boolean
  onOpenComments?: () => void
}

export function PostCard({ post, isGuest = false, onGuestAction, isDetail = false, onOpenComments }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [isReposted, setIsReposted] = useState(post.isReposted)
  const [isSaved, setIsSaved] = useState(post.isSaved)
  const [likes, setLikes] = useState(post.likes)
  const [comments, setComments] = useState(post.comments)
  const [reposts, setReposts] = useState(post.reposts)
  const [impressions, setImpressions] = useState(post.impressions)
  const [shares, setShares] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

  // Real-time updates
  const realtimeUpdates = useRealtimePost(post.id)

  // Apply real-time updates
  useEffect(() => {
    setLikes(prev => prev + realtimeUpdates.likes)
    setComments(prev => prev + realtimeUpdates.comments)
    setReposts(prev => prev + realtimeUpdates.reposts)
    setShares(prev => prev + realtimeUpdates.shares)
    setImpressions(prev => prev + realtimeUpdates.impressions)
  }, [realtimeUpdates])

  const handleLike = async () => {
    if (isGuest) {
      onGuestAction?.()
      return
    }
    
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikes(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))
    
    try {
      if (newLiked) {
        await appwriteService.likePost(post.id)
      } else {
        await appwriteService.unlikePost(post.id)
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked)
      setLikes(prev => newLiked ? Math.max(0, prev - 1) : prev + 1)
    }
  }

  const handleRepost = async () => {
    if (isGuest) {
      onGuestAction?.()
      return
    }
    
    const newReposted = !isReposted
    setIsReposted(newReposted)
    setReposts(prev => newReposted ? prev + 1 : Math.max(0, prev - 1))
    
    try {
      await appwriteService.repostPost(post.id)
    } catch (error) {
      setIsReposted(!newReposted)
      setReposts(prev => newReposted ? Math.max(0, prev - 1) : prev + 1)
    }
  }

  const handleSave = async () => {
    if (isGuest) {
      onGuestAction?.()
      return
    }
    
    const newSaved = !isSaved
    setIsSaved(newSaved)
    
    try {
      await appwriteService.savePost(post.id)
    } catch (error) {
      setIsSaved(!newSaved)
    }
  }

  const handleShare = () => {
    setShares(prev => prev + 1)
    
    if (navigator.share) {
      navigator.share({
        title: `Post by ${post.username}`,
        text: post.content,
        url: window.location.href
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${post.content} - ${window.location.href}`)
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 30) return `${days}d`
    
    const month = date.toLocaleDateString('en', { month: 'short' })
    const day = date.getDate()
    const year = date.getFullYear()
    const currentYear = new Date().getFullYear()
    
    return year === currentYear ? `${day} ${month}` : `${day} ${month} ${year}`
  }

  const isVideo = post.videoUrl || post.kind?.includes('video')
  const isReel = post.kind?.includes('reel')

  return (
    <article className="border-b border-border bg-background hover:bg-accent/20 transition-colors">
      <div className="p-4">
        {/* Repost indicator */}
        {post.sourceUsername && post.sourceUsername !== post.username && (
          <div className="mb-2 text-sm text-muted-foreground">
            <Repeat2 size={14} className="inline mr-1" />
            {post.sourceUsername} reposted
          </div>
        )}

        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-lg font-bold">{post.username[0].toUpperCase()}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg">{post.username}</h3>
                <time className="text-sm text-muted-foreground">{formatTime(post.timestamp)}</time>
              </div>
              
              <div className="flex items-center space-x-2">
                {isReel && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                    Reels
                  </span>
                )}
                {post.isBoosted && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                    Boosted
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded-full hover:bg-accent transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                      <button className="w-full px-4 py-2 text-left hover:bg-accent flex items-center space-x-2">
                        <Edit3 size={14} />
                        <span>Edit Post</span>
                      </button>
                      <button className="w-full px-4 py-2 text-left hover:bg-accent flex items-center space-x-2 text-red-600">
                        <Flag size={14} />
                        <span>Report</span>
                      </button>
                      <button className="w-full px-4 py-2 text-left hover:bg-accent flex items-center space-x-2 text-red-600">
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                      <button 
                        onClick={() => setShowMenu(false)}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center space-x-2"
                      >
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text Content */}
            {post.content && (
              <div className="mb-3">
                <p className="text-lg leading-relaxed">{post.content}</p>
              </div>
            )}

            {/* Media */}
            {(post.imageUrl || post.videoUrl) && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                {isVideo ? (
                  <VideoPlayer
                    src={post.videoUrl!}
                    poster={post.thumbnailUrl}
                    className="aspect-video"
                    autoPlay={false}
                    muted={true}
                  />
                ) : post.imageUrl ? (
                  <img 
                    src={post.imageUrl} 
                    alt="Post image" 
                    className="w-full max-h-96 object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Video Meta */}
            {isVideo && post.title && (
              <div className="mb-3">
                <h4 className="font-bold text-lg mb-1">{post.title}</h4>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-background rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center justify-between">
            {/* Like */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200",
                isLiked 
                  ? "text-red-500 bg-red-50 hover:bg-red-100" 
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
              <span className="text-sm font-medium">{likes}</span>
            </button>

            {/* Comment */}
            <button 
              onClick={onOpenComments || (() => {})}
              className="flex items-center space-x-2 px-3 py-2 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{comments}</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200",
                isReposted 
                  ? "text-green-500 bg-green-50 hover:bg-green-100" 
                  : "text-muted-foreground hover:text-green-500 hover:bg-green-50"
              )}
            >
              <Repeat2 size={20} />
              <span className="text-sm font-medium">{reposts}</span>
            </button>

            {/* Share */}
            <button 
              onClick={handleShare}
              className="flex items-center space-x-2 px-3 py-2 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <Share size={20} />
              <span className="text-sm font-medium">{shares}</span>
            </button>

            {/* Views/Impressions */}
            <div className="flex items-center space-x-2 px-3 py-2 text-muted-foreground">
              <BarChart2 size={20} />
              <span className="text-sm font-medium">{impressions}</span>
              <span className="text-xs">Views</span>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className={cn(
                "p-2 rounded-full transition-colors",
                isSaved 
                  ? "text-yellow-500 hover:text-yellow-600" 
                  : "text-muted-foreground hover:text-yellow-500"
              )}
            >
              <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}