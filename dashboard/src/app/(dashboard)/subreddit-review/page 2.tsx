'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit } from '@/lib/supabase'
import { MetricsCards } from '@/components/MetricsCards'
import { VirtualizedSubredditTable } from '@/components/VirtualizedSubredditTable'
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useToast } from '@/components/ui/toast'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/SkeletonLoaders'
import { useErrorHandler } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { UnifiedFilters } from '@/components/UnifiedFilters'
import { useDebounce } from '@/hooks/useDebounce'
import type { RealtimeChannel } from '@supabase/supabase-js'

type FilterType = 'unreviewed' | 'ok' | 'non_related' | 'no_seller'
type ReviewValue = 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null

const INITIAL_PAGE_SIZE = 20 // Smaller initial load for faster perceived performance
const PAGE_SIZE = 50 // Standard page size for subsequent loads
const PROGRESSIVE_LOAD_DELAY = 100 // Delay between progressive loads in ms

export default function SubredditReviewPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [countsLoaded, setCountsLoaded] = useState(false)
  const [dataLoadProgress, setDataLoadProgress] = useState(0)
  const [totalSubreddits, setTotalSubreddits] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('unreviewed')
  const [reviewCounts, setReviewCounts] = useState({
    unreviewed: 0,
    ok: 0,
    non_related: 0,
    no_seller: 0,
    total: 0
  })
  const [newTodayCount, setNewTodayCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [lastAction, setLastAction] = useState<{
    type: 'single' | 'bulk'
    items: Array<{ id: number, prevReview: ReviewValue }>
  } | null>(null)
  
  // Ref to break circular dependency with undoLastAction
  const undoLastActionRef = useRef<() => Promise<void>>(() => Promise.resolve())
  
  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  
  // Use server-side filtering; client filtering kept as a safety net when search is empty
  const displayedSubreddits = subreddits

  // Handle search query change with performance optimization
  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setSearchQuery(query)
    })
  }, [])

  // Toggle selection of individual subreddit


  // Close rules modal
  const handleCloseRules = useCallback(() => {
    setRulesModal({ isOpen: false, subreddit: null })
  }, [])

  // We need to define these functions later after all dependencies are available

  // Fetch counts only (fast query) - using 'review' field for all states
  const fetchCounts = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized')
      return
    }
    
    const today = new Date().toISOString().split('T')[0]
    const countQueries = await Promise.all([
      // Count unreviewed (review is null)
      supabase.from('subreddits').select('id', { count: 'exact', head: true }).is('review', null).not('name', 'ilike', 'u_%'),
      // Count Ok reviewed
      supabase.from('subreddits').select('id', { count: 'exact', head: true }).eq('review', 'Ok').not('name', 'ilike', 'u_%'),
      // Count Non Related
      supabase.from('subreddits').select('id', { count: 'exact', head: true }).eq('review', 'Non Related').not('name', 'ilike', 'u_%'),
      // Count No Seller
      supabase.from('subreddits').select('id', { count: 'exact', head: true }).eq('review', 'No Seller').not('name', 'ilike', 'u_%'),
      // Count new today (all states)
      supabase
        .from('subreddits')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today)
        .not('name', 'ilike', 'u_%')
    ])

    countQueries.forEach((result) => { if (result.error) throw new Error(result.error.message) })

    const [
      { count: unreviewedCount },
      { count: okCount },
      { count: nonRelatedCount },
      { count: noSellerCount },
      { count: newTodayCount }
    ] = countQueries

    const totalCount = (unreviewedCount || 0) + (okCount || 0) + (nonRelatedCount || 0) + (noSellerCount || 0)

    setTotalSubreddits(totalCount || 0)
    setNewTodayCount(newTodayCount || 0)
    setReviewCounts({
      unreviewed: unreviewedCount || 0,
      ok: okCount || 0,
      non_related: nonRelatedCount || 0,
      no_seller: noSellerCount || 0,
      total: totalCount || 0
    })
  }

  // Enhanced progressive loading for subreddits
  const fetchSubreddits = useCallback(async (page = 0, append = false, isInitialLoad = false) => {
    if (page === 0) {
      setLoading(true)
      setDataLoadProgress(30)
    } else {
      setLoadingMore(true)
    }

    await handleAsyncOperation(async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      let query = supabase
        .from('subreddits')
        .select('*')

      switch (currentFilter) {
        case 'unreviewed':
          // Show subreddits where review field is empty/null
          query = query.is('review', null)
          break
        case 'ok':
          // Show subreddits that have been reviewed as 'Ok'
          query = query.eq('review', 'Ok')
          break
        case 'non_related':
          // Show subreddits that have been reviewed as 'Non Related'
          query = query.eq('review', 'Non Related')
          break
        case 'no_seller':
          // Show subreddits that have been reviewed as 'No Seller'
          query = query.eq('review', 'No Seller')
          break
      }

      // Exclude profile feeds (user profiles like u_*) from listing
      query = query.not('name', 'ilike', 'u_%')

      // Apply server-side search (covers name, display_name_prefixed, title, top_content_type)
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.trim()
        query = query.or(
          `name.ilike.%${q}%,display_name_prefixed.ilike.%${q}%,title.ilike.%${q}%,top_content_type.ilike.%${q}%`
        )
      }

      // Use smaller initial page size for faster perceived performance
      const pageSize = isInitialLoad ? INITIAL_PAGE_SIZE : PAGE_SIZE
      
      query = query
        .order('avg_upvotes_per_post', { ascending: false })
        .order('subscribers', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      const { data: subredditData, error: subredditError } = await query
      
      if (subredditError) throw new Error(`Failed to fetch subreddits: ${subredditError.message}`)

      const newData = subredditData || []
      setHasMore(newData.length === pageSize)
      
      if (append) {
        setSubreddits(prev => [...prev, ...newData])
      } else {
        setSubreddits(newData)
        setCurrentPage(0)
        if (isInitialLoad) {
          setInitialLoadComplete(true)
        }
      }

      // Progressive loading: fetch counts separately for faster initial render
      if (page === 0 && !countsLoaded) {
        // Load counts in background after initial data is shown
        setTimeout(() => {
          fetchCounts().then(() => setCountsLoaded(true)).catch(console.error)
        }, PROGRESSIVE_LOAD_DELAY)
      }
      
      setDataLoadProgress(100)
      
      // Handle loading states and progressive loading inside callback where newData is accessible
      if (page === 0) {
        setLoading(false)
        // Schedule next batch load if this is initial load
        if (isInitialLoad && newData.length === INITIAL_PAGE_SIZE) {
          setTimeout(() => {
            fetchSubreddits(1, true, false).catch(console.error)
          }, PROGRESSIVE_LOAD_DELAY)
        }
      } else {
        setLoadingMore(false)
      }
    }, {
      context: 'subreddit_fetch',
      retries: 2,
      onError: (error) => {
        console.error('Failed to fetch subreddits:', error)
        // Keep existing data on error to avoid blank screen
        // Still need to update loading states on error
        if (page === 0) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    })
  }, [currentFilter, countsLoaded, debouncedSearchQuery, handleAsyncOperation])


  // Undo last single/bulk action
  const undoLastAction = useCallback(async () => {
    if (!lastAction || !supabase) return
    const sb = supabase
    try {
      // Apply reverts sequentially to support different prev values
      for (const item of lastAction.items) {
        const { error } = await sb
          .from('subreddits')
          .update({ review: item.prevReview })
          .eq('id', item.id)
        if (error) throw error
      }
      setLastAction(null)
      addToast({
        type: 'success',
        title: 'Undo Complete',
        description: 'Reverted the last review change.',
        duration: 3000
      })
      // Refresh data and counts to reflect changes accurately
      fetchSubreddits(0, false)
      fetchCounts()
    } catch (error) {
      console.error('Undo failed:', error)
      addToast({
        type: 'error',
        title: 'Undo Failed',
        description: 'Could not revert the last change. Please try again.',
        duration: 5000
      })
    }
  }, [lastAction, fetchSubreddits, fetchCounts, addToast])

  // Update ref to current function
  useEffect(() => {
    undoLastActionRef.current = undoLastAction
  }, [undoLastAction])

  // Update review for single subreddit
  const updateReview = useCallback(async (id: number, review: 'Ok' | 'No Seller' | 'Non Related') => {
    const subreddit = subreddits.find(sub => sub.id === id)
    await handleAsyncOperation(async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase
        .from('subreddits')
        .update({ review })
        .eq('id', id)
      if (error) throw new Error(`Failed to update review: ${error.message}`)
      return { subreddit, review }
    }, {
      context: 'review_update',
      showToast: false,
      onSuccess: ({ subreddit, review }) => {
        // Prepare undo details
        const prevReview: ReviewValue = subreddit?.review ?? null
        setLastAction({ type: 'single', items: [{ id, prevReview }] })
        // Update local list optimistically and remove if it no longer matches filter
        setSubreddits(prev => {
          const updated = prev.map(sub => sub.id === id ? { ...sub, review } : sub)
          switch (currentFilter) {
            case 'unreviewed':
              return updated.filter(sub => sub.id !== id) // moved out of unreviewed
            case 'ok':
              return review === 'Ok' ? updated : updated.filter(sub => sub.id !== id)
            case 'non_related':
              return review === 'Non Related' ? updated : updated.filter(sub => sub.id !== id)
            case 'no_seller':
              return review === 'No Seller' ? updated : updated.filter(sub => sub.id !== id)
          }
        })
        addToast({
          type: 'success',
          title: 'Review Updated',
          description: `${subreddit?.display_name_prefixed} marked as ${review}`,
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => { void undoLastActionRef.current?.() }
          }
        })
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: `Failed to update ${subreddit?.display_name_prefixed}. Please try again.`,
          duration: 5000
        })
        fetchSubreddits()
      }
    })
  }, [subreddits, handleAsyncOperation, fetchSubreddits, addToast])
  // Bulk update reviews for selected subreddits
  const bulkUpdateReview = useCallback(async (review: 'Ok' | 'No Seller' | 'Non Related') => {
    if (selectedSubreddits.size === 0 || !supabase) return
    const sb = supabase
    const ids = Array.from(selectedSubreddits)
    // Capture previous values for undo
    const prevItems = subreddits
      .filter(s => ids.includes(s.id))
      .map(s => ({ id: s.id, prevReview: (s.review ?? null) as ReviewValue }))

    await handleAsyncOperation(async () => {
      const { error } = await sb.from('subreddits').update({ review }).in('id', ids)
      if (error) throw error
      return true
    }, {
      context: 'bulk_review_update',
      showToast: false,
      onSuccess: () => {
        setLastAction({ type: 'bulk', items: prevItems })
        setSelectedSubreddits(new Set())
        addToast({
          type: 'success',
          title: 'Bulk Update Complete',
          description: `Updated ${ids.length} subreddits to ${review}`,
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => { void undoLastActionRef.current?.() }
          }
        })
        // Refresh data and counts after bulk change
        fetchSubreddits(0, false)
        fetchCounts()
      },
      onError: () => {
        addToast({
          type: 'error',
          title: 'Bulk Update Failed',
          description: 'Could not update selected subreddits. Please try again.',
          duration: 5000
        })
      }
    })
  }, [selectedSubreddits, subreddits, handleAsyncOperation, addToast, fetchSubreddits, fetchCounts])

  // Wrappers for SubredditTable (accept string review labels) - memoized
  const updateReviewByText = useCallback(async (id: number, reviewText: string) => {
    const review = reviewText as 'Ok' | 'No Seller' | 'Non Related'
    await updateReview(id, review)
  }, [updateReview])

  // Page-level observer removed; handled inside SubredditTable

  // Enhanced progressive loading on mount and filter changes
  useEffect(() => {
    setCurrentPage(0)
    setHasMore(true)
    setDataLoadProgress(0)
    
    // Progressive loading strategy:
    // 1. Load counts first (fast)
    // 2. Load initial small batch of data (fast)
    // 3. Load remaining data in background
    const isInitialMount = !initialLoadComplete
    
    if (isInitialMount) {
      // First load counts quickly to show metrics, then load data
      fetchCounts().then(() => {
        setCountsLoaded(true)
        return fetchSubreddits(0, false, true)
      }).catch(console.error)
    } else {
      // Subsequent filter changes - normal loading
      fetchSubreddits(0, false, false)
    }
    
    let channel: RealtimeChannel | null = null
    // Only set up subscription if supabase is available
    if (supabase) {
      channel = supabase
        .channel('subreddit-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subreddits' },
          (() => {
            // Coalesce rapid events into a single refresh every 1000ms
            let timer: ReturnType<typeof setTimeout> | null = null
            let pending = false
            return () => {
              pending = true
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => {
                if (pending) {
                  pending = false
                  setCurrentPage(0)
                  setHasMore(true)
                  fetchSubreddits(0, false)
                }
              }, 1000)
            }
          })()
        )
        .subscribe()
    }

    const refreshInterval = setInterval(() => { 
      setCurrentPage(0)
      setHasMore(true)
      fetchSubreddits(0, false) 
    }, 300000)
    
    return () => {
      // Safely cleanup subscription
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
      clearInterval(refreshInterval)
    }
  }, [currentFilter, fetchSubreddits, initialLoadComplete])


  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Review</h2>
        {/* Title removed per request */}

        {/* Enhanced Metrics Cards with Progressive Loading */}
        <div className="mb-6">
          <ComponentErrorBoundary componentName="Metrics Cards">
            <div className={`relative ${
              countsLoaded ? 'opacity-100' : 'opacity-80'
            }`}>
              {loading && !countsLoaded ? (
                <MetricsCardsSkeleton />
              ) : (
                <MetricsCards 
                  totalSubreddits={totalSubreddits}
                  statusCount={reviewCounts.unreviewed}
                  statusTitle="Unreviewed"
                  newTodayCount={newTodayCount}
                  loading={loading}
                  reviewCounts={reviewCounts}
                />
              )}
              {/* Loading indicator overlay */}
              {!countsLoaded && (
                <div className="absolute top-3 right-3">
                  <div className="w-2 h-2 bg-b9-pink rounded-full opacity-80"></div>
                </div>
              )}
            </div>
          </ComponentErrorBoundary>
        </div>

        {/* Inline Search and Filters */}
        <UnifiedFilters
          currentFilter={currentFilter}
          onFilterChange={(value) => {
            React.startTransition(() => {
              setCurrentFilter(value as FilterType)
            })
          }}
          counts={reviewCounts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          loading={loading}
        />

        {/* Bulk actions toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedSubreddits.size}
          onBulkOk={() => bulkUpdateReview('Ok')}
          onBulkNoSeller={() => bulkUpdateReview('No Seller')}
          onBulkNonRelated={() => bulkUpdateReview('Non Related')}
          onClearSelection={() => setSelectedSubreddits(new Set())}
          onUndoLastAction={() => undoLastActionRef.current?.()}
          disabled={loading || loadingMore}
        />

        {/* Main Review Interface - Flex grow to fill remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="space-y-6">
              {/* Progressive loading indicator */}
              {dataLoadProgress > 0 && dataLoadProgress < 100 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Loading Reddit Data</h3>
                    <span className="text-sm font-mono text-gray-600">{dataLoadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-b9-pink to-pink-500 rounded-full"
                      style={{ width: `${dataLoadProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {dataLoadProgress < 40 ? 'Fetching subreddit counts...' :
                     dataLoadProgress < 70 ? 'Loading initial data...' :
                     dataLoadProgress < 100 ? 'Preparing interface...' :
                     'Complete!'}
                  </div>
                </div>
              )}
              <TableSkeleton />
            </div>
          ) : (
            <>
              {/* Lightweight metrics above table (SSR-safe) */}
              <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-b9-pink"></span>
                    {displayedSubreddits.length.toLocaleString('en-US')} results
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-gray-500">
                    Filter:
                    <span className="font-medium text-gray-700 capitalize">{currentFilter.replace('_', ' ')}</span>
                  </span>
                </div>
                <span className="text-gray-500">Loaded: {subreddits.length.toLocaleString('en-US')}</span>
              </div>

              <ComponentErrorBoundary componentName="Subreddit Data Table">
                <VirtualizedSubredditTable
                  subreddits={displayedSubreddits}
                  selectedSubreddits={selectedSubreddits}
                  setSelectedSubreddits={setSelectedSubreddits}
                  onUpdateReview={updateReviewByText}
                  loading={loading}
                />
              </ComponentErrorBoundary>
            </>
          )}
        </div>


        {/* Enhanced Rules Modal */}
        {rulesModal.isOpen && rulesModal.subreddit && (
          <div 
            className="fixed inset-0 z-50 p-4 flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(6px) saturate(140%)',
              WebkitBackdropFilter: 'blur(6px) saturate(140%)'
            }}
            onClick={handleCloseRules}
          >
            <div 
              className="bg-white/95 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-b9-pink text-white flex items-center justify-center font-bold">
                    {(() => {
                      const dp = rulesModal.subreddit.display_name_prefixed || 'r/'
                      const idx = dp.startsWith('r/') || dp.startsWith('u/') ? 2 : 0
                      const ch = dp.length > idx ? dp.charAt(idx).toUpperCase() : 'R'
                      return ch
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black">
                      {rulesModal.subreddit.display_name_prefixed} Rules
                    </h2>
                    <p className="text-sm text-gray-600">{rulesModal.subreddit.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseRules}
                  className="rounded-full p-2 hover:bg-gray-100"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {(() => {
                  try {
                    // Parse rules_data if it exists
                    const rulesData = rulesModal.subreddit.rules_data
                    let rules: Array<{
                      short_name?: string;
                      title?: string;
                      description?: string;
                      violation_reason?: string;
                    }> = []
                    
                    if (rulesData) {
                      if (typeof rulesData === 'string') {
                        try {
                          // Skip empty strings entirely
                          if (rulesData.trim() === '') {
                            rules = []
                          } else {
                            const parsed = JSON.parse(rulesData)
                            rules = Array.isArray(parsed) ? parsed : (parsed.rules && Array.isArray(parsed.rules)) ? parsed.rules : []
                          }
                        } catch (error) {
                          console.warn('Failed to parse rules data:', error)
                          rules = []  // Default to empty array on parse error
                        }
                      } else if (Array.isArray(rulesData)) {
                        rules = rulesData
                      } else if (typeof rulesData === 'object' && rulesData !== null && 'rules' in rulesData && Array.isArray((rulesData as {rules: unknown}).rules)) {
                        rules = (rulesData as {rules: typeof rules}).rules
                      }
                    }

                    if (rules && rules.length > 0) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800">Subreddit Rules</h3>
                            <a
                              href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-b9-pink hover:underline"
                            >
                              View on Reddit →
                            </a>
                          </div>
                          <div className="space-y-3">
                            {rules.map((rule, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-b9-pink text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">
                                      {rule.short_name || rule.title || `Rule ${index + 1}`}
                                    </h4>
                                    {rule.description && (
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                        {rule.description}
                                      </p>
                                    )}
                                    {rule.violation_reason && rule.violation_reason !== rule.short_name && (
                                      <p className="text-xs text-gray-500 mt-1 italic">
                                        Violation: {rule.violation_reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="text-center py-8">
                          <div className="mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-2xl text-gray-400">📋</span>
                            </div>
                            <p className="text-gray-600">No rules data available for this subreddit.</p>
                            <p className="text-sm text-gray-500 mt-1">Rules may not have been scraped yet or the subreddit has no posted rules.</p>
                          </div>
                          <a
                            href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-b9-pink hover:underline"
                          >
                            View on Reddit →
                          </a>
                        </div>
                      )
                    }
                  } catch (error) {
                    console.error('Error parsing rules data:', error)
                    return (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl text-gray-700">⚠️</span>
                          </div>
                          <p className="text-gray-600">Error loading rules data.</p>
                          <p className="text-sm text-gray-500 mt-1">The rules data may be malformed or corrupted.</p>
                        </div>
                        <a
                          href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-b9-pink hover:underline"
                        >
                          View on Reddit →
                        </a>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </div>


    </DashboardLayout>
  )
}


