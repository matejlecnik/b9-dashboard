'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, TrendingUp, Users, Activity, Calendar, Target, Award, Zap, Play, Hash, Eye } from 'lucide-react'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { InstagramMetricsCards } from '@/components/instagram/InstagramMetricsCards'

export default function AnalyticsPage() {
  // Mock data for metrics - replace with actual data fetch
  const analyticsData = {
    totalCreators: 85,
    activeCreators: 72,
    topPerformers: 12,
    avgEngagement: 4.2,
    totalReach: 3500000,
    totalContent: 8900
  }

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
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Creator Analytics</h2>
                  <p className="text-gray-600 mt-1">Deep insights into creator performance and trends</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Coming Soon
                </Badge>
              </div>

              {/* Analytics Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl p-5 transition-all duration-300 ease-out min-h-[120px] bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl text-purple-700 bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-2xl font-bold text-gray-900">{analyticsData.totalCreators}</div>
                    <div className="text-sm font-semibold text-gray-700">Tracked Creators</div>
                    <div className="text-xs text-green-600">All approved</div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 transition-all duration-300 ease-out min-h-[120px] bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl text-pink-600 bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-2xl font-bold text-gray-900">3.5M</div>
                    <div className="text-sm font-semibold text-gray-700">Total Reach</div>
                    <div className="text-xs text-gray-500">Combined followers</div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 transition-all duration-300 ease-out min-h-[120px] bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl text-blue-600 bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-2xl font-bold text-gray-900">4.2%</div>
                    <div className="text-sm font-semibold text-gray-700">Avg Engagement</div>
                    <div className="text-xs text-gray-500">Across all creators</div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 transition-all duration-300 ease-out min-h-[120px] bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl text-green-600 bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                      <BarChart className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-2xl font-bold text-gray-900">8.9K</div>
                    <div className="text-sm font-semibold text-gray-700">Content Analyzed</div>
                    <div className="text-xs text-gray-500">Posts & Reels</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/80 backdrop-blur-xl border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg backdrop-blur-sm">
                        <span className="text-sm font-medium">Engagement Trends</span>
                        <Badge variant="secondary" className="bg-purple-100">Tracking</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg backdrop-blur-sm">
                        <span className="text-sm font-medium">Content Performance</span>
                        <Badge variant="secondary" className="bg-pink-100">Analyzing</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg backdrop-blur-sm">
                        <span className="text-sm font-medium">Growth Rate</span>
                        <Badge variant="secondary" className="bg-blue-100">Calculating</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg backdrop-blur-sm">
                        <span className="text-sm font-medium">Optimal Posting Times</span>
                        <Badge variant="secondary" className="bg-green-100">Learning</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-xl border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-pink-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg backdrop-blur-sm">
                        <p className="text-sm font-medium">Highest Engagement Rate</p>
                        <p className="text-xs text-gray-600 mt-1">Based on likes, comments, and views</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg backdrop-blur-sm">
                        <p className="text-sm font-medium">Most Viral Content</p>
                        <p className="text-xs text-gray-600 mt-1">Creators with 50k+ view content</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg backdrop-blur-sm">
                        <p className="text-sm font-medium">Fastest Growing</p>
                        <p className="text-xs text-gray-600 mt-1">Highest follower growth rate</p>
                      </div>
                      <div className="p-3 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg backdrop-blur-sm">
                        <p className="text-sm font-medium">Most Consistent</p>
                        <p className="text-xs text-gray-600 mt-1">Regular posting with stable engagement</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/80 backdrop-blur-xl border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Analytics Features (Coming Soon)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                      <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                      <h3 className="font-semibold mb-1">Posting Patterns</h3>
                      <p className="text-xs text-gray-600">Identify optimal posting schedules</p>
                    </div>
                    <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-pink-300 transition-colors">
                      <TrendingUp className="h-6 w-6 text-pink-600 mb-2" />
                      <h3 className="font-semibold mb-1">Growth Tracking</h3>
                      <p className="text-xs text-gray-600">Monitor follower growth trends</p>
                    </div>
                    <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <Activity className="h-6 w-6 text-blue-600 mb-2" />
                      <h3 className="font-semibold mb-1">Engagement Analysis</h3>
                      <p className="text-xs text-gray-600">Deep dive into engagement metrics</p>
                    </div>
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