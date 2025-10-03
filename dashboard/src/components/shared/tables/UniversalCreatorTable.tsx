'use client'

import React, { memo, useCallback } from 'react'
import { UniversalTable } from './UniversalTable'
import type { Subreddit } from './UniversalTable'
import { formatNumber } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'

// Instagram Creator type matching the existing structure
export interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  media_count: number
  review_status: 'pending' | 'ok' | 'non_related' | null
  reviewed_at: string | null
  reviewed_by: string | null
  discovery_source: string | null
  is_private: boolean
  is_verified: boolean
  avg_views_per_reel_cached: number | null
  engagement_rate_cached: number | null
  viral_content_count_cached: number | null
  external_url: string | null
  bio_links: Array<{ url: string }> | null
  avg_likes_per_post?: number | null
  niche?: string | null
}

interface UniversalCreatorTableProps {
  creators: InstagramCreator[]
  loading: boolean
  selectedCreators?: Set<number>
  setSelectedCreators?: (ids: Set<number>) => void
  onUpdateReview?: (id: number, review: 'ok' | 'non_related' | 'pending') => void
  searchQuery?: string
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  postsMetrics?: Map<string, { avgLikes: number, avgComments: number }>
}

/**
 * UniversalCreatorTable - Adapter to use UniversalTable with Instagram creators
 * Maps Instagram creator data to the generic Subreddit interface used by UniversalTable
 */
const UniversalCreatorTable = memo(function UniversalCreatorTable({
  creators,
  loading,
  selectedCreators,
  setSelectedCreators,
  onUpdateReview,
  searchQuery,
  onReachEnd,
  hasMore = false,
  loadingMore = false,
  className,
  postsMetrics
}: UniversalCreatorTableProps) {

  // Map Instagram creators to Subreddit format for UniversalTable
  const mappedSubreddits = creators.map(creator => ({
    id: creator.id,
    name: creator.username,
    display_name: creator.username,
    display_name_prefixed: `@${creator.username}`,
    title: creator.full_name || creator.username,
    public_description: creator.biography || '',
    description: creator.biography || '',
    subscribers: creator.followers,
    is_nsfw: false,
    over18: false,
    verification_required: creator.is_private,
    community_icon: creator.profile_pic_url || undefined,
    icon_img: creator.profile_pic_url || undefined,
    engagement: creator.engagement_rate_cached || 0,
    avg_upvotes_per_post: creator.avg_likes_per_post || 0,
    subreddit_tags: creator.niche ? [creator.niche] : [],
    tags: creator.niche ? [creator.niche] : [],
    review: creator.review_status === 'ok' ? 'ok' :
            creator.review_status === 'non_related' ? 'non_related' :
            'pending',
    created_utc: undefined,
    rules_data: null,

    // Store original Instagram data as additional properties
    ig_user_id: creator.ig_user_id,
    is_verified: creator.is_verified,
    following: creator.following,
    posts_count: creator.posts_count,
    viral_content_count: creator.viral_content_count_cached,
    avg_views_per_reel: creator.avg_views_per_reel_cached,
    bio_links: creator.bio_links
  }))

  // Custom columns for Instagram-specific data
  const customColumns = [
    {
      key: 'engagement',
      label: 'Engagement',
      width: 'w-24',
      render: (item: Subreddit) => {
        const engagement = item.engagement || 0
        return (
          <div className="text-sm">
            {engagement > 0 ? (
              <Badge variant={engagement > 5 ? 'default' : 'secondary'}>
                {engagement.toFixed(1)}%
              </Badge>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'viral_content',
      label: 'Viral',
      width: 'w-20',
      render: (item: Subreddit) => {
        const viralCount = (item as Record<string, unknown>).viral_content_count as number || 0
        return (
          <div className="text-sm font-medium">
            {viralCount > 0 ? (
              <span className="text-pink-600">{formatNumber(viralCount)}</span>
            ) : (
              <span className="text-gray-400">0</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'avg_views',
      label: 'Avg Views',
      width: 'w-24',
      render: (item: Subreddit) => {
        const avgViews = (item as Record<string, unknown>).avg_views_per_reel as number || 0
        return (
          <div className="text-sm">
            {avgViews > 0 ? formatNumber(avgViews) : '-'}
          </div>
        )
      }
    }
  ]

  return (
    <UniversalTable
      subreddits={mappedSubreddits}
      selectedSubreddits={selectedCreators}
      onToggleSelection={setSelectedCreators}
      searchQuery={searchQuery}
      loading={loading}
      error={null}
      onReachEnd={onReachEnd}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onUpdateReview={onUpdateReview ? (id: number, reviewText: string) => {
        const review = reviewText as 'ok' | 'non_related' | 'pending'
        onUpdateReview(id, review)
      } : undefined}
      className={className}
      variant="standard"
      platform="instagram"
    />
  )
})

export { UniversalCreatorTable }
export type { InstagramCreator as Creator }