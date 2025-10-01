'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'

// Import React Query hooks
import {
  useSubredditsForReview,
  useReviewStats,
  useUpdateReviewStatus,
  useBulkUpdateReview,
  type ReviewStatus
} from '@/hooks/queries/useRedditReview'

// Import types
// Use ReviewStatus from hook to avoid divergence

// Import components
import { TableSkeleton, MetricsCardsSkeleton } from '@/components/shared/SkeletonLoaders'
import { createSubredditReviewTable, type Subreddit as TableSubreddit } from '@/components/shared/tables/UniversalTable'
import type { Subreddit as DbSubreddit } from '@/lib/supabase'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { MetricsCards } from '@/components/shared/cards/MetricsCards'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { Plus, Check, UserX, X, Ban } from 'lucide-react'
import { logger } from '@/lib/logger'

// Dynamic imports for heavy components
const UniversalTable = dynamic(
  () => import('@/components/shared/tables/UniversalTable').then(mod => mod.UniversalTable),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const AddSubredditModal = dynamic(
  () => import('@/components/features/AddSubredditModal').then(mod => mod.AddSubredditModal),
  { ssr: false }
)

type FilterType = 'unreviewed' | 'ok' | 'non_related' | 'no_seller' | 'banned'

// Map filter type to review status - moved outside component to avoid recreation
const getReviewFromFilter = (filter: FilterType): ReviewStatus => {
  switch (filter) {
    case 'unreviewed':
      return null
    case 'ok':
      return 'Ok'
    case 'non_related':
      return 'Non Related'
    case 'no_seller':
      return 'No Seller'
    case 'banned':
      return 'User Feed' // Note: 'banned' filter maps to 'User Feed' status
    default:
      return null
  }
}

export default function SubredditReviewPage() {
  const { addToast } = useToast()

  // State
  const [currentFilter, setCurrentFilter] = useState<FilterType>('unreviewed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: (TableSubreddit | DbSubreddit) | null }>({
    isOpen: false,
    subreddit: null
  })
  // Removed undo state; undo action not exposed in UI
  const [showAddModal, setShowAddModal] = useState(false)

  // Set for broken icons to prevent repeated attempts (clear periodically to prevent memory leaks)
  const [brokenIcons, setBrokenIcons] = useState<Set<number | string>>(new Set())

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // React Query hooks
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchSubreddits
  } = useSubredditsForReview({
    search: debouncedSearchQuery,
    review: getReviewFromFilter(currentFilter),
    orderBy: 'subscribers',
    order: 'desc'
  })

  // Flatten pages for display and filter out items being removed
  const subreddits = useMemo(
    () => {
      const allSubreddits = infiniteData?.pages.flat() || []
      // Filter out items that are currently being removed (fading out)
      return allSubreddits.filter((sub: DbSubreddit) => !removingIds.has(sub.id))
    },
    [infiniteData, removingIds]
  )

  // Clean up removingIds when data changes (items have been actually removed from backend)
  useEffect(() => {
    if (removingIds.size > 0 && infiniteData) {
      const allSubreddits = infiniteData.pages.flat()
      const currentIds = new Set(allSubreddits.map((sub: DbSubreddit) => sub.id))
      setRemovingIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set<number>()
        // Keep only IDs that are still in the current data
        prev.forEach(id => {
          if (currentIds.has(id)) {
            next.add(id)
          }
        })
        return next.size === prev.size ? prev : next
      })
    }
  }, [infiniteData, removingIds.size]) // Depend on size to trigger cleanup

  // Review stats
  const { data: reviewStats } = useReviewStats()

  // Map stats to the expected format
  const reviewCounts = useMemo(() => ({
    unreviewed: reviewStats?.unreviewed || 0,
    ok: reviewStats?.ok || 0,
    non_related: reviewStats?.nonRelated || 0,
    no_seller: reviewStats?.noSeller || 0,
    banned: reviewStats?.userFeed || 0, // userFeed maps to banned
    total: reviewStats?.total || 0
  }), [reviewStats])

  // Use computed "new today" from stats
  const newTodayCount = reviewStats?.newToday || 0

  // Mutations
  const updateReviewMutation = useUpdateReviewStatus()
  const bulkUpdateMutation = useBulkUpdateReview()

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterType) => {
    setCurrentFilter(filter)
    setSelectedSubreddits(new Set()) // Clear selections when switching filters
    setRemovingIds(new Set()) // Clear removing items when switching filters
  }, [])

  // Handle broken icon URLs
  const handleIconError = useCallback((id: string | number) => {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    setBrokenIcons(prev => {
      const next = new Set(prev)
      if (Number.isFinite(numericId)) {
        next.add(numericId as number)
      } else {
        next.add(String(id))
      }
      return next
    })
  }, [])

  // Show rules modal for a subreddit
  const handleShowRules = useCallback((subreddit: TableSubreddit) => {
    setRulesModal({ isOpen: true, subreddit })
  }, [])

  // Close rules modal
  const handleCloseRules = useCallback(() => {
    setRulesModal({ isOpen: false, subreddit: null })
  }, [])

  // Handle successful subreddit addition
  const handleSubredditAdded = useCallback(() => {
    setShowAddModal(false)
    refetchSubreddits()
    addToast({
      type: 'success',
      title: 'Subreddit Added',
      description: 'The subreddit has been added successfully.',
      duration: 3000
    })
  }, [refetchSubreddits, addToast])

  // Update review for single subreddit using React Query mutation
  const updateReview = useCallback(async (id: number, review: 'Ok' | 'No Seller' | 'Non Related' | 'Banned') => {
    // Ensure the row exists (no variable needed)
    subreddits.find((sub: DbSubreddit) => sub.id === id)

    // Map 'Banned' to 'User Feed' for the mutation
    const reviewStatus = review === 'Banned' ? 'User Feed' : review as ReviewStatus

    // No undo state retention

    // Check if item should be removed from current filter
    const shouldRemove = (
      (currentFilter === 'unreviewed') ||
      (currentFilter === 'ok' && review !== 'Ok') ||
      (currentFilter === 'non_related' && review !== 'Non Related') ||
      (currentFilter === 'no_seller' && review !== 'No Seller') ||
      (currentFilter === 'banned' && review !== 'Banned')
    )

    if (shouldRemove) {
      // Add to removing list for fade effect
      setRemovingIds(prev => new Set([...prev, id]))
      // Don't remove from removingIds - let the data refetch handle it
    }

    // Execute mutation with current filter to only invalidate the active query
    updateReviewMutation.mutate(
      {
        subredditId: id,
        review: reviewStatus,
        previousFilter: getReviewFromFilter(currentFilter)
      },
      {
        onError: () => {
          // No undo state to clear
          // Revert fade-out on error so the row is visible again
          setRemovingIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    )
  }, [subreddits, currentFilter, updateReviewMutation])

  // Undo functionality removed

  // Bulk review update using React Query mutation
  const updateBulkReview = useCallback(async (review: 'Ok' | 'No Seller' | 'Non Related' | 'Banned') => {
    const selectedIds = Array.from(selectedSubreddits)
    if (selectedIds.length === 0) return

    // Map 'Banned' to 'User Feed' for the mutation
    const reviewStatus = review === 'Banned' ? 'User Feed' : review as ReviewStatus

    // No undo state retention

    bulkUpdateMutation.mutate(
      {
        subredditIds: selectedIds,
        review: reviewStatus
      },
      {
        onSuccess: () => {
          // Clear selection after success
          setSelectedSubreddits(new Set())
        },
        onError: () => {
          // No undo state to clear
        }
      }
    )
  }, [selectedSubreddits, bulkUpdateMutation])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  // Build filter options (excluding User Feed/banned)
  const filterOptions = useMemo(() => [
    { value: 'unreviewed' as FilterType, label: 'Unreviewed', count: reviewCounts.unreviewed },
    { value: 'ok' as FilterType, label: 'Ok', count: reviewCounts.ok },
    { value: 'no_seller' as FilterType, label: 'No Seller', count: reviewCounts.no_seller },
    { value: 'non_related' as FilterType, label: 'Non Related', count: reviewCounts.non_related },
    { value: 'banned' as FilterType, label: 'User Feed', count: reviewCounts.banned },
  ], [reviewCounts])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Review</h2>

        {/* Metrics Cards with Add Button */}
        <div className="mb-6">
          <ComponentErrorBoundary>
            <div className="flex items-center gap-3">
              {isLoading ? (
                <MetricsCardsSkeleton />
              ) : (
                <div className="flex-1">
                  <MetricsCards
                    totalSubreddits={reviewCounts.total}
                    statusCount={reviewCounts.unreviewed}
                    statusTitle="Unreviewed"
                    newTodayCount={newTodayCount}
                    reviewCounts={reviewCounts}
                    loading={false}
                  />
                </div>
              )}
              {/* Add Subreddit Button */}
              {!isLoading && (
                <StandardActionButton
                  onClick={() => setShowAddModal(true)}
                  label="Add Subreddit"
                  icon={Plus}
                  variant="primary"
                />
              )}
            </div>
          </ComponentErrorBoundary>
        </div>

        {/* StandardToolbar - Always visible */}
        <div className="mb-4">
          <ComponentErrorBoundary>
            <StandardToolbar
              // Search
              searchValue={searchQuery}
              onSearchChange={handleSearchChange}

              // Filters
              filters={filterOptions.map(f => ({
                id: f.value,
                label: f.label,
                count: f.count
              }))}
              currentFilter={currentFilter}
              onFilterChange={(filterId) => handleFilterChange(filterId as FilterType)}

              // Bulk actions (when items selected)
              selectedCount={selectedSubreddits.size}
              bulkActions={selectedSubreddits.size > 0 ? [
                {
                  id: 'ok',
                  label: 'Mark Ok',
                  icon: Check,
                  onClick: () => updateBulkReview('Ok'),
                  variant: 'secondary'
                },
                {
                  id: 'no-seller',
                  label: 'No Seller',
                  icon: UserX,
                  onClick: () => updateBulkReview('No Seller'),
                  variant: 'secondary'
                },
                {
                  id: 'non-related',
                  label: 'Non Related',
                  icon: X,
                  onClick: () => updateBulkReview('Non Related'),
                  variant: 'secondary'
                },
                {
                  id: 'banned',
                  label: 'User Feed',
                  icon: Ban,
                  onClick: () => updateBulkReview('Banned'),
                  variant: 'secondary'
                }
              ] : []}
              onClearSelection={() => setSelectedSubreddits(new Set())}

              loading={isLoading || bulkUpdateMutation.isPending}
              accentColor="linear-gradient(135deg, #FF8395, #FF7A85)"
            />
          </ComponentErrorBoundary>
        </div>

        {/* Main Review Table */}
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="space-y-6">
              <TableSkeleton />
            </div>
          ) : (
            <ComponentErrorBoundary>
              <UniversalTable
                {...createSubredditReviewTable({
                  subreddits: subreddits as unknown as TableSubreddit[],
                  selectedSubreddits,
                  setSelectedSubreddits,
                  onUpdateReview: (id: number, reviewText: string) => updateReview(id, reviewText as 'Ok' | 'No Seller' | 'Non Related' | 'Banned'),
                  loading: isLoading,
                  hasMore: hasNextPage || false,
                  loadingMore: isFetchingNextPage,
                  onReachEnd: handleReachEnd,
                  searchQuery: debouncedSearchQuery,
                  brokenIcons: brokenIcons,
                  handleIconError,
                  onShowRules: handleShowRules,
                  testId: 'subreddit-review-table',
                  removingIds
                })}
              />
            </ComponentErrorBoundary>
          )}
        </div>

        {/* Rules Modal */}
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
                    const rulesData: unknown = rulesModal.subreddit.rules_data as unknown
                    let rules: Array<{
                      short_name?: string;
                      title?: string;
                      description?: string;
                      violation_reason?: string;
                    }> = []

                    if (rulesData != null) {
                      if (typeof rulesData === 'string') {
                        try {
                          if (rulesData.trim() === '') {
                            rules = []
                          } else {
                            const parsed = JSON.parse(rulesData)
                            rules = Array.isArray(parsed) ? parsed : (parsed.rules && Array.isArray(parsed.rules)) ? parsed.rules : []
                          }
                        } catch (error) {
                          logger.warn('Failed to parse rules data:', error)
                          rules = []
                        }
                      } else if (Array.isArray(rulesData)) {
                        rules = rulesData
                      } else if (typeof rulesData === 'object' && rulesData !== null && 'rules' in (rulesData as Record<string, unknown>) && Array.isArray((rulesData as {rules: unknown}).rules)) {
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
                    logger.error('Error parsing rules data:', error)
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

        {/* Add Subreddit Modal */}
        <AddSubredditModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSubredditAdded}
        />
      </div>
    </DashboardLayout>
  )
}