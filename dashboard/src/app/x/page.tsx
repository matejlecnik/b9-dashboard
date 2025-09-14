'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const XIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
)

export default function XDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboards">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">X Dashboard</h1>
              <p className="text-gray-400 mt-1">Coming Soon - Q4 2025</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto mt-20 bg-gray-900/50 border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-black rounded-xl">
              <XIcon className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">X (Twitter) Analytics Platform</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-400">
              X engagement tracking, audience analysis, and trending topic monitoring.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-2xl font-bold text-white">Q4</p>
                <p className="text-sm text-gray-400">2025 Launch</p>
              </div>
              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-2xl font-bold text-white">Real-time</p>
                <p className="text-sm text-gray-400">Engagement</p>
              </div>
              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-2xl font-bold text-white">Audience</p>
                <p className="text-sm text-gray-400">Analysis</p>
              </div>
            </div>
            <div className="pt-6">
              <Link href="/dashboards">
                <Button variant="outline" className="text-white border-white hover:bg-white hover:text-black">
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
