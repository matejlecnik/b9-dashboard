export interface Post {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  created_utc: string
  subreddit_name: string
  content_type: string
  upvote_ratio: number
  thumbnail: string | null
  url: string
  author_username: string
  sub_primary_category?: string | null  // Mirrored from subreddit's primary_category
  sub_over18?: boolean | null  // Mirrored from subreddit's over18
  preview_data?: {
    images?: Array<{
      source?: { url: string }
      resolutions?: Array<{ url: string; width: number; height: number }>
    }>
    reddit_video?: {
      fallback_url?: string
    }
  }
  domain?: string
  is_video?: boolean
  is_self?: boolean
  over_18?: boolean
}

export interface PostMetrics {
  total_posts_count: number
  total_subreddits_count: number
  avg_score_value: number
  avg_comments_value: number
  best_avg_upvotes_subreddit: string
  best_avg_upvotes_value: number
  best_engagement_subreddit: string
  best_engagement_value: number
  top_content_type: string
  best_performing_hour: number
}

export interface PostFilters {
  sortBy: 'score' | 'comments'
  searchQuery: string
  selectedCategories: string[]
  isCategoryFiltering: boolean
  sfwOnly: boolean
  ageFilter: '24h' | '7d' | '30d' | 'all'
}