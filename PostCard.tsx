'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, BarChart2, MoreHorizontal } from 'lucide-react'
import { Post } from './types'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
}

export function PostCard({ post, isGuest = false, onGuestAction }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likes, setLikes] = useState(post.likes)

  const handleLike = () => {
    if (isGuest) {
      onGuestAction?.()
      return
    }
    setIsLiked(!isLiked)
    setLikes(isLiked ? likes - 1 : likes + 1)
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 30) return `${days}d`
    
    const month = date.toLocaleDateString('en', { month: 'short' })
    const day = date.getDate()
    return `${day} ${month}`
  }

  return (
    <article className="bg-white dark:bg-[#1F1F1F] border-b border-[#E5E7EB] dark:border-[#374151]">
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="w-[60px] h-[60px] rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xl font-bold">{post.username[0]?.toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[22px] font-extrabold leading-tight text-black dark:text-white">{post.username}</h3>
                <time className="text-[13px] text-[#6B7280]">{formatTime(post.timestamp)}</time>
              </div>
              <button className="p-1">
                <MoreHorizontal size={16} className="text-[#6B7280]" />
              </button>
            </div>

            {post.content && (
              <p className="text-[21px] font-normal leading-[1.4] mb-3 text-black dark:text-white">{post.content}</p>
            )}

            {post.imageUrl && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                <img src={post.imageUrl} alt="" className="w-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1F1F1F] rounded-xl p-3 shadow-sm border border-gray-100 dark:border-[#374151]">
          <div className="flex items-center justify-between">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                isLiked ? 'text-[#FF2D55] bg-red-50' : 'text-[#6B7280] hover:text-[#FF2D55] hover:bg-red-50'
              }`}
            >
              <Heart size={20} className={isLiked ? 'fill-current' : ''} />
              <span className="text-sm font-medium">{likes}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[#6B7280] hover:text-blue-500 hover:bg-blue-50 transition-all">
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{post.comments}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[#6B7280] hover:text-green-500 hover:bg-green-50 transition-all">
              <Repeat2 size={20} />
              <span className="text-sm font-medium">{post.reposts}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 rounded-full text-[#6B7280] hover:text-blue-500 hover:bg-blue-50 transition-all">
              <Share size={20} />
              <span className="text-sm font-medium">0</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-2 text-[#6B7280]">
              <BarChart2 size={20} />
              <span className="text-sm font-medium">{post.impressions}</span>
              <span className="text-xs">Views</span>
            </div>

            <button className="p-2 rounded-full text-[#6B7280] hover:text-yellow-500 transition-colors">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
