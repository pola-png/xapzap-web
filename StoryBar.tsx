'use client'

import { Plus } from 'lucide-react'

export function StoryBar() {
  const stories = [
    { id: '1', username: 'Your Story', avatar: '', isViewed: false },
    { id: '2', username: 'alice_wonder', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100', isViewed: false },
    { id: '3', username: 'bob_builder', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isViewed: true },
    { id: '4', username: 'carol_singer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', isViewed: false },
  ]

  return (
    <div className="p-4 border-b border-[#E5E7EB] dark:border-[#374151]">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {stories.map((story, index) => (
          <button key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`relative w-16 h-16 rounded-full p-0.5 ${
              index === 0 
                ? 'bg-gray-300' 
                : story.isViewed 
                  ? 'bg-gray-300' 
                  : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'
            }`}>
              <div className="w-full h-full rounded-full bg-white dark:bg-[#1F1F1F] p-0.5">
                {index === 0 ? (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <Plus size={20} className="text-gray-500" />
                  </div>
                ) : story.avatar ? (
                  <img src={story.avatar} alt={story.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium">{story.username[0].toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-center max-w-[64px] truncate text-black dark:text-white">
              {index === 0 ? 'Your Story' : story.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
