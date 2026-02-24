export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[rgb(var(--accent-blue))] border-t-transparent animate-spin" />
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          Loading XapZap…
        </p>
      </div>
    </div>
  )
}
