import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Types for realtime events
 */

interface Subreddit {
  id: number
  name: string
  display_name: string
  review?: string
  [key: string]: unknown
}

interface Creator {
  id: number
  username: string
  review_status?: string
  [key: string]: unknown
}

interface InfiniteQueryData<T> {
  pages: T[][]
  pageParams: unknown[]
}

type QueryData<T> = InfiniteQueryData<T> | T[] | undefined

/**
 * Hook for subscribing to Reddit subreddit changes
 */
export function useRealtimeSubreddits() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let mounted = true

    const setupRealtimeSubscription = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not available')
          return
        }
        if (!mounted) return

        channelRef.current = supabase
          .channel('reddit-subreddits-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reddit_subreddits' },
            (payload: RealtimePostgresChangesPayload<Subreddit>) => {
              logger.info('Realtime subreddit update', payload)

              switch (payload.eventType) {
                case 'INSERT': {
                  queryClient.invalidateQueries({ queryKey: queryKeys.reddit.subreddits() })
                  queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
                  break
                }
                case 'UPDATE': {
                  const updatedSubreddit = payload.new

                  queryClient.setQueryData(
                    queryKeys.reddit.subreddit(updatedSubreddit.id),
                    updatedSubreddit
                  )

                  queryClient.setQueriesData(
                    { queryKey: queryKeys.reddit.subreddits() },
                    (oldData: QueryData<Subreddit>) => {
                      if (!oldData) return oldData

                      if ('pages' in oldData && Array.isArray(oldData.pages)) {
                        return {
                          ...oldData,
                          pages: oldData.pages.map((page: Subreddit[]) =>
                            page.map((item) =>
                              item.id === updatedSubreddit.id ? updatedSubreddit : item
                            )
                          )
                        }
                      }

                      if (Array.isArray(oldData)) {
                        return oldData.map((item: Subreddit) =>
                          item.id === updatedSubreddit.id ? updatedSubreddit : item
                        )
                      }

                      return oldData
                    }
                  )

                  if (payload.old?.review !== payload.new.review) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
                  }
                  break
                }
                case 'DELETE': {
                  const deletedId = payload.old?.id

                  queryClient.setQueriesData(
                    { queryKey: queryKeys.reddit.subreddits() },
                    (oldData: QueryData<Subreddit>) => {
                      if (!oldData) return oldData

                      if ('pages' in oldData && Array.isArray(oldData.pages)) {
                        return {
                          ...oldData,
                          pages: oldData.pages.map((page: Subreddit[]) =>
                            page.filter((item) => item.id !== deletedId)
                          )
                        }
                      }

                      if (Array.isArray(oldData)) {
                        return oldData.filter((item: Subreddit) => item.id !== deletedId)
                      }

                      return oldData
                    }
                  )

                  queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
                  break
                }
                default:
                  break
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info('Subscribed to Reddit subreddits realtime updates')
            }
          })
      } catch (error) {
        logger.error('Failed to setup realtime subscription', error)
      }
    }

    setupRealtimeSubscription()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [queryClient])
}

/**
 * Hook for subscribing to Instagram creator changes
 */
export function useRealtimeCreators() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let mounted = true

    const setupRealtimeSubscription = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not available')
          return
        }
        if (!mounted) return

        channelRef.current = supabase
          .channel('instagram-creators-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'instagram_creators' },
            (payload: RealtimePostgresChangesPayload<Creator>) => {
              logger.info('Realtime creator update', payload)

              switch (payload.eventType) {
                case 'INSERT': {
                  queryClient.invalidateQueries({ queryKey: queryKeys.instagram.creators() })
                  queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })
                  break
                }
                case 'UPDATE': {
                  const updatedCreator = payload.new

                  queryClient.setQueryData(
                    queryKeys.instagram.creator(updatedCreator.id),
                    updatedCreator
                  )

                  queryClient.setQueriesData(
                    { queryKey: queryKeys.instagram.creators() },
                    (oldData: QueryData<Creator>) => {
                      if (!oldData) return oldData

                      if ('pages' in oldData && Array.isArray(oldData.pages)) {
                        return {
                          ...oldData,
                          pages: oldData.pages.map((page: Creator[]) =>
                            page.map((item) =>
                              item.id === updatedCreator.id ? updatedCreator : item
                            )
                          )
                        }
                      }

                      if (Array.isArray(oldData)) {
                        return oldData.map((item: Creator) =>
                          item.id === updatedCreator.id ? updatedCreator : item
                        )
                      }

                      return oldData
                    }
                  )

                  if (payload.old?.review_status !== payload.new.review_status) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })
                  }
                  break
                }
                case 'DELETE': {
                  const deletedId = payload.old?.id

                  queryClient.setQueriesData(
                    { queryKey: queryKeys.instagram.creators() },
                    (oldData: QueryData<Creator>) => {
                      if (!oldData) return oldData

                      if ('pages' in oldData && Array.isArray(oldData.pages)) {
                        return {
                          ...oldData,
                          pages: oldData.pages.map((page: Creator[]) =>
                            page.filter((item) => item.id !== deletedId)
                          )
                        }
                      }

                      if (Array.isArray(oldData)) {
                        return oldData.filter((item: Creator) => item.id !== deletedId)
                      }

                      return oldData
                    }
                  )

                  queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })
                  break
                }
                default:
                  break
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info('Subscribed to Instagram creators realtime updates')
            }
          })
      } catch (error) {
        logger.error('Failed to setup realtime subscription', error)
      }
    }

    setupRealtimeSubscription()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [queryClient])
}

/**
 * Hook for subscribing to monitoring status changes
 */
export function useRealtimeMonitoring() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let mounted = true

    const setupRealtimeSubscription = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not available')
          return
        }
        if (!mounted) return

        channelRef.current = supabase
          .channel('monitoring-status')
          .on('broadcast', { event: 'status-update' }, (payload: { payload: { type: string } }) => {
            logger.info('Realtime monitoring update', payload)

            if (payload.payload?.type === 'reddit') {
              queryClient.invalidateQueries({ queryKey: queryKeys.monitor.reddit() })
            } else if (payload.payload?.type === 'instagram') {
              queryClient.invalidateQueries({ queryKey: queryKeys.monitor.instagram() })
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info('Subscribed to monitoring realtime updates')
            }
          })
      } catch (error) {
        logger.error('Failed to setup monitoring realtime subscription', error)
      }
    }

    setupRealtimeSubscription()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [queryClient])
}

/**
 * Combined hook to enable all realtime subscriptions
 */
export function useRealtimeUpdates() {
  useRealtimeSubreddits()
  useRealtimeCreators()
  useRealtimeMonitoring()
}

/**
 * Hook for presence (who's online)
 */
export function usePresence(channel: string = 'global') {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let mounted = true

    const setupPresence = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not available')
          return
        }
        if (!mounted) return

        channelRef.current = supabase.channel(channel)

        channelRef.current
          .on('presence', { event: 'sync' }, () => {
            const state = channelRef.current?.presenceState()
            logger.info('Presence state', state)
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            logger.info('User joined', { key, newPresences })
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            logger.info('User left', { key, leftPresences })
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channelRef.current?.track({
                user_id: 'current-user',
                online_at: new Date().toISOString()
              })
            }
          })
      } catch (error) {
        logger.error('Failed to setup presence', error)
      }
    }

    setupPresence()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [channel])
}

/**
 * Hook for broadcasting custom events
 */
export function useBroadcast() {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let mounted = true

    const setupBroadcast = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not available')
          return
        }
        if (!mounted) return

        channelRef.current = supabase
          .channel('app-broadcasts')
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info('Broadcast channel ready')
            }
          })
      } catch (error) {
        logger.error('Failed to setup broadcast channel', error)
      }
    }

    setupBroadcast()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [])

  const broadcast = async (event: string, payload: unknown) => {
    if (!channelRef.current) {
      logger.warn('Broadcast channel not ready')
      return
    }

    await channelRef.current.send({
      type: 'broadcast',
      event,
      payload
    })
  }

  return { broadcast }
}