'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostCard } from './PostCard'
import { StoryBar } from './StoryBar'
import { Post, Story, NewsArticle } from './types'
import appwriteService from './appwrite'
import { Home, Play, Video, Radio, Newspaper, Users } from 'lucide-react'

interface HomeScreenProps {
  isGuest?: boolean
}

export function HomeScreen({ isGuest = false }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)

  const tabs = [
    { name: 'For You', icon: Home },
    { name: 'Watch', icon: Play },
    { name: 'Reels', icon: Video },
    { name: 'Live', icon: Radio },
    { name: 'News', icon: Newspaper },
    { name: 'Following', icon: Users }
  ]

  const loadPosts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
        setCursor(undefined)
      }

      let result
      const user = await appwriteService.getCurrentUser()

      switch (activeTab) {
        case 0: // For You
          result = await appwriteService.fetchPosts(20, refresh ? undefined : cursor)
          break
        case 1: // Watch (Videos)
          result = await appwriteService.fetchPosts(20, refresh ? undefined : cursor)
          result.documents = result.documents.filter((doc: any) => doc.videoUrl || doc.kind === 'video')
          break
        case 2: // Reels
          result = await appwriteService.fetchPosts(20, refresh ? undefined : cursor)
          result.documents = result.documents.filter((doc: any) => doc.kind === 'reel')
          break
        case 3: // Live
          result = await appwriteService.fetchPosts(20, refresh ? undefined : cursor)
          result.documents = result.documents.filter((doc: any) => doc.kind === 'live')
          break
        case 4: // News
          const newsResult = await appwriteService.fetchNewsArticles(20, refresh ? undefined : cursor)
          setNews(refresh ? newsResult.documents : [...news, ...newsResult.documents])
          setLoading(false)
          setRefreshing(false)
          return
        case 5: // Following
          if (user) {
            const following = await appwriteService.getFollowingUserIds(user.$id)
            if (following.length > 0) {
              result = await appwriteService.fetchPostsByUserIds(following, 20, refresh ? undefined : cursor)
            } else {
              result = { documents: [], total: 0 }
            }
          } else {
            result = { documents: [], total: 0 }
          }
          break
        default:
          result = await appwriteService.fetchPosts(20, refresh ? undefined : cursor)
      }

      const newPosts = result.documents.map((doc: any) => ({
        id: doc.$id,
        postId: doc.postId || doc.$id,
        userId: doc.userId,
        username: doc.username || 'User',
        userAvatar: doc.userAvatar || '',
        content: doc.content || '',
        imageUrl: doc.imageUrl,
        videoUrl: doc.videoUrl,
        kind: doc.kind,
        title: doc.title,
        thumbnailUrl: doc.thumbnailUrl,
        timestamp: new Date(doc.createdAt || doc.$createdAt),
        createdAt: doc.createdAt || doc.$createdAt,
        likes: doc.likes || 0,
        comments: doc.comments || 0,
        reposts: doc.reposts || 0,
        impressions: doc.impressions || 0,
        views: doc.views || 0,
        isLiked: false,
        isReposted: false,
        isSaved: false,
        textBgColor: doc.textBgColor,
        isBoosted: doc.isBoosted || false,
        activeBoostId: doc.activeBoostId
      }))

      if (user && newPosts.length > 0) {
        for (const post of newPosts) {
          try {
            const [isLiked, isReposted, isSaved] = await Promise.all([
              appwriteService.isPostLikedBy(user.$id, post.id),
              appwriteService.isPostRepostedBy(user.$id, post.id),
              appwriteService.isPostSavedBy(user.$id, post.id)
            ])
            post.isLiked = isLiked
            post.isReposted = isReposted
            post.isSaved = isSaved
          } catch (error) {
            console.error('Error loading user interactions:', error)
          }
        }
      }

      if (refresh) {
        setPosts(newPosts)
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }

      setHasMore(newPosts.length === 20)
      if (newPosts.length > 0) {
        setCursor(newPosts[newPosts.length - 1].id)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab, cursor, news])

  const loadStories = useCallback(async () => {
    try {
      const result = await appwriteService.fetchStatuses(40)
      const storyData = result.documents.map((doc: any) => ({
        id: doc.$id,
        statusId: doc.statusId || doc.$id,
        userId: doc.userId,
        username: doc.username || 'User',
        userAvatar: doc.userAvatar || '',
        mediaPath: doc.mediaPath,
        mediaUrls: [doc.mediaPath],
        caption: doc.caption || '',
        timestamp: new Date(doc.timestamp || doc.$createdAt),
        isViewed: false,
        mediaCount: 1
      }))
      setStories(storyData)
    } catch (error) {
      console.error('Failed to load stories:', error)
    }
  }, [])

  useEffect(() => {
    loadPosts(true)
    if (activeTab === 0) {
      loadStories()
    }
  }, [activeTab])

  useEffect(() => {
    const unsubscribePosts = appwriteService.subscribeToCollection('posts', (response) => {
      if (response.events.some((event: any) => event.includes('create'))) {
        loadPosts(true)
      }
    })

    const unsubscribeStatuses = appwriteService.subscribeToCollection('statuses', (response) => {
      if (response.events.some((event: any) => event.includes('create'))) {
        loadStories()
      }
    })

    return () => {
      unsubscribePosts()
      unsubscribeStatuses()
    }
  }, [loadPosts, loadStories])

  const handleTabChange = (tabIndex: number) => {
    if (tabIndex !== activeTab) {
      setActiveTab(tabIndex)
      setPosts([])
      setNews([])
      setCursor(undefined)
      setHasMore(true)
      setLoading(true)
    }
  }

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      loadPosts(false)
    }
  }

  if (loading && posts.length === 0 && news.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-40">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.name}
                onClick={() => handleTabChange(index)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === index
                    ? 'border-xapzap-blue text-xapzap-blue'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 0 && stories.length > 0 && (
        <div className="border-b border-border">
          <StoryBar />
        </div>
      )}

      {activeTab === 4 ? (
        <div className="space-y-4 p-4">
          {news.map((article) => (
            <div key={article.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-bold text-lg mb-2">{article.title}</h3>
              {article.subtitle && (
                <p className="text-gray-600 mb-2">{article.subtitle}</p>
              )}
              <p className="text-gray-800 mb-3">{article.summary || article.content.substring(0, 200)}...</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{article.aiGenerated ? '🤖 AI Generated' : '👤 Human Written'}</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              isGuest={isGuest}
              onGuestAction={isGuest ? () => alert('Please sign in to interact with posts') : undefined}
            />
          ))}
          
          {hasMore && (
            <div className="p-6 text-center">
              <button 
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-xapzap-blue text-white rounded-full hover:bg-xapzap-darkBlue transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}