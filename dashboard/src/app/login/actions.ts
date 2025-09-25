'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

// Helper function to format auth errors
function formatAuthError(error: { message?: string; code?: string }): string {
  const message = error.message || 'Authentication failed'

  // Map common Supabase auth errors to user-friendly messages
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before logging in.'
  }
  if (message.includes('User not found')) {
    return 'No account found with this email address.'
  }

  return message
}

export async function login(prevState: { error: string } | null, formData: FormData) {
  const supabase = await createClient()

  if (!supabase) {
    return {
      error: 'Authentication service is currently unavailable. Please try again later.'
    }
  }

  // Validate inputs
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return {
      error: 'Please provide both email and password.'
    }
  }

  if (!email.includes('@')) {
    return {
      error: 'Please enter a valid email address.'
    }
  }

  const data = { email, password }

  try {
    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      return {
        error: formatAuthError(error as { message?: string; code?: string })
      }
    }

    // Success - redirect to dashboard
    revalidatePath('/', 'layout')
    redirect('/dashboards')
  } catch (error: unknown) {
    // Check if this is a Next.js redirect (which is normal behavior)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // Re-throw redirect errors as they are expected Next.js behavior
      throw error
    }
    
    logger.error('Login action error:', error)
    return {
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}


