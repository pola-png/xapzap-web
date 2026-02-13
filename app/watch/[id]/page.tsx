'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VideoDetailScreen } from '../../../VideoDetailScreen'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'

export default function WatchDetailPage() {
  const params = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPost = async () => {
      if (!params.id) return

      try {
        setLoading(true)
        const postData = await appwriteService.getPost(params.id as string)
        setPost({
          ...postData,
          id: postData.$id,
          postId: postData.postId || postData.$id,
          userId: postData.userId || '',
          username: postData.username || 'User',
          userAvatar: postData.userAvatar || '',
          content: postData.content || '',
          postType: postData.postType || 'video',
          title: postData.title || '',
          thumbnailUrl: postData.thumbnailUrl || '',
          mediaUrls: postData.mediaUrls || (postData.videoUrl ? [postData.videoUrl] : []),
          timestamp: new Date(postData.$createdAt || postData.createdAt),
          createdAt: postData.$createdAt || postData.createdAt,
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          reposts: postData.reposts || 0,
          shares: postData.shares || 0,
          impressions: postData.impressions || 0,
          views: postData.views || 0,
          isLiked: false,
          isReposted: false,
          isSaved: false,
          sourcePostId: postData.sourcePostId,
          sourceUserId: postData.sourceUserId,
          sourceUsername: postData.sourceUsername,
          textBgColor: postData.textBgColor,
          isBoosted: postData.isBoosted || false,
          activeBoostId: postData.activeBoostId || ''
        } as Post)
      } catch (err) {
        console.error('Failed to load post:', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <VideoDetailScreen post={post} onClose={() => window.history.back()} />
}