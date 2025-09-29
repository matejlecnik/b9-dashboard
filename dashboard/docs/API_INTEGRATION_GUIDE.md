# API Integration Guide

┌─ INTEGRATION REFERENCE ─────────────────────────────────┐
│ ● DOCUMENTED  │ ████████████████████ 100% COMPLETE     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "API_INTEGRATION_GUIDE.md",
  "siblings": [
    {"path": "COMPONENT_GUIDE.md", "desc": "Component patterns", "status": "ACTIVE"},
    {"path": "TESTING_GUIDELINES.md", "desc": "Testing strategies", "status": "ACTIVE"},
    {"path": "DOCUMENTATION_MAP.md", "desc": "Full navigation", "status": "COMPLETE"}
  ]
}
```

## Core Patterns

### React Query Configuration

```json
{
  "location": "src/lib/react-query.ts",
  "features": {
    "auto_refetch": "5 minutes",
    "retry_logic": "3 attempts with exponential backoff",
    "caching": "Aggressive with stale-while-revalidate",
    "optimistic_updates": "Enabled for mutations"
  }
}
```

### Query Pattern

```tsx
// Location: src/hooks/queries/useSubreddits.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSubreddits(filters?: SubredditFilters) {
  return useQuery({
    queryKey: ['subreddits', filters],
    queryFn: async () => {
      let query = supabase
        .from('reddit_subreddits')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('primary_category', filters.category)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}

// Usage in component
function SubredditList() {
  const { data, isLoading, error, refetch } = useSubreddits({
    category: 'Technology'
  })

  if (isLoading) return <StandardPlaceholder type="loading" />
  if (error) return <StandardError message={error.message} onRetry={refetch} />
  if (!data?.length) return <EmptyState />

  return <UniversalTable subreddits={data} loading={false} />
}
```

### Mutation Pattern

```tsx
// Location: src/hooks/mutations/useUpdateCategory.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, category }: { id: number; category: string }) => {
      const { data, error } = await supabase
        .from('reddit_subreddits')
        .update({ primary_category: category })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, category }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['subreddits'] })

      // Snapshot previous value
      const previous = queryClient.getQueryData(['subreddits'])

      // Optimistically update
      queryClient.setQueryData(['subreddits'], (old: any[]) =>
        old.map(item => item.id === id ? { ...item, primary_category: category } : item)
      )

      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['subreddits'], context.previous)
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['subreddits'] })
    }
  })
}

// Usage
function CategorySelector({ subredditId }: { subredditId: number }) {
  const updateCategory = useUpdateCategory()

  const handleChange = (category: string) => {
    updateCategory.mutate(
      { id: subredditId, category },
      {
        onSuccess: () => {
          showToast({ type: 'success', message: 'Category updated' })
        },
        onError: (error) => {
          showToast({ type: 'error', message: error.message })
        }
      }
    )
  }

  return (
    <Select
      value={category}
      onChange={handleChange}
      disabled={updateCategory.isPending}
    />
  )
}
```

## API Endpoints

### Supabase Direct Access

```json
{
  "pattern": "Direct database queries via Supabase client",
  "location": "src/lib/supabase/index.ts",
  "methods": {
    "select": "Query data with filters",
    "insert": "Create new records",
    "update": "Modify existing records",
    "delete": "Remove records",
    "rpc": "Call stored procedures"
  }
}
```

### Example: Complex Query

```tsx
// Fetch subreddits with post counts and filtering
async function fetchSubredditsWithStats(filters: SubredditFilters) {
  const { data, error } = await supabase
    .from('reddit_subreddits')
    .select(`
      *,
      reddit_posts (
        count
      )
    `)
    .eq('review_status', 'Ok')
    .gte('subscriber_count', filters.minSubscribers || 0)
    .order('subreddit_score', { ascending: false })
    .limit(100)

  if (error) throw new Error(`Failed to fetch: ${error.message}`)
  return data
}
```

### Backend API Routes

```json
{
  "base_url": "/api",
  "pattern": "Next.js API routes for server-side operations",
  "location": "src/app/api/",
  "routes": {
    "categorization": {
      "POST /api/categorization/tags/start": "Start AI categorization",
      "GET /api/categories": "List all categories"
    },
    "scraper": {
      "POST /api/scraper/start": "Start Reddit scraper",
      "POST /api/scraper/stop": "Stop scraper",
      "GET /api/scraper/status": "Get scraper status"
    },
    "instagram": {
      "GET /api/instagram/creators": "List creators",
      "GET /api/instagram/analytics": "Get analytics data"
    }
  }
}
```

### Example: API Route Call

```tsx
// src/hooks/mutations/useStartCategorization.ts
export function useStartCategorization() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/categorization/tags/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Categorization failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      showToast({
        type: 'success',
        message: `Started processing ${data.count} posts`
      })
    }
  })
}
```

## Error Handling

### Error Types

```tsx
// src/lib/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### Error Handling Pattern

```tsx
function DataFetchingComponent() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error instanceof ValidationError) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  if (isLoading) {
    return <StandardPlaceholder type="loading" />
  }

  if (error) {
    return (
      <StandardError
        title="Failed to Load Data"
        message={error.message}
        onRetry={refetch}
        actions={[
          { label: 'Go Back', onClick: () => router.back() },
          { label: 'Contact Support', onClick: openSupport }
        ]}
      />
    )
  }

  return <DataDisplay data={data} />
}
```

## Caching Strategies

### Query Key Structure

```json
{
  "pattern": ["entity", filters, pagination],
  "examples": {
    "all_subreddits": ["subreddits"],
    "filtered_subreddits": ["subreddits", {"category": "Tech"}],
    "single_subreddit": ["subreddit", 123],
    "user_posts": ["posts", "user", 456],
    "paginated": ["subreddits", {"page": 1, "limit": 50}]
  }
}
```

### Cache Configuration

```tsx
// src/lib/react-query.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 1,
      retryDelay: 1000
    }
  }
})
```

### Manual Cache Updates

```tsx
// Optimistic update pattern
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['data'] })
    const previous = queryClient.getQueryData(['data'])

    queryClient.setQueryData(['data'], (old) => ({
      ...old,
      ...newData
    }))

    return { previous }
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['data'], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['data'] })
  }
})
```

## Performance Optimization

### Prefetching

```tsx
// Prefetch data on hover
function SubredditLink({ id }: { id: number }) {
  const queryClient = useQueryClient()

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['subreddit', id],
      queryFn: () => fetchSubreddit(id)
    })
  }

  return (
    <Link
      href={`/reddit/subreddit/${id}`}
      onMouseEnter={handleMouseEnter}
    >
      View Details
    </Link>
  )
}
```

### Infinite Queries

```tsx
// Infinite scroll pattern
export function useInfiniteSubreddits(filters?: SubredditFilters) {
  return useInfiniteQuery({
    queryKey: ['subreddits', 'infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('reddit_subreddits')
        .select('*')
        .range(pageParam, pageParam + 49)

      if (error) throw error
      return data
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 50) return undefined
      return pages.length * 50
    },
    initialPageParam: 0
  })
}

// Usage with infinite scroll
function InfiniteSubredditList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteSubreddits()

  const { ref } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage
  })

  return (
    <div>
      {data?.pages.map(page =>
        page.map(item => <Item key={item.id} {...item} />)
      )}
      <div ref={ref}>
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  )
}
```

## Real-Time Updates

### Supabase Realtime

```tsx
// Subscribe to database changes
function useRealtimeSubreddits() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('subreddit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reddit_subreddits'
        },
        (payload) => {
          // Invalidate queries on any change
          queryClient.invalidateQueries({ queryKey: ['subreddits'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
```

## Testing Patterns

### Mocking API Calls

```tsx
// tests/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/subreddits', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, name: 'test', subscribers: 1000 }
        ]
      })
    )
  })
]

// Component test
import { renderWithProviders } from '@/tests/utils'
import { server } from '@/tests/mocks/server'

test('displays subreddit data', async () => {
  renderWithProviders(<SubredditList />)

  expect(await screen.findByText('test')).toBeInTheDocument()
  expect(screen.getByText('1000 subscribers')).toBeInTheDocument()
})
```

---

_Guide Version: 1.0.0 | Updated: 2025-09-29 | Patterns: 15+_
_Navigate: [← Component Guide](COMPONENT_GUIDE.md) | [→ Testing Guidelines](TESTING_GUIDELINES.md)_