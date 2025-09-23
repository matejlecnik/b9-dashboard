import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCallback } from 'react'

interface PostingFilters {
  page: number
  searchTerm: string
  sfwOnly: boolean
  verifiedOnly: boolean
  sortBy: 'avg_upvotes' | 'min_post_karma' | 'engagement'
  sortDirection: 'asc' | 'desc'
  accountTags?: string[]
}

interface PostingCounts {
  total: number
  sfw: number
  nsfw: number
  verified: number
}

const PAGE_SIZE = 30

// Query key factory for consistent cache keys
export const postingKeys = {
  all: ['posting'] as const,
  lists: () => [...postingKeys.all, 'list'] as const,
  list: (filters: PostingFilters) => [...postingKeys.lists(), filters] as const,
  counts: () => [...postingKeys.all, 'counts'] as const,
  count: (accountTags?: string[], searchTerm?: string) =>
    [...postingKeys.counts(), { accountTags, searchTerm }] as const,
  creators: () => [...postingKeys.all, 'creators'] as const,
}

// Fetch subreddits with server-side pagination and filtering
async function fetchSubreddits(filters: PostingFilters) {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data: subreddits, error } = await supabase.rpc('filter_subreddits_for_posting', {
    tag_array: filters.accountTags?.length ? filters.accountTags : null,
    search_term: filters.searchTerm?.trim() || null,
    sfw_only: filters.sfwOnly,
    verified_only: filters.verifiedOnly,
    sort_by: filters.sortBy,
    sort_order: filters.sortDirection,
    limit_count: PAGE_SIZE,
    offset_count: filters.page * PAGE_SIZE
  })

  if (error) {
    console.error('Supabase RPC error:', error)
    throw error
  }

  return {
    subreddits: subreddits || [],
    hasMore: (subreddits?.length || 0) === PAGE_SIZE,
    page: filters.page
  }
}

// Fetch counts with optimized single query
async function fetchCounts(accountTags?: string[], searchTerm?: string): Promise<PostingCounts> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase.rpc('get_posting_page_counts', {
    tag_array: accountTags?.length ? accountTags : null,
    search_term: searchTerm?.trim() || null
  })

  if (error) {
    console.error('Error fetching counts:', error)
    throw error
  }

  if (data && data[0]) {
    return {
      total: Number(data[0].total_count) || 0,
      sfw: Number(data[0].sfw_count) || 0,
      nsfw: Number(data[0].nsfw_count) || 0,
      verified: Number(data[0].verified_count) || 0
    }
  }

  return { total: 0, sfw: 0, nsfw: 0, verified: 0 }
}

// Fetch creators/users
async function fetchCreators() {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data: creatorsData, error } = await supabase
    .from('reddit_users')
    .select(`
      *,
      models!inner (
        id,
        stage_name,
        status,
        assigned_tags
      )
    `)
    .not('model_id', 'is', null)
    .eq('status', 'active')
    .order('username', { ascending: true })

  if (error) {
    console.error('Error fetching creators:', error)
    throw error
  }

  return creatorsData?.map(creator => ({
    ...creator,
    model: creator.models?.[0] || null
  })) || []
}

// Main hook for posting page subreddits
export function usePostingSubreddits(filters: PostingFilters) {
  return useQuery({
    queryKey: postingKeys.list(filters),
    queryFn: () => fetchSubreddits(filters),
    // Keep data fresh for 2 minutes (matches QueryProvider staleTime)
    staleTime: 2 * 60 * 1000,
    // Keep previous data while fetching next page
    placeholderData: (previousData) => previousData,
  })
}

// Hook for fetching counts
export function usePostingCounts(accountTags?: string[], searchTerm?: string) {
  return useQuery({
    queryKey: postingKeys.count(accountTags, searchTerm),
    queryFn: () => fetchCounts(accountTags, searchTerm),
    staleTime: 2 * 60 * 1000,
  })
}

// Hook for fetching creators
export function usePostingCreators() {
  return useQuery({
    queryKey: postingKeys.creators(),
    queryFn: fetchCreators,
    staleTime: 5 * 60 * 1000, // Cache creators for 5 minutes
  })
}

// Hook for removing a creator (with optimistic update)
export function useRemoveCreator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (creatorId: number) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { error } = await supabase
        .from('reddit_users')
        .update({ status: 'inactive' })
        .eq('id', creatorId)

      if (error) throw error
      return creatorId
    },
    // Optimistic update
    onMutate: async (creatorId) => {
      await queryClient.cancelQueries({ queryKey: postingKeys.creators() })

      const previousCreators = queryClient.getQueryData(postingKeys.creators())

      queryClient.setQueryData(postingKeys.creators(), (old: any[]) =>
        old?.filter(creator => creator.id !== creatorId) || []
      )

      return { previousCreators }
    },
    // Rollback on error
    onError: (err, creatorId, context) => {
      if (context?.previousCreators) {
        queryClient.setQueryData(postingKeys.creators(), context.previousCreators)
      }
    },
    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postingKeys.creators() })
    },
  })
}

// Utility to prefetch next page
export function usePrefetchNextPage(filters: PostingFilters, hasMore: boolean) {
  const queryClient = useQueryClient()

  return useCallback(() => {
    if (hasMore) {
      const nextPageFilters = { ...filters, page: filters.page + 1 }
      queryClient.prefetchQuery({
        queryKey: postingKeys.list(nextPageFilters),
        queryFn: () => fetchSubreddits(nextPageFilters),
        staleTime: 2 * 60 * 1000,
      })
    }
  }, [queryClient, filters, hasMore])
}

// Invalidate all posting queries (useful after mutations)
export function useInvalidatePostingQueries() {
  const queryClient = useQueryClient()

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: postingKeys.all })
  }, [queryClient])
}