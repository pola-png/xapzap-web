'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, MessageCircle, PlusSquare, Bell, User, Search, Video, Film, Radio, Newspaper, Users } from 'lucide-react'
import { cn } from './utils'
import appwriteService from './appwriteService'

interface MainLayoutWrapperProps {
  children: ReactNode
}

export function MainLayoutWrapper({ children }: MainLayoutWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [userAvatar, setUserAvatar] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user) {
      loadBadges()
      const unsubscribe = setupRealtimeSubscriptions()
      return unsubscribe
    }
  }, [user])

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
    if (!user) return () => {}

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

  const handleCreateClick = async () => {
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      router.push('/auth/signin')
      return
    }
    router.push('/upload')
  }

  const handleNavClick = async (path: string) => {
    const protectedPaths = ['/chat', '/upload', '/notifications', '/profile']
    
    if (protectedPaths.includes(path)) {
      const currentUser = await appwriteService.getCurrentUser()
      if (!currentUser) {
        router.push('/auth/signin')
        return
      }
    }
    
    router.push(path)
  }

  const sidebarItems = [
    { icon: Home, label: 'For You', path: '/' },
    { icon: Video, label: 'Watch', path: '/watch' },
    { icon: Film, label: 'Reels', path: '/reels' },
    { icon: Radio, label: 'Live', path: '/live' },
    { icon: Newspaper, label: 'News', path: '/news' },
    { icon: Users, label: 'Following', path: '/following' },
  ]

  const isHomeTab = ['/', '/watch', '/reels', '/live', '/news', '/following'].includes(pathname)

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-color))] px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">XapZap</h1>
          
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/')} className={cn("p-2 rounded-lg transition-colors", pathname === '/' ? "text-[#1DA1F2]" : "text-[rgb(var(--text-primary))] hover:text-[#1DA1F2]")} aria-label="Home">
              <Home size={24} />
            </button>
            <button onClick={() => handleNavClick('/chat')} className={cn("p-2 rounded-lg transition-colors relative", pathname === '/chat' ? "text-[#1DA1F2]" : "text-[rgb(var(--text-primary))] hover:text-[#1DA1F2]")} aria-label="Chat">
              <MessageCircle size={24} />
              {unreadChats > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">{unreadChats}</span>}
            </button>
            <button onClick={handleCreateClick} className="p-2 rounded-lg text-[rgb(var(--text-primary))] hover:text-[#1DA1F2] transition-colors" aria-label="Create">
              <PlusSquare size={24} />
            </button>
            <button onClick={() => handleNavClick('/notifications')} className={cn("p-2 rounded-lg transition-colors relative", pathname === '/notifications' ? "text-[#1DA1F2]" : "text-[rgb(var(--text-primary))] hover:text-[#1DA1F2]")} aria-label="Notifications">
              <Bell size={24} />
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">{unreadNotifications}</span>}
            </button>
            <button onClick={() => handleNavClick('/profile')} className={cn("p-2 rounded-lg transition-colors", pathname.startsWith('/profile') ? "text-[#1DA1F2]" : "text-[rgb(var(--text-primary))] hover:text-[#1DA1F2]")} aria-label="Profile">
              <User size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/search')} className="p-2 rounded-lg text-[rgb(var(--text-primary))] hover:text-[#1DA1F2] transition-colors" aria-label="Search">
              <Search size={24} />
            </button>
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-9 h-9 rounded-full object-cover cursor-pointer" onClick={() => handleNavClick('/profile')} />
            ) : (
              <div className="w-9 h-9 bg-[rgb(var(--bg-secondary))] rounded-full flex items-center justify-center cursor-pointer" onClick={() => handleNavClick('/profile')}>
                <User size={18} className="text-[rgb(var(--text-primary))]" />
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 pt-[60px]">
          {/* Sidebar */}
          <aside className="fixed left-0 top-[60px] bottom-0 w-[200px] bg-[rgb(var(--bg-primary))] border-r border-[rgb(var(--border-color))] overflow-y-auto">
            <nav className="py-4">
              {sidebarItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-6 py-3 transition-colors",
                      isActive ? "text-[#1DA1F2] bg-[#1DA1F2]/10" : "text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-secondary))]"
                    )}
                  >
                    <Icon size={20} />
                    <span className="text-[15px]">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="ml-[200px] flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {isHomeTab && (
          <header className="sticky top-0 z-50 bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-color))]">
            <div className="flex items-center justify-between px-4 py-3">
              <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">XapZap</h1>
              <button onClick={() => router.push('/search')} className="p-2 text-[rgb(var(--text-primary))]" aria-label="Search">
                <Search size={20} />
              </button>
            </div>
          </header>
        )}
        {isHomeTab && (
          <div className="sticky top-14 z-40 bg-[rgb(var(--bg-primary))] border-b border-[rgb(var(--border-color))]">
            <div className="flex overflow-x-auto scrollbar-hide -mb-px">
              <div className="flex gap-4 px-4 min-w-max sm:gap-6">
                {sidebarItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      "px-3 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
                      pathname === item.path
                        ? "border-[#1DA1F2] text-[#1DA1F2]"
                        : "border-transparent text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--text-primary))]/50 hover:text-[rgb(var(--text-primary))]"
                    )}
                    aria-label={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <main className="pb-20">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 bg-[rgb(var(--bg-primary))] border-t border-[rgb(var(--border-color))] safe-area-inset-bottom">
          <div className="flex items-center justify-around py-2 px-2">
            {[
              { icon: Home, path: '/', label: 'Home' },
              { icon: MessageCircle, path: '/chat', label: 'Chat', badge: unreadChats },
              { icon: PlusSquare, path: '/upload', label: 'Create', onClick: handleCreateClick },
              { icon: Bell, path: '/notifications', label: 'Notifications', badge: unreadNotifications },
              { icon: User, path: '/profile', label: 'Profile' }
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={item.onClick || (() => handleNavClick(item.path))}
                  className={cn(
                    "p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-colors relative",
                    pathname === item.path ? "text-[#1DA1F2]" : "text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-secondary))]"
                  )}
                  aria-label={item.label}
                >
                  <Icon size={24} />
                  {item.badge && item.badge > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">{item.badge}</span>}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
