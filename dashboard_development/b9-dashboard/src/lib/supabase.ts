import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client for client-side usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server client factory for API routes and server components
export async function createClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Types for our database
export interface Subreddit {
  id: number
  name: string
  display_name_prefixed: string
  title: string
  subscribers: number
  review: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null // Review status for subreddit-review page
  category_text: string | null // Category text for categorization page
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
  id: number | string
  name: string
  description?: string | null
  color?: string
  usage_count?: number
  created_at?: string
  updated_at?: string
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
