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
  const [stories, setStories] = useState<Story[]>([{ id: 'your-story', username: 'Your Story', avatar: '', isViewed: false }])

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
      setStories([{ id: 'your-story', username: 'Your Story', avatar: '', isViewed: false }, ...storyData])
    } catch (error) {
      console.error('Failed to load stories:', error)
    }
  }

  return (
    <div className="h-[110px] overflow-x-auto scrollbar-hide border-b border-[rgb(var(--border-color))]">
      <div className="flex items-center h-full px-4 gap-4">
        {stories.map((story, index) => (
          <button key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="relative w-[68px] h-[68px] flex items-center justify-center">
              {index === 0 ? (
                <div className="w-[68px] h-[68px] rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center">
                  <div className="w-[62px] h-[62px] rounded-full bg-[rgb(var(--bg-primary))] border-2 border-[rgb(var(--bg-secondary))] flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#1DA1F2] border-2 border-[rgb(var(--bg-primary))] flex items-center justify-center">
                    <Plus size={14} className="text-white" strokeWidth={3} />
                  </div>
                </div>
              ) : (
                <>
                  <div className={`absolute inset-0 rounded-full ${story.isViewed ? 'bg-[rgb(var(--bg-secondary))]' : 'bg-gradient-to-tr from-[#FEDA75] via-[#F58529] via-[#DD2A7B] via-[#8134AF] to-[#515BD4]'}`} />
                  <div className="relative w-[62px] h-[62px] rounded-full bg-[rgb(var(--bg-primary))] border-2 border-[rgb(var(--bg-primary))] flex items-center justify-center overflow-hidden">
                    {story.avatar ? (
                      <img src={story.avatar} alt={story.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center text-[rgb(var(--text-primary))] text-sm font-bold">
                        {story.username[0]}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <span className="text-xs text-[rgb(var(--text-primary))] text-center w-[68px] truncate">{story.username}</span>
          </button>
        ))}
      </div>
    </div>
  )
}