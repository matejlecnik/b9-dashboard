/**
 * React Query hook for fetching viral posts
 * Ultra-optimized with multi-layer caching
 */

import { useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'



interface ViralPostsFilters {
  timeRangeHours?: number
  postsPerSubreddit?: number
  totalLimit?: number
  // TODO: Implement category filtering
  // categories?: string[]
  // TODO: Implement SFW-only filtering
  // sfwOnly?: boolean
  searchQuery?: string
}

interface ViralPost {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  created_utc: string
  subreddit_name: string
  content_type: string
  upvote_ratio: number
  thumbnail: string
  url: string
  author_username: string
  preview_data: Record<string, unknown> | null
  domain: string
  is_video: boolean
  is_self: boolean
  over_18: boolean
  sub_primary_category: string
  sub_over18: boolean
  viral_score: number
}

/**
 * Fetch viral posts with multi-layer optimization
 * 1. Try API route (has 5-minute server cache)
 * 2. Fallback to direct RPC call
 * 3. React Query caches the result
 */
async function fetchViralPosts(filters: ViralPostsFilters): Promise<ViralPost[]> {
  const {
    timeRangeHours = 72,
    postsPerSubreddit = 3,
    totalLimit = 10000,
    searchQuery = ''
  } = filters

  try {
    // First try the API route (fastest with server-side caching)
    const apiUrl = new URL('/api/reddit/viral-posts', window.location.origin)
    apiUrl.searchParams.set('timeRangeHours', timeRangeHours.toString())
    apiUrl.searchParams.set('postsPerSubreddit', postsPerSubreddit.toString())
    apiUrl.searchParams.set('totalLimit', totalLimit.toString())

    console.log('[ViralPosts] Fetching from:', apiUrl.toString())
    const response = await fetch(apiUrl.toString())
    console.log('[ViralPosts] Response status:', response.status, response.statusText)

    if (response.ok) {
      const result = await response.json()
      console.log('[ViralPosts] API result:', result)
      logger.log('[ViralPosts] API response:', {
        cached: result.cached,
        count: result.data?.length,
        cacheAge: result.cacheAge
      })

      // The API returns { data: posts, cached: boolean, totalPosts: number }
      let posts = result.data || []

      // Only apply search filter client-side (database handles the rest)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        posts = posts.filter((p: ViralPost) =>
          p.title.toLowerCase().includes(query) ||
          p.subreddit_name.toLowerCase().includes(query) ||
          p.author_username?.toLowerCase().includes(query)
        )
      }

      // Apply spacing algorithm to ensure 35 posts between same subreddit
      return applySpacingAlgorithm(posts, 35)
    }
  } catch (error) {
    console.log('[ViralPosts] API route failed, falling back to RPC:', error)
    logger.warn('[ViralPosts] API route failed, falling back to RPC:', error)
  }

  // Fallback to direct RPC call if API fails
  console.log('[ViralPosts] Using RPC fallback')
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase.rpc('get_viral_posts', {
    time_range_hours: timeRangeHours,
    posts_per_subreddit: postsPerSubreddit,
    total_limit: totalLimit
  })

  if (error) {
    console.error('[ViralPosts] RPC error:', error)
    logger.error('[ViralPosts] RPC error:', error)
    throw error
  }

  console.log('[ViralPosts] RPC returned', data?.length, 'posts')
  let posts = data || []

  // Only apply search filter (database function handles "Ok" subreddit filtering)
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    posts = posts.filter((p: ViralPost) =>
      p.title.toLowerCase().includes(query) ||
      p.subreddit_name.toLowerCase().includes(query) ||
      p.author_username?.toLowerCase().includes(query)
    )
  }

  // Apply spacing algorithm to ensure 35 posts between same subreddit
  return applySpacingAlgorithm(posts, 35)
}

// Client-side spacing algorithm for flexibility
function applySpacingAlgorithm(posts: ViralPost[], minSpacing: number = 35): ViralPost[] {
  if (!posts || posts.length === 0) return []

  const result: ViralPost[] = []
  const lastSeenIndex = new Map<string, number>()

  // Sort by viral score first
  const sortedPosts = [...posts].sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0))
  const availablePosts = [...sortedPosts]

  while (availablePosts.length > 0) {
    let postAdded = false

    // Try to find a post that respects spacing
    for (let i = 0; i < availablePosts.length; i++) {
      const post = availablePosts[i]
      const lastIndex = lastSeenIndex.get(post.subreddit_name) ?? -100

      // Check if enough spacing has passed
      if (result.length - lastIndex >= minSpacing || lastIndex === -100) {
        result.push(post)
        lastSeenIndex.set(post.subreddit_name, result.length - 1)
        availablePosts.splice(i, 1)
        postAdded = true
        break
      }
    }

    // If no post meets spacing requirement, take the best available
    if (!postAdded && availablePosts.length > 0) {
      const post = availablePosts.shift()!
      result.push(post)
      lastSeenIndex.set(post.subreddit_name, result.length - 1)
    }
  }

  return result
}

/**
 * React Query hook for viral posts
 */
export function useViralPosts(filters: ViralPostsFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.reddit.posts.list(filters), 'viral', filters],
    queryFn: () => fetchViralPosts(filters),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to save API calls
    refetchInterval: false, // No automatic refetch
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Prefetch viral posts for instant loading
 */
export async function prefetchViralPosts(
  queryClient: ReturnType<typeof useQueryClient>,
  filters: ViralPostsFilters = {}
) {
  await queryClient.prefetchQuery({
    queryKey: [...queryKeys.reddit.posts.list(filters), 'viral', filters],
    queryFn: () => fetchViralPosts(filters),
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Invalidate viral posts cache
 */
export function invalidateViralPosts(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({
    queryKey: [...queryKeys.reddit.posts.list(), 'viral']
  })
}