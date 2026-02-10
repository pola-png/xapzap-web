'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthScreen } from './AuthScreen'
import appwriteService from './appwriteService'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await appwriteService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    checkAuthState()
  }

  const handleSignOut = async () => {
    try {
      await appwriteService.signOut()
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-xapzap-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/']

  // Check if current route requires authentication
  const requiresAuth = !publicRoutes.includes(pathname)

  if (requiresAuth && !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  return <>{children}</>
}

// RouteGuard component for protecting specific routes
interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function RouteGuard({ children, requireAuth = true }: RouteGuardProps) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      const currentUser = await appwriteService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-xapzap-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    router.push('/auth/signin')
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-xapzap-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    )
  }

  // If user is logged in but trying to access auth pages, redirect to home
  if (!requireAuth && user && (pathname.startsWith('/auth/'))) {
    router.push('/')
    return null
  }

  return <>{children}</>
}
