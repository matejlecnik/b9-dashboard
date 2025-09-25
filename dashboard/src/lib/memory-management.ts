import type { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
/**

 * Memory Management Utilities
 * Helps track and prevent memory leaks in the application
 */


/**
 * Tracks active subscriptions, timers, and other resources
 * Helps identify memory leaks during development
 */
class MemoryTracker {
  private subscriptions: Map<string, RealtimeChannel> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()
  private cleanupFunctions: Map<string, () => void> = new Map()
  private readonly isDevelopment = process.env.NODE_ENV === 'development'

  // Track a Supabase subscription
  trackSubscription(key: string, channel: RealtimeChannel): void {
    if (this.subscriptions.has(key)) {
      logger.warn(`[MemoryTracker] Subscription '${key}' already exists. Possible memory leak!`)
    }
    this.subscriptions.set(key, channel)
    this.logStatus('subscription', 'added', key)
  }

  // Untrack a Supabase subscription
  untrackSubscription(key: string): void {
    this.subscriptions.delete(key)
    this.logStatus('subscription', 'removed', key)
  }

  // Track a timer
  trackTimer(key: string, timer: NodeJS.Timeout): void {
    if (this.timers.has(key)) {
      logger.warn(`[MemoryTracker] Timer '${key}' already exists. Clearing old timer.`)
      clearTimeout(this.timers.get(key)!)
    }
    this.timers.set(key, timer)
    this.logStatus('timer', 'added', key)
  }

  // Untrack a timer
  untrackTimer(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
      this.logStatus('timer', 'removed', key)
    }
  }

  // Track an interval
  trackInterval(key: string, interval: NodeJS.Timeout): void {
    if (this.intervals.has(key)) {
      logger.warn(`[MemoryTracker] Interval '${key}' already exists. Clearing old interval.`)
      clearInterval(this.intervals.get(key)!)
    }
    this.intervals.set(key, interval)
    this.logStatus('interval', 'added', key)
  }

  // Untrack an interval
  untrackInterval(key: string): void {
    const interval = this.intervals.get(key)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(key)
      this.logStatus('interval', 'removed', key)
    }
  }

  // Track an AbortController
  trackAbortController(key: string, controller: AbortController): void {
    if (this.abortControllers.has(key)) {
      logger.warn(`[MemoryTracker] AbortController '${key}' already exists. Aborting old controller.`)
      this.abortControllers.get(key)!.abort()
    }
    this.abortControllers.set(key, controller)
    this.logStatus('abortController', 'added', key)
  }

  // Untrack an AbortController
  untrackAbortController(key: string): void {
    const controller = this.abortControllers.get(key)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(key)
      this.logStatus('abortController', 'removed', key)
    }
  }

  // Register a cleanup function
  registerCleanup(key: string, cleanup: () => void): void {
    if (this.cleanupFunctions.has(key)) {
      logger.warn(`[MemoryTracker] Cleanup function '${key}' already exists. Running old cleanup.`)
      this.cleanupFunctions.get(key)!()
    }
    this.cleanupFunctions.set(key, cleanup)
    this.logStatus('cleanup', 'added', key)
  }

  // Run a cleanup function and untrack it
  runCleanup(key: string): void {
    const cleanup = this.cleanupFunctions.get(key)
    if (cleanup) {
      try {
        cleanup()
      } catch (error) {
        logger.error(`[MemoryTracker] Error running cleanup '${key}':`, error)
      }
      this.cleanupFunctions.delete(key)
      this.logStatus('cleanup', 'executed', key)
    }
  }

  // Clear all resources for a component
  clearComponent(componentName: string): void {
    logger.log(`[MemoryTracker] Clearing all resources for component: ${componentName}`)

    // Clear subscriptions
    this.subscriptions.forEach((channel, key) => {
      if (key.startsWith(componentName)) {
        this.untrackSubscription(key)
      }
    })

    // Clear timers
    this.timers.forEach((timer, key) => {
      if (key.startsWith(componentName)) {
        this.untrackTimer(key)
      }
    })

    // Clear intervals
    this.intervals.forEach((interval, key) => {
      if (key.startsWith(componentName)) {
        this.untrackInterval(key)
      }
    })

    // Abort controllers
    this.abortControllers.forEach((controller, key) => {
      if (key.startsWith(componentName)) {
        this.untrackAbortController(key)
      }
    })

    // Run cleanup functions
    this.cleanupFunctions.forEach((cleanup, key) => {
      if (key.startsWith(componentName)) {
        this.runCleanup(key)
      }
    })
  }

  // Clear all tracked resources (use with caution!)
  clearAll(): void {
    logger.warn('[MemoryTracker] Clearing ALL tracked resources!')

    // Clear all subscriptions
    this.subscriptions.forEach((_, key) => this.untrackSubscription(key))

    // Clear all timers
    this.timers.forEach((_, key) => this.untrackTimer(key))

    // Clear all intervals
    this.intervals.forEach((_, key) => this.untrackInterval(key))

    // Abort all controllers
    this.abortControllers.forEach((_, key) => this.untrackAbortController(key))

    // Run all cleanup functions
    this.cleanupFunctions.forEach((_, key) => this.runCleanup(key))
  }

  // Get current status
  getStatus(): {
    subscriptions: number
    timers: number
    intervals: number
    abortControllers: number
    cleanupFunctions: number
    total: number
  } {
    const status = {
      subscriptions: this.subscriptions.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
      abortControllers: this.abortControllers.size,
      cleanupFunctions: this.cleanupFunctions.size,
      total: 0
    }
    status.total = status.subscriptions + status.timers + status.intervals +
                   status.abortControllers + status.cleanupFunctions
    return status
  }

  // Log status in development
  private logStatus(type: string, action: string, key: string): void {
    if (this.isDevelopment) {
      const status = this.getStatus()
      logger.log(
        `[MemoryTracker] ${action} ${type}: ${key} | Total resources: ${status.total}`
      )
    }
  }

  // Check for potential memory leaks
  checkForLeaks(): void {
    const status = this.getStatus()

    if (status.total > 50) {
      logger.warn('[MemoryTracker] High resource count detected!', status)
    }

    if (status.subscriptions > 10) {
      logger.warn('[MemoryTracker] Many active subscriptions:', this.subscriptions.keys())
    }

    if (status.timers > 20) {
      logger.warn('[MemoryTracker] Many active timers:', this.timers.keys())
    }

    if (status.intervals > 5) {
      logger.warn('[MemoryTracker] Many active intervals:', this.intervals.keys())
    }
  }
}

// Global memory tracker instance
export const memoryTracker = new MemoryTracker()

// Development-only memory leak detector
if (process.env.NODE_ENV === 'development') {
  // Check for leaks every 30 seconds in development
  setInterval(() => {
    memoryTracker.checkForLeaks()
  }, 30000)

  // Log status on window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const status = memoryTracker.getStatus()
      if (status.total > 0) {
        logger.warn('[MemoryTracker] Resources still active on unload:', status)
      }
    })
  }
}

/**
 * Utility functions for safe timer management
 */

// Create a safe timeout that auto-clears
export function createSafeTimeout(
  callback: () => void,
  delay: number,
  key?: string
): NodeJS.Timeout {
  const timeout = setTimeout(() => {
    if (key) {
      memoryTracker.untrackTimer(key)
    }
    callback()
  }, delay)

  if (key) {
    memoryTracker.trackTimer(key, timeout)
  }

  return timeout
}

// Create a safe interval that auto-tracks
export function createSafeInterval(
  callback: () => void,
  delay: number,
  key?: string
): NodeJS.Timeout {
  const interval = setInterval(callback, delay)

  if (key) {
    memoryTracker.trackInterval(key, interval)
  }

  return interval
}

// Clear a safe timeout
export function clearSafeTimeout(timeout: NodeJS.Timeout, key?: string): void {
  clearTimeout(timeout)
  if (key) {
    memoryTracker.untrackTimer(key)
  }
}

// Clear a safe interval
export function clearSafeInterval(interval: NodeJS.Timeout, key?: string): void {
  clearInterval(interval)
  if (key) {
    memoryTracker.untrackInterval(key)
  }
}

/**
 * Hook utilities for React components
 */

// Create a component-scoped resource tracker
export function createComponentTracker(componentName: string) {
  const prefix = `${componentName}_`
  let resourceCounter = 0

  return {
    trackSubscription: (channel: RealtimeChannel) => {
      const key = `${prefix}sub_${++resourceCounter}`
      memoryTracker.trackSubscription(key, channel)
      return key
    },

    trackTimer: (timer: NodeJS.Timeout) => {
      const key = `${prefix}timer_${++resourceCounter}`
      memoryTracker.trackTimer(key, timer)
      return key
    },

    trackInterval: (interval: NodeJS.Timeout) => {
      const key = `${prefix}interval_${++resourceCounter}`
      memoryTracker.trackInterval(key, interval)
      return key
    },

    trackAbortController: (controller: AbortController) => {
      const key = `${prefix}abort_${++resourceCounter}`
      memoryTracker.trackAbortController(key, controller)
      return key
    },

    registerCleanup: (cleanup: () => void) => {
      const key = `${prefix}cleanup_${++resourceCounter}`
      memoryTracker.registerCleanup(key, cleanup)
      return key
    },

    clearAll: () => {
      memoryTracker.clearComponent(componentName)
    }
  }
}

/**
 * Detect memory leaks by monitoring object growth
 */
export function monitorObjectSize(
  objectName: string,
  getObject: () => unknown,
  threshold = 1000
): void {
  if (process.env.NODE_ENV !== 'development') return

  let previousSize = 0

  setInterval(() => {
    const obj = getObject()
    let size = 0

    if (Array.isArray(obj)) {
      size = obj.length
    } else if (obj && typeof obj === 'object') {
      size = Object.keys(obj).length
    }

    if (size > threshold) {
      logger.warn(
        `[MemoryMonitor] Large object detected: ${objectName} has ${size} items`
      )
    }

    if (size > previousSize * 2 && previousSize > 0) {
      logger.warn(
        `[MemoryMonitor] Rapid growth detected: ${objectName} grew from ${previousSize} to ${size} items`
      )
    }

    previousSize = size
  }, 10000) // Check every 10 seconds
}