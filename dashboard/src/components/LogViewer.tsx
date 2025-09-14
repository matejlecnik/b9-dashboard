'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  X
} from 'lucide-react'

interface LogEntry {
  id?: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  message: string
  source?: string
}

interface LogViewerProps {
  endpoint?: string
  title?: string
  height?: string
  autoScroll?: boolean
  refreshInterval?: number
}

export function LogViewer({
  endpoint = '/api/scraper/logs',
  title = 'Live Logs',
  height = '400px',
  autoScroll = true,
  refreshInterval = 2000
}: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(autoScroll)

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    if (isPaused) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${endpoint}?lines=200`)
      if (!response.ok) throw new Error('Failed to fetch logs')

      const data = await response.json()

      // Process log entries
      const newLogs: LogEntry[] = (data.logs || []).map((log: unknown, index: number) => {
        const logData = log as Partial<LogEntry> & { message?: string }
        return {
          id: logData.id || `${Date.now()}-${index}`,
          timestamp: logData.timestamp || new Date().toISOString(),
          level: logData.level || 'info',
          message: logData.message || String(log),
          source: logData.source || 'scraper'
        }
      })

      setLogs(newLogs)

      // Auto-scroll to bottom if enabled
      if (shouldAutoScroll.current && scrollAreaRef.current) {
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
          }
        }, 100)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, isPaused])

  // Set up polling
  useEffect(() => {
    fetchLogs() // Initial fetch

    const interval = setInterval(fetchLogs, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchLogs, refreshInterval])

  // Filter logs based on search and level
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filter by search query
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Filter by level
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
        return false
      }

      return true
    })
  }, [logs, searchQuery, selectedLevel])

  // Clear logs
  const handleClear = () => {
    setLogs([])
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

  // Get background color for log level
  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'hover:bg-red-50'
      case 'warning':
        return 'hover:bg-yellow-50'
      case 'success':
        return 'hover:bg-green-50'
      case 'debug':
        return 'hover:bg-gray-50'
      default:
        return 'hover:bg-blue-50'
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
              : 'No logs available'}
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
                  className={`flex items-start gap-2 py-1 px-2 rounded group ${getLogBgColor(log.level)}`}
                >
                  <div className="flex items-center gap-1.5 min-w-fit">
                    {getLogIcon(log.level)}
                    <span className="text-gray-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
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