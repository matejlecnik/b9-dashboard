/**
 * Type definitions for Reddit Subreddit data
 */

import type { Post } from './post'

export interface Subreddit {
  id: number
  name: string
  display_name: string
  display_name_prefixed: string
  title: string | null
  public_description: string | null
  description: string | null
  subscribers: number
  active_user_count: number | null
  accounts_active: number | null
  over18: boolean
  is_nsfw?: boolean // Alias for over18
  verification_required?: boolean
  primary_category: string | null
  tags: string[] | null
  review: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | 'Banned' | null
  created_at: string
  updated_at: string
  tags_updated_at: string | null

  // Additional optional fields
  icon_img?: string | null
  community_icon?: string | null
  banner_img?: string | null
  header_img?: string | null
  submission_type?: string | null
  restrict_posting?: boolean | null
  free_form_reports?: boolean | null
  wiki_enabled?: boolean | null
  allow_images?: boolean | null
  allow_videos?: boolean | null
  spoilers_enabled?: boolean | null
  rules_data?: unknown

  // Computed/joined fields
  post_count?: number
  avg_upvotes_per_post?: number
  engagement?: number
  best_posting_hour?: number | null
  best_posting_day?: string | null
}

export type SubredditReview = Subreddit['review']

export interface SubredditWithPosts extends Subreddit {
  recent_posts?: Post[]
}

export interface SubredditFilters {
  search?: string
  tags?: string[]
  review?: SubredditReview
  category?: string
  hasCategory?: boolean
  showUntaggedOnly?: boolean
  orderBy?: 'subscribers' | 'created_at' | 'primary_category'
  order?: 'asc' | 'desc'
}