'use client'

import React, { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Tag, UserPlus } from 'lucide-react'
import { StandardToolbar, StandardActionButton } from '@/components/shared'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { AddCreatorModal } from '@/components/instagram/AddCreatorModal'
import { UniversalProgressCard } from '@/components/shared/cards/UniversalProgressCard'
import { UniversalInputModal } from '@/components/shared/modals/UniversalInputModal'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber } from '@/lib/formatters'
import { TableSkeleton } from '@/components/shared/SkeletonLoaders'

// Import React Query hooks
import {
  useNichingStats,
  useNichingCreators,
  useBulkUpdateCreatorNiche,
  useUpdateCreatorNiche,
  type NichingFilters
} from '@/hooks/queries/useInstagramReview'

// Import table configuration
import { createInstagramNichingColumns, type InstagramCreator } from '@/components/shared/tables/configs/instagramNichingColumns'
import type { TableConfig } from '@/components/shared/tables/types'

// Dynamic import for table
const UniversalTableV2 = dynamic(
  () => import('@/components/shared/tables/UniversalTableV2').then(mod => mod.UniversalTableV2),
  { ssr: false, loading: () => <TableSkeleton /> }
)

type FilterType = 'unniched' | 'niched' | 'all'

export default function NichingPage() {
  // Simplified state - only 5 useState hooks
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('unniched')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNicheModal, setShowNicheModal] = useState(false)

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch stats using React Query hook
  const { data: stats } = useNichingStats()

  // Convert filter to niches array for the hook
  const getNichesFilter = useCallback((): string[] | null => {
    if (currentFilter === 'unniched') return null // null = show only unniched
    if (currentFilter === 'all') return [] // empty array = show all
    // currentFilter === 'niched'
    return stats?.availableNiches || [] // show all niched
  }, [currentFilter, stats?.availableNiches])

  // Fetch creators using React Query hook with infinite scroll
  const filters: NichingFilters = useMemo(() => ({
    search: debouncedSearchQuery,
    niches: getNichesFilter(),
    orderBy: 'followers',
    order: 'desc'
  }), [debouncedSearchQuery, getNichesFilter])

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useNichingCreators(filters)

  // Flatten paginated data
  const creators = useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Mutations
  const bulkUpdateMutation = useBulkUpdateCreatorNiche()
  const updateNicheMutation = useUpdateCreatorNiche()

  // Bulk update handler
  const bulkUpdateNiche = useCallback(async (niche: string | null) => {
    if (selectedCreators.size === 0) return

    await bulkUpdateMutation.mutateAsync({
      creatorIds: Array.from(selectedCreators),
      niche
    })
    setSelectedCreators(new Set())
  }, [selectedCreators, bulkUpdateMutation])

  // Handler for single creator niche update
  const handleUpdateNiche = useCallback((id: number, niche: string | null) => {
    updateNicheMutation.mutate({
      creatorId: id,
      niche
    })
  }, [updateNicheMutation])

  // Handler for single creator review update
  const handleUpdateReview = useCallback((_id: number, _review: string) => {
    // This is a placeholder - the niching page focuses on niche assignment, not review status
    // Review updates are handled on the creator-review page
  }, [])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  // Transform creators for table - match InstagramCreator interface from niching columns
  const transformedCreators = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return creators.map((creator: any): InstagramCreator => ({
      id: creator.id,
      ig_user_id: creator.ig_user_id || String(creator.id),
      username: creator.username,
      full_name: creator.full_name || null,
      biography: creator.biography || null,
      profile_pic_url: creator.profile_pic_url || null,
      followers: creator.followers || 0,
      posts_count: creator.posts_count || 0,
      review_status: creator.review_status,
      is_private: creator.is_private || false,
      is_verified: creator.is_verified || false,
      is_business_account: creator.is_business_account || false,
      niche: creator.niche || null,
      viral_content_count_cached: creator.viral_content_count_cached || null,
      avg_views_per_reel_cached: creator.avg_views_per_reel_cached || null,
      posting_frequency_per_week: creator.posting_frequency_per_week || null,
      follower_growth_rate_weekly: creator.follower_growth_rate_weekly || null,
      save_to_like_ratio: creator.save_to_like_ratio || null,
      last_post_days_ago: creator.last_post_days_ago || null,
      engagement_rate_cached: creator.engagement_rate_cached || null,
      avg_likes_per_post: creator.avg_likes_per_post || null
    }))
  }, [creators])

  // Create table configuration with column definitions
  const tableConfig: TableConfig<InstagramCreator> = useMemo(() => ({
    columns: createInstagramNichingColumns({
      onUpdateReview: handleUpdateReview,
      onUpdateNiche: handleUpdateNiche,
      availableNiches: stats?.availableNiches || []
    }),
    showCheckbox: true,
    emptyState: {
      title: searchQuery ? 'No creators found matching your search' : 'No creators to niche',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }
  }), [searchQuery, handleUpdateReview, handleUpdateNiche, stats?.availableNiches])

  // Calculate stats for display
  const displayStats = {
    all: stats?.total || 0,
    unniched: stats?.unniched || 0,
    niched: stats?.niched || 0
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Progress Card with Add Creator Button */}
        <ComponentErrorBoundary>
          <div className="flex gap-3">
            {/* Progress Bar Card using UniversalProgressCard */}
            <UniversalProgressCard
              title="Niching Progress"
              value={`${Math.round(((displayStats.niched) / Math.max(1, displayStats.all)) * 100)}%`}
              subtitle={`${formatNumber(displayStats.niched)} / ${formatNumber(displayStats.all)}`}
              percentage={displayStats.all > 0
                ? Math.round((displayStats.niched / displayStats.all) * 100)
                : 0
              }
              loading={false}
              className="flex-1"
            />

            {/* Add Creator Button with proper wrapper */}
            <div className="flex-1 max-w-[200px]">
              <StandardActionButton
                onClick={() => setShowAddModal(true)}
                label="Add Creator"
                icon={UserPlus}
                variant="primary"
                size="normal"
              />
            </div>
          </div>
        </ComponentErrorBoundary>

        {/* StandardToolbar */}
        <ComponentErrorBoundary>
          <StandardToolbar
            // Search
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}

            // Filters
            filters={[
              {
                id: 'all',
                label: 'All',
                count: displayStats.all
              },
              {
                id: 'unniched',
                label: 'Unniched',
                count: displayStats.unniched
              },
              {
                id: 'niched',
                label: 'Niched',
                count: displayStats.niched
              }
            ]}
            currentFilter={currentFilter}
            onFilterChange={(filterId: string) => {
              setCurrentFilter(filterId as FilterType)
              setSelectedCreators(new Set()) // Clear selection on filter change
            }}

            // Bulk actions (when items selected)
            selectedCount={selectedCreators.size}
            bulkActions={selectedCreators.size > 0 ? [
              {
                id: 'set-niche',
                label: 'Set Niche',
                icon: Tag,
                onClick: () => setShowNicheModal(true),
                variant: 'secondary' as const
              }
            ] : []}
            onClearSelection={() => setSelectedCreators(new Set())}

            loading={isLoading}
            accentColor="linear-gradient(135deg, #E1306C, #F77737)"
          />
        </ComponentErrorBoundary>

        {/* Extended Instagram Table */}
        <ComponentErrorBoundary>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
        </ComponentErrorBoundary>
      </div>

      {/* Add Creator Modal */}
      <AddCreatorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreatorAdded={() => {
          // Refresh the creators list after adding
          // The query will auto-refetch due to cache invalidation
        }}
      />

      {/* Niche Input Modal */}
      <UniversalInputModal
        isOpen={showNicheModal}
        onClose={() => setShowNicheModal(false)}
        onConfirm={(niche) => {
          bulkUpdateNiche(niche.trim() || null)
          setShowNicheModal(false)
        }}
        title="Set Niche"
        subtitle="Enter niche for selected creators"
        placeholder="e.g., fitness, beauty, travel"
        icon={Tag}
        platform="instagram"
      />
    </DashboardLayout>
  )
}
