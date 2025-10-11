'use client'

import React, { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Tag, UserPlus, Sparkles } from 'lucide-react'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { UniversalProgressCard } from '@/components/shared/cards/UniversalProgressCard'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber } from '@/lib/formatters'
import { TableSkeleton } from '@/components/shared/SkeletonLoaders'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

// Import React Query hooks
import {
  useNichingStats,
  useNichingCreators,
  useBulkUpdateCreatorNiche,
  useUpdateCreatorNiche,
  useUpdateCreatorStatus,
  useAITaggingStats,
  type NichingFilters,
  type CreatorStatus
} from '@/hooks/queries/useInstagramReview'

// Import table configuration
import { createInstagramNichingColumns, type InstagramCreator } from '@/components/shared/tables/configs/instagramNichingColumns'
import type { TableConfig } from '@/components/shared/tables/types'

// Dynamic imports for heavy components
const UniversalTableV2 = dynamic(
  () => import('@/components/shared/tables/UniversalTableV2').then(mod => mod.UniversalTableV2),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const AddCreatorModal = dynamic(
  () => import('@/components/instagram/AddCreatorModal').then(mod => ({ default: mod.AddCreatorModal })),
  { ssr: false }
)

const UniversalInputModal = dynamic(
  () => import('@/components/shared/modals/UniversalInputModal').then(mod => ({ default: mod.UniversalInputModal })),
  { ssr: false }
)

const StandardModal = dynamic(
  () => import('@/components/shared/modals/StandardModal').then(mod => ({ default: mod.StandardModal })),
  { ssr: false }
)

type FilterType = 'unniched' | 'niched' | 'all'

export default function NichingPage() {
  // Simplified state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('unniched')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNicheModal, setShowNicheModal] = useState(false)
  const [showConfirmTagging, setShowConfirmTagging] = useState(false)
  const [isTagging, setIsTagging] = useState(false)

  // Toast notifications
  const { addToast } = useToast()

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch stats using React Query hook
  const { data: stats } = useNichingStats()
  const { data: aiTaggingStats } = useAITaggingStats()

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
    orderBy: 'followers_count',
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
  const updateStatusMutation = useUpdateCreatorStatus()

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
  const handleUpdateReview = useCallback((id: number, review: string) => {
    updateStatusMutation.mutate({
      creatorId: id,
      status: review === 'pending' ? null : review as CreatorStatus
    })
  }, [updateStatusMutation])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  // Handler for AI tagging
  const handleStartTagging = useCallback(async () => {
    setIsTagging(true)

    addToast({
      type: 'info',
      title: 'AI tagging started',
      description: 'Processing creators in background with visual analysis...',
      duration: 4000
    })

    try {
      const response = await fetch('/api/instagram/tagging/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workers: 5
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start tagging')
      }

      // Show success with stats
      addToast({
        type: 'success',
        title: 'AI tagging completed!',
        description: `Tagged ${data.stats?.successful || 0} creators ($${data.stats?.cost?.toFixed(4) || '0.00'} cost, ${data.stats?.processing_time || 0}s)`,
        duration: 5000
      })

    } catch (error) {
      addToast({
        type: 'error',
        title: 'AI tagging failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        duration: 5000
      })
    } finally {
      setIsTagging(false)
    }
  }, [addToast])

  // Transform creators for table - match InstagramCreator interface from niching columns
  const transformedCreators = useMemo(() => {
    return creators.map((creator: Partial<InstagramCreator>): InstagramCreator => ({
      id: creator.id ?? 0,
      ig_user_id: creator.ig_user_id ?? String(creator.id ?? 0),
      username: creator.username ?? '',
      full_name: creator.full_name ?? null,
      biography: creator.biography ?? null,
      profile_pic_url: creator.profile_pic_url ?? null,
      followers_count: creator.followers_count ?? 0,
      media_count: creator.media_count ?? 0,
      review_status: creator.review_status ?? null,
      is_private: creator.is_private ?? false,
      is_verified: creator.is_verified ?? false,
      is_business_account: creator.is_business_account ?? false,
      niche: creator.niche ?? null,
      viral_content_count_cached: creator.viral_content_count_cached ?? null,
      avg_views_per_reel_cached: creator.avg_views_per_reel_cached ?? null,
      posting_frequency_per_week: creator.posting_frequency_per_week ?? null,
      follower_growth_rate_weekly: creator.follower_growth_rate_weekly ?? null,
      save_to_like_ratio: creator.save_to_like_ratio ?? null,
      last_post_days_ago: creator.last_post_days_ago ?? null,
      engagement_rate_cached: creator.engagement_rate_cached ?? null,
      avg_likes_per_post: creator.avg_likes_per_post_cached ?? null
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
        {/* Progress Card with Action Buttons */}
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

            {/* Action Buttons Container */}
            <div className="flex gap-3">
              {/* Add Creator Button */}
              <div className="flex-1 max-w-[200px] overflow-hidden rounded-2xl">
                <StandardActionButton
                  onClick={() => setShowAddModal(true)}
                  label="Add Creator"
                  icon={UserPlus}
                  variant="primary"
                  size="normal"
                />
              </div>

              {/* AI Tag Creators Button */}
              <div className="flex-1 max-w-[200px] overflow-hidden rounded-2xl">
                <StandardActionButton
                  onClick={() => setShowConfirmTagging(true)}
                  label="AI Tag Creators"
                  icon={Sparkles}
                  variant="primary"
                  size="normal"
                  loading={isTagging}
                />
              </div>
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
          <UniversalTableV2
            data={transformedCreators}
            config={tableConfig as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            loading={isLoading}
            selectedItems={selectedCreators}
            onSelectionChange={(ids) => setSelectedCreators(ids as Set<number>)}
            getItemId={(creator: any) => creator.id} // eslint-disable-line @typescript-eslint/no-explicit-any
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

      {/* AI Tagging Confirmation Modal */}
      <StandardModal
        isOpen={showConfirmTagging}
        onClose={() => setShowConfirmTagging(false)}
        title="Start AI Tagging?"
        subtitle="This will analyze untagged creators using AI vision"
        icon={<Sparkles className="h-4 w-4 text-white" />}
        maxWidth="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmTagging(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowConfirmTagging(false)
                handleStartTagging()
              }}
            >
              Start Tagging
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Available Creators Count */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-300/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Available Creators:</span>
              <span className="text-2xl font-bold text-pink-600">
                {aiTaggingStats?.untagged ? formatNumber(aiTaggingStats.untagged) : '0'}
              </span>
            </div>
          </div>

          <div className="bg-pink-50/50 border border-pink-200/50 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Estimated Cost:</span> ~${((aiTaggingStats?.untagged || 0) * 0.0013).toFixed(2)} (${(0.0013).toFixed(4)} per creator)<br/>
              <span className="font-semibold">Processing Time:</span> ~{Math.round((aiTaggingStats?.untagged || 0) * 20 / 60)} minutes ({(aiTaggingStats?.untagged || 0) * 20} seconds total)
            </p>
          </div>
        </div>
      </StandardModal>
    </DashboardLayout>
  )
}
