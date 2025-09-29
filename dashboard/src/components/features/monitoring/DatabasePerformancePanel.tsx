'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Activity
} from 'lucide-react'

interface DatabaseMetrics {
  pool: {
    activeConnections: number
    totalConnections: number
    queuedRequests: number
    totalRequests: number
  }
  performance: {
    averageResponseTime: number
    cacheHitRate: number
    slowQueries: number
  }
  optimization: {
    cacheSize: number
    maxCacheSize: number
    optimizations: number
  }
}

export function DatabasePerformancePanel() {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchMetrics = () => {
      // Simulate fetching metrics - replace with actual API call
      setMetrics({
        pool: {
          activeConnections: Math.floor(Math.random() * 10) + 1,
          totalConnections: 10,
          queuedRequests: Math.floor(Math.random() * 3),
          totalRequests: Math.floor(Math.random() * 10000) + 1000
        },
        performance: {
          averageResponseTime: Math.floor(Math.random() * 200) + 50,
          cacheHitRate: Math.floor(Math.random() * 30) + 70,
          slowQueries: Math.floor(Math.random() * 5)
        },
        optimization: {
          cacheSize: Math.floor(Math.random() * 500) + 100,
          maxCacheSize: 1000,
          optimizations: Math.floor(Math.random() * 10)
        }
      })
    }

    fetchMetrics()

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh - replace with actual API call
    setMetrics({
      pool: {
        activeConnections: Math.floor(Math.random() * 10) + 1,
        totalConnections: 10,
        queuedRequests: Math.floor(Math.random() * 3),
        totalRequests: Math.floor(Math.random() * 10000) + 1000
      },
      performance: {
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        cacheHitRate: Math.floor(Math.random() * 30) + 70,
        slowQueries: Math.floor(Math.random() * 5)
      },
      optimization: {
        cacheSize: Math.floor(Math.random() * 500) + 100,
        maxCacheSize: 1000,
        optimizations: Math.floor(Math.random() * 10)
      }
    })
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleClearCache = () => {
    // Simulate cache clear - replace with actual API call
    handleRefresh()
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Database Performance</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && "bg-green-50")}
          >
            <Activity className="h-3 w-3 mr-1" />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Connection Pool */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Connection Pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Active Connections</p>
              <p className="text-lg font-semibold">
                {metrics.pool.activeConnections} / {metrics.pool.totalConnections}
              </p>
              <Progress 
                value={(metrics.pool.activeConnections / Math.max(metrics.pool.totalConnections, 1)) * 100} 
                className="h-1 mt-1"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500">Queue</p>
              <p className="text-lg font-semibold">{metrics.pool.queuedRequests}</p>
              {metrics.pool.queuedRequests > 0 && (
                <Badge variant="destructive" className="mt-1">
                  Backpressure
                </Badge>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Total Requests: {metrics.pool.totalRequests.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Query Cache */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Query Cache
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Hit Rate</p>
              <p className="text-lg font-semibold">{metrics.performance.cacheHitRate}%</p>
              <Progress value={metrics.performance.cacheHitRate} className="h-1 mt-1" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Size</p>
              <p className="text-lg font-semibold">{metrics.optimization.cacheSize}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Max Size</p>
              <p className="text-lg font-semibold">{metrics.optimization.maxCacheSize}</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Optimizations: {metrics.optimization.optimizations}</span>
          </div>
        </CardContent>
      </Card>

      {/* Query Performance */}
      {metrics.performance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Query Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Avg Response</p>
                <p className="text-lg font-semibold">{metrics.performance.averageResponseTime}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cache Hit Rate</p>
                <p className="text-lg font-semibold">{metrics.performance.cacheHitRate}%</p>
              </div>
            </div>

            {metrics.performance.slowQueries > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {metrics.performance.slowQueries} Slow Queries
                  </span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Slow queries detected: {metrics.performance.slowQueries}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Efficiency</p>
              <p className="text-sm font-semibold">
                {metrics.performance.cacheHitRate > 70 ? '🟢' : metrics.performance.cacheHitRate > 40 ? '🟡' : '🔴'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pool Health</p>
              <p className="text-sm font-semibold">
                {metrics.pool.queuedRequests === 0 ? '🟢' : metrics.pool.queuedRequests < 5 ? '🟡' : '🔴'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Query Speed</p>
              <p className="text-sm font-semibold">
                {metrics.performance?.averageResponseTime < 100 ? '🟢' : metrics.performance?.averageResponseTime < 500 ? '🟡' : '🔴'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Overall</p>
              <p className="text-sm font-semibold">
                {getOverallHealth(metrics)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getOverallHealth(metrics: DatabaseMetrics): string {
  let score = 0
  let total = 0

  // Cache performance (0-40 points)
  if (metrics.performance) {
    score += Math.min(40, metrics.performance.cacheHitRate * 0.4)
    total += 40
  }

  // Pool health (0-30 points)
  if (metrics.pool) {
    const poolScore = metrics.pool.queuedRequests === 0 ? 30 :
                      metrics.pool.queuedRequests < 5 ? 20 : 10
    score += poolScore
    total += 30
  }

  // Query performance (0-30 points)
  if (metrics.performance) {
    const queryScore = metrics.performance.averageResponseTime < 100 ? 30 :
                       metrics.performance.averageResponseTime < 500 ? 20 : 10
    score += queryScore
    total += 30
  }

  const percentage = total > 0 ? (score / total) * 100 : 0
  
  if (percentage >= 80) return '🟢 Excellent'
  if (percentage >= 60) return '🟡 Good'
  if (percentage >= 40) return '🟠 Fair'
  return '🔴 Poor'
}

/**
 * Compact database metrics display for development toolbar
 */
export function DatabaseMetricsBadge() {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null)

  useEffect(() => {
    const fetchMetrics = () => {
      // Simulate fetching metrics - replace with actual API call
      setMetrics({
        pool: {
          activeConnections: Math.floor(Math.random() * 10) + 1,
          totalConnections: 10,
          queuedRequests: Math.floor(Math.random() * 3),
          totalRequests: Math.floor(Math.random() * 10000) + 1000
        },
        performance: {
          averageResponseTime: Math.floor(Math.random() * 200) + 50,
          cacheHitRate: Math.floor(Math.random() * 30) + 70,
          slowQueries: Math.floor(Math.random() * 5)
        },
        optimization: {
          cacheSize: Math.floor(Math.random() * 500) + 100,
          maxCacheSize: 1000,
          optimizations: Math.floor(Math.random() * 10)
        }
      })
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs">
      <Database className="h-3 w-3" />
      <span className="font-medium">DB</span>
      <span className="text-gray-600">
        {metrics.pool?.activeConnections || 0}/{metrics.pool?.totalConnections || 0}
      </span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600">
        {metrics.performance?.cacheHitRate || 0}% hit
      </span>
      {metrics.performance && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">
            {metrics.performance.averageResponseTime}ms
          </span>
        </>
      )}
    </div>
  )
}