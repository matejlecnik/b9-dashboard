'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Play,
  Square
} from 'lucide-react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { LogViewerSupabase } from '@/components/features/monitoring/LogViewerSupabase'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export default function InstagramMonitor() {
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
      } catch {
        clearTimeout(timeoutId)
        logger.log('Failed to fetch success rate')
      }
    } catch (error) {
      logger.error('Error calculating success rate:', error)
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
      } catch {
        clearTimeout(timeoutId)
        logger.log('Failed to fetch cost metrics')
      }
    } catch (error) {
      logger.error('Error fetching cost data:', error)
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
            logger.log('Instagram cycle data from API:', data.cycle)
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
          logger.error('Failed to fetch cycle data from API')
          setCycleData(null)
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId)
        if ((error as Error).name === 'AbortError') {
          logger.log('API timeout fetching cycle data')
        } else {
          logger.error('Error fetching cycle data:', error)
        }
        setCycleData(null)
      }
    } catch (error) {
      logger.error('Error fetching cycle data:', error)
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
        logger.warn('Supabase status check failed:', supabaseError)
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

          // Process the response data without storing unused metrics

          // Only update running state if we haven't manually overridden it
          if (!manualOverride) {
            setIsRunning(data.control?.enabled === true)
          }
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId)
        // Silently handle timeout errors (API might be cold starting)
        if ((error as Error).name === 'AbortError') {
          // API is slow to respond, continue silently
        } else {
          // API fetch failed, continue silently
        }

        // Continue without setting metrics on error
      }
    } catch (error) {
      logger.error('Failed to fetch metrics:', error)
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

      logger.error('Scraper control error:', error)
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
          logger.log('Instagram scraper initial state from Supabase:', isEnabled ? 'running' : 'stopped')
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
        } catch {
          clearTimeout(timeoutId)
          // Silently ignore API errors on initial load
        }
      } catch (error) {
        logger.log('Error checking initial status:', error)
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
  }, [fetchMetrics, calculateSuccessRate, fetchCostData, fetchCycleData]) // Include all called functions

  return (
    <DashboardLayout>
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
              <StandardActionButton
                onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
                label={isRunning ? 'Stop Scraper' : 'Start Scraper'}
                icon={isRunning ? Square : Play}
                variant={isRunning ? 'danger' : 'primary'}
                disabled={loading}
                size="large"
                className="w-[140px]"
              />

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
                <div className="text-[10px] text-gray-500 mb-0.5">Today&apos;s Cost</div>
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
    </DashboardLayout>
  )
}