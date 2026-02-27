'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VideoDetailScreen } from '../../../VideoDetailScreen'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'

interface WatchDetailClientProps {
  initialPost: Post
}

export default function WatchDetailClient({ initialPost }: WatchDetailClientProps) {
  const [post, setPost] = useState<Post>(initialPost)
  const router = useRouter()

  useEffect(() => {
    setPost(initialPost)
  }, [initialPost])

  useEffect(() => {
    let active = true

    const loadViewerInteractions = async () => {
      try {
        const user = await appwriteService.getCurrentUser()
        if (!user || !active) return

        const [isLiked, isSaved, isReposted] = await Promise.all([
          appwriteService.isPostLikedBy(user.$id, initialPost.id),
          appwriteService.isPostSavedBy(user.$id, initialPost.id),
          appwriteService.isPostRepostedBy(user.$id, initialPost.id),
        ])

        if (!active) return
        setPost((prev) => ({ ...prev, isLiked, isSaved, isReposted }))
      } catch {
        // Keep initial interaction flags if user state fails to resolve.
      }
    }

    void loadViewerInteractions()

    return () => {
      active = false
    }
  }, [initialPost.id])

  return <VideoDetailScreen post={post} onClose={() => router.back()} />
}
