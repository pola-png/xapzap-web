export function generateVideoStructuredData(post: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: post.caption || post.title || 'Video',
    description: post.content || post.caption || 'Watch this video on XapZap',
    thumbnailUrl: post.thumbnailUrl || '',
    uploadDate: post.createdAt || post.$createdAt,
    contentUrl: post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '',
    embedUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/watch/${post.id}`,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likes || post.likesCount || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.comments || post.commentsCount || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: post.views || 0,
      },
    ],
  }
}

export function generateNewsArticleStructuredData(article: any, author: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title || article.caption || 'News Article',
    description: article.content || article.caption || '',
    image: article.thumbnailUrl || article.imageUrl || '',
    datePublished: article.createdAt || article.$createdAt,
    dateModified: article.$updatedAt || article.createdAt || article.$createdAt,
    author: {
      '@type': 'Person',
      name: author?.displayName || 'XapZap News',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/profile/${article.userId}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'XapZap',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/news/${article.id}`,
    },
    articleSection: article.category || 'General',
    keywords: article.tags || article.caption || '',
    wordCount: (article.content || '').split(' ').length,
    inLanguage: 'en-US',
  }
}

export function generateBlogPostStructuredData(post: any, author: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title || post.caption || 'Post',
    description: post.content || post.caption || '',
    image: post.thumbnailUrl || post.imageUrl || '',
    datePublished: post.createdAt || post.$createdAt,
    dateModified: post.$updatedAt || post.createdAt || post.$createdAt,
    author: {
      '@type': 'Person',
      name: author?.displayName || 'User',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/profile/${post.userId}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'XapZap',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/post/${post.id}`,
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likes || post.likesCount || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.comments || post.commentsCount || 0,
      },
    ],
  }
}

export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'XapZap',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com',
    description: 'Social media platform for videos, reels, news, and more',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'XapZap',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xapzap.com'}/logo.png`,
    sameAs: [
      'https://twitter.com/xapzap',
      'https://facebook.com/xapzap',
      'https://instagram.com/xapzap',
    ],
  }
}
