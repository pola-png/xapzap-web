'use client'

import { useRouter } from 'next/navigation'
import { UploadScreen } from '../../UploadScreen'

export default function UploadPage() {
  const router = useRouter()
  return <UploadScreen onClose={() => router.back()} />
}
