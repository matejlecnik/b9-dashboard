'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Database, 
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
  Globe,
  Wifi,
  Shield,
  AlertCircle,
  Zap,
  Target,
  TrendingDown
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { MetricsCardsSkeleton } from '@/components/SkeletonLoaders'
import { useToast } from '@/components/ui/toast'

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
    type: 'subreddit' | 'user' | 'post' | 'system' | 'discovery'
    name?: string
    message?: string
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

interface ScraperStatus {
  discovery: {
    subreddits_found_24h: number
    new_subreddits: Array<{ name: string; created_at: string }>
    processing_speed: number
  }
  data_quality: {
    total_records: number
    complete_records: number
    missing_fields: number
    quality_score: number
    error_rate: number
  }
  system_health: {
    database: string
    scraper: string
    reddit_api: string
    storage: string
  }
  recent_activity: Array<{
    type: string
    message: string
    timestamp: string
    status: string
  }>
  error_feed: Array<{
    timestamp: string
    message: string
    context: Record<string, unknown> | null
    level: string
  }>
  last_updated: string
}

interface AccountStatus {
  accounts: {
    total: number
    active: number
    details: Array<{ username: string; status: string }>
  }
  proxies: {
    total: number
    active: number
    details: Array<{ host: string; port: number; status: string }>
  }
}

export default function ScraperPage() {
  const [stats, setStats] = useState<ScraperStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [topSubredditsVisible, setTopSubredditsVisible] = useState<number>(5)
  const [accountsStatus, setAccountsStatus] = useState<AccountStatus | null>(null)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const { addToast } = useToast()

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const now = new Date()
      const startBoundary = new Date(now)
      if (timeRange === '24h') startBoundary.setDate(now.getDate() - 1)
      if (timeRange === '7d') startBoundary.setDate(now.getDate() - 7)
      if (timeRange === '30d') startBoundary.setDate(now.getDate() - 30)
      
      // Fetch posts in the selected range first
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, created_utc, score, num_comments, subreddit_name')
        .gte('created_utc', startBoundary.toISOString())
        .order('created_utc', { ascending: false })
        .limit(500)

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      }

      // Derive distinct subreddits from posts to limit the subreddits query
      const distinctSubredditNames = Array.from(new Set((posts || []).map(p => p.subreddit_name).filter(Boolean)))

      // Fetch only related subreddits for the current time window
      const { data: subreddits, error: subredditsError } = await supabase
        .from('subreddits')
        .select('name, subscribers, total_posts_last_30, subscriber_engagement_ratio, last_scraped_at')
        .in('name', distinctSubredditNames.length ? distinctSubredditNames : [''])

      if (subredditsError) {
        console.error('Error fetching subreddits:', subredditsError)
      }

      // Fetch total counts separately (head request)
      const { count: totalSubredditsCount } = await supabase
        .from('subreddits')
        .select('name', { count: 'exact', head: true })

      // Fetch user stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('username, total_karma, last_scraped_at')

      if (usersError) {
        console.error('Error fetching users:', usersError)
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

      // Calculate top subreddits from posts in selected range
      const postCountsBySubreddit: Record<string, number> = {}
      posts?.forEach((p) => {
        postCountsBySubreddit[p.subreddit_name] = (postCountsBySubreddit[p.subreddit_name] || 0) + 1
      })
      const topSubreddits = Object.entries(postCountsBySubreddit)
        .map(([name, postsCount]) => {
          const subMeta = subreddits?.find(s => s.name === name)
          return {
            name,
            subscribers: subMeta?.subscribers || 0,
            posts: postsCount,
            engagement: subMeta?.subscriber_engagement_ratio || 0,
          }
        })
        .sort((a, b) => b.posts - a.posts)
        .slice(0, 50)

      // Compose recent activity from latest posts/users/subreddits
      const recentActivity = [
        ...(posts?.slice(0, 10).map(p => ({
          type: 'post' as const,
          name: `New post in r/${p.subreddit_name}`,
          timestamp: p.created_utc,
          status: 'success' as const
        })) || []),
        ...(users?.slice(0, 5).map(u => ({
          type: 'user' as const,
          name: `User updated: ${u.username}`,
          timestamp: u.last_scraped_at || new Date().toISOString(),
          status: 'success' as const
        })) || []),
        ...(subreddits?.slice(0, 5).map(s => ({
          type: 'subreddit' as const,
          name: `Subreddit updated: r/${s.name}`,
          timestamp: s.last_scraped_at || new Date().toISOString(),
          status: 'success' as const
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

      // Calculate average engagement
      const avgEngagementRate = subreddits?.length 
        ? subreddits.reduce((acc, sub) => acc + (sub.subscriber_engagement_ratio || 0), 0) / subreddits.length
        : 0

      setStats({
        totalSubreddits: totalSubredditsCount ?? (subreddits?.length || 0),
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
      // Toast success
      try { addToast({ title: 'Refreshed', description: 'Scraper stats updated', type: 'success', duration: 2000 }) } catch {}
    } catch (error) {
      console.error('Error fetching scraper stats:', error)
      setErrorMessage('Failed to fetch scraper stats')
      try { addToast({ title: 'Fetch failed', description: 'Unable to load scraper stats. Try again.', type: 'error' }) } catch {}
    } finally {
      setLoading(false)
    }
  }, [supabase, timeRange, addToast])

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
  }, [fetchStats, supabase])

  // Fetch enhanced scraper status including accounts, proxies, and monitoring data
  const fetchScraperStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      
      // Fetch accounts and proxies
      const accountsRes = await fetch('/api/scraper/accounts')
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccountsStatus(accountsData)
      }
      
      // Fetch scraper status (discovery, quality, errors)
      const statusRes = await fetch('/api/scraper/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setScraperStatus(statusData)
      }
    } catch (error) {
      console.error('Error fetching scraper status:', error)
      addToast({ title: 'Status fetch failed', description: 'Unable to load scraper status', type: 'error' })
    } finally {
      setStatusLoading(false)
    }
  }, [addToast])

  // Load scraper status on mount and set up refresh
  useEffect(() => {
    fetchScraperStatus()
    
    // Auto-refresh scraper status every 30 seconds
    const interval = setInterval(fetchScraperStatus, 30000)
    
    return () => clearInterval(interval)
  }, [fetchScraperStatus])

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
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Time Range</label>
            <select
              className="text-sm rounded-lg border px-2 py-1 bg-white"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </select>
          </div>
        </div>

        {/* Enhanced Header Stats */}
        {statusLoading ? (
          <MetricsCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-b9-pink bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Reddit Accounts</CardTitle>
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <UserCheck className="h-4 w-4 text-b9-pink" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {accountsStatus?.accounts.active || 0}/{accountsStatus?.accounts.total || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Active accounts
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Proxy Status</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Wifi className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {accountsStatus?.proxies.active || 0}/{accountsStatus?.proxies.total || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Active proxies
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Found Today</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Target className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {scraperStatus?.discovery.subreddits_found_24h || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                New subreddits
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Data Quality</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Shield className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {scraperStatus?.data_quality.quality_score || 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Complete records
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Traditional Stats */}
        {loading ? (
          <MetricsCardsSkeleton />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-gray-400">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Subreddits</CardTitle>
                <Database className="h-4 w-4 text-gray-400" />
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
        )}

        {/* System Health */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-b9-pink/10 rounded-lg">
                    <Activity className="h-5 w-5 text-b9-pink" />
                  </div>
                  System Health
                </CardTitle>
                <CardDescription>Real-time status of all scraper components</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  fetchStats()
                  fetchScraperStatus()
                }}
                disabled={loading || statusLoading}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-b9-pink/20 hover:bg-b9-pink/10 hover:border-b9-pink/40 transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 ${loading || statusLoading ? 'animate-spin' : ''} text-b9-pink`} />
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

        {/* Data Quality Metrics */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-b9-pink/10 rounded-lg">
                <Shield className="h-5 w-5 text-b9-pink" />
              </div>
              Data Quality Metrics
            </CardTitle>
            <CardDescription>Comprehensive data validation and completeness scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {scraperStatus?.data_quality.quality_score || 0}%
                </div>
                <div className="text-xs text-gray-500">Quality Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {scraperStatus?.data_quality.complete_records?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-gray-500">Complete Records</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {scraperStatus?.data_quality.missing_fields?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-gray-500">Missing Fields</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {scraperStatus?.data_quality.error_rate || 0}
                </div>
                <div className="text-xs text-gray-500">Error Rate</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Data Completeness</span>
                <span>{scraperStatus?.data_quality.quality_score || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-b9-pink h-2 rounded-full transition-all duration-500"
                  style={{ width: `${scraperStatus?.data_quality.quality_score || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-b9-pink" />
                </div>
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
                  <div className="font-semibold">{accountsStatus?.accounts.active ?? 0}/{accountsStatus?.accounts.total ?? 0}</div>
                  <div className="text-xs text-gray-500">{(() => { const active = accountsStatus?.accounts.active ?? 0; const total = accountsStatus?.accounts.total ?? 0; return total ? Math.round((active / total) * 100) : 0 })()}% active</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Active Proxies</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{accountsStatus?.proxies.active ?? 0}/{accountsStatus?.proxies.total ?? 0}</div>
                  <div className="text-xs text-gray-500">{(() => { const active = accountsStatus?.proxies.active ?? 0; const total = accountsStatus?.proxies.total ?? 0; return total ? Math.round((active / total) * 100) : 0 })()}% active</div>
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
                  <span className="text-sm">Throughput</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(() => { if (!stats?.todaysPosts) return '0/min'; if (timeRange === '24h') return `${Math.max(1, Math.round(stats.todaysPosts / 1440))}/min`; if (timeRange === '7d') return `${Math.max(1, Math.round(stats.todaysPosts / (7 * 1440)) )}/min`; return `${Math.max(1, Math.round(stats.todaysPosts / (30 * 1440)) )}/min` })()}</div>
                  <div className="text-xs text-gray-500">Approx. posts ingested</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Last Scraped</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{stats?.lastScrapedAt ? new Date(stats.lastScrapedAt).toLocaleTimeString() : 'Never'}</div>
                  <div className="text-xs text-gray-500">{stats?.lastScrapedAt ? new Date(stats.lastScrapedAt).toLocaleDateString() : 'No data'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-b9-pink/10 rounded-lg">
                  <Globe className="h-5 w-5 text-b9-pink" />
                </div>
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
                {!loading && stats?.topSubreddits && stats.topSubreddits.length > topSubredditsVisible && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => setTopSubredditsVisible(v => v + 5)}>Show more</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Feed */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              Error Feed
            </CardTitle>
            <CardDescription>
              Real-time error monitoring with timestamps
              <span className="text-xs text-gray-400 ml-2">
                Last updated: {scraperStatus?.last_updated ? new Date(scraperStatus.last_updated).toLocaleTimeString() : 'Never'}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {statusLoading ? (
                <div className="text-center py-4 text-gray-500">Loading error feed...</div>
              ) : scraperStatus?.error_feed && scraperStatus.error_feed.length > 0 ? (
                scraperStatus.error_feed.map((error, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-red-800">{error.message}</div>
                        <div className="text-xs text-red-600 mt-1">
                          {new Date(error.timestamp).toLocaleString()}
                        </div>
                        {error.context && Object.keys(error.context).length > 0 && (
                          <div className="text-xs text-red-500 mt-1 font-mono">
                            {JSON.stringify(error.context, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                      {error.level}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-green-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="font-medium">No errors detected</div>
                  <div className="text-sm text-gray-500">System running smoothly</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-b9-pink/10 rounded-lg">
                <Eye className="h-5 w-5 text-b9-pink" />
              </div>
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
              ) : errorMessage ? (
                <div className="text-center py-6">
                  <div className="text-sm text-red-600 mb-2">{errorMessage}</div>
                  <Button variant="outline" size="sm" onClick={fetchStats}>Retry</Button>
                </div>
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
