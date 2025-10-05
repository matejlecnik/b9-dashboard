# Data Flow Patterns with React Query

┌─ DATA MANAGEMENT ───────────────────────────────────────┐
│ ● REACT QUERY │ ████████████████████ 100% OPTIMIZED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DASHBOARD_TEMPLATE.md",
  "current": "DATA_FLOW_PATTERNS.md",
  "siblings": [
    {"path": "SIDEBAR_CONFIGURATION.md", "desc": "Sidebar setup guide"},
    {"path": "COMPONENT_CATALOG.md", "desc": "Reusable components"},
    {"path": "PAGE_PATTERNS.md", "desc": "Standard page structures"}
  ]
}
```

## React Query Setup

### 1. Query Client Configuration

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        logger.error('Mutation error:', error)
      }
    }
  }
})
```

### 2. Provider Setup

```typescript
// app/providers.tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

## Data Fetching Patterns

### 1. Infinite Query Pattern (Paginated Data)

```typescript
// hooks/queries/useInfiniteItems.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 20

interface UseItemsParams {
  search?: string
  filter?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useInfiniteItems({
  search,
  filter,
  sortBy = 'created_at',
  sortOrder = 'desc'
}: UseItemsParams) {
  return useInfiniteQuery({
    queryKey: ['items', { search, filter, sortBy, sortOrder }],

    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('items')
        .select('*')
        .range(pageParam, pageParam + PAGE_SIZE - 1)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply filters
      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      if (filter && filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        items: data || [],
        nextCursor: data?.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
        totalCount: count || 0
      }
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor,

    initialPageParam: 0,

    // Keep previous data while fetching new
    placeholderData: (previousData) => previousData
  })
}
```

### 2. Single Query Pattern (Stats/Metrics)

```typescript
// hooks/queries/useStats.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],

    queryFn: async () => {
      // Fetch multiple aggregates in parallel
      const [totalResult, pendingResult, approvedResult] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'approved')
      ])

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: (totalResult.count || 0) - (pendingResult.count || 0) - (approvedResult.count || 0)
      }
    },

    // Refetch every 30 seconds
    refetchInterval: 30000,

    // Keep data fresh
    staleTime: 1000 * 30
  })
}
```

### 3. Real-time Subscription Pattern

```typescript
// hooks/queries/useRealtimeItems.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeItems() {
  const queryClient = useQueryClient()

  // Initial query
  const query = useQuery({
    queryKey: ['items', 'realtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        (payload) => {
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(['items', 'realtime'], (old: any[]) => {
              return [payload.new, ...old]
            })
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(['items', 'realtime'], (old: any[]) => {
              return old.map(item =>
                item.id === payload.new.id ? payload.new : item
              )
            })
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(['items', 'realtime'], (old: any[]) => {
              return old.filter(item => item.id !== payload.old.id)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}
```

## Mutation Patterns

### 1. Single Item Update

```typescript
// hooks/mutations/useUpdateItem.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UpdateItemParams {
  id: number
  updates: Partial<Item>
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: UpdateItemParams) => {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['items'] })

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(['items'])

      // Optimistically update
      queryClient.setQueryData(['items'], (old: any) => {
        if (Array.isArray(old)) {
          return old.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        }
        return old
      })

      return { previousItems }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems)
      }
      toast.error('Update failed')
    },

    onSuccess: () => {
      toast.success('Item updated successfully')
    },

    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })
}
```

### 2. Bulk Operations

```typescript
// hooks/mutations/useBulkUpdate.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface BulkUpdateParams {
  ids: number[]
  updates: Partial<Item>
}

export function useBulkUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, updates }: BulkUpdateParams) => {
      // Perform bulk update
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .in('id', ids)
        .select()

      if (error) throw error
      return data
    },

    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['items'] })

      const previousData = queryClient.getQueryData(['items'])

      // Optimistic update for all selected items
      queryClient.setQueriesData(
        { queryKey: ['items'] },
        (old: any) => {
          if (Array.isArray(old)) {
            return old.map(item =>
              ids.includes(item.id) ? { ...item, ...updates } : item
            )
          }
          return old
        }
      )

      return { previousData }
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['items'], context.previousData)
      }
      toast.error(`Failed to update ${variables.ids.length} items`)
    },

    onSuccess: (data, variables) => {
      toast.success(`Successfully updated ${variables.ids.length} items`)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })
}
```

### 3. Create Item

```typescript
// hooks/mutations/useCreateItem.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newItem: Omit<Item, 'id'>) => {
      const { data, error } = await supabase
        .from('items')
        .insert(newItem)
        .select()
        .single()

      if (error) throw error
      return data
    },

    onSuccess: (newItem) => {
      // Add to cache immediately
      queryClient.setQueryData(['items'], (old: any[]) => {
        return [newItem, ...(old || [])]
      })

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['stats'] })

      toast.success('Item created successfully')
    }
  })
}
```

### 4. Delete Item

```typescript
// hooks/mutations/useDeleteItem.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)

      if (error) throw error
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['items'] })

      const previousItems = queryClient.getQueryData(['items'])

      // Remove from cache optimistically
      queryClient.setQueryData(['items'], (old: any[]) => {
        return old?.filter(item => item.id !== id) || []
      })

      return { previousItems }
    },

    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems)
      }
      toast.error('Delete failed')
    },

    onSuccess: () => {
      toast.success('Item deleted')
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })
}
```

## Cache Management

### 1. Query Invalidation Strategies

```typescript
// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ['items'] })

// Invalidate all queries with prefix
queryClient.invalidateQueries({ queryKey: ['items'], exact: false })

// Invalidate multiple queries
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['items'] }),
  queryClient.invalidateQueries({ queryKey: ['stats'] })
])

// Conditional invalidation
queryClient.invalidateQueries({
  queryKey: ['items'],
  predicate: (query) => {
    return query.state.dataUpdateCount < 10
  }
})
```

### 2. Prefetching

```typescript
// Prefetch next page
const prefetchNextPage = async () => {
  await queryClient.prefetchInfiniteQuery({
    queryKey: ['items', filters],
    queryFn: fetchItems,
    pages: 2  // Prefetch 2 pages
  })
}

// Prefetch on hover
<button
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['item', id],
      queryFn: () => fetchItem(id)
    })
  }}
>
  View Details
</button>
```

### 3. Cache Updates

```typescript
// Direct cache update
queryClient.setQueryData(['items'], (old: Item[]) => {
  return [...old, newItem]
})

// Update multiple caches
queryClient.setQueriesData(
  { queryKey: ['items'] },
  (old: Item[]) => {
    return old?.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    )
  }
)

// Read from cache
const cachedData = queryClient.getQueryData(['items'])

// Remove from cache
queryClient.removeQueries({ queryKey: ['items'] })
```

## Error Handling

### 1. Query Error Handling

```typescript
const { data, error, isError, refetch } = useQuery({
  queryKey: ['items'],
  queryFn: fetchItems,
  retry: (failureCount, error) => {
    // Don't retry on 404s
    if (error.status === 404) return false
    // Retry up to 3 times
    return failureCount < 3
  },
  onError: (error) => {
    logger.error('Query failed:', error)
    toast.error('Failed to load items')
  }
})

if (isError) {
  return (
    <ErrorState
      error={error}
      onRetry={refetch}
    />
  )
}
```

### 2. Mutation Error Handling

```typescript
const mutation = useMutation({
  mutationFn: updateItem,
  onError: (error, variables, context) => {
    // Log error details
    logger.error('Mutation failed:', {
      error,
      variables,
      context
    })

    // Show user-friendly message
    if (error.code === 'PGRST116') {
      toast.error('Item not found')
    } else if (error.code === '23505') {
      toast.error('Duplicate item')
    } else {
      toast.error('Operation failed. Please try again.')
    }

    // Rollback optimistic update
    if (context?.previousData) {
      queryClient.setQueryData(['items'], context.previousData)
    }
  }
})
```

## Performance Optimization

### 1. Query Keys Best Practices

```typescript
// Use consistent key structure
const queryKeys = {
  all: ['items'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: any) => [...queryKeys.lists(), filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: number) => [...queryKeys.details(), id] as const,
}

// Usage
useQuery({ queryKey: queryKeys.list({ filter: 'active' }) })
useQuery({ queryKey: queryKeys.detail(123) })
```

### 2. Parallel Queries

```typescript
// Fetch multiple queries in parallel
const results = useQueries({
  queries: [
    { queryKey: ['items'], queryFn: fetchItems },
    { queryKey: ['stats'], queryFn: fetchStats },
    { queryKey: ['users'], queryFn: fetchUsers }
  ]
})

// Check if all queries are loaded
const isLoading = results.some(result => result.isLoading)
const hasError = results.some(result => result.isError)
```

### 3. Suspense Mode

```typescript
// Enable suspense for a query
const { data } = useSuspenseQuery({
  queryKey: ['items'],
  queryFn: fetchItems
})

// Wrap with Suspense boundary
<Suspense fallback={<Loading />}>
  <ItemsList />
</Suspense>
```

## Testing Patterns

### 1. Mock Query Client

```typescript
// test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      }
    }
  })
}

export function TestWrapper({ children }: { children: React.ReactNode }) {
  const testQueryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 2. Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { TestWrapper } from './test-utils'

test('fetches items successfully', async () => {
  const { result } = renderHook(() => useItems(), {
    wrapper: TestWrapper
  })

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  expect(result.current.data).toHaveLength(10)
})
```

---

_Data Flow Version: 1.0.0 | Last Updated: 2025-01-29_