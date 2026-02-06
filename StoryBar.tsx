'use client'

import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import appwriteService from './appwriteService'

interface Story {
  id: string
  username: string
  avatar: string
  isViewed: boolean
}

export function StoryBar() {
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      const result = await appwriteService.fetchStatuses(20)
      const storyData = result.documents.map((doc: any) => ({
        id: doc.$id,
        username: doc.username || 'User',
        avatar: doc.userAvatar || '',
        isViewed: doc.isViewed || false,
      }))
      setStories(storyData)
    } catch (error) {
      console.error('Failed to load stories:', error)
    }
  }

  if (stories.length === 0) return null

  return (
    <div className="h-[110px] overflow-x-auto scrollbar-hide">
      <div className="flex items-center h-full px-1">
        {stories.map((story, index) => (
          <button key={story.id} className="flex-shrink-0 w-[72px] mx-1">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-[68px] h-[68px] flex items-center justify-center mb-1">
                {index !== 0 && !story.isViewed && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#F58529] via-[#DD2A7B] via-[#8134AF] to-[#515BD4]" />
                )}
                {index !== 0 && story.isViewed && (
                  <div className="absolute inset-0 rounded-full bg-black" />
                )}
                <div className="relative w-[62px] h-[62px] rounded-full bg-white dark:bg-[#121212] border-2 border-white dark:border-[#121212] flex items-center justify-center overflow-hidden">
                  {index === 0 ? (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  ) : story.avatar ? (
                    <img src={story.avatar} alt={story.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{story.username[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {index === 0 && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1DA1F2] border-2 border-white dark:border-[#121212] flex items-center justify-center">
                    <Plus size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-xs text-center w-full truncate text-black dark:text-white">
                {story.username}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
