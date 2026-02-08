'use client'
import { useState } from 'react'
import { Heart, MessageCircle, Repeat2, Share, Bookmark, BarChart2, MoreHorizontal } from 'lucide-react'
import { Post } from './types'
interface PostCardProps { post: Post; isGuest?: boolean; onGuestAction?: () => void; }
export function PostCard({ post,