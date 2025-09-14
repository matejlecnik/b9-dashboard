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
        // Consider scraper running if status is 'running' OR if there's recent activity
        const hasRecentActivity = data.last_activity &&
          (new Date().getTime() - new Date(data.last_activity).getTime() < 60000) // Active within last minute
        setIsRunning(data.status === 'running' || hasRecentActivity)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)

      const endpoint = action === 'start' ? '/api/scraper/start' : '/api/scraper/stop'
      const res = await fetch(endpoint, { method: 'POST' })

      if (res.ok) {
        const result = await res.json()

        // Update state based on actual response
        if (result.success !== false) {
          // Keep the optimistic update
          addToast({
            title: `Scraper ${action === 'start' ? 'Started Successfully' : 'Stopped Successfully'}`,
            description: action === 'start'
              ? '✅ Continuous 24/7 scraping is now active. The scraper will process subreddits automatically.'
              : '⏹️ Scraper has been stopped. No new data will be collected.',
            type: 'success'
          })

          // Don't call fetchMetrics immediately as it might override our state
          // Let the periodic refresh handle it
        } else {
          // Revert optimistic update on failure
          setIsRunning(!newRunningState)

          // Handle API success but operation failed
          addToast({
            title: `Failed to ${action} scraper`,
            description: result.message || result.detail || 'Operation failed. Please check the logs.',
            type: 'error'
          })
        }
      } else {
        // Revert optimistic update on HTTP error
        setIsRunning(!newRunningState)

        // Handle HTTP error
        const errorData = await res.json().catch(() => ({}))
        addToast({
          title: `Failed to ${action} scraper`,
          description: errorData.detail || errorData.message || `HTTP ${res.status} error`,
          type: 'error'
        })
      }
    } catch (error) {
      // Revert optimistic update on network error
      setIsRunning(action !== 'start')

      console.error('Scraper control error:', error)
      addToast({
        title: `Failed to ${action} scraper`,
        description: 'Network error or server is not responding',
        type: 'error'
      })
    } finally {
      setLoading(false)
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

        </div>

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