'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Heart, Reply, Mic, Send, MoreHorizontal } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwrite'
import { cn } from './utils'

interface Comment {
  id: string
  postId: string
  userId: string
  username: string
  userAvatar: string
  content: string
  voiceUrl?: string
  parentCommentId?: string
  likes: number
  replies: number
  timestamp: Date
  isLiked: boolean
}

interface CommentScreenProps {
  post: Post
  onClose: () => void
  isGuest?: boolean
  onGuestAction?: () => void
}

export function CommentScreen({ post, onClose, isGuest = false, onGuestAction }: CommentScreenProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadComments()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadComments = async () => {
    try {
      setIsLoading(true)
      const result = await appwriteService.fetchComments(post.id)
      const commentsData = result.documents.map((doc: any) => ({
        id: doc.$id,
        postId: doc.postId,
        userId: doc.userId,
        username: doc.username || 'User',
        userAvatar: doc.userAvatar || '',
        content: doc.content || '',
        voiceUrl: doc.voiceUrl,
        parentCommentId: doc.parentCommentId,
        likes: doc.likes || 0,
        replies: doc.replies || 0,
        timestamp: new Date(doc.createdAt || doc.$createdAt),
        isLiked: false // TODO: Check if current user liked this comment
      }))
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    if (isGuest) {
      onGuestAction?.()
      return
    }

    try {
      const comment = await appwriteService.createComment(post.id, newComment.trim())
      await loadComments()
      setNewComment('')
      setReplyTo(null)
    } catch (error) {
      console.error('Failed to post comment:', error)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (isGuest) {
      onGuestAction?.()
      return
    }

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

  const rootComments = comments.filter(c => !c.parentCommentId)
  const getReplies = (commentId: string) => comments.filter(c => c.parentCommentId === commentId)

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={cn("flex space-x-3 py-3", isReply && "ml-12")}>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        {comment.userAvatar ? (
          <img
            src={comment.userAvatar}
            alt={comment.username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium">
            {comment.username[0]?.toUpperCase() || 'U'}
          </span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded-2xl px-3 py-2">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">{comment.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.timestamp)}
            </span>
          </div>
          
          {comment.voiceUrl ? (
            <div className="bg-background rounded-lg p-2">
              <audio controls className="w-full h-8">
                <source src={comment.voiceUrl} type="audio/mpeg" />
                Voice message
              </audio>
            </div>
          ) : (
            <p className="text-sm">{comment.content}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4 mt-1 ml-3">
          <button
            onClick={() => handleLikeComment(comment.id)}
            className={cn(
              "flex items-center space-x-1 text-xs font-medium",
              comment.isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart size={12} className={comment.isLiked ? "fill-current" : ""} />
            {comment.likes > 0 && <span>{comment.likes}</span>}
            <span>Like</span>
          </button>
          
          <button
            onClick={() => setReplyTo(comment.id)}
            className="flex items-center space-x-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Reply size={12} />
            <span>Reply</span>
            {comment.replies > 0 && <span>({comment.replies})</span>}
          </button>
        </div>
      </div>
    </div>
  )

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
        <h1 className="text-lg font-semibold">Comments</h1>
        <div className="w-10" />
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-xapzap-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4">
            {rootComments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to comment!</p>
              </div>
            ) : (
              rootComments.map(comment => (
                <div key={comment.id}>
                  <CommentItem comment={comment} />
                  {getReplies(comment.id).map(reply => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {currentUser ? (
              <span className="text-xs font-medium">
                {currentUser.name?.[0]?.toUpperCase() || 'U'}
              </span>
            ) : (
              <span className="text-xs font-medium">U</span>
            )}
          </div>
          
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
            />
            
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="p-2 text-xapzap-blue hover:bg-accent rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        
        {replyTo && (
          <div className="mt-2 ml-11">
            <button
              onClick={() => setReplyTo(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel reply
            </button>
          </div>
        )}
      </div>
    </div>
  )
}