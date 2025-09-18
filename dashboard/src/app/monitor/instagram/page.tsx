'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Play,
  Square,
  Instagram
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { LogViewerSupabase } from '@/components/LogViewerSupabase'
import { RedditMonitorSidebar } from '@/components/RedditMonitorSidebar'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/index'

interface InstagramMetrics {
  enabled: boolean
  status: 'running' | 'stopped' | 'error'
  statistics: {
    total_api_calls: number
    successful_calls: number
    failed_calls: number
    creators_processed: number
    content_collected: number
    viral_content_detected: number
    daily_api_calls: number
    processing_rate_per_hour: number
  }
  performance: {
    current_rps: number
    avg_response_time: number
    total_requests: number
    uptime_seconds: number
  }
  creators: {
    total: number
    active: number
    pending: number
  }
  last_activity: string | null
  config: {
    batch_size: number
    requests_per_second: number
    max_daily_calls: number
    max_monthly_calls: number
  }
  cost?: {
    current_run: number
    daily_budget_used: number
    monthly_budget_used: number
  }
}

export default function InstagramMonitor() {
  const [metrics, setMetrics] = useState<InstagramMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const [successRate, setSuccessRate] = useState<{ percentage: number; successful: number; total: number } | null>(null)
  const [costData, setCostData] = useState<{ daily: number; monthly: number } | null>(null)
  const [cycleData, setCycleData] = useState<{ elapsed_formatted: string; start_time: string | null } | null>(null)
  const { addToast } = useToast()

  // Calculate success rate from API
  const calculateSuccessRate = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch(`${API_URL}/api/instagram/scraper/success-rate`, {
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
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.log('Failed to fetch success rate')
      }
    } catch (error) {
      console.error('Error calculating success rate:', error)
    }
  }, [])

  // Fetch cost data from API
  const fetchCostData = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch(`${API_URL}/api/instagram/scraper/cost-metrics`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.metrics) {
            setCostData({
              daily: data.metrics.daily_cost || 0,
              monthly: data.metrics.projected_monthly_cost || 0
            })
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.log('Failed to fetch cost metrics')
      }
    } catch (error) {
      console.error('Error fetching cost data:', error)
    }
  }, [])

  // Fetch cycle data from API
  const fetchCycleData = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for Render cold starts

      try {
        const response = await fetch(`${API_URL}/api/instagram/scraper/cycle-status`, {
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
            console.log('Instagram cycle data from API:', data.cycle)
          } else if (data.success && !data.control?.enabled) {
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

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // First, try to get status from Supabase (faster and more reliable)
      try {
        if (supabase) {
          const controlStatus = await supabase
            .from('system_control')
            .select('enabled, status')
            .eq('script_name', 'instagram_scraper')
            .single()

          if (controlStatus.data && !manualOverride) {
            const isEnabled = controlStatus.data.enabled === true || controlStatus.data.status === 'running'
            setIsRunning(isEnabled)
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
        const statusRes = await fetch(`${API_URL}/api/instagram/scraper/status`, {
          mode: 'cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        clearTimeout(timeoutId)

        if (statusRes.ok) {
          const data = await statusRes.json()

          // Map the response to our metrics structure
          const mappedMetrics: InstagramMetrics = {
            enabled: data.control?.enabled || false,
            status: data.control?.enabled ? 'running' : 'stopped',
            statistics: {
              total_api_calls: data.progress?.api_calls_made || 0,
              successful_calls: data.progress?.successful_calls || data.progress?.api_calls_made || 0,
              failed_calls: data.progress?.failed_calls || 0,
              creators_processed: data.progress?.creators_processed || 0,
              content_collected: 0,
              viral_content_detected: 0,
              daily_api_calls: data.progress?.daily_api_calls || 0,
              processing_rate_per_hour: data.performance?.current_rps ? data.performance.current_rps * 3600 : 0
            },
            performance: data.performance || {
              current_rps: 0,
              avg_response_time: 0,
              total_requests: 0,
              uptime_seconds: 0
            },
            creators: {
              total: 0,
              active: 0,
              pending: 0
            },
            last_activity: data.timestamp,
            config: {
              batch_size: 100,
              requests_per_second: 55,
              max_daily_calls: 24000,
              max_monthly_calls: 1000000
            },
            cost: data.cost
          }

          setMetrics(mappedMetrics)

          // Only update running state if we haven't manually overridden it
          if (!manualOverride) {
            setIsRunning(data.control?.enabled === true)
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
            total_api_calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            creators_processed: 0,
            content_collected: 0,
            viral_content_detected: 0,
            daily_api_calls: 0,
            processing_rate_per_hour: 0
          },
          performance: {
            current_rps: 0,
            avg_response_time: 0,
            total_requests: 0,
            uptime_seconds: 0
          },
          creators: { total: 0, active: 0, pending: 0 },
          last_activity: null,
          config: {
            batch_size: 100,
            requests_per_second: 55,
            max_daily_calls: 24000,
            max_monthly_calls: 1000000
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [manualOverride, isRunning, supabase])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)
      setManualOverride(true) // Enable manual override to prevent fetchMetrics from changing the state

      // Call the backend API on Render (production scraper)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
      const endpoint = action === 'start' ? '/api/instagram/scraper/start' : '/api/instagram/scraper/stop'

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
            title: `Instagram Scraper ${action === 'start' ? 'Started Successfully' : 'Stopped Successfully'}`,
            description: action === 'start'
              ? '✅ High-performance scraping is now active. Processing at 55 req/sec.'
              : '⏹️ Scraper has been stopped. No new content will be collected.',
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
          .eq('script_name', 'instagram_scraper')
          .single()

        if (controlStatus.data !== null) {
          // Always use Supabase as the source of truth for initial state
          const isEnabled = controlStatus.data.enabled === true || controlStatus.data.status === 'running'
          setIsRunning(isEnabled)
          console.log('Instagram scraper initial state from Supabase:', isEnabled ? 'running' : 'stopped')
        } else {
          // Default to stopped if no control record exists
          setIsRunning(false)
        }

        // Then try API with a short timeout for additional metrics
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout for initial check

        try {
          const statusRes = await fetch(`${API_URL}/api/instagram/scraper/status`, {
            mode: 'cors',
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          if (statusRes.ok) {
            const status = await statusRes.json()
            // Only use API status if we don't have Supabase data
            if (controlStatus.data === null) {
              const isScraperRunning = status.running === true
              setIsRunning(isScraperRunning)
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          // Silently ignore API errors on initial load
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
    fetchCostData()
    fetchCycleData()

    // Set up polling for metrics
    const metricsInterval = setInterval(() => {
      fetchMetrics()
      calculateSuccessRate()
      fetchCostData()
      fetchCycleData()
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
              <Button
                variant={isRunning ? 'destructive' : 'default'}
                onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRunning ? 'Stop Scraper' : 'Start Scraper'}
              </Button>

              {/* Success Rate Card */}
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Success Rate</div>
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

              {/* Cost Tracking Card */}
              <div className="bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl rounded-lg p-3 w-[150px]">
                <div className="text-[10px] text-gray-500 mb-0.5">Today's Cost</div>
                <div className="text-xl font-bold text-gray-900">
                  ${costData?.daily.toFixed(2) || '0.00'}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  ~${costData?.monthly.toFixed(2) || '0.00'} projected/mo
                </div>
              </div>
            </div>

            {/* Live Logs Container */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Main Logs */}
              <div>
                <LogViewerSupabase
                  title="Instagram Scraper Activity"
                  height="300px"
                  autoScroll={true}
                  refreshInterval={5000}
                  maxLogs={500}
                  useSystemLogs={true}
                  sourceFilter="instagram_scraper"
                />
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