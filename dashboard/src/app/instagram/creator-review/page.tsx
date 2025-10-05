'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Check, X, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { MetricsCards } from '@/components/shared/cards/MetricsCards'
import { useDebounce } from '@/hooks/useDebounce'

// Import data hooks directly
import {
  useInstagramCreators,
  useCreatorStats,
  useUpdateCreatorStatus,
  useBulkUpdateCreatorStatus,
  type CreatorStatus
} from '@/hooks/queries/useInstagramReview'

// Dynamic imports for heavy components
const UniversalCreatorTable = dynamic(
  () => import('@/components/shared/tables/UniversalCreatorTable').then(mod => mod.UniversalCreatorTable),
  { ssr: false }
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

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedCreators(new Set())
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
    isFetchingNextPage,
    hasNextPage,
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

  // Flatten paginated data
  const creators = React.useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // DEBUG: Log data
  useEffect(() => {
    console.log('🎯 Instagram Creators Page Data:', {
      creatorsCount: creators.length,
      isLoading,
      hasNextPage,
      currentFilter,
      stats
    })
  }, [creators.length, isLoading, hasNextPage, currentFilter, stats])

  // Transform creators for table
  const transformedCreators = React.useMemo(() => {
    const transformed = creators.map((creator: any) => ({
      id: creator.id,
      ig_user_id: creator.ig_user_id || String(creator.id),
      username: creator.username,
      full_name: creator.full_name || null,
      biography: creator.biography || null,
      profile_pic_url: creator.profile_pic_url || null,
      followers: creator.followers,
      following: creator.following,
      posts_count: creator.posts_count,
      media_count: creator.media_count || creator.posts_count,
      review_status: creator.review_status,
      reviewed_at: creator.reviewed_at || null,
      reviewed_by: creator.reviewed_by || null,
      discovery_source: creator.discovery_source || null,
      is_private: creator.is_private || false,
      is_verified: creator.is_verified || false,
      is_business_account: creator.is_business_account || false,
      avg_views_per_reel_cached: creator.avg_views_per_reel_cached || null,
      engagement_rate_cached: creator.engagement_rate_cached || null,
      viral_content_count_cached: creator.viral_content_count_cached || null,
      external_url: creator.external_url || null,
      external_url_type: creator.external_url_type || null,
      bio_links: null,
      avg_likes_per_post: creator.avg_likes_per_post_cached || null,
      avg_comments_per_post_cached: creator.avg_comments_per_post_cached || null,
      avg_likes_per_reel_cached: creator.avg_likes_per_reel_cached || null,
      avg_comments_per_reel_cached: creator.avg_comments_per_reel_cached || null,
      avg_saves_per_post_cached: creator.avg_saves_per_post_cached || null,
      avg_shares_per_post_cached: creator.avg_shares_per_post_cached || null,
      posting_frequency_per_week: creator.posting_frequency_per_week || null,
      follower_growth_rate_weekly: creator.follower_growth_rate_weekly || null,
      follower_growth_rate_daily: creator.follower_growth_rate_daily || null,
      save_to_like_ratio: creator.save_to_like_ratio || null,
      last_post_days_ago: creator.last_post_days_ago || null,
      best_content_type: creator.best_content_type || null,
      posting_consistency_score: creator.posting_consistency_score || null,
      reels_count: creator.reels_count || null,
      niche: creator.niche || null
    }))

    // DEBUG: Log profile picture URLs
    if (transformed.length > 0) {
      console.log('🖼️ PROFILE PIC DEBUG - First 3 creators:', transformed.slice(0, 3).map(c => ({
        username: c.username,
        profile_pic_url: c.profile_pic_url,
        hasUrl: !!c.profile_pic_url,
        urlLength: c.profile_pic_url?.length || 0
      })))

      const withPics = transformed.filter(c => c.profile_pic_url).length
      const withoutPics = transformed.length - withPics
      console.log(`🖼️ PROFILE PIC STATS: ${withPics} with URLs, ${withoutPics} without URLs (${((withPics/transformed.length)*100).toFixed(1)}% have pics)`)
    }

    return transformed
  }, [creators])

  // Handle single item update
  const handleItemUpdate = useCallback(async (id: number, review: 'ok' | 'non_related' | 'pending') => {
    let status: CreatorStatus = null  // 'pending' → NULL
    if (review === 'ok') status = 'ok'
    else if (review === 'non_related') status = 'non_related'

    await updateStatusMutation.mutateAsync({
      creatorId: id,
      status,
      notes: undefined
    })
  }, [updateStatusMutation])

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

  // Render using DashboardLayout directly (like Reddit does)
  return (
    <>
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          {/* Stats with Action Button */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <MetricsCards
                platform="instagram"
                totalCreators={stats?.total || 0}
                pendingCount={stats?.pending || 0}
                approvedCount={stats?.approved || 0}
                nonRelatedCount={stats?.rejected || 0}
                loading={isLoading}
              />
            </div>
            {/* Get Related Creators Button */}
            {!isLoading && (
              <StandardActionButton
                onClick={() => setShowRelatedModal(true)}
                label="Get Related Creators"
                icon={Users}
                variant="primary"
              />
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
          <div className="bg-white rounded-lg shadow-sm border">
            <UniversalCreatorTable
              creators={transformedCreators}
              loading={isLoading}
              selectedCreators={selectedCreators}
              setSelectedCreators={setSelectedCreators}
              onUpdateReview={handleItemUpdate}
              hasMore={hasNextPage || false}
              onReachEnd={fetchNextPage}
              loadingMore={isFetchingNextPage}
            />
          </div>
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