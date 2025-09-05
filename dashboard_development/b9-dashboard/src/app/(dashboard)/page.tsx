'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardRoot() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/subreddit-review')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink"></div>
    </div>
  )
}
