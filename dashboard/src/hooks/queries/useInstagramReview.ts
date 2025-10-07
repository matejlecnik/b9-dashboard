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
import type { ViralReel, ViralReelsFilters } from '@/lib/supabase/viral-reels'

const PAGE_SIZE = 50

// Instagram creator review status values (matches database schema)
// NULL = pending review, 'ok' = approved, 'non_related' = rejected
export type CreatorStatus = 'ok' | 'non_related' | null

export interface Creator {
  id: number
  ig_user_id?: string
  username: string
  full_name?: string
  biography?: string  // DB column name
  followers: number
  following: number
  posts_count: number  // DB column name
  media_count?: number
  engagement_rate_cached?: number  // DB column name
  avg_engagement_rate?: number
  review_status: CreatorStatus
  discovery_date: string  // DB column name
  discovery_source?: string
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
  profile_pic_url?: string
  is_private?: boolean
  is_verified?: boolean
  is_business_account?: boolean
  avg_likes_per_post_cached?: number  // DB column name
  avg_comments_per_post_cached?: number
  avg_likes_per_reel_cached?: number
  avg_comments_per_reel_cached?: number
  avg_saves_per_post_cached?: number
  avg_shares_per_post_cached?: number
  avg_views_per_reel_cached?: number
  viral_content_count_cached?: number
  posting_frequency_per_week?: number
  follower_growth_rate_weekly?: number
  follower_growth_rate_daily?: number
  save_to_like_ratio?: number
  last_post_days_ago?: number
  external_url?: string
  external_url_type?: string
  best_content_type?: string
  posting_consistency_score?: number
  reels_count?: number
  niche?: string
}

interface CreatorFilters {
  search?: string
  status?: CreatorStatus
  minFollowers?: number
  maxFollowers?: number
  minEngagement?: number
  categories?: string[]
  isVerified?: boolean
  orderBy?: 'followers' | 'engagement_rate_cached' | 'discovery_date'
  order?: 'asc' | 'desc'
}

export interface CreatorStats {
  total: number
  pending: number  // NULL values
  approved: number  // 'ok' values (lowercase in DB)
  rejected: number  // 'non_related' values
}

/**
 * Hook for fetching Instagram creators with infinite scroll
 */
export function useInstagramCreators(filters: CreatorFilters = {}) {
  // Add explicit logging for debugging
  console.log('🚀 useInstagramCreators hook called', {
    filters,
    supabaseAvailable: !!supabase
  })

  return useInfiniteSupabaseQuery<Creator[]>(
    queryKeys.instagram.creators(filters),
    async ({ pageParam = 0 }) => {
      console.log('🔥 useInstagramCreators query function executing', {
        pageParam,
        filters,
        supabaseExists: !!supabase
      })

      if (!supabase) {
        logger.error('Supabase client not available')
        console.error('❌ Supabase client is null/undefined')
        throw new Error('Supabase client not available')
      }

      console.log('📚 Building Supabase query...')

      let query = supabase
        .from('instagram_creators')
        .select(`
          id,
          ig_user_id,
          username,
          full_name,
          biography,
          profile_pic_url,
          followers,
          following,
          posts_count,
          media_count,
          is_verified,
          is_private,
          is_business_account,
          review_status,
          reviewed_at,
          reviewed_by,
          discovery_source,
          discovery_date,
          engagement_rate_cached,
          avg_engagement_rate,
          avg_views_per_reel_cached,
          viral_content_count_cached,
          avg_likes_per_post_cached,
          avg_comments_per_post_cached,
          avg_likes_per_reel_cached,
          avg_comments_per_reel_cached,
          avg_saves_per_post_cached,
          avg_shares_per_post_cached,
          posting_frequency_per_week,
          follower_growth_rate_weekly,
          follower_growth_rate_daily,
          save_to_like_ratio,
          last_post_days_ago,
          external_url,
          external_url_type,
          best_content_type,
          posting_consistency_score,
          reels_count,
          niche
        `)
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      // Apply filters
      if (filters.search) {
        query = query.or(
          `username.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,biography.ilike.%${filters.search}%`
        )
      }

      if (filters.status !== undefined) {
        // Handle NULL values (pending) vs actual status values
        if (filters.status === null) {
          query = query.is('review_status', null)
        } else {
          query = query.eq('review_status', filters.status)
        }
      }

      if (filters.minFollowers !== undefined) {
        query = query.gte('followers', filters.minFollowers)
      }

      if (filters.maxFollowers !== undefined) {
        query = query.lte('followers', filters.maxFollowers)
      }

      if (filters.minEngagement !== undefined) {
        query = query.gte('engagement_rate_cached', filters.minEngagement)
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

      console.log('🔍 Executing Supabase query with filters:', {
        status: filters.status,
        search: filters.search,
        orderBy,
        order,
        pageRange: `${pageParam} to ${pageParam + PAGE_SIZE - 1}`
      })

      const { data, error } = await query

      // Debug logging
      console.log('🔍 Instagram Query Debug:', {
        pageParam,
        filters,
        supabaseAvailable: !!supabase,
        dataReturned: data?.length || 0,
        error: error?.message || null
      })

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
      enabled: true, // Explicitly enable the query
      refetchOnMount: true,
      refetchOnWindowFocus: false
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
      // Pending = NULL values, Approved = 'ok', Rejected = 'non_related'
      const [total, pending, ok, nonRelated] = await Promise.all([
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).is('review_status', null),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'ok'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'non_related'),
      ])

      return {
        total: total.count || 0,
        pending: pending.count || 0,
        approved: ok.count || 0,
        rejected: nonRelated.count || 0,
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

// ============================================================================
// VIRAL CONTENT HOOKS
// ============================================================================

export interface ViralReelsStats {
  total_reels: number
  total_viral: number
  ultra_viral: number
  mega_viral?: number
  avg_views: number
  avg_likes: number
  max_views: number
}

export interface TopCreator {
  username: string
  creator_id: string
  profile_pic_url: string | null
  followers: number
  viral_count: number
}

interface ReelWithCreator {
  creator_id: string
  creator_username: string
  creator?: {
    ig_user_id: string
    username: string
    profile_pic_url: string
    followers: number
  } | Array<{
    ig_user_id: string
    username: string
    profile_pic_url: string
    followers: number
  }>
}

/**
 * Hook for fetching viral reels with infinite scroll
 */
export function useViralReels(filters: ViralReelsFilters = {}) {
  return useInfiniteSupabaseQuery<ViralReel[]>(
    queryKeys.instagram.viralReels(filters),
    async ({ pageParam = 0 }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('instagram_reels')
        .select(`
          *,
          creator:instagram_creators(
            ig_user_id,
            username,
            profile_pic_url,
            followers,
            full_name
          )
        `)

      // Apply view count filters
      const minViews = filters.minViews || 50000
      query = query.gte('play_count', minViews)

      if (filters.maxViews) {
        query = query.lte('play_count', filters.maxViews)
      }

      // Apply creator filter
      if (filters.creatorId) {
        query = query.eq('creator_id', filters.creatorId)
      }

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('taken_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('taken_at', filters.dateTo)
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'views'
      const sortOrder = filters.sortOrder || 'desc'
      const ascending = sortOrder === 'asc'

      switch (sortBy) {
        case 'views':
          query = query.order('play_count', { ascending })
          break
        case 'likes':
          query = query.order('like_count', { ascending })
          break
        case 'engagement':
          query = query.order('engagement_count', { ascending })
          break
        case 'recent':
          query = query.order('taken_at', { ascending })
          break
      }

      // Apply pagination
      query = query.range(pageParam, pageParam + PAGE_SIZE - 1)

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch viral reels', error)
        throw error
      }

      return (data || []) as unknown as ViralReel[]
    },
    {
      pageSize: PAGE_SIZE,
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for fetching viral reels statistics
 */
export function useViralReelsStats(filters: ViralReelsFilters = {}) {
  return useSupabaseQuery<ViralReelsStats>(
    queryKeys.instagram.viralReelsStats(filters),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const minViews = filters.minViews || 50000

      // Try to use RPC function first
      const { data: stats, error: rpcError } = await supabase
        .rpc('get_viral_reels_stats', {
          min_views: minViews
        })

      if (!rpcError && stats) {
        // Add total_reels if not present in RPC response
        if (!stats.total_reels) {
          let countQuery = supabase
            .from('instagram_reels')
            .select('*', { count: 'exact', head: true })

          if (filters.creatorId) {
            countQuery = countQuery.eq('creator_id', filters.creatorId)
          }

          const { count } = await countQuery
          stats.total_reels = count || 0
        }
        return stats
      }

      // If RPC doesn't exist, calculate stats manually
      let viralQuery = supabase
        .from('instagram_reels')
        .select('play_count, like_count')
        .gte('play_count', minViews)

      let totalQuery = supabase
        .from('instagram_reels')
        .select('*', { count: 'exact', head: true })

      let maxQuery = supabase
        .from('instagram_reels')
        .select('play_count')

      // Apply date filters if present
      if (filters.dateFrom) {
        viralQuery = viralQuery.gte('taken_at', filters.dateFrom)
        maxQuery = maxQuery.gte('taken_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        viralQuery = viralQuery.lte('taken_at', filters.dateTo)
        maxQuery = maxQuery.lte('taken_at', filters.dateTo)
      }

      // Apply creator filter if present
      if (filters.creatorId) {
        viralQuery = viralQuery.eq('creator_id', filters.creatorId)
        totalQuery = totalQuery.eq('creator_id', filters.creatorId)
        maxQuery = maxQuery.eq('creator_id', filters.creatorId)
      }

      maxQuery = maxQuery.order('play_count', { ascending: false }).limit(1)

      const [viralData, totalCount, maxData] = await Promise.all([
        viralQuery,
        totalQuery,
        maxQuery
      ])

      if (viralData.error) {
        logger.error('Failed to fetch viral stats', viralData.error)
        throw viralData.error
      }

      const data = viralData.data || []
      const totalReels = totalCount.count || 0
      const maxViews = maxData.data?.[0]?.play_count || 0

      if (data.length === 0) {
        return {
          total_reels: totalReels,
          total_viral: 0,
          ultra_viral: 0,
          avg_views: 0,
          avg_likes: 0,
          max_views: maxViews
        }
      }

      const ultraViral = data.filter((r) => r.play_count >= 50_000_000).length
      const avgViews = Math.round(data.reduce((sum, r) => sum + r.play_count, 0) / data.length)
      const avgLikes = Math.round(data.reduce((sum, r) => sum + r.like_count, 0) / data.length)

      return {
        total_reels: totalReels,
        total_viral: data.length,
        ultra_viral: ultraViral,
        avg_views: avgViews,
        avg_likes: avgLikes,
        max_views: maxViews
      }
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    }
  )
}

/**
 * Hook for fetching top creators by viral content
 */
export function useTopCreators(filters: ViralReelsFilters = {}, limit = 5) {
  return useSupabaseQuery<TopCreator[]>(
    queryKeys.instagram.topCreators(filters, limit),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const minViews = filters.minViews || 50000

      let query = supabase
        .from('instagram_reels')
        .select(`
          creator_id,
          creator_username,
          creator:instagram_creators(
            ig_user_id,
            username,
            profile_pic_url,
            followers
          )
        `)
        .gte('play_count', minViews)

      // Apply date filters if present
      if (filters.dateFrom) {
        query = query.gte('taken_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('taken_at', filters.dateTo)
      }

      // Apply creator filter if present
      if (filters.creatorId) {
        query = query.eq('creator_id', filters.creatorId)
      }

      const { data, error } = await query
        .order('play_count', { ascending: false })
        .limit(500) // Increase limit to get more data for accurate top creators

      if (error) {
        logger.error('Failed to fetch top creators', error)
        throw error
      }

      // Group by creator and count viral reels
      const creatorMap = new Map<string, TopCreator>()

      data?.forEach((reel: ReelWithCreator) => {
        if (!reel.creator_username) return

        if (!creatorMap.has(reel.creator_username)) {
          const creatorDetails = Array.isArray(reel.creator) ? reel.creator[0] : reel.creator
          creatorMap.set(reel.creator_username, {
            username: reel.creator_username,
            creator_id: reel.creator_id,
            profile_pic_url: creatorDetails?.profile_pic_url ?? null,
            followers: creatorDetails?.followers || 0,
            viral_count: 0
          })
        }

        const creator = creatorMap.get(reel.creator_username)
        if (creator) creator.viral_count++
      })

      // Sort by viral count and return top creators
      return Array.from(creatorMap.values())
        .sort((a, b) => b.viral_count - a.viral_count)
        .slice(0, limit)
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

// ============================================================================
// NICHING HOOKS
// ============================================================================

export interface NichingStats {
  total: number
  niched: number
  unniched: number
  nicheBreakdown: Record<string, number>
  availableNiches: string[]
}

export interface NichingFilters {
  search?: string
  niches?: string[] | null // null = unniched, [] = all, ['niche1'] = specific niches
  orderBy?: 'followers' | 'username' | 'discovery_date'
  order?: 'asc' | 'desc'
}

/**
 * Hook for fetching niching statistics
 */
export function useNichingStats() {
  return useSupabaseQuery<NichingStats>(
    queryKeys.instagram.nichingStats(),
    async () => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      // Run all counts in parallel
      const [totalResult, nichedResult, unnichedResult, nichesResult] = await Promise.all([
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'ok'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'ok').not('niche', 'is', null),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }).eq('review_status', 'ok').is('niche', null),
        supabase.from('instagram_creators').select('niche').eq('review_status', 'ok').not('niche', 'is', null)
      ])

      const total = totalResult.count || 0
      const niched = nichedResult.count || 0
      const unniched = unnichedResult.count || 0

      // Count occurrences of each niche
      const nicheBreakdown: Record<string, number> = {}
      const uniqueNiches = new Set<string>()

      if (nichesResult.data) {
        nichesResult.data.forEach(({ niche }) => {
          if (niche) {
            uniqueNiches.add(niche)
            nicheBreakdown[niche] = (nicheBreakdown[niche] || 0) + 1
          }
        })
      }

      return {
        total,
        niched,
        unniched,
        nicheBreakdown,
        availableNiches: Array.from(uniqueNiches).sort()
      }
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    }
  )
}

/**
 * Hook for fetching creators for niching page with infinite scroll
 */
export function useNichingCreators(filters: NichingFilters = {}) {
  return useInfiniteSupabaseQuery<Creator[]>(
    queryKeys.instagram.nichingCreators(filters),
    async ({ pageParam = 0 }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('instagram_creators')
        .select('*')
        .eq('review_status', 'ok')
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      // Apply niche filter
      if (filters.niches === null) {
        // Show only unniched creators
        query = query.is('niche', null)
      } else if (filters.niches && filters.niches.length > 0) {
        // Filter by specific niches
        query = query.in('niche', filters.niches)
      }
      // If niches is undefined or empty array, show all

      // Apply search
      if (filters.search) {
        query = query.ilike('username', `%${filters.search}%`)
      }

      // Apply sorting
      const orderBy = filters.orderBy || 'followers'
      const order = filters.order || 'desc'
      query = query.order(orderBy, { ascending: order === 'asc' })

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch niching creators', error)
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
 * Mutation for updating a single creator's niche
 */
export function useUpdateCreatorNiche() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      creatorId,
      niche,
    }: {
      creatorId: number
      niche: string | null
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({ niche })
        .eq('id', creatorId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ creatorId, niche }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.instagram.all() })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKeys.instagram.nichingCreators())

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: queryKeys.instagram.nichingCreators() },
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
                    ? { ...creator, niche }
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
        queryClient.setQueryData(queryKeys.instagram.nichingCreators(), context.previousData)
      }

      addToast({
        type: 'error',
        title: 'Failed to update niche',
      })
    },
    onSuccess: () => {
      // Invalidate stats to update counts
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.nichingStats() })

      addToast({
        type: 'success',
        title: 'Niche updated',
      })
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.nichingCreators() })
    },
  })
}

/**
 * Mutation for bulk updating creator niches
 */
export function useBulkUpdateCreatorNiche() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async ({
      creatorIds,
      niche,
    }: {
      creatorIds: number[]
      niche: string | null
    }) => {
      if (!supabase) {
        logger.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({ niche })
        .in('id', creatorIds)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate all niching queries
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.nichingCreators() })
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.nichingStats() })

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