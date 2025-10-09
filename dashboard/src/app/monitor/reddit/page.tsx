'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Play,
  Square
} from 'lucide-react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { LogViewerSupabase } from '@/components/features/monitoring/LogViewerSupabase'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { UniversalMetricCard } from '@/components/shared/cards'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export default function RedditMonitor() {
  // API URL configuration - memoized to satisfy ESLint exhaustive-deps
  const API_URL = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com',
    []
  )

  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const [successRate, setSuccessRate] = useState<{ percentage: number; successful: number; total: number } | null>(null)
  const [cycleData, setCycleData] = useState<{ elapsed_formatted: string; start_time: string | null } | null>(null)
  const { addToast } = useToast()
  const manualOverrideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch cycle data from API
  const fetchCycleData = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for Render cold starts

      try {
        const response = await fetch(`${API_URL}/api/reddit/scraper/cycle-status`, {
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
            logger.log('Cycle data from API:', data.cycle)
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
  }, [API_URL])

  // Calculate success rate from API
  const calculateSuccessRate = useCallback(async () => {
    try {
      // Fetch from production API on Render
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout for Render cold starts

      try {
        const response = await fetch(`${API_URL}/api/reddit/scraper/success-rate`, {
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
            logger.log(`Reddit API Success Rate from API: ${stats.successful_requests}/${stats.total_requests} (${stats.success_rate}%)`)
          } else {
            setSuccessRate(null)
          }
        } else {
          logger.error('Failed to fetch success rate from API')
          setSuccessRate(null)
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId)
        if ((error as Error).name === 'AbortError') {
          logger.log('API timeout fetching success rate')
        } else {
          logger.error('Error fetching success rate:', error)
        }
        setSuccessRate(null)
      }
    } catch (error) {
      logger.error('Error calculating success rate:', error)
      setSuccessRate(null)
    }
  }, [API_URL])

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
        logger.warn('Supabase status check failed:', supabaseError)
      }

      // Always try to fetch from production API on Render for scraper status
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout for Render cold start

      try {
        const statusRes = await fetch(`${API_URL}/api/reddit/scraper/status-detailed`, {
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

          // Debug log to check if cycle data is present
          if (data.cycle) {
            logger.log('Cycle data received:', data.cycle)
          }

          // Only update running state if we haven't manually overridden it
          if (!manualOverride) {
            // Use the enabled state from the API which checks Supabase
            setIsRunning(data.enabled === true)
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
  }, [API_URL, manualOverride])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)
      setManualOverride(true) // Enable manual override to prevent fetchMetrics from changing the state

      // Call the backend API on Render (production scraper)
      const endpoint = action === 'start' ? '/api/reddit/scraper/start' : '/api/reddit/scraper/stop'

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
          if (manualOverrideTimeoutRef.current) {
            clearTimeout(manualOverrideTimeoutRef.current)
          }
          manualOverrideTimeoutRef.current = setTimeout(() => {
            setManualOverride(false)
            manualOverrideTimeoutRef.current = null
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
          .eq('script_name', 'reddit_scraper')
          .single()

        if (controlStatus.data !== null) {
          // Always use Supabase as the source of truth for initial state
          setIsRunning(controlStatus.data.enabled === true)
          logger.log('Scraper initial state from Supabase:', controlStatus.data.enabled ? 'running' : 'stopped')
        } else {
          // Default to stopped if no control record exists
          setIsRunning(false)
        }

        // Then try API with a short timeout for additional metrics
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout for initial check

        try {
          const statusRes = await fetch(`${API_URL}/api/reddit/scraper/status`, {
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
        } catch {
          clearTimeout(timeoutId)
          // Silently ignore API errors on initial load
          // API not responding on initial load, continue silently
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
    fetchCycleData()

    // Set up polling for metrics, success rate, and cycle data
    const metricsInterval = setInterval(() => {
      fetchMetrics()
      calculateSuccessRate() // Also refresh success rate from API
      fetchCycleData() // Also refresh cycle data from API
    }, 20000) // Refresh every 20 seconds

    return () => {
      clearInterval(metricsInterval)
      if (manualOverrideTimeoutRef.current) {
        clearTimeout(manualOverrideTimeoutRef.current)
      }
    }
  }, [API_URL, fetchMetrics, calculateSuccessRate, fetchCycleData]) // Include all called functions

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metric Cards at Top */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Start/Stop Scraper Button */}
          <StandardActionButton
            onClick={() => handleScraperControl(isRunning ? 'stop' : 'start')}
            label={isRunning ? 'Stop' : 'Start'}
            icon={isRunning ? Square : Play}
            variant={isRunning ? 'stop' : 'primary'}
            disabled={loading}
            size="large"
            className="w-full h-full"
          />

          {/* Success Rate Card */}
          <UniversalMetricCard
            title="Success Rate"
            value={successRate ? `${successRate.percentage.toFixed(1)}%` : '—'}
            subtitle={successRate ? `${successRate.successful}/${successRate.total}` : undefined}
          />

          {/* Cycle Length Card */}
          <UniversalMetricCard
            title="Current Cycle"
            value={cycleData?.elapsed_formatted || 'Not Active'}
            subtitle={
              cycleData?.elapsed_formatted === 'Not Active'
                ? 'Disabled'
                : cycleData?.elapsed_formatted === 'Unknown'
                ? 'No Data'
                : 'Active'
            }
          />
        </div>

        {/* Logs Section - Full Width */}
        <div className="flex flex-col gap-4">
          {/* Main Logs */}
          <div>
            <LogViewerSupabase
              title="Reddit Scraper Activity"
              height="calc((100vh - 380px) / 2)"
              autoScroll={true}
              refreshInterval={5000}
              maxLogs={30}
              minLogsToShow={30}
              useSystemLogs={true}
              sourceFilter="reddit_scraper"
            />
          </div>

          {/* API Activity Logs Row - Side-by-side layout */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <LogViewerSupabase
                title="User Activity"
                height="calc((100vh - 380px) / 2)"
                autoScroll={true}
                refreshInterval={5000}
                maxLogs={30}
                minLogsToShow={30}
                useSystemLogs={true}
                sourceFilter={['user_discovery', 'api_user_discovery']}
              />
            </div>
            <div className="flex-1">
              <LogViewerSupabase
                title="AI Categorization"
                height="calc((100vh - 380px) / 2)"
                autoScroll={true}
                refreshInterval={5000}
                maxLogs={30}
                minLogsToShow={30}
                useSystemLogs={true}
                sourceFilter={['reddit_categorizer', 'reddit_tagger']}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}