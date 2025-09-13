'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  context?: any
}

interface ApiEndpoint {
  name: string
  endpoint: string
  method: 'GET' | 'POST' | 'DELETE'
  status?: 'active' | 'idle' | 'error'
}

interface ApiMonitorProps {
  type?: 'scraper' | 'reddit' | 'all'
  showLogs?: boolean
  autoRefresh?: boolean
  compact?: boolean
}

export function ApiMonitor({
  type = 'all',
  showLogs = true,
  autoRefresh = true,
  compact = false
}: ApiMonitorProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])

  // Define API endpoints
  const allEndpoints: ApiEndpoint[] = [
    // Scraper endpoints
    {
      name: 'Start Scraper',
      endpoint: '/api/scraper/start-continuous',
      method: 'POST',
      status: 'active'
    },
    {
      name: 'Stop Scraper',
      endpoint: '/api/scraper/stop-continuous',
      method: 'POST',
      status: 'idle'
    },
    {
      name: 'Scraper Status',
      endpoint: '/api/scraper/status-detailed',
      method: 'GET',
      status: 'active'
    },
    // Reddit/Categorization endpoints
    {
      name: 'AI Categorization',
      endpoint: '/api/categorization/start',
      method: 'POST',
      status: 'idle'
    },
    {
      name: 'Categorization Status',
      endpoint: '/api/categorization/status',
      method: 'GET',
      status: 'active'
    },
    {
      name: 'Add Reddit User',
      endpoint: '/api/reddit/user',
      method: 'POST',
      status: 'idle'
    },
    {
      name: 'Search Users',
      endpoint: '/api/reddit/users/search',
      method: 'GET',
      status: 'active'
    },
    {
      name: 'Get User Stats',
      endpoint: '/api/reddit/user/stats',
      method: 'GET',
      status: 'active'
    },
    {
      name: 'Search Subreddits',
      endpoint: '/api/subreddits/search',
      method: 'GET',
      status: 'active'
    },
    {
      name: 'Update Subreddit',
      endpoint: '/api/subreddits/update',
      method: 'POST',
      status: 'idle'
    },
    {
      name: 'Get Dashboard Stats',
      endpoint: '/api/stats',
      method: 'GET',
      status: 'active'
    }
  ]

  // Filter endpoints based on type
  useEffect(() => {
    if (type === 'scraper') {
      setEndpoints(allEndpoints.filter(e => e.endpoint.includes('/scraper')))
    } else if (type === 'reddit') {
      setEndpoints(allEndpoints.filter(e => !e.endpoint.includes('/scraper')))
    } else {
      setEndpoints(allEndpoints)
    }
  }, [type])

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch logs based on type
      const endpoint = type === 'reddit'
        ? '/api/logs/reddit?limit=20'
        : '/api/scraper/logs?limit=20'

      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    if (showLogs) {
      fetchLogs()
      if (autoRefresh) {
        const interval = setInterval(fetchLogs, 5000)
        return () => clearInterval(interval)
      }
    }
  }, [showLogs, autoRefresh, fetchLogs])

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'success':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  if (compact) {
    return (
      <Card className="border-gray-100">
        <CardContent className="p-4">
          {showLogs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 10).map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-400 font-mono min-w-[60px]">
                    {new Date(log.timestamp).toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                  <span className={`${getLogColor(log.level)}`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* API Endpoints */}
      <Card className="border-gray-100">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium text-gray-700">
            API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            {endpoints.map((endpoint, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {endpoint.method}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {endpoint.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    {endpoint.endpoint}
                  </span>
                  {endpoint.status === 'active' && (
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Logs */}
      {showLogs && (
        <Card className="border-gray-100">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">
                Live Logs
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchLogs}
                disabled={loading}
                className="h-6 w-6"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-1.5 max-h-64 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p>No recent logs</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-gray-400 min-w-[60px]">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                    <span className={getLogColor(log.level)}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}