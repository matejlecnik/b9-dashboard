import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/index'
import type { User } from '@supabase/supabase-js'

/**
 * API Authentication Middleware
 * Validates Supabase session tokens for API routes
 */

export interface AuthenticatedRequest extends NextRequest {
  user?: User
}

/**
 * Verify API authentication
 * Returns user if authenticated, null if not
 */
export async function verifyApiAuth(request: NextRequest): Promise<User | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')

    // Also check for session token in cookies (for browser requests)
    const supabase = await createClient()

    if (!supabase) {
      logger.error('❌ [API Auth] Supabase client not available')
      return null
    }

    // Try to get user from current session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // If no session from cookies, check Bearer token
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)

        // Verify the JWT token
        const { data: { user: tokenUser }, error: tokenError } =
          await supabase.auth.getUser(token)

        if (tokenError || !tokenUser) {
          logger.log('❌ [API Auth] Invalid Bearer token')
          return null
        }

        return tokenUser
      }

      logger.log('❌ [API Auth] No valid authentication found')
      return null
    }

    return user
  } catch (error) {
    logger.error('❌ [API Auth] Error verifying authentication:', error)
    return null
  }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Authentication required') {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED'
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="api"'
      }
    }
  )
}

/**
 * Check if route should bypass authentication
 * Add public routes here that don't require auth
 */
export function isPublicApiRoute(pathname: string): boolean {
  const publicRoutes = [
    '/api/health',
    // Add other public routes here
  ]

  return publicRoutes.some(route => pathname.startsWith(route))
}

/**
 * Higher-order function to wrap API routes with authentication
 * Usage: export const GET = withAuth(async (req, user) => {...})
 */
export function withAuth<T extends any[], R>(
  handler: (request: NextRequest, user: User, ...args: T) => Promise<R>
) {
  return async (request: NextRequest, ...args: T): Promise<R | NextResponse> => {
    // Check if this is a public route
    if (isPublicApiRoute(request.nextUrl.pathname)) {
      // For TypeScript, we need to handle the case where user might be null
      // Public routes can create a dummy user or handle null case
      const dummyUser = { id: 'public', email: 'public@api' } as User
      return handler(request, dummyUser, ...args)
    }

    // Verify authentication
    const user = await verifyApiAuth(request)

    if (!user) {
      return unauthorizedResponse() as R
    }

    // Call the actual handler with authenticated user
    return handler(request, user, ...args)
  }
}

/**
 * Middleware to check authentication without wrapping
 * Useful for routes that need custom handling
 */
export async function requireAuth(request: NextRequest): Promise<User | NextResponse> {
  const user = await verifyApiAuth(request)

  if (!user) {
    return unauthorizedResponse()
  }

  return user
}