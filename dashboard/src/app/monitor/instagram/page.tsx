'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

export default function InstagramMonitor() {
  // API URL configuration - memoized to satisfy ESLint exhaustive-deps
  const API_URL = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || 'http://91.98.91.129:10000',
    []
  )

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
  }, [API_URL])

  // Fetch cost data from API
  const fetchCostData = useCallback(async () => {
    try {
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
  }, [API_URL])

  // Fetch cycle data from API
  const fetchCycleData = useCallback(async () => {
    try {
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
  }, [API_URL, manualOverride])

  const handleScraperControl = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)

      // Optimistically update the UI immediately
      const newRunningState = action === 'start'
      setIsRunning(newRunningState)
      setManualOverride(true) // Enable manual override to prevent fetchMetrics from changing the state

      // Call the backend API on Render (production scraper)
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
  }, [API_URL, fetchMetrics, calculateSuccessRate, fetchCostData, fetchCycleData]) // Include all called functions

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metric Cards at Top */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          {/* Cost Tracking Card */}
          <UniversalMetricCard
            title="Today's Cost"
            value={`$${costData?.daily.toFixed(2) || '0.00'}`}
            subtitle={`~$${costData?.monthly.toFixed(2) || '0.00'}/mo`}
          />
        </div>

        {/* Logs Section - Full Width */}
        <div className="flex flex-col gap-4">
          {/* Main Logs */}
          <div>
            <LogViewerSupabase
              title="Instagram Scraper Activity"
              height="calc((100vh - 400px) / 2)"
              autoScroll={true}
              refreshInterval={5000}
              maxLogs={30}
              minLogsToShow={30}
              useSystemLogs={true}
              sourceFilter="instagram_scraper"
            />
          </div>

          {/* Activity Logs - Side-by-side layout */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <LogViewerSupabase
                title="Creator Updates"
                height="calc((100vh - 400px) / 2)"
                autoScroll={true}
                refreshInterval={5000}
                maxLogs={30}
                minLogsToShow={30}
                useSystemLogs={true}
                sourceFilter="creator_addition"
              />
            </div>
            <div className="flex-1">
              <LogViewerSupabase
                title="Related Creators"
                height="calc((100vh - 400px) / 2)"
                autoScroll={true}
                refreshInterval={5000}
                maxLogs={30}
                minLogsToShow={30}
                useSystemLogs={true}
                sourceFilter="instagram_related_creators"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}