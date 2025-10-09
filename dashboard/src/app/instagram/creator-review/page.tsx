'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Check, X, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { UniversalProgressCard } from '@/components/shared/cards/UniversalProgressCard'
import { UniversalMetricCard } from '@/components/shared/cards/UniversalMetricCard'
import { useDebounce } from '@/hooks/useDebounce'

// Import data hooks directly
import {
  useInstagramCreators,
  useCreatorStats,
  useUpdateCreatorStatus,
  useBulkUpdateCreatorStatus,
  type CreatorStatus
} from '@/hooks/queries/useInstagramReview'

// Import table configuration
import { createInstagramReviewColumns, type InstagramCreator } from '@/components/shared/tables/configs/instagramReviewColumns'
import type { TableConfig } from '@/components/shared/tables/types'
import { TableSkeleton } from '@/components/shared/SkeletonLoaders'

// Dynamic imports for heavy components
const UniversalTableV2 = dynamic(
  () => import('@/components/shared/tables/UniversalTableV2').then(mod => mod.UniversalTableV2),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const RelatedCreatorsModal = dynamic(
  () => import('@/components/instagram/RelatedCreatorsModal').then(mod => ({ default: mod.RelatedCreatorsModal })),
  { ssr: false }
)

type FilterType = 'pending' | 'approved' | 'rejected'

export default function CreatorReviewPage() {
  // State management - simple and direct like Reddit
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('pending')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [showRelatedModal, setShowRelatedModal] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Clear selection and removing items when filter changes
  useEffect(() => {
    setSelectedCreators(new Set())
    setRemovingIds(new Set())
  }, [currentFilter])

  // Map filter type to creator status
  const getStatusFromFilter = (filter: string): CreatorStatus | undefined => {
    switch (filter) {
      case 'pending': return null  // NULL in database
      case 'approved': return 'ok'  // 'ok' in database
      case 'rejected': return 'non_related'  // 'non_related' in database
      default: return undefined
    }
  }

  // Fetch creators data directly with the hook
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInstagramCreators({
    search: debouncedSearchQuery,
    status: getStatusFromFilter(currentFilter),
    orderBy: currentFilter === 'pending' ? 'followers' : 'discovery_date',
    order: 'desc'
  })

  // Fetch statistics
  const { data: stats } = useCreatorStats()

  // Mutations
  const updateStatusMutation = useUpdateCreatorStatus()
  const bulkUpdateMutation = useBulkUpdateCreatorStatus()

  // Flatten paginated data and filter out items being removed
  const creators = React.useMemo(
    () => {
      const allCreators = infiniteData?.pages.flat() || []
      // Filter out items that are currently being removed (fading out)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return allCreators.filter((creator: any) => !removingIds.has(creator.id))
    },
    [infiniteData, removingIds]
  )

  // Clean up removingIds when data changes (items have been actually removed from backend)
  useEffect(() => {
    if (removingIds.size > 0 && infiniteData) {
      const allCreators = infiniteData.pages.flat()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentIds = new Set(allCreators.map((c: any) => c.id))
      setRemovingIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set<number>()
        prev.forEach(id => {
          if (currentIds.has(id)) {
            next.add(id)
          }
        })
        return next.size === prev.size ? prev : next
      })
    }
  }, [infiniteData, removingIds.size])

  // Handle single item update
  const handleItemUpdate = useCallback(async (id: number, review: 'ok' | 'non_related' | 'pending') => {
    let status: CreatorStatus = null  // 'pending' → NULL
    if (review === 'ok') status = 'ok'
    else if (review === 'non_related') status = 'non_related'

    // Check if item should be removed from current filter
    const shouldRemove = (
      (currentFilter === 'pending') ||
      (currentFilter === 'approved' && review !== 'ok') ||
      (currentFilter === 'rejected' && review !== 'non_related')
    )

    if (shouldRemove) {
      // Add to removing list for fade effect
      setRemovingIds(prev => new Set([...prev, id]))
    }

    updateStatusMutation.mutate(
      {
        creatorId: id,
        status,
        notes: undefined
      },
      {
        onError: () => {
          // Revert fade-out on error
          setRemovingIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    )
  }, [currentFilter, updateStatusMutation])

  // Handle bulk actions
  const handleBulkApprove = useCallback(async () => {
    if (selectedCreators.size === 0) return

    const selectedIds = Array.from(selectedCreators)
    await bulkUpdateMutation.mutateAsync({
      creatorIds: selectedIds,
      status: 'ok'
    })
    setSelectedCreators(new Set())
  }, [selectedCreators, bulkUpdateMutation])

  const handleBulkReject = useCallback(async () => {
    if (selectedCreators.size === 0) return

    const selectedIds = Array.from(selectedCreators)
    await bulkUpdateMutation.mutateAsync({
      creatorIds: selectedIds,
      status: 'non_related'
    })
    setSelectedCreators(new Set())
  }, [selectedCreators, bulkUpdateMutation])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  // Transform creators for table - simplified to only include required fields for review columns
  const transformedCreators = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return creators.map((creator: any): InstagramCreator => ({
      id: creator.id,
      ig_user_id: creator.ig_user_id || String(creator.id),
      username: creator.username,
      full_name: creator.full_name || null,
      biography: creator.biography || null,
      profile_pic_url: creator.profile_pic_url || null,
      followers: creator.followers || 0,
      following: creator.following || 0,
      posts_count: creator.posts_count || 0,
      review_status: creator.review_status,
      is_private: creator.is_private || false,
      is_verified: creator.is_verified || false,
      is_business_account: creator.is_business_account || false,
      external_url: creator.external_url || null
    }))
  }, [creators])

  // Create table configuration with column definitions
  const tableConfig: TableConfig<InstagramCreator> = React.useMemo(() => ({
    columns: createInstagramReviewColumns({
      onUpdateReview: (id: number, review: string) => handleItemUpdate(id, review as 'ok' | 'non_related' | 'pending')
    }),
    showCheckbox: true,
    emptyState: {
      title: searchQuery ? 'No creators found matching your search' : 'No creators to review',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }
  }), [searchQuery, handleItemUpdate])

  // Render using DashboardLayout directly (like Reddit does)
  return (
    <>
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          {/* Stats with Action Button */}
          <div className="flex gap-3">
            {/* Universal Metrics Cards */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <UniversalProgressCard
                title="Review Progress"
                value={`${stats?.total && (stats.approved + stats.rejected) > 0
                  ? Math.floor(((stats.approved + stats.rejected) / stats.total) * 100)
                  : 0}%`}
                subtitle={`${(stats?.approved || 0) + (stats?.rejected || 0)} / ${stats?.total || 0}`}
                percentage={stats?.total && (stats.approved + stats.rejected) > 0
                  ? Math.floor(((stats.approved + stats.rejected) / stats.total) * 100)
                  : 0}
                loading={isLoading}
              />

              <UniversalMetricCard
                title="Total Creators"
                value={stats?.total || 0}
                subtitle="In Database"
                loading={isLoading}
              />

              <UniversalMetricCard
                title="Approved"
                value={stats?.approved || 0}
                subtitle="Ready to Track"
                loading={isLoading}
                highlighted
              />
            </div>

            {/* Get Related Creators Button */}
            {!isLoading && (
              <div className="flex-1 max-w-[200px]">
                <StandardActionButton
                  onClick={() => setShowRelatedModal(true)}
                  label="Get Related Creators"
                  icon={Users}
                  variant="primary"
                  size="normal"
                />
              </div>
            )}
          </div>

          {/* Toolbar with filters, search and actions */}
          <StandardToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              { id: 'pending', label: 'Pending', count: stats?.pending },
              { id: 'approved', label: 'Approved', count: stats?.approved },
              { id: 'rejected', label: 'Rejected', count: stats?.rejected }
            ]}
            currentFilter={currentFilter}
            onFilterChange={(filter) => setCurrentFilter(filter as FilterType)}
            selectedCount={selectedCreators.size}
            onClearSelection={() => setSelectedCreators(new Set())}
            bulkActions={
              selectedCreators.size > 0 ? [
                {
                  id: 'approve',
                  label: 'Mark Ok',
                  icon: Check,
                  onClick: handleBulkApprove,
                  variant: 'secondary'
                },
                {
                  id: 'reject',
                  label: 'Not Related',
                  icon: X,
                  onClick: handleBulkReject,
                  variant: 'secondary'
                }
              ] : []
            }
          />

          {/* Table */}
          <UniversalTableV2
            data={transformedCreators}
            config={tableConfig as any}
            loading={isLoading}
            selectedItems={selectedCreators}
            onSelectionChange={(ids) => setSelectedCreators(ids as Set<number>)}
            getItemId={(creator: any) => creator.id}
            searchQuery={debouncedSearchQuery}
            onReachEnd={handleReachEnd}
            hasMore={hasNextPage}
            loadingMore={isFetchingNextPage}
          />
        </div>
      </DashboardLayout>

      {/* Related Creators Modal */}
      <RelatedCreatorsModal
        isOpen={showRelatedModal}
        onClose={() => setShowRelatedModal(false)}
      />
    </>
  )
}