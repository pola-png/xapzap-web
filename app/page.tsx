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