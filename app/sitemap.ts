import { MetadataRoute } from 'next'
import appwriteService from '../appwriteService'
import { generateSlug } from '../lib/slug'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'

  // Static routes with high priority
  const routes = [
    { url: `${baseUrl}`, priority: 1, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/watch`, priority: 0.9, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/reels`, priority: 0.9, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/news`, priority: 0.9, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/following`, priority: 0.7, changeFrequency: 'hourly' as const },
    { url: `${baseUrl}/live`, priority: 0.8, changeFrequency: 'always' as const },
    { url: `${baseUrl}/search`, priority: 0.6, changeFrequency: 'daily' as const },
    { url: `${baseUrl}/auth/signin`, priority: 0.5, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/auth/signup`, priority: 0.5, changeFrequency: 'monthly' as const },
  ].map((route) => ({
    ...route,
    lastModified: new Date(),
  }))

  // Dynamic content - fetch ALL posts (Next.js will handle pagination automatically)
  try {
    const allUrls: MetadataRoute.Sitemap = [...routes]

    // Fetch videos in batches
    let videoCursor: string | undefined
    let videoCount = 0
    const maxVideos = 50000 // Per sitemap file limit

    while (videoCount < maxVideos) {
      const videos = await appwriteService.fetchWatchFeed(500, videoCursor)
      if (videos.documents.length === 0) break

      videos.documents.forEach((post: any) => {
        allUrls.push({
          url: `${baseUrl}/watch/${generateSlug(post.caption || post.title || 'video', post.$id)}`,
          lastModified: new Date(post.$updatedAt || post.$createdAt),
          changeFrequency: 'weekly',
          priority: 0.9,
        })
      })

      videoCount += videos.documents.length
      if (videos.documents.length < 500) break
      videoCursor = videos.documents[videos.documents.length - 1].$id
    }

    // Fetch reels in batches
    let reelsCursor: string | undefined
    let reelsCount = 0
    const maxReels = 50000

    while (reelsCount < maxReels) {
      const reels = await appwriteService.fetchReelsFeed(500, reelsCursor)
      if (reels.documents.length === 0) break

      reels.documents.forEach((post: any) => {
        allUrls.push({
          url: `${baseUrl}/reels/${generateSlug(post.caption || 'reel', post.$id)}`,
          lastModified: new Date(post.$updatedAt || post.$createdAt),
          changeFrequency: 'weekly',
          priority: 0.9,
        })
      })

      reelsCount += reels.documents.length
      if (reels.documents.length < 500) break
      reelsCursor = reels.documents[reels.documents.length - 1].$id
    }

    // Fetch news articles in batches
    let newsCursor: string | undefined
    let newsCount = 0
    const maxNews = 50000

    while (newsCount < maxNews) {
      const news = await appwriteService.fetchPostsByKind('news', 500, newsCursor)
      if (news.documents.length === 0) break

      news.documents.forEach((post: any) => {
        allUrls.push({
          url: `${baseUrl}/news/${generateSlug(post.title || post.caption || 'article', post.$id)}`,
          lastModified: new Date(post.$updatedAt || post.$createdAt),
          changeFrequency: 'daily',
          priority: 0.9,
        })
      })

      newsCount += news.documents.length
      if (news.documents.length < 500) break
      newsCursor = news.documents[news.documents.length - 1].$id
    }

    console.log(`Sitemap generated: ${routes.length} static + ${videoCount} videos + ${reelsCount} reels + ${newsCount} news = ${allUrls.length} total URLs`)
    return allUrls
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return routes
  }
}
