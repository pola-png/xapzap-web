'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, DollarSign, Settings, MapPin, Calendar, Link as LinkIcon, MoreHorizontal, UserPlus, UserMinus, MessageCircle, Share, LogOut } from 'lucide-react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwriteService'
import { cn, formatTimeAgo } from './utils'

interface Profile {
  userId: string
  username: string
  displayName: string
  bio?: string
  avatarUrl?: string
  coverUrl?: string
  location?: string
  website?: string
  category?: string
  joinedAt: Date
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowing?: boolean
}

export function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [videoPosts, setVideoPosts] = useState<Post[]>([])
  const [newsPosts, setNewsPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoaded, setFollowLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'news' | 'all'>('posts')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showBannerMenu, setShowBannerMenu] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      // Device back button pressed - do nothing, let it navigate
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const loadProfile = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      setCurrentUser(user)
      
      if (!user) return

      // Load profile data
      const profileData = await appwriteService.getProfileByUserId(user.$id)
      
      if (profileData) {
        const profileInfo: Profile = {
          userId: user.$id,
          username: profileData.username || user.name || 'User',
          displayName: profileData.displayName || profileData.username || user.name || 'User',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatarUrl || '',
          coverUrl: profileData.coverUrl || '',
          location: profileData.location || '',
          website: profileData.website || '',
          category: profileData.category || '',
          joinedAt: new Date(profileData.$createdAt || user.$createdAt),
          followersCount: 0,
          followingCount: 0,
          postsCount: 0
        }
        setProfile(profileInfo)
      }

      // Load follow counts
      await loadFollowCounts(user.$id)
      
      // Load follow state
      await syncFollowState(user.$id)

      // Load user's posts
      const postsResult = await appwriteService.fetchPostsByUserIds([user.$id], 50)
      const userPosts = postsResult.documents.map((doc: any) => ({
          id: doc.$id,
          postId: doc.postId || doc.$id,
          userId: doc.userId,
          username: profileData?.displayName || profileData?.username || user.name || 'User',
          userAvatar: profileData?.avatarUrl || '',
          displayName: profileData?.displayName || profileData?.username || user.name || 'User',
          avatarUrl: profileData?.avatarUrl || '',
          content: doc.content || '',
          postType: doc.postType || doc.type || doc.category || 'text',
          title: doc.title || '',
          thumbnailUrl: doc.thumbnailUrl || '',
          mediaUrls: doc.mediaUrls || (doc.imageUrl ? [doc.imageUrl] : doc.videoUrl ? [doc.videoUrl] : []),
          timestamp: new Date(doc.createdAt || doc.$createdAt),
          createdAt: doc.createdAt || doc.$createdAt,
          likes: doc.likes || 0,
          comments: doc.comments || 0,
          reposts: doc.reposts || 0,
          shares: doc.shares || 0,
          impressions: doc.impressions || 0,
          views: doc.views || 0,
          isLiked: false,
          isReposted: false,
          isSaved: false,
          sourcePostId: doc.sourcePostId,
          sourceUserId: doc.sourceUserId,
          sourceUsername: doc.sourceUsername,
          textBgColor: doc.textBgColor,
          isBoosted: doc.isBoosted || false,
          activeBoostId: doc.activeBoostId || ''
        }))

      // Categorize posts
      const allPosts = userPosts
      const videos = userPosts.filter((post: any) => isVideoPost(post))
      const news = userPosts.filter((post: any) => isNewsPost(post))
      const regularPosts = userPosts.filter((post: any) => !isVideoPost(post) && !isNewsPost(post))

      setPosts(regularPosts)
      setVideoPosts(videos)
      setNewsPosts(news)
      
      // Update posts count
      setProfile(prev => prev ? { ...prev, postsCount: allPosts.length } : null)

    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const loadFollowCounts = async (userId: string) => {
    try {
      const [followersResult, followingResult] = await Promise.all([
        appwriteService.getFollowerCount(userId),
        appwriteService.getFollowingCount(userId)
      ])
      
      setProfile(prev => prev ? {
        ...prev,
        followersCount: followersResult,
        followingCount: followingResult
      } : null)
    } catch (error) {
      console.error('Failed to load follow counts:', error)
    }
  }

  const syncFollowState = async (targetUserId: string) => {
    if (!currentUser || currentUser.$id === targetUserId) {
      setIsFollowing(false)
      setFollowLoaded(true)
      return
    }

    try {
      const following = await appwriteService.isFollowing(currentUser.$id, targetUserId)
      setIsFollowing(following)
    } catch (error) {
      console.error('Failed to sync follow state:', error)
      setIsFollowing(false)
    } finally {
      setFollowLoaded(true)
    }
  }

  const handleFollow = async () => {
    if (!profile || !currentUser || !followLoaded) return
    
    const wasFollowing = isFollowing
    const prevCount = profile.followersCount
    
    setIsFollowing(!wasFollowing)
    setProfile(prev => prev ? {
      ...prev,
      followersCount: wasFollowing ? Math.max(0, prev.followersCount - 1) : prev.followersCount + 1
    } : null)
    
    try {
      if (wasFollowing) {
        await appwriteService.unfollowUser(profile.userId)
      } else {
        await appwriteService.followUser(profile.userId)
      }
    } catch (error) {
      console.error('Follow action failed:', error)
      setIsFollowing(wasFollowing)
      setProfile(prev => prev ? { ...prev, followersCount: prevCount } : null)
    }
  }

  const allPostsSorted = useMemo(() => {
    return [...posts, ...videoPosts, ...newsPosts]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [posts, videoPosts, newsPosts])

  const isVideoPost = (post: Post) => {
    const postType = post.postType?.toLowerCase() || ''
    return postType.includes('video') || postType.includes('reel')
  }

  const isNewsPost = (post: Post) => {
    const postType = post.postType?.toLowerCase() || ''
    return postType.includes('news')
  }

  const handleSignOut = async () => {
    try {
      await appwriteService.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    setUploadingAvatar(true)
    try {
      const avatarUrl = await appwriteService.uploadProfilePicture(file)
      await appwriteService.updateProfile(currentUser.$id, { avatarUrl })
      setProfile(prev => prev ? { ...prev, avatarUrl } : null)
      setShowAvatarMenu(false)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    setUploadingBanner(true)
    try {
      const { default: storageService } = await import('./storage')
      const coverUrl = await storageService.uploadFile(file)
      await appwriteService.updateProfile(currentUser.$id, { coverUrl })
      setProfile(prev => prev ? { ...prev, coverUrl } : null)
      setShowBannerMenu(false)
    } catch (error) {
      console.error('Failed to upload banner:', error)
    } finally {
      setUploadingBanner(false)
    }
  }

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    )
  }

  const isOwnProfile = currentUser?.$id === profile.userId

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover Photo */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gradient-to-r from-xapzap-blue via-purple-500 to-pink-500 relative overflow-hidden group">
          {profile.coverUrl && (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          {isOwnProfile && (
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
                  <div className="absolute top-16 right-4 bg-background border border-border rounded-xl shadow-2xl z-50 min-w-[160px]">
                    {profile.coverUrl && (
                      <button
                        onClick={() => {
                          window.open(profile.coverUrl, '_blank')
                          setShowBannerMenu(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors rounded-t-xl"
                      >
                        View Banner
                      </button>
                    )}
                    <label className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors cursor-pointer block rounded-b-xl">
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
        </div>
        
        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-6">
          <div className="w-32 h-32 rounded-full bg-background p-1 shadow-lg relative group">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                <span className="text-3xl font-bold">
                  {profile.displayName && profile.displayName.length > 0 
                    ? profile.displayName[0].toUpperCase() 
                    : 'U'}
                </span>
              </div>
            )}
            {isOwnProfile && (
              <>
                <button
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-xapzap-blue rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                {showAvatarMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-xl shadow-2xl z-50 min-w-[160px]">
                      {profile.avatarUrl && (
                        <button
                          onClick={() => {
                            window.open(profile.avatarUrl, '_blank')
                            setShowAvatarMenu(false)
                          }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors rounded-t-xl"
                        >
                          View Avatar
                        </button>
                      )}
                      <label className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors cursor-pointer block rounded-b-xl">
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
      <div className="pt-20 px-6 pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold mb-1">{profile.displayName}</h1>
            <p className="text-muted-foreground text-lg mb-3">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-lg mb-4 max-w-2xl">{profile.bio}</p>
            )}
            
            {profile.category && (
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-xapzap-blue/10 text-xapzap-blue text-sm font-medium rounded-full">
                  {profile.category}
                </span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {profile.location && (
                <div className="flex items-center space-x-1">
                  <MapPin size={16} />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center space-x-1">
                  <LinkIcon size={16} />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-xapzap-blue hover:underline"
                    onClick={(e) => {
                      // Validate URL to prevent open redirect attacks
                      try {
                        const url = new URL(profile.website!)
                        if (!['http:', 'https:'].includes(url.protocol)) {
                          e.preventDefault()
                          return
                        }
                      } catch {
                        e.preventDefault()
                        return
                      }
                    }}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar size={16} />
                <span className="text-sm">Joined {formatJoinDate(profile.joinedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isOwnProfile ? (
              <>
                <button 
                  onClick={() => router.push('/profile/menu')}
                  className="px-6 py-2 border border-border rounded-full hover:bg-accent transition-colors font-medium"
                >
                  <Settings size={16} className="inline mr-2" />
                  Menu
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={!followLoaded}
                  className={cn(
                    "px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-50",
                    isFollowing
                      ? "bg-muted text-foreground hover:bg-accent"
                      : "bg-xapzap-blue text-white hover:bg-blue-600"
                  )}
                >
                  {!followLoaded ? (
                    'Loading...'
                  ) : isFollowing ? (
                    <>
                      <UserMinus size={16} className="inline mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="inline mr-2" />
                      Follow
                    </>
                  )}
                </button>
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors" aria-label="Send message">
                  <MessageCircle size={16} />
                </button>
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors" aria-label="Share profile">
                  <Share size={16} />
                </button>
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors" aria-label="More options">
                  <MoreHorizontal size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex space-x-8 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold">{profile.postsCount}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center cursor-pointer hover:underline">
            <div className="text-2xl font-bold">{profile.followersCount}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center cursor-pointer hover:underline">
            <div className="text-2xl font-bold">{profile.followingCount}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex space-x-8">
            {[
              { key: 'posts', label: 'Posts', count: posts.length },
              { key: 'videos', label: 'Videos', count: videoPosts.length },
              { key: 'news', label: 'News', count: newsPosts.length },
              { key: 'all', label: 'All', count: profile.postsCount }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  "pb-4 px-1 border-b-2 font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-xapzap-blue text-xapzap-blue"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 text-sm">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'posts' && (
            <div className="space-y-0">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {isOwnProfile ? "You haven't posted yet" : "No posts yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile 
                      ? "Share your first post to get started!" 
                      : "This user hasn't shared any posts yet."}
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}
          
          {activeTab === 'videos' && (
            <div className="space-y-0">
              {videoPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎥</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                  <p className="text-muted-foreground">Video content will appear here</p>
                </div>
              ) : (
                videoPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}
          
          {activeTab === 'news' && (
            <div className="space-y-0">
              {newsPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📰</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No news yet</h3>
                  <p className="text-muted-foreground">News articles will appear here</p>
                </div>
              ) : (
                newsPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}
          
          {activeTab === 'all' && (
            <div className="space-y-0">
              {allPostsSorted.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📱</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {isOwnProfile ? "You haven't posted yet" : "No content yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile 
                      ? "Share your first post to get started!" 
                      : "This user hasn't shared any content yet."}
                  </p>
                </div>
              ) : (
                allPostsSorted.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}