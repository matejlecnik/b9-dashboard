

/**
 * React hook for using Web Workers
 * Provides an easy interface for offloading heavy computations
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import type { WorkerRequest, WorkerResponse } from '../workers/data-processor.worker'
interface UseWebWorkerOptions {
  onProgress?: (progress: number) => void
  onError?: (error: string) => void
  terminateOnUnmount?: boolean
}

interface WebWorkerState {
  loading: boolean
  progress: number
  error: string | null
}

export function useWebWorker(options: UseWebWorkerOptions = {}) {
  const { onProgress, onError, terminateOnUnmount = true } = options

  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  type PendingRequest = { resolve: (value: unknown) => void; reject: (error: Error) => void }
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map())

  const [state, setState] = useState<WebWorkerState>({
    loading: false,
    progress: 0,
    error: null
  })

  // Initialize worker
  useEffect(() => {
    if (!workerRef.current && typeof window !== 'undefined') {
      try {
        workerRef.current = new Worker(
          new URL('../workers/data-processor.worker.ts', import.meta.url),
          { type: 'module' }
        )

        // Handle messages from worker
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, type, data, error, progress } = event.data
          const pending = pendingRequestsRef.current.get(id)

          if (type === 'success' && pending) {
            pending.resolve(data)
            pendingRequestsRef.current.delete(id)
            setState(prev => ({ ...prev, loading: false, progress: 100 }))
          } else if (type === 'error') {
            const errorMsg = error || 'Unknown error'
            if (pending) {
              pending.reject(new Error(errorMsg))
              pendingRequestsRef.current.delete(id)
            }
            setState(prev => ({ ...prev, loading: false, error: errorMsg }))
            onError?.(errorMsg)
          } else if (type === 'progress') {
            setState(prev => ({ ...prev, progress: progress || 0 }))
            onProgress?.(progress || 0)
          }
        }

        // Handle worker errors
        workerRef.current.onerror = (error) => {
          logger.error('Worker error:', error)
          setState(prev => ({ ...prev, loading: false, error: 'Worker error occurred' }))
          onError?.('Worker error occurred')
        }
      } catch (error) {
        logger.error('Failed to create worker:', error)
        setState(prev => ({ ...prev, error: 'Failed to create worker' }))
      }
    }

    // Cleanup
    const initialPending = pendingRequestsRef.current
    return () => {
      const worker = workerRef.current
      if (terminateOnUnmount && worker) {
        worker.terminate()
        workerRef.current = null
      }
      initialPending.clear()
    }
  }, [terminateOnUnmount, onError, onProgress])

  // Process data using worker
  const process = useCallback(async <T = unknown>(
    type: WorkerRequest['type'],
    data: unknown,
    config?: unknown
  ): Promise<T> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized')
    }

    const id = `request_${++requestIdRef.current}`

    setState(prev => ({ ...prev, loading: true, progress: 0, error: null }))

    return new Promise<T>((resolve, reject) => {
      // Cast resolve/reject to the map's expected types
      pendingRequestsRef.current.set(id, {
        resolve: resolve as unknown as (value: unknown) => void,
        reject: reject as unknown as (error: Error) => void,
      })

      workerRef.current!.postMessage({
        id,
        type,
        // Normalize payload shape to always provide items
        data: Array.isArray(data) ? { items: data } : (data as unknown),
        config
      } as WorkerRequest)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequestsRef.current.has(id)) {
          pendingRequestsRef.current.delete(id)
          reject(new Error('Worker timeout'))
          setState(prev => ({ ...prev, loading: false, error: 'Operation timed out' }))
        }
      }, 30000)
    })
  }, [])

  // Convenience methods
  const filter = useCallback(
    (data: unknown[], filters: unknown, searchTerm?: string) =>
      process('filter', data, { filters, searchTerm }),
    [process]
  )

  const sort = useCallback(
    (data: unknown[], field: string, direction: 'asc' | 'desc' = 'asc', secondary?: unknown) =>
      process('sort', data, { field, direction, secondary }),
    [process]
  )

  const search = useCallback(
    (data: unknown[], query: string, fields?: string[], threshold?: number) =>
      process('search', data, { query, fields, threshold }),
    [process]
  )

  const aggregate = useCallback(
    (data: unknown[], groupBy?: string, metrics?: string[]) =>
      process('aggregate', data, { groupBy, metrics }),
    [process]
  )

  const batch = useCallback(
    async <T = unknown>(data: T[], processor: (batch: T[]) => T[] | Promise<T[]>, batchSize = 100): Promise<T[]> => {
      // Functions cannot be transferred to a Web Worker (DataCloneError).
      // Run batch processing on the main thread in chunks with progress updates.
      setState(prev => ({ ...prev, loading: true, progress: 0, error: null }))

      const total = data.length
      const results: T[] = []

      try {
        for (let i = 0; i < total; i += batchSize) {
          const chunk = data.slice(i, i + batchSize)
          // Allow async or sync processors
          const processed = await Promise.resolve(processor(chunk))
          results.push(...processed)

          const progressPct = Math.min(100, Math.round(((i + chunk.length) / total) * 100))
          setState(prev => ({ ...prev, progress: progressPct }))
          onProgress?.(progressPct)

          // Yield back to the event loop to keep UI responsive
          await new Promise(resolve => setTimeout(resolve, 0))
        }

        setState(prev => ({ ...prev, loading: false, progress: 100 }))
        return results
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch processing failed'
        setState(prev => ({ ...prev, loading: false, error: message }))
        onError?.(message)
        throw err
      }
    },
    [onError, onProgress]
  )

  // Terminate worker manually
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      pendingRequestsRef.current.clear()
      setState({ loading: false, progress: 0, error: null })
    }
  }, [])

  return {
    // State
    ...state,
    isReady: !!workerRef.current,

    // Methods
    process,
    filter,
    sort,
    search,
    aggregate,
    batch,
    terminate,
  }
}

/**
 * Hook for processing large datasets with progress tracking
 */
export function useDataProcessor<T = unknown>(
  data: T[],
  processor: (data: T[]) => T[] | Promise<T[]>,
  enabled = true
) {
  const [processed, setProcessed] = useState<T[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const worker = useWebWorker({
    onProgress: setProgress,
    onError: setError
  })

  useEffect(() => {
    if (enabled && data.length > 0 && !processing) {
      setProcessing(true)

      worker
        .batch(data, processor)
        .then(result => {
          setProcessed(result)
          setProcessing(false)
        })
        .catch(err => {
          setError(err.message)
          setProcessing(false)
        })
    }
  }, [data, enabled, processor, worker, processing])

  return {
    processed,
    processing,
    progress,
    error
  }
}

/**
 * Hook for parallel data processing
 */
export function useParallelProcessor() {
  const workers = useRef<Worker[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Create worker pool based on CPU cores
    const workerCount = navigator.hardwareConcurrency || 4

    for (let i = 0; i < Math.min(workerCount, 4); i++) {
      try {
        const worker = new Worker(
          new URL('../workers/data-processor.worker.ts', import.meta.url),
          { type: 'module' }
        )
        workers.current.push(worker)
      } catch (error) {
        logger.error('Failed to create worker pool:', error)
      }
    }

    return () => {
      workers.current.forEach(w => w.terminate())
      workers.current = []
    }
  }, [])

  const processParallel = useCallback(async <T = unknown>(
    data: T[],
    processor: (chunk: T[]) => T[]
  ): Promise<T[]> => {
    // Execute the provided processor in chunked parallel-like fashion on main thread
    setLoading(true)
    setProgress(0)

    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4)
    const chunkSize = Math.max(1, Math.ceil(data.length / workerCount))
    const chunks: T[][] = []
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    const results: T[][] = new Array(chunks.length)
    let completed = 0

    await Promise.all(
      chunks.map(async (chunk, index) => {
        const res = await Promise.resolve(processor(chunk))
        results[index] = res
        completed++
        const totalProgress = Math.round((completed / chunks.length) * 100)
        setProgress(totalProgress)
      })
    )

    setLoading(false)
    setProgress(100)
    return results.flat()
  }, [])

  return {
    processParallel,
    loading,
    progress,
    workerCount: workers.current.length
  }
}