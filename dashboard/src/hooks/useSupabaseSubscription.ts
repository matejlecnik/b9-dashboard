import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
 
interface UseSupabaseSubscriptionOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
  onData?: (payload: RealtimePostgresChangesPayload<T>) => void
  onError?: (error: Error) => void
  enabled?: boolean
  autoReconnect?: boolean
  reconnectDelay?: number
}

interface UseSupabaseSubscriptionReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T | null
  error: Error | null
  isSubscribed: boolean
  reconnect: () => void
  unsubscribe: () => Promise<void>
}

/**
 * Custom hook for managing Supabase real-time subscriptions with automatic cleanup
 * Prevents memory leaks by properly managing subscription lifecycle
 */
export function useSupabaseSubscription<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  event = '*',
  schema = 'public',
  filter,
  onData,
  onError,
  enabled = true,
  autoReconnect = true,
  reconnectDelay = 5000
}: UseSupabaseSubscriptionOptions<T>): UseSupabaseSubscriptionReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const isConnectingRef = useRef(false)

  // Cleanup function to clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Unsubscribe function with proper cleanup
  const unsubscribe = useCallback(async (): Promise<void> => {
    clearReconnectTimeout()
    isConnectingRef.current = false

    if (channelRef.current && supabase) {
      const channel = channelRef.current
      channelRef.current = null

      try {
        await channel.unsubscribe()
        supabase.removeChannel(channel)
        logger.log(`✅ [useSupabaseSubscription] Unsubscribed from ${table}`)
      } catch (err) {
        logger.error(`❌ [useSupabaseSubscription] Error unsubscribing from ${table}:`, err)
        // Force cleanup even if unsubscribe fails
        try {
          supabase.removeChannel(channel)
        } catch (forceErr) {
          logger.error(`❌ [useSupabaseSubscription] Force cleanup failed for ${table}:`, forceErr)
        }
      }

      if (mountedRef.current) {
        setIsSubscribed(false)
      }
    }
  }, [table, clearReconnectTimeout])

  // Subscribe function with error handling and reconnection
  const subscribe = useCallback(() => {
    if (!supabase || !enabled || !mountedRef.current || isConnectingRef.current) {
      return
    }

    isConnectingRef.current = true
    clearReconnectTimeout()

    logger.log(`🔄 [useSupabaseSubscription] Subscribing to ${table}...`)

    const channelName = `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const channel = supabase.channel(channelName)

    const handlePayload = (payload: RealtimePostgresChangesPayload<T>) => {
      if (!mountedRef.current) return

      logger.log(`📨 [useSupabaseSubscription] Received ${payload.eventType} event from ${table}`)

      // Update local state
      setData(payload.new as T)
      setError(null)

      // Call user callback
      onData?.(payload)
    }

    // Narrow event to satisfy overloaded typings
    switch (event) {
      case '*':
        channel.on('postgres_changes', { event: '*', schema, table, ...(filter ? { filter } : {}) }, handlePayload)
        break
      case 'INSERT':
        channel.on('postgres_changes', { event: 'INSERT', schema, table, ...(filter ? { filter } : {}) }, handlePayload)
        break
      case 'UPDATE':
        channel.on('postgres_changes', { event: 'UPDATE', schema, table, ...(filter ? { filter } : {}) }, handlePayload)
        break
      case 'DELETE':
        channel.on('postgres_changes', { event: 'DELETE', schema, table, ...(filter ? { filter } : {}) }, handlePayload)
        break
      default:
        channel.on('postgres_changes', { event: '*', schema, table, ...(filter ? { filter } : {}) }, handlePayload)
        break
    }

    channel
      .subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR', err?: Error) => {
        if (!mountedRef.current) return

        isConnectingRef.current = false

        if (err) {
          const error = new Error(`Subscription error for ${table}: ${err.message}`)
          logger.error(`❌ [useSupabaseSubscription] ${error.message}`)

          setError(error)
          setIsSubscribed(false)
          onError?.(error)

          // Auto-reconnect if enabled
          if (autoReconnect && mountedRef.current) {
            logger.log(`⏱️ [useSupabaseSubscription] Will retry connection to ${table} in ${reconnectDelay}ms`)
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                subscribe()
              }
            }, reconnectDelay)
          }
        } else {
          logger.log(`✅ [useSupabaseSubscription] Subscription status for ${table}: ${status}`)

          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true)
            setError(null)
          }
        }
      })

    channelRef.current = channel
  }, [table, event, schema, filter, enabled, onData, onError, autoReconnect, reconnectDelay, clearReconnectTimeout])

  // Reconnect function for manual reconnection
  const reconnect = useCallback(() => {
    logger.log(`🔁 [useSupabaseSubscription] Manual reconnect requested for ${table}`)
    unsubscribe().then(() => {
      if (mountedRef.current) {
        subscribe()
      }
    })
  }, [subscribe, unsubscribe, table])

  // Main effect to manage subscription lifecycle
  useEffect(() => {
    mountedRef.current = true

    if (enabled) {
      subscribe()
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      mountedRef.current = false
      clearReconnectTimeout()

      // Unsubscribe and cleanup
      if (channelRef.current) {
        const channel = channelRef.current
        channelRef.current = null

        // Async cleanup in a fire-and-forget manner
        channel.unsubscribe().then(() => {
          if (supabase) {
            supabase.removeChannel(channel)
          }
        }).catch((err: unknown) => {
          logger.error(`❌ [useSupabaseSubscription] Cleanup error for ${table}:`, err)
        })
      }
    }
  }, [enabled, subscribe, clearReconnectTimeout, table])

  return {
    data,
    error,
    isSubscribed,
    reconnect,
    unsubscribe
  }
}

/**
 * Hook for subscribing to multiple tables at once
 */
// Removed multi-subscription helper to comply with React hooks rules