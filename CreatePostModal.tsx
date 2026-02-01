'use client'

import { useState } from 'react'
import { X, Image, Video, Smile, MapPin } from 'lucide-react'
import { cn } from './utils'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<File[]>([])
  const [postType, setPostType] = useState<'standard' | 'video' | 'reel' | 'news'>('standard')

  const handleSubmit = () => {
    console.log('Creating post:', { content, selectedMedia, postType })
    setContent('')
    setSelectedMedia([])
    setPostType('standard')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { type: 'standard' as const, label: 'Image / Text', icon: '🖼️' },
              { type: 'video' as const, label: 'Video', icon: '🎥' },
              { type: 'reel' as const, label: 'Reel', icon: '🎬' },
              { type: 'news' as const, label: 'News / Blog', icon: '📰' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setPostType(item.type)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  postType === item.type
                    ? "bg-xapzap-blue text-white"
                    : "bg-muted hover:bg-accent"
                )}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="font-medium">U</span>
            </div>
            <div>
              <p className="font-medium">Your Name</p>
              <p className="text-sm text-muted-foreground">@username</p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[120px] p-3 bg-muted rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
          />

          {selectedMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {selectedMedia.map((file, index) => (
                <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedMedia((prev: File[]) => prev.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer p-2 hover:bg-accent rounded-full transition-colors">
                <Image size={20} className="text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setSelectedMedia((prev: File[]) => [...prev, ...files])
                  }}
                />
              </label>
              
              <label className="cursor-pointer p-2 hover:bg-accent rounded-full transition-colors">
                <Video size={20} className="text-muted-foreground" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setSelectedMedia((prev: File[]) => [...prev, ...files])
                  }}
                />
              </label>
              
              <button className="p-2 hover:bg-accent rounded-full transition-colors">
                <Smile size={20} className="text-muted-foreground" />
              </button>
              
              <button className="p-2 hover:bg-accent rounded-full transition-colors">
                <MapPin size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="text-sm text-muted-foreground">
              {content.length}/280
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Everyone can reply
            </div>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() && selectedMedia.length === 0}
              className={cn(
                "px-6 py-2 rounded-full font-medium transition-colors",
                content.trim() || selectedMedia.length > 0
                  ? "bg-xapzap-blue text-white hover:bg-xapzap-darkBlue"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}