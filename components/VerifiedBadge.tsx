import { Check } from 'lucide-react'

interface VerifiedBadgeProps {
  className?: string
}

export function VerifiedBadge({ className = '' }: VerifiedBadgeProps) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white ring-1 ring-white/80 ${className}`}
      aria-label="Verified"
      title="Verified"
    >
      <Check size={10} strokeWidth={3} />
      <span
        className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-white bg-red-500"
        aria-hidden="true"
      />
    </span>
  )
}
