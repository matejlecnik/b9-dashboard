'use client'

import React, { memo } from 'react'
import { UniversalTable } from './UniversalTable'
import type { Subreddit } from './UniversalTable'

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
  review_status: 'ok' | 'non_related' | null  // Database values only
  reviewed_at: string | null
  reviewed_by: string | null
  discovery_source: string | null
  is_private: boolean
  is_verified: boolean
  is_business_account?: boolean
  avg_views_per_reel_cached: number | null
  engagement_rate_cached: number | null
  viral_content_count_cached: number | null
  external_url: string | null
  external_url_type?: string | null
  bio_links: Array<{ url: string }> | null
  avg_likes_per_post?: number | null
  avg_comments_per_post_cached?: number | null
  avg_likes_per_reel_cached?: number | null
  avg_comments_per_reel_cached?: number | null
  avg_saves_per_post_cached?: number | null
  avg_shares_per_post_cached?: number | null
  posting_frequency_per_week?: number | null
  follower_growth_rate_weekly?: number | null
  follower_growth_rate_daily?: number | null
  save_to_like_ratio?: number | null
  last_post_days_ago?: number | null
  best_content_type?: string | null
  posting_consistency_score?: number | null
  reels_count?: number | null
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
  className
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
    subreddit_tags: [], // Tags removed from Instagram creator view
    tags: [], // Tags removed from Instagram creator view
    review: creator.review_status === 'ok' ? 'Ok' :
            creator.review_status === 'non_related' ? 'Non Related' :
            null, // Map to UI values for review buttons
    created_utc: undefined,
    rules_data: null,

    // Store original Instagram data as additional properties
    ig_user_id: creator.ig_user_id,
    is_verified: creator.is_verified,
    is_business_account: creator.is_business_account,
    following: creator.following,
    posts_count: creator.posts_count,
    reels_count: creator.reels_count,
    viral_content_count: creator.viral_content_count_cached,
    avg_views_per_reel: creator.avg_views_per_reel_cached,
    bio_links: creator.bio_links,
    niche: creator.niche,
    // Performance metrics
    posting_frequency_per_week: creator.posting_frequency_per_week,
    follower_growth_rate_weekly: creator.follower_growth_rate_weekly,
    follower_growth_rate_daily: creator.follower_growth_rate_daily,
    save_to_like_ratio: creator.save_to_like_ratio,
    last_post_days_ago: creator.last_post_days_ago,
    // External links
    external_url: creator.external_url,
    external_url_type: creator.external_url_type,
    // Additional engagement metrics
    avg_likes_per_reel_cached: creator.avg_likes_per_reel_cached,
    avg_comments_per_post_cached: creator.avg_comments_per_post_cached,
    avg_comments_per_reel_cached: creator.avg_comments_per_reel_cached,
    avg_saves_per_post_cached: creator.avg_saves_per_post_cached,
    avg_shares_per_post_cached: creator.avg_shares_per_post_cached,
    best_content_type: creator.best_content_type,
    posting_consistency_score: creator.posting_consistency_score,
    // IMPORTANT: Preserve review_status for Instagram-specific logic
    review_status: creator.review_status
  }))

  // DEBUG: Log mapped subreddits
  console.log('📊 Mapped Subreddits for UniversalTable:', mappedSubreddits)
  console.log('📊 Mapped Count:', mappedSubreddits.length)
  if (mappedSubreddits.length > 0) {
    console.log('📊 First mapped item:', mappedSubreddits[0])
  }

  return (
    <UniversalTable
      subreddits={mappedSubreddits as unknown as Subreddit[]}
      selectedSubreddits={selectedCreators}
      setSelectedSubreddits={setSelectedCreators}
      searchQuery={searchQuery}
      loading={loading}
      onReachEnd={onReachEnd}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onUpdateReview={onUpdateReview ? (id: number, reviewText: string) => {
        const review = reviewText as 'ok' | 'non_related' | 'pending'
        onUpdateReview(id, review)
      } : undefined}
      className={className}
      variant="standard"
      mode="review"
      platform="instagram"
    />
  )
})

export { UniversalCreatorTable }
export type { InstagramCreator as Creator }