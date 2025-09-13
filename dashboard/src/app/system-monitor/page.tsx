'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  TrendingUp
} from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

interface SystemMetrics {
  enabled: boolean
  status: 'running' | 'stopped' | 'error'
  statistics: {
    total_requests: number
    successful_requests: number
    failed_requests: number
    subreddits_processed: number
    posts_collected: number
    users_discovered: number
    daily_requests: number
    processing_rate_per_hour: number
  }
  queue_depths: {
    priority: number
    new_discovery: number
    update: number
    user_analysis: number
  }
  total_queue_depth: number
  accounts: {
    count: number
    proxies: number
  }
  last_activity: string | null
  config: {
    batch_size: number
    delay_between_batches: number
    max_daily_requests: number
  }
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const { addToast } = useToast()

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch detailed status
      const statusRes = await fetch('/api/scraper/status-detailed')

      if (statusRes.ok) {
        const data = await statusRes.json()
        setMetrics(data)
        setIsRunning(data.enabled && data.status === 'running')
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      const endpoint = action === 'start' ? '/api/scraper/start-continuous' : '/api/scraper/stop-continuous'
      const res = await fetch(endpoint, { method: 'POST' })

      if (res.ok) {
        setIsRunning(action === 'start')
        addToast({
          title: `Scraper ${action === 'start' ? 'started' : 'stopped'}`,
          description: action === 'start'
            ? 'Continuous 24/7 scraping is now active'
            : 'Scraper has been stopped',
          type: 'success'
        })
        await fetchMetrics()
      }
    } catch {
      addToast({
        title: `Failed to ${action} scraper`,
        type: 'error'
      })
    }
  }

  const clearErrors = async () => {
    try {
      const res = await fetch('/api/scraper/errors', { method: 'DELETE' })
      if (res.ok) {
        addToast({ title: 'Errors cleared', type: 'success' })
        await fetchMetrics()
      }
    } catch {
      addToast({ title: 'Failed to clear errors', type: 'error' })
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const getStatusColor = (status: string) => {
    if (status === 'running') return 'text-green-600 bg-green-50'
    if (status === 'stopped') return 'text-gray-600 bg-gray-50'
    return 'text-red-600 bg-red-50'
  }

  const getQueueColor = (depth: number) => {
    if (depth === 0) return 'text-gray-500'
    if (depth < 10) return 'text-green-600'
    if (depth < 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header with Status */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitor</h1>
            <p className="text-gray-600 mt-1">24/7 Reddit Scraper Control Center</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-lg font-medium ${
              isRunning ? getStatusColor('running') : getStatusColor('stopped')
            }`}>
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Running 24/7
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-gray-400 rounded-full" />
                    Stopped
                  </>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <Button
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
              onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop Scraper
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start 24/7 Scraping
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {metrics && (
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Queue Depth</div>
              <div className={`text-lg font-semibold ${getQueueColor(metrics.total_queue_depth)}`}>
                {formatNumber(metrics.total_queue_depth)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Daily Requests</div>
              <div className="text-lg font-semibold">
                {formatNumber(metrics.statistics.daily_requests)}
                <span className="text-xs text-gray-500">/{formatNumber(metrics.config?.max_daily_requests || 10000)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Success Rate</div>
              <div className="text-lg font-semibold text-green-600">
                {metrics.statistics.total_requests > 0
                  ? Math.round((metrics.statistics.successful_requests / metrics.statistics.total_requests) * 100)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Processing Rate</div>
              <div className="text-lg font-semibold">
                {metrics.statistics.processing_rate_per_hour.toFixed(1)}/hr
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Accounts</div>
              <div className="text-lg font-semibold">
                {metrics.accounts.count}
                {metrics.accounts.proxies > 0 && (
                  <span className="text-xs text-gray-500"> +{metrics.accounts.proxies}P</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Subreddits Processed */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Subreddits Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics?.statistics.subreddits_processed || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatNumber(metrics?.statistics.posts_collected || 0)} posts collected
            </div>
          </CardContent>
        </Card>

        {/* Users Discovered */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Users Discovered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics?.statistics.users_discovered || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Active Reddit users analyzed
            </div>
          </CardContent>
        </Card>

        {/* Total Requests */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics?.statistics.total_requests || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics?.statistics.failed_requests || 0} failed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status */}
      <Card className="border-0 shadow-sm mb-8">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Job Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-xs text-red-600 font-medium">Priority</div>
              <div className="text-2xl font-semibold text-red-700">
                {metrics?.queue_depths.priority || 0}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">New Discovery</div>
              <div className="text-2xl font-semibold text-blue-700">
                {metrics?.queue_depths.new_discovery || 0}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-green-600 font-medium">Updates</div>
              <div className="text-2xl font-semibold text-green-700">
                {metrics?.queue_depths.update || 0}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-600 font-medium">User Analysis</div>
              <div className="text-2xl font-semibold text-purple-700">
                {metrics?.queue_depths.user_analysis || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      {metrics?.config && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-400" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Batch Size:</span>
                <span className="ml-2 font-medium">{metrics.config.batch_size}</span>
              </div>
              <div>
                <span className="text-gray-500">Delay Between Batches:</span>
                <span className="ml-2 font-medium">{metrics.config.delay_between_batches}s</span>
              </div>
              <div>
                <span className="text-gray-500">Daily Limit:</span>
                <span className="ml-2 font-medium">{formatNumber(metrics.config.max_daily_requests)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Activity */}
      {metrics?.last_activity && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Last activity: {new Date(metrics.last_activity).toLocaleString()}
        </div>
      )}
    </div>
  )
}