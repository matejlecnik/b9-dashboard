import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/queryKeys'
/**
 * React Query hooks for Analytics and Dashboard pages
 * Handles data aggregation, trends, and performance metrics
 */


// Types for analytics data
interface DashboardMetrics {
  reddit: {
    totalSubreddits: number
    reviewedSubreddits: number
    okSubreddits: number
    totalUsers: number
    verifiedCreators: number
    totalPosts: number
  }
  instagram: {
    totalCreators: number
    approvedCreators: number
    pendingReview: number
    totalPosts: number
    viralContent: number
    avgEngagement: number
  }
  growth: {
    newSubredditsToday: number
    newCreatorsToday: number
    weeklyGrowth: number
    monthlyGrowth: number
  }
}

interface TrendData {
  date: string
  value: number
  label?: string
}

interface PerformanceMetrics {
  responseTime: number
  errorRate: number
  successRate: number
  throughput: number
}

interface SubredditAnalytics {
  id: number
  name: string
  subscribers: number
  growthRate: number
  engagementScore: number
  postFrequency: number
  topPosters: string[]
}

interface CreatorAnalytics {
  id: number
  username: string
  followers: number
  engagementRate: number
  viralPosts: number
  growthTrend: TrendData[]
}

/**
 * Hook for fetching main dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      // Run all queries in parallel for performance
      const [
        redditSubreddits,
        redditReviewed,
        redditOk,
        redditUsers,
        redditCreators,
        redditPosts,
        instagramCreators,
        instagramApproved,
        instagramPending,
        instagramPosts
      ] = await Promise.all([
        // Reddit metrics
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .not('review', 'is', null),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok'),
        supabase.from('reddit_users').select('id', { count: 'exact', head: true }),
        supabase.from('reddit_users').select('id', { count: 'exact', head: true })
          .eq('is_creator', true),
        supabase.from('reddit_posts').select('id', { count: 'exact', head: true }),

        // Instagram metrics
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true })
          .eq('review_status', 'approved'),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true })
          .or('review_status.is.null,review_status.eq.pending'),
        supabase.from('instagram_posts').select('id', { count: 'exact', head: true })
      ])

      // Calculate growth metrics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [newSubredditsToday, newCreatorsToday] = await Promise.all([
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase.from('instagram_creators').select('id', { count: 'exact', head: true })
          .gte('discovered_at', today.toISOString())
      ])

      return {
        reddit: {
          totalSubreddits: redditSubreddits.count || 0,
          reviewedSubreddits: redditReviewed.count || 0,
          okSubreddits: redditOk.count || 0,
          totalUsers: redditUsers.count || 0,
          verifiedCreators: redditCreators.count || 0,
          totalPosts: redditPosts.count || 0
        },
        instagram: {
          totalCreators: instagramCreators.count || 0,
          approvedCreators: instagramApproved.count || 0,
          pendingReview: instagramPending.count || 0,
          totalPosts: instagramPosts.count || 0,
          viralContent: 0, // Would need specific query
          avgEngagement: 0 // Would need calculation
        },
        growth: {
          newSubredditsToday: newSubredditsToday.count || 0,
          newCreatorsToday: newCreatorsToday.count || 0,
          weeklyGrowth: 0, // Would need week-over-week calculation
          monthlyGrowth: 0 // Would need month-over-month calculation
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook for fetching trend data over a period
 */
export function useTrendData(
  entity: 'subreddits' | 'creators' | 'posts' | 'engagement',
  period: '7d' | '30d' | '90d' = '30d'
) {
  return useQuery({
    queryKey: queryKeys.analytics.trends(period),
    queryFn: async (): Promise<TrendData[]> => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
      startDate.setDate(startDate.getDate() - daysMap[period])

      // This is a simplified example - actual implementation would vary by entity
      let data: TrendData[] = []

      if (entity === 'subreddits') {
        // Fetch daily subreddit counts
        const { data: counts } = await supabase
          .from('reddit_subreddits')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        // Group by day and count
        const grouped = new Map<string, number>()
        counts?.forEach(item => {
          const date = new Date(item.created_at).toISOString().split('T')[0]
          grouped.set(date, (grouped.get(date) || 0) + 1)
        })

        data = Array.from(grouped.entries()).map(([date, value]) => ({
          date,
          value,
          label: `${value} subreddits`
        }))
      }

      return data.sort((a, b) => a.date.localeCompare(b.date))
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for fetching top performing subreddits
 */
export function useTopSubreddits(limit = 10) {
  return useQuery({
    queryKey: ['top-subreddits', limit],
    queryFn: async (): Promise<SubredditAnalytics[]> => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      const { data, error } = await supabase
        .from('reddit_subreddits')
        .select('*')
        .eq('review', 'Ok')
        .order('subscribers', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error('Failed to fetch top subreddits', error)
        throw error
      }

      // Map to analytics format
      return (data || []).map(sub => ({
        id: sub.id,
        name: sub.display_name_prefixed,
        subscribers: sub.subscribers,
        growthRate: 0, // Would need historical data
        engagementScore: sub.active_user_count ? (sub.active_user_count / sub.subscribers) * 100 : 0,
        postFrequency: 0, // Would need post count analysis
        topPosters: []
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching top performing Instagram creators
 */
export function useTopCreators(limit = 10) {
  return useQuery({
    queryKey: ['top-creators', limit],
    queryFn: async (): Promise<CreatorAnalytics[]> => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      const { data, error } = await supabase
        .from('instagram_creators')
        .select('*')
        .eq('review_status', 'approved')
        .order('followers', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error('Failed to fetch top creators', error)
        throw error
      }

      // Map to analytics format
      return (data || []).map(creator => ({
        id: creator.id,
        username: creator.username,
        followers: creator.followers,
        engagementRate: creator.engagement_rate || 0,
        viralPosts: 0, // Would need viral post count
        growthTrend: [] // Would need historical data
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching performance metrics
 */
export function usePerformanceMetrics() {
  return useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async (): Promise<PerformanceMetrics> => {
      // This would typically fetch from an APM or monitoring service
      // For now, returning mock data
      return {
        responseTime: 150, // ms
        errorRate: 0.02, // 2%
        successRate: 0.98, // 98%
        throughput: 1000 // requests per minute
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook for fetching engagement analytics
 */
export function useEngagementAnalytics(platform: 'reddit' | 'instagram', timeframe = '30d') {
  return useQuery({
    queryKey: ['engagement', platform, timeframe],
    queryFn: async () => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      if (platform === 'reddit') {
        // Fetch Reddit engagement metrics
        const { data } = await supabase
          .from('reddit_posts')
          .select('score, num_comments, created_at')
          .order('created_at', { ascending: false })
          .limit(1000)

        const avgScore = (data?.reduce((acc, post) => acc + post.score, 0) || 0) / (data?.length || 1)
        const avgComments = (data?.reduce((acc, post) => acc + post.num_comments, 0) || 0) / (data?.length || 1)

        return {
          avgScore,
          avgComments,
          totalEngagement: avgScore + avgComments
        }
      } else {
        // Fetch Instagram engagement metrics
        const { data } = await supabase
          .from('instagram_posts')
          .select('like_count, comment_count, created_at')
          .order('created_at', { ascending: false })
          .limit(1000)

        const avgLikes = (data?.reduce((acc, post) => acc + (post.like_count || 0), 0) || 0) / (data?.length || 1)
        const avgComments = (data?.reduce((acc, post) => acc + (post.comment_count || 0), 0) || 0) / (data?.length || 1)

        return {
          avgLikes,
          avgComments,
          engagementRate: ((avgLikes + avgComments) / (data?.length || 1)) * 100
        }
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for category distribution analytics
 */
export function useCategoryDistribution() {
  return useQuery({
    queryKey: ['category-distribution'],
    queryFn: async () => {
      if (!supabase) {
      logger.error('Supabase client not available')
      throw new Error('Supabase client not available')
    }

      // Get Reddit category distribution
      const { data: redditCategories } = await supabase
        .from('reddit_subreddits')
        .select('category_text')
        .not('category_text', 'is', null)

      const redditDist = new Map<string, number>()
      redditCategories?.forEach(item => {
        const cat = item.category_text || 'Uncategorized'
        redditDist.set(cat, (redditDist.get(cat) || 0) + 1)
      })

      // Get Instagram category distribution
      const { data: instagramCategories } = await supabase
        .from('instagram_creators')
        .select('categories')
        .not('categories', 'is', null)

      const instagramDist = new Map<string, number>()
      instagramCategories?.forEach(item => {
        if (Array.isArray(item.categories)) {
          item.categories.forEach(cat => {
            instagramDist.set(cat, (instagramDist.get(cat) || 0) + 1)
          })
        }
      })

      return {
        reddit: Array.from(redditDist.entries()).map(([name, count]) => ({ name, count })),
        instagram: Array.from(instagramDist.entries()).map(([name, count]) => ({ name, count }))
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Combined analytics dashboard hook
 */
export function useAnalyticsDashboard() {
  const metrics = useDashboardMetrics()
  const topSubreddits = useTopSubreddits()
  const topCreators = useTopCreators()
  const performance = usePerformanceMetrics()
  const categoryDist = useCategoryDistribution()

  return {
    metrics: metrics.data,
    topSubreddits: topSubreddits.data,
    topCreators: topCreators.data,
    performance: performance.data,
    categoryDistribution: categoryDist.data,
    isLoading: metrics.isLoading || topSubreddits.isLoading || topCreators.isLoading,
    error: metrics.error || topSubreddits.error || topCreators.error
  }
}