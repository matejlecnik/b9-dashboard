'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Terminal,
  Zap,
  Brain,
  Users,
  Search,
  Database,
  TrendingUp
} from 'lucide-react'
import { formatNumber } from '@/lib/format'

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
  description: string
  icon: React.ElementType
  color: string
  lastUsed?: string
  callCount?: number
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
      description: 'Start 24/7 continuous scraping',
      icon: Zap,
      color: 'text-green-600',
      status: 'active'
    },
    {
      name: 'Stop Scraper',
      endpoint: '/api/scraper/stop-continuous',
      method: 'POST',
      description: 'Stop continuous scraping',
      icon: Activity,
      color: 'text-red-600',
      status: 'idle'
    },
    {
      name: 'Scraper Status',
      endpoint: '/api/scraper/status-detailed',
      method: 'GET',
      description: 'Get detailed scraper status',
      icon: Activity,
      color: 'text-blue-600',
      status: 'active'
    },
    // Reddit/Categorization endpoints
    {
      name: 'AI Categorization',
      endpoint: '/api/categorization/start',
      method: 'POST',
      description: 'Start AI categorization of subreddits',
      icon: Brain,
      color: 'text-purple-600',
      status: 'idle'
    },
    {
      name: 'Add User',
      endpoint: '/api/reddit/user',
      method: 'POST',
      description: 'Add new Reddit user to track',
      icon: Users,
      color: 'text-indigo-600',
      status: 'idle'
    },
    {
      name: 'Search Subreddits',
      endpoint: '/api/subreddits/search',
      method: 'GET',
      description: 'Search and filter subreddits',
      icon: Search,
      color: 'text-gray-600',
      status: 'active'
    },
    {
      name: 'Get Stats',
      endpoint: '/api/stats',
      method: 'GET',
      description: 'Get system statistics',
      icon: TrendingUp,
      color: 'text-cyan-600',
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
      const res = await fetch('/api/scraper/logs?limit=20')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showLogs) {
      fetchLogs()
      if (autoRefresh) {
        const interval = setInterval(fetchLogs, 5000) // Refresh every 5 seconds
        return () => clearInterval(interval)
      }
    }
  }, [showLogs, autoRefresh, fetchLogs])

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />
      default:
        return <Activity className="h-3 w-3 text-blue-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const colors = {
      active: 'bg-green-100 text-green-700',
      idle: 'bg-gray-100 text-gray-700',
      error: 'bg-red-100 text-red-700'
    }

    return (
      <Badge variant="outline" className={`text-xs ${colors[status as keyof typeof colors]}`}>
        {status}
      </Badge>
    )
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact Endpoints List */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {endpoints.map((endpoint, idx) => {
            const Icon = endpoint.icon
            return (
              <div
                key={idx}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`h-4 w-4 ${endpoint.color}`} />
                  {getStatusBadge(endpoint.status)}
                </div>
                <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                <div className="text-xs text-gray-500 mt-1">{endpoint.method}</div>
              </div>
            )
          })}
        </div>

        {/* Compact Logs */}
        {showLogs && logs.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Recent Activity</div>
            <div className="space-y-1">
              {logs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {getLogIcon(log.level)}
                  <span className="text-gray-600 truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* API Endpoints */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-400" />
              API Endpoints
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {endpoints.filter(e => e.status === 'active').length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {endpoints.map((endpoint, idx) => {
              const Icon = endpoint.icon
              return (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${endpoint.color}`} />
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {endpoint.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {endpoint.description}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(endpoint.status)}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-mono bg-white px-2 py-1 rounded">
                      {endpoint.method}
                    </span>
                    <span className="font-mono truncate">
                      {endpoint.endpoint}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Logs */}
      {showLogs && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-400" />
                Live Logs
              </CardTitle>
              <div className="flex items-center gap-2">
                {loading && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Updating...
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent logs</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex items-start gap-3 ${
                      idx === 0 ? 'animate-slide-in' : ''
                    }`}
                  >
                    {getLogIcon(log.level)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getLogColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{log.message}</div>
                      {log.context && Object.keys(log.context).length > 0 && (
                        <div className="mt-1 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                          {JSON.stringify(log.context, null, 2)}
                        </div>
                      )}
                    </div>
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