'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Users, Eye, TrendingUp, Activity } from 'lucide-react'
import appwriteService from './appwriteService'
import { cn } from './utils'

export function DashboardScreen() {
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    impressions: 0,
    views: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) return

      const [followers, postsResult] = await Promise.all([
        appwriteService.getFollowerCount(user.$id),
        appwriteService.fetchPostsByUserIds([user.$id], 100)
      ])

      const totalImpressions = postsResult.documents.reduce((sum, doc) => sum + (doc.impressions || 0), 0)
      const totalViews = postsResult.documents.reduce((sum, doc) => sum + (doc.views || 0), 0)

      setStats({
        posts: postsResult.documents.length,
        followers,
        impressions: totalImpressions,
        views: totalViews
      })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded-lg w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Insights & performance overview</p>
        </div>
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Posts</p>
              <p className="text-3xl font-bold">{stats.posts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="group bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Followers</p>
              <p className="text-3xl font-bold">{stats.followers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="group bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-destructive/10 rounded-xl group-hover:bg-destructive/20 transition-colors">
              <Eye className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Impressions</p>
              <p className="text-3xl font-bold">{stats.impressions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="group bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Views</p>
              <p className="text-3xl font-bold">{stats.views.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Post Performance (30 days)
          </h2>
          <div className="h-80 bg-gradient-to-r from-muted to-muted/50 rounded-2xl flex items-center justify-center text-muted-foreground">
            Chart placeholder - integrate Recharts or similar
          </div>
        </div>

        <div className="bg-card p