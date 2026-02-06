'use client'

import { useState, useEffect } from 'react'
import { Search, Home, MessageCircle, PlusSquare, Upload, Zap, Bell, User } from 'lucide-react'
import { PostCard } from './PostCard'
import { StoryBar } from './StoryBar'
import { Post } from './types'
import appwriteService from './appwriteService'

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ['For You', 'Watch', 'Reels', 'Live', 'News', 'Following']
  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: MessageCircle, label: 'Chat' },
    { icon: PlusSquare, label: 'Create' },
    { icon: Upload, label: 'Upload' },
    { icon: Zap, label: 'Updates' },
    { icon: Bell, label: 'Notifications' },
    { icon: User, label: 'Profile' },
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
    <div className="min-h-screen bg-white dark:bg-[#121212] pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white dark:bg-[#121212] z-50 border-b border-gray-200 dark:border-gray-800">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-2xl font-bold text-[#1DA1F2]">XapZap</h1>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <Search size={24} className="text-gray-900 dark:text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(index)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === index
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Story Bar */}
      {activeTab === 0 && <StoryBar />}

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#1DA1F2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p>No posts yet</p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1F1F1F] border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = index === 0
            return (
              <button
                key={item.label}
                className={`flex flex-col items-center p-2 transition-colors ${
                  isActive ? 'text-[#1DA1F2]' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={28} />
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
