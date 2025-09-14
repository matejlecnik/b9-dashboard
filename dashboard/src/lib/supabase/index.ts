import { createBrowserClient } from '@supabase/ssr'

// Single Supabase client for all platforms
// Tables are now namespaced (reddit_*, instagram_*, etc.)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Re-export the Reddit-specific client and types
export * from './reddit'
// Re-export Reddit types for backward compatibility
export type { Subreddit, Post, User, Category } from './reddit'