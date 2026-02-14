'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, BarChart2, Play } from 'lucide-react'
import { Post } from './types'
import appwriteService from './appwriteService'
import { OptimizedImage } from './components/OptimizedImage'
import { normalizeWasabiImageArray, normalizeWasabiImage } from './lib/wasabi'

interface PostCardProps {
  post: Post
  isGuest?: boolean
  onGuestAction?: () => void
  currentUserId?: string
  feedType?: 'home' | 'watch' | 'following' | 'news' | 'reels'
  onVideoClick?: (post: Post) => void
}

export const PostCard = ({ post, currentUserId, feedType = 'home', onVideoClick }: PostCardProps) => {
  const router = useRouter()
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likes, setLikes] = useState(post.likes || 0)
  const [saved, setSaved] = useState(post.isSaved || false)
  const [reposted, setReposted] = useState(post.isReposted || false)
  const [reposts, setReposts] = useState(post.reposts || 0)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!post.userId) return

      try {
        const profile = await appwriteService.getProfileByUserId(post.userId)
        setUserProfile(profile)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }

    fetchUserProfile()
  }, [post.userId])

  // Subscribe to realtime updates for this post
  useEffect(() => {
    if (!post.id) return

    const unsubscribe = appwriteService.subscribeToDocument('posts', post.id, (payload) => {
      if (payload.events.includes('databases.*.collections.posts.documents.*.update')) {
        const updatedPost = payload.payload
        setLikes(updatedPost.likes || 0)
        setReposts(updatedPost.reposts || 0)
        // Update other fields as needed
      }
    })

    return unsubscribe
  }, [post.id])

  const handleLike = async () => {
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't like - silently ignore or show message
      return
    }

    const wasLiked = liked
    const prevLikes = likes

    // Optimistic update
    setLiked(!wasLiked)
    setLikes(wasLiked ? Math.max(0, likes - 1) : likes + 1)

    try {
      if (wasLiked) {
        await appwriteService.unlikePost(post.id)
      } else {
        await appwriteService.likePost(post.id)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Revert on error
      setLiked(wasLiked)
      setLikes(prevLikes)
    }
  }

  const handleSave = async () => {
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't save - silently ignore
      return
    }

    const wasSaved = saved

    // Optimistic update
    setSaved(!wasSaved)

    try {
      await appwriteService.savePost(post.id)
    } catch (error) {
      console.error('Failed to toggle save:', error)
      // Revert on error
      setSaved(wasSaved)
    }
  }

  const handleRepost = async () => {
    // Check if user is authenticated
    const currentUser = await appwriteService.getCurrentUser()
    if (!currentUser) {
      // Guest users can't repost - silently ignore
      return
    }

    const wasReposted = reposted
    const prevReposts = reposts

    // Optimistic update
    setReposted(!wasReposted)
    setReposts(wasReposted ? Math.max(0, reposts - 1) : reposts + 1)

    try {
      await appwriteService.repostPost(post.id)
    } catch (error) {
      console.error('Failed to toggle repost:', error)
      // Revert on error
      setReposted(wasReposted)
      setReposts(prevReposts)
    }
  }

  // Render media content
  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null

    const imageUrl = post.mediaUrls[0]

    if (post.postType === 'image') {
      return (
        <div className={`w-full rounded-xl mb-3 overflow-hidden bg-gray-100 dark:bg-gray-800 ${
          feedType === 'watch' ? 'max-h-[70vh]' : 'aspect-square'
        }`}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Post"
              className={`w-full h-full ${
                feedType === 'watch' ? 'object-contain' : 'object-cover'
              }`}
              loading="lazy"
            />
          )}
        </div>
      )
    } else if (post.postType === 'video') {
      const thumbnailUrl = post.thumbnailUrl || post.mediaUrls[0]
      
      return (
        <>
          <div
            className="relative w-full rounded-xl mb-3 bg-gray-900 cursor-pointer overflow-hidden"
            style={{ aspectRatio: '4/3' }}
            onClick={() => router.push(`/watch/${post.id}`)}
          >
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
          {post.title && (
            <div className="mb-3 px-2">
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg line-clamp-2">{post.title}</h3>
            </div>
          )}
        </>
      )
    } else if (post.postType === 'reel') {
      // Reel display - 1:1 on feeds, 9:16 on reels/details
      if ((feedType as string) === 'reels') {
        // Reels page - 9:16 vertical
        return (
          <div className="relative">
            <video
              src={post.mediaUrls[0]}
              poster={post.thumbnailUrl}
              className="w-full rounded-xl mb-3 object-cover"
              style={{ aspectRatio: '9/16' }}
              controls
              preload="metadata"
              autoPlay={false}
              muted
            />
            {/* Title overlay on reels */}
            {post.title && (
              <div className="absolute top-4 left-4 right-4 bg-black/60 rounded-lg p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-2">{post.title}</h3>
              </div>
            )}
          </div>
        )
      } else {
        // Other feeds - 1:1 square
        return (
          <div
            className="relative w-full rounded-xl mb-3 bg-black cursor-pointer overflow-hidden aspect-square"
            onClick={() => router.push(`/reels/${post.id}`)}
          >
            <img
              src={post.thumbnailUrl || post.mediaUrls[0]}
              alt="Reel thumbnail"
              className="w-full h-full object-cover"
            />
            {/* Reel overlay */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
              </div>
            </div>
            {/* Title below reel */}
            {post.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <h3 className="text-white font-semibold text-sm line-clamp-1">{post.title}</h3>
              </div>
            )}
          </div>
        )
      }
    }

    return null
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/profile/${post.userId}`)}
            className="hover:opacity-80 transition-opacity"
            aria-label={`View ${userProfile?.displayName || userProfile?.username || post.username}'s profile`}
          >
            {userProfile?.avatarUrl || post.userAvatar ? (
              <img
                src={userProfile?.avatarUrl || post.userAvatar}
                alt={userProfile?.displayName || userProfile?.username || post.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white font-semibold">
                {((userProfile?.displayName || userProfile?.username || post.username) || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
          <div>
            <button
              onClick={() => router.push(`/profile/${post.userId}`)}
              className="text-gray-900 dark:text-white font-bold text-base hover:underline transition-all text-left"
              aria-label={`View ${userProfile?.displayName || userProfile?.username || post.username}'s profile`}
            >
              {userProfile?.displayName || userProfile?.username || post.username || 'User'}
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" aria-label="More options">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="pb-2">
        {post.textBgColor ? (
          <div
            className={`text-white text-center leading-relaxed p-4 rounded-xl mb-3 max-w-sm ${
              (post.content?.length || 0) < 50
                ? 'text-2xl font-extrabold'
                : (post.content?.length || 0) < 100
                ? 'text-xl font-bold'
                : 'text-lg font-semibold'
            }`}
            style={{ backgroundColor: post.textBgColor ? `#${post.textBgColor.toString(16).padStart(6, '0')}` : undefined }}
          >
            {post.content}
          </div>
        ) : post.content ? (
          <p className="text-gray-900 dark:text-white text-base leading-relaxed mb-3">{post.content}</p>
        ) : null}

        {/* Display media from mediaUrls array */}
        {renderMedia()}

        {post.postType === 'news' && post.title && (
          <div className="border-l-4 border-blue-500 pl-4 mb-3">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{post.title}</h3>
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="pb-3">
        {(feedType as string) === 'reels' ? (
          // Vertical reactions for reels - counts beside icons
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 text-gray-500 dark:text-gray-400 ${liked ? 'text-red-500' : ''}`} aria-label="Like">
              <Heart size={24} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium">{likes || 0}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Comment">
              <MessageCircle size={24} />
              <span className="text-sm font-medium">{post.comments || 0}</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Repost">
              <Repeat2 size={24} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-medium">{reposts || 0}</span>
            </button>
            <button onClick={handleSave} className={`flex items-center gap-2 hover:text-yellow-500 transition-colors p-2 ${saved ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label="Bookmark">
              <Bookmark size={24} className={saved ? 'fill-yellow-500' : ''} />
              <span className="text-sm font-medium">Save</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 text-gray-500 dark:text-gray-400" aria-label="Share">
              <Share size={24} />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        ) : (
          // Horizontal reactions for other feeds - icon only on mobile
          <div className="flex items-center justify-between gap-2">
            <button onClick={handleSave} className={`flex items-center justify-center hover:text-yellow-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400 ${saved ? 'text-yellow-500' : ''}`} aria-label={`Save post - ${saved ? 'saved' : 'not saved'}`}>
              <Bookmark size={20} className={saved ? 'fill-yellow-500' : ''} />
            </button>
            <button className={`flex items-center justify-center hover:text-blue-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label="Share post">
              <Share size={20} />
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition-colors p-2 rounded-lg ${reposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Repost - ${reposts || 0} reposts`}>
              <Repeat2 size={20} className={reposted ? 'fill-green-500' : ''} />
              <span className="text-sm font-medium">{reposts || 0}</span>
            </button>
            <button className={`flex items-center gap-2 hover:text-indigo-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View impressions - ${post.impressions || 0} impressions`}>
              <BarChart2 size={20} />
              <span className="text-sm font-medium">{post.impressions || 0}</span>
            </button>
            <button className={`flex items-center gap-2 hover:text-blue-500 transition-colors p-2 rounded-lg text-gray-500 dark:text-gray-400`} aria-label={`View comments - ${post.comments || 0} comments`}>
              <MessageCircle size={20} />
              <span className="text-sm font-medium">{post.comments || 0}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-red-500 transition-colors p-2 rounded-lg ${liked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} aria-label={`Like post - ${likes || 0} likes`}>
              <Heart size={20} className={liked ? 'fill-red-500' : ''} />
              <span className="text-sm font-medium">{likes || 0}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}