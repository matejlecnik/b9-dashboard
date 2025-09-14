'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit } from '@/lib/supabase'
import { MetricsCards } from '@/components/MetricsCards'
import { UniversalTable, createSubredditReviewTable } from '@/components/UniversalTable'
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/UniversalLoading'
import { useErrorHandler } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/UniversalErrorBoundary'
import { UnifiedFilters } from '@/components/UnifiedFilters'
import type { RealtimeChannel } from '@supabase/supabase-js'

type FilterType = 'unreviewed' | 'ok' | 'non_related' | 'no_seller'
type ReviewValue = 'Ok' | 'No Seller' | 'Non Related' | null

const PAGE_SIZE = 50 // Standard page size

export default function SubredditReviewPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
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
  const [brokenIcons, setBrokenIcons] = useState<Set<string>>(new Set())
  const [lastAction, setLastAction] = useState<{
    type: 'single' | 'bulk'
    items: Array<{ id: number, prevReview: ReviewValue }>
  } | null>(null)

  // Ref to break circular dependency with undoLastAction
  const undoLastActionRef = useRef<() => Promise<void>>(() => Promise.resolve())
  // Ref to track if a fetch is already in progress
  const fetchInProgressRef = useRef(false)
  
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

  // Handle broken icon URLs
  const handleIconError = useCallback((id: string | number) => {
    setBrokenIcons(prev => {
      const next = new Set(prev)
      next.add(String(id))
      // Auto cleanup when hitting limit to prevent memory leak
      if (next.size > 100) {
        // Keep only the most recent 50 entries
        const sorted = Array.from(next).slice(-50)
        return new Set(sorted)
      }
      return next
    })
  }, [])

  // Toggle selection of individual subreddit


  // Close rules modal
  const handleCloseRules = useCallback(() => {
    setRulesModal({ isOpen: false, subreddit: null })
  }, [])

  // Show rules modal for a subreddit
  const handleShowRules = useCallback((subreddit: Subreddit) => {
    setRulesModal({ isOpen: true, subreddit })
  }, [])

  // We need to define these functions later after all dependencies are available

  // Fetch counts using API endpoint - NOT affected by search
  const fetchCounts = React.useCallback(async () => {
    try {
      console.log('🔄 [REVIEW] Fetching stats via API...')
      
      // Build API request URL - NO search parameter (stats should show totals)
      const params = new URLSearchParams({
        type: 'review'
      })
      
      const response = await fetch(`/api/subreddits/stats?${params.toString()}`)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch stats')
      }
      
      console.log('✅ [REVIEW] Stats fetched successfully:', result.stats)
      
      React.startTransition(() => {
        setReviewCounts({
          unreviewed: result.stats.unreviewed || 0,
          ok: result.stats.ok || 0,
          non_related: result.stats.non_related || 0,
          no_seller: result.stats.no_seller || 0,
          total: result.stats.total || 0
        })
        setNewTodayCount(result.stats.new_today || 0)
        setTotalSubreddits(result.stats.total || 0)
      })
      
    } catch (error) {
      console.error('❌ [REVIEW] Failed to fetch stats:', error)
      // Keep existing counts on error to avoid UI disruption
    }
  }, [])

  // Simplified subreddit fetching
  const fetchSubreddits = useCallback(async (page = 0, append = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('🔄 [REVIEW] Fetch already in progress, skipping...')
      return
    }
    fetchInProgressRef.current = true

    if (page === 0) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      // Build API request URL with query parameters
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
        filter: currentFilter,
      })

      // Add search query if active
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim())
      }

      const apiUrl = `/api/subreddits?${params.toString()}`
      console.log('🔄 [REVIEW] API request URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      const result = await response.json()
      
      console.log('🔄 [REVIEW] API result:', { 
        success: result.success, 
        dataLength: result.subreddits?.length || 0,
        hasError: !response.ok,
        errorMessage: result.error
      })

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch subreddits')
      }

      const newData = result.subreddits || []
      console.log('✅ [REVIEW] Fetched subreddits successfully:', { 
        count: newData.length, 
        page, 
        sampleData: newData.slice(0, 2).map((s: { name?: string; review?: string | null }) => ({name: s.name, review: s.review})) 
      })
      setHasMore(result.hasMore || false)
      
      if (append) {
        setSubreddits(prev => {
          // Create a Set of existing IDs for fast lookup
          const existingIds = new Set(prev.map(sub => sub.id))

          // Filter out duplicates from newData
          const uniqueNewData = newData.filter((sub: Subreddit) => !existingIds.has(sub.id))

          const updated = [...prev, ...uniqueNewData]
          console.log('✅ [REVIEW] Updated subreddits (append):', {
            previousCount: prev.length,
            newCount: newData.length,
            uniqueNewCount: uniqueNewData.length,
            duplicatesRemoved: newData.length - uniqueNewData.length,
            totalCount: updated.length
          })
          return updated
        })
      } else {
        setSubreddits(newData)
        setCurrentPage(0)
        console.log('✅ [REVIEW] Updated subreddits (replace):', {
          newCount: newData.length,
          firstItem: newData[0]?.name || 'none'
        })
      }

      // Always use dedicated stats endpoint for accurate review counts
      if (page === 0) {
        // Use the dedicated stats endpoint for review counts
        fetchCounts().catch((e) => console.error('fetchCounts failed:', e))
      }
      
    } catch (error) {
      console.error('❌ [REVIEW] fetchSubreddits error:', error)
      addToast({
        type: 'error',
        title: 'Failed to load subreddits',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      // Always update loading states in finally block
      fetchInProgressRef.current = false // Reset the fetch flag
      if (page === 0) {
        console.log('✅ [REVIEW] Setting loading to false for page 0 (finally)')
        setLoading(false)
      } else {
        console.log('✅ [REVIEW] Setting loadingMore to false for page', page, '(finally)')
        setLoadingMore(false)
      }
    }
  }, [currentFilter, debouncedSearchQuery, addToast, fetchCounts])


  // Undo last single/bulk action
  const undoLastAction = useCallback(async () => {
    if (!lastAction) return
    try {
      // Apply reverts sequentially to support different prev values using API
      for (const item of lastAction.items) {
        const response = await fetch(`/api/subreddits/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ review: item.prevReview })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to undo review for subreddit ${item.id}`)
        }
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
      const response = await fetch(`/api/subreddits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ review })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update review')
      }
      
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
  }, [subreddits, handleAsyncOperation, fetchSubreddits, addToast, currentFilter])
  // Bulk update reviews for selected subreddits via API
  const bulkUpdateReview = useCallback(async (review: 'Ok' | 'No Seller' | 'Non Related') => {
    if (selectedSubreddits.size === 0) return
    
    const ids = Array.from(selectedSubreddits)
    // Capture previous values for undo
    const prevItems = subreddits
      .filter(s => ids.includes(s.id))
      .map(s => ({ id: s.id, prevReview: (s.review ?? null) as ReviewValue }))

    await handleAsyncOperation(async () => {
      console.log('🔄 [Frontend] Bulk review update via API:', { count: ids.length, review })
      
      const response = await fetch('/api/subreddits/bulk-review', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subredditIds: ids,
          review
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ [Frontend] Bulk review update successful:', result)
      
      return result
    }, {
      context: 'bulk_review_update_api',
      showToast: false,
      onSuccess: (result) => {
        setLastAction({ type: 'bulk', items: prevItems })
        setSelectedSubreddits(new Set())
        addToast({
          type: 'success',
          title: 'Bulk Update Complete',
          description: result.message || `Updated ${ids.length} subreddits to ${review}`,
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
      onError: (error) => {
        console.error('❌ [Frontend] Bulk review update failed:', error)
        addToast({
          type: 'error',
          title: 'Bulk Update Failed',
          description: error.message || 'Could not update selected subreddits. Please try again.',
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

  // Simplified data loading on mount and filter changes
  useEffect(() => {
    console.log('🔄 [REVIEW] useEffect triggered - initializing data fetch', { currentFilter, hasSupabase: !!supabase })
    setCurrentPage(0)
    setHasMore(true)
    
    // Simple loading: just fetch the data
    console.log('🔄 [REVIEW] Calling fetchSubreddits...')
    fetchSubreddits(0, false).catch((error) => {
      console.error('❌ [REVIEW] fetchSubreddits failed:', error)
    })
    
    let channel: RealtimeChannel | null = null
    // Only set up subscription if supabase is available
    if (supabase) {
      channel = supabase
        .channel('subreddit-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reddit_subreddits' },
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
  }, [currentFilter, debouncedSearchQuery, fetchSubreddits])


  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Review</h2>
        {/* Title removed per request */}

        {/* Metrics Cards - Simplified */}
        <div className="mb-6">
          <ComponentErrorBoundary componentName="Metrics Cards">
            {loading ? (
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
          </ComponentErrorBoundary>
        </div>

        {/* Combined Toolbar: Search on left, Filters on right - Slim Design */}
        <div className="flex items-stretch gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
          {/* Search Section - Left Side - Compact */}
          <div className="flex items-center flex-1 min-w-0 max-w-xs">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder=""
                title="Search subreddits by name, title, or description"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={loading || loadingMore}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent transition-all duration-200 h-8 relative"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters Section - Right Side - Aligned */}
          <div className="flex items-center">
            <UnifiedFilters
              currentFilter={currentFilter}
              onFilterChange={(value) => {
                React.startTransition(() => {
                  setCurrentFilter(value as FilterType)
                })
              }}
              counts={reviewCounts}
              searchQuery=""
              onSearchChange={() => {}}
              loading={loading}
            />
          </div>
        </div>

        {/* Bulk Actions Toolbar (only when items selected) */}
        {selectedSubreddits.size > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedSubreddits.size}
            onBulkOk={() => bulkUpdateReview('Ok')}
            onBulkNoSeller={() => bulkUpdateReview('No Seller')}
            onBulkNonRelated={() => bulkUpdateReview('Non Related')}
            onClearSelection={() => setSelectedSubreddits(new Set())}
            onUndoLastAction={() => undoLastActionRef.current?.()}
            disabled={loading || loadingMore}
          />
        )}

        {/* Main Review Interface - Flex grow to fill remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="space-y-6">
              <TableSkeleton />
            </div>
          ) : (
            <>
              <ComponentErrorBoundary componentName="Subreddit Data Table">
                <UniversalTable
                  {...createSubredditReviewTable({
                    subreddits: displayedSubreddits,
                    selectedSubreddits,
                    setSelectedSubreddits,
                    onUpdateReview: updateReviewByText,
                    loading,
                    hasMore,
                    loadingMore,
                    onReachEnd: () => {
                      if (loading || loadingMore || !hasMore || fetchInProgressRef.current) return
                      const nextPage = currentPage + 1
                      setCurrentPage(nextPage)
                      // Append next page
                      void fetchSubreddits(nextPage, true)
                    },
                    searchQuery: debouncedSearchQuery,
                    brokenIcons,
                    handleIconError,
                    onShowRules: handleShowRules
                  })}
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


