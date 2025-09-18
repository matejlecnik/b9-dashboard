'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function InstagramDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.push('/instagram/creator-review')
  }, [router])

  return null
}
