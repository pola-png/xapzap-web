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
    loadPosts();
  }, []);

  const loadPosts