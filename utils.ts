import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins === 1) return '1 minute ago'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays <= 28) return `${diffDays} days ago`
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yearDiff = now.getFullYear() - past.getFullYear()
  
  if (yearDiff === 0) {
    return `${months[past.getMonth()]} ${past.getDate()}`
  }
  return `${months[past.getMonth()]} ${past.getDate()}, ${past.getFullYear()}`
}