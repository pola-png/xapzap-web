'use client'

import { ReactNode, useState, useEffect } from 'react'
import { Home, MessageCircle, PlusSquare, Bell, User, Search } from 'lucide-react'
import { cn } from './utils'
import appwriteService from './appwriteService'

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
    { icon: Bell, label: 'Notifications', index: 3, badge: unreadNotifications > 0 ? unreadNotifications : null },
    { icon: User, label: 'Profile', index: 4, badge: null },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-16 bg-background border-r border-border flex flex-col z-40">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold text-xapzap-blue">XapZap</h1>
          </div>
          <nav className="flex-1 p-6 space-y-6 flex flex-col items-center overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.index
              const badge = item.badge
              
              return (
                <button
                  key={item.index}
                  onClick={() => onTabChange(item.index)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center p-3 transition-all group",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg border border-primary/50 font-medium" 
                      : "hover:bg-accent hover:text-foreground text-muted-foreground"
                  )}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.label}</span>
                  {badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border mt-auto">
            {isGuest ? (
              <button
                onClick={() => onTabChange(6)}
                className="w-full px-4 py-2 bg-xapzap-blue text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center space-x-3 p-3 hover:bg-accent rounded-xl cursor-pointer" onClick={() => onTabChange(6)}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{user?.name || 'Profile'}</p>
                  <p className="text-xs text-muted-foreground">View profile</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Header */}
        <header className="fixed top-0 left-16 right-0 z-50 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <button
            title="Search"
            onClick={onSearchClick}
            className="p-3 rounded-xl hover:bg-accent transition-colors flex items-center space-x-2"
            aria-label="Search XapZap"
          >
            <Search size={20} />
            <span className="hidden lg:inline text-sm font-medium">Search</span>
          </button>
          {isGuest ? (
            <button
              onClick={() => onTabChange(6)}
              className="px-6 py-2 bg-xapzap-blue text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center space-x-3 p-2 hover:bg-accent rounded-xl cursor-pointer" onClick={() => onTabChange(6)}>
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-muted" />
              ) : (
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center ring-2 ring-muted">
                  <User size={18} />
                </div>
              )}
              <div className="hidden lg:block">
                <p className="font-medium text-sm">{user?.name || 'Profile'}</p>
                <p className="text-xs text-muted-foreground">View profile</p>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="ml-16 pt-20 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
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
                title="Search"
                onClick={onSearchClick}
                className="p-2 rounded-full hover:bg-accent transition-colors"
                aria-label="Search XapZap"
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