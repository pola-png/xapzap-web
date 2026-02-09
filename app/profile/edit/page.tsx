'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ArrowLeft, Save, X } from 'lucide-react'
import appwriteService from '../../../appwriteService'

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Form fields
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Profile images
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [selectedCover, setSelectedCover] = useState<File | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const user = await appwriteService.getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const profile = await appwriteService.getProfileByUserId(user.$id)
      if (profile) {
        setUsername(profile.username || '')
        setDisplayName(profile.displayName || profile.username || user.name || '')
        setBio(profile.bio || '')
        setWebsite(profile.website || '')
        setPhone(profile.phone || '')
        setDateOfBirth(profile.dateOfBirth || '')
        setAvatarUrl(profile.avatarUrl || '')
        setCoverUrl(profile.coverUrl || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedAvatar(file)
      setHasChanges(true)
      // Preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedCover(file)
      setHasChanges(true)
      // Preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    // Validation
    if (!username.trim()) {
      alert('Username is required')
      return
    }

    if (username.length < 3) {
      alert('Username must be at least 3 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      alert('Username can only contain letters, numbers, and underscores')
      return
    }

    // TODO: Check username uniqueness when method is available
    // For now, skip this check

    setSaving(true)
    try {
      const user = await appwriteService.getCurrentUser()
      if (!user) return

      // Upload images if selected
      let finalAvatarUrl = avatarUrl
      let finalCoverUrl = coverUrl

      if (selectedAvatar) {
        // TODO: Implement image upload to storage
        console.log('Upload avatar:', selectedAvatar)
        // finalAvatarUrl = await uploadImage(selectedAvatar, 'avatar')
      }

      if (selectedCover) {
        // TODO: Implement image upload to storage
        console.log('Upload cover:', selectedCover)
        // finalCoverUrl = await uploadImage(selectedCover, 'cover')
      }

      // Update profile
      await appwriteService.updateProfile(user.$id, {
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        coverUrl: finalCoverUrl || undefined,
      })

      setHasChanges(false)
      router.back()
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (value: string, field: string) => {
    setHasChanges(true)
    switch (field) {
      case 'username':
        setUsername(value)
        break
      case 'displayName':
        setDisplayName(value)
        break
      case 'bio':
        setBio(value)
        break
      case 'website':
        setWebsite(value)
        break
      case 'phone':
        setPhone(value)
        break
      case 'dateOfBirth':
        setDateOfBirth(value)
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white p-2"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed px-4 py-2 font-medium"
          aria-label={saving ? 'Saving changes' : 'Save changes'}
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Cover Photo */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg overflow-hidden">
            {coverUrl && (
              <img
                src={coverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="absolute bottom-2 right-2">
            <label className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                aria-label="Change cover photo"
              />
            </label>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-gray-800 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl text-white font-bold">
                  {(displayName || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 right-0">
              <label className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  aria-label="Change profile picture"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => handleFieldChange(e.target.value, 'username')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="yourusername"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => handleFieldChange(e.target.value, 'displayName')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => handleFieldChange(e.target.value, 'bio')}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => handleFieldChange(e.target.value, 'website')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => handleFieldChange(e.target.value, 'phone')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => handleFieldChange(e.target.value, 'dateOfBirth')}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
      </div>
    </div>
  )
}