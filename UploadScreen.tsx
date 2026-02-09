'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Video, Image, Newspaper, Film, Plus, Loader2 } from 'lucide-react'
import appwriteService from './appwriteService'

interface UploadScreenProps {
  onClose: () => void
}

export function UploadScreen({ onClose }: UploadScreenProps) {
  const [selectedType, setSelectedType] = useState<'video' | 'reel' | 'image' | 'news' | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [textBgColor, setTextBgColor] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null)
  const [generatedThumbnail, setGeneratedThumbnail] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showThumbnailModal, setShowThumbnailModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Theme detection
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark)
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const contentTypes = [
    { id: 'video', label: 'Video', icon: Video, description: 'Upload a video post' },
    { id: 'reel', label: 'Reel', icon: Film, description: 'Upload a short vertical video' },
    { id: 'image', label: 'Image', icon: Image, description: 'Share a photo or image' },
    { id: 'news', label: 'News', icon: Newspaper, description: 'Publish news article' }
  ] as const

  const textColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ]

  const generateVideoThumbnail = (videoFile: File): Promise<File | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.preload = 'metadata'
      video.src = URL.createObjectURL(videoFile)
      video.currentTime = 1 // Seek to 1 second

      video.onloadedmetadata = () => {
        canvas.width = 320
        canvas.height = (video.videoHeight / video.videoWidth) * 320

        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
              if (blob) {
                const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' })
                resolve(thumbnailFile)
              } else {
                resolve(null)
              }
            }, 'image/jpeg', 0.8)
          } else {
            resolve(null)
          }
        }
      }

      video.onerror = () => resolve(null)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Generate thumbnail for videos
      if ((selectedType === 'video' || selectedType === 'reel') && file.type.startsWith('video/')) {
        try {
          const thumbnail = await generateVideoThumbnail(file)
          if (thumbnail) {
            setGeneratedThumbnail(thumbnail)
            console.log('Generated thumbnail:', thumbnail.name)
          }
        } catch (error) {
          console.error('Failed to generate thumbnail:', error)
        }
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedType) return

    setUploading(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      let mediaUrl = ''
      let thumbnailUrl = ''

      // Upload file if selected
      if (selectedFile) {
        const fileId = `${user.$id}_${Date.now()}_${selectedFile.name}`
        const uploadedFile = await appwriteService.uploadFile(selectedFile, fileId)
        mediaUrl = uploadedFile.url

        // For videos, handle thumbnail upload
        if (selectedType === 'video' || selectedType === 'reel') {
          // Use custom thumbnail if provided, otherwise use generated thumbnail
          const thumbnailToUpload = customThumbnail || generatedThumbnail
          if (thumbnailToUpload) {
            const thumbnailId = `${user.$id}_thumb_${Date.now()}.jpg`
            const uploadedThumbnail = await appwriteService.uploadFile(thumbnailToUpload, thumbnailId)
            thumbnailUrl = uploadedThumbnail.url
          } else {
            // Fallback to video URL if no thumbnail available
            thumbnailUrl = mediaUrl
          }
        }
      }

      // Prepare post data based on type
      const postData: any = {
        userId: user.$id,
        username: user.name || 'User',
        kind: selectedType,
        createdAt: new Date().toISOString()
      }

      // Add content/caption (required for all types)
      if (content.trim()) {
        postData.content = content.trim()
      }

      // Add type-specific fields
      if (selectedType === 'video') {
        postData.videoUrl = mediaUrl
        postData.thumbnailUrl = thumbnailUrl
        if (title.trim()) postData.title = title.trim()
        if (description.trim()) postData.description = description.trim()
      } else if (selectedType === 'reel') {
        postData.videoUrl = mediaUrl
        postData.thumbnailUrl = thumbnailUrl
        // Reels only have caption, no title/description
      } else if (selectedType === 'image') {
        postData.imageUrl = mediaUrl
      } else if (selectedType === 'news') {
        if (title.trim()) postData.title = title.trim()
        // News content goes in the content field
      }

      // Add text background color for text-only posts
      if (textBgColor && content.trim() && !selectedFile) {
        postData.textBgColor = textBgColor
      }

      // Create the post
      await appwriteService.createPost(postData)

      // Reset form and close
      setSelectedType(null)
      setContent('')
      setTitle('')
      setDescription('')
      setTextBgColor('')
      setSelectedFile(null)
      setCustomThumbnail(null)
      setGeneratedThumbnail(null)
      setPreviewUrl(null)
      setThumbnailPreviewUrl(null)
      onClose()

    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const renderTypeSelection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {contentTypes.map((type) => {
        const Icon = type.icon
        return (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`p-6 border-2 border-dashed rounded-xl hover:border-blue-500 transition-colors text-center ${
              isDark
                ? 'border-gray-600 hover:bg-gray-800 text-gray-200'
                : 'border-gray-300 hover:bg-blue-50 text-gray-700'
            }`}
          >
            <Icon size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <h3 className={`font-semibold text-lg mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{type.label}</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{type.description}</p>
          </button>
        )
      })}
    </div>
  )

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCustomThumbnail(file)
      const url = URL.createObjectURL(file)
      setThumbnailPreviewUrl(url)
    }
  }

  const renderUploadForm = () => {
    const currentType = contentTypes.find(t => t.id === selectedType)
    if (!currentType) return null

    const Icon = currentType.icon

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
        {/* Left Side - Media Preview */}
        <div className="space-y-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</h2>

          {/* Media Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-center ${
              isDark
                ? 'border-gray-600 hover:bg-gray-700 bg-gray-800'
                : 'border-gray-300 hover:bg-gray-50 bg-gray-100'
            }`}
          >
            {previewUrl ? (
              <div className="relative w-full h-full">
                {selectedType === 'image' ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <video src={previewUrl} className="w-full h-full object-cover rounded-lg" controls />
                )}
                <div className={`absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity`}>
                  <p className="text-white text-sm font-medium">Click to change</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upload {selectedType}</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedType === 'video' && 'MP4, MOV up to 100MB'}
                  {selectedType === 'reel' && 'MP4, MOV up to 50MB (vertical)'}
                  {selectedType === 'image' && 'JPG, PNG up to 10MB'}
                </p>
              </div>
            )}
          </div>

          {/* Custom Thumbnail Upload (for videos only) */}
          {(selectedType === 'video' || selectedType === 'reel') && (
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Custom Thumbnail (Optional)
              </label>
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className={`aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-center ${
                  isDark
                    ? 'border-gray-600 hover:bg-gray-700 bg-gray-800'
                    : 'border-gray-300 hover:bg-gray-50 bg-gray-100'
                }`}
              >
                {thumbnailPreviewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-full h-full object-cover rounded-lg" />
                    <div className={`absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity`}>
                      <p className="text-white text-xs">Change thumbnail</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Image size={24} className={`mx-auto mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add thumbnail</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={
              selectedType === 'video' || selectedType === 'reel' ? 'video/*' :
              selectedType === 'image' ? 'image/*' : ''
            }
            onChange={handleFileSelect}
            className="hidden"
            aria-label={`Upload ${selectedType}`}
          />
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailSelect}
            className="hidden"
            aria-label="Upload thumbnail"
          />
        </div>

        {/* Right Side - Form Fields */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Icon size={24} className="text-blue-500" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Details</h2>
          </div>

          {/* Title (for videos and news) */}
          {(selectedType === 'video' || selectedType === 'news') && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedType === 'video' ? 'Title' : 'News Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedType === 'video' ? 'Add a title to your video' : 'Enter news title'}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}

          {/* Description (for videos only) */}
          {selectedType === 'video' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers about your video"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}

          {/* Caption (for all types) */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {selectedType === 'reel' ? 'Caption' : 'Caption'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                selectedType === 'news' ? 'Write your news article...' :
                selectedType === 'reel' ? 'Add a caption to your reel...' :
                selectedType === 'video' ? 'Add a caption...' :
                'Write a caption...'
              }
              rows={selectedType === 'reel' ? 2 : 4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Text Background Color (only for text-only posts) */}
          {content.trim() && !selectedFile && selectedType === null && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Text Background (Optional)</label>
              <div className="flex gap-2 flex-wrap">
                {textColors.map((color, index) => (
                  <button
                    key={color}
                    onClick={() => setTextBgColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${textBgColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select background color ${index + 1}`}
                    title={`Color ${index + 1}`}
                  />
                ))}
                {textBgColor && (
                  <button
                    onClick={() => setTextBgColor('')}
                    className={`px-3 py-1 text-sm border rounded-full transition-colors ${
                      isDark
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                    title="Clear background color"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preview for text background */}
          {content.trim() && textBgColor && !selectedFile && selectedType === null && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Preview</label>
              <div
                className="p-4 rounded-xl max-w-sm"
                style={{ backgroundColor: textBgColor || undefined }}
              >
                <p className="text-white text-center font-bold">{content}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              onClick={() => setSelectedType(null)}
              className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                isDark
                  ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
              title="Go back to type selection"
            >
              Back
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || (!content.trim() && !selectedFile)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              title={uploading ? "Uploading post..." : "Create and publish post"}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Description Modal
  if (showDescriptionModal) {
    return (
      <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={() => setShowDescriptionModal(false)}
              className="p-2 hover:bg-accent rounded-full"
              aria-label="Close description editor"
            >
              <X size={20} />
            </button>
            <h1 className="text-lg font-semibold">Description</h1>
            <button
              onClick={() => setShowDescriptionModal(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              aria-label="Save description"
            >
              Done
            </button>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video..."
              className={`w-full h-full resize-none border-0 bg-transparent text-lg ${
                isDark ? 'text-white placeholder-gray-400' : 'text-gray-900'
              }`}
              autoFocus
            />
          </div>
        </div>
      </div>
    )
  }

  // Thumbnail Modal
  if (showThumbnailModal) {
    return (
      <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={() => setShowThumbnailModal(false)}
              className="p-2 hover:bg-accent rounded-full"
              aria-label="Close thumbnail editor"
            >
              <X size={20} />
            </button>
            <h1 className="text-lg font-semibold">Thumbnail</h1>
            <button
              onClick={() => setShowThumbnailModal(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              aria-label="Save thumbnail"
            >
              Done
            </button>
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className={`aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-center ${
                  isDark
                    ? 'border-gray-600 hover:bg-gray-700 bg-gray-800'
                    : 'border-gray-300 hover:bg-gray-50 bg-gray-100'
                }`}
              >
                {thumbnailPreviewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-full h-full object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm">Change thumbnail</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Image size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add thumbnail</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>JPG, PNG up to 5MB</p>
                  </div>
                )}
              </div>
              {thumbnailPreviewUrl && (
                <button
                  onClick={() => {
                    setCustomThumbnail(null)
                    setThumbnailPreviewUrl(null)
                  }}
                  className="w-full px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
                >
                  Remove thumbnail
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Initial type selection modal
  if (!selectedType) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
        <div className={`w-full max-w-sm rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl animate-in slide-in-from-bottom duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Post</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Close upload screen"
          >
            <X size={20} />
          </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-xl border transition-colors text-center ${
                      isDark
                        ? 'border-gray-600 hover:bg-gray-700 text-gray-200'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main upload screen (native app style)
  return (
    <div className={`h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <button
                onClick={() => setSelectedType(null)}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Go back to type selection"
              >
                <X size={20} />
              </button>
          <h1 className="text-lg font-semibold">New Post</h1>
          <button
            onClick={handleUpload}
            disabled={uploading || (!content.trim() && !selectedFile)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Media Preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-500 transition-colors flex items-center justify-center ${
                isDark
                  ? 'border-gray-600 hover:bg-gray-700 bg-gray-800'
                  : 'border-gray-300 hover:bg-gray-50 bg-gray-100'
              }`}
            >
              {previewUrl ? (
                <div className="relative w-full h-full">
                  {selectedType === 'image' ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <video src={previewUrl} className="w-full h-full object-cover rounded-lg" controls />
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">Tap to change</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tap to select {selectedType}</p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Title (for videos and news) */}
              {(selectedType === 'video' || selectedType === 'news') && (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedType === 'video' ? 'Add a title...' : 'News title...'}
                  className={`w-full px-3 py-3 border-b focus:outline-none text-lg ${
                    isDark
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              )}

              {/* Description (for videos only) */}
              {selectedType === 'video' && (
                <div
                  onClick={() => setShowDescriptionModal(true)}
                  className={`p-3 border-b cursor-pointer ${
                    isDark ? 'border-gray-700' : 'border-gray-300'
                  }`}
                >
                  <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                  <p className={`text-base ${description.trim() ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                    {description.trim() || 'Add a description...'}
                  </p>
                </div>
              )}

              {/* Caption (for reels, images, news) */}
              {(selectedType === 'reel' || selectedType === 'image' || selectedType === 'news') && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a caption..."
                  rows={3}
                  className={`w-full px-3 py-3 border-b focus:outline-none resize-none text-lg ${
                    isDark
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              )}

              {/* Thumbnail (for videos/reels) */}
              {(selectedType === 'video' || selectedType === 'reel') && (
                <div
                  onClick={() => setShowThumbnailModal(true)}
                  className={`p-3 border-b cursor-pointer ${
                    isDark ? 'border-gray-700' : 'border-gray-300'
                  }`}
                >
                  <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Thumbnail</p>
                  <div className="flex items-center gap-3">
                    {thumbnailPreviewUrl ? (
                      <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                        <Image size={20} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                      </div>
                    )}
                    <p className={`text-base ${thumbnailPreviewUrl ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                      {thumbnailPreviewUrl ? 'Change thumbnail' : 'Add thumbnail'}
                    </p>
                  </div>
                </div>
              )}

              {/* Text Background Color (only for text-only posts) */}
              {content.trim() && !selectedFile && (
                <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Background Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {textColors.map((color, index) => (
                      <button
                        key={color}
                        onClick={() => setTextBgColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${textBgColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select background color ${index + 1}`}
                      />
                    ))}
                    {textBgColor && (
                      <button
                        onClick={() => setTextBgColor('')}
                        className={`px-3 py-1 text-sm border rounded-full ${
                          isDark
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={
            selectedType === 'video' || selectedType === 'reel' ? 'video/*' :
            selectedType === 'image' ? 'image/*' : ''
          }
          onChange={handleFileSelect}
          className="hidden"
          aria-label={`Upload ${selectedType}`}
        />
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          onChange={handleThumbnailSelect}
          className="hidden"
          aria-label="Upload thumbnail"
        />
      </div>
    </div>
  )
}