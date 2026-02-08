'use client'

import { useState, useEffect } from 'react'
import { cn } from './utils'
import { PostCard } from './PostCard'
import { StoryBar } from './StoryBar'
import { Post } from './types'
import appwriteService from './appwriteService'

export function HomeScreen() {
  const [activeTab, setActiveTab] = use