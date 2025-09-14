'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  message: string
  source?: string
  context?: any
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
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showVerbose, setShowVerbose] = useState(false)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(autoScroll)
  const subscriptionRef = useRef<any>(null)

  // Fetch initial logs
  const fetchLogs = useCallback(async (since?: string) => {
    if (isPaused) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: since ? '50' : '30', // Fetch 30 logs initially for quick load
        ...(selectedLevel !== 'all' && { level: selectedLevel }),
        ...(searchQuery && { search: searchQuery }),
        ...(since && { since })
      })

      const response = await fetch(`/api/scraper/logs-direct?${params}`)
      if (!response.ok) throw new Error('Failed to fetch logs')

      const data = await response.json()

      if (data.success && data.logs) {
        if (since) {
          // Append new logs to existing ones
          setLogs(prev => {
            const newLogs = [...data.logs, ...prev]
            // Keep only the most recent logs
            return newLogs.slice(0, maxLogs)
          })
        } else {
          // Replace all logs
          setLogs(data.logs)
        }

        // Update last timestamp for next fetch
        if (data.logs.length > 0) {
          setLastTimestamp(data.logs[0].timestamp)
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
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }, [isPaused, selectedLevel, searchQuery, maxLogs])

  // Set up Supabase real-time subscription
  useEffect(() => {
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
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    subscriptionRef.current = channel

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [isPaused, selectedLevel, searchQuery, maxLogs])

  // Initial fetch on mount
  useEffect(() => {
    fetchLogs() // Just fetch logs immediately
  }, []) // Remove dependency to prevent refetching on every render

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
    // Skip logs with the globe emoji
    if (message.includes('🌐')) {
      return false
    }

    const lowercaseMsg = message.toLowerCase()

    // Skip verbose/unimportant logs
    const skipPatterns = [
      '🔍 request to:',  // Hide all request logs
      'generated random user agent',
      'user-agent:',
      'headers:',
      'request headers',
      'response headers',
      'accept-language:',
      'accept-encoding:',
      'cache-control:',
      'connection:',
      'content-type:',
      'cookie:',
      'host:',
      'pragma:',
      'referer:',
      'sec-ch-ua',
      'sec-fetch',
      'x-forwarded',
      'x-requested-with',
      'upgrade-insecure-requests',
      'dnt:',
      'te:',
      'if-none-match',
      'if-modified-since',
      'accept: text/html',
      'accept: */*',
      'setting headers',
      'setting user agent',
      'using proxy',
      'proxy configuration',
      'initializing proxy',
      'browser fingerprint',
      'viewport size',
      'timezone:',
      'platform:',
      'screen resolution',
      'ensure_subreddits_exist_sync',  // Hide internal sync logs
      'fetching user data for',  // Hide user data fetching logs
      'race condition'  // Hide race condition logs as requested
    ]

    // Check if message contains any skip pattern
    for (const pattern of skipPatterns) {
      if (lowercaseMsg.includes(pattern)) {
        return false
      }
    }

    // Always show important logs
    const importantPatterns = [
      'error',
      'failed',
      'success',
      'completed',
      'started',
      'stopped',
      'found',
      'discovered',
      'processed',
      'analyzing',
      'subreddit',
      'posts collected',
      'users discovered',
      'rate limit',
      'queue',
      'batch',
      'total'
    ]

    for (const pattern of importantPatterns) {
      if (lowercaseMsg.includes(pattern)) {
        return true
      }
    }

    // Default: show the log if it's not in skip list
    return true
  }

  // Filter logs based on search and importance (for already fetched logs)
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      // Filter out unimportant logs (unless showVerbose is enabled)
      if (!showVerbose && !isImportantLog(log.message)) {
        return false
      }
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
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

    return deduped
  }, [logs, searchQuery, selectedLevel, showVerbose])

  // Clear logs
  const handleClear = () => {
    setLogs([])
    setLastTimestamp(null)
  }

  // Toggle pause
  const handlePauseToggle = () => {
    setIsPaused(!isPaused)
  }

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

  // Export logs
  const handleExport = () => {
    const logText = filteredLogs.map(log =>
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraper-logs-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }


  // Count logs by level
  const logCounts = useMemo(() => {
    const counts = { info: 0, warning: 0, error: 0, success: 0, debug: 0 }
    logs.forEach(log => {
      if (log.level in counts) {
        counts[log.level as keyof typeof counts]++
      }
    })
    return counts
  }, [logs])

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
        ) : filteredLogs.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            {searchQuery || selectedLevel !== 'all'
              ? 'No logs match your filters'
              : 'No logs available. Waiting for scraper activity...'}
          </div>
        ) : (
          <div
            ref={scrollAreaRef}
            className="w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-transparent to-gray-100/20"
            style={{ height }}
          >
            <div className="p-2 font-mono text-xs space-y-0.5 backdrop-blur-sm">
              {filteredLogs.map((log, index) => (
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
              ))}
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
function formatLogMessage(message: string, context: any): string {
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