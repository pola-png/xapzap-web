'use client'

import { useState, useEffect } from 'react'
import { Search, Home, Play, Video, Radio, Newspaper, Users } from 'lucide-react'
import { PostCard } from './PostCard'
import { StoryBar } from './StoryBar'
import { Post } from './types'
import appwriteService from './appwriteService'

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = [
    { name: 'For You', icon: Home },
    { name: 'Watch', icon: Play },
    { name: 'Reels', icon: Video },
    { name: 'Live', icon: Radio },
    { name: 'News', icon: Newspaper },
    { name: 'Following', icon: Users },
  ]

  useEffect(() => {
    loadPosts()
  }, [activeTab])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const result = await appwriteService.fetchPosts(20)
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
        isBoosted: false,
      }))
      setPosts(newPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#121212] min-h-screen">
      <div className="sticky top-0 bg-white dark:bg-[#1F1F1F] z-40 border-b border-[#E5E7EB] dark:border-[#374151]">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-[#1DA1F2]">XapZap</h1>
          <button className="p-2">
            <Search size={28} className="text-black dark:text-white" />
          </button>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === index
                    ? 'border-black dark:border-white text-black dark:text-white'
                    : 'border-transparent text-[#6B7280] hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 0 && <StoryBar />}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#1DA1F2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
