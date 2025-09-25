/**
 * React Query hooks for Instagram Creators data fetching
 * Provides caching, background updates, and optimistic updates
 */

import { useQueryClient } from '@tanstack/react-query'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import { useMutation } from '@tanstack/react-query'

interface InstagramCreator {
  id: number
  username: string
  full_name?: string
  follower_count?: number
  following_count?: number
  media_count?: number
  biography?: string
  profile_pic_url?: string
  is_verified?: boolean
  review?: string | null
  category_id?: number
  created_at: string
  updated_at: string
  last_scraped?: string
}

interface CreatorFilters {
  filter?: 'unreviewed' | 'approved' | 'rejected' | 'pending'
  search?: string
  category_id?: number
  minFollowers?: number
  maxFollowers?: number
  isVerified?: boolean
  sortBy?: 'follower_count' | 'created_at' | 'username'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

interface CreatorMetrics {
  total_creators: number
  unreviewed_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
  new_today: number
  average_followers: number
  verified_count: number
}

/**
 * Fetch Instagram creators with pagination and filters
 */
export function useInstagramCreators(filters: CreatorFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.instagram.creators(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      let query = supabase
        .from('instagram_creators')
        .select('*', { count: 'exact' })
        .range(
          pageParam * (filters.limit || 50),
          (pageParam + 1) * (filters.limit || 50) - 1
        )

      // Apply filters
      if (filters.filter) {
        if (filters.filter === 'unreviewed') {
          query = query.is('review', null)
        } else {
          query = query.eq('review', filters.filter)
        }
      }

      if (filters.search?.trim()) {
        query = query.or(`username.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,biography.ilike.%${filters.search}%`)
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }

      if (filters.minFollowers !== undefined) {
        query = query.gte('follower_count', filters.minFollowers)
      }

      if (filters.maxFollowers !== undefined) {
        query = query.lte('follower_count', filters.maxFollowers)
      }

      if (filters.isVerified !== undefined) {
        query = query.eq('is_verified', filters.isVerified)
      }

      // Apply sorting
      const sortColumn = filters.sortBy || 'follower_count'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data as InstagramCreator[],
        hasMore: count ? (pageParam + 1) * (filters.limit || 50) < count : false,
        nextPage: pageParam + 1,
        totalCount: count || 0
      }
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch Instagram creator metrics
 */
export function useInstagramMetrics() {
  return useQuery({
    queryKey: queryKeys.instagram.metrics(),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not initialized')

      // Get counts for different review states
      const [
        { count: total },
        { count: unreviewed },
        { count: approved },
        { count: rejected },
        { count: pending },
        { count: verified },
        { data: todayCreators },
        { data: avgFollowers }
      ] = await Promise.all([
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).is('review', null),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review', 'approved'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review', 'rejected'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review', 'pending'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('instagram_creators')
          .select('created_at')
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.rpc('avg', { column: 'follower_count', table: 'instagram_creators' })
      ])

      return {
        total_creators: total || 0,
        unreviewed_count: unreviewed || 0,
        approved_count: approved || 0,
        rejected_count: rejected || 0,
        pending_count: pending || 0,
        new_today: todayCreators?.length || 0,
        average_followers: avgFollowers?.data || 0,
        verified_count: verified || 0
      } as CreatorMetrics
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Update a single creator's review status
 */
export function useUpdateCreatorReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      review
    }: {
      id: number
      review: 'approved' | 'rejected' | 'pending'
    }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({ review, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['instagram', 'creators'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })
    },
    // Optimistic update
    onMutate: async ({ id, review }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['instagram', 'creators'] })

      // Snapshot the previous value
      const previousCreators = queryClient.getQueryData(['instagram', 'creators'])

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: ['instagram', 'creators'] },
        (old: unknown) => {
          if (!old) return old

          // Update the creator in the infinite query pages
          const data = old as { pages?: Array<{ data: InstagramCreator[] }> } | InstagramCreator[] | unknown
          if (data && typeof data === 'object' && 'pages' in data && Array.isArray(data.pages)) {
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                data: page.data.map((creator: InstagramCreator) =>
                  creator.id === id ? { ...creator, review } : creator
                )
              }))
            }
          }

          // Update in a regular query
          if (Array.isArray(old)) {
            return old.map((creator: InstagramCreator) =>
              creator.id === id ? { ...creator, review } : creator
            )
          }

          return old
        }
      )

      // Return a context object with the snapshotted value
      return { previousCreators }
    },
    // If the mutation fails, use the context returned from onMutate to rollback
    onError: (err, newData, context) => {
      if (context?.previousCreators) {
        queryClient.setQueryData(['instagram', 'creators'], context.previousCreators)
      }
    },
  })
}

/**
 * Bulk update creators' review status
 */
export function useBulkUpdateCreatorReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      review
    }: {
      ids: number[]
      review: 'approved' | 'rejected' | 'pending'
    }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({ review, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['instagram', 'creators'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.instagram.metrics() })
    }
  })
}

/**
 * Fetch a single creator by ID
 */
export function useInstagramCreator(id: number | null) {
  return useQuery({
    queryKey: queryKeys.instagram.creator(id!),
    queryFn: async () => {
      if (!id) throw new Error('No ID provided')
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('instagram_creators')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as InstagramCreator
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update creator category
 */
export function useUpdateCreatorCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      category_id
    }: {
      id: number
      category_id: number | null
    }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('instagram_creators')
        .update({ category_id, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['instagram', 'creators'] })
    }
  })
}

/**
 * Fetch related creators for a given creator
 */
export function useRelatedCreators(username: string | null, limit = 10) {
  return useQuery({
    queryKey: ['instagram', 'related', username, limit],
    queryFn: async () => {
      if (!username) throw new Error('No username provided')

      const response = await fetch(`/api/instagram/related?username=${encodeURIComponent(username)}&limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch related creators')
      }

      const data = await response.json()
      return data.creators as InstagramCreator[]
    },
    enabled: !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}