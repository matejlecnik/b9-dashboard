# React Query Implementation Guide

┌─ REACT QUERY ─────────────────────────────────────────┐
│ ● IMPLEMENTATION │ ██████████████░░░░░░ 70% COMPLETE     │
└─────────────────────────────────────────────────────┘

## Implementation Overview

This guide documents the React Query (TanStack Query) implementation in the B9 Dashboard, providing patterns, best practices, and examples for developers working with the codebase.

## Implementation Status

```json
{
  "architecture": {"status": "COMPLETE", "coverage": 100},
  "core_concepts": {"status": "COMPLETE", "coverage": 95},
  "hook_patterns": {"status": "ACTIVE", "coverage": 70},
  "performance": {"status": "ACTIVE", "coverage": 60},
  "realtime": {"status": "PLANNED", "coverage": 30},
  "offline": {"status": "PLANNED", "coverage": 0},
  "migration": {"status": "IN_PROGRESS", "coverage": 40}
}
```

## Architecture

### Query Client Configuration
Located in `/src/providers/QueryProvider.tsx`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default
      gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
      retry: 3,
      refetchOnWindowFocus: false,
    }
  }
})
```

### Query Key Structure
Located in `/src/lib/react-query.ts`

Our query keys follow a hierarchical pattern:
```typescript
queryKeys = {
  reddit: {
    subreddits: (filters?) => ['reddit', 'subreddits', filters],
    subreddit: (id) => ['reddit', 'subreddit', id],
    counts: () => ['reddit', 'counts']
  },
  instagram: {
    creators: (filters?) => ['instagram', 'creators', filters],
    creator: (id) => ['instagram', 'creator', id],
    metrics: () => ['instagram', 'metrics']
  }
}
```

## Core Concepts

### 1. Smart Stale Times
Different data types have different cache durations:

| Data Type | Stale Time | Use Case |
|-----------|------------|----------|
| Categories/Filters | 30 minutes | Rarely changes |
| Analytics/Metrics | 5 minutes | Updated periodically |
| Lists/Search | 2 minutes | Frequently updated |
| Real-time | 30 seconds | Near real-time updates |

### 2. Optimistic Updates
UI updates immediately while server processes:

```typescript
const mutation = useMutation({
  mutationFn: updateStatus,
  onMutate: async (newData) => {
    // Cancel queries
    await queryClient.cancelQueries({ queryKey })

    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKey)

    // Optimistically update
    queryClient.setQueryData(queryKey, newData)

    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKey, context.previous)
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey })
  }
})
```

### 3. Infinite Scrolling
For large datasets:

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['items'],
  queryFn: ({ pageParam = 0 }) => fetchItems({ offset: pageParam }),
  getNextPageParam: (lastPage, pages) =>
    lastPage.length === LIMIT ? pages.length * LIMIT : undefined
})
```

## Hook Patterns

### Base Hooks (`/src/hooks/queries/base.ts`)

#### useSupabaseQuery
Standard query with error handling:
```typescript
const { data, isLoading, error } = useSupabaseQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
    if (error) throw error
    return data
  }
})
```

#### useSupabaseMutation
Mutation with automatic invalidation:
```typescript
const mutation = useSupabaseMutation({
  mutationFn: async (userData) => {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
    if (error) throw error
    return data
  },
  invalidateQueries: [['users']]
})
```

### Page-Specific Hooks

#### Reddit Review (`/src/hooks/queries/useRedditReview.ts`)
```typescript
// Fetch subreddits for review
const { data: subreddits } = useSubredditsForReview({
  status: 'pending',
  orderBy: 'score_total',
  search: searchQuery
})

// Update review status
const updateStatus = useUpdateReviewStatus()
updateStatus.mutate({
  subredditId: 123,
  status: 'Ok',
  notes: 'Good engagement'
})
```

#### Instagram Creators (`/src/hooks/queries/useInstagramReview.ts`)
```typescript
// Infinite scroll creators
const {
  data,
  fetchNextPage,
  hasNextPage
} = useInstagramCreators({
  status: 'pending',
  orderBy: 'followers'
})

// Bulk update
const bulkUpdate = useBulkUpdateCreatorStatus()
bulkUpdate.mutate({
  creatorIds: [1, 2, 3],
  status: 'approved'
})
```

## Performance Optimization

### 1. Prefetching
Warm cache before user interaction:

```typescript
// Prefetch on hover
const prefetchCreator = usePrefetchCreatorOnHover()

<div onMouseEnter={() => prefetchCreator(creatorId)}>
  {creator.username}
</div>
```

### 2. Parallel Queries
Fetch multiple resources simultaneously:

```typescript
const [metrics, creators, analytics] = useQueries({
  queries: [
    { queryKey: ['metrics'], queryFn: fetchMetrics },
    { queryKey: ['creators'], queryFn: fetchCreators },
    { queryKey: ['analytics'], queryFn: fetchAnalytics }
  ]
})
```

### 3. Selective Invalidation
Only refresh what changed:

```typescript
// Invalidate specific subreddit
queryClient.invalidateQueries({
  queryKey: ['reddit', 'subreddit', subredditId]
})

// Invalidate all reddit data
queryClient.invalidateQueries({
  queryKey: ['reddit']
})
```

## Real-time Updates

### Supabase Integration (`/src/hooks/queries/useRealtime.ts`)

```typescript
// Auto-sync with database changes
useRealtimeSubreddits() // Subscribe to subreddit changes
useRealtimeCreators()   // Subscribe to creator changes

// Custom real-time hook
export function useRealtimeData(table: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // Update cache based on event
          switch (payload.eventType) {
            case 'INSERT':
              queryClient.invalidateQueries([table])
              break
            case 'UPDATE':
              queryClient.setQueryData(
                [table, payload.new.id],
                payload.new
              )
              break
            case 'DELETE':
              queryClient.removeQueries([table, payload.old.id])
              break
          }
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [table])
}
```

## Offline Support

### Queue Mutations (`/src/hooks/queries/useOfflineSync.ts`)

```typescript
// Use offline-capable mutation
const mutation = useOfflineMutation(
  async (data) => updateCreator(data),
  {
    entity: 'creator',
    type: 'update'
  }
)

// Monitor sync status
const { isOnline, pendingMutations } = useSyncStatus()

// Display sync indicator (import from @/components/SyncStatusIndicator)
<SyncStatusIndicator />
```

### Background Sync
Automatic retry when connection restored:

```typescript
// Mutations queued offline
localStorage: [
  { id: 1, type: 'update', data: {...}, status: 'pending' },
  { id: 2, type: 'create', data: {...}, status: 'pending' }
]

// When online, auto-sync
useBackgroundSync() // Processes queue every 60 seconds
```

## Migration Guide

### Converting Pages to React Query

#### Before (Direct Supabase):
```typescript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
    if (!error) setData(data)
    setLoading(false)
  }
  fetchData()
}, [])
```

#### After (React Query):
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['table'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
    if (error) throw error
    return data
  }
})
```

### Step-by-Step Migration

1. **Install Dependencies**
   ```bash
   npm install @tanstack/react-query --legacy-peer-deps
   ```

2. **Wrap App with Provider**
   ```typescript
   import { QueryProvider } from '@/providers/QueryProvider'

   export default function RootLayout({ children }) {
     return (
       <QueryProvider>{children}</QueryProvider>
     )
   }
   ```

3. **Replace Data Fetching**
   - Remove useState for data
   - Remove useEffect for fetching
   - Use appropriate React Query hook

4. **Update Mutations**
   - Replace async functions with useMutation
   - Add optimistic updates
   - Configure invalidation

5. **Test Thoroughly**
   - Check caching behavior
   - Verify error handling
   - Test offline scenarios

## Troubleshooting

### Common Issues

#### 1. Stale Data
**Problem**: Data not updating after mutation
**Solution**: Ensure proper invalidation
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['data'] })
}
```

#### 2. Infinite Re-renders
**Problem**: Component re-rendering infinitely
**Solution**: Stable query keys
```typescript
// Bad - creates new object each render
queryKey: ['data', { filter: value }]

// Good - stable reference
const filters = useMemo(() => ({ filter: value }), [value])
queryKey: ['data', filters]
```

#### 3. Race Conditions
**Problem**: Old requests overwriting new data
**Solution**: Cancel in-flight queries
```typescript
await queryClient.cancelQueries({ queryKey })
```

#### 4. Memory Leaks
**Problem**: Subscriptions not cleaned up
**Solution**: Proper cleanup in useEffect
```typescript
useEffect(() => {
  const subscription = subscribe()
  return () => subscription.unsubscribe()
}, [])
```

### Performance Metrics

Monitor query performance:
```typescript
// In development, check React Query DevTools
// Bottom panel shows:
- Active queries
- Stale/fresh status
- Query timing
- Cache hits/misses

// Production monitoring
const queryClient = useQueryClient()
const queries = queryClient.getQueryCache().getAll()
const slowQueries = queries.filter(q => q.state.dataUpdateCount > 100)
```

### Best Practices

1. **Use Proper Query Keys**
   - Hierarchical structure
   - Include all dependencies
   - Keep them serializable

2. **Configure Stale Times**
   - Static data: 30+ minutes
   - Dynamic data: 1-5 minutes
   - Real-time: <1 minute

3. **Handle Errors Gracefully**
   - Use error boundaries
   - Show user-friendly messages
   - Log to monitoring service

4. **Optimize Bundle Size**
   - Import only what you need
   - Use code splitting for heavy components
   - Lazy load modals and complex UI

5. **Test Caching Behavior**
   - Verify cache hits
   - Test invalidation logic
   - Check offline functionality

## Examples

### Complete Page Implementation

```typescript
// Reddit Categorization Page
'use client'

import { useCategorizedSubreddits, useUpdateCategory } from '@/hooks/queries'

export default function CategorizationPage() {
  const {
    data: subreddits,
    isLoading,
    fetchNextPage,
    hasNextPage
  } = useCategorizedSubreddits({
    category: 'uncategorized'
  })

  const updateCategory = useUpdateCategory()

  const handleCategorize = (id: number, category: string) => {
    updateCategory.mutate({
      subredditId: id,
      category
    })
  }

  if (isLoading) return <Skeleton />

  return (
    <InfiniteScroll
      dataLength={subreddits.length}
      next={fetchNextPage}
      hasMore={hasNextPage}
    >
      {subreddits.map(sub => (
        <SubredditCard
          key={sub.id}
          subreddit={sub}
          onCategorize={handleCategorize}
        />
      ))}
    </InfiniteScroll>
  )
}
```

## Performance Metrics

```json
{
  "query_performance": {
    "cache_hit_rate": "89%",
    "average_query_time": "45ms",
    "stale_queries": "12%",
    "active_queries": 23
  },
  "optimization_targets": {
    "slow_queries": 3,
    "memory_usage": "45MB",
    "bundle_impact": "+89KB",
    "dev_tools_active": true
  }
}
```

## Resources

```json
{
  "external_docs": {
    "tanstack_query": "https://tanstack.com/query/latest",
    "supabase_realtime": "https://supabase.com/docs/guides/realtime",
    "devtools": "https://tanstack.com/query/latest/docs/react/devtools"
  },
  "internal_docs": {
    "implementation_plan": "/dashboard/REACT_QUERY_IMPLEMENTATION_PLAN.md",
    "quick_reference": "/dashboard/docs/REACT_QUERY_QUICK_REFERENCE.md",
    "hooks_library": "/dashboard/src/hooks/README.md"
  }
}
```

## Navigation

```json
{
  "current": "/dashboard/docs/REACT_QUERY_GUIDE.md",
  "parent": "/dashboard/docs/",
  "related": {
    "quick_reference": "/dashboard/docs/REACT_QUERY_QUICK_REFERENCE.md",
    "providers": "/dashboard/src/providers/README.md",
    "hooks": "/dashboard/src/hooks/README.md",
    "types": "/dashboard/src/types/README.md"
  }
}
```

---

_System Version: 3.3.0 | Last Update: 2025-01-29 | Maintainer: B9 Development Team_