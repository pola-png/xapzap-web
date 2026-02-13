'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { normalizeWasabiImage } from '../lib/wasabi'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  className?: string
  priority?: boolean
  onError?: () => void
  onLoad?: () => void
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  className,
  priority = false,
  onError,
  onLoad,
  placeholder = 'empty',
  blurDataURL
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(() => normalizeWasabiImage(src) || src)
  const [retryCount, setRetryCount] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const maxRetries = 3

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      // Retry with original URL if proxy fails
      setRetryCount(prev => prev + 1)
      setImageSrc(src) // Try original URL
      setHasError(false)
    } else {
      setHasError(true)
      onError?.()
    }
  }, [retryCount, maxRetries, src, onError])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    onLoad?.()
  }, [onLoad])

  // Show error state
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 ${
          fill ? 'absolute inset-0' : ''
        } ${className || ''}`}
        style={fill ? { width, height } : {}}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Image failed to load</div>
          <button
            onClick={() => {
              setRetryCount(0)
              setHasError(false)
              setImageSrc(normalizeWasabiImage(src) || src)
            }}
            className="text-xs text-blue-500 hover:text-blue-400 mt-1 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading && !fill) {
    return (
      <div
        className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className || ''}`}
        style={{ width, height }}
      />
    )
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized // Since we're proxying, let the proxy handle optimization
    />
  )
}