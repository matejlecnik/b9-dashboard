'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { SlimPostToolbar } from '@/components/SlimPostToolbar'
import { VirtualizedPostGrid } from '@/components/VirtualizedPostGrid'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { Tooltip } from '@/components/Tooltip'
import { Post, PostMetrics } from '@/types/post'
import { useDebounce } from '@/hooks/useDebounce'
import { GlassPanel } from '@/components/ui/glass-panel'
import { 
  FileText, 
  Trophy,
  Target,
  Tags,
  X,
} from 'lucide-react'

const POSTS_PER_PAGE = 20 // Optimized for faster initial load performance

export default function PostAnalysisPage() {
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
  
  
  // Add ref to prevent concurrent fetches
  const fetchingRef = useRef(false)
  
  // Counts for filter badges
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)
  const [topCategories, setTopCategories] = useState<Array<{category: string, count: number}>>([])
  
  
  // Use debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Helper: compute since ISO based on current age filter
  const getSinceIso = useCallback(() => {
    const now = Date.now()
    const windowMs = ageFilter === '24h' ? 24 * 60 * 60 * 1000
      : ageFilter === '7d' ? 7 * 24 * 60 * 60 * 1000
      : ageFilter === '30d' ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000
    return new Date(now - windowMs).toISOString()
  }, [ageFilter])

  // Lightweight fallback metrics to avoid RPC timeouts and honor time window
  const fetchMetricsFallback = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      const sinceIso = getSinceIso()

      // Approximate totals and build sample for averages and leaderboard
      const [{ count: totalPostsEstCount }, { count: totalOkSubsCount }, sampleResult] = await Promise.all([
        supabase
          .from('posts')
          .select('id, subreddits!inner(review)', { count: 'estimated', head: true })
          .eq('subreddits.review', 'Ok')
          .gte('created_utc', sinceIso),
        supabase
          .from('subreddits')
          .select('id', { count: 'exact', head: true })
          .eq('review', 'Ok'),
        // Pull a recent sample to compute averages and best-of metrics
        supabase
          .from('posts')
          .select('score, num_comments, subreddit_name, content_type, created_utc')
          .gte('created_utc', sinceIso)
          .eq('subreddits.review', 'Ok')
          .order('created_utc', { ascending: false })
          .limit(3000)
      ])

      if (signal?.aborted) return

      const sampleRows = (sampleResult.data || []) as Array<{ score: number | null; num_comments: number | null; subreddit_name: string | null; content_type?: string | null; created_utc?: string }>
      const sampleLength = sampleRows.length || 1
      const totalScore = sampleRows.reduce((acc, r) => acc + (Number(r.score) || 0), 0)
      const totalComments = sampleRows.reduce((acc, r) => acc + (Number(r.num_comments) || 0), 0)

      // Compute best avg upvotes per subreddit
      const bySub: Record<string, { sumScore: number; sumEngagement: number; count: number }> = {}
      const byHour: Record<number, { sumScore: number; count: number }> = {}
      const contentCount: Record<string, number> = {}

      for (const r of sampleRows) {
        const sub = (r.subreddit_name || 'unknown').toString()
        const score = Number(r.score) || 0
        const comments = Number(r.num_comments) || 0
        if (!bySub[sub]) bySub[sub] = { sumScore: 0, sumEngagement: 0, count: 0 }
        bySub[sub].sumScore += score
        bySub[sub].sumEngagement += comments / Math.max(score, 1)
        bySub[sub].count += 1

        // hour-of-day by created_utc
        if (r.created_utc) {
          const d = new Date(r.created_utc)
          const hour = d.getUTCHours()
          if (!byHour[hour]) byHour[hour] = { sumScore: 0, count: 0 }
          byHour[hour].sumScore += score
          byHour[hour].count += 1
        }

        // content type tally
        const c = (r.content_type || 'image').toString()
        contentCount[c] = (contentCount[c] || 0) + 1
      }

      let bestAvgSub = 'N/A'
      let bestAvgVal = 0
      let bestEngSub = 'N/A'
      let bestEngVal = 0

      Object.entries(bySub).forEach(([sub, agg]) => {
        if (agg.count >= 3) {
          const avgScore = agg.sumScore / agg.count
          const avgEng = agg.sumEngagement / agg.count
          if (avgScore > bestAvgVal) {
            bestAvgVal = avgScore
            bestAvgSub = sub
          }
          if (avgEng > bestEngVal) {
            bestEngVal = avgEng
            bestEngSub = sub
          }
        }
      })

      // Best performing hour by average score
      let bestHour = 12
      let bestHourAvg = -1
      Object.entries(byHour).forEach(([h, agg]) => {
        const avg = agg.count ? agg.sumScore / agg.count : 0
        if (avg > bestHourAvg) {
          bestHourAvg = avg
          bestHour = Number(h)
        }
      })

      // Top content type
      let topContent = 'image'
      let topCount = -1
      Object.entries(contentCount).forEach(([k, v]) => {
        if (v > topCount) {
          topCount = v
          topContent = k
        }
      })

      const approx: PostMetrics = {
        total_posts_count: totalPostsEstCount || 0,
        total_subreddits_count: totalOkSubsCount || 0,
        avg_score_value: Math.round((totalScore / sampleLength) * 100) / 100,
        avg_comments_value: Math.round((totalComments / sampleLength) * 100) / 100,
        best_avg_upvotes_subreddit: bestAvgSub,
        best_avg_upvotes_value: bestAvgVal,
        best_engagement_subreddit: bestEngSub,
        best_engagement_value: bestEngVal,
        top_content_type: topContent,
        best_performing_hour: bestHour,
      }
      setMetrics(approx)
    } catch (fallbackErr) {
      if (process.env.NODE_ENV !== 'production') {
        const em = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'
        console.error('Metrics fallback failed:', em, fallbackErr)
      }
    } finally {
      if (!signal?.aborted) {
        setMetricsLoading(false)
      }
    }
  }, [supabase, getSinceIso])

  // Fetch metrics with abort controller and loading state
  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      setMetricsLoading(true)
      if (process.env.NODE_ENV !== 'production') console.log('Fetching metrics...')
      const { data, error } = await supabase.rpc('get_post_analytics_metrics')
      
      if (signal?.aborted) return
      
      if (error) {
        const message = error?.message || 'Unknown error'
        const isTimeout = /timeout/i.test(message) || /statement timeout/i.test(message)
        if (process.env.NODE_ENV !== 'production') {
          const logDetails = { code: error?.code, details: error?.details, hint: error?.hint, fullError: JSON.stringify(error) }
          if (isTimeout) {
            console.warn('Metrics RPC timed out, switching to fallback:', message, logDetails)
          } else {
            console.error('Error fetching metrics:', message, logDetails)
          }
        }
        // On timeouts or server-side errors, fall back to lightweight metrics without surfacing page-level error
        await fetchMetricsFallback(signal)
        return
      }
      
      if (data && data.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.log('Metrics fetched successfully:', data[0])
        const raw = data[0] as Record<string, unknown>
        // Map RPC response fields to expected interface - RPC returns different field names
        const normalized = {
          total_posts_count: raw.total_posts ?? raw.total_posts_count ?? 0,
          total_subreddits_count: raw.total_subreddits ?? raw.total_subreddits_count ?? 0,
          avg_score_value: Number(raw.avg_score ?? raw.avg_score_value ?? 0),
          avg_comments_value: Number(raw.avg_comments ?? raw.avg_comments_value ?? 0),
          best_avg_upvotes_subreddit: raw.best_avg_upvotes_subreddit ?? '',
          best_avg_upvotes_value: Number(raw.best_avg_upvotes_value ?? 0),
          best_engagement_subreddit: raw.best_engagement_subreddit ?? '',
          best_engagement_value: Number(raw.best_engagement_value ?? 0),
          top_content_type: raw.top_content_type ?? 'image',
          best_performing_hour: raw.best_performing_hour ?? 12,
        } as PostMetrics
        setMetrics(normalized)
      } else {
        console.warn('No metrics data returned')
      }
      setMetricsLoading(false)
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Exception fetching metrics:', errorMessage, err)
      }
      // Degrade gracefully on exceptions as well
      await fetchMetricsFallback(signal)
    }
  }, [supabase, fetchMetricsFallback])

  // Fetch SFW/NSFW counts with abort controller
  const fetchSFWCounts = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      if (process.env.NODE_ENV !== 'production') console.log('Fetching SFW/NSFW counts...')
      const [sfwResult, nsfwResult] = await Promise.all([
        supabase
          .from('posts')
          .select('id, subreddits!inner(review)', { count: 'exact', head: true })
          .eq('over_18', false)
          .eq('subreddits.review', 'Ok'),
        supabase
          .from('posts')
          .select('id, subreddits!inner(review)', { count: 'exact', head: true })
          .eq('over_18', true)
          .eq('subreddits.review', 'Ok')
      ])

      if (signal?.aborted) return
      
      const sfwCountValue = sfwResult.count || 0
      const nsfwCountValue = nsfwResult.count || 0
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('SFW count:', sfwCountValue, 'NSFW count:', nsfwCountValue)
      }
      
      setSfwCount(sfwCountValue)
      setNsfwCount(nsfwCountValue)
    } catch (error) {
      if (signal?.aborted) {
        console.log('SFW counts fetch was aborted')
        return
      }
      if (process.env.NODE_ENV !== 'production') {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error fetching SFW counts:', errorMessage, error)
      }
      // Set fallback values on error
      setSfwCount(0)
      setNsfwCount(0)
    }
  }, [supabase])

  // Fetch top categories - optimized to use aggregation
  const fetchTopCategories = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      setCategoriesLoading(true)
      if (process.env.NODE_ENV !== 'production') console.log('Fetching top categories...')
      const { data, error } = await supabase
        .rpc('get_top_categories_for_posts', { limit_count: 3 })
        
      if (signal?.aborted) return

      if (error) {
        if (process.env.NODE_ENV !== 'production') console.log('RPC function not found, using fallback query')
        // Fallback: count categories from posts in current time window
        const sinceIso = getSinceIso()
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('posts')
          .select('subreddits!inner(category_text, review)')
          .gte('created_utc', sinceIso)
          .eq('subreddits.review', 'Ok')
          .limit(3000)

        if (fallbackError) {
          if (process.env.NODE_ENV !== 'production') console.error('Error fetching categories (fallback):', fallbackError?.message || 'Unknown error', fallbackError)
          setCategoriesLoading(false)
          return
        }

        // Optimized counting with Map for better performance
        const categoryCount = new Map<string, number>()
        fallbackData?.forEach((item: any) => {
          const categoryText = Array.isArray(item.subreddits)
            ? item.subreddits[0]?.category_text
            : item.subreddits?.category_text
          if (categoryText) categoryCount.set(categoryText, (categoryCount.get(categoryText) || 0) + 1)
        })

        const sortedCategories = Array.from(categoryCount.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category, count]) => ({ category, count }))

        if (signal?.aborted) return
        
        if (process.env.NODE_ENV !== 'production') console.log('Top categories (fallback):', sortedCategories)
        setTopCategories(sortedCategories)
        setCategoriesLoading(false)
      } else if (data) {
        if (process.env.NODE_ENV !== 'production') console.log('Top categories:', data)
        setTopCategories(data)
        setCategoriesLoading(false)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error fetching categories:', errorMessage, error)
      }
      setCategoriesLoading(false)
    }
  }, [supabase, getSinceIso])

  // Fetch posts with optimized query and abort controller
  const fetchPosts = useCallback(async (page = 0, append = false, signal?: AbortSignal) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      // Prevent concurrent fetches
      if (fetchingRef.current && !append) {
        console.log('Already fetching, skipping request')
        return
      }
      
      fetchingRef.current = true
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching posts - page:', page, 'append:', append)
      }
      
      if (signal?.aborted) {
        fetchingRef.current = false
        return
      }
      
      if (page === 0) {
        setLoading(true)
        setPosts([])
        setError(null) // Clear any previous errors
      } else {
        setLoadingMore(true)
      }
      
      // Build the query with explicit columns and proper JOIN syntax
      let query = supabase
        .from('posts')
        .select(`
          id, reddit_id, title, score, num_comments, created_utc, subreddit_name, content_type, upvote_ratio, thumbnail, url, author_username, preview_data, domain, is_video, is_self, over_18,
          subreddits!inner (
            review,
            category_text
          )
        `)
        .eq('subreddits.review', 'Ok')
        .not('title', 'is', null)

      // Apply category filter
      if (isCategoryFiltering && selectedCategories.length > 0) {
        query = query.in('subreddits.category_text', selectedCategories)
      }

      // Apply SFW filter
      if (sfwOnly) {
        query = query.eq('over_18', false)
      }

      // Apply age filter
      if (ageFilter !== 'all') {
        const now = new Date()
        let cutoffDate: Date
        
        switch (ageFilter) {
          case '24h':
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case '7d':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            cutoffDate = new Date(0) // No filter
        }
        
        query = query.gte('created_utc', cutoffDate.toISOString())
      }

      // Apply search filter using debounced value
      if (debouncedSearchQuery.trim()) {
        const searchTerm = debouncedSearchQuery.trim()
        if (process.env.NODE_ENV !== 'production') {
          console.log('Applying search filter:', searchTerm)
        }
        query = query.or(`title.ilike.%${searchTerm}%,subreddit_name.ilike.%${searchTerm}%,author_username.ilike.%${searchTerm}%`)
      }

      // Apply sorting
      switch (sortBy) {
        case 'score':
          query = query.order('score', { ascending: false }).order('created_utc', { ascending: false, nullsFirst: false })
          break
        case 'comments':
          query = query.order('num_comments', { ascending: false }).order('created_utc', { ascending: false, nullsFirst: false })
          break
      }

      // Add pagination
      const from = page * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1
      query = query.range(from, to)

      if (process.env.NODE_ENV !== 'production') {
        console.log('Query built, executing...')
      }
      performance.mark?.('posts-fetch-start')
      const { data, error } = await query
      performance.mark?.('posts-fetch-end')
      try { performance.measure?.('posts-fetch', 'posts-fetch-start', 'posts-fetch-end') } catch {}
      
      if (signal?.aborted) return

      if (error) {
        console.error('Error fetching posts:', error?.message || 'Unknown error', {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          fullError: JSON.stringify(error)
        })
        setError(`Failed to load posts: ${error?.message || 'Unknown error'}`)
        return
      }

      if (data) {
        if (signal?.aborted) return
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Fetched ${data.length} posts`)
        }
        // Transform data to include category with defensive fallbacks and proper typing
        const transformedPosts = data.map((post: Post) => ({
          ...post,
          // Ensure all required fields have safe defaults
          score: Number(post.score) || 0,
          num_comments: Number(post.num_comments) || 0,
          upvote_ratio: Number(post.upvote_ratio) || 0,
          title: post.title || 'Untitled',
          subreddit_name: post.subreddit_name || 'unknown',
          author_username: post.author_username || 'deleted',
          // Ensure booleans are properly typed
          over_18: Boolean(post.over_18),
          is_video: Boolean(post.is_video),
          is_self: Boolean(post.is_self),
          // Ensure preview_data is properly structured
          preview_data: post.preview_data || null
        })) as Post[]
        
        if (append) {
          setPosts(prev => [...prev, ...transformedPosts])
        } else {
          setPosts(transformedPosts)
        }
        
        setHasMore(data.length === POSTS_PER_PAGE)
        setCurrentPage(page)
      } else {
        console.warn('No posts data returned')
      }
    } catch (error) {
      if (signal?.aborted) {
        console.log('Posts fetch was aborted')
        return
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Exception fetching posts:', errorMessage, error)
      setError(`Failed to load posts: ${errorMessage}`)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
      fetchingRef.current = false
    }
  }, [supabase, sortBy, selectedCategories, isCategoryFiltering, sfwOnly, ageFilter, debouncedSearchQuery])

  // Load more posts - use ref to store current fetch function and stabilize callback
  const fetchPostsRef = useRef(fetchPosts)
  fetchPostsRef.current = fetchPosts
  
  // Use refs for frequently changing values to stabilize callback
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  
  const loadingMoreRef = useRef(loadingMore)
  loadingMoreRef.current = loadingMore
  
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  
  const handleLoadMore = useCallback(() => {
    if (!loadingMoreRef.current && hasMoreRef.current && !fetchingRef.current) {
      fetchPostsRef.current(currentPageRef.current + 1, true)
    }
  }, []) // No dependencies - all values accessed via refs

  // Consolidated effect for all filter changes with improved cleanup
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchData = async () => {
      try {
        setCurrentPage(0)
        setError(null)
        fetchingRef.current = false
        await fetchPosts(0, false, abortController.signal)
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && !abortController.signal.aborted) {
          console.error('Filter change fetch error:', err.message, err)
          setError(`Failed to apply filters: ${err.message}`)
        } else if (!(err instanceof Error) && !abortController.signal.aborted) {
          console.error('Filter change fetch error: Unknown error', err)
          setError('Failed to apply filters: Unknown error')
        }
      }
    }
    
    fetchData()
    
    return () => {
      abortController.abort()
      fetchingRef.current = false
    }
  }, [debouncedSearchQuery, sortBy, selectedCategories, isCategoryFiltering, sfwOnly, ageFilter, fetchPosts])

  // Initial metadata fetch - separate from posts since they don't change with filters
  useEffect(() => {
    const abortController = new AbortController()
    
    const initializeData = async () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Initializing post-analysis page metadata...')
      }
      try {
        // Fetch all initial metadata with abort signal and timeout
        const results = await Promise.allSettled([
          Promise.race([
            fetchMetrics(abortController.signal),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Metrics timeout')), 10000)
            )
          ]),
          Promise.race([
            fetchSFWCounts(abortController.signal),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SFW counts timeout')), 10000)
            )
          ]),
          Promise.race([
            fetchTopCategories(abortController.signal),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Categories timeout')), 10000)
            )
          ])
        ])
        
        // Log any failures for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const names = ['metrics', 'SFW counts', 'categories']
            console.error(`Initial ${names[index]} fetch failed:`, result.reason)
          }
        })
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && !abortController.signal.aborted) {
          console.error('Error initializing metadata:', err.message, err)
        } else if (!(err instanceof Error) && !abortController.signal.aborted) {
          console.error('Error initializing metadata: Unknown error', err)
        }
      }
    }
    
    initializeData()
    
    return () => {
      abortController.abort()
    }
  }, [fetchMetrics, fetchSFWCounts, fetchTopCategories])


  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-900">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-gray-800 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Metrics Dashboard - unified card style */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5 mb-1">
          {/* Total Posts */}
          <div className={`rounded-lg p-1.5 transition-all duration-200 hover:shadow-sm border border-black/5 bg-pink-50`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg text-gray-700`} style={{ background: 'rgba(0, 0, 0, 0.03)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <FileText className="h-3 w-3" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif', textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' }}>
                {metricsLoading ? '...' : (metrics?.total_posts_count.toLocaleString('en-US') || '0')}
              </div>
              <div className="text-[10px] font-semibold text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>Total Posts</div>
              <div className="text-[9px] text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>In selected window</div>
            </div>
          </div>

          {/* Best Upvotes */}
          <div className={`rounded-lg p-1.5 transition-all duration-200 hover:shadow-sm border border-black/5 bg-pink-50`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg text-gray-700`} style={{ background: 'rgba(0, 0, 0, 0.03)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <Trophy className="h-3 w-3" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif', textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' }}>
                {metricsLoading ? '...' : `r/${metrics?.best_avg_upvotes_subreddit || 'N/A'}`}
              </div>
              <div className="text-[10px] font-semibold text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>Best Avg Upvotes</div>
              <div className="text-[9px] text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>{metricsLoading ? '' : `${Math.round(metrics?.best_avg_upvotes_value || 0)} avg`}</div>
            </div>
          </div>

          {/* Best Engagement */}
          <div className={`rounded-lg p-1.5 transition-all duration-200 hover:shadow-sm border border-black/5 bg-pink-50`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg text-gray-700`} style={{ background: 'rgba(0, 0, 0, 0.03)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <Target className="h-3 w-3" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif', textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' }}>
                {metricsLoading ? '...' : `r/${metrics?.best_engagement_subreddit || 'N/A'}`}
              </div>
              <div className="text-[10px] font-semibold text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>Best Engagement</div>
              <div className="text-[9px] text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>{metricsLoading ? '' : `${Math.round((metrics?.best_engagement_value || 0) * 100)}% ratio`}</div>
            </div>
          </div>

          {/* Top Category */}
          <div className={`rounded-lg p-1.5 transition-all duration-200 hover:shadow-sm border border-black/5 bg-pink-50`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg text-gray-700`} style={{ background: 'rgba(0, 0, 0, 0.03)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <Tags className="h-3 w-3" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif', textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' }}>
                {categoriesLoading ? '...' : (topCategories[0]?.category || 'N/A')}
              </div>
              <div className="text-[10px] font-semibold text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>Top Category</div>
              <div className="text-[9px] text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' }}>{categoriesLoading ? '' : `${topCategories[0]?.count || 0} subreddits`}</div>
            </div>
          </div>
        </div>

        {/* Enhanced Toolbar with Post Count */}
        <SlimPostToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          isCategoryFiltering={isCategoryFiltering}
          onToggleCategoryFilter={() => setIsCategoryFiltering(!isCategoryFiltering)}
          sfwOnly={sfwOnly}
          onSFWOnlyChange={setSfwOnly}
          ageFilter={ageFilter}
          onAgeFilterChange={setAgeFilter}
          loading={loading || loadingMore}
          sfwCount={sfwCount}
          nsfwCount={nsfwCount}
          currentPostCount={posts.length}
          totalAvailablePosts={metrics?.total_posts_count || 0}
        />

        {/* Virtualized Post Grid with Error Boundary */}
        <ComponentErrorBoundary componentName="Post Grid">
          <VirtualizedPostGrid
            posts={posts}
            loading={loading || loadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </ComponentErrorBoundary>
      </div>
      
    </DashboardLayout>
  )
}