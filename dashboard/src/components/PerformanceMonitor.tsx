'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

// Core Web Vitals monitoring
export function PerformanceMonitor() {
  useEffect(() => {
    type WebVitalMetric = {
      name: 'LCP' | 'FCP' | 'CLS'
      value: number
      rating: 'good' | 'needs-improvement' | 'poor'
    }

    const reportWebVitals = (metric: WebVitalMetric) => {
      // Only in production
      if (process.env.NODE_ENV === 'production') {
        logger.log('Web Vital:', metric)
        
        // Send to analytics service if available
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: metric.name,
            value: Math.round(metric.value),
            custom_map: {
              metric_name: metric.name,
              metric_value: metric.value,
              metric_rating: metric.rating,
            }
          })
        }
      }
    }

    // Use native Performance APIs instead of web-vitals package
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Get supported entry types to avoid errors
      const supportedTypes = PerformanceObserver.supportedEntryTypes || []
      
      try {
        // Observe LCP (Largest Contentful Paint)
        if (supportedTypes.includes('largest-contentful-paint')) {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            reportWebVitals({
              name: 'LCP',
              value: lastEntry.startTime,
              rating: lastEntry.startTime < 2500 ? 'good' : 'needs-improvement'
            })
          })
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        }

        // Observe FCP (First Contentful Paint)
        if (supportedTypes.includes('first-contentful-paint')) {
          const fcpObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              reportWebVitals({
                name: 'FCP',
                value: entry.startTime,
                rating: entry.startTime < 1800 ? 'good' : 'needs-improvement'
              })
            })
          })
          fcpObserver.observe({ entryTypes: ['first-contentful-paint'] })
        }

        // Observe CLS (Cumulative Layout Shift) - basic implementation
        if (supportedTypes.includes('layout-shift')) {
          let cumulativeLayoutShift = 0
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput?: boolean }>
            entries.forEach((entry) => {
              if (!(entry as { hadRecentInput?: boolean }).hadRecentInput) {
                cumulativeLayoutShift += (entry as { value: number }).value
                reportWebVitals({
                  name: 'CLS',
                  value: cumulativeLayoutShift,
                  rating: cumulativeLayoutShift < 0.1 ? 'good' : 'needs-improvement'
                })
              }
            })
          })
          clsObserver.observe({ entryTypes: ['layout-shift'] })
        }
        
      } catch (error) {
        logger.warn('Performance Observer setup failed:', error)
      }
    }
  }, [])

  // Performance observer for additional metrics
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const supportedTypes = PerformanceObserver.supportedEntryTypes || []
      const observers: PerformanceObserver[] = []
      
      try {
        // Monitor long tasks
        if (supportedTypes.includes('longtask')) {
          const longTaskObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.duration > 50) {
                logger.warn('Long Task detected:', entry.duration + 'ms')
              }
            })
          })
          longTaskObserver.observe({ entryTypes: ['longtask'] })
          observers.push(longTaskObserver)
        }

        // Monitor navigation timing
        if (supportedTypes.includes('navigation')) {
          const navigationObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries() as PerformanceNavigationTiming[]
            entries.forEach((entry) => {
              logger.log('Navigation:', {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                ttfb: entry.responseStart - entry.requestStart,
              })
            })
          })
          navigationObserver.observe({ entryTypes: ['navigation'] })
          observers.push(navigationObserver)
        }

        return () => {
          observers.forEach(observer => observer.disconnect())
        }
      } catch (e) {
        logger.warn('Additional Performance Observers not supported:', e)
      }
    }
  }, [])

  return null
}