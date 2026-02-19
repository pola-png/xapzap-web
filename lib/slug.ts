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
