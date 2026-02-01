'use client'

import { ReactNode } from 'react'
import { Home, MessageCircle, PlusSquare, Upload, Zap, Bell, User, Search } from 'lucide-react'
import { cn } from './utils'

interface MainLayoutProps {
  children: ReactNode
  currentTab: number
  onTabChange: (tab: number) => void
  onSearchClick: () => void
  isGuest?: boolean
}

export function MainLayout({ children, currentTab, onTabChange, onSearchClick, isGuest = false }: MainLayoutProps) {
  const navItems = [
    { icon: Home, label: 'Home', index: 0 },
    { icon: MessageCircle, label: 'Chat', index: 1 },
    { icon: PlusSquare, label: 'Create', index: 2 },
    { icon: Upload, label: 'Upload', index: 3 },
    { icon: Zap, label: 'Updates', index: 4 },
    { icon: Bell, label: 'Notifications', index: 5 },
    { icon: User, label: 'Profile', index: 6 },
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
                        "p-2 rounded-full transition-colors",
                        isActive 
                          ? "text-xapzap-blue" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon size={26} />
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
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User size={16} />
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
                    "flex flex-col items-center p-2 transition-colors",
                    isActive 
                      ? "text-xapzap-blue" 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon size={28} />
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}