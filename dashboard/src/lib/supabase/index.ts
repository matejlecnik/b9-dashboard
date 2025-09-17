import { createBrowserClient, createServerClient } from '@supabase/ssr'

// Get environment variables with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cetrhongdrjztsrsffuh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew'

// Browser client for client-side usage
export const supabase = (() => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('🚨 Supabase environment variables missing')
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-web'
        }
      }
    })
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    return null
  }
})()

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
export async function createClient(): Promise<ReturnType<typeof createServerClient> | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
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
    if (!supabase) {
      console.error('🚨 Supabase client not available')
      return fallback()
    }
    const result = await operation(supabase)
    return result
  } catch (error) {
    console.error('🚨 Supabase operation failed:', error)
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

// Re-export types from reddit module
export type { Subreddit, Post, User, Category } from './reddit'