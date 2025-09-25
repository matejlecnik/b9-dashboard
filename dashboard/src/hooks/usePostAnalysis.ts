import { useEffect, useRef, useState, useCallback } from 'react'
import { useViralPosts } from './queries/useViralPosts'
import { Post, PostMetrics } from '@/types/post'
// import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// Define types locally since PostAnalysisToolbar was removed
type PostSortField = 'score' | 'upvote_ratio' | 'num_comments' | 'created_utc'
type AgeFilter = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | 'all'

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

  // All categories list
  const allCategories = [
    'Age Demographics', 'Ass & Booty', 'Body Types & Features', 'Boobs & Chest',
    'Clothed & Dressed', 'Cosplay & Fantasy', 'Ethnic & Cultural', 'Feet & Foot Fetish',
    'Full Body & Nude', 'Goth & Alternative', 'Gym & Fitness', 'Interactive & Personalized',
    'Lifestyle & Themes', 'Lingerie & Underwear', 'OnlyFans Promotion', 'Selfie & Amateur',
    'Specific Body Parts'
  ]

  // Filter states - most filters removed since database handles them
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]) // Empty - let database handle filtering
  const [isCategoryFiltering, setIsCategoryFiltering] = useState(false)
  const [sfwOnly, setSfwOnly] = useState(false) // Not used - database handles this
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all') // Not used - database uses 72h
  const [sortBy, setSortBy] = useState<PostSortField>('score')

  // Error handling
  const [error, setError] = useState<string | null>(null)

  // Refs for preventing double fetches
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const categoryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Debounce category changes and clear cache
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


  // Use React Query for optimized viral posts fetching
  const {
    data: viralPostsData,
    isLoading: viralPostsLoading,
    isFetching: viralPostsFetching,
    error: viralPostsError,
    refetch: refetchViralPosts
  } = useViralPosts({
    timeRangeHours: 72, // 3 days as requested
    postsPerSubreddit: 3, // 3 posts per subreddit as requested
    totalLimit: 10000, // Fetch up to 10k posts
    searchQuery: debouncedSearchQuery
  })

  // Debug what we're receiving
  console.log('[PostAnalysis] Hook data:', {
    viralPostsData,
    dataType: typeof viralPostsData,
    isArray: Array.isArray(viralPostsData),
    length: viralPostsData?.length,
    firstItem: viralPostsData?.[0],
    loading: viralPostsLoading
  })

  // Store all posts internally but display paginated
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [displayedPostsCount, setDisplayedPostsCount] = useState(initialPostsPerPage)

  // Process viral posts when data changes
  useEffect(() => {
    console.log('[PostAnalysis] useEffect triggered with:', {
      dataReceived: viralPostsData,
      dataLength: viralPostsData?.length,
      loading: viralPostsLoading,
      dataType: typeof viralPostsData,
      isArray: Array.isArray(viralPostsData)
    })

    if (!viralPostsLoading && viralPostsData) {
      // Ensure we have an array
      const postsArray = Array.isArray(viralPostsData)
        ? (viralPostsData as Array<Post & { viral_score?: number }>)
        : []

      console.log('[PostAnalysis] Processing posts array:', {
        arrayLength: postsArray.length,
        firstPost: postsArray[0]
      })

      if (postsArray.length > 0) {
        // Add viralScore property for display if it doesn't exist
        const processedPosts = postsArray.map((post) => ({
          ...post,
          viralScore: (post.viral_score ?? 0) * 100 // Convert to percentage for display
        }))

        // Store all posts internally
        setAllPosts(processedPosts)

        // Display only the initial page
        const initialPosts = processedPosts.slice(0, initialPostsPerPage)
        setPosts(initialPosts)
        setDisplayedPostsCount(initialPostsPerPage)
        setHasMore(processedPosts.length > initialPostsPerPage)
        setError(null)

        console.log('[PostAnalysis] Successfully set', initialPosts.length, 'posts to display out of', processedPosts.length, 'total')
        logger.log('[PostAnalysis] Processed', processedPosts.length, 'viral posts from React Query, displaying', initialPosts.length)
      } else {
        console.log('[PostAnalysis] Empty posts array, clearing state')
        setAllPosts([])
        setPosts([])
        setDisplayedPostsCount(0)
        setHasMore(false)
      }
    } else if (viralPostsLoading) {
      console.log('[PostAnalysis] Still loading, not updating posts')
    }
  }, [viralPostsData, viralPostsLoading, initialPostsPerPage])

  // Handle loading states
  useEffect(() => {
    setLoading(viralPostsLoading)
    setLoadingMore(viralPostsFetching && !viralPostsLoading)
  }, [viralPostsLoading, viralPostsFetching])

  // Handle errors
  useEffect(() => {
    if (viralPostsError) {
      const errorMessage = viralPostsError instanceof Error ? viralPostsError.message : 'Failed to fetch posts'
      setError(errorMessage)
      logger.error('[PostAnalysis] Error from React Query:', viralPostsError)
    }
  }, [viralPostsError])

  // Main fetch function now just triggers refetch
  const fetchPosts = useCallback(async (append: boolean = false) => {
    if (!append) {
      setPosts([])
    }
    await refetchViralPosts()
  }, [refetchViralPosts])

  // Load more posts from the stored array
  const loadMorePosts = useCallback(() => {
    if (loadingMore || !hasMore) {
      console.log('[PostAnalysis] Cannot load more:', { loadingMore, hasMore })
      return
    }

    setLoadingMore(true)

    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextCount = Math.min(displayedPostsCount + PAGE_SIZE, allPosts.length)
      const morePosts = allPosts.slice(0, nextCount)

      setPosts(morePosts)
      setDisplayedPostsCount(nextCount)
      setHasMore(nextCount < allPosts.length)
      setLoadingMore(false)

      console.log('[PostAnalysis] Loaded more posts:', {
        showing: nextCount,
        total: allPosts.length,
        hasMore: nextCount < allPosts.length
      })
    }, 300)
  }, [loadingMore, hasMore, displayedPostsCount, allPosts])


  // (Removed unused fetchTotalCount to simplify and satisfy linter)

  // Calculate metrics from viral posts data
  const fetchMetrics = useCallback(async () => {
    if (!viralPostsData || viralPostsData.length === 0) {
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
      setMetricsLoading(false)
      return
    }

    try {
      setMetricsLoading(true)

      // Calculate metrics directly from viral posts data
      const sourcePosts = (Array.isArray(viralPostsData)
        ? (viralPostsData as Array<Post & { sub_over18?: boolean }>)
        : [])

      const subredditStats = new Map<string, { totalScore: number; totalComments: number; count: number }>()
      const hourStats = new Map<number, { totalScore: number; count: number }>()
      let sfwPostCount = 0
      let nsfwPostCount = 0

      sourcePosts.forEach((post) => {
        // Count SFW/NSFW
        if (post.over_18 || post.sub_over18) {
          nsfwPostCount++
        } else {
          sfwPostCount++
        }

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
      const uniqueSubreddits = new Set(sourcePosts.map((p) => p.subreddit_name)).size
      const avgScore = sourcePosts.reduce((sum, p) => sum + (p.score || 0), 0) / sourcePosts.length
      const avgComments = sourcePosts.reduce((sum, p) => sum + (p.num_comments || 0), 0) / sourcePosts.length

      setSfwCount(sfwPostCount)
      setNsfwCount(nsfwPostCount)
      setTotalPostCount(sourcePosts.length)

      setMetrics({
        total_posts_count: sourcePosts.length,
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
      logger.error('Failed to calculate metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }, [viralPostsData])

  // Reset and fetch when filters change
  useEffect(() => {
    setDisplayedPostsCount(initialPostsPerPage) // Reset displayed count
    fetchPosts(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sfwOnly, ageFilter, sortBy, debouncedCategories, initialPostsPerPage])

  // Fetch metrics when viral posts data changes
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

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