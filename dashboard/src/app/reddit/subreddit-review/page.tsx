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
import type { Subreddit as TableSubreddit } from '@/types/subreddit'
import type { Subreddit as DbSubreddit } from '@/lib/supabase'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { UniversalMetricCard } from '@/components/shared/cards/UniversalMetricCard'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { Plus, Check, UserX, X } from 'lucide-react'
import { createRedditReviewColumns } from '@/components/shared/tables/configs/redditReviewColumns'
import type { TableConfig } from '@/components/shared/tables/types'

// Dynamic imports for heavy components
const UniversalTableV2 = dynamic(
  () => import('@/components/shared/tables/UniversalTableV2').then(mod => mod.UniversalTableV2),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const AddSubredditModal = dynamic(
  () => import('@/components/common/modals/AddSubredditModal').then(mod => mod.AddSubredditModal),
  { ssr: false }
)

const SubredditRulesModal = dynamic(
  () => import('@/components/features/SubredditRulesModal').then(mod => ({ default: mod.SubredditRulesModal })),
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
    orderBy: 'avg_upvotes_per_post',
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
  ], [reviewCounts])

  // Create table configuration with column definitions
  const tableConfig: TableConfig<TableSubreddit> = useMemo(() => ({
    columns: createRedditReviewColumns({
      onUpdateReview: (id: number, review: string) => updateReview(id, review as 'Ok' | 'No Seller' | 'Non Related' | 'Banned'),
      onShowRules: handleShowRules
    }),
    showCheckbox: true,
    emptyState: {
      title: searchQuery ? 'No subreddits found matching your search' : 'No subreddits to review',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }
  }), [searchQuery])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Review</h2>

        {/* Metrics Cards with Add Button */}
        <div className="mb-6">
          <ComponentErrorBoundary>
            <div className="flex items-stretch gap-3 w-full">
              {isLoading ? (
                <MetricsCardsSkeleton />
              ) : (
                <>
                  <UniversalMetricCard
                    title="Total Subreddits"
                    value={reviewCounts.total}
                    subtitle="In Database"
                    className="flex-1"
                  />
                  <UniversalMetricCard
                    title="Unreviewed"
                    value={reviewCounts.unreviewed}
                    subtitle="Pending Review"
                    highlighted
                    className="flex-1"
                  />
                  <UniversalMetricCard
                    title="New Today"
                    value={newTodayCount}
                    subtitle="Last 24 Hours"
                    className="flex-1"
                  />
                </>
              )}
              {/* Add Subreddit Button */}
              {!isLoading && (
                <div className="flex-1 max-w-[200px]">
                  <StandardActionButton
                    onClick={() => setShowAddModal(true)}
                    label="Add Subreddit"
                    icon={Plus}
                    variant="primary"
                    size="normal"
                  />
                </div>
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
                }
              ] : []}
              onClearSelection={() => setSelectedSubreddits(new Set())}

              loading={isLoading || bulkUpdateMutation.isPending}
              accentColor="linear-gradient(135deg, var(--reddit-primary), var(--reddit-secondary))"
            />
          </ComponentErrorBoundary>
        </div>

        {/* Main Review Table */}
        <div className="flex-1 flex flex-col min-h-0">
          <ComponentErrorBoundary>
            <UniversalTableV2
              data={subreddits as unknown as TableSubreddit[]}
              config={tableConfig as any}
              loading={isLoading}
              selectedItems={selectedSubreddits}
              onSelectionChange={(ids) => setSelectedSubreddits(ids as Set<number>)}
              getItemId={(subreddit: any) => subreddit.id}
              searchQuery={debouncedSearchQuery}
              onReachEnd={handleReachEnd}
              hasMore={hasNextPage}
              loadingMore={isFetchingNextPage}
            />
          </ComponentErrorBoundary>
        </div>

        {/* Rules Modal */}
        {rulesModal.isOpen && rulesModal.subreddit && (
          <SubredditRulesModal
            isOpen={rulesModal.isOpen}
            onClose={handleCloseRules}
            subreddit={rulesModal.subreddit}
          />
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