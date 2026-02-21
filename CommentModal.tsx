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
  parentCommentId?: string
  repliesExpanded?: boolean
  replyComments?: Comment[]
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
      
      const commentsData = await Promise.all(
        result.documents.slice(0, 3).filter((doc: any) => !doc.parentCommentId).map(async (doc: any) => {
          let isLiked = false
          if (user) {
            isLiked = await appwriteService.isCommentLikedBy(user.$id, doc.$id)
          }
          
          return {
            id: doc.$id,
            postId: doc.postId,
            userId: doc.userId,
            username: doc.username || 'User',
            userAvatar: doc.userAvatar || '',
            content: doc.content || '',
            likes: doc.likes || 0,
            replies: doc.replies || 0,
            timestamp: new Date(doc.timestamp || doc.createdAt || doc.$createdAt),
            isLiked,
            repliesExpanded: false,
            replyComments: []
          }
        })
      )
      
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    const user = await appwriteService.getCurrentUser()
    if (!user) return

    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    const wasLiked = comment.isLiked
    const prevLikes = comment.likes

    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !wasLiked, likes: wasLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1 }
        : c
    ))

    try {
      if (wasLiked) {
        await appwriteService.unlikeComment(commentId)
      } else {
        await appwriteService.likeComment(commentId)
      }
    } catch (error) {
      console.error('Failed to like comment:', error)
      // Revert on error
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, isLiked: wasLiked, likes: prevLikes }
          : c
      ))
    }
  }

  const toggleReplies = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    if (comment.repliesExpanded) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, repliesExpanded: false } : c))
      return
    }

    try {
      const result = await appwriteService.fetchComments(post.id)
      const user = await appwriteService.getCurrentUser()
      const replies = await Promise.all(
        result.documents.filter((doc: any) => doc.parentCommentId === commentId).map(async (doc: any) => {
          let isLiked = false
          if (user) {
            isLiked = await appwriteService.isCommentLikedBy(user.$id, doc.$id)
          }
          return {
            id: doc.$id,
            postId: doc.postId,
            userId: doc.userId,
            username: doc.username || 'User',
            userAvatar: doc.userAvatar || '',
            content: doc.content || '',
            likes: doc.likes || 0,
            replies: 0,
            timestamp: new Date(doc.timestamp || doc.createdAt || doc.$createdAt),
            isLiked
          }
        })
      )
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, repliesExpanded: true, replyComments: replies } : c))
    } catch (error) {
      console.error('Failed to load replies:', error)
    }
  }

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await appwriteService.createComment(post.id, commentText.trim(), replyTo || undefined)
      setCommentText('')
      setReplyTo(null)
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
              <>
                <div 
                  key={comment.id} 
                  className="flex gap-3"
                >
                <img 
                  src={comment.userAvatar || ''} 
                  alt={comment.username} 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/profile/${comment.userId}`)
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div 
                    className="bg-muted rounded-2xl px-3 py-2 cursor-pointer"
                    onTouchStart={(e) => setSwipeStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      const swipeEndX = e.changedTouches[0].clientX
                      if (swipeStartX - swipeEndX > 50) {
                        setReplyTo(comment.id)
                        setCommentText(`${comment.username} `)
                        setCommentInputFocused(true)
                      }
                    }}
                    onClick={() => handleLikeComment(comment.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-medium text-sm cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/profile/${comment.userId}`)
                        }}
                      >{comment.username}</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</span>
                    </div>
                    <p className="text-sm">{comment.content.split(' ').map((word, i) => 
                      word.startsWith('@') ? (
                        <span key={i} className="text-blue-500">{word} </span>
                      ) : (
                        word + ' '
                      )
                    )}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLikeComment(comment.id)
                      }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Heart size={18} />
                      <span>Like</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReplyTo(comment.id)
                        setCommentText(`${comment.username} `)
                        setCommentInputFocused(true)
                      }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                      </svg>
                      <span>Reply</span>
                    </button>
                    <div className="flex items-center gap-4 ml-auto">
                      {comment.isLiked && (
                        <span className="flex items-center gap-1.5 text-sm text-red-500">
                          <Heart size={18} className="fill-red-500" />
                          <span>{comment.likes}</span>
                        </span>
                      )}
                      {comment.replies > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleReplies(comment.id)
                          }}
                          className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 7l5 5-5 5M4 6v2a4 4 0 0 0 4 4h12"/>
                          </svg>
                          <span>{comment.repliesExpanded ? 'Hide' : 'View'} {comment.replies} {comment.replies === 1 ? 'reply' : 'replies'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {comment.repliesExpanded && comment.replyComments && comment.replyComments.map((reply) => (
                <div key={reply.id} className="flex gap-3 ml-11 mt-3">
                  <img 
                    src={reply.userAvatar || ''} 
                    alt={reply.username} 
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/profile/${reply.userId}`)
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span 
                          className="font-semibold text-base cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/profile/${reply.userId}`)
                          }}
                        >{reply.username}</span>
                        <span className="text-sm text-muted-foreground">{formatTimeAgo(reply.timestamp)}</span>
                      </div>
                      <p className="text-base leading-relaxed">
                        {reply.content.startsWith(comment.username) && (
                          <span className="text-blue-500 font-medium">{comment.username} </span>
                        )}
                        {reply.content.replace(new RegExp(`^${comment.username}\\s*`), '')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLikeComment(reply.id)
                        }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Heart size={18} />
                        <span>Like</span>
                      </button>
                      <div className="flex items-center gap-3 ml-auto">
                        {reply.isLiked && (
                          <span className="flex items-center gap-1.5 text-sm text-red-500">
                            <Heart size={18} className="fill-red-500" />
                            <span>{reply.likes}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </>
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
