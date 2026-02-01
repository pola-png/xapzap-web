'use client'

import { Plus } from 'lucide-react'
import { Story } from './types'

const mockStories: Story[] = [
  { id: '1', username: 'Your Story', imageUrl: '', isViewed: false },
  { id: '2', username: 'alice_wonder', imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100', isViewed: false },
  { id: '3', username: 'bob_builder', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isViewed: true },
  { id: '4', username: 'carol_singer', imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', isViewed: false },
  { id: '5', username: 'dave_coder', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', isViewed: true },
]

export function StoryBar() {
  return (
    <div className="p-4">
      <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
        {mockStories.map((story, index) => (
          <button
            key={story.id}
            className="flex-shrink-0 flex flex-col items-center space-y-2 group"
          >
            <div className={`relative w-16 h-16 rounded-full p-0.5 ${
              index === 0 
                ? 'bg-gradient-to-tr from-gray-300 to-gray-400' 
                : story.isViewed 
                  ? 'bg-gray-300' 
                  : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'
            }`}>
              <div className="w-full h-full rounded-full bg-background p-0.5">
                {index === 0 ? (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                    <Plus size={20} className="text-muted-foreground" />
                  </div>
                ) : story.imageUrl ? (
                  <img 
                    src={story.imageUrl} 
                    alt={story.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">{story.username[0].toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-center max-w-[64px] truncate">
              {index === 0 ? 'Your Story' : story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}