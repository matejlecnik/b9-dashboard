/**
 * React Query hook for Reddit viral posts analysis
 * Calls get_viral_posts() database function for high-performing Reddit content
 *
 * NOTE: This is for REDDIT posts, not Instagram viral reels
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'

interface ViralPostsParams {
  timeRangeHours?: number
  postsPerSubreddit?: number
  totalLimit?: number
  searchQuery?: string
}

interface ViralPostsResult {
  posts: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  totalCount: number
}

export function useViralPosts(params: ViralPostsParams = {}) {
  const {
    timeRangeHours = 72,
    postsPerSubreddit = 3,
    totalLimit = 10000,
    searchQuery = ''
  } = params

  return useQuery<ViralPostsResult>({
    queryKey: queryKeys.reddit.viralPosts(params),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not initialized')

      // Fetch posts and count in parallel
      const [postsResult, countResult] = await Promise.all([
        supabase.rpc('get_viral_posts', {
          time_range_hours: timeRangeHours,
          posts_per_subreddit: postsPerSubreddit,
          total_limit: totalLimit
        }),
        supabase.rpc('get_viral_posts_count', {
          time_range_hours: timeRangeHours,
          posts_per_subreddit: postsPerSubreddit
        })
      ])

      if (postsResult.error) throw postsResult.error
      if (countResult.error) throw countResult.error

      // Apply client-side search filter if provided
      let filtered = postsResult.data || []
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter((post: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
          post.title?.toLowerCase().includes(query) ||
          post.subreddit_name?.toLowerCase().includes(query)
        )
      }

      return {
        posts: filtered,
        totalCount: countResult.data || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
