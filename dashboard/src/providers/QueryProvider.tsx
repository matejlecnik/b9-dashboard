'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 2 minutes stale time for better performance
            staleTime: 2 * 60 * 1000,
            // 10 minutes cache time for better UX
            gcTime: 10 * 60 * 1000,
            // Retry failed requests with exponential backoff
            retry: (failureCount, error: unknown) => {
              const is404 = (() => {
                if (typeof error === 'object' && error !== null && 'status' in error) {
                  const status = (error as { status?: unknown }).status
                  return typeof status === 'number' && status === 404
                }
                return false
              })()
              if (is404) return false
              return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Optimize refetch behavior
            refetchOnWindowFocus: false, // Reduce unnecessary requests
            refetchOnReconnect: true,
            // Remove background refetch for better performance
            refetchInterval: false,
            // Network mode optimizations
            networkMode: 'online',
          },
          mutations: {
            // Add optimistic updates support
            retry: 1,
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}