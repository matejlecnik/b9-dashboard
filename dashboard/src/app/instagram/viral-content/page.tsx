'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Play, Heart, Eye, Film, Image } from 'lucide-react'
import { InstagramSidebar } from '@/components/InstagramSidebar'

export default function ViralContentPage() {
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
          <h2 className="text-2xl font-bold">Viral Content Tracker</h2>
          <p className="text-gray-600 mt-1">Monitor high-performing posts and reels from approved creators</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Coming Soon
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reels</p>
                <p className="text-2xl font-bold">8K+</p>
              </div>
              <Film className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viral Content</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <TrendingUp className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Views</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold">892</p>
              </div>
              <Image className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Viral Detection Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Play className="h-4 w-4" />
                View Threshold
              </h3>
              <p className="text-sm text-gray-600">Content with 50,000+ views</p>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Multiplier
              </h3>
              <p className="text-sm text-gray-600">5x above creator's average performance</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Engagement Rate
              </h3>
              <p className="text-sm text-gray-600">High engagement relative to follower count</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Feed Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Film className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">Viral Content Detection Active</p>
            <p className="text-sm">High-performing reels and posts will appear here once identified</p>
            <p className="text-xs mt-4 text-gray-400">Scrapers run 4x daily to detect viral content</p>
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