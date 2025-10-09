import { logger } from '@/lib/logger'

/**
 * Performance Monitoring System
 * Comprehensive performance tracking and reporting for the B9 Dashboard
 */

import React, { useEffect, useRef, useCallback } from 'react'

interface PerformanceMark {
  name: string
  timestamp: number
  metadata?: Record<string, unknown>
}

interface PerformanceMeasure {
  name: string
  duration: number
  startMark: string
  endMark: string
  metadata?: Record<string, unknown>
}

interface PerformanceBudget {
  metric: string
  threshold: number
  warningThreshold?: number
}

export class PerformanceMonitor {
  private marks = new Map<string, PerformanceMark>()
  private measures = new Map<string, PerformanceMeasure[]>()
  private budgets = new Map<string, PerformanceBudget>()
  private observers = new Set<(data: unknown) => void>()
  private navigationStart = performance.now()

  // Core Web Vitals
  private metrics = {
    FCP: null as number | null,  // First Contentful Paint
    LCP: null as number | null,  // Largest Contentful Paint
    FID: null as number | null,  // First Input Delay
    CLS: null as number | null,  // Cumulative Layout Shift
    TTFB: null as number | null, // Time to First Byte
    TTI: null as number | null,  // Time to Interactive
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Observe Core Web Vitals
    try {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number }
        this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime || 0
        if (this.metrics.LCP !== null) {
          this.checkBudget('LCP', this.metrics.LCP)
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // FCP Observer
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint')
        if (fcpEntry) {
          this.metrics.FCP = fcpEntry.startTime
          if (this.metrics.FCP !== null) {
            this.checkBudget('FCP', this.metrics.FCP)
          }
        }
      })
      fcpObserver.observe({ entryTypes: ['paint'] })

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const firstInput = entries[0] as PerformanceEntry & { processingStart?: number }
        if (firstInput && firstInput.processingStart !== undefined) {
          this.metrics.FID = firstInput.processingStart - firstInput.startTime
          if (this.metrics.FID !== null) {
            this.checkBudget('FID', this.metrics.FID)
          }
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // CLS Observer
      let clsValue = 0
      const clsEntries: PerformanceEntry[] = []
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!entry.hadRecentInput) {
            clsEntries.push(entry)
            clsValue += entry.value || 0
          }
        }
        this.metrics.CLS = clsValue
        if (this.metrics.CLS !== null) {
          this.checkBudget('CLS', this.metrics.CLS)
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // Navigation timing
      if (performance.timing) {
        this.metrics.TTFB = performance.timing.responseStart - performance.timing.requestStart
        if (this.metrics.TTFB !== null) {
          this.checkBudget('TTFB', this.metrics.TTFB)
        }
      }
    } catch (error) {
      logger.warn('Performance observers not fully supported:', error)
    }
  }

  // Mark a point in time
  mark(name: string, metadata?: Record<string, unknown>) {
    const timestamp = performance.now()
    this.marks.set(name, { name, timestamp, metadata })
    
    if (typeof window !== 'undefined' && window.performance?.mark) {
      window.performance.mark(name)
    }
  }

  // Measure between two marks
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    const end = endMark ? this.marks.get(endMark) : { timestamp: performance.now(), metadata: {} as Record<string, unknown> | undefined }

    if (!start || !end) {
      logger.warn(`Cannot measure: missing marks (${startMark}, ${endMark})`)
      return null
    }

    const duration = end.timestamp - start.timestamp
    const measure: PerformanceMeasure = {
      name,
      duration,
      startMark,
      endMark: endMark || 'now',
      metadata: { ...start.metadata, ...end.metadata }
    }

    if (!this.measures.has(name)) {
      this.measures.set(name, [])
    }
    this.measures.get(name)!.push(measure)

    // Check budget
    this.checkBudget(name, duration)

    // Use native performance API if available
    if (typeof window !== 'undefined' && window.performance?.measure) {
      try {
        window.performance.measure(name, startMark, endMark)
      } catch (_e) {
        // Marks may not exist in native API
      }
    }

    return measure
  }

  // Set performance budget
  setBudget(metric: string, threshold: number, warningThreshold?: number) {
    this.budgets.set(metric, { metric, threshold, warningThreshold })
  }

  // Check if metric exceeds budget
  private checkBudget(metric: string, value: number) {
    const budget = this.budgets.get(metric)
    if (!budget) return

    // CLS is a unitless score, not milliseconds
    const unit = metric === 'CLS' ? '' : 'ms'
    const valueDisplay = metric === 'CLS' ? value.toFixed(4) : value

    if (value > budget.threshold) {
      logger.error(`⚠️ Performance budget exceeded: ${metric} = ${valueDisplay}${unit} (threshold: ${budget.threshold}${unit})`)
      this.notifyObservers({
        type: 'budget-exceeded',
        metric,
        value,
        threshold: budget.threshold
      })
    } else if (budget.warningThreshold && value > budget.warningThreshold) {
      logger.warn(`⚡ Performance warning: ${metric} = ${valueDisplay}${unit} (warning: ${budget.warningThreshold}${unit})`)
      this.notifyObservers({
        type: 'budget-warning',
        metric,
        value,
        threshold: budget.warningThreshold
      })
    }
  }

  // Get all metrics
  getMetrics() {
    return {
      ...this.metrics,
      marks: Array.from(this.marks.values()),
      measures: Array.from(this.measures.entries()).map(([name, measures]) => ({
        name,
        measures,
        average: measures.reduce((sum, m) => sum + m.duration, 0) / measures.length,
        min: Math.min(...measures.map(m => m.duration)),
        max: Math.max(...measures.map(m => m.duration))
      }))
    }
  }

  // Subscribe to performance events
  subscribe(callback: (data: unknown) => void) {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  private notifyObservers(data: unknown) {
    this.observers.forEach(callback => callback(data))
  }

  // Clear all marks and measures
  clear() {
    this.marks.clear()
    this.measures.clear()
    
    if (typeof window !== 'undefined' && window.performance?.clearMarks) {
      window.performance.clearMarks()
      window.performance.clearMeasures()
    }
  }

  // Log performance summary
  logSummary() {
    const metrics = this.getMetrics()
    
    // Core Web Vitals
    logger.log(`FCP: ${metrics.FCP?.toFixed(2)}ms`)
    logger.log(`LCP: ${metrics.LCP?.toFixed(2)}ms`)
    logger.log(`FID: ${metrics.FID?.toFixed(2)}ms`)
    logger.log(`CLS: ${metrics.CLS?.toFixed(4)}`)
    logger.log(`TTFB: ${metrics.TTFB?.toFixed(2)}ms`)

    // Custom Measures
    if (metrics.measures.length > 0) {
      metrics.measures.forEach(({ name, average, min, max, measures }) => {
        logger.log(`${name}: avg=${average.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, samples=${measures.length}`)
      })
    }

  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Set default budgets (milliseconds)
performanceMonitor.setBudget('FCP', 1800, 1000)  // First Contentful Paint
performanceMonitor.setBudget('LCP', 2500, 1500)  // Largest Contentful Paint
performanceMonitor.setBudget('FID', 100, 50)     // First Input Delay
performanceMonitor.setBudget('CLS', 0.5, 0.25)   // Cumulative Layout Shift (relaxed for internal tool)
performanceMonitor.setBudget('TTFB', 800, 400)   // Time to First Byte

// Custom metrics budgets
performanceMonitor.setBudget('api-response', 200, 100)
performanceMonitor.setBudget('data-processing', 500, 300)
performanceMonitor.setBudget('table-render', 100, 50)
performanceMonitor.setBudget('filter-apply', 50, 25)

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  const mountTime = useRef<number | undefined>(undefined)
  const renderCount = useRef(0)

  useEffect(() => {
    // Component mount
    mountTime.current = performance.now()
    performanceMonitor.mark(`${componentName}-mount`)

    return () => {
      // Component unmount
      if (mountTime.current) {
        const lifetime = performance.now() - mountTime.current
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally capturing ref value at cleanup time
        const finalRenderCount = renderCount.current
        performanceMonitor.mark(`${componentName}-unmount`)
        performanceMonitor.measure(`${componentName}-lifetime`, `${componentName}-mount`, `${componentName}-unmount`)

        if (lifetime > 30000) { // Log if component lived > 30s
          logger.log(`Component ${componentName} lifetime: ${(lifetime / 1000).toFixed(2)}s, renders: ${finalRenderCount}`)
        }
      }
    }
  }, [componentName])

  // Track renders
  useEffect(() => {
    renderCount.current++
  })

  // Mark function for specific operations
  const mark = useCallback((operation: string) => {
    performanceMonitor.mark(`${componentName}-${operation}`)
  }, [componentName])

  // Measure function for specific operations
  const measure = useCallback((operation: string, startMark: string) => {
    return performanceMonitor.measure(
      `${componentName}-${operation}`,
      startMark,
      undefined
    )
  }, [componentName])

  // Measure async operation
  const measureAsync = useCallback(async <T,>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const startMark = `${componentName}-${operation}-start`
    performanceMonitor.mark(startMark)
    
    try {
      const result = await asyncFn()
      performanceMonitor.measure(`${componentName}-${operation}`, startMark)
      return result
    } catch (error) {
      performanceMonitor.measure(`${componentName}-${operation}-error`, startMark)
      throw error
    }
  }, [componentName])

  return {
    mark,
    measure,
    measureAsync,
    renderCount: renderCount.current
  }
}

/**
 * HOC for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    usePerformanceMonitor(componentName)
    return <Component {...props} />
  }
}

/**
 * Utility to report performance to analytics
 */
export function reportPerformance() {
  const metrics = performanceMonitor.getMetrics()
  
  // You can send this to your analytics service
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    coreWebVitals: {
      FCP: metrics.FCP,
      LCP: metrics.LCP,
      FID: metrics.FID,
      CLS: metrics.CLS,
      TTFB: metrics.TTFB
    },
    customMetrics: metrics.measures.map(m => ({
      name: m.name,
      average: m.average,
      samples: m.measures.length
    }))
  }

  // Log locally for now
  logger.table(report)
  
  // TODO: Send to analytics endpoint
  // fetch('/api/analytics/performance', { method: 'POST', body: JSON.stringify(report) })
  
  return report
}