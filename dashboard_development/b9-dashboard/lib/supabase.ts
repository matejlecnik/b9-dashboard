import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Subreddit {
  id: number
  name: string
  display_name_prefixed: string
  title: string
  subscribers: number
  category: 'Ok' | 'No Seller' | 'Non Related' | null
  subscriber_engagement_ratio: number
  avg_upvotes_per_post: number
  best_posting_day: string
  best_posting_hour: number
  top_content_type: string
  last_scraped_at: string | null
  created_at: string
  icon_img?: string | null // Subreddit icon URL
  community_icon?: string | null // Alternative icon field
  over18: boolean | null // NSFW flag
  rules_data?: string | null // JSON string of subreddit rules
  total_upvotes_hot_30?: number
  total_posts_hot_30?: number
}

export interface User {
  id: number
  username: string
  overall_user_score: number
  account_age_days: number
  total_karma: number
  cross_subreddit_activity: number
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
