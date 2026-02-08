'use client'

import { useEffect, useState } from "react";
import { StoryBar } from "./StoryBar";
import { PostCard } from "./PostCard";
import { Post } from "./types";
import appwriteService from "./appwriteService";

export function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["For You", "Watch", "Reels", "Live", "News", "Following"];

  useEffect(() => {
    appwriteService.fetchPosts(20).then(result => {
      setPosts(result.documents.map((d: any) => ({
        id: d.$id,
        postId: d.postId,
        userId: d.userId,
        username: d.username,
        userAvatar: d.userAvatar,
        content: d.content,
        likes: d.likes || 0,
        comments: d.comments || 0,
        reposts: d.reposts || 0,
        timestamp: new Date(d.createdAt),
        createdAt: d.createdAt,
        isLiked: false,
        isReposted: false,
        isSaved: false,
        isBoosted: false,
      })) as Post[]);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto min-h-screen">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(i)} 
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition ${activeTab === i ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 0 && <StoryBar />}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No posts yet</div>
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              isGuest={false} 
              onGuestAction={() => {}}
            />
          ))
        )}
      </div>
    </div>
  );
}
