'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import appwriteService from '../../appwriteService'
import { CreatorPlan, resolveCreatorPlan } from '../../lib/creator-plan'

export default function PremiumPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<CreatorPlan>('free')
  const [loading, setLoading] = useState(true)
  const [updatingPlan, setUpdatingPlan] = useState<CreatorPlan | null>(null)

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const user = await appwriteService.getCurrentUser()
        if (!user) {
          setCurrentPlan('free')
          return
        }
        const [isAdmin, profile] = await Promise.all([
          appwriteService.isCurrentUserAdmin().catch(() => false),
          appwriteService.getProfileByUserId(user.$id),
        ])
        setCurrentPlan(resolveCreatorPlan(profile, isAdmin))
      } catch {
        setCurrentPlan('free')
      } finally {
        setLoading(false)
      }
    }
    void loadPlan()
  }, [])

  const activatePlan = async (plan: CreatorPlan) => {
    if (plan === 'free') return
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }
      setUpdatingPlan(plan)
      // Persist tier using current profile shape with backward-compatible fields.
      await appwriteService.updateProfile(user.$id, {
        subscriptionTier: plan,
        subscription: plan === 'business' ? 'business' : 'premium',
        isPremiumCreator: true,
      })
      setCurrentPlan(plan)
      alert(`${plan === 'business' ? 'Business' : 'Basic'} plan activated successfully.`)
    } catch (error: any) {
      console.error('Failed to activate plan:', error)
      alert(error?.message || 'Failed to activate plan. Please try again.')
    } finally {
      setUpdatingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-primary))] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] sm:text-4xl">
          Creator Plans
        </h1>
        <p className="mt-3 text-sm text-[rgb(var(--text-secondary))] sm:text-base">
          Choose a plan for monetization features and upload permissions.
        </p>

        <div className="mt-6 rounded-xl border border-border/60 bg-card p-4 text-sm text-[rgb(var(--text-secondary))]">
          Current plan:{' '}
          <span className="font-semibold text-[rgb(var(--text-primary))]">
            {loading ? 'Loading...' : currentPlan === 'business' ? 'Business' : currentPlan === 'basic' ? 'Basic' : 'Free'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Basic</h2>
            <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
              For creators who want monetization-ready content posting.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[rgb(var(--text-secondary))]">
              <li>Post photo and text content</li>
              <li>Post video content</li>
              <li>Post reels</li>
            </ul>
            <button
              onClick={() => activatePlan('basic')}
              disabled={loading || updatingPlan !== null || currentPlan === 'basic'}
              className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {currentPlan === 'basic' ? 'Active Plan' : updatingPlan === 'basic' ? 'Activating...' : 'Activate Basic'}
            </button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Business</h2>
            <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
              For creators and brands who need all upload features.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[rgb(var(--text-secondary))]">
              <li>Everything in Basic</li>
              <li>Post news/articles (4th upload type)</li>
              <li>Full creator upload access</li>
            </ul>
            <button
              onClick={() => activatePlan('business')}
              disabled={loading || updatingPlan !== null || currentPlan === 'business'}
              className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {currentPlan === 'business'
                ? 'Active Plan'
                : updatingPlan === 'business'
                  ? 'Activating...'
                  : 'Activate Business'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-[rgb(var(--text-secondary))]">
          Plan activation currently updates your creator permissions directly in profile.
          Payment integration can be connected next.
        </p>
      </div>
    </div>
  )
}
