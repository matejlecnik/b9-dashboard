'use client'

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/useDebounce'

// Import React Query hooks
import {
  useInstagramCreators,
  useCreatorStats,
  useUpdateCreatorStatus,
  useBulkUpdateCreatorStatus,
  type Creator,
  type CreatorStatus,
  type CreatorStats
} from '@/hooks/queries/useInstagramReview'

// Import components
import { TableSkeleton, MetricsCardsSkeleton } from '@/components/SkeletonLoaders'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { MetricsCards } from '@/components/shared/cards/MetricsCards'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { Check, X, UserPlus, Tag, Sparkles, Users, TrendingUp, Clock } from 'lucide-react'
import { logger } from '@/lib/logger'

// Import InstagramCreator type for type safety
import type { Creator as InstagramCreatorType } from '@/components/shared/tables/UniversalCreatorTable'

// Dynamic imports for heavy components
const UniversalCreatorTable = dynamic(
  () => import('@/components/shared/tables/UniversalCreatorTable').then(mod => mod.UniversalCreatorTable),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const RelatedCreatorsModal = dynamic(
  () => import('@/components/instagram/RelatedCreatorsModal').then(mod => ({ default: mod.RelatedCreatorsModal })),
  { ssr: false }
)

type FilterType = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'blacklisted'

export default function CreatorReviewPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('pending')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [isRelatedCreatorsModalOpen, setIsRelatedCreatorsModalOpen] = useState(false)

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Map filter type to creator status
  const getStatusFromFilter = (filter: FilterType): CreatorStatus => {
    switch (filter) {
      case 'pending':
        return 'pending'
      case 'approved':
        return 'approved'
      case 'rejected':
        return 'rejected'
      case 'needs_review':
        return 'needs_review'
      case 'blacklisted':
        return 'blacklisted'
      default:
        return 'pending'
    }
  }

  // React Query hooks
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInstagramCreators({
    search: debouncedSearchQuery,
    status: getStatusFromFilter(currentFilter),
    orderBy: currentFilter === 'pending' ? 'followers' : 'discovered_at',
    order: 'desc'
  })

  // Flatten pages for display
  const creators = React.useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Creator stats
  const { data: stats } = useCreatorStats() as { data: CreatorStats | undefined }

  // Map stats to the expected format for filter counts
  const reviewCounts = React.useMemo(() => ({
    pending: stats?.pending || 0,
    approved: stats?.approved || 0,
    rejected: stats?.rejected || 0,
    needsReview: stats?.needsReview || 0,
    blacklisted: stats?.blacklisted || 0,
    total: stats?.total || 0
  }), [stats])

  // Mutations
  const updateStatusMutation = useUpdateCreatorStatus()
  const bulkUpdateMutation = useBulkUpdateCreatorStatus()


  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((filter: string) => {
    setCurrentFilter(filter as FilterType)
    setSelectedCreators(new Set()) // Clear selections when switching filters
  }, [])

  // Update creator status using React Query mutation
  const updateCreatorStatus = useCallback((creatorId: number, status: CreatorStatus, _notes?: string) => {
    // Execute mutation
    updateStatusMutation.mutate({
      creatorId,
      status,
      notes: _notes
    })
  }, [updateStatusMutation])

  // Bulk update creator status using React Query mutation
  const updateBulkStatus = useCallback((status: CreatorStatus) => {
    const selectedIds = Array.from(selectedCreators)
    if (selectedIds.length === 0) return

    bulkUpdateMutation.mutate(
      {
        creatorIds: selectedIds,
        status
      },
      {
        onSuccess: () => {
          // Clear selection after success
          setSelectedCreators(new Set())
        }
      }
    )
  }, [selectedCreators, bulkUpdateMutation])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  // Transform creators data to match InstagramTable expectations
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
      review_status: (creator.review_status === 'approved' ? 'ok' :
                     creator.review_status === 'rejected' ? 'non_related' :
                     'pending') as 'pending' | 'ok' | 'non_related' | null,
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
    } as InstagramCreatorType))
  }, [creators])

  // Mock posts metrics for now (would need a separate query)
  const postsMetrics = new Map<string, { avgLikes: number, avgComments: number }>()

  return (
    <DashboardLayout
      title="Creator Review"
      subtitle="Review and categorize Instagram creators"
    >
      <div className="space-y-6">
            {/* Metrics Cards */}
            <ComponentErrorBoundary>
              {!stats ? (
                <MetricsCardsSkeleton />
              ) : (
                <MetricsCards
                  platform="instagram"
                  totalCreators={reviewCounts.total}
                  pendingCount={reviewCounts.pending}
                  approvedCount={reviewCounts.approved}
                  nonRelatedCount={reviewCounts.rejected}
                  loading={false}
                />
              )}
            </ComponentErrorBoundary>

            {/* StandardToolbar */}
            <ComponentErrorBoundary>
              <StandardToolbar
                // Search
                searchValue={searchQuery}
                onSearchChange={handleSearchChange}

                // Filters
                filters={[
                  {
                    id: 'pending',
                    label: 'Pending',
                    count: reviewCounts.pending
                  },
                  {
                    id: 'approved',
                    label: 'Approved',
                    count: reviewCounts.approved
                  },
                  {
                    id: 'rejected',
                    label: 'Rejected',
                    count: reviewCounts.rejected
                  },
                  {
                    id: 'needs_review',
                    label: 'Needs Review',
                    count: reviewCounts.needsReview
                  },
                  {
                    id: 'blacklisted',
                    label: 'Blacklisted',
                    count: reviewCounts.blacklisted
                  }
                ]}
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange as (filter: string) => void}

                // Sort options
                sortOptions={[
                  { id: 'followers', label: 'Followers', icon: Users },
                  { id: 'engagement', label: 'Engagement', icon: TrendingUp },
                  { id: 'recent', label: 'Recent', icon: Clock }
                ]}
                currentSort={currentFilter === 'pending' ? 'followers' : 'recent'}
                onSortChange={() => {
                  // Sort is handled by the query hooks with orderBy parameter
                }}

                // Action buttons
                actionButtons={[
                  {
                    id: 'find-related',
                    label: 'Find Related',
                    icon: Sparkles,
                    onClick: () => setIsRelatedCreatorsModalOpen(true),
                    variant: 'outline' as const
                  }
                ]}

                // Bulk actions (when items selected)
                selectedCount={selectedCreators.size}
                bulkActions={selectedCreators.size > 0 ? [
                  {
                    id: 'approve',
                    label: 'Approve',
                    icon: Check,
                    onClick: () => updateBulkStatus('approved'),
                    variant: 'secondary' as const
                  },
                  {
                    id: 'reject',
                    label: 'Reject',
                    icon: X,
                    onClick: () => updateBulkStatus('rejected'),
                    variant: 'secondary' as const
                  },
                  {
                    id: 'needs-review',
                    label: 'Needs Review',
                    icon: UserPlus,
                    onClick: () => updateBulkStatus('needs_review'),
                    variant: 'secondary' as const
                  },
                  {
                    id: 'blacklist',
                    label: 'Blacklist',
                    icon: Tag,
                    onClick: () => updateBulkStatus('blacklisted'),
                    variant: 'secondary' as const
                  }
                ] : []}
                onClearSelection={() => setSelectedCreators(new Set())}

                loading={isLoading || bulkUpdateMutation.isPending}
                accentColor="linear-gradient(135deg, #E1306C, #F77737)"
              />
            </ComponentErrorBoundary>

            {/* Table */}
            <ComponentErrorBoundary>
              <UniversalCreatorTable
                creators={transformedCreators}
                loading={isLoading}
                selectedCreators={selectedCreators}
                setSelectedCreators={setSelectedCreators}
                onUpdateReview={(id: number, review: 'ok' | 'non_related' | 'pending') => {
                  // Map review to status
                  let status: CreatorStatus = 'pending'
                  if (review === 'ok') status = 'approved'
                  else if (review === 'non_related') status = 'rejected'
                  updateCreatorStatus(id, status)
                }}
                postsMetrics={postsMetrics}
                hasMore={hasNextPage || false}
                onReachEnd={handleReachEnd}
                loadingMore={isFetchingNextPage}
              />
            </ComponentErrorBoundary>
      </div>

      {/* Related Creators Modal */}
      {isRelatedCreatorsModalOpen && (
        <RelatedCreatorsModal
          isOpen={isRelatedCreatorsModalOpen}
          onClose={() => setIsRelatedCreatorsModalOpen(false)}
        />
      )}
    </DashboardLayout>
  )
}