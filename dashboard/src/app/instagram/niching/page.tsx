'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Hash, Users, Target, TrendingUp } from 'lucide-react'
import { InstagramSidebar } from '@/components/InstagramSidebar'

export default function NichingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 131, 149, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 131, 149, 0.05) 0%, transparent 50%)
          `
        }}
      />

      {/* Sidebar */}
      <div className="relative z-50">
        <InstagramSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full flex flex-col min-h-0">
            <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Niching</h2>
          <p className="text-gray-600 mt-1">Categorize approved creators into niche groups</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Coming Soon
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-600" />
              Niche Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Create and manage niche groups for creator categorization</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Fashion & Beauty</li>
              <li>• Fitness & Health</li>
              <li>• Travel & Lifestyle</li>
              <li>• Gaming & Entertainment</li>
              <li>• Food & Cooking</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-600" />
              Bulk Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Assign multiple creators to niches simultaneously</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Unassigned creators</span>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total niches</span>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Get AI-powered niche recommendations based on content analysis</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>• Analyze bio keywords</p>
              <p>• Review content types</p>
              <p>• Check hashtag patterns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Niche Performance Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Feature in Development</p>
            <p className="text-sm">Track niche-specific engagement metrics and performance trends</p>
          </div>
        </CardContent>
      </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}