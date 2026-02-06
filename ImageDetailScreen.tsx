'use client'

import { useState } from 'react'
import { ArrowLeft, MessageCircle, X } from 'lucide-react'
import { Post } from './types'
import { PostCard } from './PostCard'
import { CommentScreen } from './CommentScreen'

interface ImageDetailScreenProps {
  post: Post
  onClose: () => void
  isGuest?: boolean
  onGuestAction?: () => void
}

export function ImageDetailScreen({ post, onClose, isGuest = false, onGuestAction }: ImageDetailScreenProps) {
  const [showComments, setShowComments] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)

  if (showComments) {
    return (
      <CommentScreen
        post={post}
        onClose={() => setShowComments(false)}
        isGuest={isGuest}
        onGuestAction={onGuestAction}
      />
    )
  }

  if (showFullImage) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <button
          onClick={() => setShowFullImage(false)}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <img
          src={post.imageUrl}
          alt="Full size image"
          className="max-w-full max-h-full object-contain"
          onClick={() => setShowFullImage(false)}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={onClose}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Photo</h1>
        <button
          onClick={() => setShowComments(true)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <MessageCircle size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Image */}
          {post.imageUrl && (
            <div className="relative">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full max-h-[70vh] object-contain cursor-zoom-in"
                onClick={() => setShowFullImage(true)}
              />
            </div>
          )}
          
          {/* Post Info */}
          <div className="border-t border-border">
            <PostCard
              post={{ ...post, imageUrl: undefined }}
              isGuest={isGuest}
              onGuestAction={onGuestAction}
            />
          </div>
        </div>
      </div>
    </div>
  )
}