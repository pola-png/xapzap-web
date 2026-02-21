'use client'

import { useState } from 'react'
import { Post } from './types'

interface CommentModalProps {
  post: Post
  onClose: () => void
}

export function CommentModal({ post, onClose }: CommentModalProps) {
  const [commentInputFocused, setCommentInputFocused] = useState(false)

  return (
    <div className="fixed inset-x-0 bottom-0 bg-background z-[60] flex flex-col animate-in slide-in-from-bottom duration-300" style={{ top: '60px' }}>
      <div className="w-full py-3 flex justify-center border-b border-border cursor-pointer" onClick={onClose}>
        <div className="w-12 h-1 bg-border rounded-full" />
      </div>
      {commentInputFocused && (
        <div className="p-3 bg-background border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            {post.avatarUrl ? (
              <img src={post.avatarUrl} alt={post.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                {(post.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
              onBlur={() => setCommentInputFocused(false)}
            />
            <button 
              onClick={() => setCommentInputFocused(false)}
              className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Post
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pb-20">
        <p className="text-muted-foreground text-sm text-center py-8">No comments yet</p>
      </div>
      {!commentInputFocused && (
        <div className="absolute bottom-0 inset-x-0 p-3 bg-background border-t border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            {post.avatarUrl ? (
              <img src={post.avatarUrl} alt={post.displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-xs">
                {(post.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onFocus={() => setCommentInputFocused(true)}
            />
            <button className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
