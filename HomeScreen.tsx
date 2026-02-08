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
