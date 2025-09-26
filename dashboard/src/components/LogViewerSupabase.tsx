'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { useSupabaseSubscription } from '@/hooks/useSupabaseSubscription'
import { useAsyncEffect } from '@/hooks/useAsyncEffect'
interface LogContext {
  subreddit?: string
  operation?: string
  processing_time_ms?: number
  posts_collected?: number
  users_discovered?: number
  [key: string]: unknown
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  title: string
  message?: string
  source?: string
  context?: LogContext
}

interface LogViewerSupabaseProps {
  title?: string
  height?: string
  autoScroll?: boolean
  refreshInterval?: number
  maxLogs?: number
  tableName?: string
  sourceFilter?: string
  useSystemLogs?: boolean
}

export function LogViewerSupabase({
  title = 'Live Scraper Logs',
  height = '600px',
  autoScroll = true,
  refreshInterval = 5000,
  maxLogs = 500,
  tableName = 'reddit_scraper_logs',
  sourceFilter,
  useSystemLogs = false
}: LogViewerSupabaseProps) {
  const [logsMap, setLogsMap] = useState<Map<string, LogEntry>>(new Map())
  const [isPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery] = useState('')
  const [selectedLevel] = useState<string>('all')
  const [showVerbose] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(autoScroll)
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const updateInProgress = useRef(false)

  // Fetch initial logs directly from Supabase
  const fetchLogs = useCallback(async (since?: string, signal?: AbortSignal) => {
    if (isPaused || !supabase || signal?.aborted) return

    try {
      setError(null)

      // Determine which table to use
      const actualTableName = useSystemLogs ? 'system_logs' : tableName

      // Build query
      let query = supabase
        .from(actualTableName)
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(since ? 50 : 100)

      // Add filters based on table type
      if (useSystemLogs) {
        // For system_logs table
        if (sourceFilter) {
          // Map legacy source filters to new source values
          const sourceMap: Record<string, string> = {
            'scraper': 'reddit_scraper',
            'reddit_scraper': 'reddit_scraper',
            'instagram_scraper': 'instagram_scraper',
            'categorization': 'reddit_categorizer',
            'user_discovery': 'user_discovery',
            'api_user_discovery': 'api_user_discovery'
          }
          const mappedSource = sourceMap[sourceFilter] || sourceFilter
          query = query.eq('source', mappedSource)
        }

        if (selectedLevel !== 'all') {
          query = query.eq('level', selectedLevel)
        }

        if (searchQuery) {
          query = query.ilike('message', `%${searchQuery}%`)
        }
      } else {
        // For legacy tables
        if (selectedLevel !== 'all') {
          query = query.eq('level', selectedLevel)
        }

        if (searchQuery) {
          query = query.ilike('message', `%${searchQuery}%`)
        }

        if (sourceFilter) {
          query = query.eq('source', sourceFilter)
        }
      }

      if (since) {
        query = query.gt('timestamp', since)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      if (data) {
        // Wait if another update is in progress
        while (updateInProgress.current) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        updateInProgress.current = true

        try {
          const formattedLogs: LogEntry[] = data.map(log => {
            // Handle both table structures
            if (useSystemLogs) {
              return {
                id: log.id.toString(),
                timestamp: log.timestamp,
                level: log.level || 'info',
                title: formatLogMessage(log.message || '', log.context),
                message: log.message,
                source: log.source || log.script_name || 'unknown',
                context: log.context
              }
            } else {
              return {
                id: log.id.toString(),
                timestamp: log.timestamp,
                level: log.level || 'info',
                title: formatLogMessage(log.message || '', log.context),
                message: log.message,
                source: log.source || 'scraper',
                context: log.context
              }
            }
          })

          setLogsMap(prev => {
            const newMap = new Map(prev)

            // Add new logs to the map (automatically handles duplicates by ID)
            formattedLogs.forEach(log => {
              newMap.set(log.id, log)
            })

            // If we have too many logs, remove the oldest ones
            if (newMap.size > maxLogs) {
              // Convert to array, sort by timestamp, and keep only the most recent
              const sortedEntries = Array.from(newMap.entries())
                .sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime())
                .slice(0, maxLogs)

              return new Map(sortedEntries)
            }

            return newMap
          })

          // Update last timestamp for next fetch
          if (formattedLogs.length > 0) {
            const sortedLogs = formattedLogs.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            setLastTimestamp(sortedLogs[0].timestamp)
          }
        } finally {
          updateInProgress.current = false
        }

        // Auto-scroll to bottom if enabled
        if (shouldAutoScroll.current && scrollAreaRef.current && !since && !signal?.aborted) {
          // Clear any existing timer
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current)
          }

          scrollTimerRef.current = setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
            }
            scrollTimerRef.current = null
          }, 100)
        }
      }
    } catch (err) {
      logger.error('Error fetching logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    }
  }, [isPaused, selectedLevel, searchQuery, maxLogs, useSystemLogs, tableName, sourceFilter])

  // Determine which table to use
  const actualTableName = useMemo(() => useSystemLogs ? 'system_logs' : tableName, [useSystemLogs, tableName])

  // Set up Supabase real-time subscription using memory-safe hook
  const { isSubscribed, error: subError } = useSupabaseSubscription({
    table: actualTableName,
    event: 'INSERT',
    schema: 'public',
    enabled: !isPaused && !!supabase,
    autoReconnect: true,
    reconnectDelay: 5000,
    onData: async (payload) => {
      if (!payload.new) return

      // Wait if another update is in progress
      while (updateInProgress.current) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      updateInProgress.current = true

      try {
        const newData = payload.new as any

        // Handle both table structures
        const newLog: LogEntry = useSystemLogs ? {
          id: newData.id?.toString() || '',
          timestamp: newData.timestamp || '',
          level: newData.level || 'info',
          title: formatLogMessage(newData.message || '', newData.context),
          message: newData.message || '',
          source: newData.source || newData.script_name || 'unknown',
          context: newData.context
        } : {
          id: newData.id?.toString() || '',
          timestamp: newData.timestamp || '',
          level: newData.level || 'info',
          title: formatLogMessage(newData.message || '', newData.context),
          message: newData.message || '',
          source: newData.source || 'scraper',
          context: newData.context
        }

        // Apply filters based on table type
        if (useSystemLogs && sourceFilter) {
          // Map legacy source filters to new source values
          const sourceMap: Record<string, string> = {
            'scraper': 'reddit_scraper',
            'reddit_scraper': 'reddit_scraper',
            'instagram_scraper': 'instagram_scraper',
            'categorization': 'reddit_categorizer',
            'user_discovery': 'user_discovery',
            'api_user_discovery': 'api_user_discovery'
          }
          const mappedSource = sourceMap[sourceFilter] || sourceFilter
          if (newLog.source !== mappedSource) return
        } else if (!useSystemLogs && sourceFilter) {
          if (newLog.source !== sourceFilter) return
        }

        if (selectedLevel !== 'all' && newLog.level !== selectedLevel) return
        if (searchQuery && newLog.message && !newLog.message.toLowerCase().includes(searchQuery.toLowerCase())) return

        // Add new log to the map
        setLogsMap(prev => {
          const newMap = new Map(prev)
          newMap.set(newLog.id, newLog)

          // If we have too many logs, remove the oldest one
          if (newMap.size > maxLogs) {
            // Convert to array, sort by timestamp, and keep only the most recent
            const sortedEntries = Array.from(newMap.entries())
              .sort((a, b) => new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime())
              .slice(0, maxLogs)

            return new Map(sortedEntries)
          }

          return newMap
        })
      } finally {
        updateInProgress.current = false
      }

      // Auto-scroll if at bottom
      if (shouldAutoScroll.current && scrollAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        if (isNearBottom) {
          // Clear any existing timer
          if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current)
          }

          scrollTimerRef.current = setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
            }
            scrollTimerRef.current = null
          }, 100)
        }
      }
    },
    onError: (err) => {
      logger.error(`❌ [LogViewer] Subscription error for ${actualTableName}:`, err)
      setError(err.message)
    }
  })

  // Log subscription errors
  useEffect(() => {
    if (subError) {
      setError(subError.message)
    }
  }, [subError])

  // Initial fetch on mount using memory-safe async effect
  useAsyncEffect(async (signal) => {
    await fetchLogs(undefined, signal)
  }, [fetchLogs])

  // Periodic refresh for catching up (backup to real-time) using memory-safe interval
  useEffect(() => {
    if (isPaused || !lastTimestamp) return

    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    refreshIntervalRef.current = setInterval(() => {
      fetchLogs(lastTimestamp)
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [fetchLogs, refreshInterval, isPaused, lastTimestamp])

  // Function to check if a log message is important
  const isImportantLog = (title: string): boolean => {
    const lowercaseMsg = title.toLowerCase()

    // Only skip the most verbose/repetitive logs
    const skipPatterns = [
      '🔍 request to:',  // Hide request logs
      '🌐',  // Hide user agent logs
      '📋 headers:',  // Hide header logs
      'user-agent:',
      'accept-language:',
      'accept-encoding:',
      'cache-control:',
      'sec-ch-ua',
      'sec-fetch',
      'x-forwarded',
      'browser fingerprint',
      'viewport size',
      'screen resolution'
    ]

    // Check if message contains any skip pattern
    for (const pattern of skipPatterns) {
      if (lowercaseMsg.includes(pattern.toLowerCase())) {
        return false
      }
    }

    // Everything else is considered important enough to show
    return true
  }

  // Convert Map to sorted array of logs
  const logs = useMemo(() => {
    // Convert Map to array and sort by timestamp (newest first)
    return Array.from(logsMap.values()).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [logsMap])

  // Filter logs based on search and importance (for already fetched logs)
  const filteredLogs = useMemo(() => {
    // First apply search and level filters
    const searchAndLevelFiltered = logs.filter(log => {
      if (searchQuery && log.message && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
        return false
      }
      return true
    })

    // Then apply importance filter
    const filtered = searchAndLevelFiltered.filter(log => {
      // Filter out unimportant logs (unless showVerbose is enabled)
      if (!showVerbose && !isImportantLog(log.message || log.title)) {
        return false
      }
      return true
    })

    // Remove duplicate consecutive messages (but keep different IDs)
    const deduped: LogEntry[] = []
    let lastMessage = ''

    for (const log of filtered) {
      // Skip if this is the exact same message as the previous one
      if ((log.message || log.title) !== lastMessage) {
        deduped.push(log)
        lastMessage = log.message || log.title
      }
    }

    // If no important logs found, show the last 20 logs regardless of importance
    if (deduped.length === 0 && searchAndLevelFiltered.length > 0 && !showVerbose) {
      const recentLogs = searchAndLevelFiltered.slice(0, 20)
      const dedupedRecent: LogEntry[] = []
      let lastMsg = ''

      for (const log of recentLogs) {
        if ((log.message || log.title) !== lastMsg) {
          dedupedRecent.push(log)
          lastMsg = log.message || log.title
        }
      }

      return dedupedRecent
    }

    return deduped
  }, [logs, searchQuery, selectedLevel, showVerbose])


  // Get color based on log importance
  const getLogImportanceColor = (log: LogEntry): string => {
    const message = (log.message || log.title).toLowerCase()

    // Critical/Error logs - darkest
    if (log.level === 'error' || message.includes('error') || message.includes('failed') || message.includes('exception')) {
      return 'text-[#8B0000] font-semibold' // Dark red
    }

    // Success/Important logs - dark brand color
    if (log.level === 'success' || message.includes('success') || message.includes('saved') || message.includes('completed')) {
      return 'text-[#D64365] font-medium' // Dark brand pink
    }

    // Processing/Active logs - medium
    if (message.includes('analyzing') || message.includes('processing') || message.includes('tracking') || message.includes('discovered')) {
      return 'text-[#FF6B82]' // Medium brand pink
    }

    // Info/Status logs - lighter
    if (message.includes('race condition') || message.includes('updated') || message.includes('detected')) {
      return 'text-[#FF8395]' // Light brand pink
    }

    // Default/Less important - lightest
    return 'text-[#FFB3C0]' // Very light pink
  }


  return (
    <Card className="border-gray-200/50 bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl">
      {title && (
        <div className="px-2 py-1 border-b border-gray-200/30">
          <h3 className="text-[10px] font-medium text-gray-600">{title}</h3>
        </div>
      )}
      <CardContent className="p-0">
        {error ? (
          <div className="p-4 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <div
            ref={scrollAreaRef}
            className="w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-transparent to-gray-100/20"
            style={{ height }}
          >
            <div className="p-2 font-mono text-xs space-y-0.5 backdrop-blur-sm">
              {filteredLogs.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  {searchQuery || selectedLevel !== 'all'
                    ? 'No logs match your filters'
                    : 'No recent scraper activity. Check if the scraper is running.'}
                </div>
              ) : (
                filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-1 px-2 rounded group hover:bg-gray-200/40 transition-colors`}
                >
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <span className="text-gray-400 text-[10px]" title={new Date(log.timestamp).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex-1 break-all">
                    <span className={getLogImportanceColor(log)}>
                      {log.message || log.title}
                    </span>
                    {log.source && log.source !== 'scraper' && (
                      <span className="ml-2 text-[10px] text-gray-400">
                        [{log.source}]
                      </span>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute top-12 right-4 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            Paused
          </div>
        )}

        {isSubscribed && (
          <div className="absolute top-12 right-4 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            Live
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to format log messages with context
function formatLogMessage(title: string, context: LogContext | undefined): string {
  if (!context) return title

  let formatted = title

  // Add subreddit context
  if (context.subreddit) {
    formatted = `[r/${context.subreddit}] ${formatted}`
  }

  // Add operation context
  if (context.operation) {
    formatted = `[${context.operation}] ${formatted}`
  }

  // Add performance metrics
  if (context.processing_time_ms) {
    formatted += ` (${context.processing_time_ms}ms)`
  }

  // Add data counts
  if (context.posts_collected) {
    formatted += ` - ${context.posts_collected} posts`
  }

  if (context.users_discovered) {
    formatted += ` - ${context.users_discovered} users`
  }

  return formatted
}