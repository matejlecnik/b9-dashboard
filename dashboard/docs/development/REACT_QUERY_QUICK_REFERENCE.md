# React Query Quick Reference

┌─ QUICK REFERENCE ───────────────────────────────────────┐
│ ● REFERENCE    │ ████████████████████ 100% COMPLETE    │
└─────────────────────────────────────────────────────┘

## Common Patterns

### Basic Query
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos
})
```

### Query with Parameters
```typescript
const { data } = useQuery({
  queryKey: ['todo', todoId],
  queryFn: () => fetchTodo(todoId),
  enabled: !!todoId // Only run if todoId exists
})
```

### Infinite Query
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
  getNextPageParam: (lastPage, pages) => lastPage.nextCursor
})
```

### Basic Mutation
```typescript
const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  }
})

// Usage
mutation.mutate({ title: 'New Todo' })
```

### Optimistic Update
```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries(['todos'])
    const previous = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], old => [...old, newTodo])
    return { previous }
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous)
  }
})
```

## B9 Dashboard Hooks

### Reddit Hooks
```typescript
import {
  useSubredditsForReview,    // Review page
  useUpdateReviewStatus,      // Update status
  useBulkUpdateReview,        // Bulk operations
  useCategorizedSubreddits,   // Categorization
  useAICategorization         // AI categorize
} from '@/hooks/queries/useRedditReview'
```

### Instagram Hooks
```typescript
import {
  useInstagramCreators,       // Creator list
  useCreatorStats,            // Statistics
  useUpdateCreatorStatus,     // Update status
  useBulkUpdateCreatorStatus, // Bulk update
  useCreatorAnalytics,        // Analytics
  useRelatedCreators          // Find related
} from '@/hooks/queries/useInstagramReview'
```

### Monitoring Hooks
```typescript
import {
  useRedditMonitorStatus,     // Reddit status
  useInstagramScraperStatus,  // IG status
  useMonitoringDashboard,     // Combined data
  useScraperLogs              // Real-time logs
} from '@/hooks/queries/useMonitoring'
```

### Analytics Hooks
```typescript
import {
  useDashboardMetrics,        // Main metrics
  useTrendData,               // Trend charts
  useTopSubreddits,           // Top performers
  useTopCreators,             // Top creators
  useAnalyticsDashboard       // All analytics
} from '@/hooks/queries/useAnalytics'
```

## Query Keys

```typescript
// Hierarchical structure
queryKeys.reddit.subreddits()           // ['reddit', 'subreddits']
queryKeys.reddit.subreddit(123)         // ['reddit', 'subreddit', 123]
queryKeys.instagram.creators(filters)   // ['instagram', 'creators', filters]
queryKeys.analytics.dashboard()         // ['analytics', 'dashboard']
```

## Performance Tips

### Prefetch on Hover
```typescript
const prefetch = () => {
  queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  })
}

<div onMouseEnter={prefetch}>Hover me</div>
```

### Parallel Queries
```typescript
const results = useQueries({
  queries: [
    { queryKey: ['post', 1], queryFn: fetchPost },
    { queryKey: ['post', 2], queryFn: fetchPost }
  ]
})
```

### Dependent Queries
```typescript
const { data: user } = useQuery({
  queryKey: ['user', email],
  queryFn: getUserByEmail
})

const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: getProjectsByUser,
  enabled: !!user?.id // Only run after user loads
})
```

## Invalidation Patterns

```typescript
// Invalidate everything
queryClient.invalidateQueries()

// Invalidate by exact key
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate by partial key
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Remove from cache
queryClient.removeQueries({ queryKey: ['todos'] })

// Reset to initial data
queryClient.resetQueries({ queryKey: ['todos'] })
```

## Cache Management

```typescript
// Get cached data
const data = queryClient.getQueryData(['todos'])

// Set cached data
queryClient.setQueryData(['todos'], newData)

// Update cached data
queryClient.setQueryData(['todos'], old => ({
  ...old,
  items: [...old.items, newItem]
}))
```

## Stale Times (B9 Dashboard)

| Data Type | Stale Time | Cache Time |
|-----------|------------|------------|
| Categories | 30 min | 60 min |
| Analytics | 5 min | 30 min |
| Lists | 2 min | 30 min |
| Real-time | 30 sec | 5 min |

## Error Handling

```typescript
const { error, isError, refetch } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  retry: 3,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
})

if (isError) {
  return <ErrorBoundary error={error} onRetry={refetch} />
}
```

## Real-time Updates

```typescript
// Auto-sync with Supabase
useRealtimeSubreddits()  // Reddit updates
useRealtimeCreators()    // Instagram updates

// Custom subscription
useEffect(() => {
  const channel = supabase
    .channel('custom')
    .on('postgres_changes', { event: '*' }, payload => {
      queryClient.invalidateQueries(['data'])
    })
    .subscribe()

  return () => channel.unsubscribe()
}, [])
```

## Offline Support

```typescript
// Offline-capable mutation
const mutation = useOfflineMutation(
  updateData,
  { entity: 'creator', type: 'update' }
)

// Check sync status
const { isOnline, pendingMutations } = useSyncStatus()

// Display indicator
{!isOnline && <OfflineIndicator count={pendingMutations} />}
```

## DevTools

```typescript
// In development only
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<ReactQueryDevtools
  initialIsOpen={false}
  position="bottom"
/>
```

## Common Use Cases

### Search with Debounce
```typescript
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 500)

const { data } = useQuery({
  queryKey: ['search', debouncedSearch],
  queryFn: () => searchItems(debouncedSearch),
  enabled: debouncedSearch.length > 2
})
```

### Load More Button
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({...})

<button
  onClick={fetchNextPage}
  disabled={!hasNextPage || isFetchingNextPage}
>
  {isFetchingNextPage ? 'Loading...' : 'Load More'}
</button>
```

### Auto-refresh
```typescript
const { data } = useQuery({
  queryKey: ['metrics'],
  queryFn: fetchMetrics,
  refetchInterval: 5000, // Every 5 seconds
  refetchIntervalInBackground: true
})
```

## Navigation

```json
{
  "current": "/dashboard/docs/REACT_QUERY_QUICK_REFERENCE.md",
  "parent": "/dashboard/docs/",
  "related": {
    "full_guide": "/dashboard/docs/REACT_QUERY_GUIDE.md",
    "providers": "/dashboard/src/providers/README.md",
    "hooks": "/dashboard/src/hooks/README.md",
    "implementation_plan": "/dashboard/REACT_QUERY_IMPLEMENTATION_PLAN.md"
  }
}
```

---

_Quick reference for B9 Dashboard React Query implementation | Last Updated: 2025-01-29_