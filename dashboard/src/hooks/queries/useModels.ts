/**
 * React Query hooks for Models data fetching
 * Provides caching, background updates, and optimistic updates
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

interface Model {
  id: number
  username: string
  name?: string
  bio?: string
  profile_image_url?: string
  follower_count?: number
  following_count?: number
  post_count?: number
  verified?: boolean
  platform?: string
  category?: string
  rating?: number
  review_status?: string | null
  notes?: string
  created_at: string
  updated_at: string
}

interface ModelFilters {
  search?: string
  platform?: string
  category?: string
  minFollowers?: number
  maxFollowers?: number
  verified?: boolean
  reviewStatus?: string
  sortBy?: 'follower_count' | 'rating' | 'created_at' | 'username'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Fetch models with pagination and filters
 */
export function useModels(filters: ModelFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.models.list(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const currentPage = typeof pageParam === 'number' ? pageParam : 0
      if (!supabase) throw new Error('Supabase client not initialized')

      let query = supabase
        .from('models')
        .select('*', { count: 'exact' })
        .range(
          currentPage * (filters.limit || 50),
          (currentPage + 1) * (filters.limit || 50) - 1
        )

      // Apply filters
      if (filters.search?.trim()) {
        query = query.or(`username.ilike.%${filters.search}%,name.ilike.%${filters.search}%,bio.ilike.%${filters.search}%`)
      }

      if (filters.platform) {
        query = query.eq('platform', filters.platform)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.minFollowers !== undefined) {
        query = query.gte('follower_count', filters.minFollowers)
      }

      if (filters.maxFollowers !== undefined) {
        query = query.lte('follower_count', filters.maxFollowers)
      }

      if (filters.verified !== undefined) {
        query = query.eq('verified', filters.verified)
      }

      if (filters.reviewStatus !== undefined) {
        if (filters.reviewStatus === 'unreviewed') {
          query = query.is('review_status', null)
        } else {
          query = query.eq('review_status', filters.reviewStatus)
        }
      }

      // Apply sorting
      const sortColumn = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data as Model[],
        hasMore: count ? (currentPage + 1) * (filters.limit || 50) < count : false,
        nextPage: currentPage + 1,
        totalCount: count || 0
      }
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single model by ID
 */
export function useModel(id: number | null) {
  return useQuery({
    queryKey: queryKeys.models.model(id as number),
    queryFn: async () => {
      if (!id) throw new Error('No ID provided')
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Model
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update a model's review status
 */
export function useUpdateModelReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      review_status,
      notes
    }: { id: number; review_status: string; notes?: string }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const updateData: Partial<Pick<Model, 'review_status' | 'notes'>> & { updated_at: string } = {
        review_status,
        updated_at: new Date().toISOString()
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('models')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all() })
    },
    // Optimistic update
    onMutate: async ({ id, review_status, notes }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.models.all() })

      // Snapshot the previous value
      const previousModels = queryClient.getQueryData(queryKeys.models.list())

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: queryKeys.models.all() },
        (old: unknown) => {
          if (!old) return old

          type ModelsInfiniteData = {
            pages: Array<{ data: Model[] }>
            pageParams: unknown[]
          }

          if (
            typeof old === 'object' &&
            old !== null &&
            'pages' in old &&
            Array.isArray((old as ModelsInfiniteData).pages)
          ) {
            const inf = old as ModelsInfiniteData
            return {
              ...inf,
              pages: inf.pages.map((page) => ({
                ...page,
                data: page.data.map((model) =>
                  model.id === id
                    ? { ...model, review_status, notes: notes !== undefined ? notes : model.notes }
                    : model
                )
              }))
            }
          }

          if (Array.isArray(old)) {
            return (old as Model[]).map((model) =>
              model.id === id
                ? { ...model, review_status, notes: notes !== undefined ? notes : model.notes }
                : model
            )
          }

          return old
        }
      )

      // Return a context object with the snapshotted value
      return { previousModels }
    },
    // If the mutation fails, use the context returned from onMutate to rollback
    onError: (_err, _newData, context: { previousModels?: unknown } | undefined) => {
      if (context?.previousModels) {
        queryClient.setQueryData(queryKeys.models.list(), context.previousModels)
      }
    },
  })
}

/**
 * Update model rating
 */
export function useUpdateModelRating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      rating
    }: {
      id: number
      rating: number
    }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('models')
        .update({ rating, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all() })
    }
  })
}

/**
 * Bulk update models
 */
export function useBulkUpdateModels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      updates
    }: {
      ids: number[]
      updates: Partial<Model>
    }) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('models')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all() })
    }
  })
}

/**
 * Delete a model
 */
export function useDeleteModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all() })
    }
  })
}

/**
 * Add a new model
 */
export function useAddModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (model: Omit<Model, 'id' | 'created_at' | 'updated_at'>) => {
      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase
        .from('models')
        .insert({
          ...model,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate models list to refetch with new data
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all() })
    }
  })
}