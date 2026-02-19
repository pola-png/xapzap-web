import { Metadata } from 'next'
import appwriteService from '../../../appwriteService'
import { extractIdFromSlug } from '../../../lib/slug'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const postId = extractIdFromSlug(params.id)
    const post = await appwriteService.getPost(postId)
    const profile = await appwriteService.getProfileByUserId(post.userId)
    
    const title = `${post.caption || 'Reel'} by ${profile?.displayName || 'User'}`
    const description = post.caption || `Watch ${profile?.displayName || 'User'}'s reel on XapZap. ${post.views || 0} views, ${post.likes || 0} likes.`
    const thumbnail = post.thumbnailUrl || '/og-image.jpg'
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/reels/${params.id}`

    return {
      title,
      description,
      keywords: `reel, short video, ${profile?.displayName}, xapzap, ${post.caption || ''}`,
      authors: [{ name: profile?.displayName || 'XapZap User' }],
      openGraph: {
        title,
        description,
        url,
        siteName: 'XapZap',
        images: [
          {
            url: thumbnail,
            width: 1080,
            height: 1920,
            alt: title,
          },
        ],
        locale: 'en_US',
        type: 'video.other',
        videos: [
          {
            url: post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
            width: 1080,
            height: 1920,
          },
        ],
      },
      twitter: {
        card: 'player',
        title,
        description,
        images: [thumbnail],
        players: {
          playerUrl: url,
          streamUrl: post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
          width: 1080,
          height: 1920,
        },
      },
      alternates: {
        canonical: url,
      },
      robots: {
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
