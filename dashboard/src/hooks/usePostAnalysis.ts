import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Post, PostMetrics } from '@/types/post'
import type { PostSortField, AgeFilter } from '@/components/PostAnalysisToolbar'

interface UsePostAnalysisOptions {
  initialPostsPerPage?: number
}

interface UsePostAnalysisReturn {
  // Data
  posts: Post[]
  metrics: PostMetrics | null
  sfwCount: number
  nsfwCount: number
  topCategories: Array<{ category: string; count: number }>

  // Loading states
  loading: boolean
  loadingMore: boolean
  metricsLoading: boolean
  hasMore: boolean

  // Filter states
  searchQuery: string
  selectedCategories: string[]
  isCategoryFiltering: boolean
  sfwOnly: boolean
  ageFilter: AgeFilter
  sortBy: PostSortField

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategories: (categories: string[]) => void
  setIsCategoryFiltering: (filtering: boolean) => void
  setSfwOnly: (sfw: boolean) => void
  setAgeFilter: (age: AgeFilter) => void
  setSortBy: (sort: PostSortField) => void
  loadMorePosts: () => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void
}

const PAGE_SIZE = 30 // Match Posting page size

export function usePostAnalysis({ initialPostsPerPage = PAGE_SIZE }: UsePostAnalysisOptions = {}): UsePostAnalysisReturn {
  // State management
  const [posts, setPosts] = useState<Post[]>([])
  const [metrics, setMetrics] = useState<PostMetrics | null>(null)
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)
  const [topCategories, setTopCategories] = useState<Array<{ category: string; count: number }>>([])

  // Loading states
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  // All categories list
  const allCategories = [
    'Age Demographics', 'Ass & Booty', 'Body Types & Features', 'Boobs & Chest',
    'Clothed & Dressed', 'Cosplay & Fantasy', 'Ethnic & Cultural', 'Feet & Foot Fetish',
    'Full Body & Nude', 'Goth & Alternative', 'Gym & Fitness', 'Interactive & Personalized',
    'Lifestyle & Themes', 'Lingerie & Underwear', 'OnlyFans Promotion', 'Selfie & Amateur',
    'Specific Body Parts'
  ]

  // Filter states with defaults
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories) // Default to all categories
  const [isCategoryFiltering, setIsCategoryFiltering] = useState(false)
  const [sfwOnly, setSfwOnly] = useState(true) // Default to true
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('24h') // Default to 24h
  const [sortBy, setSortBy] = useState<PostSortField>('score')

  // Error handling
  const [error, setError] = useState<string | null>(null)

  // Refs for preventing double fetches
  const fetchingRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const okSubredditsCache = useRef<string[]>([])

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Fetch approved subreddit names once and cache them
  const fetchApprovedSubreddits = useCallback(async (currentSortBy: PostSortField) => {
    if (!supabase) return []

    try {
      // Build query for approved subreddits
      let query = supabase
        .from('subreddits')
        .select('name, category_text, avg_upvotes_per_post, avg_comments_per_post')
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%') // Exclude user subreddits

      // Apply category filter at subreddit level
      if (selectedCategories.length === 0) {
        // Show only uncategorized
        query = query.or('category_text.is.null,category_text.eq.')
      } else if (selectedCategories.length < allCategories.length) {
        // Show only selected categories
        query = query.in('category_text', selectedCategories)
      }
      // If all categories selected, no additional filter needed

      // Order based on the sort option - matching what posts will be sorted by
      // When sorting posts by score (upvotes), get subreddits with highest avg upvotes
      // When sorting posts by comments, get subreddits with highest avg comments
      if (currentSortBy === 'comments') {
        // Sort by average comments per post
        query = query.order('avg_comments_per_post', { ascending: false, nullsFirst: false })
      } else {
        // Default to score/upvotes
        query = query.order('avg_upvotes_per_post', { ascending: false, nullsFirst: false })
      }

      // CRITICAL: Limit to prevent URL overflow and timeout
      // We limit to 50 subreddits to keep the query performant
      query = query.limit(50)

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch approved subreddits:', error)
        return []
      }

      const subredditNames = (data || []).map(s => s.name)
      console.log(`Fetched ${subredditNames.length} approved subreddits for posts query (sorted by ${currentSortBy})`)
      okSubredditsCache.current = subredditNames
      return subredditNames

    } catch (err) {
      console.error('Error fetching approved subreddits:', err)
      return []
    }
  }, [selectedCategories, allCategories.length])

  // Main fetch function - similar to Posting page approach
  const fetchPosts = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!supabase || fetchingRef.current) return

    fetchingRef.current = true

    try {
      if (!append) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // Get approved subreddit names based on category filter and sort option
      const approvedSubreddits = await fetchApprovedSubreddits(sortBy)

      if (approvedSubreddits.length === 0) {
        setPosts(append ? posts : [])
        setHasMore(false)
        setError(null)
        return
      }

      // Build the base query for posts
      let query = supabase
        .from('posts')
        .select(`
          id, reddit_id, title, score, num_comments, created_utc, subreddit_name,
          content_type, upvote_ratio, thumbnail, url, author_username, preview_data,
          domain, is_video, is_self, over_18
        `)
        .in('subreddit_name', approvedSubreddits)

      // Apply search filter
      if (debouncedSearchQuery) {
        query = query.or(`title.ilike.%${debouncedSearchQuery}%,subreddit_name.ilike.%${debouncedSearchQuery}%,author_username.ilike.%${debouncedSearchQuery}%`)
      }

      // Apply SFW filter
      if (sfwOnly) {
        query = query.eq('over_18', false)
      }

      // Apply age filter
      if (ageFilter !== 'all') {
        const hoursAgo = ageFilter === '24h' ? 24 : ageFilter === '7d' ? 168 : 720
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        query = query.gte('created_utc', cutoff)
      }

      // Apply sorting and pagination
      const sortColumn = sortBy === 'comments' ? 'num_comments' : 'score'
      query = query
        .order(sortColumn, { ascending: false })
        .range(page * initialPostsPerPage, (page + 1) * initialPostsPerPage - 1)

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch posts: ${fetchError.message}`)
      }

      const newPosts = (data || []) as Post[]

      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }

      setHasMore(newPosts.length === initialPostsPerPage)
      setCurrentPage(page)
      setError(null)

    } catch (err) {
      console.error('Error fetching posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
      if (!append) {
        setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      fetchingRef.current = false
    }
  }, [sortBy, debouncedSearchQuery, sfwOnly, ageFilter, fetchApprovedSubreddits, initialPostsPerPage, posts])

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    if (!supabase) return

    try {
      setMetricsLoading(true)

      // Get approved subreddit names
      const approvedSubreddits = okSubredditsCache.current.length > 0
        ? okSubredditsCache.current
        : await fetchApprovedSubreddits(sortBy)

      if (approvedSubreddits.length === 0) {
        setMetrics({
          total_posts_count: 0,
          total_subreddits_count: 0,
          avg_score_value: 0,
          avg_comments_value: 0,
          best_avg_upvotes_subreddit: 'N/A',
          best_avg_upvotes_value: 0,
          best_engagement_subreddit: 'N/A',
          best_engagement_value: 0,
          top_content_type: 'N/A',
          best_performing_hour: 0
        })
        setSfwCount(0)
        setNsfwCount(0)
        return
      }

      // Use limited subreddit list for metrics to prevent timeout
      const limitedSubreddits = approvedSubreddits.slice(0, 50)
      console.log(`Calculating metrics for ${limitedSubreddits.length} subreddits`)

      // Fetch posts for metrics calculation (limited to prevent timeout)
      let metricsQuery = supabase
        .from('posts')
        .select('score, num_comments, created_utc, subreddit_name, over_18')
        .in('subreddit_name', limitedSubreddits)

      // Apply SFW filter for metrics
      if (sfwOnly) {
        metricsQuery = metricsQuery.eq('over_18', false)
      }

      // Apply age filter for metrics
      if (ageFilter !== 'all') {
        const hoursAgo = ageFilter === '24h' ? 24 : ageFilter === '7d' ? 168 : 720
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        metricsQuery = metricsQuery.gte('created_utc', cutoff)
      }

      // Limit to prevent timeout
      metricsQuery = metricsQuery.limit(2000)

      const { data: metricsData, error: metricsError } = await metricsQuery

      if (metricsError) {
        console.error('Failed to fetch metrics:', metricsError)
        return
      }

      if (!metricsData || metricsData.length === 0) {
        setMetrics({
          total_posts_count: 0,
          total_subreddits_count: 0,
          avg_score_value: 0,
          avg_comments_value: 0,
          best_avg_upvotes_subreddit: 'N/A',
          best_avg_upvotes_value: 0,
          best_engagement_subreddit: 'N/A',
          best_engagement_value: 0,
          top_content_type: 'N/A',
          best_performing_hour: 0
        })
        setSfwCount(0)
        setNsfwCount(0)
        return
      }

      // Calculate counts
      const sfwPosts = metricsData.filter(p => !p.over_18)
      const nsfwPosts = metricsData.filter(p => p.over_18)
      setSfwCount(sfwPosts.length)
      setNsfwCount(nsfwPosts.length)

      // Calculate metrics from the data
      const subredditStats = new Map<string, { totalScore: number; totalComments: number; count: number }>()
      const hourStats = new Map<number, { totalScore: number; count: number }>()

      metricsData.forEach(post => {
        // Subreddit stats
        if (!subredditStats.has(post.subreddit_name)) {
          subredditStats.set(post.subreddit_name, { totalScore: 0, totalComments: 0, count: 0 })
        }
        const stats = subredditStats.get(post.subreddit_name)!
        stats.totalScore += post.score || 0
        stats.totalComments += post.num_comments || 0
        stats.count++

        // Hour stats
        const hour = new Date(post.created_utc).getUTCHours()
        if (!hourStats.has(hour)) {
          hourStats.set(hour, { totalScore: 0, count: 0 })
        }
        const hStats = hourStats.get(hour)!
        hStats.totalScore += post.score || 0
        hStats.count++
      })

      // Find best subreddit by average upvotes
      let bestAvgUpvotesSubreddit = 'N/A'
      let bestAvgUpvotesValue = 0

      subredditStats.forEach((stats, subreddit) => {
        const avgScore = stats.totalScore / stats.count
        if (avgScore > bestAvgUpvotesValue) {
          bestAvgUpvotesValue = avgScore
          bestAvgUpvotesSubreddit = subreddit
        }
      })

      // Find best subreddit by total comments (engagement)
      let bestEngagementSubreddit = 'N/A'
      let bestEngagementValue = 0

      subredditStats.forEach((stats, subreddit) => {
        if (stats.totalComments > bestEngagementValue) {
          bestEngagementValue = stats.totalComments
          bestEngagementSubreddit = subreddit
        }
      })

      // Find best performing hour
      let bestHour = 0
      let bestHourScore = 0

      hourStats.forEach((stats, hour) => {
        const avgScore = stats.totalScore / stats.count
        if (avgScore > bestHourScore) {
          bestHourScore = avgScore
          bestHour = hour
        }
      })

      // Calculate additional metrics
      const uniqueSubreddits = new Set(metricsData.map(p => p.subreddit_name)).size
      const avgScore = metricsData.reduce((sum, p) => sum + (p.score || 0), 0) / metricsData.length
      const avgComments = metricsData.reduce((sum, p) => sum + (p.num_comments || 0), 0) / metricsData.length

      setMetrics({
        total_posts_count: metricsData.length,
        total_subreddits_count: uniqueSubreddits,
        avg_score_value: Math.round(avgScore),
        avg_comments_value: Math.round(avgComments),
        best_avg_upvotes_subreddit: bestAvgUpvotesSubreddit,
        best_avg_upvotes_value: Math.round(bestAvgUpvotesValue),
        best_engagement_subreddit: bestEngagementSubreddit,
        best_engagement_value: Math.round(bestEngagementValue),
        top_content_type: 'image', // Default to image for now
        best_performing_hour: bestHour
      })

    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [sfwOnly, ageFilter, sortBy, fetchApprovedSubreddits])

  // Load more posts
  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(currentPage + 1, true)
    }
  }, [currentPage, loadingMore, hasMore, fetchPosts])

  // Reset and fetch when filters change
  useEffect(() => {
    setCurrentPage(0)
    fetchPosts(0, false)
  }, [debouncedSearchQuery, sfwOnly, ageFilter, sortBy, selectedCategories])

  // Fetch metrics when filters change
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    // Data
    posts,
    metrics,
    sfwCount,
    nsfwCount,
    topCategories,

    // Loading states
    loading,
    loadingMore,
    metricsLoading,
    hasMore,

    // Filter states
    searchQuery,
    selectedCategories,
    isCategoryFiltering,
    sfwOnly,
    ageFilter,
    sortBy,

    // Actions
    setSearchQuery,
    setSelectedCategories,
    setIsCategoryFiltering,
    setSfwOnly,
    setAgeFilter,
    setSortBy,
    loadMorePosts,

    // Error handling
    error,
    setError
  }
}