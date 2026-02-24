'use client'

export default function PremiumPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-3 text-[rgb(var(--text-primary))]">
          Pro Creator is coming soon
        </h1>
        <p className="text-[rgb(var(--text-secondary))] text-sm mb-6">
          Verified creators and admins can already upload videos longer than 2 minutes.
          Soon you&apos;ll be able to upgrade to Pro Creator here with Paystack to unlock
          longer uploads and more advanced tools.
        </p>
        <p className="text-[rgb(var(--text-secondary))] text-xs">
          This page is a placeholder. Premium creator features and payment integration
          will be added next.
        </p>
      </div>
    </div>
  )
}

