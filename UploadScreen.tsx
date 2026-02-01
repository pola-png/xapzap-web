'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image, Video, FileText, Music, File, Check, AlertCircle } from 'lucide-react'
import { cn } from './utils'

interface UploadFile {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export function UploadScreen() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={24} />
    if (type.startsWith('video/')) return <Video size={24} />
    if (type.startsWith('audio/')) return <Music size={24} />
    if (type.includes('text') || type.includes('document')) return <FileText size={24} />
    return <File size={24} />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const createUploadFile = (file: File): UploadFile => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    let preview: string | undefined

    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    return {
      id,
      file,
      preview,
      progress: 0,
      status: 'pending'
    }
  }

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const uploadFiles = fileArray.map(createUploadFile)
    setFiles(prev => [...prev, ...uploadFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const simulateUpload = (id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'uploading' as const } : f
    ))

    const interval = setInterval(() => {
      setFiles(prev => {
        const file = prev.find(f => f.id === id)
        if (!file || file.status !== 'uploading') {
          clearInterval(interval)
          return prev
        }

        const newProgress = Math.min(file.progress + Math.random() * 20, 100)
        
        if (newProgress >= 100) {
          clearInterval(interval)
          return prev.map(f => 
            f.id === id ? { ...f, progress: 100, status: 'completed' as const } : f
          )
        }

        return prev.map(f => 
          f.id === id ? { ...f, progress: newProgress } : f
        )
      })
    }, 200)
  }

  const uploadAll = () => {
    files.filter(f => f.status === 'pending').forEach(file => {
      simulateUpload(file.id)
    })
  }

  const clearCompleted = () => {
    setFiles(prev => {
      prev.filter(f => f.status === 'completed').forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
      return prev.filter(f => f.status !== 'completed')
    })
  }

  const pendingFiles = files.filter(f => f.status === 'pending')
  const uploadingFiles = files.filter(f => f.status === 'uploading')
  const completedFiles = files.filter(f => f.status === 'completed')

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Upload Files</h1>
        <p className="text-muted-foreground">Share your photos, videos, and documents</p>
      </div>

      {/* Upload Area */}
      <div className="hidden md:block">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-xapzap-blue bg-blue-50 dark:bg-blue-950/20" 
              : "border-border hover:border-xapzap-blue"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Choose files or drag and drop'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Support for images, videos, documents, and more
          </p>
          <button className="px-6 py-2 bg-xapzap-blue text-white rounded-full hover:bg-blue-600 transition-colors">
            Browse Files
          </button>
        </div>
      </div>

      {/* Mobile Upload Button */}
      <div className="md:hidden">
        <div className="text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 bg-muted rounded-2xl hover:bg-accent transition-colors"
          >
            <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Choose Files</h3>
            <p className="text-muted-foreground mb-4">
              Select photos, videos, and documents
            </p>
            <div className="px-6 py-2 bg-xapzap-blue text-white rounded-full inline-block">
              Browse Files
            </div>
          </button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upload Queue ({files.length})</h2>
            <div className="flex space-x-2">
              {pendingFiles.length > 0 && (
                <button
                  onClick={uploadAll}
                  className="px-4 py-2 bg-xapzap-blue text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  Upload All ({pendingFiles.length})
                </button>
              )}
              {completedFiles.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  Clear Completed ({completedFiles.length})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {uploadFile.preview ? (
                      <img
                        src={uploadFile.preview}
                        alt={uploadFile.file.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center">
                        {getFileIcon(uploadFile.file.type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{uploadFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-3">
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => simulateUpload(uploadFile.id)}
                        className="px-3 py-1 bg-xapzap-blue text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                      >
                        Upload
                      </button>
                    )}
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-background rounded-full h-2">
                          <div
                            className="bg-xapzap-blue h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(uploadFile.progress)}%
                        </span>
                      </div>
                    )}
                    
                    {uploadFile.status === 'completed' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <Check size={20} />
                        <span className="text-sm">Completed</span>
                      </div>
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertCircle size={20} />
                        <span className="text-sm">Error</span>
                      </div>
                    )}

                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      className="p-1 hover:bg-background rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingFiles.length}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-xapzap-blue">{uploadingFiles.length}</div>
            <div className="text-sm text-muted-foreground">Uploading</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedFiles.length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
      )}
    </div>
  )
}