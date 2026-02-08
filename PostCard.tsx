'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, BarChart2, MoreHorizontal } from 'lucide-react'
import { Post } from './types'
import Image from 'next/image'

interface PostCardProps {
  post: Post
}

export const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(post.isLiked)
  const [likes, setLikes] = useState(post.likes)

  const handleLike = () => {
    setLiked(!liked)
    setLikes(liked ? likes - 1 : likes + 1)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-100 hover:shadow-xl transition-all duration-200">
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <Image
          src={post.userAvatar || '/default-avatar.png'}
          alt={post.username}
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-gray-900 text-sm truncate">{post.username}</h3>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          {post.isBoosted && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
              Boosted
            </span>
          )}
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-500 cursor-pointer" />
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-900 leading-relaxed text-base break-words">{post.content}</p>
      </div>

      {/* Media */}
      {post.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-50">
          <Image
            src={post.imageUrl}
            alt="Post media"
            width={500}
            height={300}
            className="w-full h-64 object-cover hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      {post.videoUrl && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-50">
          <video
            src={post.videoUrl}
            className="w-full h-64 object-cover"
            controls
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
              liked
                ? 'text-red-500 bg-red-50'
                : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} />
            <span className="text-sm font-medium">{likes}</span>
          </button>

          <button className="flex items-center space-x-1 p-2 rounded-lg text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments}</span>
          </button>

          <button className="flex items-center space-x-1 p-2 rounded-lg text-gray-600 hover:text-green-500 hover:bg-green-50 transition-colors">
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm font-medium">{post.reposts}</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button title="Share post" className="p-2 rounded-lg text-gray-600 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
            <Share className="w-5 h-5" />
          </button>
          <button title="Bookmark post" className="p-2 rounded-lg text-gray-600 hover:text-yellow-500 hover:bg-yellow-50 transition-colors">
            <Bookmark className="w-5 h-5" />
          </button>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {post.impressions.toLocaleString()} views
          </div>
        </div>
      </div>
    </div>
  )
}