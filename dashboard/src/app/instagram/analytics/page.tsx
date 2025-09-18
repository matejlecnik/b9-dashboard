'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, TrendingUp, Users, Activity, Calendar, Target, Award, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Analytics</h2>
          <p className="text-gray-600 mt-1">Deep insights into creator performance and trends</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Coming Soon
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tracked Creators</p>
                <p className="text-2xl font-bold">85</p>
                <p className="text-xs text-green-600 mt-1">All approved</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-gray-500 mt-1">Combined followers</p>
              </div>
              <Activity className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Engagement</p>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-gray-500 mt-1">Across all creators</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Content Analyzed</p>
                <p className="text-2xl font-bold">8.9K</p>
                <p className="text-xs text-gray-500 mt-1">Posts & Reels</p>
              </div>
              <BarChart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Engagement Trends</span>
                <Badge variant="secondary">Tracking</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Content Performance</span>
                <Badge variant="secondary">Analyzing</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Growth Rate</span>
                <Badge variant="secondary">Calculating</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Optimal Posting Times</span>
                <Badge variant="secondary">Learning</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-pink-600" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <p className="text-sm font-medium">Highest Engagement Rate</p>
                <p className="text-xs text-gray-600 mt-1">Based on likes, comments, and views</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <p className="text-sm font-medium">Most Viral Content</p>
                <p className="text-xs text-gray-600 mt-1">Creators with 50k+ view content</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <p className="text-sm font-medium">Fastest Growing</p>
                <p className="text-xs text-gray-600 mt-1">Highest follower growth rate</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg">
                <p className="text-sm font-medium">Most Consistent</p>
                <p className="text-xs text-gray-600 mt-1">Regular posting with stable engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Analytics Features (Coming Soon)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-semibold mb-1">Posting Patterns</h3>
              <p className="text-xs text-gray-600">Identify optimal posting schedules</p>
            </div>
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
              <TrendingUp className="h-6 w-6 text-pink-600 mb-2" />
              <h3 className="font-semibold mb-1">Growth Tracking</h3>
              <p className="text-xs text-gray-600">Monitor follower growth trends</p>
            </div>
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold mb-1">Engagement Analysis</h3>
              <p className="text-xs text-gray-600">Deep dive into engagement metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}