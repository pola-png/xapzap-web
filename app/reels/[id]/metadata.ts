import { Metadata } from 'next'
import appwriteService from '../../../appwriteService'
import { extractIdFromSlug } from '../../../lib/slug'

export const dynamic = 'force-dynamic'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'
    const toImageAbsoluteUrl = (value?: string) => {
      if (!value) return ''
      if (value.startsWith('http')) return value
      if (value.startsWith('/media/')) return `${siteUrl}/api/image-proxy?path=${value.substring(1)}`
      if (value.startsWith('/')) return `${siteUrl}${value}`
      return `${siteUrl}/${value}`
    }

    const toVideoAbsoluteUrl = (value?: string) => {
      if (!value) return ''
      if (value.startsWith('http')) return value
      if (value.startsWith('/media/')) return `${siteUrl}/api/video-proxy?path=${value.substring(1)}`
      if (value.startsWith('/')) return `${siteUrl}${value}`
      return `${siteUrl}/${value}`
    }

    const postId = extractIdFromSlug(params.id)
    const post = await appwriteService.getPost(postId)
    const profile = await appwriteService.getProfileByUserId(post.userId)
    const baseTitle = post.seoTitle || post.title || post.caption || 'Reel'
    const title = `${baseTitle} by ${profile?.displayName || 'User'}`
    const description =
      post.seoDescription ||
      post.caption ||
      `Watch ${profile?.displayName || 'User'}'s reel on XapZap. ${post.views || 0} views, ${post.likes || 0} likes.`
    const thumbnailUrl = toImageAbsoluteUrl(post.thumbnailUrl || '/og-image.jpg')
    const videoUrl = toVideoAbsoluteUrl(post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '')
    const url = `${siteUrl}/reels/${params.id}`

    return {
      title,
      description,
      keywords: post.seoKeywords || `reel, short video, ${profile?.displayName}, xapzap, ${post.caption || ''}`,
      authors: [{ name: profile?.displayName || 'XapZap User' }],
      openGraph: {
        title,
        description,
        url,
        siteName: 'XapZap',
        images: [
          {
            url: thumbnailUrl,
            width: 1080,
            height: 1920,
            alt: title,
          },
        ],
        locale: 'en_US',
        type: 'video.other',
        videos: [
          {
            url: videoUrl,
            width: 1080,
            height: 1920,
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
          streamUrl: videoUrl,
          width: 1080,
          height: 1920,
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
      title: 'Reel | XapZap',
      description: 'Watch reels on XapZap',
    }
  }
}
