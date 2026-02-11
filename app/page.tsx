'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '../MainLayout'
import { HomeScreen } from '../HomeScreen'
import { ChatScreen } from '../ChatScreen'
import { NotificationsScreen, SearchScreen } from '../screens'
import { ProfileScreen } from '../ProfileScreen'
import { DashboardScreen } from '../DashboardScreen'
import { AuthScreen } from '../AuthScreen'
import { UploadScreen } from '../UploadScreen'
import { WatchScreen } from '../WatchScreen'
import { ReelsScreen } from '../ReelsScreen'
import { LiveScreen } from '../LiveScreen'
import { NewsScreen } from '../NewsScreen'
import { FollowingScreen } from '../FollowingScreen'
import appwriteService from '../appwriteService'
import type { Metadata } from 'next'


export default function Home() {
  const [currentTab, setCurrentTab] = useState(0)
  const [isGuest, setIsGuest] = useState(true) // Start as guest, check auth on mount
  const [authRefreshTrigger, setAuthRefreshTrigger] = useState(0)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      setIsGuest(!user) // If user exists, not a guest
    } catch (error) {
      setIsGuest(true) // No user, is guest
    }
  }

  const handleAuthSuccess = () => {
    setIsGuest(false)
    setCurrentTab(0)
    setAuthRefreshTrigger(prev => prev + 1) // Trigger refresh in MainLayout
  }

  const renderScreen = () => {
    switch (currentTab) {
      case 0: return <HomeScreen />
      case 1: return <ChatScreen />
      case 2: return <UploadScreen onClose={() => setCurrentTab(0)} />
      case 3: return <NotificationsScreen />
      case 4: return <ProfileScreen />
      case 5: return <DashboardScreen />
      case 6: return <AuthScreen onAuthSuccess={handleAuthSuccess} />
      case 7: return <WatchScreen />
      case 8: return <ReelsScreen />
      case 9: return <LiveScreen />
      case 10: return <NewsScreen />
      case 11: return <FollowingScreen />
      default: return <HomeScreen />
    }
  }

  const handleCreateClick = () => setCurrentTab(2) // Navigate to upload screen

  const handleTabChange = (tab: number) => setCurrentTab(tab)

  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onCreateClick={handleCreateClick}
      isGuest={isGuest}
      authRefreshTrigger={authRefreshTrigger}
    >
      {renderScreen()}
    </MainLayout>
  )
}
