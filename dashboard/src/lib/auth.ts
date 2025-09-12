import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
// next/server types not needed here

/**
 * Clear all authentication-related cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  const authCookieNames = [
    'sb-access-token',
    'sb-refresh-token', 
    'sb-auth-token',
    'supabase-auth-token',
    'supabase.auth.token'
  ]
  
  // Get all cookies and filter for Supabase auth cookies
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.startsWith('sb-') || 
    cookie.name.includes('supabase') ||
    authCookieNames.includes(cookie.name)
  )
  
  // Delete all auth-related cookies
  supabaseCookies.forEach(cookie => {
    cookieStore.delete(cookie.name)
  })
}

/**
 * Safely check if a user is authenticated
 * Returns user data or null, handles refresh token errors gracefully
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return { user: null, error: 'Auth service unavailable' }
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Handle refresh token errors
      if (error.message?.includes('refresh_token_not_found') || 
          error.message?.includes('Invalid Refresh Token')) {
        await clearAuthCookies()
        return { user: null, error: 'Session expired' }
      }
      
      return { user: null, error: error.message }
    }
    
    return { user, error: null }
  } catch (error: unknown) {
    console.error('Auth check error:', error)
    await clearAuthCookies()
    return { user: null, error: 'Auth check failed' }
  }
}

/**
 * Check if the current error is related to authentication
 */
export function isAuthError(error: unknown): boolean {
  if (!error) return false
  
  const message = error instanceof Error ? error.message : String(error)
  const authErrorPatterns = [
    'refresh_token_not_found',
    'Invalid Refresh Token',
    'JWT expired',
    'invalid claim',
    'Unable to validate',
    'Unauthorized'
  ]
  
  return authErrorPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Format auth error messages for user display
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred'
  
  const message = error instanceof Error ? error.message : String(error)
  
  // Map technical errors to user-friendly messages
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  
  if (message.includes('Email not confirmed')) {
    return 'Please check your email and confirm your account before signing in.'
  }
  
  if (message.includes('Too many requests')) {
    return 'Too many login attempts. Please wait a moment before trying again.'
  }
  
  if (message.includes('refresh_token_not_found') || message.includes('Invalid Refresh Token')) {
    return 'Your session has expired. Please sign in again.'
  }
  
  if (message.includes('network') || message.includes('timeout')) {
    return 'Network connection issue. Please check your internet connection and try again.'
  }
  
  // Fallback for unknown errors
  return 'Sign in failed. Please try again or contact support if the problem persists.'
}

/**
 * Check if user is authenticated from middleware context
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createClient()
    if (!supabase) return false
    
    const { data: { user }, error } = await supabase.auth.getUser()
    return !error && user !== null
  } catch (error) {
    console.error('Middleware auth check error:', error)
    return false
  }
}