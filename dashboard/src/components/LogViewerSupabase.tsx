'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Terminal,
  Pause,
  Play,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Loader2,
  Search,
  Filter,
  X,
  Zap,
  Activity
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
        limit: since ? '50' : '200', // Fetch fewer logs for updates
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

  // Initial fetch on mount and when filters change
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Periodic refresh for catching up (backup to real-time)
  useEffect(() => {
    if (isPaused || !lastTimestamp) return

    const interval = setInterval(() => {
      fetchLogs(lastTimestamp)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchLogs, refreshInterval, isPaused, lastTimestamp])

  // Filter logs based on search (for already fetched logs)
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
        return false
      }
      return true
    })
  }, [logs, searchQuery, selectedLevel])

  // Clear logs
  const handleClear = () => {
    setLogs([])
    setLastTimestamp(null)
  }

  // Toggle pause
  const handlePauseToggle = () => {
    setIsPaused(!isPaused)
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

  // Get icon for log level
  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      case 'debug':
        return <Info className="h-3.5 w-3.5 text-gray-400" />
      default:
        return <Info className="h-3.5 w-3.5 text-blue-500" />
    }
  }

  // Get color for log level
  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'success':
        return 'text-green-600'
      case 'debug':
        return 'text-gray-500'
      default:
        return 'text-gray-700'
    }
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
    <Card className="border-gray-100">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            {title}
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1 text-green-500" />
                Live
              </Badge>
            )}
            {filteredLogs.length < logs.length && (
              <span className="text-xs text-gray-500">
                ({filteredLogs.length}/{logs.length})
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-7 w-7"
              title="Toggle filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePauseToggle}
              className="h-7 w-7"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-7 w-7"
              title="Clear logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-7 w-7"
              title="Export logs"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchLogs()}
              className="h-7 w-7"
              title="Refresh"
              disabled={isLoading}
            >
              <Activity className={`h-3.5 w-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Level Filter */}
            <div className="flex items-center gap-1">
              <Button
                variant={selectedLevel === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('all')}
                className="h-7 px-2 text-xs"
              >
                All
              </Button>
              <Button
                variant={selectedLevel === 'info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('info')}
                className="h-7 px-2 text-xs"
              >
                <Info className="h-3 w-3 mr-1 text-blue-500" />
                Info ({logCounts.info})
              </Button>
              <Button
                variant={selectedLevel === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('success')}
                className="h-7 px-2 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                Success ({logCounts.success})
              </Button>
              <Button
                variant={selectedLevel === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('warning')}
                className="h-7 px-2 text-xs"
              >
                <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                Warning ({logCounts.warning})
              </Button>
              <Button
                variant={selectedLevel === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('error')}
                className="h-7 px-2 text-xs"
              >
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
                Error ({logCounts.error})
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

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
            className="w-full overflow-y-auto overflow-x-hidden"
            style={{ height }}
          >
            <div className="p-2 font-mono text-xs space-y-0.5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-1 px-2 rounded group hover:bg-gray-50`}
                >
                  <div className="flex items-center gap-1.5 min-w-fit">
                    {getLogIcon(log.level)}
                    <span className="text-gray-400 text-[10px]" title={new Date(log.timestamp).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex-1 break-all">
                    <span className={getLogColor(log.level)}>
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