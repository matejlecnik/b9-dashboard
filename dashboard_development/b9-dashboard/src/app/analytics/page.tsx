'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Activity,
  Target,
  Zap
} from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <DashboardLayout
      title="Analytics"
      subtitle="Comprehensive insights and performance metrics for your subreddit categorization"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Coming Soon Banner */}
        <Card className="border-2 border-b9-pink/20 bg-gradient-to-r from-b9-pink/5 to-pink-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-b9-pink" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Advanced Analytics Dashboard</h3>
                  <p className="text-gray-600">Deep insights and performance tracking coming soon</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-b9-pink text-white border-b9-pink">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Feature Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Performance Metrics */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Performance Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Track categorization accuracy, processing speed, and team productivity metrics over time.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Categorization accuracy rates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Processing speed trends</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Team productivity insights</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* User Analytics */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">User Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Analyze team member contributions, categorization patterns, and individual performance.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Individual productivity metrics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Categorization patterns</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Quality score tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Time-based Reports */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Time-based Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Comprehensive reporting with historical data, trends, and predictive insights.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Daily/weekly/monthly reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Historical trend analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Predictive insights</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Real-time Monitoring */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Real-time Monitoring</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Live monitoring of categorization activities, system health, and performance alerts.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Live activity dashboard</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>System health monitoring</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Performance alerts</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Goal Tracking */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">Goal Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                Set and monitor categorization goals, milestones, and key performance indicators.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Custom goal setting</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Progress tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Achievement notifications</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Advanced Insights */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-base">Advanced Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed mb-4">
                AI-powered insights, recommendations, and automation suggestions for optimization.
              </CardDescription>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>AI-powered recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Automation opportunities</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-b9-pink rounded-full"></div>
                  <span>Optimization suggestions</span>
                </li>
              </ul>
            </CardContent>
          </Card>

        </div>

        {/* Call to Action */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-black">Ready to unlock powerful analytics?</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The Analytics dashboard will provide comprehensive insights into your categorization workflow, 
                helping you optimize processes and track team performance.
              </p>
              <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics Dashboard
                <Badge variant="secondary" className="ml-2 bg-gray-400 text-white text-xs">
                  Coming Soon
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}
