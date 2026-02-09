'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2 } from 'lucide-react'
import { Post } from './types'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
  currentUserId?: string
}

export const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)

  const handleLike = () => {
    setLiked(!liked)
    setLikes(liked ? likes - 1 : likes + 1)
  }

  return (
    <div className="bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-color))] p-4">
      <div className="flex items-start gap-3">
        {post.userAvatar ? (
          <img src={post.userAvatar} alt={post.username} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center text-[rgb(var(--text-primary))]">
            {post.username[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[rgb(var(--text-primary))] font-bold text-lg">{post.username}</span>
              <span className="text-[rgb(var(--text-secondary))] text-xs">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <button className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]" aria-label="More options">
              <MoreHorizontal size={20} />
            </button>
          </div>
          {post.textBgColor ? (
            <div
              className="text-white text-base mb-2 leading-relaxed p-3 rounded-lg"
              style={{ backgroundColor: `#${post.textBgColor.toString(16).padStart(6, '0')}` }}
            >
              {post.content}
            </div>
          ) : (
            <p className="text-[rgb(var(--text-primary))] text-base mb-2 leading-relaxed">{post.content}</p>
          )}

          {(post.imageUrl || (post.mediaUrls && post.mediaUrls.length > 0 && !post.videoUrl && (!post.kind || post.kind === 'standard'))) && (
            <img
              src={post.imageUrl || (post.mediaUrls && post.mediaUrls[0])}
              alt="Post"
              className="w-full rounded-xl mb-2"
            />
          )}

          {(post.videoUrl || (post.kind === 'video' || post.kind === 'reel') || (post.mediaUrls && post.mediaUrls.length > 0 && post.thumbnailUrl)) && (
            <video
              src={post.videoUrl || (post.mediaUrls && post.mediaUrls[0])}
              poster={post.thumbnailUrl}
              className="w-full rounded-2xl mb-3"
              controls
              preload="metadata"
            />
          )}

          {post.kind === 'news' && post.title && (
            <div className="border-l-4 border-blue-500 pl-4 mb-2">
              <h3 className="font-bold text-lg text-[rgb(var(--text-primary))]">{post.title}</h3>
            </div>
          )}
          <div className="flex items-center gap-3 md:gap-6 text-[rgb(var(--text-secondary))]">
            <button onClick={handleLike} className={`flex items-center gap-1 hover:text-red-500 ${liked ? 'text-red-500' : ''}`} aria-label="Like">
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm">{likes}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-blue-500" aria-label="Comment">
              <MessageCircle size={20} />
              <span className="text-sm">{post.comments}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-500" aria-label="Repost">
              <Repeat2 size={20} />
              <span className="text-sm">{post.reposts}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-indigo-500" aria-label="Impressions">
              <BarChart2 size={20} />
              <span className="text-sm">{post.impressions}</span>
            </button>
            <button className="hover:text-blue-500" aria-label="Share">
              <Share size={20} />
            </button>
            <button className="hover:text-yellow-500" aria-label="Bookmark">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}