'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Activity, CheckCircle, XCircle, Zap, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

// Type for flexible context data
type LogContextValue = string | number | boolean | null | undefined | LogContextValue[] | { [key: string]: LogContextValue }
type LogContext = Record<string, LogContextValue>

interface EnhancedLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  message: string
  source?: string
  context?: LogContext
  // New fields
  request_type?: string
  http_status?: number
  response_time_ms?: number
  url?: string
  subreddit?: string
  username?: string
  success?: boolean
  error_type?: string
  retry_count?: number
  proxy_used?: string
  account_used?: string
  data_collected?: LogContext
  session_id?: string
}

interface EnhancedLogViewerProps {
  title?: string
  height?: string
  refreshInterval?: number
  maxLogs?: number
}

export function EnhancedLogViewer({
  title = 'Enhanced Scraper Activity',
  height = '600px',
  refreshInterval = 5000,
  maxLogs = 100
}: EnhancedLogViewerProps) {
  const [logs, setLogs] = useState<EnhancedLog[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    activeProxies: new Set<string>(),
    recentSubreddits: new Set<string>()
  })
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch logs with new fields
  const fetchLogs = useCallback(async () => {
    if (isPaused) return

    // Check if supabase client is available
    if (!supabase) {
      console.error('Supabase client not initialized')
      return
    }

    try {
      const { data: logs, error } = await supabase
        .from('reddit_scraper_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(maxLogs)

      if (error) throw error

      if (logs) {
        setLogs(logs as EnhancedLog[])

        // Calculate stats
        const successfulLogs = logs.filter(l => l.success === true)
        const avgTime = logs
          .filter(l => l.response_time_ms)
          .reduce((acc, l) => acc + (l.response_time_ms || 0), 0) / logs.length || 0

        const proxies = new Set(logs.map(l => l.proxy_used).filter(Boolean))
        const subreddits = new Set(logs.slice(0, 20).map(l => l.subreddit).filter(Boolean))

        setStats({
          totalRequests: logs.length,
          successRate: (successfulLogs.length / logs.length) * 100,
          avgResponseTime: Math.round(avgTime),
          activeProxies: proxies as Set<string>,
          recentSubreddits: subreddits as Set<string>
        })
      }
    } catch (error) {
      console.error('Error fetching enhanced logs:', error)
    }
  }, [isPaused, maxLogs])

  // Set up real-time subscription
  useEffect(() => {
    fetchLogs()

    if (!supabase) {
      console.error('Supabase client not initialized')
      return
    }

    const channel = supabase
      .channel('enhanced_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reddit_scraper_logs'
        },
        (payload) => {
          if (!isPaused && payload.new) {
            setLogs(prev => [payload.new as EnhancedLog, ...prev].slice(0, maxLogs))
          }
        }
      )
      .subscribe()

    const interval = setInterval(fetchLogs, refreshInterval)

    return () => {
      clearInterval(interval)
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [isPaused, maxLogs, refreshInterval, fetchLogs])

  // Get status badge color
  const getStatusBadge = (status?: number) => {
    if (!status) return null

    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-500 text-white text-[10px]">{status}</Badge>
    } else if (status === 429) {
      return <Badge className="bg-orange-500 text-white text-[10px]">Rate Limited</Badge>
    } else if (status === 403) {
      return <Badge className="bg-red-500 text-white text-[10px]">Blocked</Badge>
    } else if (status === 404) {
      return <Badge className="bg-gray-500 text-white text-[10px]">Not Found</Badge>
    } else if (status >= 400) {
      return <Badge className="bg-red-400 text-white text-[10px]">{status}</Badge>
    }
    return <Badge className="bg-gray-400 text-white text-[10px]">{status}</Badge>
  }

  // Get request type icon
  const getRequestIcon = (type?: string) => {
    switch (type) {
      case 'subreddit':
        return <Globe className="h-3 w-3 text-blue-500" />
      case 'user':
        return <Activity className="h-3 w-3 text-purple-500" />
      case 'post':
        return <Zap className="h-3 w-3 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <Card className="border-gray-200/50 bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{stats.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>{stats.avgResponseTime}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-purple-500" />
              <span>{stats.activeProxies.size} proxies</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollAreaRef}
          className="w-full overflow-y-auto overflow-x-hidden"
          style={{ height }}
        >
          <div className="p-2 font-mono text-xs space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-gray-100/50 transition-colors"
              >
                {/* Time */}
                <span className="text-[10px] text-gray-400 min-w-[60px]">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: false })}
                </span>

                {/* Request Type Icon */}
                {getRequestIcon(log.request_type)}

                {/* Status Badge */}
                {getStatusBadge(log.http_status)}

                {/* Success/Failure Icon */}
                {log.success !== undefined && (
                  log.success ?
                    <CheckCircle className="h-3 w-3 text-green-500" /> :
                    <XCircle className="h-3 w-3 text-red-500" />
                )}

                {/* Subreddit/User */}
                {log.subreddit && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    r/{log.subreddit}
                  </Badge>
                )}
                {log.username && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    u/{log.username}
                  </Badge>
                )}

                {/* Message */}
                <span className="flex-1 text-gray-700 break-all">
                  {log.message}
                </span>

                {/* Response Time */}
                {log.response_time_ms && (
                  <span className="text-[10px] text-gray-400">
                    {log.response_time_ms}ms
                  </span>
                )}

                {/* Retry Count */}
                {log.retry_count && log.retry_count > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
                    Retry {log.retry_count}
                  </Badge>
                )}

                {/* Error Type */}
                {log.error_type && (
                  <Badge className="bg-red-100 text-red-800 text-[10px]">
                    {log.error_type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-200/30 p-2 bg-gray-50/50">
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <div>
              {stats.totalRequests} requests • {stats.recentSubreddits.size} subreddits
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={fetchLogs}
                className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}