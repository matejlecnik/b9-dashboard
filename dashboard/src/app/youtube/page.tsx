'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const YouTubeIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

export default function YouTubeDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">YouTube Dashboard</h1>
              <p className="text-gray-600 mt-1">Coming Soon - Q4 2025</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-red-600 rounded-xl">
              <YouTubeIcon className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl">YouTube Analytics Platform</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Channel analytics, video performance tracking, and subscriber growth optimization.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">Q4</p>
                <p className="text-sm text-gray-600">2025 Launch</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">Video</p>
                <p className="text-sm text-gray-600">Analytics</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">Channel</p>
                <p className="text-sm text-gray-600">Growth</p>
              </div>
            </div>
            <div className="pt-6">
              <Link href="/dashboards">
                <Button variant="outline">
                  Back to Dashboards
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
