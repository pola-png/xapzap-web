'use client'

import { ReactNode, useState, useEffect } from 'react'
import { Home, MessageCircle, PlusSquare, Upload, Zap, Bell, User, Search } from 'lucide-react'
import { cn } from './utils'
import appwriteService from './appwrite'

interface MainLayoutProps {
  children: ReactNode
  currentTab: number
  onTabChange: (tab: number) => void
  onSearchClick: () => void
  isGuest?: boolean
}

export function MainLayout({ children, currentTab, onTabChange, onSearchClick, isGuest = false }: MainLayoutProps) {
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [userAvatar, setUserAvatar] = useState('')

  useEffect(() => {
    loadUserData()
    if (!isGuest) {
      loadBadges()
      setupRealtimeSubscriptions()
    }
  }, [isGuest])

  const loadUserData = async () => {
    try {
      const currentUser = await appwriteService.getCurrentUser()
      setUser(currentUser)
      
      if (currentUser) {
        const profile = await appwriteService.getProfileByUserId(currentUser.$id)
        setUserAvatar(profile?.avatarUrl || '')
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const loadBadges = async () => {
    if (!user) return
    
    try {
      const [chatCount, notifCount] = await Promise.all([
        appwriteService.getUnreadChatCount(user.$id),
        appwriteService.getUnreadNotificationCount(user.$id)
      ])
      
      setUnreadChats(chatCount)
      setUnreadNotifications(notifCount)
    } catch (error) {
      console.error('Failed to load badges:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!user) return

    const unsubscribeMessages = appwriteService.subscribeToCollection('messages', () => {
      loadBadges()
    })

    const unsubscribeNotifications = appwriteService.subscribeToCollection('notifications', () => {
      loadBadges()
    })

    return () => {
      unsubscribeMessages()
      unsubscribeNotifications()
    }
  }

  const navItems = [
    { icon: Home, label: 'Home', index: 0, badge: null },
    { icon: MessageCircle, label: 'Chat', index: 1, badge: unreadChats > 0 ? unreadChats : null },
    { icon: PlusSquare, label: 'Create', index: 2, badge: null },
    { icon: Upload, label: 'Upload', index: 3, badge: null },
    { icon: Zap, label: 'Updates', index: 4, badge: null },
    { icon: Bell, label: 'Notifications', index: 5, badge: unreadNotifications > 0 ? unreadNotifications : null },
    { icon: User, label: 'Profile', index: 6, badge: null },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-xapzap-blue">XapZap</h1>
              
              <nav className="flex items-center space-x-7">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.index
                  
                  return (
                    <button
                      key={item.index}
                      onClick={() => onTabChange(item.index)}
                      className={cn(
                        "p-2 rounded-full transition-colors relative",
                        isActive 
                          ? "text-xapzap-blue" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon size={26} />
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={onSearchClick}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <Search size={20} />
              </button>
              
              {isGuest ? (
                <button
                  onClick={() => onTabChange(6)}
                  className="px-4 py-2 bg-xapzap-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-16">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold text-xapzap-blue">XapZap</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={onSearchClick}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <Search size={20} />
              </button>
              {isGuest && (
                <button
                  onClick={() => onTabChange(6)}
                  className="px-3 py-1 bg-xapzap-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pb-16">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.index
              
              return (
                <button
                  key={item.index}
                  onClick={() => onTabChange(item.index)}
                  className={cn(
                    "flex flex-col items-center p-2 transition-colors relative",
                    isActive 
                      ? "text-xapzap-blue" 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon size={28} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}