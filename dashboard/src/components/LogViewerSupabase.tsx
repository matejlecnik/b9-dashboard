'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  message: string
  source?: string
  context?: LogContext
}

interface LogViewerSupabaseProps {
  title?: string
  height?: string
  autoScroll?: boolean
  refreshInterval?: number
  maxLogs?: number
}

export function LogViewerSupabase({
  title = 'Live Scraper Logs',
  height = '600px',
  autoScroll = true,
  refreshInterval = 5000,
  maxLogs = 500
}: LogViewerSupabaseProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery] = useState('')
  const [selectedLevel] = useState<string>('all')
  const [showVerbose] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(autoScroll)
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  // Fetch initial logs directly from Supabase
  const fetchLogs = useCallback(async (since?: string) => {
    if (isPaused || !supabase) return

    try {
      setError(null)

      // Build query
      let query = supabase
        .from('reddit_scraper_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(since ? 50 : 100)

      // Add filters
      if (selectedLevel !== 'all') {
        query = query.eq('level', selectedLevel)
      }

      if (searchQuery) {
        query = query.ilike('message', `%${searchQuery}%`)
      }

      if (since) {
        query = query.gt('timestamp', since)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      if (data) {
        const formattedLogs: LogEntry[] = data.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level || 'info',
          message: formatLogMessage(log.message, log.context),
          source: log.source || 'scraper',
          context: log.context
        }))

        if (since) {
          // Append new logs to existing ones
          setLogs(prev => {
            const newLogs = [...formattedLogs.reverse(), ...prev]
            // Keep only the most recent logs
            return newLogs.slice(0, maxLogs)
          })
        } else {
          // Replace all logs
          setLogs(formattedLogs)
        }

        // Update last timestamp for next fetch
        if (formattedLogs.length > 0) {
          setLastTimestamp(formattedLogs[0].timestamp)
        }

        // Auto-scroll to bottom if enabled
        if (shouldAutoScroll.current && scrollAreaRef.current && !since) {
          setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
            }
          }, 100)
        }
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    }
  }, [isPaused, selectedLevel, searchQuery, maxLogs])

  // Set up Supabase real-time subscription
  useEffect(() => {
    // Check if supabase client is available
    if (!supabase) {
      console.error('Supabase client not initialized')
      return
    }

    // Subscribe to new logs
    const channel = supabase
      .channel('reddit_scraper_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reddit_scraper_logs'
        },
        (payload) => {
          if (!isPaused && payload.new) {
            const newLog: LogEntry = {
              id: payload.new.id,
              timestamp: payload.new.timestamp,
              level: payload.new.level || 'info',
              message: formatLogMessage(payload.new.message, payload.new.context),
              source: payload.new.source || 'scraper',
              context: payload.new.context
            }

            // Apply filters
            if (selectedLevel !== 'all' && newLog.level !== selectedLevel) return
            if (searchQuery && !newLog.message.toLowerCase().includes(searchQuery.toLowerCase())) return

            // Add new log to the beginning
            setLogs(prev => {
              const updated = [newLog, ...prev]
              return updated.slice(0, maxLogs)
            })

            // Auto-scroll if at bottom
            if (shouldAutoScroll.current && scrollAreaRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
              if (isNearBottom) {
                setTimeout(() => {
                  if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
                  }
                }, 100)
              }
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current && supabase) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [isPaused, selectedLevel, searchQuery, maxLogs])

  // Initial fetch on mount
  useEffect(() => {
    fetchLogs() // Just fetch logs immediately
  }, [fetchLogs])

  // Periodic refresh for catching up (backup to real-time)
  useEffect(() => {
    if (isPaused || !lastTimestamp) return

    const interval = setInterval(() => {
      fetchLogs(lastTimestamp)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchLogs, refreshInterval, isPaused, lastTimestamp])

  // Function to check if a log message is important
  const isImportantLog = (message: string): boolean => {
    const lowercaseMsg = message.toLowerCase()

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

  // Filter logs based on search and importance (for already fetched logs)
  const filteredLogs = useMemo(() => {
    // First apply search and level filters
    const searchAndLevelFiltered = logs.filter(log => {
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
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
      if (!showVerbose && !isImportantLog(log.message)) {
        return false
      }
      return true
    })

    // Remove duplicate consecutive logs
    const deduped: LogEntry[] = []
    let lastMessage = ''

    for (const log of filtered) {
      // Skip if this is the exact same message as the previous one
      if (log.message !== lastMessage) {
        deduped.push(log)
        lastMessage = log.message
      }
    }

    // If no important logs found, show the last 20 logs regardless of importance
    if (deduped.length === 0 && searchAndLevelFiltered.length > 0 && !showVerbose) {
      const recentLogs = searchAndLevelFiltered.slice(0, 20)
      const dedupedRecent: LogEntry[] = []
      let lastMsg = ''

      for (const log of recentLogs) {
        if (log.message !== lastMsg) {
          dedupedRecent.push(log)
          lastMsg = log.message
        }
      }

      return dedupedRecent
    }

    return deduped
  }, [logs, searchQuery, selectedLevel, showVerbose])


  // Get color based on log importance
  const getLogImportanceColor = (log: LogEntry): string => {
    const message = log.message.toLowerCase()

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
                filteredLogs.map((log, index) => (
                <div
                  key={`${log.id}-${log.timestamp}-${index}`}
                  className={`flex items-start gap-2 py-1 px-2 rounded group hover:bg-gray-200/40 transition-colors`}
                >
                  <div className="flex items-center gap-1.5 min-w-fit">
                    <span className="text-gray-400 text-[10px]" title={new Date(log.timestamp).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex-1 break-all">
                    <span className={getLogImportanceColor(log)}>
                      {log.message}
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
      </CardContent>
    </Card>
  )
}

// Helper function to format log messages with context
function formatLogMessage(message: string, context: LogContext | undefined): string {
  if (!context) return message

  let formatted = message

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