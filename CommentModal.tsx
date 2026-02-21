'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Post } from './types'
import appwriteService from './appwriteService'
import { formatTimeAgo } from './utils'
import { Heart } from 'lucide-react'
import { CommentScreen } from './CommentScreen'

interface CommentModalProps {
  post: Post
  onClose: () => void
}

interface Comment {
  id: string
  postId: string
  userId: string
  username: string
  userAvatar: string
  content: string
  likes: number
  replies: number
  timestamp: Date
  isLiked: boolean
}

export function CommentModal({ post, onClose }: CommentModalProps) {
  const router = useRouter()
  const [commentInputFocused, setCommentInputFocused] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [swipeStartX, setSwipeStartX] = useState(0)
  const [showFullScreen, setShowFullScreen] = useState(false)

  useEffect(() => {
    loadComments()
  }, [])

  const loadComments = async () => {
    try {
      const result = await appwriteService.fetchComments(post.id)
      const user = await appwriteService.getCurrentUser()
      const commentsData = result.documents.slice(0, 3).map((doc: any) => ({
        id: doc.$id,
        postId: doc.postId,
        userId: doc.userId,
        username: doc.username || 'User',
        userAvatar: doc.userAvatar || '',
        content: doc.content || '',
        likes: doc.likes || 0,
        replies: doc.replies || 0,
        timestamp: new Date(doc.timestamp || doc.createdAt || doc.$createdAt),
        isLiked: false
      }))
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      const comment = comments.find(c => c.id === commentId)
      if (!comment) return

      if (comment.isLiked) {
        await appwriteService.unlikeComment(commentId)
      } else {
        await appwriteService.likeComment(commentId)
      }

      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
          : c
      ))
    } catch (error) {
      console.error('Failed to like comment:', error)
    }
  }

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await appwriteService.createComment(post.id, commentText.trim())
      setCommentText('')
      setCommentInputFocused(false)
      await loadComments()
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewAll = () => {
    setShowFullScreen(true)
  }

  if (showFullScreen) {
    return <CommentScreen post={post} onClose={() => setShowFullScreen(false)} />
  }

  return (
    <div className="fixed inset-x-0 bottom-0 bg-background z-[60] flex flex-col animate-in slide-in-from-bottom duration-300 rounded-t-3xl" style={{ top: 'calc(100vh - 50vh)' }}>
      <div className="w-full py-3 flex justify-center border-b border-border cursor-pointer rounded-t-3xl" onClick={onClose}>
        <div className="w-12 h-1 bg-border rounded-full" />
      </div>
      <button
        onClick={handleViewAll}
        className="text-sm text-primary hover:underline py-3 text-center border-b border-border font-medium"
      >
        View all comments
      </button>
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
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div 
                key={comment.id} 
                className="flex gap-3"
              >
                {comment.userAvatar ? (
                  <img src={comment.userAvatar} alt={comment.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">{comment.username[0]?.toUpperCase() || 'U'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div 
                    className="bg-muted rounded-2xl px-3 py-2 cursor-pointer"
                    onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      const swipeEndX = e.changedTouches[0].clientX
                      if (swipeStartX - swipeEndX > 50) {
                        setReplyTo(comment.id)
                        setCommentText(`@${comment.username} `)
                        setCommentInputFocused(true)
                      }
                    }}
                    onClick={() => handleLikeComment(comment.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.username}</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLikeComment(comment.id)
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Heart size={16} />
                      <span>Like</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReplyTo(comment.id)
                        setCommentText(`@${comment.username} `)
                        setCommentInputFocused(true)
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                      </svg>
                      <span>Reply</span>
                    </button>
                    <div className="flex items-center gap-3 ml-auto">
                      {comment.isLiked && comment.likes > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <Heart size={16} className="fill-red-500" />
                          <span>{comment.likes}</span>
                        </span>
                      )}
                      {comment.replies > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                          </svg>
                          <span>{comment.replies}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 bg-background border border-border rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onFocus={() => setCommentInputFocused(true)}
            />
            <button 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
