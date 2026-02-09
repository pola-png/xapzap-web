'use client'

import { useState, useRef } from 'react'
import { Upload, X, Video, Image, Newspaper, Film, Plus, Loader2 } from 'lucide-react'
import appwriteService from './appwriteService'

interface UploadScreenProps {
  onClose: () => void
}

export function UploadScreen({ onClose }: UploadScreenProps) {
  const [selectedType, setSelectedType] = useState<'video' | 'reel' | 'image' | 'news' | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [textBgColor, setTextBgColor] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const contentTypes = [
    { id: 'video', label: 'Video', icon: Video, description: 'Upload a video post' },
    { id: 'reel', label: 'Reel', icon: Film, description: 'Upload a short vertical video' },
    { id: 'image', label: 'Image', icon: Image, description: 'Share a photo or image' },
    { id: 'news', label: 'News', icon: Newspaper, description: 'Publish news article' }
  ] as const

  const textColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
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

        // For videos, create a thumbnail
        if (selectedType === 'video' || selectedType === 'reel') {
          // For now, use the same file as thumbnail (in a real app, you'd generate a proper thumbnail)
          thumbnailUrl = mediaUrl
        }
      }

      // Prepare post data based on type
      const postData: any = {
        userId: user.$id,
        username: user.name || 'User',
        content: content.trim(),
        kind: selectedType,
        createdAt: new Date().toISOString()
      }

      // Add type-specific fields
      if (selectedType === 'news') {
        postData.title = title.trim()
      }

      if (selectedType === 'image') {
        postData.imageUrl = mediaUrl
      } else if (selectedType === 'video' || selectedType === 'reel') {
        postData.videoUrl = mediaUrl
        postData.thumbnailUrl = thumbnailUrl
      }

      if (textBgColor && content.trim()) {
        postData.textBgColor = textBgColor
      }

      // Create the post
      await appwriteService.createPost(postData)

      // Reset form and close
      setSelectedType(null)
      setContent('')
      setTitle('')
      setTextBgColor('')
      setSelectedFile(null)
      setPreviewUrl(null)
      onClose()

    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const renderTypeSelection = () => (
    <div className="grid grid-cols-2 gap-4">
      {contentTypes.map((type) => {
        const Icon = type.icon
        return (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Icon size={48} className="mx-auto mb-3 text-gray-600" />
            <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
            <p className="text-sm text-gray-500">{type.description}</p>
          </button>
        )
      })}
    </div>
  )

  const renderUploadForm = () => {
    const currentType = contentTypes.find(t => t.id === selectedType)
    if (!currentType) return null

    const Icon = currentType.icon

    return (
      <div className="space-y-6">
        {/* Type Header */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Icon size={24} className="text-blue-500" />
          <div>
            <h3 className="font-semibold">{currentType.label}</h3>
            <p className="text-sm text-gray-600">{currentType.description}</p>
          </div>
        </div>

        {/* File Upload */}
        {(selectedType === 'video' || selectedType === 'reel' || selectedType === 'image') && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Media File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {previewUrl ? (
                <div className="space-y-3">
                  {selectedType === 'image' ? (
                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                  ) : (
                    <video src={previewUrl} className="max-h-48 mx-auto rounded" controls />
                  )}
                  <p className="text-sm text-gray-600">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={48} className="mx-auto text-gray-400" />
                  <p className="text-lg font-medium">Click to upload {selectedType}</p>
                  <p className="text-sm text-gray-500">
                    {selectedType === 'video' && 'MP4, MOV up to 100MB'}
                    {selectedType === 'reel' && 'MP4, MOV up to 50MB (vertical format)'}
                    {selectedType === 'image' && 'JPG, PNG up to 10MB'}
                  </p>
                </div>
              )}
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
          </div>
        )}

        {/* Title (for news) */}
        {selectedType === 'news' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter news title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {selectedType === 'news' ? 'Article Content' : 'Caption'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              selectedType === 'news' ? 'Write your news article...' :
              selectedType === 'reel' ? 'Add a caption to your reel...' :
              'Write a caption...'
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Text Background Color */}
        {content.trim() && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Text Background (Optional)</label>
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
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                  title="Clear background color"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Preview */}
        {content.trim() && textBgColor && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div
              className="p-4 rounded-xl max-w-sm"
              style={{ backgroundColor: textBgColor }}
            >
              <p className="text-white text-center font-bold">{content}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setSelectedType(null)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Create Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close upload screen"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          {!selectedType ? renderTypeSelection() : renderUploadForm()}
        </div>
      </div>
    </div>
  )
}