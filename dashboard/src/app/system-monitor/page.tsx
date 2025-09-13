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
  Settings
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

      {/* Queue Status */}
      {metrics && (
        <Card className="border-gray-100 mb-6">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-gray-700">Queue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Priority</div>
                <div className="text-lg font-semibold text-gray-900">
                  {metrics.queue_depths.priority || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Discovery</div>
                <div className="text-lg font-semibold text-gray-900">
                  {metrics.queue_depths.new_discovery || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Updates</div>
                <div className="text-lg font-semibold text-gray-900">
                  {metrics.queue_depths.update || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">User Analysis</div>
                <div className="text-lg font-semibold text-gray-900">
                  {metrics.queue_depths.user_analysis || 0}
                </div>
              </div>
            </div>
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