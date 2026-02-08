'use client'

import { useState } from 'react'
import { MainLayout } from '../MainLayout'
import { HomeScreen } from '../HomeScreen'
import { ChatScreen } from '../ChatScreen'
import { NotificationsScreen, SearchScreen } from '../screens'
import { ProfileScreen } from '../ProfileScreen'
import { DashboardScreen } from '../DashboardScreen'
import { AuthScreen } from '../AuthScreen'
import { CreatePostModal } from '../CreatePostModal-enhanced'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'XapZap - Posts, Videos, Reels, News & More',
  description: 'Discover trending posts, videos, reels, live streams, news articles and content from people you follow on XapZap. Social media platform for sharing and connecting.',
  keywords: 'social media, posts, videos, reels, news, live, stories, chat, trending, viral videos, breaking news, social network',
  openGraph: {
    title: 'XapZap - Social Media: Posts Videos Reels News Live',
    description: 'Join XapZap to share posts, videos, reels, stories, chat and discover news. Follow friends and trending content.',
    url: '/',
    siteName: 'XapZap',
    images: [
      {
        url: '/og-home.jpg',
        width: 1200,
        height: 630,
        alt: 'XapZap Social Media Home - Posts Videos News',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XapZap - Posts Videos Reels News',
    description: 'Social platform for posts, videos, reels, live, news and chats.',
    images: ['/twitter-home.jpg'],
  },
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [isGuest, setIsGuest] = useState(false) // TODO: from auth

  const renderScreen = () => {
    switch (currentTab) {
      case 0: return <HomeScreen />
      case 1: return <ChatScreen />
      case 2: setShowCreate(true); return <div />;
      case 3: return <NotificationsScreen />
      case 4: return <ProfileScreen />
      case 5: return <DashboardScreen />
      case 6: return <AuthScreen onAuthSuccess={() => { setIsGuest(false); setCurrentTab(0); }} />
      default: return <HomeScreen />
    }
  }

  const handleSearchClick = () => setShowSearch(true)

  const handleTabChange = (tab: number) => setCurrentTab(tab)

  return (
    <>
      <MainLayout 
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSearchClick={handleSearchClick}
        isGuest={isGuest}
      >
        {renderScreen()}
      </MainLayout>
      {showSearch && (
        <SearchScreen onClose={() => setShowSearch(false)} />
      )}
      {showCreate && (
        <CreatePostModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      )}
    </>
  )
}