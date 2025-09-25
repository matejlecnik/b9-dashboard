/**
 * React Query hooks for Offline Support and Background Sync
 * Handles offline mutations, sync queue, and conflict resolution
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
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

// Types for offline sync
interface OfflineMutation {
  id: string
  timestamp: number
  type: 'create' | 'update' | 'delete'
  entity: 'subreddit' | 'creator' | 'post'
  data: Record<string, unknown>
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retries: number
  error?: string
}

interface SyncStatus {
  isOnline: boolean
  pendingMutations: number
  isSyncing: boolean
  lastSyncAt: Date | null
  syncErrors: string[]
}

// Type guard to ensure mutation data contains a string id
function hasStringId(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === 'string'
  )
}

// Local storage keys
const OFFLINE_QUEUE_KEY = 'b9_offline_mutations'
const SYNC_STATUS_KEY = 'b9_sync_status'

/**
 * Hook for managing offline mutations queue
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineMutation[]>([])

  useEffect(() => {
    // Load queue from localStorage on mount
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setQueue(parsed)
      } catch (error) {
        logger.error('Failed to load offline queue', error)
      }
    }
  }, [])

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  }, [queue])

  const addToQueue = (mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'status' | 'retries'>) => {
    const newMutation: OfflineMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    }

    setQueue(prev => [...prev, newMutation])
    return newMutation.id
  }

  const updateMutation = (id: string, updates: Partial<OfflineMutation>) => {
    setQueue(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const removeMutation = (id: string) => {
    setQueue(prev => prev.filter(m => m.id !== id))
  }

  const clearCompleted = () => {
    setQueue(prev => prev.filter(m => m.status !== 'completed'))
  }

  const clearAll = () => {
    setQueue([])
    localStorage.removeItem(OFFLINE_QUEUE_KEY)
  }

  return {
    queue,
    addToQueue,
    updateMutation,
    removeMutation,
    clearCompleted,
    clearAll,
    pendingCount: queue.filter(m => m.status === 'pending').length
  }
}

/**
 * Hook for monitoring online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      logger.info('Connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      logger.warn('Connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Also check periodically with a fetch
    const interval = setInterval(() => {
      fetch('/api/health', { method: 'HEAD' })
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false))
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return isOnline
}

/**
 * Hook for background sync of offline mutations
 */
export function useBackgroundSync() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isOnline = useOnlineStatus()
  const { queue, updateMutation, removeMutation, clearCompleted } = useOfflineQueue()
  const [isSyncing, setIsSyncing] = useState(false)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Process a single mutation
  const processMutation = useCallback(async (mutation: OfflineMutation): Promise<boolean> => {
    updateMutation(mutation.id, { status: 'syncing' })

    try {
      let endpoint = ''
      let method = ''
      let body = {}

      // Determine API endpoint and method based on mutation type and entity
      switch (mutation.entity) {
        case 'subreddit':
          switch (mutation.type) {
            case 'update':
              if (!hasStringId(mutation.data)) {
                throw new Error('Subreddit update requires an id')
              }
              endpoint = `/api/reddit/subreddits/${mutation.data.id}`
              method = 'PATCH'
              body = mutation.data
              break
            case 'create':
              endpoint = '/api/reddit/subreddits/add'
              method = 'POST'
              body = mutation.data
              break
            case 'delete':
              if (!hasStringId(mutation.data)) {
                throw new Error('Subreddit delete requires an id')
              }
              endpoint = `/api/reddit/subreddits/${mutation.data.id}`
              method = 'DELETE'
              break
          }
          break

        case 'creator':
          switch (mutation.type) {
            case 'update':
              if (!hasStringId(mutation.data)) {
                throw new Error('Creator update requires an id')
              }
              endpoint = `/api/instagram/creators/${mutation.data.id}`
              method = 'PATCH'
              body = mutation.data
              break
            // Add other cases as needed
          }
          break
      }

      if (!endpoint) {
        throw new Error(`Unknown mutation type: ${mutation.entity}/${mutation.type}`)
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || `HTTP ${response.status}`)
      }

      // Success - mark as completed
      updateMutation(mutation.id, { status: 'completed' })

      // Invalidate relevant queries
      switch (mutation.entity) {
        case 'subreddit':
          queryClient.invalidateQueries({ queryKey: ['reddit'] })
          break
        case 'creator':
          queryClient.invalidateQueries({ queryKey: ['instagram'] })
          break
      }

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to sync mutation ${mutation.id}`, error)

      // Update mutation with error
      updateMutation(mutation.id, {
        status: 'failed',
        retries: mutation.retries + 1,
        error: errorMessage
      })

      // If too many retries, remove from queue
      if (mutation.retries >= 3) {
        removeMutation(mutation.id)
        addToast({
          type: 'error',
          title: `Failed to sync ${mutation.entity} after 3 retries`,
          description: errorMessage
        })
      }

      return false
    }
  }, [updateMutation, removeMutation, queryClient, addToast])

  // Sync all pending mutations
  const syncAll = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return
    }

    const pendingMutations = queue.filter(m => m.status === 'pending' || m.status === 'failed')

    if (pendingMutations.length === 0) {
      return
    }

    setIsSyncing(true)
    logger.info(`Starting sync of ${pendingMutations.length} mutations`)

    let successCount = 0
    let failureCount = 0

    for (const mutation of pendingMutations) {
      const success = await processMutation(mutation)
      if (success) {
        successCount++
      } else {
        failureCount++
      }

      // Small delay between mutations to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setIsSyncing(false)
    clearCompleted()

    if (successCount > 0) {
      addToast({
        type: 'success',
        title: `Synced ${successCount} offline changes`
      })
    }

    if (failureCount > 0) {
      addToast({
        type: 'warning',
        title: `${failureCount} changes failed to sync`
      })
    }

    // Update sync status in localStorage
    const status: SyncStatus = {
      isOnline,
      pendingMutations: queue.filter(m => m.status === 'pending').length,
      isSyncing: false,
      lastSyncAt: new Date(),
      syncErrors: queue.filter(m => m.status === 'failed').map(m => m.error || 'Unknown error')
    }
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))
  }, [
    isOnline,
    isSyncing,
    queue,
    clearCompleted,
    addToast,
    processMutation
  ])

  // Start background sync when online
  useEffect(() => {
    if (isOnline && !syncIntervalRef.current) {
      // Initial sync
      syncAll()

      // Set up periodic sync
      syncIntervalRef.current = setInterval(syncAll, 60000) // Every minute
    } else if (!isOnline && syncIntervalRef.current) {
      // Clear interval when offline
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isOnline, syncAll])

  return {
    isSyncing,
    syncNow: syncAll,
    pendingCount: queue.filter(m => m.status === 'pending').length
  }
}

/**
 * Enhanced mutation hook with offline support
 */
export function useOfflineMutation<TData = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    entity: 'subreddit' | 'creator' | 'post'
    type: 'create' | 'update' | 'delete'
    onSuccess?: (data: TData) => void
    onError?: (error: Error) => void
  }
) {
  const isOnline = useOnlineStatus()
  const { addToQueue } = useOfflineQueue()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // If offline, add to queue instead of executing
      if (!isOnline && options?.entity) {
        const id = addToQueue({
          type: options.type,
          entity: options.entity,
          data: variables as Record<string, unknown>
        })

        addToast({
          type: 'info',
          title: 'Saved offline',
          description: 'Your changes will be synced when connection is restored'
        })

        // Return a placeholder result
        return { offline: true, queueId: id } as TData
      }

      // If online, execute normally
      return mutationFn(variables)
    },
  })
}

/**
 * Hook for sync status monitoring
 */
export function useSyncStatus(): SyncStatus {
  const isOnline = useOnlineStatus()
  const { pendingCount } = useOfflineQueue()
  const { isSyncing } = useBackgroundSync()
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [syncErrors, setSyncErrors] = useState<string[]>([])

  useEffect(() => {
    // Load last sync time and errors from localStorage
    const stored = localStorage.getItem(SYNC_STATUS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.lastSyncAt) {
          setLastSyncAt(new Date(parsed.lastSyncAt))
        }
        if (Array.isArray(parsed.syncErrors)) {
          setSyncErrors(parsed.syncErrors)
        }
      } catch (error) {
        logger.error('Failed to load sync status', error)
      }
    }
  }, [isSyncing]) // Re-check when sync completes

  return {
    isOnline,
    pendingMutations: pendingCount,
    isSyncing,
    lastSyncAt,
    syncErrors
  }
}