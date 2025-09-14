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
  Database,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { LogViewerSupabase } from '@/components/LogViewerSupabase'
import { SystemMonitorSidebar } from '@/components/SystemMonitorSidebar'
import { GlassMorphismButton } from '@/components/GlassMorphismButton'

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
      const endpoint = action === 'start' ? '/api/scraper/start' : '/api/scraper/stop'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Apple-style background texture */}
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
        <SystemMonitorSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full flex flex-col min-h-0">
            <div className="space-y-6">
        {/* Control Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Start/Stop Scraper Button using standardized component */}
            <GlassMorphismButton
              variant={isRunning ? 'stop' : 'start'}
              icon={isRunning ? Square : Play}
              label={isRunning ? 'Stop Scraper' : 'Start Scraper'}
              sublabel={isRunning ? 'Running' : 'Ready'}
              onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
              disabled={loading}
              size="md"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Status Bar */}
          {metrics && (
            <div className="flex items-center gap-4 text-sm">
              {/* Status */}
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600">
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>

              {/* Queue */}
              <div className="text-gray-600">
                Queue: <span className="font-medium text-gray-900">
                  {formatNumber(metrics.total_queue_depth)}
                </span>
              </div>

              {/* Daily Progress */}
              <div className="text-gray-600">
                Today: <span className="font-medium text-gray-900">
                  {formatNumber(metrics.statistics.daily_requests)}
                </span> / {formatNumber(metrics.config?.max_daily_requests || 10000)}
              </div>

              {/* Processing Rate */}
              <div className="text-gray-600">
                Rate: <span className="font-medium text-gray-900">
                  {metrics.statistics.processing_rate_per_hour.toFixed(0)}/hr
                </span>
              </div>

              {/* Last Activity */}
              {metrics.last_activity && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(metrics.last_activity).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Subreddits</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatNumber(metrics?.statistics.subreddits_processed || 0)}
                  </div>
                </div>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Posts</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatNumber(metrics?.statistics.posts_collected || 0)}
                  </div>
                </div>
                <Database className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Success Rate</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {metrics && metrics.statistics.total_requests > 0
                      ? Math.round((metrics.statistics.successful_requests / metrics.statistics.total_requests) * 100)
                      : 0}%
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Errors</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatNumber(metrics?.statistics.failed_requests || 0)}
                  </div>
                </div>
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Details (if available) */}
        {metrics && metrics.queue_depths && (
          <Card className="border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                Queue Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Priority:</span>{' '}
                  <span className="font-medium">{formatNumber(metrics.queue_depths.priority)}</span>
                </div>
                <div>
                  <span className="text-gray-500">New Discovery:</span>{' '}
                  <span className="font-medium">{formatNumber(metrics.queue_depths.new_discovery)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Updates:</span>{' '}
                  <span className="font-medium">{formatNumber(metrics.queue_depths.update)}</span>
                </div>
                <div>
                  <span className="text-gray-500">User Analysis:</span>{' '}
                  <span className="font-medium">{formatNumber(metrics.queue_depths.user_analysis)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Logs - Main Focus */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Live Scraper Logs</h2>
          <LogViewerSupabase
            title="Reddit Scraper Activity (Live from Supabase)"
            height="500px"
            autoScroll={true}
            refreshInterval={5000}
            maxLogs={500}
          />
        </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}