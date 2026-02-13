'use client'

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
  // Convert to proxy URL
  const proxySrc = normalizeWasabiImage(src) || src

  return (
    <Image
      src={proxySrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      onError={onError}
      onLoad={onLoad}
      unoptimized // Since we're proxying, let the proxy handle optimization
    />
  )
}
