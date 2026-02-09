'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Play } from 'lucide-react'
import { Post } from './types'

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

  const handleLike = () => {
    setLiked(!liked)
    setLikes(liked ? likes - 1 : likes + 1)
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
            className="text-white text-sm leading-relaxed p-3 rounded-lg mb-3 max-w-xs"
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
                className="w-full h-48 object-cover"
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 ${liked ? 'text-red-500' : 'text-[rgb(var(--text-secondary))]'}`} aria-label="Like">
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium">{likes || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-500/10 text-[rgb(var(--text-secondary))]" aria-label="Comment">
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{post.comments || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-green-500 transition-colors p-2 rounded-lg hover:bg-green-500/10 text-[rgb(var(--text-secondary))]" aria-label="Repost">
              <Repeat2 size={20} />
              <span className="text-sm font-medium">{post.reposts || 0}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="hover:text-indigo-500 transition-colors p-2 rounded-lg hover:bg-indigo-500/10 text-[rgb(var(--text-secondary))]" aria-label="Impressions">
              <BarChart2 size={20} />
            </button>
            <button className="hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-500/10 text-[rgb(var(--text-secondary))]" aria-label="Share">
              <Share size={20} />
            </button>
            <button className="hover:text-yellow-500 transition-colors p-2 rounded-lg hover:bg-yellow-500/10 text-[rgb(var(--text-secondary))]" aria-label="Bookmark">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}