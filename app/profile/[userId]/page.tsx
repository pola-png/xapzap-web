'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, MessageCircle, UserPlus, UserMinus, Share, Settings, BarChart3, DollarSign, Menu } from 'lucide-react'
import { PostCard } from '../../../PostCard'
import { Post } from '../../../types'
import appwriteService from '../../../appwriteService'
import { useProfileStore } from '../../../profileStore'
import { useAuthStore } from '../../../authStore'
import { VerifiedBadge } from '../../../components/VerifiedBadge'
import { hasVerifiedBadge } from '../../../lib/verification'

type ProfileData = {
  displayName?: string
  username?: string
  isVerified?: boolean
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
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showBannerMenu, setShowBannerMenu] = useState(false)
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0
  })
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const profileStore = useProfileStore()
  const authStore = useAuthStore()
  const [shouldLoadCover, setShouldLoadCover] = useState(false)
  const [shouldLoadAvatar, setShouldLoadAvatar] = useState(false)

  useEffect(() => {
    setShouldLoadCover(true)
    setShouldLoadAvatar(true)
  }, [])

  const isCurrentUser = authStore.currentUserId === userId

  useEffect(() => {
    const cached = profileStore.getProfile(userId)
    if (cached) {
      setProfile(cached.profile)
      setPosts(cached.posts)
      setStats(cached.stats)
      setActiveTab(cached.activeTab)
      setLoading(false)
    } else {
      loadProfile()
    }
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)

      // Get current user
      const currentUser = await appwriteService.getCurrentUser()
      const currentUserId = currentUser?.$id || ''
      setCurrentUserId(currentUserId)
      authStore.setCurrentUserId(currentUserId)

      const profileUserId = params.userId as string

      // Get profile data
      const profileData = await appwriteService.getProfileByUserId(profileUserId)
      if (profileData) {
        const isVerified = hasVerifiedBadge(profileData)

        setProfile({
          displayName: profileData.displayName || profileData.username,
          username: profileData.username,
          isVerified,
          bio: profileData.bio,
          category: profileData.category,
          avatarUrl: profileData.avatarUrl,
          coverUrl: profileData.coverUrl,
          website: profileData.website,
          joinedAt: profileData.$createdAt
        })
      }

      // Get posts
      const postsResult = await appwriteService.fetchPostsByUserIds([profileUserId], 50)
      const postsData = await Promise.all(
        postsResult.documents.map(async (doc: any) => {
          const interactions = currentUser ? await Promise.all([
            appwriteService.isPostLikedBy(currentUser.$id, doc.$id),
            appwriteService.isPostSavedBy(currentUser.$id, doc.$id),
            appwriteService.isPostRepostedBy(currentUser.$id, doc.$id)
          ]) : [false, false, false]
          
          return {
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
            isLiked: interactions[0],
            isReposted: interactions[1],
            isSaved: interactions[2],
            isBoosted: false
          }
        })
      ) as Post[]

      setPosts(postsData)
      setStats({
        posts: postsResult.total,
        followers: await appwriteService.getFollowerCount(profileUserId),
        following: await appwriteService.getFollowingCount(profileUserId)
      })

      // Check follow status if not current user
      if (currentUser && currentUser.$id !== profileUserId) {
        const following = await appwriteService.isFollowing(currentUser.$id, profileUserId)
        setIsFollowing(following)
      }

      // Cache the profile data
      if (profileData) {
        const isVerified = hasVerifiedBadge(profileData)

        profileStore.setProfile(profileUserId, {
          userId: profileUserId,
          profile: {
            displayName: profileData.displayName || profileData.username,
            username: profileData.username,
            isVerified,
            bio: profileData.bio,
            category: profileData.category,
            avatarUrl: profileData.avatarUrl,
            coverUrl: profileData.coverUrl,
            website: profileData.website,
            joinedAt: profileData.$createdAt
          },
          posts: postsData,
          stats: {
            posts: postsResult.total,
            followers: await appwriteService.getFollowerCount(profileUserId),
            following: await appwriteService.getFollowingCount(profileUserId)
          },
          activeTab: 'posts'
        })
      }

    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return

    const profileUserId = params.userId as string
    const wasFollowing = isFollowing
    const prevFollowers = stats.followers
    
    setFollowLoading(true)
    setIsFollowing(!wasFollowing)
    setStats(prev => ({ ...prev, followers: wasFollowing ? prev.followers - 1 : prev.followers + 1 }))
    
    try {
      if (wasFollowing) {
        await appwriteService.unfollowUser(profileUserId)
      } else {
        await appwriteService.followUser(profileUserId)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      setIsFollowing(wasFollowing)
      setStats(prev => ({ ...prev, followers: prevFollowers }))
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    setUploadingAvatar(true)
    try {
      // Sanitize filename
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[()]/g, '')
      const cleanFileName = `${Date.now()}_${sanitizedName}`
      
      const presignedRes = await fetch('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: cleanFileName,
          fileType: file.type
        })
      })
      
      if (!presignedRes.ok) throw new Error('Failed to get presigned URL')
      
      const { presignedUrl, url } = await presignedRes.json()
      
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      
      if (!uploadRes.ok) throw new Error('Upload failed')
      
      await appwriteService.updateProfile(currentUserId, { avatarUrl: url })
      setProfile(prev => prev ? { ...prev, avatarUrl: url } : null)
      setShowAvatarMenu(false)
      profileStore.clearProfile(currentUserId)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    setUploadingBanner(true)
    try {
      // Sanitize filename
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[()]/g, '')
      const cleanFileName = `${Date.now()}_${sanitizedName}`
      
      const presignedRes = await fetch('/api/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: cleanFileName,
          fileType: file.type
        })
      })
      
      if (!presignedRes.ok) throw new Error('Failed to get presigned URL')
      
      const { presignedUrl, url } = await presignedRes.json()
      
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      
      if (!uploadRes.ok) throw new Error('Upload failed')
      
      await appwriteService.updateProfile(currentUserId, { coverUrl: url })
      setProfile(prev => prev ? { ...prev, coverUrl: url } : null)
      setShowBannerMenu(false)
      profileStore.clearProfile(currentUserId)
    } catch (error) {
      console.error('Failed to upload banner:', error)
    } finally {
      setUploadingBanner(false)
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
      <div className="min-h-screen bg-[rgb(var(--bg-primary))] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg-primary))] flex items-center justify-center">
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
    <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-br from-blue-600 to-purple-700 dark:from-[#0f172a] dark:to-[#1e293b] group">
        {profile.coverUrl && shouldLoadCover && (
          <img
            src={profile.coverUrl.startsWith('/media/') ? `/api/image-proxy?path=${profile.coverUrl.substring(1)}` : profile.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        {isCurrentUser && (
          <>
            <button
              onClick={() => setShowBannerMenu(!showBannerMenu)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            {showBannerMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBannerMenu(false)} />
                <div className="absolute top-16 right-4 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 min-w-[160px]">
                  {profile.coverUrl && (
                    <button
                      onClick={() => {
                        window.open(profile.coverUrl, '_blank')
                        setShowBannerMenu(false)
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 transition-colors rounded-t-xl"
                    >
                      View Banner
                    </button>
                  )}
                  <label className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer block rounded-b-xl">
                    {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                    />
                  </label>
                </div>
              </>
            )}
          </>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-800 flex items-center justify-center relative group">
            {profile.avatarUrl && shouldLoadAvatar ? (
              <img
                src={profile.avatarUrl.startsWith('/media/') ? `/api/image-proxy?path=${profile.avatarUrl.substring(1)}` : profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl text-white font-bold">
                {(profile.displayName || 'U')[0].toUpperCase()}
              </span>
            )}
            {isCurrentUser && (
              <>
                <button
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-all shadow-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                {showAvatarMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 min-w-[160px]">
                      {profile.avatarUrl && (
                        <button
                          onClick={() => {
                            window.open(profile.avatarUrl, '_blank')
                            setShowAvatarMenu(false)
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 transition-colors rounded-t-xl"
                        >
                          View Avatar
                        </button>
                      )}
                      <label className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer block rounded-b-xl">
                        {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-16 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              {isCurrentUser && !profile.isVerified && (
                <button
                  onClick={() => router.push('/premium')}
                  className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                >
                  Verified Now
                </button>
              )}
              <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">
                {profile.isVerified && <VerifiedBadge className="mr-1 h-5 w-5 align-middle inline-flex" />}
                {profile.displayName}
              </h1>
            </div>
            <div className="flex items-center gap-2 mb-2 text-[rgb(var(--text-secondary))]">
              <p>@{profile.username}</p>
              {profile.category && (
                <span>• {profile.category}</span>
              )}
            </div>

            {profile.bio && (
              <p className="text-[rgb(var(--text-primary))] mb-2">{profile.bio}</p>
            )}

            {profile.joinedAt && (
              <div className="flex items-center text-[rgb(var(--text-secondary))] text-sm mb-3">
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
                <div className="text-xl font-bold text-[rgb(var(--text-primary))]">{stats.posts}</div>
                <div className="text-sm text-[rgb(var(--text-secondary))]">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[rgb(var(--text-primary))]">{stats.followers}</div>
                <div className="text-sm text-[rgb(var(--text-secondary))]">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[rgb(var(--text-primary))]">{stats.following}</div>
                <div className="text-sm text-[rgb(var(--text-secondary))]">Following</div>
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
                className="flex-1 bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))] py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={handleShare}
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))] p-2 rounded-lg transition-colors"
                aria-label="Share profile"
              >
                <Share className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/profile/menu')}
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))] p-2 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))]'
                    : 'bg-xapzap-blue hover:bg-xapzap-darkBlue text-white'
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
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))] p-2 rounded-lg transition-colors"
                aria-label="Message user"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 text-[rgb(var(--text-primary))] p-2 rounded-lg transition-colors"
                aria-label="Share profile"
              >
                <Share className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Creator Tools */}
        {isCurrentUser && (
          <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-4 mb-6">
            <h3 className="text-[rgb(var(--text-primary))] font-semibold mb-3">Creator Tools</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 p-3 rounded-lg transition-colors flex items-center gap-3"
              >
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-[rgb(var(--text-primary))] font-medium text-sm">Dashboard</div>
                  <div className="text-[rgb(var(--text-secondary))] text-xs">Insights & performance</div>
                </div>
              </button>
              <button
                onClick={() => router.push('/monetization')}
                className="bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--bg-secondary))]/80 p-3 rounded-lg transition-colors flex items-center gap-3"
              >
                <DollarSign className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-[rgb(var(--text-primary))] font-medium text-sm">Monetization</div>
                  <div className="text-[rgb(var(--text-secondary))] text-xs">Earnings & eligibility</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[rgb(var(--border-color))] mb-4">
          {(['posts', 'videos', 'news', 'all'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                profileStore.updateActiveTab(userId, tab)
              }}
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
