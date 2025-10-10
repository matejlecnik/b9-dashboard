/**
 * React Query hooks for Monitoring pages
 * Handles Reddit and Instagram monitoring data with real-time updates
 */

import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

// --- Toast fallback (fixes "cannot find use-toast") ---
type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastOptions {
  type: ToastType
  title: string
  description?: string
}
function useToast() {
  // fallback: log to console
  return {
    addToast: ({ type, title, description }: ToastOptions) => {
      console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](
        `[${type.toUpperCase()}] ${title}${description ? ': ' + description : ''}`
      )
    }
  }
}

// Types for monitoring data
interface RedditMonitorStatus {
  is_running: boolean
  current_batch: number
  total_batches: number
  posts_scraped: number
  subreddits_discovered: number
  users_found: number
  last_run: string | null
  next_run: string | null
  error_count: number
  last_error: string | null
}

interface RedditAccount {
  username: string
  status: 'active' | 'rate_limited' | 'banned' | 'error'
  requests_today: number
  limit: number
  last_used: string
  error?: string
}

interface InstagramScraperStatus {
  status: 'running' | 'stopped' | 'error'
  creators_scraped: number
  posts_scraped: number
  last_run: string | null
  current_creator?: string
  progress?: number
  error?: string
}

interface ScraperMetrics {
  total_creators: number
  total_posts: number
  creators_per_hour: number
  posts_per_hour: number
  success_rate: number
  avg_response_time: number
}

/**
 * Hook for fetching Reddit monitor status
 */
export function useRedditMonitorStatus() {
  useToast()

  return useQuery({
    queryKey: ['monitor', 'reddit', 'status'],
    queryFn: async (): Promise<RedditMonitorStatus> => {
      const response = await fetch('/api/proxy/reddit/scraper/status')

      if (!response.ok) {
        throw new Error('Failed to fetch Reddit monitor status')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch status')
      }

      return data.status
    },
    staleTime: 5 * 1000, // 5 seconds for real-time monitoring
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  })
}

/**
 * Hook for fetching Reddit accounts status
 */
export function useRedditAccounts() {
  return useQuery({
    queryKey: ['monitor', 'reddit', 'accounts'],
    queryFn: async (): Promise<RedditAccount[]> => {
      const response = await fetch('/api/proxy/reddit/scraper/accounts')

      if (!response.ok) {
        throw new Error('Failed to fetch Reddit accounts')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch accounts')
      }

      return data.accounts || []
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook for fetching Reddit queue status
 */
export function useRedditQueueStatus() {
  return useQuery({
    queryKey: ['monitor', 'reddit', 'queue'],
    queryFn: async () => {
      const response = await fetch('/api/proxy/reddit/scraper/queue')

      if (!response.ok) {
        throw new Error('Failed to fetch queue status')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch queue')
      }

      return {
        pending: data.pending || 0,
        processing: data.processing || 0,
        completed: data.completed || 0,
        failed: data.failed || 0,
        total: data.total || 0
      }
    },
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  })
}

/**
 * Mutation to start Reddit scraper
 */
export function useStartRedditScraper() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (params?: { subreddit_limit?: number; post_limit?: number }) => {
      const response = await fetch('/api/proxy/reddit/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start scraper')
      }

      return data
    },
    onSuccess: () => {
      // Invalidate status to show new state
      queryClient.invalidateQueries({ queryKey: ['monitor', 'reddit', 'status'] })

      addToast({
        type: 'success',
        title: 'Reddit scraper started successfully'
      })
    },
    onError: (error) => {
      logger.error('Failed to start Reddit scraper', error)
      addToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'Failed to start scraper'
      })
    }
  })
}

/**
 * Mutation to stop Reddit scraper
 */
export function useStopRedditScraper() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/proxy/reddit/scraper/stop', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to stop scraper')
      }

      return data
    },
    onSuccess: () => {
      // Invalidate status to show new state
      queryClient.invalidateQueries({ queryKey: ['monitor', 'reddit', 'status'] })

      addToast({
        type: 'success',
        title: 'Reddit scraper stopped'
      })
    },
    onError: (error) => {
      logger.error('Failed to stop Reddit scraper', error)
      addToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'Failed to stop scraper'
      })
    }
  })
}

/**
 * Hook for fetching Instagram scraper status
 */
export function useInstagramScraperStatus() {
  useToast()

  return useQuery({
    queryKey: ['monitor', 'instagram', 'status'],
    queryFn: async (): Promise<InstagramScraperStatus> => {
      const response = await fetch('/api/proxy/instagram/scraper/status')

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram scraper status')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch status')
      }

      return data.status
    },
    staleTime: 5 * 1000, // 5 seconds for real-time monitoring
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  })
}

/**
 * Hook for fetching Instagram scraper metrics
 */
export function useInstagramScraperMetrics() {
  return useQuery({
    queryKey: ['monitor', 'instagram', 'metrics'],
    queryFn: async (): Promise<ScraperMetrics> => {
      const response = await fetch('/api/proxy/instagram/scraper/metrics')

      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch metrics')
      }

      return data.metrics
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook for fetching Instagram scraper errors
 */
export function useInstagramScraperErrors() {
  return useQuery({
    queryKey: ['monitor', 'instagram', 'errors'],
    queryFn: async () => {
      const response = await fetch('/api/proxy/instagram/scraper/errors')

      if (!response.ok) {
        throw new Error('Failed to fetch errors')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch errors')
      }

      return data.errors || []
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Mutation to start Instagram scraper
 */
export function useStartInstagramScraper() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (params?: { limit?: number; batch_size?: number }) => {
      const response = await fetch('/api/proxy/instagram/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start scraper')
      }

      return data
    },
    onSuccess: () => {
      // Invalidate status to show new state
      queryClient.invalidateQueries({ queryKey: ['monitor', 'instagram', 'status'] })

      addToast({
        type: 'success',
        title: 'Instagram scraper started successfully'
      })
    },
    onError: (error) => {
      logger.error('Failed to start Instagram scraper', error)
      addToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'Failed to start scraper'
      })
    }
  })
}

/**
 * Mutation to stop Instagram scraper
 */
export function useStopInstagramScraper() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/proxy/instagram/scraper/stop', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to stop scraper')
      }

      return data
    },
    onSuccess: () => {
      // Invalidate status to show new state
      queryClient.invalidateQueries({ queryKey: ['monitor', 'instagram', 'status'] })

      addToast({
        type: 'success',
        title: 'Instagram scraper stopped'
      })
    },
    onError: (error) => {
      logger.error('Failed to stop Instagram scraper', error)
      addToast({
        type: 'error',
        title: error instanceof Error ? error.message : 'Failed to stop scraper'
      })
    }
  })
}

/**
 * Hook for fetching scraper logs with real-time updates
 */
export function useScraperLogs(type: 'reddit' | 'instagram', limit = 100) {
  return useQuery({
    queryKey: ['scraper-logs', type, limit],
    queryFn: async () => {
      const endpoint = type === 'reddit'
        ? '/api/proxy/reddit/scraper/logs'
        : '/api/proxy/instagram/scraper/logs'

      const response = await fetch(`${endpoint}?limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch logs')
      }

      return data.logs || []
    },
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time logs
  })
}

/**
 * Combined monitoring dashboard data hook
 */
export function useMonitoringDashboard() {
  const redditStatus = useRedditMonitorStatus()
  const redditAccounts = useRedditAccounts()
  const redditQueue = useRedditQueueStatus()
  const instagramStatus = useInstagramScraperStatus()
  const instagramMetrics = useInstagramScraperMetrics()

  return {
    reddit: {
      status: redditStatus.data,
      accounts: redditAccounts.data,
      queue: redditQueue.data,
      isLoading: redditStatus.isLoading || redditAccounts.isLoading || redditQueue.isLoading,
      error: redditStatus.error || redditAccounts.error || redditQueue.error
    },
    instagram: {
      status: instagramStatus.data,
      metrics: instagramMetrics.data,
      isLoading: instagramStatus.isLoading || instagramMetrics.isLoading,
      error: instagramStatus.error || instagramMetrics.error
    }
  }
}