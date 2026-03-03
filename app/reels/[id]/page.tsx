import appwriteService from '../../../appwriteService'
import { Post } from '../../../types'
import { extractIdFromSlug } from '../../../lib/slug'
import { generateVideoStructuredData } from '../../../lib/structured-data'
import { hasVerifiedBadge } from '../../../lib/verification'
import ReelDetailClient from './ReelDetailClient'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'

function toImageProxyUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/media/')) {
    return `${SITE_URL}/api/image-proxy?path=${url.substring(1)}`
  }
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return `${SITE_URL}/${url}`
}

function toVideoProxyUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/media/')) {
    return `${SITE_URL}/api/video-proxy?path=${url.substring(1)}`
  }
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return `${SITE_URL}/${url}`
}

function normalizeMediaUrls(postData: any): string[] {
  if (Array.isArray(postData.mediaUrls)) {
    return postData.mediaUrls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
  }

  if (typeof postData.mediaUrls === 'string' && postData.mediaUrls.length > 0) {
    try {
      const parsed = JSON.parse(postData.mediaUrls)
      if (Array.isArray(parsed)) {
        return parsed.filter((url: unknown) => typeof url === 'string' && url.length > 0)
      }
      return [postData.mediaUrls]
    } catch {
      return [postData.mediaUrls]
    }
  }

  if (typeof postData.videoUrl === 'string' && postData.videoUrl.length > 0) {
    return [postData.videoUrl]
  }

  return []
}

function buildInitialPost(postData: any, profile: any): Post {
  const mediaUrls = normalizeMediaUrls(postData)

  return {
    ...postData,
    id: postData.$id,
    postId: postData.postId || postData.$id,
    userId: postData.userId || '',
    username: postData.username || 'User',
    userAvatar: postData.userAvatar || '',
    displayName: profile?.displayName || 'User',
    avatarUrl: profile?.avatarUrl || '',
    isVerified: hasVerifiedBadge(profile || postData),
    content: postData.content || '',
    postType: postData.postType || 'reel',
    title: postData.title || '',
    caption: postData.caption || '',
    thumbnailUrl: toImageProxyUrl(postData.thumbnailUrl || ''),
    mediaUrls: mediaUrls.map((url) => toVideoProxyUrl(url)),
    timestamp: new Date(postData.$createdAt || postData.createdAt || new Date().toISOString()),
    createdAt: postData.$createdAt || postData.createdAt || new Date().toISOString(),
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
    activeBoostId: postData.activeBoostId || '',
  }
}

type ReelDetailPageProps = {
  params: { id: string }
}

export default async function ReelDetailPage({ params }: ReelDetailPageProps) {
  try {
    const postId = extractIdFromSlug(params.id)
    const postData = await appwriteService.getPost(postId)
    const profile = await appwriteService.getProfileByUserId(postData.userId)
    const initialPost = buildInitialPost(postData, profile)
    const videoUrl = initialPost.mediaUrls[0] || ''
    const structuredData = generateVideoStructuredData(initialPost)

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {videoUrl ? (
          <div className="sr-only" aria-hidden="true">
            <video
              preload="metadata"
              controls
              poster={initialPost.thumbnailUrl || undefined}
            >
              <source src={videoUrl} />
            </video>
          </div>
        ) : null}
        <ReelDetailClient initialPost={initialPost} slugId={params.id} />
      </>
    )
  } catch {
    return <ReelDetailClient slugId={params.id} />
  }
}
