'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSingleVideoPlaybackOptions {
  postId: string
  shouldLoadVideo: boolean
  muted: boolean
  shouldPause?: boolean
  loop?: boolean
  onDurationChange?: (duration: number) => void
  onTimeUpdate?: (time: number) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onCountView?: () => Promise<void> | void
  resetViewCountOnEnded?: boolean
}

export function useSingleVideoPlayback({
  postId,
  shouldLoadVideo,
  muted,
  shouldPause = false,
  loop = false,
  onDurationChange,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onCountView,
  resetViewCountOnEnded = true,
}: UseSingleVideoPlaybackOptions) {
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasCountedView = useRef(false)
  const userPaused = useRef(false)

  const pauseAllVideos = useCallback((except?: HTMLVideoElement | null) => {
    if (typeof document === 'undefined') return
    document.querySelectorAll('video').forEach((video) => {
      if (video !== except) {
        video.pause()
      }
    })
  }, [])

  const setUserPaused = useCallback((paused: boolean) => {
    userPaused.current = paused
  }, [])

  const playVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    userPaused.current = false
    pauseAllVideos(video)
    video.play().catch(() => {})
  }, [pauseAllVideos])

  const pauseVideo = useCallback(() => {
    userPaused.current = true
    videoRef.current?.pause()
  }, [])

  useEffect(() => {
    userPaused.current = false
    setIsVideoReady(false)
    hasCountedView.current = false
  }, [postId])

  useEffect(() => {
    const pauseEverything = () => {
      pauseAllVideos()
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsPageVisible(visible)
      if (!visible) pauseEverything()
    }

    setIsPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', pauseEverything)
    window.addEventListener('blur', pauseEverything)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', pauseEverything)
      window.removeEventListener('blur', pauseEverything)
    }
  }, [pauseAllVideos])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoadVideo) return

    const handleLoadStart = () => setIsVideoReady(false)
    const handleLoadedMetadata = () => {
      onDurationChange?.(video.duration)
      if (video.readyState >= 2) setIsVideoReady(true)
    }
    const handleCanPlay = () => setIsVideoReady(true)
    const handleTimeUpdate = () => {
      onTimeUpdate?.(video.currentTime)
    }
    const handlePlay = () => {
      pauseAllVideos(video)
      onPlay?.()
      if (!hasCountedView.current && onCountView) {
        hasCountedView.current = true
        void Promise.resolve(onCountView())
      }
    }
    const handlePause = () => {
      onPause?.()
    }
    const handleEnded = () => {
      if (resetViewCountOnEnded) {
        hasCountedView.current = false
      }
      userPaused.current = true
      onEnded?.()
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.pause()
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [
    onCountView,
    onDurationChange,
    onEnded,
    onPause,
    onPlay,
    onTimeUpdate,
    pauseAllVideos,
    postId,
    resetViewCountOnEnded,
    shouldLoadVideo,
  ])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoadVideo) return
    video.muted = muted
  }, [muted, shouldLoadVideo])

  useEffect(() => {
    const video = videoRef.current
    pauseAllVideos(video)
    if (!video || !shouldLoadVideo) return

    video.loop = loop

    const shouldBlockPlay =
      !isPageVisible ||
      shouldPause ||
      userPaused.current ||
      !isVideoReady ||
      video.readyState < 2

    if (shouldBlockPlay) {
      video.pause()
      return
    }

    if (video.paused) {
      video.play().catch(() => {})
    }
  }, [isPageVisible, isVideoReady, loop, pauseAllVideos, shouldLoadVideo, shouldPause, postId])

  useEffect(() => {
    return () => {
      pauseAllVideos()
    }
  }, [pauseAllVideos])

  return {
    videoRef,
    isVideoReady,
    pauseAllVideos,
    setUserPaused,
    playVideo,
    pauseVideo,
  }
}
