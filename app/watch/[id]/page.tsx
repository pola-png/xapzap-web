'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VideoDetailScreen } from '../../../VideoDetailScreen'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'
import { extractIdFromSlug } from '../../../lib/slug'

export default function WatchDetailPage() {
  const params = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPost = async () => {
      if (!params.id) return

      try {
        const postId = extractIdFromSlug(params.id as string)
        const postData = await appwriteService.getPost(postId)
        console.log('Raw post data from database:', postData)
        console.log('mediaUrls type:', typeof postData.mediaUrls, 'value:', postData.mediaUrls)
        console.log('thumbnailUrl:', postData.thumbnailUrl)
        const profile = await appwriteService.getProfileByUserId(postData.userId)
        const user = await appwriteService.getCurrentUser()
        const interactions = user ? await Promise.all([
          appwriteService.isPostLikedBy(user.$id, postData.$id),
          appwriteService.isPostSavedBy(user.$id, postData.$id),
          appwriteService.isPostRepostedBy(user.$id, postData.$id)
        ]) : [false, false, false]
        
        setPost({
          ...postData,
          id: postData.$id,
          postId: postData.postId || postData.$id,
          userId: postData.userId || '',
          username: postData.username || 'User',
          userAvatar: postData.userAvatar || '',
          displayName: profile?.displayName || 'User',
          avatarUrl: profile?.avatarUrl || '',
          content: postData.content || '',
          postType: postData.postType || 'video',
          title: postData.title || '',
          thumbnailUrl: postData.thumbnailUrl || '',
          mediaUrls: (() => {
            if (Array.isArray(postData.mediaUrls)) {
              return postData.mediaUrls;
            }
            if (typeof postData.mediaUrls === 'string') {
              try {
                const parsed = JSON.parse(postData.mediaUrls);
                return Array.isArray(parsed) ? parsed : [postData.mediaUrls];
              } catch {
                return [postData.mediaUrls];
              }
            }
            return postData.videoUrl ? [postData.videoUrl] : [];
          })(),
          timestamp: new Date(postData.$createdAt || postData.createdAt),
          createdAt: postData.$createdAt || postData.createdAt,
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          reposts: postData.reposts || 0,
          shares: postData.shares || 0,
          impressions: postData.impressions || 0,
          views: postData.views || 0,
          isLiked: interactions[0],
          isReposted: interactions[1],
          isSaved: interactions[2],
          sourcePostId: postData.sourcePostId,
          sourceUserId: postData.sourceUserId,
          sourceUsername: postData.sourceUsername,
          textBgColor: postData.textBgColor,
          isBoosted: postData.isBoosted || false,
          activeBoostId: postData.activeBoostId || ''
        } as Post)
      } catch (err) {
        console.error('Failed to load post:', err)
        setError('Video not found or access denied. Try viewing from home feed.')
      }
    }

    loadPost()
  }, [params.id])

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