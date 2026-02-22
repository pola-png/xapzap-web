'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import appwriteService from '../../../appwriteService'
import { useProfileStore } from '../../../profileStore'

export default function EditProfilePage() {
  const router = useRouter()
  const profileStore = useProfileStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const profile = await appwriteService.getProfileByUserId(user.$id)
      if (profile) {
        setDisplayName(profile.displayName || '')
        setUsername(profile.username || '')
        setBio(profile.bio || '')
        setLocation(profile.location || '')
        setWebsite(profile.website || '')
        setCategory(profile.category || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) return

      await appwriteService.updateProfile(user.$id, {
        displayName,
        username,
        bio,
        location,
        website,
        category
      })

      profileStore.clearProfile(user.$id)
      router.push('/profile')
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-xapzap-blue"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-xapzap-blue text-white rounded-full font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
            placeholder="Your display name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
            placeholder="@username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue resize-none"
            placeholder="Tell us about yourself"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
            placeholder="City, Country"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-xapzap-blue"
          >
            <option value="">Select a category</option>
            <option value="Creator">Creator</option>
            <option value="Business">Business</option>
            <option value="Artist">Artist</option>
            <option value="Musician">Musician</option>
            <option value="Influencer">Influencer</option>
            <option value="Developer">Developer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  )
}
