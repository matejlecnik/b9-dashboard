'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // TEMPORARY: Direct redirect to subreddit-review for development
    // TODO: Implement proper authentication flow
    console.log('HomePage: Redirecting to subreddit-review for development')
    router.replace('/subreddit-review')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink mx-auto mb-4"></div>
        <p className="text-gray-600">Loading B9 Dashboard...</p>
      </div>
    </div>
  )
}