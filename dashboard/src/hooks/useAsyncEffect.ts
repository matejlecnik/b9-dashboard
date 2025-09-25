
import { useEffect, useRef, type DependencyList } from 'react'
import { logger } from '@/lib/logger'

/**
 * Custom hook for running async effects safely with automatic cleanup
 * Prevents memory leaks by checking if component is still mounted
 *
 * @example
 * ```typescript
 * useAsyncEffect(async (signal) => {
 *   const data = await fetchData()
 *   if (!signal.aborted) {
 *     setData(data)
 *   }
 * }, [dependency])
 * ```
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList
): void {
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true

    // Create new AbortController for this effect
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // Run async effect
    const runEffect = async () => {
      try {
        await effect(signal)
      } catch (error) {
        // Only log errors if component is still mounted and not aborted
        if (isMountedRef.current && !signal.aborted) {
          logger.error('[useAsyncEffect] Error in async effect:', error)
        }
      }
    }

    runEffect()

    // Cleanup function
    return () => {
      isMountedRef.current = false

      // Abort any pending async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook for managing multiple async operations with cleanup
 * Useful for components that need to fetch data from multiple sources
 *
 * @example
 * ```typescript
 * const { run, cancel, isRunning } = useAsyncOperations()
 *
 * const fetchAllData = () => {
 *   run('users', async (signal) => {
 *     const users = await fetchUsers()
 *     if (!signal.aborted) setUsers(users)
 *   })
 *
 *   run('posts', async (signal) => {
 *     const posts = await fetchPosts()
 *     if (!signal.aborted) setPosts(posts)
 *   })
 * }
 * ```
 */
export function useAsyncOperations() {
  const operationsRef = useRef<Map<string, AbortController>>(new Map())
  const isMountedRef = useRef(true)

  // Run an async operation with a unique key
  const run = async (
    key: string,
    operation: (signal: AbortSignal) => Promise<void>
  ): Promise<void> => {
    // Cancel any existing operation with the same key
    cancel(key)

    if (!isMountedRef.current) return

    // Create new AbortController for this operation
    const controller = new AbortController()
    operationsRef.current.set(key, controller)

    try {
      await operation(controller.signal)
    } catch (error) {
      if (!controller.signal.aborted && isMountedRef.current) {
        logger.error(`[useAsyncOperations] Error in operation '${key}':`, error)
      }
    } finally {
      // Remove controller after operation completes
      if (operationsRef.current.get(key) === controller) {
        operationsRef.current.delete(key)
      }
    }
  }

  // Cancel a specific operation
  const cancel = (key: string): void => {
    const controller = operationsRef.current.get(key)
    if (controller) {
      controller.abort()
      operationsRef.current.delete(key)
    }
  }

  // Cancel all operations
  const cancelAll = (): void => {
    operationsRef.current.forEach((controller: AbortController) => controller.abort())
    operationsRef.current.clear()
  }

  // Check if an operation is running
  const isRunning = (key: string): boolean => {
    return operationsRef.current.has(key)
  }

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      cancelAll()
    }
  }, [])

  return {
    run,
    cancel,
    cancelAll,
    isRunning
  }
}

/**
 * Hook for running an async effect with retry logic
 * Useful for operations that might fail temporarily (network requests, etc.)
 */
export function useAsyncEffectWithRetry(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList,
  options: {
    maxRetries?: number
    retryDelay?: number
    shouldRetry?: (error: unknown, attempt: number) => boolean
  } = {}
): void {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = () => true
  } = options

  useAsyncEffect(async (signal) => {
    let lastError: unknown = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal.aborted) break

      try {
        await effect(signal)
        return // Success, exit retry loop
      } catch (error) {
        lastError = error

        if (attempt < maxRetries && shouldRetry(error, attempt + 1) && !signal.aborted) {
          logger.log(`[useAsyncEffectWithRetry] Retry attempt ${attempt + 1}/${maxRetries} in ${retryDelay}ms`)

          // Wait before retry
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, retryDelay * (attempt + 1))

            // Clear timeout if aborted
            signal.addEventListener('abort', () => clearTimeout(timeout))
          })
        } else {
          throw error // Max retries reached or shouldn't retry
        }
      }
    }

    // If we get here, all retries failed
    if (lastError) {
      throw lastError
    }
  }, deps)
}

/**
 * Hook for managing cleanup functions
 * Ensures cleanup functions are called when component unmounts
 */
export function useCleanup() {
  const cleanupsRef = useRef<Array<() => void>>([])

  // Register a cleanup function
  const registerCleanup = (cleanup: () => void): void => {
    cleanupsRef.current.push(cleanup)
  }

  // Run all cleanup functions
  const runCleanups = (): void => {
    cleanupsRef.current.forEach((cleanup: () => void) => {
      try {
        cleanup()
      } catch (error) {
        logger.error('[useCleanup] Error during cleanup:', error)
      }
    })
    cleanupsRef.current = []
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runCleanups()
    }
  }, [])

  return {
    registerCleanup,
    runCleanups
  }
}