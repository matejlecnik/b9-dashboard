/**
 * React Query hooks for Instagram Creator Review page
 * Handles creator fetching, review, and analytics
 */

import { useQueryClient, useMutation } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/ui/toast'
import { useInfiniteSupabaseQuery, useSupabaseQuery } from '@/hooks/queries/base'

const PAGE_SIZE = 50

export type CreatorStatus = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'blacklisted'

export interface Creator {
  id: number
  username: string
  full_name?: string
  bio?: string
  followers: number
  following: number
  posts: number
  engagement_rate?: number
  review_status: CreatorStatus
  categories?: string[]
  discovered_at: string
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
  profile_pic_url?: string
  is_verified?: boolean
}

interface CreatorFilters {
  search?: string
  status?: CreatorStatus
  minFollowers?: number
  maxFollowers?: number
  minEngagement?: number
  categories?: string[]
  isVerified?: boolean
  orderBy?: 'followers' | 'engagement_rate' | 'discovered_at'
  order?: 'asc' | 'desc'
}

export interface CreatorStats {
  total: number
  pending: number
  approved: number
  rejected: number
  needsReview: number
  blacklisted: number
}

/**
 * Hook for fetching Instagram creators with infinite scroll
 */
export function useInstagramCreators(filters: CreatorFilters = {}) {
  return useInfiniteSupabaseQuery<Creator[]>(
    queryKeys.instagram.creators(filters),
    async ({ pageParam = 0 }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('instagram_creators')
        .select('*')
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      // Apply filters
      if (filters.search) {
        query = query.or(
          `username.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`
        )
      }

      if (filters.status) {
        query = query.eq('review_status', filters.status)
      }

      if (filters.minFollowers !== undefined) {
        query = query.gte('followers', filters.minFollowers)
      }

      if (filters.maxFollowers !== undefined) {
        query = query.lte('followers', filters.maxFollowers)
      }

      if (filters.minEngagement !== undefined) {
        query = query.gte('engagement_rate', filters.minEngagement)
      }

      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories)
      }

      if (filters.isVerified !== undefined) {
        query = query.eq('is_verified', filters.isVerified)
      }

      // Apply sorting
      const orderBy = filters.orderBy || 'followers'
      const order = filters.order || 'desc'
      query = query.order(orderBy, { ascending: order === 'asc' })

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch Instagram creators', error)
        throw error
      }

      return data || []
    },
    {
      pageSize: PAGE_SIZE,
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for fetching creator statistics
 */
export function useCreatorStats() {
  return useSupabaseQuery<CreatorStats>(
    queryKeys.instagram.metrics(),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      // Run all counts in parallel
      const [total, pending, approved, rejected, needsReview, blacklisted] = await Promise.all([
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'approved'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'rejected'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'needs_review'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'blacklisted'),
      ])

      return {
        total: total.count || 0,
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
        needsReview: needsReview.count || 0,
        blacklisted: blacklisted.count || 0,
      }
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    }
  )
}

/**
 * Hook for fetching related creators
 */
export function useRelatedCreators(creatorId: number) {
  return useSupabaseQuery<Creator[]>(
    queryKeys.instagram.relatedCreators(creatorId),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      // First get the creator's data
      const { data: creator } = await supabase
        .from('instagram_creators')
        .select('categories, followers')
        .eq('id', creatorId)
        .single()

      if (!creator) return []

      // Find similar creators based on categories and follower count
      const { data, error } = await supabase
        .from('instagram_creators')
        .select('*')
        .neq('id', creatorId)
        .overlaps('categories', creator.categories || [])
        .gte('followers', creator.followers * 0.5)
        .lte('followers', creator.followers * 2)
        .limit(20)

      if (error) {
        logger.error('Failed to fetch related creators', error)
        throw error
      }

      return data || []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!creatorId,
    }
  )
}

/**
 * Mutation for updating creator review status
 */
export function useUpdateCreatorStatus() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      creatorId,
      status,
      notes,
    }: {
      creatorId: number
      status: CreatorStatus
      notes?: string
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: status,
          notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', creatorId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ creatorId, status, notes }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.instagram.all() })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKeys.instagram.creators())

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: queryKeys.instagram.creators() },
        (old) => {
          if (!old) return old

          // Handle infinite query structure
          const data = old as { pages?: Creator[][]; pageParams?: unknown[] }
          if (data.pages) {
            return {
              ...data,
              pages: data.pages.map((page: Creator[]) =>
                page.map((creator) =>
                  creator.id === creatorId
                    ? {
                        ...creator,
                        review_status: status,
                        notes,
                        reviewed_at: new Date().toISOString(),
                      }
                    : creator
                )
              ),
            }
          }

          return old
        }
      )

      return { previousData }
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.instagram.creators(), context.previousData)
      }

      addToast({
        type: 'error',
        title: 'Failed to update creator status',
      })
    },
    onSuccess: () => {
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })

      addToast({
        type: 'success',
        title: 'Creator status updated',
      })
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.creators() })
    },
  })
}

/**
 * Mutation for bulk status updates
 */
export function useBulkUpdateCreatorStatus() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      creatorIds,
      status,
    }: {
      creatorIds: number[]
      status: CreatorStatus
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: status,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', creatorIds)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate all Instagram queries
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.all() })

      addToast({
        type: 'success',
        title: `Updated ${variables.creatorIds.length} creators`,
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Failed to update creators',
      })
    },
  })
}

/**
 * Hook for fetching creator analytics
 */
export function useCreatorAnalytics(creatorId: number) {
  return useSupabaseQuery(
    queryKeys.instagram.creatorAnalytics(creatorId),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('instagram_creator_analytics')
        .select('*')
        .eq('creator_id', creatorId)
        .order('date', { ascending: false })
        .limit(30)

      if (error) {
        logger.error('Failed to fetch creator analytics', error)
        throw error
      }

      return data || []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!creatorId,
    }
  )
}

/**
 * Prefetch creator details for hover
 */
export function usePrefetchCreatorOnHover() {
  const queryClient = useQueryClient()

  return (creatorId: number) => {
    // Prefetch creator details
    queryClient.prefetchQuery({
      queryKey: queryKeys.instagram.creator(creatorId),
      queryFn: async () => {
        if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }
        const { data, error } = await supabase
          .from('instagram_creators')
          .select('*')
          .eq('id', creatorId)
          .single()

        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000,
    })

    // Prefetch related creators
    queryClient.prefetchQuery({
      queryKey: queryKeys.instagram.relatedCreators(creatorId),
      queryFn: async () => {
        if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

        const { data: creator } = await supabase
          .from('instagram_creators')
          .select('categories, followers')
          .eq('id', creatorId)
          .single()

        if (!creator) return []

        const { data } = await supabase
          .from('instagram_creators')
          .select('*')
          .neq('id', creatorId)
          .overlaps('categories', creator.categories || [])
          .gte('followers', creator.followers * 0.5)
          .lte('followers', creator.followers * 2)
          .limit(10)

        return data || []
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}