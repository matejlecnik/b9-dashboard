/**
 * React Query hooks for Subreddit data fetching
 * Provides caching, background updates, and optimistic updates
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

interface Subreddit {
  id: number
  name: string
  display_name: string
  subscribers: number
  review?: 'Ok' | 'No Seller' | 'Non Related' | 'Banned' | null
  over18: boolean
  description: string
  created_at: string
  updated_at: string
  [key: string]: unknown
}

interface SubredditFilters {
  filter: 'unreviewed' | 'ok' | 'non_related' | 'no_seller' | 'banned'
  search?: string
  limit?: number
  offset?: number
}

interface SubredditStats {
  unreviewed: number
  ok: number
  non_related: number
  no_seller: number
  banned: number
  total: number
  new_today: number
}

/**
 * Fetch subreddits with pagination and filters
 */
export function useSubreddits(filters: SubredditFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.reddit.subreddits(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: (filters.limit || 50).toString(),
        offset: (pageParam * (filters.limit || 50)).toString(),
        filter: filters.filter,
      })

      if (filters.search?.trim()) {
        params.append('search', filters.search.trim())
      }

      const response = await fetch(`/api/reddit/subreddits?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch subreddits')
      }

      return {
        data: result.subreddits as Subreddit[],
        hasMore: result.hasMore || false,
        nextPage: pageParam + 1
      }
    },
    getNextPageParam: (lastPage: { hasMore: boolean; nextPage: number }) => lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch subreddit statistics
 */
export function useSubredditStats() {
  return useQuery({
    queryKey: queryKeys.reddit.counts(),
    queryFn: async () => {
      const response = await fetch('/api/reddit/subreddits/stats?type=review')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch stats')
      }

      return result.stats as SubredditStats
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Update a single subreddit's review status
 */
export function useUpdateSubredditReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      review
    }: {
      id: number
      review: 'Ok' | 'No Seller' | 'Non Related' | 'Banned'
    }) => {
      const response = await fetch(`/api/reddit/subreddits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ review })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update review')
      }

      return result
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.subreddits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
    },
    // Optimistic update
    onMutate: async ({ id, review }: { id: number; review: 'Ok' | 'No Seller' | 'Non Related' | 'Banned' }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.reddit.subreddits() })

      // Snapshot the previous value
      const previousSubreddits = queryClient.getQueryData(queryKeys.reddit.subreddits())

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: queryKeys.reddit.subreddits() },
        (old) => {
          if (!old) return old

          // Type guard for infinite query data structure
          const infiniteData = old as {
            pages?: Array<{
              data: Subreddit[];
              hasMore: boolean;
              nextPage: number
            }>;
            pageParams?: unknown[]
          }

          // Update the subreddit in the infinite query pages
          if (infiniteData.pages) {
            return {
              ...infiniteData,
              pages: infiniteData.pages.map((page) => ({
                ...page,
                data: page.data.map((sub: Subreddit) =>
                  sub.id === id ? { ...sub, review } : sub
                )
              }))
            }
          }

          // Update in a regular query
          if (Array.isArray(old)) {
            return (old as Subreddit[]).map((sub) =>
              sub.id === id ? { ...sub, review } : sub
            )
          }

          return old
        }
      )

      // Return a context object with the snapshotted value
      return { previousSubreddits }
    },
    // If the mutation fails, use the context returned from onMutate to rollback
    onError: (_err, _newData, context) => {
      if (context?.previousSubreddits) {
        queryClient.setQueryData(queryKeys.reddit.subreddits(), context.previousSubreddits)
      }
    },
  })
}

/**
 * Bulk update subreddits' review status
 */
export function useBulkUpdateSubredditReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      review
    }: {
      ids: number[]
      review: 'Ok' | 'No Seller' | 'Non Related' | 'Banned'
    }) => {
      const response = await fetch('/api/reddit/subreddits/bulk-review', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subredditIds: ids,
          review
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API request failed: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.subreddits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
    }
  })
}

/**
 * Fetch a single subreddit by ID
 */
export function useSubreddit(id: number | null) {
  return useQuery({
    queryKey: queryKeys.reddit.subreddit(id!),
    queryFn: async () => {
      if (!id) throw new Error('No ID provided')
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Subreddit
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Add a new subreddit
 */
export function useAddSubreddit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subredditName: string) => {
      const response = await fetch('/api/reddit/subreddits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subreddit_name: subredditName })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add subreddit')
      }

      return result
    },
    onSuccess: () => {
      // Invalidate subreddits list to refetch with new data
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.subreddits() })
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })
    }
  })
}