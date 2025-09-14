'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Play,
  Square
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { LogViewerSupabase } from '@/components/LogViewerSupabase'
import { RedditMonitorSidebar } from '@/components/RedditMonitorSidebar'
import { GlassMorphismButton } from '@/components/GlassMorphismButton'
import { ApiActivityLog } from '@/components/ApiActivityLog'
import { supabase } from '@/lib/supabase'

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
  cycle?: {
    current_cycle: number
    cycle_start: string | null
    elapsed_seconds: number | null
    elapsed_formatted: string | null
    last_cycle_duration: number | null
    last_cycle_formatted: string | null
    items_processed: number
    errors: number
  }
}

export default function RedditMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const [successRate, setSuccessRate] = useState<{ percentage: number; successful: number; total: number } | null>(null)
  const { addToast } = useToast()

  // Calculate success rate from Supabase logs
  const calculateSuccessRate = useCallback(async () => {
    try {
      // Check if supabase client is available
      if (!supabase) {
        console.error('Supabase client not initialized')
        return
      }

      // Get logs from today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get all logs from today
      const { data: logs, error } = await supabase
        .from('reddit_scraper_logs')
        .select('message, level')
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: false })
        .limit(10000)

      if (error) {
        console.error('Error fetching logs:', error)
        return
      }

      if (!logs || logs.length === 0) {
        setSuccessRate(null)
        return
      }

      // Use a Set to track unique Reddit requests and avoid counting duplicates
      const uniqueRedditRequests = new Set<string>()
      const uniqueRedditFailures = new Set<string>()
      let blockedCount = 0

      logs.forEach(log => {
        const msg = log.message

        // Extract Reddit URL from request logs to deduplicate
        if (msg.includes('🔍 Request to:') && msg.includes('reddit.com')) {
          const urlMatch = msg.match(/Request to: (https?:\/\/[^\s]+reddit\.com[^\s]+)/)
          if (urlMatch) {
            uniqueRedditRequests.add(urlMatch[1])
          }
        }

        // Track Reddit failures by URL to deduplicate
        if (msg.includes('reddit.com') && (
            msg.includes('Failed request for') ||
            msg.includes('404 Client Error') ||
            msg.includes('403 Forbidden') ||
            msg.includes('429 Too Many Requests'))) {
          const urlMatch = msg.match(/(https?:\/\/[^\s:]+reddit\.com[^\s:]+)/)
          if (urlMatch) {
            uniqueRedditFailures.add(urlMatch[1])

            // Count blocked requests specifically
            if (msg.includes('403 Forbidden') || msg.includes('429 Too Many Requests')) {
              blockedCount++
            }
          }
        }
      })

      const totalRequests = uniqueRedditRequests.size
      const failedRequests = uniqueRedditFailures.size
      // Successful requests = total requests - failed requests (since successes aren't logged)
      const successfulRequests = Math.max(0, totalRequests - failedRequests)

      if (totalRequests > 0) {
        setSuccessRate({
          percentage: (successfulRequests / totalRequests) * 100,
          successful: successfulRequests,
          total: totalRequests
        })

        // Log for debugging
        console.log(`Success Rate: ${successfulRequests}/${totalRequests} (${failedRequests} failed, ${blockedCount} blocked)`)
      } else {
        setSuccessRate(null)
      }
    } catch (error) {
      console.error('Error calculating success rate:', error)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch detailed status from backend API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const statusRes = await fetch(`${API_URL}/api/scraper/status-detailed`, {
        mode: 'cors'
      })

      if (statusRes.ok) {
        const data = await statusRes.json()
        setMetrics(data)

        // Only update running state if we haven't manually overridden it
        if (!manualOverride) {
          // Consider scraper running if status is 'running' OR if there's recent activity
          const hasRecentActivity = data.last_activity &&
            (new Date().getTime() - new Date(data.last_activity).getTime() < 60000) // Active within last minute
          setIsRunning(data.status === 'running' || hasRecentActivity)
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [manualOverride])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)
      setManualOverride(true) // Enable manual override to prevent fetchMetrics from changing the state

      // Call the backend API on Render
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const endpoint = action === 'start' ? '/api/scraper/start' : '/api/scraper/stop'

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      })

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

          // Clear manual override after 30 seconds to allow status updates again
          setTimeout(() => {
            setManualOverride(false)
          }, 30000)
        } else {
          // Revert optimistic update on failure
          setIsRunning(!newRunningState)
          setManualOverride(false) // Clear override on failure

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
        setManualOverride(false) // Clear override on error

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
      setManualOverride(false) // Clear override on error

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

  // Check scraper status on mount
  useEffect(() => {
    // Check initial scraper status from backend API
    const checkInitialStatus = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
        const statusRes = await fetch(`${API_URL}/api/scraper/status`, {
          mode: 'cors'
        })
        if (statusRes.ok) {
          const status = await statusRes.json()
          // Check if scraper is running based on system health
          const isScraperRunning = status.system_health?.scraper === 'running'
          if (isScraperRunning !== undefined) {
            setIsRunning(isScraperRunning)
            setManualOverride(true)
            // Clear override after 5 seconds to allow status updates
            setTimeout(() => setManualOverride(false), 5000)
          }
        }
      } catch (error) {
        console.log('Error checking initial status:', error)
      }
    }

    // Run initial checks
    checkInitialStatus()
    fetchMetrics()
    calculateSuccessRate()

    const interval = setInterval(() => {
      fetchMetrics()
      // Also check scraper status periodically if not manually overridden
      if (!manualOverride) {
        checkInitialStatus()
      }
    }, 10000) // Refresh metrics every 10 seconds

    // Calculate success rate less frequently since it doesn't need to be live
    const successInterval = setInterval(() => {
      calculateSuccessRate()
    }, 60000) // Refresh success rate every minute

    return () => {
      clearInterval(interval)
      clearInterval(successInterval)
    }
  }, [manualOverride, fetchMetrics, calculateSuccessRate]) // Include all dependencies

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
        <RedditMonitorSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full flex flex-col min-h-0">
            <div className="space-y-6">
        {/* Main Content Area */}
        <div className="flex flex-col gap-4">
          {/* Top Row - Controls, Logs */}
          <div className="flex gap-4">
            {/* Left Column - Button and Success Rate */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              {/* Start/Stop Scraper Button */}
              <GlassMorphismButton
                variant={isRunning ? 'stop' : 'start'}
                icon={isRunning ? Square : Play}
                label={isRunning ? 'Stop Scraper' : 'Start Scraper'}
                sublabel={isRunning ? 'Running' : 'Ready'}
                onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
                disabled={loading}
                size="md"
              />

              {/* Success Rate Card */}
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 min-w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Success Rate (Today)</div>
                <div className="text-xl font-bold text-gray-900">
                  {successRate ? `${successRate.percentage.toFixed(1)}%` : '—'}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {successRate
                    ? `${successRate.successful}/${successRate.total} requests`
                    : 'Calculating...'}
                </div>
              </div>

              {/* Cycle Length Card */}
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 min-w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Current Cycle</div>
                <div className="text-xl font-bold text-gray-900">
                  {metrics?.cycle?.elapsed_formatted || '—'}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {metrics?.cycle?.current_cycle
                    ? `Cycle #${metrics.cycle.current_cycle}`
                    : 'Not running'}
                </div>
                {metrics?.cycle?.last_cycle_formatted && (
                  <div className="text-[9px] text-gray-500 mt-1">
                    Last: {metrics.cycle.last_cycle_formatted}
                  </div>
                )}
              </div>
            </div>

            {/* Live Logs Container */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Main Logs */}
              <div>
                <LogViewerSupabase
                  title="Reddit Scraper Activity"
                  height="300px"
                  autoScroll={true}
                  refreshInterval={5000}
                  maxLogs={500}
                />
              </div>

              {/* API Activity Logs Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <ApiActivityLog
                    title="User Activity"
                    endpoint="users"
                    height="120px"
                    maxLogs={20}
                  />
                </div>
                <div className="flex-1">
                  <ApiActivityLog
                    title="AI Categorization"
                    endpoint="categorization"
                    height="120px"
                    maxLogs={20}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}