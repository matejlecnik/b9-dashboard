'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '../../lib/supabase'
import { formatAuthError } from '../../lib/auth'

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
        error: formatAuthError(error)
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
    
    console.error('Login action error:', error)
    return {
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}


