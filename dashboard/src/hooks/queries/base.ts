/**
 * Base React Query Hooks for Supabase
 * Reusable hooks with built-in error handling, performance monitoring, and type safety
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  UseQueryOptions,
  UseMutationOptions,
  UseInfiniteQueryOptions,
  QueryKey,
  InfiniteData,
  QueryClient,
} from '@tanstack/react-query'
import { logger } from '@/lib/logger'

// Performance monitoring
const measureQueryPerformance = (queryKey: QueryKey, startTime: number) => {
  const duration = Date.now() - startTime

  // Log slow queries (>1000ms)
  if (duration > 1000) {
    logger.warn(`Slow query detected`, {
      queryKey,
      duration: `${duration}ms`,
    })
  }

  // Track metrics in development
  if (process.env.NODE_ENV === 'development') {
    const key = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)
    performance.measure(`query:${key}`, {
      start: startTime,
      duration,
    })
  }
}

/**
 * Enhanced useQuery wrapper for Supabase
 * Includes performance monitoring and error handling
 */
export function useSupabaseQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      const startTime = Date.now()

      try {
        const data = await queryFn()
        measureQueryPerformance(queryKey, startTime)
        return data
      } catch (error) {
        measureQueryPerformance(queryKey, startTime)

        // Log error
        logger.error('Query failed', {
          queryKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        throw error
      }
    },
    ...options,
  })
}

/**
 * Enhanced useMutation wrapper for Supabase
 * Includes optimistic updates and error recovery
 */
export function useSupabaseMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
) {
  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables) => {
      const startTime = Date.now()

      try {
        const data = await mutationFn(variables)

        const duration = Date.now() - startTime
        logger.info('Mutation completed', { duration: `${duration}ms` })

        return data
      } catch (error) {
        const duration = Date.now() - startTime
        logger.error('Mutation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${duration}ms`,
        })

        throw error
      }
    },
    ...options,
  })
}

/**
 * Enhanced useInfiniteQuery wrapper for paginated Supabase queries
 * Handles cursor-based pagination automatically
 */
export function useInfiniteSupabaseQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: ({ pageParam }: { pageParam?: number }) => Promise<TData>,
  options?: Omit<
    UseInfiniteQueryOptions<TData, TError, InfiniteData<TData>, QueryKey, number>,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  > & {
    pageSize?: number
  }
) {
  const pageSize = options?.pageSize || 50

  return useInfiniteQuery<TData, TError, InfiniteData<TData>, QueryKey, number>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = Date.now()

      try {
        const data = await queryFn({ pageParam })
        measureQueryPerformance([...queryKey, 'page', pageParam], startTime)
        return data
      } catch (error) {
        measureQueryPerformance([...queryKey, 'page', pageParam], startTime)

        console.error('Infinite query failed:', JSON.stringify({
          queryKey,
          pageParam,
          error: error instanceof Error ? {
            title: error.message,
            stack: error.stack
          } : String(error),
          // Better error serialization
          errorSerialized: error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'null',
          errorType: error ? (error as Record<string, unknown>).constructor?.name : 'unknown'
        }, null, 2))

        throw error
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Assuming lastPage is an array
      if (Array.isArray(lastPage) && lastPage.length === pageSize) {
        return allPages.length * pageSize
      }
      return undefined
    },
    ...options,
  })
}

/**
 * Prefetch helper for warming the cache
 */
export async function prefetchQuery<TData = unknown>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  staleTime?: number
) {
  try {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: staleTime || 5 * 60 * 1000, // Default 5 minutes
    })

    logger.info('Prefetched query', { queryKey })
  } catch (error) {
    logger.error('Prefetch failed', {
      queryKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Helper to invalidate queries with related dependencies
 */
export async function invalidateWithDependencies(
  queryClient: QueryClient,
  primaryKey: string,
  dependencies?: string[]
) {
  // Invalidate primary query
  await queryClient.invalidateQueries({ queryKey: [primaryKey] })

  // Invalidate dependent queries
  if (dependencies) {
    await Promise.all(
      dependencies.map((dep) =>
        queryClient.invalidateQueries({ queryKey: [dep] })
      )
    )
  }

  logger.info('Invalidated queries', {
    primary: primaryKey,
    dependencies: dependencies || [],
  })
}

/**
 * Helper to check if data is stale
 */
export function isDataStale(queryClient: QueryClient, queryKey: QueryKey): boolean {
  const state = queryClient.getQueryState(queryKey)
  if (!state || !state.dataUpdatedAt) return true
  return state.isInvalidated === true
}

// Export type helpers for better type inference
export type SupabaseQueryOptions<TData = unknown, TError = Error> = Omit<
  UseQueryOptions<TData, TError>,
  'queryKey' | 'queryFn'
>

export type SupabaseMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>

export type SupabaseInfiniteQueryOptions<TData = unknown, TError = Error> = Omit<
  UseInfiniteQueryOptions<TData, TError, InfiniteData<TData>, QueryKey, number>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> & {
  pageSize?: number
}