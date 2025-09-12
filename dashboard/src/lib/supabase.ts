import { createBrowserClient, createServerClient } from '@supabase/ssr'

// Get environment variables with fallbacks for build time
// Temporary fix: hardcode values to test client initialization
const supabaseUrl = 'https://cetrhongdrjztsrsffuh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew'

// Browser client for client-side usage with enhanced error handling
// Always creates a client, with detailed debugging and proper error boundaries
export const supabase = typeof window !== 'undefined'
  ? (() => {
      try {
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('🚨 CRITICAL: Supabase environment variables missing:', {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'present' : '❌ MISSING',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : '❌ MISSING',
            environment: 'client',
            location: 'src/lib/supabase.ts',
            timestamp: new Date().toISOString()
          })
        }
        const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          },
          global: { headers: { 'x-client-info': 'supabase-js-web' } }
        })
        return client
      } catch (error) {
        console.error('❌ Failed to create Supabase client:', error)
        return null
      }
    })()
  : null

// Service role client for API routes (bypasses RLS)
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing service role environment variables')
    return null
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() { return [] },
      setAll() { /* No-op for service role */ },
    },
  })
}

// Server client factory for API routes and server components
// Returns null if environment variables are missing
export async function createClient(): Promise<ReturnType<typeof createServerClient> | null> {
  // Return null during build time when env vars aren't available
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or when env vars are missing, return null
    // This prevents build failures while still indicating unavailability
    return null
  }
  
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

// Safe client operations with error handling
export async function withSupabaseClient<T>(
  operation: (client: NonNullable<typeof supabase>) => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    // Check if supabase client is available
    if (!supabase) {
      console.error('🚨 Supabase client not available - this should not happen with our new initialization')
      console.error('🔍 Debug info:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlValue: supabaseUrl || 'empty',
        keyLength: supabaseAnonKey?.length || 0
      })
      return fallback()
    }
    
    const result = await operation(supabase)
    return result
  } catch (error) {
    console.error('🚨 Supabase operation failed:', error)
    // Check if it's an environment/auth error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('missing') || errorMessage.includes('Unauthorized')) {
        console.error('💡 This looks like a Supabase configuration issue. Check your environment variables.')
      }
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        console.error('💡 This looks like a CORS issue. Check Supabase project settings.')
      }
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        console.error('💡 This looks like a network connectivity issue.')
      }
      if (errorMessage.includes('JWT expired') || errorMessage.includes('refresh_token_not_found')) {
        console.error('💡 This looks like an authentication/session issue.')
      }
    }
    return fallback()
  }
}

// Client-side environment check
export function validateSupabaseEnvironment(): {
  isValid: boolean
  missing: string[]
  details: Record<string, unknown>
} {
  const missing: string[] = []
  const details = {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
    environment: typeof window !== 'undefined' ? 'client' : 'server',
    nodeEnv: process.env.NODE_ENV,
  }
  
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  return {
    isValid: missing.length === 0,
    missing,
    details
  }
}

// Types for our database
export interface Subreddit {
  id: number
  name: string
  display_name_prefixed: string
  title?: string | null
  description?: string | null
  public_description?: string | null
  subscribers?: number | null
  review: 'Ok' | 'No Seller' | 'Non Related' | null // Review status for subreddit-review page
  category_text: string | null // Legacy category text for categorization page
  category_id?: string | null // New foreign key reference to categories table
  subscriber_engagement_ratio?: number | null
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
