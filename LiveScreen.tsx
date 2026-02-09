'use client'

export function LiveScreen() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center py-12">
        <p className="text-muted-foreground">No live streams at the moment</p>
        <p className="text-sm text-muted-foreground mt-2">Check back later for live content!</p>
      </div>
    </div>
  )
}
