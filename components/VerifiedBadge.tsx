import { Check } from 'lucide-react'

interface VerifiedBadgeProps {
  className?: string
}

export function VerifiedBadge({ className = '' }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white ${className}`}
      aria-label="Verified"
      title="Verified"
    >
      <Check size={10} strokeWidth={3} />
    </span>
  )
}

