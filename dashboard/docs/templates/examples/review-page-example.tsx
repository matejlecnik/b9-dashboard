/**
 * Example: Instagram Creator Review Page Using Templates
 *
 * This example shows how to build a complete review page using the template system.
 * It includes all standard features: search, filters, bulk actions, and infinite scroll.
 */

'use client'

import React, { useCallback } from 'react'
import { Check, X, UserPlus, Tag } from 'lucide-react'

// Import templates and hooks
import {
  ReviewPageTemplate,
  useTemplateData,
  useTemplateActions
} from '@/components/templates'

// Import data hooks
import {
  useInstagramCreators,
  useCreatorStats,
  useUpdateCreatorStatus,
  useBulkUpdateCreatorStatus
} from '@/hooks/queries/useInstagramReview'

export default function InstagramCreatorReviewExample() {
  // 1. Use template data hook for state management
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    currentFilter,
    setCurrentFilter,
    selectedItems,
    setSelectedItems,
    clearSelection
  } = useTemplateData({
    defaultFilter: 'pending',
    clearSelectionOnFilterChange: true
  })

  // 2. Use template actions hook for mutations
  const {
    executeBulkAction,
    updateSingleItem,
    isBulkActionPending,
    isUpdatePending
  } = useTemplateActions({
    queryKey: ['instagram-creators'],
    showToasts: true
  })

  // 3. Fetch data using React Query
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInstagramCreators({
    search: debouncedSearchQuery,
    status: currentFilter,
    orderBy: 'followers',
    order: 'desc'
  })

  // 4. Fetch statistics
  const { data: stats } = useCreatorStats()

  // 5. Flatten paginated data
  const creators = React.useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // 6. Map stats to template format
  const templateStats = React.useMemo(() => {
    if (!stats) return null
    return {
      total: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected
    }
  }, [stats])

  // 7. Define filters with counts
  const filters = React.useMemo(() => [
    {
      id: 'pending',
      label: 'Pending Review',
      count: stats?.pending || 0
    },
    {
      id: 'approved',
      label: 'Approved',
      count: stats?.approved || 0
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: stats?.rejected || 0
    },
    {
      id: 'needs_review',
      label: 'Needs Review',
      count: stats?.needsReview || 0
    }
  ], [stats])

  // 8. Define bulk actions
  const bulkActions = React.useMemo(() => {
    if (selectedItems.size === 0) return []

    return [
      {
        id: 'approve',
        label: 'Approve Selected',
        icon: Check,
        onClick: async () => {
          await executeBulkAction({
            ids: Array.from(selectedItems),
            action: 'approve',
            data: { status: 'approved' }
          })
          clearSelection()
        },
        variant: 'secondary' as const
      },
      {
        id: 'reject',
        label: 'Reject Selected',
        icon: X,
        onClick: async () => {
          await executeBulkAction({
            ids: Array.from(selectedItems),
            action: 'reject',
            data: { status: 'rejected' }
          })
          clearSelection()
        },
        variant: 'secondary' as const
      },
      {
        id: 'tag',
        label: 'Tag Selected',
        icon: Tag,
        onClick: async () => {
          // Open tagging modal
          console.log('Tag selected items:', selectedItems)
        },
        variant: 'secondary' as const
      }
    ]
  }, [selectedItems, executeBulkAction, clearSelection])

  // 9. Handle single item updates
  const handleItemUpdate = useCallback(async (id: number, updates: any) => {
    await updateSingleItem({ id, updates })
  }, [updateSingleItem])

  // 10. Define sort options
  const sortOptions = [
    { id: 'followers', label: 'Followers', icon: UserPlus },
    { id: 'engagement', label: 'Engagement' },
    { id: 'recent', label: 'Recently Added' }
  ]

  // 11. Render using ReviewPageTemplate
  return (
    <ReviewPageTemplate
      // Page metadata
      title="Creator Review"
      subtitle="Review and categorize Instagram creators"
      platform="instagram"

      // Data
      data={creators}
      stats={templateStats}
      isLoading={isLoading}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      onFetchNextPage={fetchNextPage}

      // Search
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search by username or name..."

      // Filters
      filters={filters}
      currentFilter={currentFilter}
      onFilterChange={setCurrentFilter}

      // Sorting
      sortOptions={sortOptions}
      currentSort="followers"
      onSortChange={(sort) => console.log('Sort by:', sort)}

      // Selection
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}

      // Actions
      bulkActions={bulkActions}
      onItemUpdate={handleItemUpdate}

      // Customization
      emptyMessage="No creators found matching your criteria"
    />
  )
}

/**
 * Benefits of using the template:
 *
 * 1. Consistent UI: Same layout and behavior as Reddit dashboard
 * 2. Reduced code: ~50% less code than custom implementation
 * 3. Built-in features: Loading states, error handling, infinite scroll
 * 4. Reusable hooks: State management and actions are abstracted
 * 5. Type safety: Full TypeScript support
 * 6. Performance: Optimized with React.memo and dynamic imports
 * 7. Accessibility: ARIA labels and keyboard navigation included
 *
 * To customize further:
 * - Pass custom tableColumns prop for different column layouts
 * - Add actionButtons prop for page-specific actions
 * - Override accentColor for different visual themes
 * - Extend with modals and additional components as needed
 */