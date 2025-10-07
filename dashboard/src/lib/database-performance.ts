import { logger } from '@/lib/logger'

/**

 * Database Performance Optimization System
 * Implements connection pooling, query caching, and performance monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { performanceMonitor } from '@/lib/performance-monitor'

interface CacheEntry {
  data: unknown
  timestamp: number
  ttl: number
}

interface QueryMetrics {
  query: string
  duration: number
  rowCount: number
  cached: boolean
  timestamp: number
}

interface PoolConfig {
  minConnections: number
  maxConnections: number
  idleTimeout: number
  acquireTimeout: number
}

/**
 * Connection Pool Manager
 * Manages a pool of Supabase client connections for optimal performance
 */
export class ConnectionPool {
  private pool: SupabaseClient[] = []
  private activeConnections = new Set<SupabaseClient>()
  private waitQueue: Array<(client: SupabaseClient) => void> = []
  private config: PoolConfig
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    queuedRequests: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  constructor(
    private url: string,
    private anonKey: string,
    config: Partial<PoolConfig> = {}
  ) {
    this.config = {
      minConnections: config.minConnections || 2,
      maxConnections: config.maxConnections || 10,
      idleTimeout: config.idleTimeout || 30000,
      acquireTimeout: config.acquireTimeout || 5000
    }

    // Initialize minimum connections
    this.initializePool()
  }

  private initializePool() {
    for (let i = 0; i < this.config.minConnections; i++) {
      this.createConnection()
    }
  }

  private createConnection(): SupabaseClient {
    const client = createClient(this.url, this.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })

    this.pool.push(client)
    this.metrics.totalConnections++
    return client
  }

  async acquire(): Promise<SupabaseClient> {
    this.metrics.totalRequests++

    // Try to get an idle connection
    const idleClient = this.pool.find(c => !this.activeConnections.has(c))
    if (idleClient) {
      this.activeConnections.add(idleClient)
      this.metrics.activeConnections = this.activeConnections.size
      return idleClient
    }

    // Create new connection if under limit
    if (this.pool.length < this.config.maxConnections) {
      const newClient = this.createConnection()
      this.activeConnections.add(newClient)
      this.metrics.activeConnections = this.activeConnections.size
      return newClient
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      this.metrics.queuedRequests++
      const timeout = setTimeout(() => {
        const index = this.waitQueue.indexOf(resolve)
        if (index !== -1) {
          this.waitQueue.splice(index, 1)
          this.metrics.queuedRequests--
          reject(new Error('Connection acquire timeout'))
        }
      }, this.config.acquireTimeout)

      const wrappedResolve = (client: SupabaseClient) => {
        clearTimeout(timeout)
        this.metrics.queuedRequests--
        resolve(client)
      }

      this.waitQueue.push(wrappedResolve)
    })
  }

  release(client: SupabaseClient) {
    this.activeConnections.delete(client)
    this.metrics.activeConnections = this.activeConnections.size

    // Give connection to waiting request
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()
      if (resolve) {
        this.activeConnections.add(client)
        this.metrics.activeConnections = this.activeConnections.size
        resolve(client)
      }
    }

    // Remove excess idle connections
    if (this.pool.length > this.config.minConnections && 
        this.activeConnections.size < this.config.minConnections) {
      const index = this.pool.indexOf(client)
      if (index !== -1 && !this.activeConnections.has(client)) {
        this.pool.splice(index, 1)
        this.metrics.totalConnections--
      }
    }
  }

  getMetrics() {
    return { ...this.metrics }
  }

  async drain() {
    // Wait for all active connections to be released
    while (this.activeConnections.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Clear the pool
    this.pool = []
    this.metrics.totalConnections = 0
  }
}

/**
 * Query Cache Manager
 * Implements intelligent caching for database queries
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry>()
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  }
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 60000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000)
  }

  private getCacheKey(query: string, params?: Record<string, unknown>): string {
    return `${query}::${JSON.stringify(params || {})}`
  }

  get(query: string, params?: Record<string, unknown>): unknown | null {
    const key = this.getCacheKey(query, params)
    const cached = this.cache.get(key)

    if (!cached) {
      this.metrics.misses++
      return null
    }

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key)
      this.metrics.evictions++
      this.metrics.size = this.cache.size
      this.metrics.misses++
      return null
    }

    this.metrics.hits++
    return cached.data
  }

  set(query: string, params: Record<string, unknown> | undefined, data: unknown, ttl?: number) {
    const key = this.getCacheKey(query, params)

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
        this.metrics.evictions++
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
    this.metrics.size = this.cache.size
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      const size = this.cache.size
      this.cache.clear()
      this.metrics.evictions += size
      this.metrics.size = 0
      return
    }

    // Invalidate matching patterns
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.metrics.evictions++
    })
    this.metrics.size = this.cache.size
  }

  private cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, value] of this.cache.entries()) {
      if (now > value.timestamp + value.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.metrics.evictions++
    })
    this.metrics.size = this.cache.size
  }

  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100)
    }
  }
}

/**
 * Query Performance Monitor
 * Tracks and analyzes database query performance
 */
export class QueryPerformanceMonitor {
  private queries: QueryMetrics[] = []
  private slowQueries: QueryMetrics[] = []
  private slowQueryThreshold: number
  private maxStoredQueries: number

  constructor(
    slowQueryThreshold = 1000, // 1 second
    maxStoredQueries = 1000
  ) {
    this.slowQueryThreshold = slowQueryThreshold
    this.maxStoredQueries = maxStoredQueries
  }

  recordQuery(
    query: string,
    duration: number,
    rowCount: number,
    cached = false
  ) {
    const metrics: QueryMetrics = {
      query,
      duration,
      rowCount,
      cached,
      timestamp: Date.now()
    }

    // Add to queries list
    this.queries.push(metrics)
    if (this.queries.length > this.maxStoredQueries) {
      this.queries.shift()
    }

    // Track slow queries
    if (duration > this.slowQueryThreshold && !cached) {
      this.slowQueries.push(metrics)
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift()
      }

      // Log slow query warning
      logger.warn(`⚠️ Slow query detected (${duration}ms):`, {
        query: query.substring(0, 100),
        duration,
        rowCount
      })

      // Report to performance monitor
      performanceMonitor.mark('slow-query', {
        query: query.substring(0, 100),
        duration,
        rowCount
      })
    }

    // Report to performance monitor
    performanceMonitor.measure('database-query', `query-start-${Date.now()}`)
  }

  getStatistics() {
    if (this.queries.length === 0) {
      return null
    }

    const durations = this.queries.map(q => q.duration)
    const sorted = [...durations].sort((a, b) => a - b)
    const sum = durations.reduce((a, b) => a + b, 0)
    const cached = this.queries.filter(q => q.cached).length

    return {
      totalQueries: this.queries.length,
      cachedQueries: cached,
      cacheRate: Math.round((cached / this.queries.length) * 100),
      avgDuration: Math.round(sum / this.queries.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: sorted[Math.floor(sorted.length * 0.5)],
      p95Duration: sorted[Math.floor(sorted.length * 0.95)],
      p99Duration: sorted[Math.floor(sorted.length * 0.99)],
      slowQueries: this.slowQueries.length,
      recentSlowQueries: this.slowQueries.slice(-10)
    }
  }

  getSlowQueries() {
    return [...this.slowQueries]
  }

  clear() {
    this.queries = []
    this.slowQueries = []
  }
}

/**
 * Optimized Database Client
 * Combines connection pooling, caching, and monitoring
 */
export class OptimizedDatabaseClient {
  private pool: ConnectionPool
  private cache: QueryCache
  private monitor: QueryPerformanceMonitor
  private config: {
    cacheEnabled: boolean
    monitoringEnabled: boolean
    logSlowQueries: boolean
  }

  constructor(
    url: string,
    anonKey: string,
    config: Partial<{
      cacheEnabled: boolean
      monitoringEnabled: boolean
      logSlowQueries: boolean
      poolConfig: Partial<PoolConfig>
      cacheSize: number
      cacheTTL: number
      slowQueryThreshold: number
    }> = {}
  ) {
    this.pool = new ConnectionPool(url, anonKey, config.poolConfig)
    this.cache = new QueryCache(config.cacheSize, config.cacheTTL)
    this.monitor = new QueryPerformanceMonitor(config.slowQueryThreshold)
    
    this.config = {
      cacheEnabled: config.cacheEnabled ?? true,
      monitoringEnabled: config.monitoringEnabled ?? true,
      logSlowQueries: config.logSlowQueries ?? true
    }
  }

  async query<T = unknown>(
    tableName: string,
    queryBuilder: (client: SupabaseClient) => Promise<unknown>,
    options: {
      cache?: boolean
      cacheTTL?: number
      cacheKey?: string
    } = {}
  ): Promise<T> {
    const startTime = performance.now()
    const cacheEnabled = this.config.cacheEnabled && (options.cache ?? true)
    const cacheKey = options.cacheKey || tableName

    // Check cache first
    if (cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached !== null) {
        if (this.config.monitoringEnabled) {
          this.monitor.recordQuery(
            `CACHED: ${tableName}`,
            performance.now() - startTime,
            Array.isArray(cached) ? cached.length : 1,
            true
          )
        }
        return cached as T
      }
    }

    // Acquire connection from pool
    const client = await this.pool.acquire()

    try {
      // Execute query
      const result = await queryBuilder(client) as { data: T | null; error: unknown }
      const duration = performance.now() - startTime

      // Record metrics
      if (this.config.monitoringEnabled) {
        const rowCount = result.data ?
          (Array.isArray(result.data) ? result.data.length : 1) : 0
        this.monitor.recordQuery(tableName, duration, rowCount, false)
      }

      // Cache result if enabled
      if (cacheEnabled && result.data) {
        this.cache.set(cacheKey, undefined, result.data, options.cacheTTL)
      }

      return result.data as T
    } finally {
      // Always release connection back to pool
      this.pool.release(client)
    }
  }

  async invalidateCache(pattern?: string) {
    this.cache.invalidate(pattern)
  }

  getMetrics() {
    return {
      pool: this.pool.getMetrics(),
      cache: this.cache.getMetrics(),
      queries: this.monitor.getStatistics()
    }
  }

  async close() {
    await this.pool.drain()
    this.cache.invalidate()
    this.monitor.clear()
  }
}

// Singleton instance
let optimizedClient: OptimizedDatabaseClient | null = null

export function getOptimizedDatabaseClient(): OptimizedDatabaseClient {
  if (!optimizedClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    optimizedClient = new OptimizedDatabaseClient(url, key, {
      cacheEnabled: true,
      monitoringEnabled: process.env.NODE_ENV === 'development',
      logSlowQueries: true,
      poolConfig: {
        minConnections: 2,
        maxConnections: 10,
        idleTimeout: 30000,
        acquireTimeout: 5000
      },
      cacheSize: 100,
      cacheTTL: 60000, // 1 minute
      slowQueryThreshold: 1000 // 1 second
    })
  }

  return optimizedClient
}

/**
 * React hook for optimized database queries
 */
import { useEffect, useState, useCallback } from 'react'

export function useOptimizedQuery<T = unknown>(
  tableName: string,
  queryBuilder: (client: SupabaseClient) => Promise<unknown>,
  dependencies: unknown[] = [],
  options: {
    enabled?: boolean
    cache?: boolean
    cacheTTL?: number
    refetchInterval?: number
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    const client = getOptimizedDatabaseClient()

    try {
      setLoading(true)
      setError(null)

      const result = await client.query<T>(
        tableName,
        queryBuilder,
        {
          cache: options.cache,
          cacheTTL: options.cacheTTL
        }
      )

      setData(result)
    } catch (err) {
      setError(err as Error)
      logger.error('Query error:', err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, queryBuilder, options.cache, options.cacheTTL, ...dependencies])

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData()

      // Set up refetch interval if specified
      if (options.refetchInterval) {
        const interval = setInterval(fetchData, options.refetchInterval)
        return () => clearInterval(interval)
      }
    }
  }, [fetchData, options.enabled, options.refetchInterval])

  const refetch = useCallback(() => {
    const client = getOptimizedDatabaseClient()
    client.invalidateCache(tableName)
    return fetchData()
  }, [tableName, fetchData])

  return { data, loading, error, refetch }
}

/**
 * Batch query optimizer
 * Combines multiple queries into efficient batches
 */
export class BatchQueryOptimizer {
  private queue: Map<string, {
    resolve: (data: unknown) => void
    reject: (error: Error) => void
    query: () => Promise<unknown>
  }[]> = new Map()
  private flushTimeout: NodeJS.Timeout | null = null
  private batchDelay: number
  private maxBatchSize: number

  constructor(batchDelay = 10, maxBatchSize = 50) {
    this.batchDelay = batchDelay
    this.maxBatchSize = maxBatchSize
  }

  async add<T>(key: string, query: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(key)) {
        this.queue.set(key, [])
      }
      
      const queries = this.queue.get(key)!
      queries.push({
        resolve: resolve as (data: unknown) => void,
        reject,
        query: query as () => Promise<unknown>
      })

      // Flush if batch is full
      if (queries.length >= this.maxBatchSize) {
        this.flush(key)
      } else {
        // Schedule flush
        if (!this.flushTimeout) {
          this.flushTimeout = setTimeout(() => this.flushAll(), this.batchDelay)
        }
      }
    })
  }

  private async flush(key: string) {
    const queries = this.queue.get(key)
    if (!queries || queries.length === 0) return

    this.queue.delete(key)

    try {
      // Execute first query (they should all be the same)
      const result = await queries[0].query()
      
      // Resolve all waiting promises
      queries.forEach(({ resolve }) => resolve(result))
    } catch (error) {
      // Reject all waiting promises
      queries.forEach(({ reject }) => reject(error as Error))
    }
  }

  private flushAll() {
    this.flushTimeout = null
    const keys = Array.from(this.queue.keys())
    keys.forEach(key => this.flush(key))
  }
}