'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Play } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
  currentUserId?: string
  feedType?: 'home' | 'reels' | 'watch' | 'following' | 'news'
  onVideoClick?: (post: Post) => void
}

export const PostCard = ({ post, currentUserId, feedType = 'home', onVideoClick }: PostCardProps) => {
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [reposted, setReposted] = useState(post.isReposted || false)
  const [reposts, setReposts] = useState(post.reposts || 0)

  // Subscribe to realtime updates for this post
  useEffect(() => {
    if (!post.id) return

    const unsubscribe = appwriteService.subscribeToDocument('posts', post.id, (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.update')) {
        const updatedPost = payload.payload
        setLikes(updatedPost.likes || 0)
        setReposts(updatedPost.reposts || 0)
        // Update other fields as needed
      }
    })

    return unsubscribe
  }, [post.id])

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
    <div className="bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-color))]">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {post.userAvatar ? (
            <img src={post.userAvatar} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center text-[rgb(var(--text-primary))] font-semibold">
              {(post.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <span className="text-[rgb(var(--text-primary))] font-bold text-base">{post.username || 'User'}</span>
            <span className="text-[rgb(var(--text-secondary))] text-sm ml-2">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] p-1" aria-label="More options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        {post.textBgColor ? (
          <div
            className={`text-white text-center leading-relaxed p-4 rounded-xl mb-3 max-w-sm ${
              (post.content?.length || 0) < 50
                ? 'text-2xl font-extrabold'
                : (post.content?.length || 0) < 100
                ? 'text-xl font-bold'
                : 'text-lg font-semibold'
            }`}
            style={{ backgroundColor: `#${post.textBgColor.toString(16).padStart(6, '0')}` }}
          >
            {post.content}
          </div>
        ) : post.content ? (
          <p className="text-[rgb(var(--text-primary))] text-base leading-relaxed mb-3">{post.content}</p>
        ) : null}

        {(post.imageUrl || (post.mediaUrls && post.mediaUrls.length > 0 && !post.videoUrl && (!post.kind || post.kind === 'standard'))) && (
          <img
            src={post.imageUrl || (post.mediaUrls && post.mediaUrls[0])}
            alt="Post"
            className="w-full rounded-xl mb-3"
          />
        )}

        {(post.videoUrl || (post.kind === 'video' || post.kind === 'reel') || (post.mediaUrls && post.mediaUrls.length > 0 && post.thumbnailUrl)) && (
          feedType === 'reels' ? (
            <video
              src={post.videoUrl || (post.mediaUrls && post.mediaUrls[0])}
              poster={post.thumbnailUrl}
              className="w-full h-96 rounded-xl mb-3 object-cover"
              controls
              preload="metadata"
              autoPlay={false}
              muted
            />
          ) : (
            <div
              className="relative w-full rounded-xl mb-3 bg-black cursor-pointer overflow-hidden"
              onClick={() => onVideoClick?.(post)}
            >
              <img
                src={post.thumbnailUrl || (post.mediaUrls && post.mediaUrls[0])}
                alt="Video thumbnail"
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
          )
        )}

        {post.kind === 'news' && post.title && (
          <div className="border-l-4 border-blue-500 pl-4 mb-3">
            <h3 className="font-bold text-lg text-[rgb(var(--text-primary))]">{post.title}</h3>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="px-3 pb-3">
        {feedType === 'reels' ? (
          // Vertical reactions for reels
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLike} className={`flex flex-col items-center gap-1 hover:text-red-500 transition-colors p-2 text-[rgb(var(--text-secondary))] ${liked ? 'text-red-500' : ''}`} aria-label="Like">
              <Heart size={24} className={liked ? 'fill-red-500' : ''} />
              <span className="text-xs font-medium">{likes || 0}</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-blue-500 transition-colors p-2 text-[rgb(var(--text-secondary))]" aria-label="Comment">
              <MessageCircle size={24} />
              <span className="text-xs font-medium">{post.comments || 0}</span>
            </button>
            <button onClick={handleRepost} className={`flex flex-col items-center gap-1 hover:text-green-500 transition-colors p-2 ${reposted ? 'text-green-500' : 'text-[rgb(var(--text-secondary))]'}`} aria-label="Repost">
              <Repeat2 size={24} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-xs font-medium">{reposts || 0}</span>
            </button>
            <button onClick={handleSave} className={`flex flex-col items-center gap-1 hover:text-yellow-500 transition-colors p-2 ${saved ? 'text-yellow-500' : 'text-[rgb(var(--text-secondary))]'}`} aria-label="Bookmark">
              <Bookmark size={24} className={saved ? 'fill-yellow-500' : ''} />
              <span className="text-xs font-medium">Save</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-blue-500 transition-colors p-2 text-[rgb(var(--text-secondary))]" aria-label="Share">
              <Share size={24} />
              <span className="text-xs font-medium">Share</span>
            </button>
          </div>
        ) : (
          // Horizontal reactions for other feeds
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <button onClick={handleSave} className={`flex items-center gap-2 hover:text-yellow-500 transition-colors p-2 text-[rgb(var(--text-secondary))] flex-shrink-0 ${saved ? 'text-yellow-500' : ''}`} aria-label="Bookmark">
              <Bookmark size={20} className={saved ? 'fill-yellow-500' : ''} />
              <span className="text-sm font-medium hidden sm:inline">Save</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-[rgb(var(--text-secondary))] flex-shrink-0" aria-label="Share">
              <Share size={20} />
              <span className="text-sm font-medium hidden sm:inline">Share</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 flex-shrink-0 ${reposted ? 'text-green-500' : 'text-[rgb(var(--text-secondary))]'}`} aria-label="Repost">
              <Repeat2 size={20} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-medium hidden sm:inline">{reposts || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors p-2 text-[rgb(var(--text-secondary))] flex-shrink-0" aria-label="Impressions">
              <BarChart2 size={20} />
              <span className="text-sm font-medium hidden sm:inline">{post.impressions || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-[rgb(var(--text-secondary))] flex-shrink-0" aria-label="Comment">
              <MessageCircle size={20} />
              <span className="text-sm font-medium hidden sm:inline">{post.comments || 0}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 flex-shrink-0 ${liked ? 'text-red-500' : 'text-[rgb(var(--text-secondary))]'}`} aria-label="Like">
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium hidden sm:inline">{likes || 0}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}