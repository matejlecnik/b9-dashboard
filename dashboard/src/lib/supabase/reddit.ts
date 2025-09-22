// Reddit-specific types for Supabase database
// This file only contains type definitions - client setup is in index.ts

// Types for our database
export interface Subreddit {
  id: number
  name: string
  display_name_prefixed: string
  title?: string | null
  description?: string | null
  public_description?: string | null
  subscribers?: number | null
  accounts_active?: number | null // Active members count
  review: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | 'Banned' | null // Review status for subreddit-review page
  category_id?: string | null // Foreign key reference to categories table
  primary_category?: string | null // Primary category from tag system (e.g., "body", "style", "physical")
  tags?: string[] | null // Array of hierarchical tags (e.g., ["body:ass:general", "style:clothing:lingerie"])
  subscriber_engagement_ratio?: number | null
  avg_engagement_velocity?: number | null // Posts per day velocity
  comment_to_upvote_ratio?: number | null // Comment to upvote ratio
  avg_upvotes_per_post: number
  best_posting_day?: string | null
  best_posting_hour?: number | null
  top_content_type?: string | null
  last_scraped_at: string | null
  created_at: string
  icon_img?: string | null // Subreddit icon URL
  community_icon?: string | null // Alternative icon field
  over18: boolean | null // NSFW flag
  // Rules data can be stored as plain text, an array of rule objects, or a structured object with a rules array
  rules_data?:
    | string
    | Array<{
        short_name?: string
        title?: string
        description?: string
        violation_reason?: string
      }>
    | {
        rules?: Array<{
          short_name?: string
          title?: string
          description?: string
          violation_reason?: string
        }>
        combined_text?: string
        [key: string]: unknown
      }
    | null
  total_upvotes_hot_30?: number | null
  total_posts_hot_30?: number | null
  verification_required_detected?: boolean | null // Whether the subreddit requires verification
}

export interface User {
  id: number
  username: string
  reddit_id?: string
  created_utc?: string
  account_age_days: number
  comment_karma?: number
  link_karma?: number
  total_karma: number
  awardee_karma?: number
  awarder_karma?: number
  is_employee?: boolean
  is_mod?: boolean
  is_gold?: boolean
  verified?: boolean
  has_verified_email?: boolean
  is_suspended?: boolean
  icon_img?: string | null
  subreddit_display_name?: string | null
  subreddit_title?: string | null
  subreddit_subscribers?: number
  subreddit_over_18?: boolean
  subreddit_banner_img?: string | null
  bio?: string | null
  bio_url?: string | null
  username_quality_score?: number
  age_quality_score?: number
  karma_quality_score?: number
  overall_user_score: number
  avg_post_score?: number
  avg_post_comments?: number
  total_posts_analyzed?: number
  karma_per_day?: number
  preferred_content_type?: string | null
  most_active_posting_hour?: number | null
  most_active_posting_day?: string | null
  our_creator?: boolean
  cross_subreddit_activity?: number
  last_scraped_at?: string | null
}

export interface Category {
  id: string
  name: string
  normalized_name: string
  description?: string | null
  color: string
  icon?: string | null
  usage_count: number
  parent_id?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  subreddit_name: string
  author_username: string
  created_utc: string
}
