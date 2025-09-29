'use client'

import React, { ReactNode, useCallback, Profiler } from 'react'
import type { ProfilerOnRenderCallback } from 'react'
import { logger } from '@/lib/logger'

/**
 * React DevTools Profiler Integration
 * Provides automatic performance profiling for React components
 */

// Mock performanceMonitor for now
const performanceMonitor = {
  mark: (name: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      logger.log(`Performance mark: ${name}`, data)
    }
  },
  getMetrics: () => ({
    FCP: null as number | null,
    LCP: null as number | null,
    FID: null as number | null,
    CLS: null as number | null,
    TTFB: null as number | null,
    measures: [] as Array<{ name: string; duration: number; startTime: number }>
  }),
  logSummary: () => {
    logger.log('Performance summary')
  },
  clear: () => {
    logger.log('Performance data cleared')
  }
}


interface ProfilerData {
  id: string
  phase: 'mount' | 'update' | 'nested-update'
  actualDuration: number
  baseDuration: number
  startTime: number
  commitTime: number
  interactions: Set<unknown>
}

interface PerformanceProfilerProps {
  id: string
  children: ReactNode
  onRender?: (data: ProfilerData) => void
  threshold?: number // Log if render takes longer than threshold (ms)
}

export function PerformanceProfiler({
  id,
  children,
  onRender,
  threshold = 16 // 16ms = 60fps
}: PerformanceProfilerProps) {
  const handleRender = useCallback<ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      const data: ProfilerData = {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        interactions: new Set()
      }

      // Mark the render
      performanceMonitor.mark(`${id}-render-${phase}`, {
        actualDuration,
        baseDuration,
        phase
      })

      // Log slow renders
      if (actualDuration > threshold) {
        logger.warn(
          `⚠️ Slow render detected in ${id}:`,
          `${actualDuration.toFixed(2)}ms (${phase})`,
          `threshold: ${threshold}ms`
        )
      }

      // Call custom handler
      onRender?.(data)

      // In development, log detailed info for very slow renders
      if (process.env.NODE_ENV === 'development' && actualDuration > threshold * 2) {
        logger.log(`Phase: ${phase}`)
        logger.log(`Actual duration: ${actualDuration.toFixed(2)}ms`)
        logger.log(`Base duration: ${baseDuration.toFixed(2)}ms`)
        logger.log(`Start time: ${startTime.toFixed(2)}ms`)
        logger.log(`Commit time: ${commitTime.toFixed(2)}ms`)
      }
    },
    [threshold, onRender]
  )

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  )
}

/**
 * HOC for adding profiling to any component
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  id: string,
  threshold?: number
) {
  return function ProfiledComponent(props: P) {
    return (
      <PerformanceProfiler id={id} threshold={threshold}>
        <Component {...props} />
      </PerformanceProfiler>
    )
  }
}

/**
 * Hook for manual profiling
 */
export function useProfiler(componentId: string) {
  const renderCount = React.useRef(0)
  const renderTimes = React.useRef<number[]>([])
  const lastRenderTime = React.useRef<number>(0)

  React.useEffect(() => {
    const now = performance.now()
    renderCount.current++

    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = now - lastRenderTime.current
      renderTimes.current.push(timeSinceLastRender)

      // Keep only last 100 renders
      if (renderTimes.current.length > 100) {
        renderTimes.current.shift()
      }

      // Log performance for debugging in development
      if (process.env.NODE_ENV === 'development' && timeSinceLastRender > 100) {
        logger.warn(`[${componentId}] Slow render: ${timeSinceLastRender.toFixed(2)}ms`)
      }
    }

    lastRenderTime.current = now
  })

  const getStats = useCallback(() => {
    const times = renderTimes.current
    if (times.length === 0) {
      return null
    }

    const sum = times.reduce((a, b) => a + b, 0)
    const average = sum / times.length
    const sorted = [...times].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      renderCount: renderCount.current,
      average,
      median,
      p95,
      p99,
      min: Math.min(...times),
      max: Math.max(...times)
    }
  }, [])

  return {
    renderCount: renderCount.current,
    getStats
  }
}

/**
 * Component for displaying performance stats in development
 */
interface PerformanceMetrics {
  FCP: number | null
  LCP: number | null
  FID: number | null
  CLS: number | null
  TTFB: number | null
  measures: Array<{ name: string; duration: number; startTime: number }>
}

export function DevPerformancePanel() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null)

  React.useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics())
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        title="Toggle Performance Panel"
      >
        🚀
      </button>

      {/* Performance panel */}
      {isOpen && metrics && (
        <div className="fixed bottom-16 left-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border p-4 w-96 max-h-[600px] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Performance Monitor</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          {/* Core Web Vitals */}
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2">Core Web Vitals</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>FCP:</span>
                <span className={getMetricColor(metrics.FCP, 1800, 1000)}>
                  {metrics.FCP?.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>LCP:</span>
                <span className={getMetricColor(metrics.LCP, 2500, 1500)}>
                  {metrics.LCP?.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>FID:</span>
                <span className={getMetricColor(metrics.FID, 100, 50)}>
                  {metrics.FID?.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span>CLS:</span>
                <span className={getMetricColor(metrics.CLS, 0.1, 0.05)}>
                  {metrics.CLS?.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TTFB:</span>
                <span className={getMetricColor(metrics.TTFB, 800, 400)}>
                  {metrics.TTFB?.toFixed(0)}ms
                </span>
              </div>
            </div>
          </div>

          {/* Custom Measures */}
          {metrics.measures.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Custom Measures</h4>
              <div className="space-y-1 text-xs">
                {metrics.measures.slice(0, 10).map((measure) => (
                  <div key={measure.name} className="flex justify-between">
                    <span className="truncate mr-2">{measure.name}:</span>
                    <span className="font-mono">
                      {measure.duration.toFixed(0)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => performanceMonitor.logSummary()}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Log Summary
            </button>
            <button
              onClick={() => performanceMonitor.clear()}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function getMetricColor(value: number | null, bad: number, good: number): string {
  if (!value) return 'text-gray-400'
  if (value <= good) return 'text-green-600 font-semibold'
  if (value <= bad) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

/**
 * Performance boundary for catching performance issues
 */
export class PerformanceBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Performance Boundary Error:', error, errorInfo)
    performanceMonitor.mark('error-boundary-catch', {
      error: error.message,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="text-red-800 font-semibold">Performance Error</h2>
            <p className="text-red-600 text-sm mt-1">
              A performance-related error occurred. Please refresh the page.
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}