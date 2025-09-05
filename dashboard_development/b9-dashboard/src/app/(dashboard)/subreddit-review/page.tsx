'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit } from '../../../lib/supabase'
import { MetricsCards } from '@/components/MetricsCards'
import { SubredditTable } from '@/components/SubredditTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useToast } from '@/components/ui/toast'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/SkeletonLoaders'
import { useErrorHandler } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { UnifiedFilters } from '@/components/UnifiedFilters'
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

type FilterType = 'uncategorized' | 'ok' | 'no-seller'

const PAGE_SIZE = 50 // Load 50 records at a time

export default function SubredditReviewPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [totalSubreddits, setTotalSubreddits] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('uncategorized')
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    uncategorized: 0,
    ok: 0,
    noSeller: 0,
    nonRelated: 0
  })
  const [newTodayCount, setNewTodayCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const observerRef = useRef<HTMLDivElement>(null)
  
  // Filter subreddits based on search query
  const filteredSubreddits = subreddits.filter(subreddit => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        subreddit.name.toLowerCase().includes(query) ||
        subreddit.display_name_prefixed.toLowerCase().includes(query) ||
        subreddit.title?.toLowerCase().includes(query) ||
        subreddit.top_content_type?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }
    return true
  })

  // Use all filtered subreddits (no pagination)
  const displayedSubreddits = filteredSubreddits

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  // Keyboard shortcuts configuration
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'h',
      ctrl: true,
      action: () => window.location.href = '/',
      description: 'Go to Dashboard Home',
      category: 'Navigation'
    },
    {
      key: 'c',
      ctrl: true,
      action: () => window.location.href = '/subreddit-review',
      description: 'Go to Subreddit Review',
      category: 'Navigation',
      preventDefault: false
    },
    // Search and Filtering
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Focus Search Bar',
      category: 'Search'
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Quick Search',
      category: 'Search'
    },
    // Bulk Actions
    {
      key: 'a',
      ctrl: true,
      action: () => setSelectedSubreddits(new Set(displayedSubreddits.map(sub => sub.id))),
      description: 'Select All on Current Page',
      category: 'Actions'
    },
    {
      key: 'Escape',
      action: () => {
        setSelectedSubreddits(new Set())
        setSearchQuery('')
      },
      description: 'Clear Selection & Search',
      category: 'Actions',
      preventDefault: false
    }
  ]

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts, !loading)

  // Fetch counts only (fast query)
  const fetchCounts = async () => {
    const today = new Date().toISOString().split('T')[0]
    const countQueries = await Promise.all([
      // Exclude profile feeds: user feeds (u_*) and titles containing "Profile Feed"
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).is('review', null).not('name', 'ilike', 'u_%').not('title', 'ilike', '%profile%feed%'),
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('review', 'Ok').not('name', 'ilike', 'u_%').not('title', 'ilike', '%profile%feed%'),
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('review', 'No Seller').not('name', 'ilike', 'u_%').not('title', 'ilike', '%profile%feed%'),
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('review', 'Non Related').not('name', 'ilike', 'u_%').not('title', 'ilike', '%profile%feed%'),
      supabase
        .from('subreddits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
        .not('name', 'ilike', 'u_%')
        .not('title', 'ilike', '%profile%feed%')
        .or('review.is.null,review.eq.Ok,review.eq.No%20Seller,review.eq.Non%20Related')
    ])

    countQueries.forEach((result) => { if (result.error) throw new Error(result.error.message) })

    const [
      { count: uncategorizedCount },
      { count: okCount },
      { count: noSellerCount },
      { count: nonRelatedCount },
      { count: newTodayCount }
    ] = countQueries

    const totalCount = (uncategorizedCount || 0) + (okCount || 0) + (noSellerCount || 0) + (nonRelatedCount || 0)

    setTotalSubreddits(totalCount || 0)
    setNewTodayCount(newTodayCount || 0)
    setCategoryCounts({
      all: totalCount || 0,
      uncategorized: uncategorizedCount || 0,
      ok: okCount || 0,
      noSeller: noSellerCount || 0,
      nonRelated: nonRelatedCount || 0
    })
  }

  // Fetch paginated subreddits
  const fetchSubreddits = useCallback(async (page = 0, append = false) => {
    if (page === 0) setLoading(true)
    else setLoadingMore(true)

    await handleAsyncOperation(async () => {
      let query = supabase
        .from('subreddits')
        .select('*, rules_data')

      switch (currentFilter) {
        case 'uncategorized':
          query = query.is('review', null)
          break
        case 'ok':
          query = query.eq('review', 'Ok')
          break
        case 'no-seller':
          query = query.eq('review', 'No Seller')
          break
      }

      // Exclude profile feeds (user profiles like u_*) and titles that contain "Profile Feed" from listing
      query = query.not('name', 'ilike', 'u_%').not('title', 'ilike', '%profile%feed%')

      query = query
        .order('avg_upvotes_per_post', { ascending: false })
        .order('subscribers', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data: subredditData, error: subredditError } = await query
      if (subredditError) throw new Error(`Failed to fetch subreddits: ${subredditError.message}`)

      const newData = subredditData || []
      setHasMore(newData.length === PAGE_SIZE)
      
      if (append) {
        setSubreddits(prev => [...prev, ...newData])
      } else {
        setSubreddits(newData)
        setCurrentPage(0)
      }

      // Only fetch counts on initial load
      if (page === 0) {
        await fetchCounts()
        setLastUpdated(new Date())
      }
    }, {
      context: 'subreddit_fetch',
      retries: 2,
      onError: (error) => {
        // Keep existing data on error to avoid blank screen
      }
    })
    
    if (page === 0) setLoading(false)
    else setLoadingMore(false)
  }, [currentFilter, handleAsyncOperation])

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchSubreddits(nextPage, true)
  }, [currentPage, loadingMore, hasMore, fetchSubreddits])

  // Update category for single subreddit
  const updateCategory = async (id: number, category: 'Ok' | 'No Seller' | 'Non Related') => {
    const subreddit = subreddits.find(sub => sub.id === id)
    await handleAsyncOperation(async () => {
      const { error } = await supabase
        .from('subreddits')
        .update({ review: category })
        .eq('id', id)
      if (error) throw new Error(`Failed to update category: ${error.message}`)
      return { subreddit, category }
    }, {
      context: 'category_update',
      showToast: false,
      onSuccess: ({ subreddit, category }) => {
        setSubreddits(prev => prev.filter(sub => sub.id !== id))
        setSelectedSubreddits(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        addToast({
          type: 'success',
          title: 'Category Updated',
          description: `${subreddit?.display_name_prefixed} marked as ${category}`,
          duration: 3000
        })
      },
      onError: (error) => {
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: `Failed to update ${subreddit?.display_name_prefixed}. Please try again.`,
          duration: 5000
        })
        fetchSubreddits()
      }
    })
  }

  // Wrapper function to convert numeric review IDs to review strings for SubredditTable compatibility
  const updateCategoryById = (id: number, reviewId: number) => {
    const reviewMap: Record<number, 'Ok' | 'No Seller' | 'Non Related'> = {
      1: 'Ok',
      2: 'No Seller',
      3: 'Non Related'
    }
    const review = reviewMap[reviewId]
    if (review) {
      updateCategory(id, review)
    }
  }

  // Wrapper function for bulk update to convert numeric review ID to review string
  const bulkUpdateCategoryById = (reviewId: number) => {
    const reviewMap: Record<number, 'Ok' | 'No Seller' | 'Non Related'> = {
      1: 'Ok',
      2: 'No Seller',
      3: 'Non Related'
    }
    const review = reviewMap[reviewId]
    if (review) {
      bulkUpdateCategory(review)
    }
  }

  // Bulk update categories
  const bulkUpdateCategory = async (category: 'Ok' | 'No Seller' | 'Non Related') => {
    if (selectedSubreddits.size === 0) return
    try {
      const ids = Array.from(selectedSubreddits)
      const { error } = await supabase
        .from('subreddits')
        .update({ review: category })
        .in('id', ids)
      if (error) throw error
      setSubreddits(prev => prev.filter(sub => !selectedSubreddits.has(sub.id)))
      setSelectedSubreddits(new Set())
      addToast({
        type: 'success',
        title: 'Bulk Update Complete',
        description: `${ids.length} subreddit${ids.length > 1 ? 's' : ''} marked as ${category}`,
        duration: 3000
      })
    } catch (error) {
      console.error('Error bulk updating categories:', error)
      addToast({
        type: 'error',
        title: 'Bulk Update Failed',
        description: 'Failed to update categories. Please try again.',
        duration: 5000
      })
      fetchSubreddits()
    }
  }

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const target = observerRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
      observer.disconnect()
    }
  }, [loadMore, hasMore, loadingMore])

  // Set up real-time subscriptions and refresh timer
  useEffect(() => {
    setCurrentPage(0)
    setHasMore(true)
    fetchSubreddits(0, false)
    
    const channel = supabase
      .channel('subreddit-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subreddits' },
        () => { 
          setCurrentPage(0)
          setHasMore(true)
          fetchSubreddits(0, false) 
        }
      )
      .subscribe()

    const refreshInterval = setInterval(() => { 
      setCurrentPage(0)
      setHasMore(true)
      fetchSubreddits(0, false) 
    }, 300000)
    
    return () => {
      supabase.removeChannel(channel)
      clearInterval(refreshInterval)
    }
  }, [currentFilter, fetchSubreddits])

  return (
    <DashboardLayout title="" showSearch={false}>
      {/* Metrics Cards */}
      <ComponentErrorBoundary componentName="Metrics Cards">
        {loading ? (
          <MetricsCardsSkeleton />
        ) : (
          <MetricsCards 
            totalSubreddits={totalSubreddits}
            uncategorizedCount={categoryCounts.uncategorized}
            newTodayCount={newTodayCount}
            loading={loading}
          />
        )}
      </ComponentErrorBoundary>

      {/* Unified Filter System */}
      <UnifiedFilters
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter as (filter: string) => void}
        categoryCounts={categoryCounts}
        categories={[]}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        loading={loading}
      />

      {/* Main Review Interface */}
      <div 
        className="rounded-2xl sm:rounded-3xl border-0 overflow-hidden shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="px-6 sm:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
            <div className="flex-1">
              <h2 
                className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-gray-900"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
                  letterSpacing: '-0.015em',
                  fontWeight: 600,
                }}
              >
                {currentFilter === 'uncategorized' && 'Unreviewed Subreddits'}
                {currentFilter === 'ok' && 'Ok Subreddits'}
                {currentFilter === 'no-seller' && 'No Seller Subreddits'}
              </h2>
              <p 
                className="text-sm sm:text-base text-gray-600"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  lineHeight: '1.6',
                  fontWeight: 400,
                }}
              >
                {currentFilter === 'uncategorized' 
                  ? 'Review and categorize Reddit communities discovered by the scraper'
                  : 'View and manage categorized Reddit communities'
                }
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-6 sm:pb-8">
          {loading ? (
            <TableSkeleton />
          ) : (
            <>
              <ComponentErrorBoundary componentName="Subreddit Table">
                <SubredditTable
                  subreddits={displayedSubreddits}
                  selectedSubreddits={selectedSubreddits}
                  setSelectedSubreddits={setSelectedSubreddits}
                  onUpdateCategory={updateCategoryById}
                  onBulkUpdateCategory={bulkUpdateCategoryById}
                  loading={loading}
                  mode="review"
                />
              </ComponentErrorBoundary>
              
              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={observerRef} className="flex items-center justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-b9-pink"></div>
                      <span className="text-sm text-gray-600">Loading more subreddits...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Scroll to load more</div>
                  )}
                </div>
              )}
              
              {/* End of results */}
              {!hasMore && subreddits.length > 0 && (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500">
                    Showing all {subreddits.length} results
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Shortcuts help removed */}
    </DashboardLayout>
  )
}


