'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedditDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/categorization')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-b9-pink mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Reddit Dashboard...</p>
      </div>
    </div>
  )
}
