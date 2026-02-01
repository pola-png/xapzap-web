'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'

interface SearchScreenProps {
  onClose: () => void
}

export function SearchScreen({ onClose }: SearchScreenProps) {
  const [query, setQuery] = useState('')

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full">
            <X size={20} />
          </button>
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search XapZap"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
              autoFocus
            />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {query ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Search results for "{query}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-semibold">Trending</h2>
            <div className="space-y-2">
              {['#TechNews', '#WebDevelopment', '#AI', '#React', '#NextJS'].map((tag) => (
                <div key={tag} className="p-3 hover:bg-accent rounded-lg cursor-pointer">
                  <p className="font-medium">{tag}</p>
                  <p className="text-sm text-muted-foreground">Trending in Technology</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function NotificationsScreen() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="text-center py-12">
        <p className="text-muted-foreground">No notifications yet</p>
        <p className="text-sm text-muted-foreground mt-2">We'll notify you when something happens!</p>
      </div>
    </div>
  )
}

// Export detail screens
export { CommentScreen } from './CommentScreen'
export { PostDetailScreen } from './PostDetailScreen'
export { VideoDetailScreen } from './VideoDetailScreen'
export { ImageDetailScreen } from './ImageDetailScreen'