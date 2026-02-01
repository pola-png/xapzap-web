'use client'

import { useState, useEffect, useMemo } from 'react'
import { Settings, MapPin, Calendar, Link as LinkIcon, MoreHorizontal, UserPlus, UserMinus, MessageCircle, Share, LogOut } from 'lucide-react'
import { PostCard } from './PostCard'
import { Post } from './types'
import appwriteService from './appwrite'
import { cn } from './utils'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoaded, setFollowLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'news' | 'all'>('posts')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
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
      const postsResult = await appwriteService.fetchPosts(50)
      const userPosts = postsResult.documents
        .filter((doc: any) => doc.userId === user.$id)
        .map((doc: any) => ({
          id: doc.$id,
          username: profileData?.displayName || profileData?.username || user.name || 'User',
          userAvatar: profileData?.avatarUrl || '',
          content: doc.content || '',
          imageUrl: doc.imageUrl || doc.thumbnailUrl || '',
          videoUrl: doc.videoUrl || '',
          kind: doc.postType || doc.type || doc.category || doc.kind || '',
          title: doc.title || '',
          thumbnailUrl: doc.thumbnailUrl || '',
          timestamp: new Date(doc.createdAt || doc.$createdAt),
          likes: doc.likes || 0,
          comments: doc.comments || 0,
          reposts: doc.reposts || 0,
          impressions: doc.impressions || 0,
          views: doc.views || 0,
          isLiked: false,
          isReposted: false,
          isSaved: false,
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
    } finally {
      setIsLoading(false)
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
    
    try {
      if (isFollowing) {
        await appwriteService.unfollowUser(profile.userId)
        setIsFollowing(false)
        setProfile(prev => prev ? {
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1)
        } : null)
      } else {
        await appwriteService.followUser(profile.userId)
        setIsFollowing(true)
        setProfile(prev => prev ? {
          ...prev,
          followersCount: prev.followersCount + 1
        } : null)
      }
    } catch (error) {
      console.error('Follow action failed:', error)
    }
  }

  const allPostsSorted = useMemo(() => {
    return [...posts, ...videoPosts, ...newsPosts]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [posts, videoPosts, newsPosts])

  const isVideoPost = (post: Post) => {
    const kind = post.kind?.toLowerCase() || ''
    return kind.includes('video') || kind.includes('reel') || kind.includes('short') || !!post.videoUrl
  }

  const isNewsPost = (post: Post) => {
    const kind = post.kind?.toLowerCase() || ''
    return kind.includes('news') || kind.includes('blog')
  }

  const handleSignOut = async () => {
    try {
      await appwriteService.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-48 bg-muted" />
          <div className="p-6">
            <div className="h-6 bg-muted rounded mb-2" />
            <div className="h-4 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    )
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
        <div className="h-48 md:h-64 bg-gradient-to-r from-xapzap-blue via-purple-500 to-pink-500 relative overflow-hidden">
          {profile.coverUrl && (
            <img
              src={profile.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-6">
          <div className="w-32 h-32 rounded-full bg-background p-1 shadow-lg">
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
                <button className="px-6 py-2 border border-border rounded-full hover:bg-accent transition-colors font-medium">
                  <Settings size={16} className="inline mr-2" />
                  Edit Profile
                </button>
                <button 
                  onClick={handleSignOut}
                  className="px-6 py-2 border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut size={16} className="inline mr-2" />
                  Sign Out
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
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors">
                  <MessageCircle size={16} />
                </button>
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors">
                  <Share size={16} />
                </button>
                <button className="p-2 border border-border rounded-full hover:bg-accent transition-colors">
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