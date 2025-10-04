'use client'

import React, { useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Check, X, UserPlus, Tag, Sparkles, Users, TrendingUp, Clock } from 'lucide-react'

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
  useBulkUpdateCreatorStatus,
  type Creator,
  type CreatorStatus
} from '@/hooks/queries/useInstagramReview'

// Import InstagramCreator type for type safety
import type { Creator as InstagramCreatorType } from '@/components/shared/tables/UniversalCreatorTable'

// Dynamic imports for heavy components
const UniversalCreatorTable = dynamic(
  () => import('@/components/shared/tables/UniversalCreatorTable').then(mod => mod.UniversalCreatorTable),
  { ssr: false }
)

const RelatedCreatorsModal = dynamic(
  () => import('@/components/instagram/RelatedCreatorsModal').then(mod => ({ default: mod.RelatedCreatorsModal })),
  { ssr: false }
)

type FilterType = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'blacklisted'

export default function CreatorReviewPage() {
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

  // 2. Modal state
  const [isRelatedCreatorsModalOpen, setIsRelatedCreatorsModalOpen] = React.useState(false)

  // 3. Map filter type to creator status
  const getStatusFromFilter = (filter: string): CreatorStatus => {
    switch (filter) {
      case 'pending': return 'pending'
      case 'approved': return 'approved'
      case 'rejected': return 'rejected'
      case 'needs_review': return 'needs_review'
      case 'blacklisted': return 'blacklisted'
      default: return 'pending'
    }
  }

  // 4. Fetch creators data
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInstagramCreators({
    search: debouncedSearchQuery,
    status: getStatusFromFilter(currentFilter),
    orderBy: currentFilter === 'pending' ? 'followers' : 'discovered_at',
    order: 'desc'
  })

  // 5. Fetch statistics
  const { data: stats } = useCreatorStats()

  // 6. Mutations
  const updateStatusMutation = useUpdateCreatorStatus()
  const bulkUpdateMutation = useBulkUpdateCreatorStatus()

  // 7. Flatten paginated data
  const creators = React.useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // 8. Map stats to template format
  const templateStats = React.useMemo(() => {
    if (!stats) return null
    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      approved: stats.approved || 0,
      rejected: stats.rejected || 0
    }
  }, [stats])

  // 9. Define filters with counts
  const filters = React.useMemo(() => [
    {
      id: 'pending',
      label: 'Pending',
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
    },
    {
      id: 'blacklisted',
      label: 'Blacklisted',
      count: stats?.blacklisted || 0
    }
  ], [stats])

  // 10. Define bulk actions
  const bulkActions = React.useMemo(() => {
    if (selectedItems.size === 0) return []

    return [
      {
        id: 'approve',
        label: 'Approve',
        icon: Check,
        onClick: async () => {
          const selectedIds = Array.from(selectedItems)
          await bulkUpdateMutation.mutateAsync({
            creatorIds: selectedIds.map(Number),
            status: 'approved'
          })
          clearSelection()
        },
        variant: 'secondary' as const
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: X,
        onClick: async () => {
          const selectedIds = Array.from(selectedItems)
          await bulkUpdateMutation.mutateAsync({
            creatorIds: selectedIds.map(Number),
            status: 'rejected'
          })
          clearSelection()
        },
        variant: 'secondary' as const
      },
      {
        id: 'needs-review',
        label: 'Needs Review',
        icon: UserPlus,
        onClick: async () => {
          const selectedIds = Array.from(selectedItems)
          await bulkUpdateMutation.mutateAsync({
            creatorIds: selectedIds.map(Number),
            status: 'needs_review'
          })
          clearSelection()
        },
        variant: 'secondary' as const
      },
      {
        id: 'blacklist',
        label: 'Blacklist',
        icon: Tag,
        onClick: async () => {
          const selectedIds = Array.from(selectedItems)
          await bulkUpdateMutation.mutateAsync({
            creatorIds: selectedIds.map(Number),
            status: 'blacklisted'
          })
          clearSelection()
        },
        variant: 'secondary' as const
      }
    ]
  }, [selectedItems, bulkUpdateMutation, clearSelection])

  // 11. Handle single item update
  const handleItemUpdate = useCallback(async (id: number, review: 'ok' | 'non_related' | 'pending') => {
    // Map review to status
    let status: CreatorStatus = 'pending'
    if (review === 'ok') status = 'approved'
    else if (review === 'non_related') status = 'rejected'

    await updateStatusMutation.mutateAsync({
      creatorId: id,
      status,
      notes: undefined
    })
  }, [updateStatusMutation])

  // 11a. Wrapper for ReviewPageTemplate compatibility
  const handleItemUpdateWrapper = useCallback((id: number, updates: Record<string, unknown>) => {
    const review = updates.review as 'ok' | 'non_related' | 'pending'
    if (review) {
      // Fire and forget - template expects sync function
      void handleItemUpdate(id, review)
    }
  }, [handleItemUpdate])

  // 12. Transform creators for table
  const transformedCreators = React.useMemo((): InstagramCreatorType[] => {
    return creators.map((creator: Creator) => ({
      id: creator.id,
      ig_user_id: String(creator.id),
      username: creator.username,
      full_name: creator.full_name || null,
      biography: creator.bio || null,
      profile_pic_url: creator.profile_pic_url || null,
      followers: creator.followers,
      following: creator.following,
      posts_count: creator.posts,
      media_count: creator.posts,
      review_status: (
        creator.review_status === 'approved' ? 'ok' :
        creator.review_status === 'rejected' ? 'non_related' :
        'pending'
      ) as 'pending' | 'ok' | 'non_related' | null,
      reviewed_at: creator.reviewed_at || null,
      reviewed_by: creator.reviewed_by || null,
      discovery_source: null,
      is_private: false,
      is_verified: creator.is_verified || false,
      avg_views_per_reel_cached: null,
      engagement_rate_cached: creator.engagement_rate || null,
      viral_content_count_cached: null,
      external_url: null,
      bio_links: null,
      avg_likes_per_post: null
    }))
  }, [creators])

  // 13. Define sort options
  const sortOptions = [
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'engagement', label: 'Engagement', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock }
  ]

  // 14. Action buttons
  const actionButtons = (
    <>
      <button
        onClick={() => setIsRelatedCreatorsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Sparkles className="w-4 h-4" />
        Find Related
      </button>
    </>
  )

  // 15. Custom table component with postsMetrics
  const customTable = React.useMemo(() => {
    const postsMetrics = new Map<string, { avgLikes: number; avgComments: number }>()

    return (
      <UniversalCreatorTable
        creators={transformedCreators}
        loading={isLoading}
        selectedCreators={selectedItems}
        setSelectedCreators={setSelectedItems}
        onUpdateReview={handleItemUpdate}
        postsMetrics={postsMetrics}
        hasMore={hasNextPage || false}
        onReachEnd={fetchNextPage}
        loadingMore={isFetchingNextPage}
      />
    )
  }, [transformedCreators, isLoading, selectedItems, setSelectedItems, handleItemUpdate, hasNextPage, fetchNextPage, isFetchingNextPage])

  // 16. Render using ReviewPageTemplate
  return (
    <>
      <ReviewPageTemplate
        // Page metadata
        title="Creator Review"
        subtitle="Review and categorize Instagram creators"
        platform="instagram"

        // Data
        data={transformedCreators}
        stats={templateStats}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        onFetchNextPage={fetchNextPage}

        // Search
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search creators..."

        // Filters
        filters={filters}
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}

        // Sorting
        sortOptions={sortOptions}
        currentSort={currentFilter === 'pending' ? 'followers' : 'recent'}

        // Selection
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}

        // Actions
        bulkActions={bulkActions}
        onItemUpdate={handleItemUpdateWrapper}
        actionButtons={actionButtons}

        // Customization
        emptyMessage="No creators found"
      />

      {/* Related Creators Modal */}
      {isRelatedCreatorsModalOpen && (
        <RelatedCreatorsModal
          isOpen={isRelatedCreatorsModalOpen}
          onClose={() => setIsRelatedCreatorsModalOpen(false)}
        />
      )}
    </>
  )
}