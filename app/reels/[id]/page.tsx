'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ReelsDetailScreen } from '../../../VideoDetailScreen'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'

export default function ReelsDetailPage() {
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
          postId: postData.$id,
          userId: postData.userId || '',
          username: postData.username || 'User',
          userAvatar: postData.userAvatar || '',
          content: postData.content || '',
          timestamp: new Date(postData.$createdAt || postData.createdAt),
          createdAt: postData.$createdAt || postData.createdAt,
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          reposts: postData.reposts || 0,
          impressions: postData.impressions || 0,
          views: postData.views || 0,
          isLiked: false,
          isReposted: false,
          isSaved: false,
          isBoosted: false
        } as Post)
      } catch (err) {
        console.error('Failed to load reel:', err)
        setError('Failed to load reel')
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
          <p className="text-xl mb-4">{error || 'Reel not found'}</p>
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

  return <ReelsDetailScreen post={post} onClose={() => window.history.back()} />
}