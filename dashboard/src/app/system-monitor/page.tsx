'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity,
  RefreshCw,
  Play,
  Square,
  Clock,
  Settings,
  Database,
  Wifi,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Trash2
} from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { ApiMonitor } from '@/components/ApiMonitor'

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

interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    latency: number
    connections: number
  }
  redis: {
    status: 'healthy' | 'degraded' | 'down'
    memory: number
    uptime: number
  }
  reddit_api: {
    status: 'healthy' | 'degraded' | 'down'
    rate_limit_remaining: number
    response_time: number
  }
  openai_api: {
    status: 'healthy' | 'degraded' | 'down'
    credits_remaining: number
  }
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [processingHistory, setProcessingHistory] = useState<number[]>([])
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

        // Update processing history for sparkline
        setProcessingHistory(prev => {
          const newHistory = [...prev, data.statistics.processing_rate_per_hour]
          return newHistory.slice(-20) // Keep last 20 data points
        })
      }

      // Fetch system health
      await fetchSystemHealth()
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSystemHealth = async () => {
    try {
      // Check database health
      const dbStart = Date.now()
      const healthRes = await fetch('/api/health')
      const dbLatency = Date.now() - dbStart

      // Mock health data for now (would come from actual health endpoints)
      setSystemHealth({
        database: {
          status: healthRes.ok ? 'healthy' : 'down',
          latency: dbLatency,
          connections: 5
        },
        redis: {
          status: 'healthy',
          memory: 256,
          uptime: 86400
        },
        reddit_api: {
          status: metrics?.accounts.count && metrics.accounts.count > 0 ? 'healthy' : 'degraded',
          rate_limit_remaining: 850,
          response_time: 120
        },
        openai_api: {
          status: 'healthy',
          credits_remaining: 1000
        }
      })
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    }
  }

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

  const handleClearErrorQueue = async () => {
    try {
      const res = await fetch('/api/scraper/clear-errors', { method: 'POST' })
      if (res.ok) {
        addToast({
          title: 'Error queue cleared',
          description: 'All error entries have been removed',
          type: 'success'
        })
        await fetchMetrics()
      }
    } catch {
      addToast({
        title: 'Failed to clear error queue',
        type: 'error'
      })
    }
  }

  const handleResetDailyCounter = async () => {
    try {
      const res = await fetch('/api/scraper/reset-daily', { method: 'POST' })
      if (res.ok) {
        addToast({
          title: 'Daily counter reset',
          description: 'Daily request counter has been reset to 0',
          type: 'success'
        })
        await fetchMetrics()
      }
    } catch {
      addToast({
        title: 'Failed to reset counter',
        type: 'error'
      })
    }
  }


  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [fetchMetrics])


  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">System Monitor</h1>
            <p className="text-sm text-gray-500 mt-1">Reddit scraper control & monitoring</p>
          </div>

          <div className="flex items-center gap-2">

            <Button
              variant={isRunning ? 'outline' : 'default'}
              size="sm"
              onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
            >
              {isRunning ? (
                <>
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        {metrics && (
          <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium text-gray-700">
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Queue:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatNumber(metrics.total_queue_depth)}
              </span>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Today:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatNumber(metrics.statistics.daily_requests)}
              </span>
              <span className="text-sm text-gray-400">
                / {formatNumber(metrics.config?.max_daily_requests || 10000)}
              </span>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Rate:</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.statistics.processing_rate_per_hour.toFixed(0)}/hr
              </span>
            </div>

            {metrics.last_activity && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-1 ml-auto">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {new Date(metrics.last_activity).toLocaleTimeString()}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Database</div>
                <div className="text-sm font-medium text-gray-900">
                  {systemHealth?.database.latency || 0}ms
                </div>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                systemHealth?.database.status === 'healthy' ? 'bg-green-100' :
                systemHealth?.database.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {systemHealth?.database.status === 'healthy' ?
                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                  systemHealth?.database.status === 'degraded' ?
                  <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Redis Queue</div>
                <div className="text-sm font-medium text-gray-900">
                  {systemHealth?.redis.memory || 0}MB
                </div>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                systemHealth?.redis.status === 'healthy' ? 'bg-green-100' :
                systemHealth?.redis.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {systemHealth?.redis.status === 'healthy' ?
                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                  systemHealth?.redis.status === 'degraded' ?
                  <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Reddit API</div>
                <div className="text-sm font-medium text-gray-900">
                  {systemHealth?.reddit_api.rate_limit_remaining || 0}/1000
                </div>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                systemHealth?.reddit_api.status === 'healthy' ? 'bg-green-100' :
                systemHealth?.reddit_api.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {systemHealth?.reddit_api.status === 'healthy' ?
                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                  systemHealth?.reddit_api.status === 'degraded' ?
                  <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">OpenAI API</div>
                <div className="text-sm font-medium text-gray-900">
                  ${(systemHealth?.openai_api.credits_remaining || 0) / 100}
                </div>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                systemHealth?.openai_api.status === 'healthy' ? 'bg-green-100' :
                systemHealth?.openai_api.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {systemHealth?.openai_api.status === 'healthy' ?
                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                  systemHealth?.openai_api.status === 'degraded' ?
                  <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 mb-1">Subreddits</div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(metrics?.statistics.subreddits_processed || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 mb-1">Posts</div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(metrics?.statistics.posts_collected || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 mb-1">Users</div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(metrics?.statistics.users_discovered || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 mb-1">Success Rate</div>
            <div className="text-xl font-semibold text-gray-900">
              {metrics && metrics.statistics.total_requests > 0
                ? Math.round((metrics.statistics.successful_requests / metrics.statistics.total_requests) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status with Color Coding */}
      {metrics && (
        <Card className="border-gray-100 mb-6">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Queue Breakdown</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearErrorQueue}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Errors
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDailyCounter}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset Daily
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Priority</div>
                <div className={`text-lg font-semibold ${
                  metrics.queue_depths.priority > 100 ? 'text-red-600' :
                  metrics.queue_depths.priority > 50 ? 'text-yellow-600' : 'text-gray-900'
                }`}>
                  {metrics.queue_depths.priority || 0}
                </div>
                {metrics.queue_depths.priority > 100 && (
                  <div className="text-xs text-red-500 mt-0.5">High load</div>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Discovery</div>
                <div className={`text-lg font-semibold ${
                  metrics.queue_depths.new_discovery > 100 ? 'text-red-600' :
                  metrics.queue_depths.new_discovery > 50 ? 'text-yellow-600' : 'text-gray-900'
                }`}>
                  {metrics.queue_depths.new_discovery || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Updates</div>
                <div className={`text-lg font-semibold ${
                  metrics.queue_depths.update > 100 ? 'text-red-600' :
                  metrics.queue_depths.update > 50 ? 'text-yellow-600' : 'text-gray-900'
                }`}>
                  {metrics.queue_depths.update || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">User Analysis</div>
                <div className={`text-lg font-semibold ${
                  metrics.queue_depths.user_analysis > 100 ? 'text-red-600' :
                  metrics.queue_depths.user_analysis > 50 ? 'text-yellow-600' : 'text-gray-900'
                }`}>
                  {metrics.queue_depths.user_analysis || 0}
                </div>
              </div>
            </div>

            {/* Processing Rate Sparkline */}
            {processingHistory.length > 1 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Processing Rate Trend</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-medium text-gray-900">
                      {processingHistory[processingHistory.length - 1]?.toFixed(0)}/hr
                    </span>
                  </div>
                </div>
                <div className="h-8 flex items-end gap-0.5">
                  {processingHistory.map((rate, i) => {
                    const maxRate = Math.max(...processingHistory)
                    const height = maxRate > 0 ? (rate / maxRate) * 100 : 0
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-blue-400 rounded-t-sm transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      {metrics?.config && (
        <Card className="border-gray-100 mb-6">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Batch:</span>
                <span className="font-medium text-gray-900">{metrics.config.batch_size}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Delay:</span>
                <span className="font-medium text-gray-900">{metrics.config.delay_between_batches}s</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Daily limit:</span>
                <span className="font-medium text-gray-900">{formatNumber(metrics.config.max_daily_requests)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Logs */}
      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Live Activity</h2>
        <ApiMonitor type="scraper" showLogs={true} autoRefresh={true} compact={true} />
      </div>
    </div>
  )
}