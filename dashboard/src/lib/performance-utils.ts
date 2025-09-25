/**
 * Performance utility functions for debouncing, throttling, and request optimization
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void; flush: () => ReturnType<T> | undefined } {
  let timeout: NodeJS.Timeout | null = null
  let lastCallTime: number | null = null
  let lastInvokeTime = 0
  let lastArgs: Parameters<T> | null = null
  let result: ReturnType<T> | undefined

  const { leading = false, trailing = true, maxWait } = options

  const invokeFunc = (time: number) => {
    const args = lastArgs
    lastArgs = null
    lastInvokeTime = time
    // Call without binding `this` to avoid aliasing patterns
    result = func(...(args as Parameters<T>)) as ReturnType<T>
    return result
  }

  const leadingEdge = (time: number) => {
    lastInvokeTime = time
    timeout = setTimeout(timerExpired, wait)
    return leading ? invokeFunc(time) : result
  }

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0)
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting
  }

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0)
    const timeSinceLastInvoke = time - lastInvokeTime

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  const timerExpired = () => {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    timeout = setTimeout(timerExpired, remainingWait(time))
  }

  const trailingEdge = (time: number) => {
    timeout = null
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = null
    return result
  }

  const cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    lastInvokeTime = 0
    lastArgs = null
    lastCallTime = null
    timeout = null
  }

  const flush = () => {
    return timeout === null ? result : trailingEdge(Date.now())
  }

  const debounced = (...args: Parameters<T>) => {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastCallTime = time

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime)
      }
      if (maxWait !== undefined) {
        timeout = setTimeout(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait)
    }
    return result
  }

  type DebouncedReturn = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
    cancel: () => void
    flush: () => ReturnType<T> | undefined
  }
  const typedDebounced = debounced as DebouncedReturn
  typedDebounced.cancel = cancel
  typedDebounced.flush = flush

  return typedDebounced
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void; flush: () => ReturnType<T> | undefined } {
  return debounce(func, wait, {
    leading: options.leading !== false,
    trailing: options.trailing !== false,
    maxWait: wait
  })
}

/**
 * React hook for debounced callbacks
 */
type DebouncedFn<T extends (...args: unknown[]) => unknown> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
  cancel: () => void
  flush: () => ReturnType<T> | undefined
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback)
  const debouncedRef = useRef<DebouncedFn<T> | undefined>(undefined)
  const depsKey = useMemo(() => JSON.stringify(deps), [deps])

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const debounced = debounce(
      ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
      delay
    )
    debouncedRef.current = debounced as DebouncedFn<T>

    return () => {
      debouncedRef.current?.cancel()
    }
  }, [delay, depsKey])

  return useCallback((...args: Parameters<T>) => {
    return debouncedRef.current?.(...args) as ReturnType<T> | undefined
  }, []) as T
}

/**
 * React hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback)
  const throttledRef = useRef<DebouncedFn<T> | undefined>(undefined)
  const depsKey = useMemo(() => JSON.stringify(deps), [deps])

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const throttled = throttle(
      ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
      delay
    )
    throttledRef.current = throttled as DebouncedFn<T>

    return () => {
      throttledRef.current?.cancel()
    }
  }, [delay, depsKey])

  return useCallback((...args: Parameters<T>) => {
    return throttledRef.current?.(...args) as ReturnType<T> | undefined
  }, []) as T
}

/**
 * React hook for throttled values (useful for scroll positions, mouse movements, etc.)
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, delay - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return throttledValue
}

/**
 * Request deduplication utility
 * Prevents duplicate requests for the same key within a time window
 */
export class RequestDeduplicator {
  private cache: Map<string, Promise<unknown>> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(private ttl: number = 5000) {}

  /**
   * Execute a request with deduplication
   * If a request with the same key is already in progress, return the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if we have an in-flight request
    const existing = this.cache.get(key) as Promise<T> | undefined
    if (existing) {
      return existing
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        // Keep in cache for TTL
        this.scheduleCleanup(key)
        return result
      })
      .catch(error => {
        // Remove from cache on error
        this.cache.delete(key)
        this.clearTimeout(key)
        throw error
      })

    this.cache.set(key, promise)
    return promise
  }

  private scheduleCleanup(key: string) {
    this.clearTimeout(key)
    const timeout = setTimeout(() => {
      this.cache.delete(key)
      this.timeouts.delete(key)
    }, this.ttl)
    this.timeouts.set(key, timeout)
  }

  private clearTimeout(key: string) {
    const timeout = this.timeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(key)
    }
  }

  clear() {
    this.cache.clear()
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
  }
}

/**
 * React hook for request deduplication
 */
export function useRequestDeduplicator(ttl = 5000) {
  const deduplicatorRef = useRef<RequestDeduplicator | undefined>(undefined)

  if (!deduplicatorRef.current) {
    deduplicatorRef.current = new RequestDeduplicator(ttl)
  }

  useEffect(() => {
    return () => {
      deduplicatorRef.current?.clear()
    }
  }, [])

  return deduplicatorRef.current
}

/**
 * Batch multiple function calls into a single execution
 * Useful for batching API requests
 */
export function batchProcessor<T, R>(
  processFn: (items: T[]) => Promise<R[]>,
  wait = 10,
  maxBatchSize = 100
) {
  let batch: T[] = []
  let callbacks: Array<{ resolve: (value: R) => void; reject: (error: unknown) => void }> = []
  let timeout: NodeJS.Timeout | null = null

  const processBatch = async () => {
    const currentBatch = batch
    const currentCallbacks = callbacks

    batch = []
    callbacks = []
    timeout = null

    try {
      const results = await processFn(currentBatch)
      currentCallbacks.forEach((cb, index) => {
        cb.resolve(results[index])
      })
    } catch (error) {
      currentCallbacks.forEach(cb => {
        cb.reject(error)
      })
    }
  }

  const scheduleBatch = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(processBatch, wait)
  }

  return (item: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      batch.push(item)
      callbacks.push({ resolve, reject })

      if (batch.length >= maxBatchSize) {
        processBatch()
      } else {
        scheduleBatch()
      }
    })
  }
}

/**
 * Performance constants for optimal settings
 */
export const PERFORMANCE_SETTINGS = {
  // Debounce delays
  SEARCH_DEBOUNCE: 500,      // 500ms for search inputs
  FILTER_DEBOUNCE: 300,      // 300ms for filters
  AUTOSAVE_DEBOUNCE: 1000,   // 1s for auto-save

  // Throttle delays
  SCROLL_THROTTLE: 100,      // 100ms for scroll events
  RESIZE_THROTTLE: 200,      // 200ms for resize events
  MOUSEMOVE_THROTTLE: 50,    // 50ms for mouse movement

  // Request settings
  REQUEST_DEDUPE_TTL: 5000,  // 5s TTL for request deduplication
  BATCH_WAIT: 10,            // 10ms wait for batching
  MAX_BATCH_SIZE: 50,        // Max 50 items per batch
} as const