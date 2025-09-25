/**
 * React Query hooks for Reddit Subreddit Review page
 * Handles subreddit review, filtering, and bulk operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Subreddit } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/ui/toast'
import { queryKeys } from '@/lib/react-query'
import {
  useSupabaseQuery,
  useInfiniteSupabaseQuery
} from '@/hooks/queries/base'

const PAGE_SIZE = 50

export type ReviewStatus = 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null

interface ReviewFilters {
  search?: string
  review?: ReviewStatus
  minSubscribers?: number
  maxSubscribers?: number
  orderBy?: 'subscribers' | 'created_at' | 'display_name'
  order?: 'asc' | 'desc'
  nsfw?: boolean
  over18?: boolean
}

interface ReviewStats {
  total: number
  ok: number
  noSeller: number
  nonRelated: number
  userFeed: number
  unreviewed: number
  newToday: number
}

/**
 * Hook for fetching subreddits for review with infinite scroll
 */
export function useSubredditsForReview(filters: ReviewFilters = {}) {
  return useInfiniteSupabaseQuery<Subreddit[]>(
    queryKeys.reddit.reviews(filters),
    async ({ pageParam = 0 }) => {
      // Use console.log directly for better debugging
      console.log('📋 Fetching subreddits with filters:', JSON.stringify({
        filters,
        pageParam,
        searchValue: filters.search || 'none',
        reviewFilter: filters.review || 'none'
      }, null, 2))

      // Check if Supabase client exists
      console.log('🔍 Supabase client check:', JSON.stringify({
        clientExists: !!supabase,
        clientType: supabase ? typeof supabase : 'null',
        envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        envKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      }, null, 2))

      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }

      // Start with base query
      let query = supabase
        .from('reddit_subreddits')
        .select('*')

      // Apply filters with proper AND/OR logic

      // Apply review filter first (always uses AND logic with other filters)
      if (filters.review !== undefined) {
        console.log('📌 Applying review filter:', filters.review === null ? 'unreviewed (null)' : filters.review)
        if (filters.review === null) {
          query = query.is('review', null)
        } else {
          query = query.eq('review', filters.review)
        }
      }

      // Apply search filter - only search in display_name (subreddit name)
      if (filters.search) {
        console.log('🔍 Applying search filter:', filters.search)
        const searchTerm = filters.search.toLowerCase().replace(/'/g, "''") // Escape single quotes for SQL safety

        // Search only in name field (the subreddit name)
        // This works properly with AND logic when combined with other filters
        query = query.ilike('name', `%${searchTerm}%`)

        console.log('🏁 Query after search filter applied - searching in name column only')
      }

      // Apply other filters (these always use AND logic)
      if (filters.minSubscribers !== undefined) {
        query = query.gte('subscribers', filters.minSubscribers)
      }

      if (filters.maxSubscribers !== undefined) {
        query = query.lte('subscribers', filters.maxSubscribers)
      }

      if (filters.nsfw !== undefined) {
        query = query.eq('nsfw', filters.nsfw)
      }

      if (filters.over18 !== undefined) {
        query = query.eq('over18', filters.over18)
      }

      // Apply sorting with secondary sort by ID for stable pagination
      const orderBy = filters.orderBy || 'subscribers'
      const order = filters.order || 'desc'
      query = query.order(orderBy, {
        ascending: order === 'asc',
        nullsFirst: false // Treat NULL values as 0 (put them last when descending)
      })
        .order('id', { ascending: true }) // Secondary sort ensures stable ordering

      // Apply pagination AFTER filtering and sorting
      query = query.range(pageParam, pageParam + PAGE_SIZE - 1)

      // Log the query being executed
      console.log('🚀 Executing Supabase query...')

      const { data, error } = await query

      if (error) {
        // Simplify error logging to get actual error details
        const errorMessage = error?.message || 'Failed to fetch subreddits'
        const errorCode = error?.code || 'UNKNOWN'

        console.error('❌ Supabase query failed:')
        console.error('  Message:', errorMessage)
        console.error('  Code:', errorCode)
        console.error('  Details:', error?.details || 'No details')
        console.error('  Hint:', error?.hint || 'No hint')
        console.error('  Filters:', JSON.stringify(filters))
        console.error('  Full error:', error)

        // Log the error in a way that will definitely show in the console
        logger.error('Failed to fetch subreddits for review:', {
          title: errorMessage,
          code: errorCode,
          filters,
          pageParam
        })

        throw new Error(errorMessage)
      }

      console.log(`✅ Fetched ${data?.length || 0} subreddits`, JSON.stringify({
        search: filters.search || 'none',
        totalFetched: data?.length || 0,
        pageParam,
        firstFewResults: data?.slice(0, 3)?.map(s => ({ id: s.id, display_name: s.display_name, review: s.review }))
      }, null, 2))

      return data || []
    },
    {
      pageSize: PAGE_SIZE,
      staleTime: filters.search ? 0 : 60 * 1000, // No cache when searching, 1 minute otherwise
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for fetching review statistics
 */
export function useReviewStats() {
  return useSupabaseQuery<ReviewStats>(
    queryKeys.reddit.counts(),
    async () => {
      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }

      // Run all counts in parallel - excluding User Feed from total
      const today = new Date().toISOString().split('T')[0]
      const [total, ok, noSeller, nonRelated, unreviewed, newToday] = await Promise.all([
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).neq('review', 'User Feed'),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).eq('review', 'Ok'),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).eq('review', 'No Seller'),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).eq('review', 'Non Related'),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).is('review', null),
        // New today across all states
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).gte('created_utc', today),
      ])

      return {
        total: total.count || 0,
        ok: ok.count || 0,
        noSeller: noSeller.count || 0,
        nonRelated: nonRelated.count || 0,
        userFeed: 0, // Not included in stats
        unreviewed: unreviewed.count || 0,
        newToday: newToday.count || 0,
      }
    },
    {
      staleTime: 30 * 1000, // 30 seconds for stats
      refetchInterval: 60 * 1000, // Refetch every minute
    }
  )
}

/**
 * Mutation for updating subreddit review status
 */
export function useUpdateReviewStatus() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      subredditId,
      review,
      previousFilter,
    }: {
      subredditId: number
      review: ReviewStatus
      previousFilter?: ReviewStatus
    }) => {
      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }

      logger.info('📝 Attempting review status update:', {
        subredditId,
        review,
        previousFilter
      })

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .update({
          review,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subredditId)
        .select()
        .single()

      if (error) {
        logger.error('❌ Review status update failed:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code
        })
        throw error
      }

      logger.info('✅ Review status update successful:', {
        data
      })

      return { data, previousFilter }
    },
    // Removed optimistic update to prevent items from reappearing after fade-out
    // The immediate refetch in onSettled handles the UI update cleanly
    onError: () => {
      addToast({
        type: 'error',
        title: 'Failed to update review status',
      })
    },
    onSuccess: () => {
      // Invalidate stats since we changed review status
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })

      addToast({
        type: 'success',
        title: 'Review status updated',
      })
    },
    onSettled: () => {
      // Delay refetch to allow fade animation to complete
      setTimeout(() => {
        // Invalidate all review queries to ensure data consistency
        // Since the query key now includes all filters, we need to invalidate broadly
        queryClient.invalidateQueries({
          queryKey: queryKeys.reddit.reviews(),
          refetchType: 'active' // Force immediate refetch
        })
      }, 350) // Slightly longer than the 300ms fade animation
    },
  })
}

/**
 * Mutation for bulk review updates
 */
export function useBulkUpdateReview() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      subredditIds,
      review,
    }: {
      subredditIds: number[]
      review: ReviewStatus
    }) => {
      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }

      logger.info('📝 Attempting bulk review status update:', {
        subredditIds,
        review,
        count: subredditIds.length
      })

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .update({
          review,
          updated_at: new Date().toISOString(),
        })
        .in('id', subredditIds)
        .select()

      if (error) {
        logger.error('❌ Bulk review status update failed:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code
        })
        throw error
      }

      logger.info('✅ Bulk review status update successful:', {
        updatedCount: data?.length || 0,
        data
      })

      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate all reddit queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.all() })

      addToast({
        type: 'success',
        title: `Updated ${variables.subredditIds.length} subreddit reviews`,
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Failed to update reviews',
      })
    },
  })
}

/**
 * Mutation for removing subreddit
 */
export function useRemoveSubreddit() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (subredditId: number) => {
      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }

      const { error } = await supabase
        .from('reddit_subreddits')
        .delete()
        .eq('id', subredditId)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate all reddit queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.all() })

      addToast({
        type: 'success',
        title: 'Subreddit removed',
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Failed to remove subreddit',
      })
    },
  })
}

/**
 * Hook for fetching subreddit details
 */
export function useSubredditDetails(subredditId: number | null) {
  return useSupabaseQuery(
    queryKeys.reddit.subreddit(subredditId!),
    async () => {
      if (!subredditId) return null

      if (!supabase) {
        const error = new Error('Supabase client not available - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        logger.error('❌ Supabase client initialization failed:', {
          title: error.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        })
        throw error
      }
      const { data, error } = await supabase
        .from('reddit_subreddits')
        .select('*')
        .eq('id', subredditId)
        .single()

      if (error) throw error
      return data
    },
    {
      enabled: !!subredditId,
      staleTime: 5 * 60 * 1000, // 5 minutes for details
    }
  )
}

/**
 * Prefetch subreddit details for hover
 */
export function usePrefetchSubredditOnHover() {
  const queryClient = useQueryClient()

  return (subredditId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.reddit.subreddit(subredditId),
      queryFn: async () => {
        if (!supabase) {
          logger.error('Supabase client not available')
          throw new Error('Supabase client not available')
        }
        const { data, error } = await supabase
          .from('reddit_subreddits')
          .select('*')
          .eq('id', subredditId)
          .single()

        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }
}