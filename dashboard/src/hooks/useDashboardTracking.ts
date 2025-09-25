import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
const STORAGE_KEY = 'dashboard-last-opened'
const RECENT_THRESHOLD = 3 // Number of dashboards to mark as "recent"

export interface DashboardAccessData {
  [dashboardId: string]: number // timestamp
}

export interface DashboardWithTracking {
  dashboard_id: string
  name: string
  path: string
  description?: string | null
  lastOpened?: number
  isRecent?: boolean
}

/**
 * Hook for tracking dashboard access times and sorting by most recently used
 */
export function useDashboardTracking() {
  const [accessData, setAccessData] = useState<DashboardAccessData>({})

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setAccessData(parsed)
        logger.info('📊 Loaded dashboard access history:', parsed)
      }
    } catch (error) {
      logger.error('Failed to load dashboard access history:', error)
    }
  }, [])

  // Track when a dashboard is opened
  const trackDashboardAccess = useCallback((dashboardId: string) => {
    try {
      const now = Date.now()
      const updated = {
        ...accessData,
        [dashboardId]: now
      }

      // Update state
      setAccessData(updated)

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

      logger.info(`📊 Tracked access to dashboard: ${dashboardId}`)
    } catch (error) {
      logger.error('Failed to track dashboard access:', error)
    }
  }, [accessData])

  // Sort dashboards by last opened time
  const sortDashboardsByRecent = useCallback((
    dashboards: DashboardWithTracking[]
  ): DashboardWithTracking[] => {
    // Create a copy with tracking data
    const dashboardsWithTracking = dashboards.map((dashboard) => ({
      ...dashboard,
      lastOpened: accessData[dashboard.dashboard_id] || 0,
      isRecent: false
    }))

    // Sort by last opened (most recent first)
    dashboardsWithTracking.sort((a, b) => {
      const aTime = a.lastOpened || 0
      const bTime = b.lastOpened || 0

      // If neither has been opened, maintain original order
      if (aTime === 0 && bTime === 0) return 0

      // Unopened dashboards go to the end
      if (aTime === 0) return 1
      if (bTime === 0) return -1

      // Sort by most recent first
      return bTime - aTime
    })

    // Mark the top N as recent
    dashboardsWithTracking.forEach((dashboard, index) => {
      dashboard.isRecent = index < RECENT_THRESHOLD && dashboard.lastOpened > 0
    })

    return dashboardsWithTracking
  }, [accessData])

  // Clear all tracking data
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setAccessData({})
      logger.info('📊 Cleared dashboard access history')
    } catch (error) {
      logger.error('Failed to clear dashboard access history:', error)
    }
  }, [])

  // Get relative time string (e.g., "2 hours ago", "Yesterday")
  const getRelativeTime = useCallback((dashboardId: string): string => {
    const timestamp = accessData[dashboardId]
    if (!timestamp) return 'Never opened'

    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`

    return new Date(timestamp).toLocaleDateString()
  }, [accessData])

  return {
    trackDashboardAccess,
    sortDashboardsByRecent,
    clearHistory,
    getRelativeTime,
    accessData
  }
}