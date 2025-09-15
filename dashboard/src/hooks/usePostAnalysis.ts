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
  totalPostCount: number
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
  const [totalPostCount, setTotalPostCount] = useState(0)
  const [topCategories] = useState<Array<{ category: string; count: number }>>([])

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
  const categoryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const okSubredditsCache = useRef<string[]>([])

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [debouncedCategories, setDebouncedCategories] = useState<string[]>(allCategories)

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

  // Debounce category changes
  useEffect(() => {
    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current)
    }

    categoryTimeoutRef.current = setTimeout(() => {
      setDebouncedCategories(selectedCategories)
    }, 200)

    return () => {
      if (categoryTimeoutRef.current) {
        clearTimeout(categoryTimeoutRef.current)
      }
    }
  }, [selectedCategories])

  // Fetch approved subreddit names once and cache them
  const fetchApprovedSubreddits = useCallback(async (currentSortBy: PostSortField) => {
    if (!supabase) return []

    try {
      // Build query for approved subreddits
      let query = supabase
        .from('reddit_subreddits')
        .select('name, category_text, avg_upvotes_per_post, avg_comments_per_post')
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%') // Exclude user subreddits

      // Apply category filter at subreddit level
      if (debouncedCategories.length === 0) {
        // Show only uncategorized
        query = query.or('category_text.is.null,category_text.eq.')
      } else if (debouncedCategories.length > 0 && debouncedCategories.length < allCategories.length) {
        // Show only selected categories (but not when all are selected)
        query = query.in('category_text', debouncedCategories)
      }
      // If all categories selected (length === allCategories.length), no filter needed

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

      // Fetch more subreddits for better data coverage
      // Increased limit to show more posts
      query = query.limit(200)

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
  }, [debouncedCategories, allCategories.length])

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
        setPosts(append ? (prevPosts) => prevPosts : [])
        setHasMore(false)
        setError(null)
        return
      }

      // Build the base query for posts
      let query = supabase
        .from('reddit_posts')
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

      // Process posts and add category from approved subreddits data
      const subredditCategoryMap = new Map<string, string | null>()

      // Build a map of subreddit names to categories from our approved list
      const { data: subredditData } = await supabase
        .from('reddit_subreddits')
        .select('name, category_text')
        .in('name', approvedSubreddits)

      if (subredditData) {
        subredditData.forEach(sub => {
          subredditCategoryMap.set(sub.name, sub.category_text)
        })
      }

      // Add category to each post and ensure unique by reddit_id
      const seenRedditIds = new Set<string>()
      const newPosts = (data || [])
        .filter((post: any) => {
          // Filter out duplicates based on reddit_id
          if (seenRedditIds.has(post.reddit_id)) {
            return false
          }
          seenRedditIds.add(post.reddit_id)
          return true
        })
        .map((post: any) => ({
          ...post,
          category_text: subredditCategoryMap.get(post.subreddit_name) || null
        })) as Post[]

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
  }, [sortBy, debouncedSearchQuery, sfwOnly, ageFilter, fetchApprovedSubreddits, initialPostsPerPage])

  // Fetch actual total post count with all filters applied
  const fetchTotalCount = useCallback(async () => {
    if (!supabase) return 0

    try {
      // Get approved subreddit names (already filtered by categories)
      const approvedSubreddits = okSubredditsCache.current.length > 0
        ? okSubredditsCache.current
        : await fetchApprovedSubreddits(sortBy)

      if (approvedSubreddits.length === 0) {
        setTotalPostCount(0)
        setSfwCount(0)
        setNsfwCount(0)
        return 0
      }

      // Build base query for total count
      let baseQuery = supabase
        .from('reddit_posts')
        .select('*', { count: 'exact', head: true })
        .in('subreddit_name', approvedSubreddits)

      // Apply age filter
      if (ageFilter !== 'all') {
        const hoursAgo = ageFilter === '24h' ? 24 : ageFilter === '7d' ? 168 : 720
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        baseQuery = baseQuery.gte('created_utc', cutoff)
      }

      // Apply search filter if present
      if (debouncedSearchQuery) {
        baseQuery = baseQuery.or(`title.ilike.%${debouncedSearchQuery}%,subreddit_name.ilike.%${debouncedSearchQuery}%,author_username.ilike.%${debouncedSearchQuery}%`)
      }

      // Get SFW count
      const sfwQuery = baseQuery.eq('over_18', false)
      const { count: sfwCountResult, error: sfwError } = await sfwQuery

      if (sfwError) {
        console.error('Failed to fetch SFW count:', sfwError)
      }

      // Get NSFW count (rebuild query to avoid mutation)
      let nsfwBaseQuery = supabase
        .from('reddit_posts')
        .select('*', { count: 'exact', head: true })
        .in('subreddit_name', approvedSubreddits)
        .eq('over_18', true)

      // Apply same filters to NSFW query
      if (ageFilter !== 'all') {
        const hoursAgo = ageFilter === '24h' ? 24 : ageFilter === '7d' ? 168 : 720
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        nsfwBaseQuery = nsfwBaseQuery.gte('created_utc', cutoff)
      }

      if (debouncedSearchQuery) {
        nsfwBaseQuery = nsfwBaseQuery.or(`title.ilike.%${debouncedSearchQuery}%,subreddit_name.ilike.%${debouncedSearchQuery}%,author_username.ilike.%${debouncedSearchQuery}%`)
      }

      const { count: nsfwCountResult, error: nsfwError } = await nsfwBaseQuery

      if (nsfwError) {
        console.error('Failed to fetch NSFW count:', nsfwError)
      }

      // Set the counts
      const finalSfwCount = sfwCountResult || 0
      const finalNsfwCount = nsfwCountResult || 0
      const finalTotalCount = finalSfwCount + finalNsfwCount

      setSfwCount(finalSfwCount)
      setNsfwCount(finalNsfwCount)
      setTotalPostCount(finalTotalCount)

      return finalTotalCount

    } catch (err) {
      console.error('Failed to fetch total count:', err)
      return 0
    }
  }, [sfwOnly, ageFilter, sortBy, fetchApprovedSubreddits, debouncedSearchQuery])

  // Fetch metrics
  const fetchMetrics = useCallback(async (currentTotalCount?: number) => {
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

      // Use all approved subreddits for comprehensive metrics
      console.log(`Calculating metrics for ${approvedSubreddits.length} subreddits`)

      // Fetch posts for metrics calculation with all approved subreddits
      let metricsQuery = supabase
        .from('reddit_posts')
        .select('score, num_comments, created_utc, subreddit_name, over_18')
        .in('subreddit_name', approvedSubreddits)

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

      // Increased limit for more accurate metrics
      metricsQuery = metricsQuery.limit(5000)

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

      // Don't set SFW/NSFW counts here - we get them from fetchTotalCount()

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
        total_posts_count: currentTotalCount || totalPostCount || metricsData.length,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sfwOnly, ageFilter, sortBy, debouncedCategories])

  // Fetch counts and metrics when filters change
  useEffect(() => {
    const fetchCountsAndMetrics = async () => {
      // First fetch total count
      const totalCount = await fetchTotalCount()
      // Then fetch metrics with the actual total count
      await fetchMetrics(totalCount)
    }

    fetchCountsAndMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfwOnly, ageFilter, sortBy, debouncedCategories])

  return {
    // Data
    posts,
    metrics,
    sfwCount,
    nsfwCount,
    totalPostCount,
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