import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import appwriteService from '../../../appwriteService'
import { NewsDetailScreenDirect } from './NewsDetailScreenDirect'

type NewsDetailPageProps = {
  params: { id?: string } | Promise<{ id?: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (!id) return {}

  try {
    const rawDoc = await appwriteService.fetchNewsArticle(id)
    if (!rawDoc) return {}

    const title = rawDoc.seoTitle || rawDoc.title || 'XapZap News'
    const description = rawDoc.seoDescription || rawDoc.summary || 'Read the latest updates on XapZap.'
    const keywords = rawDoc.seoKeywords || rawDoc.tags?.join(', ') || ''
    const canonical = rawDoc.canonicalUrl || `https://xapzap.com/news/${id}`
    const imageUrl = rawDoc.thumbnailUr || rawDoc.thumbnailUrl || ''

    return {
      title,
      description,
      keywords,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'article',
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      },
    }
  } catch (_) {
    return {}
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const resolvedParams = await params
  const id = resolvedParams?.id

  if (!id) {
    redirect('/news')
  }

  try {
    const rawDoc = await appwriteService.fetchNewsArticle(id)

    if (!rawDoc) {
      redirect('/news')
    }

    const jsonLdString = rawDoc.jsonLdSchema || ''

    return (
      <>
        {jsonLdString && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdString }}
          />
        )}
        <NewsDetailScreenDirect article={rawDoc} />
      </>
    )
  } catch (error) {
    console.error('Failed to load news page details:', error)
    redirect('/news')
  }
}
