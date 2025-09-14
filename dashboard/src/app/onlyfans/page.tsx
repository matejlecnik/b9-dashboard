'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const OnlyFansIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173 0 0-2.399.585-4.43 0 4.018-.777 6.333-3.037 7.005-5.995zM5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996 7.996 7.996 0 0 0-7.996-7.996Zm0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/>
  </svg>
)

export default function OnlyFansDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OnlyFans Dashboard</h1>
              <p className="text-gray-600 mt-1">Coming Soon - Q2 2025</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-cyan-600 rounded-xl">
              <OnlyFansIcon className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl">OnlyFans Analytics Platform</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Revenue tracking, subscriber growth optimization, and content performance analytics.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600">Q2</p>
                <p className="text-sm text-gray-600">2025 Launch</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600">Revenue</p>
                <p className="text-sm text-gray-600">Tracking</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600">Growth</p>
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
