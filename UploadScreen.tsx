'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Image as ImageIcon, Newspaper, Video } from 'lucide-react'
import {
  NewsComposer,
  TextImageComposer,
  UploadTypeOption,
  UploadTypeSelector,
  VideoDetailsStep,
  VideoSelectStep,
} from './components/upload/UploadViews'
import {
  DURATION_GUARD_MESSAGE,
  useUploadFlow,
} from './useUploadFlow'

interface UploadScreenProps {
  onClose?: () => void
}

export function UploadScreen({ onClose }: UploadScreenProps) {
  const router = useRouter()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const handleCloseUpload = () => {
    if (onClose) {
      onClose()
      return
    }
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push('/')
  }

  const flow = useUploadFlow({
    onUploadSuccess: (userId) => {
      if (userId) {
        router.push(`/profile/${userId}`)
        return
      }
      router.push('/profile')
    },
  })

  const contentTypes: UploadTypeOption[] = [
    {
      id: 'video',
      label: 'Video',
      icon: Video,
      description: 'Upload video',
      requires: 'free',
      disabled: false,
    },
    {
      id: 'reel',
      label: 'Reel',
      icon: Film,
      description: 'Upload short reel',
      requires: 'free',
      disabled: false,
    },
    {
      id: 'image',
      label: 'Text/Image',
      icon: ImageIcon,
      description: 'Text post or photos',
      requires: 'free',
      disabled: false,
    },
    {
      id: 'news',
      label: 'News',
      icon: Newspaper,
      description: 'Business only',
      requires: 'business',
      disabled: !(flow.isAdmin || flow.creatorPlan === 'business'),
    },
  ]

  useEffect(() => {
    if (!flow.selectedType) return
    if (flow.selectedType === 'video' || flow.selectedType === 'reel') {
      flow.setVideoStep('select')
      setTimeout(() => videoInputRef.current?.click(), 60)
    }
  }, [flow.selectedType, flow.setVideoStep])

  if (!flow.selectedType) {
    return (
      <>
        <UploadTypeSelector
          isDark={flow.isDark}
          contentTypes={contentTypes}
          onClose={handleCloseUpload}
          onSelect={(type) => flow.selectType(type.id, type.disabled, type.requires)}
        />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={flow.handleVideoSelect} className="hidden" />
        <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={flow.handleImagesSelect} className="hidden" />
        <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={flow.handleThumbnailSelect} className="hidden" />
      </>
    )
  }

  return (
    <>
      {flow.isVideoType && flow.videoStep === 'select' && (
        <VideoSelectStep
          isDark={flow.isDark}
          selectedType={flow.selectedType}
          videoPreviewUrl={flow.videoPreviewUrl}
          videoDuration={flow.videoDuration}
          durationError={flow.durationError}
          overDurationLimit={flow.overDurationLimit}
          durationGuardMessage={DURATION_GUARD_MESSAGE}
          hasSelectedVideo={!!flow.selectedVideoFile}
          onBack={() => {
            flow.clearVideo()
            flow.setSelectedType(null)
          }}
          onClose={handleCloseUpload}
          onChooseVideo={() => videoInputRef.current?.click()}
          onNext={() => flow.setVideoStep('details')}
          onVideoMetadata={flow.handleVideoMetadata}
        />
      )}

      {flow.isVideoType && flow.videoStep === 'details' && (
        <VideoDetailsStep
          isDark={flow.isDark}
          selectedType={flow.selectedType}
          videoPreviewUrl={flow.videoPreviewUrl}
          activeThumbnailPreviewUrl={flow.activeThumbnailPreviewUrl}
          durationError={flow.durationError}
          overDurationLimit={flow.overDurationLimit}
          durationGuardMessage={DURATION_GUARD_MESSAGE}
          title={flow.title}
          description={flow.description}
          content={flow.content}
          seoTitle={flow.seoTitle}
          seoDescription={flow.seoDescription}
          seoKeywords={flow.seoKeywords}
          seoCategory={flow.seoCategory}
          aiBrief={flow.aiBrief}
          aiAudience={flow.aiAudience}
          aiFocusKeywords={flow.aiFocusKeywords}
          canUseAi={flow.canUseAi}
          isGeneratingAi={flow.isGeneratingAi}
          uploading={flow.uploading}
          hasSelectedVideo={!!flow.selectedVideoFile}
          onBack={() => flow.setVideoStep('select')}
          onClose={handleCloseUpload}
          onPickThumbnail={() => thumbnailInputRef.current?.click()}
          onVideoMetadata={flow.handleVideoMetadata}
          onChangeTitle={flow.setTitle}
          onChangeDescription={flow.setDescription}
          onChangeContent={flow.setContent}
          onChangeSeoTitle={flow.setSeoTitle}
          onChangeSeoDescription={flow.setSeoDescription}
          onChangeSeoKeywords={flow.setSeoKeywords}
          onChangeSeoCategory={flow.setSeoCategory}
          onChangeAiBrief={flow.setAiBrief}
          onChangeAiAudience={flow.setAiAudience}
          onChangeAiFocusKeywords={flow.setAiFocusKeywords}
          onGenerateSeo={flow.handleGenerateSeo}
          onUpload={flow.handleUpload}
        />
      )}

      {flow.isTextImageType && (
        <TextImageComposer
          isDark={flow.isDark}
          avatarUrl={flow.avatarUrl}
          displayName={flow.displayName}
          content={flow.content}
          textBgColor={flow.textBgColor}
          textColors={flow.textColors}
          imageItems={flow.imageItems}
          uploading={flow.uploading}
          onBack={() => flow.setSelectedType(null)}
          onClose={handleCloseUpload}
          onChangeContent={flow.setContent}
          onChooseImages={() => imageInputRef.current?.click()}
          onChangeTextBgColor={flow.setTextBgColor}
          onClearTextBgColor={() => flow.setTextBgColor('')}
          onRemoveImage={flow.removeImageItem}
          onUpload={flow.handleUpload}
        />
      )}

      {flow.selectedType === 'news' && (
        <NewsComposer
          isDark={flow.isDark}
          title={flow.title}
          content={flow.content}
          uploading={flow.uploading}
          onBack={() => flow.setSelectedType(null)}
          onClose={handleCloseUpload}
          onChangeTitle={flow.setTitle}
          onChangeContent={flow.setContent}
          onUpload={flow.handleUpload}
        />
      )}

      <input ref={videoInputRef} type="file" accept="video/*" onChange={flow.handleVideoSelect} className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={flow.handleImagesSelect} className="hidden" />
      <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={flow.handleThumbnailSelect} className="hidden" />
    </>
  )
}
