import { redirect } from 'next/navigation'
import appwriteService from '../../../appwriteService'
import { NewsDetailScreenDirect } from './NewsDetailScreenDirect'

type NewsDetailPageProps = {
  params: { id?: string } | Promise<{ id?: string }>
}

export const dynamic = 'force-dynamic'

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const resolvedParams = await params
  const id = resolvedParams?.id

  if (!id) {
    redirect('/news')
  }

  try {
    const rawDoc = await appwriteService.databases.getDocument(
      appwriteService.databaseId,
      appwriteService.collections.news,
      id
    )

    if (!rawDoc) {
      redirect('/news')
    }

    return <NewsDetailScreenDirect article={rawDoc} />
  } catch (error) {
    console.error('Failed to load news page details:', error)
    redirect('/news')
  }
}
