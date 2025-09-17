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
import { supabase } from '@/lib/supabase/index'

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
  const [cycleData, setCycleData] = useState<{ elapsed_formatted: string; start_time: string | null } | null>(null)
  const { addToast } = useToast()

  // Fetch cycle data from API
  const fetchCycleData = useCallback(async () => {
    try {
      const API_URL = 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for Render cold starts

      try {
        const response = await fetch(`${API_URL}/api/scraper/cycle-status`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.cycle) {
            setCycleData({
              elapsed_formatted: data.cycle.elapsed_formatted || 'Unknown',
              start_time: data.cycle.start_time
            })
            console.log('Cycle data from API:', data.cycle)
          } else if (data.success && !data.running) {
            // Scraper is disabled
            setCycleData({
              elapsed_formatted: 'Not Active',
              start_time: null
            })
          } else {
            setCycleData(null)
          }
        } else {
          console.error('Failed to fetch cycle data from API')
          setCycleData(null)
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.log('API timeout fetching cycle data')
        } else {
          console.error('Error fetching cycle data:', fetchError)
        }
        setCycleData(null)
      }
    } catch (error) {
      console.error('Error fetching cycle data:', error)
      setCycleData(null)
    }
  }, [])

  // Calculate success rate from API
  const calculateSuccessRate = useCallback(async () => {
    try {
      // Fetch from production API on Render
      const API_URL = 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for Render cold starts

      try {
        const response = await fetch(`${API_URL}/api/scraper/reddit-api-stats`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.stats) {
            const stats = data.stats
            setSuccessRate({
              percentage: stats.success_rate || 0,
              successful: stats.successful_requests || 0,
              total: stats.total_requests || 0
            })

            // Log for debugging
            console.log(`Reddit API Success Rate from API: ${stats.successful_requests}/${stats.total_requests} (${stats.success_rate}%)`)
          } else {
            setSuccessRate(null)
          }
        } else {
          console.error('Failed to fetch success rate from API')
          setSuccessRate(null)
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.log('API timeout fetching success rate')
        } else {
          console.error('Error fetching success rate:', fetchError)
        }
        setSuccessRate(null)
      }
    } catch (error) {
      console.error('Error calculating success rate:', error)
      setSuccessRate(null)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // First, try to get status from Supabase (faster and more reliable)
      try {
        if (supabase) {
          const controlStatus = await supabase
            .from('system_control')
            .select('enabled, status')
            .eq('script_name', 'reddit_scraper')
            .single()

          if (controlStatus.data && !manualOverride) {
            setIsRunning(controlStatus.data.enabled)
          }
        }
      } catch (supabaseError) {
        console.warn('Supabase status check failed:', supabaseError)
      }

      // Always try to fetch from production API on Render for scraper status
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for Render cold start

      try {
        const statusRes = await fetch(`${API_URL}/api/scraper/status-detailed`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        clearTimeout(timeoutId)

        if (statusRes.ok) {
          const data = await statusRes.json()
          setMetrics(data)

          // Debug log to check if cycle data is present
          if (data.cycle) {
            console.log('Cycle data received:', data.cycle)
          }

          // Only update running state if we haven't manually overridden it
          if (!manualOverride) {
            // Use the enabled state from the API which checks Supabase
            setIsRunning(data.enabled === true)
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        // Silently handle timeout errors (API might be cold starting)
        if (fetchError.name === 'AbortError') {
          // API is slow to respond, continue silently
        } else {
          // API fetch failed, continue silently
        }

        // Set minimal metrics from what we know
        setMetrics({
          enabled: isRunning,
          status: isRunning ? 'running' : 'stopped',
          statistics: {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            subreddits_processed: 0,
            posts_collected: 0,
            users_discovered: 0,
            daily_requests: 0,
            processing_rate_per_hour: 0
          },
          queue_depths: {
            priority: 0,
            new_discovery: 0,
            update: 0,
            user_analysis: 0
          },
          total_queue_depth: 0,
          accounts: { count: 0, proxies: 0 },
          last_activity: null,
          config: {
            batch_size: 0,
            delay_between_batches: 0,
            max_daily_requests: 0
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [manualOverride, isRunning])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)
      setManualOverride(true) // Enable manual override to prevent fetchMetrics from changing the state

      // Call the backend API on Render (production scraper)
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
    // Check initial scraper status from Supabase first (more reliable)
    const checkInitialStatus = async () => {
      try {
        // First check Supabase for immediate status - this is the source of truth
        if (!supabase) return
        const controlStatus = await supabase
          .from('system_control')
          .select('enabled, status')
          .eq('script_name', 'reddit_scraper')
          .single()

        if (controlStatus.data !== null) {
          // Always use Supabase as the source of truth for initial state
          setIsRunning(controlStatus.data.enabled === true)
          console.log('Scraper initial state from Supabase:', controlStatus.data.enabled ? 'running' : 'stopped')
        } else {
          // Default to stopped if no control record exists
          setIsRunning(false)
        }

        // Then try API with a short timeout for additional metrics
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout for initial check

        try {
          const statusRes = await fetch(`${API_URL}/api/scraper/status`, {
            mode: 'cors',
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          if (statusRes.ok) {
            const status = await statusRes.json()
            // Only use API status if we don't have Supabase data
            if (controlStatus.data === null) {
              const isScraperRunning = status.system_health?.scraper === 'running'
              setIsRunning(isScraperRunning === true)
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          // Silently ignore API errors on initial load
          // API not responding on initial load, continue silently
        }
      } catch (error) {
        console.log('Error checking initial status:', error)
        // Default to stopped on error
        setIsRunning(false)
      }
    }

    // Run initial checks
    checkInitialStatus()
    fetchMetrics()
    calculateSuccessRate()
    fetchCycleData()

    // Set up polling for metrics, success rate, and cycle data
    const metricsInterval = setInterval(() => {
      fetchMetrics()
      calculateSuccessRate() // Also refresh success rate from API
      fetchCycleData() // Also refresh cycle data from API
    }, 20000) // Refresh every 20 seconds

    return () => {
      clearInterval(metricsInterval)
    }
  }, []) // Empty dependency array - only run once on mount

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
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Success Rate (Today)</div>
                <div className="text-xl font-bold text-gray-900">
                  {successRate ? `${successRate.percentage.toFixed(1)}%` : '—'}
                </div>
              </div>

              {/* Cycle Length Card */}
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Current Cycle</div>
                <div className="text-xl font-bold text-gray-900">
                  {cycleData?.elapsed_formatted || 'Not Active'}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {cycleData?.elapsed_formatted === 'Not Active'
                    ? 'Scraper Disabled'
                    : cycleData?.elapsed_formatted === 'Unknown'
                    ? 'No Start Log Found'
                    : cycleData?.elapsed_formatted
                    ? 'Scraper Active'
                    : 'Loading...'}
                </div>
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
                  useSystemLogs={true}
                  sourceFilter="reddit_scraper"
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
                    useSystemLogs={true}
                  />
                </div>
                <div className="flex-1">
                  <ApiActivityLog
                    title="AI Categorization"
                    endpoint="categorization"
                    height="120px"
                    maxLogs={20}
                    useSystemLogs={true}
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