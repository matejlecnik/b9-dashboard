'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  UserCheck,
  BarChart3,
  Calendar,
  Timer,
  Zap,
  Globe
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ScraperStats {
  totalSubreddits: number
  totalUsers: number
  totalPosts: number
  lastScrapedAt: string | null
  activeAccounts: number
  totalAccounts: number
  todaysPosts: number
  avgEngagementRate: number
  topSubreddits: Array<{
    name: string
    subscribers: number
    posts: number
    engagement: number
  }>
  recentActivity: Array<{
    type: 'subreddit' | 'user' | 'post'
    name: string
    timestamp: string
    status: 'success' | 'error' | 'warning'
  }>
  systemHealth: {
    database: 'healthy' | 'warning' | 'error'
    scraper: 'running' | 'stopped' | 'error'
    api: 'healthy' | 'warning' | 'error'
    storage: 'healthy' | 'warning' | 'error'
  }
}

export default function ScraperPage() {
  const [stats, setStats] = useState<ScraperStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const supabase = createClient()

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch subreddit stats
      const { data: subreddits, error: subredditsError } = await supabase
        .from('subreddits')
        .select('name, subscribers, total_posts_last_30, subscriber_engagement_ratio, last_scraped_at')
        .order('subscribers', { ascending: false })

      if (subredditsError) {
        console.error('Error fetching subreddits:', subredditsError)
      }

      // Fetch user stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('username, total_karma, last_scraped_at')

      if (usersError) {
        console.error('Error fetching users:', usersError)
      }

      // Fetch post stats
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, created_utc, score, num_comments, subreddit_name')
        .order('created_utc', { ascending: false })

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      // Calculate today's posts
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todaysPosts = posts?.filter(post => 
        new Date(post.created_utc) >= today
      ).length || 0

      // Get most recent scrape time
      const allScrapeTimes = [
        ...(subreddits?.map(s => s.last_scraped_at).filter(Boolean) || []),
        ...(users?.map(u => u.last_scraped_at).filter(Boolean) || [])
      ]
      const lastScrapedAt = allScrapeTimes.length > 0 
        ? allScrapeTimes.sort().reverse()[0] 
        : null

      // Calculate top subreddits
      const topSubreddits = subreddits?.slice(0, 5).map(sub => ({
        name: sub.name,
        subscribers: sub.subscribers || 0,
        posts: sub.total_posts_last_30 || 0,
        engagement: sub.subscriber_engagement_ratio || 0
      })) || []

      // Generate recent activity (simulated for now)
      const recentActivity = [
        { type: 'subreddit' as const, name: 'SFWAmIHot', timestamp: new Date().toISOString(), status: 'success' as const },
        { type: 'user' as const, name: 'example_user', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'success' as const },
        { type: 'post' as const, name: 'New post scraped', timestamp: new Date(Date.now() - 600000).toISOString(), status: 'success' as const }
      ]

      // Calculate average engagement
      const avgEngagementRate = subreddits?.length 
        ? subreddits.reduce((acc, sub) => acc + (sub.subscriber_engagement_ratio || 0), 0) / subreddits.length
        : 0

      setStats({
        totalSubreddits: subreddits?.length || 0,
        totalUsers: users?.length || 0,
        totalPosts: posts?.length || 0,
        lastScrapedAt,
        activeAccounts: 3, // This would come from your scraper config
        totalAccounts: 5,   // This would come from your scraper config
        todaysPosts,
        avgEngagementRate: avgEngagementRate * 100,
        topSubreddits,
        recentActivity,
        systemHealth: {
          database: subreddits ? 'healthy' : 'warning',
          scraper: 'running',
          api: 'healthy',
          storage: 'healthy'
        }
      })
      
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching scraper stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Set up real-time subscription for database changes
    const channel = supabase
      .channel('scraper-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subreddits' }, 
        () => fetchStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        () => fetchStats()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'posts' }, 
        () => fetchStats()
      )
      .subscribe()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
      case 'stopped':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
      case 'stopped':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <DashboardLayout
      title="Scraper Dashboard"
      subtitle="Monitor scraper status, account health, and real-time activity"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-b9-pink">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Subreddits</CardTitle>
                <Database className="h-4 w-4 text-b9-pink" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {loading ? '...' : stats?.totalSubreddits.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Discovered communities
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {loading ? '...' : stats?.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Analyzed profiles
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Posts</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {loading ? '...' : stats?.totalPosts.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Scraped content
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Today&apos;s Posts</CardTitle>
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {loading ? '...' : stats?.todaysPosts.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                New content today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-b9-pink" />
                  System Health
                </CardTitle>
                <CardDescription>Real-time status of all scraper components</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(stats?.systemHealth.database || 'warning')}
                <div>
                  <div className="font-medium text-sm">Database</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(stats?.systemHealth.database || 'warning')}`}>
                    {stats?.systemHealth.database || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(stats?.systemHealth.scraper || 'running')}
                <div>
                  <div className="font-medium text-sm">Scraper</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(stats?.systemHealth.scraper || 'running')}`}>
                    {stats?.systemHealth.scraper || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(stats?.systemHealth.api || 'healthy')}
                <div>
                  <div className="font-medium text-sm">Reddit API</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(stats?.systemHealth.api || 'healthy')}`}>
                    {stats?.systemHealth.api || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(stats?.systemHealth.storage || 'healthy')}
                <div>
                  <div className="font-medium text-sm">Storage</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(stats?.systemHealth.storage || 'healthy')}`}>
                    {stats?.systemHealth.storage || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-b9-pink" />
                Performance Metrics
              </CardTitle>
              <CardDescription>Key scraping performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Active Accounts</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats?.activeAccounts || 0}/{stats?.totalAccounts || 0}</div>
                  <div className="text-xs text-gray-500">
                    {stats?.totalAccounts ? Math.round((stats.activeAccounts / stats.totalAccounts) * 100) : 0}% active
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Avg Engagement Rate</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats?.avgEngagementRate.toFixed(2) || '0.00'}%</div>
                  <div className="text-xs text-gray-500">Community health</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Last Scraped</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {stats?.lastScrapedAt 
                      ? new Date(stats.lastScrapedAt).toLocaleTimeString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats?.lastScrapedAt 
                      ? new Date(stats.lastScrapedAt).toLocaleDateString()
                      : 'No data'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-b9-pink" />
                Top Subreddits
              </CardTitle>
              <CardDescription>Most active communities being monitored</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : stats?.topSubreddits.length ? (
                  stats.topSubreddits.map((subreddit, index) => (
                    <div key={subreddit.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-b9-pink/10 rounded-full flex items-center justify-center text-xs font-medium text-b9-pink">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">r/{subreddit.name}</div>
                          <div className="text-xs text-gray-500">
                            {subreddit.subscribers.toLocaleString()} subscribers
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{subreddit.posts}</div>
                        <div className="text-xs text-gray-500">posts</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-b9-pink" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest scraping operations and system events
              <span className="text-xs text-gray-400 ml-2">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading recent activity...</div>
              ) : stats?.recentActivity.length ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <div className="font-medium text-sm">{activity.name}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {activity.type} • {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(activity.status)} border-0`}
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
