'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import appwriteService from '../appwriteService'

export default function DeleteAccountCard() {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      try {
        const user = await appwriteService.getCurrentUser()
        if (active) {
          setIsSignedIn(Boolean(user))
        }
      } catch {
        if (active) {
          setIsSignedIn(false)
        }
      }
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async () => {
    if (!isSignedIn || !confirmed || isDeleting) return

    const proceed = window.confirm(
      'This permanently deletes your XapZap account and associated app data. This action cannot be undone.'
    )

    if (!proceed) return

    setIsDeleting(true)
    setError(null)
    setMessage(null)

    try {
      await appwriteService.deleteCurrentAccount()
      setMessage(
        'Your deletion request completed. Most account data is removed immediately. Any limited residual records are then handled under the published retention rules.'
      )
      router.replace('/auth/signin?deleted=1')
    } catch (err: any) {
      setError(err?.message || 'Account deletion failed.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/30">
      <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">
        Delete this account now
      </h2>
      <p className="mt-2 text-sm leading-7 text-[rgb(var(--text-secondary))] sm:text-base">
        This action requires an active signed-in session. XapZap attempts to delete the
        profile, posts, comments, likes, follows, saves, blocks, reports, sessions, and
        related account data immediately through the same backend deletion function used by
        the app.
      </p>

      <div className="mt-4 rounded-xl border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-primary))] p-4">
        <label className="flex items-start gap-3 text-sm text-[rgb(var(--text-primary))]">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[rgb(var(--border-color))]"
          />
          <span>I understand this action is permanent and cannot be undone.</span>
        </label>

        {!isSignedIn ? (
          <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">
            Sign in first to use the live deletion action.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isSignedIn || !confirmed || isDeleting}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete My Account'}
          </button>
          <Link
            href="/auth/signin"
            className="rounded-full border border-[rgb(var(--border-color))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
          >
            Sign In
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-[rgb(var(--border-color))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="rounded-full border border-[rgb(var(--border-color))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text-primary))] transition hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
          >
            Terms of Service
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mt-4 text-sm leading-6 text-green-700 dark:text-green-400">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm leading-6 text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
