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
    <div className="flex justify-center py-3">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-1">
        {stories.map((story, index) => (
          <button key={story.id} className="flex-shrink-0 w-[72px]">
            <div className="flex flex-col items-center">
              <div className="relative w-[68px] h-[68px] flex items-center justify-center">
                {/* Gradient ring for unviewed stories */}
                {index !== 0 && !story.isViewed && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#F58529] via-[#DD2A7B] via-[#8134AF] to-[#515BD4]" />
                )}
                {/* Black ring for viewed stories */}
                {index !== 0 && story.isViewed && (
                  <div className="absolute inset-0 rounded-full bg-black" />
                )}
                {/* Inner white circle */}
                <div className="relative w-[62px] h-[62px] rounded-full bg-white dark:bg-[#121212] border-2 border-white dark:border-[#121212] flex items-center justify-center overflow-hidden">
                  {index === 0 ? (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">👤</span>
                    </div>
                  ) : story.avatar ? (
                    <img src={story.avatar} alt={story.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{story.username[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {/* Plus icon for "Your Story" */}
                {index === 0 && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1DA1F2] border-2 border-white dark:border-[#121212] flex items-center justify-center">
                    <Plus size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-xs mt-1 text-center w-full truncate text-black dark:text-white">
                {story.username}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
