export function generateSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
  
  return `${slug}-${id}`
}

export function extractIdFromSlug(slug: string): string {
  // Extract last UUID segment (format: title-slug-uuid)
  const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  const match = slug.match(uuidPattern)
  return match ? match[0] : slug.split('-').pop() || slug
}

export function extractCandidateIdsFromSlug(slug: string): string[] {
  const normalized = typeof slug === 'string' ? slug.trim() : ''
  if (!normalized) return []

  const ids = new Set<string>()
  const pushSafe = (value?: string | null) => {
    if (!value) return
    const v = value.trim()
    if (!v) return
    const lower = v.toLowerCase()
    if (lower === 'undefined' || lower === 'null' || lower === 'nan') return
    ids.add(v)
  }

  pushSafe(extractIdFromSlug(normalized))

  const appwriteIdMatches = normalized.match(/[a-z0-9]{20}/gi) || []
  appwriteIdMatches.forEach((value) => pushSafe(value))

  const uuidMatches =
    normalized.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) || []
  uuidMatches.forEach((value) => pushSafe(value))

  pushSafe(normalized)

  return Array.from(ids)
}
