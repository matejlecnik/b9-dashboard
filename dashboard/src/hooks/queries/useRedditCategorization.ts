/**
 * React Query hooks for Reddit Categorization page
 * Handles subreddit fetching, categorization, and infinite scrolling
 */

import { useInfiniteSupabaseQuery, useSupabaseQuery } from './base'
import { Subreddit } from '@/types/subreddit'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { useMutation } from '@tanstack/react-query'


const PAGE_SIZE = 50

interface SubredditFilters {
  search?: string
  tags?: string[]
  review?: string
  category?: string
  hasCategory?: boolean
  showUntaggedOnly?: boolean
  orderBy?: 'subscribers' | 'created_at' | 'primary_category'
  order?: 'asc' | 'desc'
}

interface TagCount {
  untagged: number
  tagged: number
}

/**
 * Hook for fetching categorized subreddits with infinite scroll
 */
export function useCategorizedSubreddits(filters: SubredditFilters = {}) {
  return useInfiniteSupabaseQuery<Subreddit[]>(
    queryKeys.reddit.subreddits(filters),
    async ({ pageParam = 0 }) => {
      if (!supabase) {
        logger.error('Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        throw new Error('Supabase client not initialized. Please check your environment variables.')
      }

      // Use RPC function for tag filtering or untagged filtering
      if ((filters.tags && filters.tags.length > 0) || filters.showUntaggedOnly) {
        try {
          const { data, error } = await supabase.rpc('filter_subreddits_by_tags', {
            tag_filters: filters.tags || [],
            search_term: filters.search || null,
            review_status: filters.review || null,
            show_untagged_only: filters.showUntaggedOnly || false,
            limit_count: PAGE_SIZE,
            offset_count: pageParam
          })

          if (error) {
            logger.warn('RPC function failed, falling back to direct query:', error)
            // Fallback to direct query if RPC fails
            throw error
          }

          return data || []
        } catch {
          // Fallback to direct query when RPC function fails
          logger.info('Using fallback query for tag filtering')

          let query = supabase
            .from('reddit_subreddits')
            .select('*')
            .range(pageParam, pageParam + PAGE_SIZE - 1)

          // Apply review filter
          if (filters.review) {
            query = query.eq('review', filters.review)
          }

          // Apply search filter
          if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,public_description.ilike.%${filters.search}%`)
          }

          // Apply tag filters for fallback
          if (filters.showUntaggedOnly) {
            // Show only untagged items
            query = query.or('tags.is.null,tags.eq.[]')
          } else if (filters.tags && filters.tags.length > 0) {
            // Show items with specific tags - this is limited in fallback mode
            // We can't properly filter JSONB arrays without RPC, so we'll just show all tagged items
            query = query.not('tags', 'is', null).neq('tags', '[]')
          }

          // Apply sorting with secondary sort for stability
          query = query
            .order('subscribers', { ascending: false, nullsFirst: false })
            .order('id', { ascending: true })

          const { data, error } = await query

          if (error) {
            logger.error('Fallback query also failed:', error)
            throw error
          }

          // If we're filtering by specific tags in fallback mode, do client-side filtering
          if (filters.tags && filters.tags.length > 0 && data) {
            return data.filter(item => {
              if (!Array.isArray(item.tags)) return false
              return item.tags.some((tag: string) => filters.tags?.includes(tag))
            })
          }

          return data || []
        }
      }

      // Fallback to regular query if no tag filters
      let query = supabase
        .from('reddit_subreddits')
        .select('*')
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      // Apply filters
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      if (filters.review) {
        query = query.eq('review', filters.review)
      }

      // Apply sorting with secondary sort by id for stability
      const orderBy = filters.orderBy || 'subscribers'
      const order = filters.order || 'desc'
      query = query
        .order(orderBy, { ascending: order === 'asc', nullsFirst: false })
        .order('id', { ascending: true })

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch subreddits:', error instanceof Error ? error.message : String(error))
        throw error
      }

      return data || []
    },
    {
      pageSize: PAGE_SIZE,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

/**
 * Hook for fetching tag counts based on tags JSONB array field
 */
export function useTagCounts() {
  return useSupabaseQuery<TagCount>(
    queryKeys.reddit.counts(),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        throw new Error('Supabase client not initialized. Please check your environment variables.')
      }

      // Use count queries for better performance
      // Count untagged (tags is null or empty array)
      const { count: untagged, error: untaggedError } = await supabase
        .from('reddit_subreddits')
        .select('*', { count: 'exact', head: true })
        .eq('review', 'Ok')
        .or('tags.is.null,tags.eq.[]')

      if (untaggedError) {
        logger.error('Failed to fetch untagged count:', untaggedError)
        throw untaggedError
      }

      // Count tagged (tags is not null and not empty array)
      const { count: tagged, error: taggedError } = await supabase
        .from('reddit_subreddits')
        .select('*', { count: 'exact', head: true })
        .eq('review', 'Ok')
        .not('tags', 'is', null)
        .neq('tags', '[]')

      if (taggedError) {
        logger.error('Failed to fetch tagged count:', taggedError)
        throw taggedError
      }

      return {
        untagged: untagged || 0,
        tagged: tagged || 0,
      }
    },
    {
      staleTime: 0, // Always consider stale to force fresh data
      refetchOnMount: 'always', // Always refetch on mount
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      refetchInterval: 60 * 1000, // Still refetch every minute for live updates
    }
  )
}

/**
 * Hook for fetching available tags/categories
 */
export function useAvailableTags() {
  return useSupabaseQuery<string[]>(
    queryKeys.reddit.filters(),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
        throw new Error('Supabase client not initialized. Please check your environment variables.')
      }

      try {
        // Try to use the RPC function for better performance
        const { data, error } = await supabase.rpc('get_unique_tags')

        if (error) {
          logger.warn('RPC function get_unique_tags failed, falling back to direct query:', error)
          throw error
        }

        // Extract just the tag names from the result
        return (data || []).map((item: { tag: string; count: number }) => item.tag).sort()
      } catch {
        // Fallback to the original method if RPC fails
        logger.info('Using fallback method for fetching tags')

        // Get all tags from JSONB arrays (with explicit limit to ensure all rows are fetched)
        const { data, error } = await supabase
          .from('reddit_subreddits')
          .select('tags')
          .eq('review', 'Ok')
          .not('tags', 'is', null)
          .gt('tags', '[]')
          .limit(10000) // Explicit limit to fetch all subreddits (default is 1000)

        if (error) {
          logger.error('Failed to fetch tags', error)
          throw error
        }

        // Extract and flatten all tags
        const allTags = new Set<string>()
        data?.forEach(item => {
          if (Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => {
              if (typeof tag === 'string') {
                allTags.add(tag)
              }
            })
          }
        })

        // Return sorted unique tags
        return Array.from(allTags).sort()
      }
    },
    {
      staleTime: 30 * 1000, // 30 seconds for tags to ensure fresh data
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
    }
  )
}

/**
 * Mutation for updating subreddit tags
 */
export function useUpdateSubredditTags() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      subredditId,
      tags
    }: {
      subredditId: number
      tags: string[]
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      logger.info('📝 Attempting tags update:', {
        subredditId,
        tags
      })

      // Determine primary_category based on tags
      // If tags is empty, clear primary_category for consistency
      let primary_category = null
      if (tags.length > 0) {
        // Extract category from first tag (e.g., "niche:general" -> "niche")
        const firstTag = tags[0]
        if (firstTag.includes(':')) {
          primary_category = firstTag.split(':')[0]
        }
      }

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .update({
          tags,
          primary_category,
          tags_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subredditId)
        .select()
        .single()

      if (error) {
        logger.error('❌ Tags update failed:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code
        })
        throw error
      }

      logger.info('✅ Tags update successful:', {
        data
      })

      return data
    },
    onMutate: async ({ subredditId, tags }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.reddit.all() })

      // Snapshot the previous value
      const previousSubreddits = queryClient.getQueryData(queryKeys.reddit.subreddits())

      // Optimistically update the subreddit - use reddit.all() to match all reddit queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.reddit.all(), exact: false },
        (old: unknown) => {
          if (!old) return old

          // Handle infinite query structure
          const data = old as { pages?: Subreddit[][]; pageParams?: unknown[] } | Subreddit[] | unknown
          if (data && typeof data === 'object' && 'pages' in data && Array.isArray(data.pages)) {
            return {
              ...data,
              pages: data.pages.map((page: Subreddit[]) =>
                page.map((subreddit) =>
                  subreddit.id === subredditId
                    ? { ...subreddit, tags }
                    : subreddit
                )
              ),
            }
          }

          // Handle regular query structure
          if (Array.isArray(old)) {
            return old.map((subreddit: Subreddit) =>
              subreddit.id === subredditId
                ? { ...subreddit, tags }
                : subreddit
            )
          }

          return old
        }
      )

      return { previousSubreddits }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSubreddits) {
        queryClient.setQueryData(
          queryKeys.reddit.subreddits(),
          context.previousSubreddits
        )
      }

      addToast({
        type: 'error',
        title: 'Failed to update tags',
      })
    },
    onSuccess: () => {
      // Immediately invalidate all reddit queries to force UI update
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.all() })

      // Invalidate counts since we changed categories
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.counts() })

      addToast({
        type: 'success',
        title: 'Tags updated successfully',
      })
    },
  })
}

/**
 * Mutation for bulk updating tags
 */
export function useBulkUpdateTags() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      subredditIds,
      tags,
    }: {
      subredditIds: number[]
      tags: string[]
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      logger.info('📝 Attempting bulk tags update:', {
        subredditIds,
        tags,
        count: subredditIds.length
      })

      // Determine primary_category based on tags
      let primary_category = null
      if (tags.length > 0) {
        const firstTag = tags[0]
        if (firstTag.includes(':')) {
          primary_category = firstTag.split(':')[0]
        }
      }

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .update({
          tags,
          primary_category,
          tags_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', subredditIds)
        .select()

      if (error) {
        logger.error('❌ Bulk tags update failed:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code
        })
        throw error
      }

      logger.info('✅ Bulk tags update successful:', {
        updatedCount: data?.length || 0,
        data
      })

      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate all reddit queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.all() })

      addToast({
        type: 'success',
        title: `Updated ${variables.subredditIds.length} subreddits`,
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Failed to update tags',
      })
    },
  })
}

/**
 * Mutation for AI categorization
 */
export function useAICategorization() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      subredditIds,
      batchSize = 10,
      limit,
      onProgress,
    }: {
      subredditIds?: number[]  // Made optional - backend can find uncategorized
      batchSize?: number
      limit?: number  // Total items to process (when subredditIds not provided)
      onProgress?: (progress: number) => void
    }) => {
      const results = []

      try {
        // If no specific IDs provided, let backend handle all uncategorized
        if (!subredditIds || subredditIds.length === 0) {
          logger.info('Starting AI categorization for all uncategorized items', { limit })

          const requestBody = {
            subredditIds: null,  // Backend will find uncategorized
            batchSize,
            limit: limit || 100
          }

          console.log('🚀 [AI Categorization] About to send fetch request', {
            url: '/api/reddit/categorization/tags/start',
            method: 'POST',
            body: requestBody
          })

          let response
          try {
            response = await fetch('/api/reddit/categorization/tags/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            })

            console.log('📡 [AI Categorization] Fetch response received', {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: Object.fromEntries(response.headers.entries())
            })
          } catch (fetchError) {
            console.error('❌ [AI Categorization] Fetch failed', {
              error: fetchError,
              errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError)
            })
            throw fetchError
          }

          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ [AI Categorization] Response not OK', {
              status: response.status,
              errorText
            })

            let errorData
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { error: errorText }
            }

            if (errorData.configuration_needed) {
              throw new Error('AI service not configured. Please set up the backend service or configure NEXT_PUBLIC_API_URL.')
            }
            throw new Error(errorData.error || 'AI categorization failed')
          }

          const data = await response.json()

          console.log('✅ [AI Categorization] Response data received', {
            success: data.success,
            resultsCount: data.results?.length,
            stats: data.stats
          })

          // Report 100% progress for single-shot backend processing
          if (onProgress) {
            onProgress(100)
          }

          return data.results || []
        }

        // Original behavior: Process specific IDs in batches
        for (let i = 0; i < subredditIds.length; i += batchSize) {
          const batch = subredditIds.slice(i, i + batchSize)

          const response = await fetch('/api/reddit/categorization/tags/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subredditIds: batch,
              batchSize,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            // Check if it's a configuration error
            if (errorData.configuration_needed) {
              throw new Error('AI service not configured. Please set up the backend service or configure NEXT_PUBLIC_API_URL.')
            }
            throw new Error(errorData.error || 'AI categorization failed')
          }

          const data = await response.json()
          if (data.results) {
            results.push(...data.results)
          }

          // Report progress
          if (onProgress) {
            const progress = Math.round(((i + batch.length) / subredditIds.length) * 100)
            onProgress(progress)
          }
        }
      } catch (error) {
        logger.error('AI categorization error:', error)
        // Re-throw with more specific error message
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Failed to process AI categorization')
      }

      return results
    },
    onSuccess: () => {
      // Invalidate all reddit queries to reflect new categories
      queryClient.invalidateQueries({ queryKey: queryKeys.reddit.all() })

      addToast({
        type: 'success',
        title: 'AI categorization completed',
      })
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'AI categorization failed'
      addToast({
        type: 'error',
        title: errorMessage,
      })
    },
  })
}

/**
 * Prefetch subreddit details for modal
 */
export function usePrefetchSubredditDetails() {
  const queryClient = useQueryClient()

  return async (subredditId: number) => {
    await queryClient.prefetchQuery({
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

// Export aliases for backward compatibility
export const useUpdateSubredditCategory = useUpdateSubredditTags
export const useBulkUpdateCategories = useBulkUpdateTags