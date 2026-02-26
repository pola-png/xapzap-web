import { Check } from 'lucide-react'

interface VerifiedBadgeProps {
  className?: string
}

export function VerifiedBadge({ className = '' }: VerifiedBadgeProps) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white ring-1 ring-blue-200/80 shadow-[0_0_0_1px_rgba(255,255,255,0.28)_inset,0_2px_8px_rgba(37,99,235,0.45)] ${className}`}
      aria-label="Verified"
      title="Verified"
    >
      <Check size={10} strokeWidth={3} />
      <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-white/80" aria-hidden="true" />
    </span>
  )
}
