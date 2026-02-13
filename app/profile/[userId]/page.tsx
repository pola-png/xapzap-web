'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, MessageCircle, UserPlus, UserMinus, Share, Settings, BarChart3, DollarSign } from 'lucide-react'
import { PostCard } from '../../../PostCard'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'

type ProfileData = {
  displayName?: string
  username?: string
  bio?: string
  category?: string
  avatarUrl?: string
  coverUrl?: string
  website?: string
  joinedAt?: string
}

type TabType = 'posts' | 'videos' | 'news' | 'all'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0
  })
  const [activeTab, setActiveTab] = useState<TabType>('posts')

  const isCurrentUser = currentUserId === userId

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Get current user
      const currentUser = await appwriteService.getCurrentUser()
      setCurrentUserId(currentUser?.$id || '')

      // Get profile data
      const profileData = await appwriteService.getProfileByUserId(userId)
      if (profileData) {
        setProfile({
          displayName: profileData.displayName || profileData.username,
          username: profileData.username,
          bio: profileData.bio,
          category: profileData.category,
          avatarUrl: profileData.avatarUrl,
          coverUrl: profileData.coverUrl,
          website: profileData.website,
          joinedAt: profileData.$createdAt
        })
      }

      // Get posts
      const postsResult = await appwriteService.fetchPostsByUserIds([userId], 50)
      const postsData = postsResult.documents.map((doc: any) => ({
        ...doc,
        id: doc.$id,
        postId: doc.$id,
        userId: doc.userId,
        username: doc.username,
        userAvatar: doc.userAvatar,
        content: doc.content,
        timestamp: new Date(doc.$createdAt || doc.createdAt),
        createdAt: doc.$createdAt || doc.createdAt,
        likes: doc.likes || 0,
        comments: doc.comments || 0,
        reposts: doc.reposts || 0,
        impressions: doc.impressions || 0,
        views: doc.views || 0,
        isLiked: false,
        isReposted: false,
        isSaved: false,
        isBoosted: false
      })) as Post[]

      setPosts(postsData)
      setStats({
        posts: postsResult.total,
        followers: await appwriteService.getFollowerCount(userId),
        following: await appwriteService.getFollowingCount(userId)
      })

      // Check follow status if not current user
      if (currentUser && currentUser.$id !== userId) {
        const following = await appwriteService.isFollowing(currentUser.$id, userId)
        setIsFollowing(following)
      }

    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return

    setFollowLoading(true)
    try {
      if (isFollowing) {
        await appwriteService.unfollowUser(userId)
        setIsFollowing(false)
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }))
      } else {
        await appwriteService.followUser(userId)
        setIsFollowing(true)
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = () => {
    // TODO: Implement chat functionality
    console.log('Message user:', userId)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.displayName || 'User'}'s Profile`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      // TODO: Show toast notification
    }
  }

  const filteredPosts = posts.filter(post => {
    switch (activeTab) {
      case 'posts':
        return !post.postType || post.postType === 'text' || post.postType === 'image'
      case 'videos':
        return post.postType === 'video' || post.postType === 'reel'
      case 'news':
        return post.postType === 'news'
      case 'all':
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Profile not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-700">
        {profile.coverUrl && (
          <img
            src={profile.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-800 flex items-center justify-center">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl text-white font-bold">
                {(profile.displayName || 'U')[0].toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-16 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              {profile.displayName}
            </h1>
            <p className="text-gray-400 mb-2">@{profile.username}</p>

            {profile.bio && (
              <p className="text-white mb-2">{profile.bio}</p>
            )}

            {profile.category && (
              <span className="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full mb-2">
                {profile.category}
              </span>
            )}

            {profile.joinedAt && (
              <div className="flex items-center text-gray-400 text-sm mb-3">
                <Calendar className="w-4 h-4 mr-1" />
                Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.posts}</div>
                <div className="text-sm text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.followers}</div>
                <div className="text-sm text-gray-400">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{stats.following}</div>
                <div className="text-sm text-gray-400">Following</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          {isCurrentUser ? (
            <>
              <button
                onClick={() => router.push('/profile/edit')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={handleShare}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
                aria-label="Share profile"
              >
                <Share className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {followLoading ? (
                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={handleMessage}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
                aria-label="Message user"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
                aria-label="Share profile"
              >
                <Share className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Creator Tools */}
        {isCurrentUser && (
          <div className="bg-gray-900 rounded-xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-3">Creator Tools</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-3"
              >
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-white font-medium text-sm">Dashboard</div>
                  <div className="text-gray-400 text-xs">Insights & performance</div>
                </div>
              </button>
              <button
                onClick={() => router.push('/monetization')}
                className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors flex items-center gap-3"
              >
                <DollarSign className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-white font-medium text-sm">Monetization</div>
                  <div className="text-gray-400 text-xs">Earnings & eligibility</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-4">
          {(['posts', 'videos', 'news', 'all'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No {activeTab} yet</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                feedType="home"
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}