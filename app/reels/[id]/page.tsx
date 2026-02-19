'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ReelsDetailScreen } from '../../../VideoDetailScreen'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'
import { extractIdFromSlug } from '../../../lib/slug'
import { generateVideoStructuredData } from '../../../lib/structured-data'

export default function ReelsDetailPage() {
  const params = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPost = async () => {
      if (!params.id) return

      try {
        const postId = extractIdFromSlug(params.id as string)
        const postData = await appwriteService.getPost(postId)
        const profile = await appwriteService.getProfileByUserId(postData.userId)
        const user = await appwriteService.getCurrentUser()
        const interactions = user ? await Promise.all([
          appwriteService.isPostLikedBy(user.$id, postData.$id),
          appwriteService.isPostSavedBy(user.$id, postData.$id),
          appwriteService.isPostRepostedBy(user.$id, postData.$id)
        ]) : [false, false, false]
        
        const enrichedPost = {
          ...postData,
          id: postData.$id,
          postId: postData.postId || postData.$id,
          userId: postData.userId || '',
          username: postData.username || 'User',
          userAvatar: postData.userAvatar || '',
          displayName: profile?.displayName || 'User',
          avatarUrl: profile?.avatarUrl || '',
          content: postData.content || '',
          postType: postData.postType || 'reel',
          title: postData.title || '',
          caption: postData.caption || '',
          thumbnailUrl: postData.thumbnailUrl || '',
          mediaUrl: postData.mediaUrl || (postData.mediaUrls && postData.mediaUrls[0]) || '',
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
          likesCount: postData.likes || 0,
          commentsCount: postData.comments || 0,
          repostsCount: postData.reposts || 0,
          isLiked: interactions[0],
          isReposted: interactions[1],
          isSaved: interactions[2],
          sourcePostId: postData.sourcePostId,
          sourceUserId: postData.sourceUserId,
          sourceUsername: postData.sourceUsername,
          textBgColor: postData.textBgColor,
          isBoosted: postData.isBoosted || false,
          activeBoostId: postData.activeBoostId || ''
        } as Post

        setPost(enrichedPost)

        // Inject structured data for SEO
        if (typeof window !== 'undefined') {
          const structuredData = generateVideoStructuredData(enrichedPost)
          const script = document.createElement('script')
          script.type = 'application/ld+json'
          script.text = JSON.stringify(structuredData)
          document.head.appendChild(script)

          // Update meta tags dynamically
          document.title = `${enrichedPost.caption || 'Reel'} by ${enrichedPost.displayName} | XapZap`
          
          const updateOrCreateMeta = (selector: string, attribute: string, content: string) => {
            let meta = document.querySelector(selector)
            if (!meta) {
              meta = document.createElement('meta')
              if (attribute === 'name') {
                meta.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''))
              } else {
                meta.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''))
              }
              document.head.appendChild(meta)
            }
            meta.setAttribute('content', content)
          }

          updateOrCreateMeta('meta[name="description"]', 'name', enrichedPost.caption || `Watch ${enrichedPost.displayName}'s reel on XapZap`)
          updateOrCreateMeta('meta[property="og:title"]', 'property', `${enrichedPost.caption || 'Reel'} by ${enrichedPost.displayName}`)
          updateOrCreateMeta('meta[property="og:description"]', 'property', enrichedPost.caption || `Watch ${enrichedPost.displayName}'s reel`)
          updateOrCreateMeta('meta[property="og:image"]', 'property', enrichedPost.thumbnailUrl || '/og-image.jpg')
          updateOrCreateMeta('meta[property="og:type"]', 'property', 'video.other')
          updateOrCreateMeta('meta[property="og:video"]', 'property', enrichedPost.mediaUrl || '')
          updateOrCreateMeta('meta[name="twitter:card"]', 'name', 'player')
          updateOrCreateMeta('meta[name="twitter:title"]', 'name', `${enrichedPost.caption || 'Reel'} by ${enrichedPost.displayName}`)
          updateOrCreateMeta('meta[name="twitter:image"]', 'name', enrichedPost.thumbnailUrl || '/og-image.jpg')
        }
      } catch (err) {
        console.error('Failed to load reel:', err)
        setError('Failed to load reel')
      }
    }

    loadPost()
  }, [params.id])

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