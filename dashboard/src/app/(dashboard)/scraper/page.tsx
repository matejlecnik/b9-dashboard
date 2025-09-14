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
 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Target,
  Shield,
  AlertCircle,
  Timer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatNumber, formatPercent, formatTimeISO, formatDateTimeISO } from '@/lib/format'
// Removed zod schemas to eliminate dependency
import { useToast } from '@/components/ui/toast'

// Types
interface AccountStatus {
  accounts: {
    total: number
    active: number
    details: Array<{ username: string; status: string; rate_limit_remaining?: number }>
  }
  proxies: {
    total: number
    active: number
    details: Array<{ host: string; port: number; status: string }>
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
    message?: string
    timestamp: string
    status: string
  }>
  error_feed: Array<{
    timestamp: string
    message: string
    context?: Record<string, unknown> | null
    level: string
  }>
  last_updated: string
}

// Utility functions
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'running':
    case 'success':
      return <CheckCircle className="h-4 w-4 text-pink-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'error':
    case 'stopped':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'running':
    case 'success':
      return 'text-pink-600 bg-pink-50 border-pink-200'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'error':
    case 'stopped':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default function ScraperPage() {
  const [accountsStatus, setAccountsStatus] = useState<AccountStatus | null>(null)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)
  const { addToast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [accountsRes, statusRes] = await Promise.all([
        fetch('/api/scraper/accounts'),
        fetch('/api/scraper/status')
      ])
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        // Removed zod validation - direct assignment
        setAccountsStatus(accountsData)
      }
      
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        // Removed zod validation - direct assignment  
        setScraperStatus(statusData)
      }
      
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error('Error fetching data:', error)
      addToast({ 
        title: 'Fetch failed', 
        description: 'Unable to load scraper data',
        type: 'error',
        duration: 5000 
      })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  const controlScraper = useCallback(async (action: 'start' | 'stop') => {
    try {
      const res = await fetch(`/api/scraper/${action}`, { method: 'POST' })
      if (!res.ok) throw new Error(`${action} failed`)
      addToast({ 
        title: `Scraper ${action}ed`, 
        type: 'success', 
        description: `Scraper ${action}ed successfully` 
      })
      await fetchData()
    } catch {
      addToast({ 
        title: `Failed to ${action} scraper`, 
        type: 'error' 
      })
    }
  }, [addToast, fetchData])

  const clearErrors = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/errors', { method: 'DELETE' })
      if (!res.ok) throw new Error('clear errors failed')
      addToast({ title: 'Errors cleared', type: 'success' })
      await fetchData()
    } catch {
      addToast({ title: 'Failed to clear errors', type: 'error' })
    }
  }, [addToast, fetchData])

  useEffect(() => {
    setMounted(true)
    fetchData()
    
    // Polling every 30 seconds
    const interval = setInterval(fetchData, 30000)
    
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <DashboardLayout
      title="Scraper Dashboard"
      subtitle="Monitor scraper status, account health, and real-time activity"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => controlScraper('start')}
              data-testid="start-scraper-button"
            >
              Start Scraper
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => controlScraper('stop')}
              data-testid="stop-scraper-button"
            >
              Stop Scraper
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => clearErrors()}
              data-testid="clear-errors-button"
            >
              Clear Errors
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2"
              data-testid="refresh-button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {mounted && (
              <div className="text-xs text-gray-500" suppressHydrationWarning>
                Last: {formatTimeISO(lastRefresh.toISOString())}
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reddit Accounts */}
          <Card className="border-l-4 border-l-pink-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Reddit Accounts</CardTitle>
                <UserCheck className="h-4 w-4 text-pink-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountsStatus?.accounts.active || 0}/{accountsStatus?.accounts.total || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </CardContent>
          </Card>

          {/* Discovery Rate */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Found Today</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scraperStatus?.discovery.subreddits_found_24h || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">New subreddits</p>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Data Quality</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercent(scraperStatus?.data_quality.quality_score ?? 0, 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Complete records</p>
            </CardContent>
          </Card>

          {/* Total Subreddits */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Discovered</CardTitle>
                <Database className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(scraperStatus?.data_quality.total_records)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Subreddits in database</p>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-pink-500" />
                  System Health
                </CardTitle>
                <CardDescription>Real-time status of all scraper components</CardDescription>
              </div>
              <div className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(scraperStatus?.system_health.scraper || 'stopped')}`}>
                {scraperStatus?.system_health.scraper || 'stopped'}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(scraperStatus?.system_health.database || 'warning')}
                <div>
                  <div className="font-medium text-sm">Database</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(scraperStatus?.system_health.database || 'warning')}`}>
                    {scraperStatus?.system_health.database || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(scraperStatus?.system_health.scraper || 'stopped')}
                <div>
                  <div className="font-medium text-sm">Scraper</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(scraperStatus?.system_health.scraper || 'stopped')}`}>
                    {scraperStatus?.system_health.scraper || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(scraperStatus?.system_health.reddit_api || 'healthy')}
                <div>
                  <div className="font-medium text-sm">Reddit API</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(scraperStatus?.system_health.reddit_api || 'healthy')}`}>
                    {scraperStatus?.system_health.reddit_api || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {getStatusIcon(scraperStatus?.system_health.storage || 'healthy')}
                <div>
                  <div className="font-medium text-sm">Storage</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(scraperStatus?.system_health.storage || 'healthy')}`}>
                    {scraperStatus?.system_health.storage || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details & Error Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Account Status
              </CardTitle>
              <CardDescription>Individual account performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : accountsStatus?.accounts.details?.length ? (
                  accountsStatus.accounts.details.slice(0, 8).map((account, idx) => (
                    <div key={`${account.username}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(account.status)}
                        <div>
                          <div className="font-medium text-sm truncate max-w-32">{account.username}</div>
                          <div className="text-xs text-gray-500 capitalize">{account.status}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>{account.rate_limit_remaining || 0}/100</div>
                        <div>requests</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No accounts configured</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Error Feed
              </CardTitle>
              <CardDescription>Recent errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : scraperStatus?.error_feed && scraperStatus.error_feed.length > 0 ? (
                  scraperStatus.error_feed.slice(0, 5).map((error, index) => (
                    <div key={`${error.timestamp}-${index}`} className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-sm text-red-900">{error.message}</div>
                          <div className="text-xs text-red-700 mt-1">{formatDateTimeISO(error.timestamp)}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-700 bg-red-100 border-red-200">
                        {error.level}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-green-600">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">No errors detected</div>
                    <div className="text-sm text-gray-500">System running smoothly</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-pink-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest discoveries and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : scraperStatus?.recent_activity?.length ? (
                scraperStatus.recent_activity.slice(0, 8).map((activity, index) => (
                  <div key={`${activity.type}-${activity.timestamp}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <div className="font-medium text-sm">{activity.message}</div>
                        <div className="text-xs text-gray-500 capitalize">{activity.type} • {formatTimeISO(activity.timestamp)}</div>
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