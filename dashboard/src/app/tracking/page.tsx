'use client'

import Link from 'next/link'
import { ArrowLeft, Target } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

export default function TrackingDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tracking Dashboard</h1>
              <p className="text-gray-600 mt-1">Coming Soon - Q3 2025</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-purple-600 rounded-xl">
              <Target className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl">Cross-Platform Tracking</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Unified performance tracking and analytics across all social media platforms.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">Q3</p>
                <p className="text-sm text-gray-600">2025 Launch</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">Multi</p>
                <p className="text-sm text-gray-600">Platform</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">Real-time</p>
                <p className="text-sm text-gray-600">Analytics</p>
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
