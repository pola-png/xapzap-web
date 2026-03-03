export function generateSlug(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
  
  return `${slug}-${id}`
}

export function extractIdFromSlug(slug: string): string {
  const normalized = typeof slug === 'string' ? slug.trim() : ''
  if (!normalized) return ''

  // Default slug format is "title-part-id", where id is the last segment.
  const lastSegment = normalized.split('-').pop()?.trim() || ''
  if (lastSegment) return lastSegment

  return normalized
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

  // Accept variable-length alphanumeric IDs (not fixed to 20/24 chars).
  const dynamicIdMatches = normalized.match(/[a-z0-9]{6,1024}/gi) || []
  dynamicIdMatches.forEach((value) => pushSafe(value))

  const uuidMatches =
    normalized.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) || []
  uuidMatches.forEach((value) => pushSafe(value))

  pushSafe(normalized)

  return Array.from(ids)
}
