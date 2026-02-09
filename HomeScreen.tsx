'use client'

import { useEffect, useState } from "react"
import { StoryBar } from "./StoryBar"
import { PostCard } from "./PostCard"
import { VideoDetailScreen } from "./VideoDetailScreen"
import { Post } from "./types"
import appwriteService from "./appwriteService"

export function HomeScreen() {
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Post | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (user) {
        setCurrentUserId(user.$id)
        // Use personalized For You feed for logged-in users
        const result = await appwriteService.fetchForYouFeed(user.$id)
        setPosts(result.documents.map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        })) as Post[])
      } else {
        // Fallback to regular posts for guests
        const result = await appwriteService.fetchPosts()
        setPosts(result.documents.map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        })) as Post[])
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
      // Fallback to regular posts
      try {
        const result = await appwriteService.fetchPosts()
        setPosts(result.documents.map((d: any) => ({
          ...d,
          id: d.$id,
          timestamp: new Date(d.$createdAt || d.createdAt),
        })) as Post[])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <StoryBar />
        <div className="space-y-4 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                feedType="home"
                onVideoClick={setSelectedVideo}
              />
            ))
          )}
        </div>
      </div>

      {selectedVideo && (
        <VideoDetailScreen
          post={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  )
}
