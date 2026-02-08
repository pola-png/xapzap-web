'use client'

import { useState } from 'react'
import MainLayout from '../MainLayout'
import HomeScreen from '../HomeScreen'
import ChatScreen from '../ChatScreen'
import { CreatePostModal } from '../CreatePostModal-enhanced'
import { SearchScreen, NotificationsScreen } from '../screens'
import ProfileScreen from '../ProfileScreen'
import AuthScreen from '../AuthScreen'
import DashboardScreen from '../DashboardScreen' // example extra
import MonetizationScreen from '../MonetizationScreen'

export default function Home() {
  const [currentTab, setCurrentTab] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [isGuest, setIsGuest] = useState(false) // TODO: from auth

  const renderScreen = () => {
    switch (currentTab) {
      case 0: return <HomeScreen />
      case 1: return <ChatScreen />
      case 2: return setShowCreate(true) || <div />
      case 3: return <NotificationsScreen />
      case 4: return <ProfileScreen />
      case 5: return <DashboardScreen />
      case 6: return <AuthScreen />
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
        <CreatePostModal onClose={() => setShowCreate(false)} />
      )}
    </>
  )
}