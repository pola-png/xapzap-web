'use client'

import { useState, useEffect } from 'react'
import { AuthScreen } from '../AuthScreen'
import { MainLayout } from '../MainLayout'
import { HomeScreen } from '../HomeScreen'
import { ChatScreen } from '../ChatScreen'
import { UploadScreen } from '../UploadScreen'
import { UpdatesScreen } from '../UpdatesScreen'
import { ProfileScreen } from '../ProfileScreen'
import { NotificationsScreen, SearchScreen } from '../screens'
import { CreatePostModal } from '../CreatePostModal'
import { RealtimeStatus } from '../RealtimeStatus'
import appwriteService from '../appwrite'

function App() {
  const [currentTab, setCurrentTab] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await appwriteService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleTabChange = (tab: number) => {
    // Check if user needs auth for certain tabs
    if (!user && (tab === 1 || tab === 3 || tab === 4 || tab === 5 || tab === 6)) {
      setShowAuth(true)
      return
    }
    
    if (tab === 2) {
      if (!user) {
        setShowAuth(true)
        return
      }
      setShowCreatePost(true)
    } else {
      setCurrentTab(tab)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    checkAuthState()
  }

  const screens = [
    <HomeScreen key="home" isGuest={!user} />,
    <ChatScreen key="chat" />,
    null,
    <UploadScreen key="upload" />,
    <UpdatesScreen key="updates" />,
    <NotificationsScreen key="notifications" />,
    <ProfileScreen key="profile" />,
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-xapzap-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (showAuth) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  if (showSearch) {
    return (
      <>
        <SearchScreen onClose={() => setShowSearch(false)} />
        <RealtimeStatus />
      </>
    )
  }

  return (
    <>
      <MainLayout
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSearchClick={() => setShowSearch(true)}
        isGuest={!user}
      >
        {screens[currentTab]}
      </MainLayout>
      
      <CreatePostModal 
        isOpen={showCreatePost} 
        onClose={() => setShowCreatePost(false)} 
      />
      
      <RealtimeStatus />
    </>
  )
}

export default function Home() {
  return <App />
}