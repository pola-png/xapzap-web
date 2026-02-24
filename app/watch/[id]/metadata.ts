import { Metadata } from 'next'
import appwriteService from '../../../appwriteService'
import { extractIdFromSlug } from '../../../lib/slug'

export const dynamic = 'force-dynamic'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const postId = extractIdFromSlug(params.id)
    const post = await appwriteService.getPost(postId)
    const profile = await appwriteService.getProfileByUserId(post.userId)
    // Respect per-post SEO overrides when present
    const baseTitle = post.seoTitle || post.title || post.caption || 'Video'
    const title = `${baseTitle} by ${profile?.displayName || 'User'}`
    const description =
      post.seoDescription ||
      post.content ||
      post.caption ||
      `Watch ${profile?.displayName || 'User'}'s video on XapZap. ${post.views || 0} views, ${post.likes || 0} likes.`
    const thumbnailUrl = post.thumbnailUrl?.startsWith('http') 
      ? post.thumbnailUrl 
      : post.thumbnailUrl?.startsWith('/media/') 
      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/api/image-proxy?path=${post.thumbnailUrl.substring(1)}`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/og-image.jpg`
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/watch/${params.id}`

    return {
      title,
      description,
      keywords: post.seoKeywords || `video, ${profile?.displayName}, xapzap, watch, ${post.caption || ''}`,
      authors: [{ name: profile?.displayName || 'XapZap User' }],
      openGraph: {
        title,
        description,
        url,
        siteName: 'XapZap',
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: 'en_US',
        type: 'video.other',
        videos: [
          {
            url: post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
            width: 1920,
            height: 1080,
          },
        ],
      },
      twitter: {
        card: 'player',
        title,
        description,
        images: [thumbnailUrl],
        players: {
          playerUrl: url,
          streamUrl: post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
          width: 1920,
          height: 1080,
        },
      },
      alternates: {
        canonical: url,
      },
      robots: post.isSeoIndexable === false
        ? {
            index: false,
            follow: false,
          }
        : {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
          },
    }
  } catch (error) {
    return {
      title: 'Video | XapZap',
      description: 'Watch videos on XapZap',
    }
  }
}
