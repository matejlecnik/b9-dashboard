'use client'

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/supabase'
import { useMemo } from 'react'

export interface UserStats {
  total_users: number
  high_quality_users: number
  medium_quality_users: number
  low_quality_users: number
  our_creators: number
  verified_users: number
  gold_users: number
  mod_users: number
  suspended_users: number
  users_with_bio: number
  users_with_posts: number
  avg_score: number
  avg_age_days: number
  avg_karma: number
  total_karma_all_users: number
  avg_posts_per_user: number
  users_active_last_30_days: number
}

export interface ContentTypeStats {
  preferred_content_type: string
  user_count: number
  avg_quality_score: number
  avg_post_performance: number
}

export interface HourlyActivityStats {
  most_active_posting_hour: number
  user_count: number
  avg_quality_score: number
}

export interface Post {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  subreddit_name: string
  content_type: string
  created_utc: string
  thumbnail?: string
  url?: string
  over_18: boolean
}

export interface UserProfile {
  user: User
  recent_posts: Post[]
}

// Query keys
export const userAnalyticsKeys = {
  all: ['userAnalytics'] as const,
  stats: () => [...userAnalyticsKeys.all, 'stats'] as const,
  users: () => [...userAnalyticsKeys.all, 'users'] as const,
  userList: (filters: Record<string, unknown>) => [...userAnalyticsKeys.users(), 'list', filters] as const,
  userProfile: (userId: number) => [...userAnalyticsKeys.users(), 'profile', userId] as const,
  contentStats: () => [...userAnalyticsKeys.all, 'contentStats'] as const,
  hourlyStats: () => [...userAnalyticsKeys.all, 'hourlyStats'] as const,
  search: (term: string) => [...userAnalyticsKeys.users(), 'search', term] as const,
}

// Lightweight user stats - only essential counts
export function useUserStats() {
  return useQuery({
    queryKey: userAnalyticsKeys.stats(),
    queryFn: async (): Promise<UserStats> => {
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      // Use count queries for better performance
      const [totalResult, highQualityResult, ourCreatorsResult] = await Promise.all([
        supabase.from('reddit_users').select('*', { count: 'exact', head: true }),
        supabase.from('reddit_users').select('*', { count: 'exact', head: true }).gte('overall_user_score', 7),
        supabase.from('reddit_users').select('*', { count: 'exact', head: true }).eq('our_creator', true)
      ])

      if (totalResult.error) throw totalResult.error
      if (highQualityResult.error) throw highQualityResult.error
      if (ourCreatorsResult.error) throw ourCreatorsResult.error

      const totalUsers = totalResult.count || 0
      const highQualityUsers = highQualityResult.count || 0
      const ourCreators = ourCreatorsResult.count || 0
      const lowQualityUsers = Math.max(0, totalUsers - highQualityUsers) // Rough estimate

      // Return simplified stats
      const stats: UserStats = {
        total_users: totalUsers,
        high_quality_users: highQualityUsers,
        medium_quality_users: 0, // Not calculated for performance
        low_quality_users: lowQualityUsers,
        our_creators: ourCreators,
        verified_users: 0, // Not calculated for performance
        gold_users: 0, // Not calculated for performance
        mod_users: 0, // Not calculated for performance
        suspended_users: 0, // Not calculated for performance
        users_with_bio: 0, // Not calculated for performance
        users_with_posts: 0, // Not calculated for performance
        avg_score: 0, // Not calculated for performance
        avg_age_days: 0, // Not calculated for performance
        avg_karma: 0, // Not calculated for performance
        total_karma_all_users: 0, // Not calculated for performance
        avg_posts_per_user: 0, // Not calculated for performance
        users_active_last_30_days: 0, // Not calculated for performance
      }

      return stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache since it's simpler
    enabled: true, // Always fetch, but it's now much lighter
  })
}

export function useUsers(page = 1, limit = 50, filters: Record<string, unknown> = {}) {
  
  return useQuery({
    queryKey: userAnalyticsKeys.userList({ page, limit, ...filters }),
    queryFn: async (): Promise<{ users: User[], hasMore: boolean }> => {
      const from = (page - 1) * limit
      const to = from + limit - 1

      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('reddit_users')
        .select(`
          id, username, reddit_id, overall_user_score, account_age_days, total_karma,
          link_karma, comment_karma, avg_post_score, preferred_content_type, 
          most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
          last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
          our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
          subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
          bio, bio_url
        `)
        .order('total_karma', { ascending: false })
        .range(from, to)

      // Apply filters
      if (filters.searchTerm) {
        query = query.ilike('username', `%${filters.searchTerm}%`)
      }
      
      if (filters.qualityFilter && filters.qualityFilter !== 'all') {
        switch (filters.qualityFilter) {
          case 'high':
            query = query.gte('overall_user_score', 7)
            break
          case 'low':
            query = query.lt('overall_user_score', 7)
            break
          case 'our_creators':
            query = query.eq('our_creator', true)
            break
        }
      }

      const { data, error } = await query
      if (error) {
        console.error('useUsers query error:', error)
        throw error
      }

      return {
        users: data || [],
        hasMore: data?.length === limit
      }
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// New hook for infinite scrolling with debounced search
export function useInfiniteUsers(searchTerm: string, qualityFilter: string = 'all') {
  
  return useInfiniteQuery({
    queryKey: userAnalyticsKeys.userList({ searchTerm, qualityFilter }),
    initialPageParam: 0, // Fix: Add missing initialPageParam
    queryFn: async ({ pageParam = 0 }): Promise<{ users: User[], nextCursor: number | null }> => {
      const limit = 10 // Reduced from 20 for better performance with 131K users
      const from = (pageParam as number) || 0
      const to = from + limit - 1

      // Add safety limit to prevent loading too many users
      const maxUsers = 1000
      if (from >= maxUsers) {
        return { users: [], nextCursor: null }
      }

      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('reddit_users')
        .select(`
          id, username, reddit_id, overall_user_score, account_age_days, total_karma,
          link_karma, comment_karma, avg_post_score, preferred_content_type, 
          most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
          last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
          our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
          subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
          bio, bio_url
        `)
        .order('total_karma', { ascending: false })
        .range(from, Math.min(to, maxUsers - 1))

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.ilike('username', `%${searchTerm.trim()}%`)
      }
      
      // Apply quality filter
      if (qualityFilter !== 'all') {
        switch (qualityFilter) {
          case 'high':
            query = query.gte('overall_user_score', 7)
            break
          case 'low':
            query = query.lt('overall_user_score', 7)
            break
          case 'our_creators':
            query = query.eq('our_creator', true)
            break
        }
      }

      const { data, error } = await query
      if (error) {
        console.error('useInfiniteUsers query error:', error)
        throw error
      }

      const users = data || []
      const hasMore = users.length === limit && from + limit < maxUsers
      
      return {
        users,
        nextCursor: hasMore ? from + limit : null
      }
    },
    getNextPageParam: (lastPage: { users: User[]; nextCursor: number | null }) => lastPage?.nextCursor ?? null,
    staleTime: 30 * 1000, // 30 seconds for search results
    enabled: true,
  })
}

export function useUserProfile(userId: number) {
  
  return useQuery({
    queryKey: userAnalyticsKeys.userProfile(userId),
    queryFn: async (): Promise<UserProfile | null> => {
      // Get user details
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data: user, error: userError } = await supabase
        .from('reddit_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !user) throw userError || new Error('User not found')

      // Get recent posts
      const { data: posts } = await supabase
        .from('reddit_posts')
        .select(`
          id, reddit_id, title, score, num_comments, subreddit_name,
          content_type, created_utc, thumbnail, url, over_18
        `)
        .eq('author_username', user.username)
        .order('created_utc', { ascending: false })
        .limit(10)

      return {
        user,
        recent_posts: posts || []
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useContentTypeStats() {
  
  return useQuery({
    queryKey: userAnalyticsKeys.contentStats(),
    queryFn: async (): Promise<ContentTypeStats[]> => {
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('reddit_users')
        .select('preferred_content_type, overall_user_score, avg_post_score')
        .not('preferred_content_type', 'is', null)

      if (error) throw error

      const contentTypeMap = new Map<string, { count: number, totalScore: number, totalPerformance: number }>()
      
      data?.forEach(user => {
        const type = user.preferred_content_type
        if (!contentTypeMap.has(type)) {
          contentTypeMap.set(type, { count: 0, totalScore: 0, totalPerformance: 0 })
        }
        const stats = contentTypeMap.get(type)!
        stats.count++
        stats.totalScore += user.overall_user_score || 0
        stats.totalPerformance += user.avg_post_score || 0
      })

      return Array.from(contentTypeMap.entries()).map(([type, data]) => ({
        preferred_content_type: type,
        user_count: data.count,
        avg_quality_score: data.totalScore / data.count,
        avg_post_performance: data.totalPerformance / data.count
      })).sort((a, b) => b.user_count - a.user_count)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useHourlyActivityStats() {
  
  return useQuery({
    queryKey: userAnalyticsKeys.hourlyStats(),
    queryFn: async (): Promise<HourlyActivityStats[]> => {
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('reddit_users')
        .select('most_active_posting_hour, overall_user_score')
        .not('most_active_posting_hour', 'is', null)

      if (error) throw error

      const hourlyMap = new Map<number, { count: number, totalScore: number }>()
      
      data?.forEach(user => {
        const hour = user.most_active_posting_hour
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { count: 0, totalScore: 0 })
        }
        const stats = hourlyMap.get(hour)!
        stats.count++
        stats.totalScore += user.overall_user_score || 0
      })

      return Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        most_active_posting_hour: hour,
        user_count: data.count,
        avg_quality_score: data.totalScore / data.count
      })).sort((a, b) => a.most_active_posting_hour - b.most_active_posting_hour)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Utility hooks
export function useSearchUsers(searchTerm: string) {
  
  return useQuery({
    queryKey: userAnalyticsKeys.search(searchTerm),
    queryFn: async (): Promise<User[]> => {
      if (!searchTerm.trim()) return []
      
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('reddit_users')
        .select(`
          id, username, reddit_id, overall_user_score, account_age_days, total_karma,
          link_karma, comment_karma, avg_post_score, preferred_content_type, 
          most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
          last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
          our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
          subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
          bio, bio_url
        `)
        .ilike('username', `%${searchTerm}%`)
        .order('total_karma', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    },
    enabled: searchTerm.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds for search results
  })
}

// Memoized computed values
interface FilterOptions {
  searchTerm?: string
  qualityFilter?: string
  sortBy?: string
  verifiedFilter?: boolean | null
  goldFilter?: boolean | null
  modFilter?: boolean | null
  minKarma?: number | null
  maxKarma?: number | null
  minAge?: number | null
  maxAge?: number | null
  hasBioFilter?: boolean | null
  hasPostsFilter?: boolean | null
}

export function useFilteredUsers(users: User[] = [], filters: FilterOptions = {}) {
  return useMemo(() => {
    // Defensive check: ensure users is always a valid array
    if (!users || !Array.isArray(users)) {
      return []
    }
    
    let filtered = [...users]

    // Apply search filter
    if (filters.searchTerm?.trim()) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(term)
      )
    }

    // Apply quality filter
    if (filters.qualityFilter && filters.qualityFilter !== 'all') {
      filtered = filtered.filter(user => {
        const score = user.overall_user_score || 0
        switch (filters.qualityFilter) {
          case 'high': return score >= 7
          case 'medium': return score >= 4 && score < 7
          case 'low': return score < 4
          case 'our_creators': return user.our_creator
          default: return true
        }
      })
    }

    // Apply verified filter
    if (filters.verifiedFilter !== null && filters.verifiedFilter !== undefined) {
      filtered = filtered.filter(user => !!user.verified === filters.verifiedFilter)
    }

    // Apply gold filter
    if (filters.goldFilter !== null && filters.goldFilter !== undefined) {
      filtered = filtered.filter(user => !!user.is_gold === filters.goldFilter)
    }

    // Apply mod filter
    if (filters.modFilter !== null && filters.modFilter !== undefined) {
      filtered = filtered.filter(user => !!user.is_mod === filters.modFilter)
    }

    // Apply karma range filters
    if (filters.minKarma !== null && filters.minKarma !== undefined) {
      filtered = filtered.filter(user => (user.total_karma || 0) >= filters.minKarma!)
    }
    if (filters.maxKarma !== null && filters.maxKarma !== undefined) {
      filtered = filtered.filter(user => (user.total_karma || 0) <= filters.maxKarma!)
    }

    // Apply age range filters (in days)
    if (filters.minAge !== null && filters.minAge !== undefined) {
      filtered = filtered.filter(user => (user.account_age_days || 0) >= filters.minAge!)
    }
    if (filters.maxAge !== null && filters.maxAge !== undefined) {
      filtered = filtered.filter(user => (user.account_age_days || 0) <= filters.maxAge!)
    }

    // Apply bio filter
    if (filters.hasBioFilter !== null && filters.hasBioFilter !== undefined) {
      filtered = filtered.filter(user => {
        const hasBio = !!(user.bio && user.bio.trim())
        return hasBio === filters.hasBioFilter
      })
    }

    // Apply posts filter
    if (filters.hasPostsFilter !== null && filters.hasPostsFilter !== undefined) {
      filtered = filtered.filter(user => {
        const hasPosts = (user.total_posts_analyzed || 0) > 0
        return hasPosts === filters.hasPostsFilter
      })
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'score': 
            return (b.overall_user_score || 0) - (a.overall_user_score || 0)
          case 'karma': 
            return (b.total_karma || 0) - (a.total_karma || 0)
          case 'age': 
            return (b.account_age_days || 0) - (a.account_age_days || 0)
          case 'posts': 
            return (b.total_posts_analyzed || 0) - (a.total_posts_analyzed || 0)
          default: 
            return 0
        }
      })
    }

    return filtered
  }, [users, filters])
}