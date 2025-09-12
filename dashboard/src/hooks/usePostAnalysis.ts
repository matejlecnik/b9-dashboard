import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Post, PostMetrics } from '@/types/post'
import { useDebounce } from './useDebounce'

interface UsePostAnalysisProps {
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
  categoriesLoading: boolean
  hasMore: boolean
  
  // Filter states
  searchQuery: string
  selectedCategories: string[]
  isCategoryFiltering: boolean
  sfwOnly: boolean
  ageFilter: '24h' | '7d' | '30d' | 'all'
  sortBy: 'score' | 'comments'
  
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategories: (categories: string[]) => void
  setIsCategoryFiltering: (filtering: boolean) => void
  setSfwOnly: (sfw: boolean) => void
  setAgeFilter: (age: '24h' | '7d' | '30d' | 'all') => void
  setSortBy: (sort: 'score' | 'comments') => void
  loadMorePosts: () => void
  refreshData: () => void
  
  // Error handling
  error: string | null
  setError: (error: string | null) => void
}

export function usePostAnalysis({ 
  initialPostsPerPage = 20 
}: UsePostAnalysisProps = {}): UsePostAnalysisReturn {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [posts, setPosts] = useState<Post[]>([])
  const [metrics, setMetrics] = useState<PostMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Loading states for individual sections
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  
  // Filter states
  const [sortBy, setSortBy] = useState<'score' | 'comments'>('score')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCategoryFiltering, setIsCategoryFiltering] = useState(false)
  const [sfwOnly, setSfwOnly] = useState<boolean>(false)
  const [ageFilter, setAgeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h')
  
  // Counts for filter badges
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)
  const [topCategories, setTopCategories] = useState<Array<{ category: string; count: number }>>([])
  
  // Refs to prevent concurrent fetches
  const fetchingRef = useRef(false)
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================
  
  const fetchPosts = useCallback(async (page: number = 0, append: boolean = false) => {
    if (fetchingRef.current) return
    
    try {
      fetchingRef.current = true
      if (!append) setLoading(true)
      else setLoadingMore(true)
      
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      let query = supabase
        .from('posts')
        .select(`
          id, reddit_id, title, score, num_comments, created_utc, subreddit_name, 
          content_type, upvote_ratio, thumbnail, url, author_username, preview_data, 
          domain, is_video, is_self, over_18,
          subreddits!inner(
            id, name, display_name_prefixed, category_text, review, over18
          )
        `)
        .order(sortBy, { ascending: false })
        .range(page * initialPostsPerPage, (page + 1) * initialPostsPerPage - 1)
      
      // Apply filters
      if (debouncedSearchQuery) {
        query = query.or(`title.ilike.%${debouncedSearchQuery}%,subreddit_name.ilike.%${debouncedSearchQuery}%`)
      }
      
      if (sfwOnly) {
        query = query.eq('over_18', false)
      }
      
      if (ageFilter !== 'all') {
        const hoursAgo = ageFilter === '24h' ? 24 : ageFilter === '7d' ? 168 : 720
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
        query = query.gte('created_utc', cutoff)
      }
      
      if (isCategoryFiltering && selectedCategories.length > 0) {
        query = query.in('subreddits.category_text', selectedCategories)
      }
      
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
      console.error('Failed to fetch posts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      fetchingRef.current = false
    }
  }, [sortBy, debouncedSearchQuery, sfwOnly, ageFilter, isCategoryFiltering, selectedCategories, initialPostsPerPage])
  
  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true)
      
      const response = await fetch('/api/post-analytics/metrics')
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      
      const data = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
      } else {
        throw new Error(data.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setMetricsLoading(false)
    }
  }, [])
  
  const fetchSFWCounts = useCallback(async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data, error } = await supabase
        .from('posts')
        .select('over_18')
      
      if (error) throw error
      
      const sfw = data?.filter(p => !p.over_18).length || 0
      const nsfw = data?.filter(p => p.over_18).length || 0
      
      setSfwCount(sfw)
      setNsfwCount(nsfw)
    } catch (err) {
      console.error('Failed to fetch SFW counts:', err)
    }
  }, [])
  
  const fetchTopCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      
      const response = await fetch('/api/post-analytics/top-categories')
      if (!response.ok) {
        throw new Error('Failed to fetch top categories')
      }
      
      const data = await response.json()
      if (data.success) {
        setTopCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch top categories:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }, [])
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, currentPage, fetchPosts])
  
  const refreshData = useCallback(() => {
    setCurrentPage(0)
    fetchPosts(0, false)
    fetchMetrics()
    fetchSFWCounts()
    fetchTopCategories()
  }, [fetchPosts, fetchMetrics, fetchSFWCounts, fetchTopCategories])
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initial data load
  useEffect(() => {
    const abortController = new AbortController()
    
    // Load all data in parallel
    Promise.all([
      fetchPosts(0, false),
      fetchMetrics(),
      fetchSFWCounts(),
      fetchTopCategories()
    ]).catch(err => {
      console.error('Initial data load failed:', err)
    })
    
    return () => {
      abortController.abort()
    }
  }, [fetchPosts, fetchMetrics, fetchSFWCounts, fetchTopCategories])
  
  // Refetch posts when filters change
  useEffect(() => {
    if (currentPage > 0 || debouncedSearchQuery || isCategoryFiltering || sfwOnly || ageFilter !== '24h' || sortBy !== 'score') {
      setCurrentPage(0)
      fetchPosts(0, false)
    }
  }, [currentPage, debouncedSearchQuery, isCategoryFiltering, selectedCategories, sfwOnly, ageFilter, sortBy, fetchPosts])
  
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
    categoriesLoading,
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
    refreshData,
    
    // Error handling
    error,
    setError
  }
}
