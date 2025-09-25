import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
/**
 * Rate Limiting Configuration using Supabase
 * Uses Supabase database for distributed rate limiting
 */

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  default: {
    requests: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100'),
    window: '1 m',
  },
  ai: {
    requests: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10'),
    window: '1 m',
  },
  auth: {
    requests: 5, // Strict limit for auth endpoints
    window: '1 m',
  },
  scraper: {
    requests: 30,
    window: '1 m',
  },
}

/**
 * Get identifier for rate limiting (IP-based or user-based)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'anonymous'

  return ip
}

/**
 * Check rate limit for a request using Supabase
 */
export async function checkRateLimit(
  request: NextRequest,
  config: keyof typeof rateLimitConfigs = 'default'
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  const identifier = getIdentifier(request)
  const { requests } = rateLimitConfigs[config]

  try {
    // Get Supabase client with service role for rate limiting (bypasses RLS)
    const supabase = createServiceClient()

    if (!supabase) {
      logger.error('❌ [Rate Limit] Supabase service client not available')
      // On error, allow the request but log it
      return {
        success: true,
        limit: requests,
        remaining: requests,
        reset: new Date(Date.now() + 60000)
      }
    }

    // Call the check_rate_limit function
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: config,
        p_limit: requests,
        p_window_minutes: 1
      })

    if (error) {
      logger.error('❌ [Rate Limit] Error checking rate limit:', error)
      // On error, allow the request but log it
      return {
        success: true,
        limit: requests,
        remaining: requests,
        reset: new Date(Date.now() + 60000)
      }
    }

    type RateLimitRow = {
      allowed: boolean
      limit_count: number
      current_count: number
      window_end_time: string
    }
    const result = (data as RateLimitRow[] | null | undefined)?.[0]
    if (!result) {
      logger.error('❌ [Rate Limit] No result from rate limit check')
      return {
        success: true,
        limit: requests,
        remaining: requests,
        reset: new Date(Date.now() + 60000)
      }
    }

    return {
      success: result.allowed,
      limit: result.limit_count,
      remaining: Math.max(0, result.limit_count - result.current_count),
      reset: new Date(result.window_end_time),
    }
  } catch (error) {
    logger.error('❌ [Rate Limit] Unexpected error:', error)
    // On error, allow the request but log it
    return {
      success: true,
      limit: requests,
      remaining: requests,
      reset: new Date(Date.now() + 60000)
    }
  }
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(
  limit: number,
  remaining: number,
  reset: Date
) {
  return NextResponse.json(
    {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      limit,
      remaining,
      reset: reset.toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toISOString(),
        'Retry-After': Math.ceil((reset.getTime() - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Rate limiting middleware
 */
export async function withRateLimit(
  request: NextRequest,
  config: keyof typeof rateLimitConfigs = 'default'
): Promise<NextResponse | null> {
  const { success, limit, remaining, reset } = await checkRateLimit(request, config)

  if (!success) {
    return rateLimitExceededResponse(limit, remaining, reset)
  }

  // Add rate limit headers to response
  request.headers.set('X-RateLimit-Limit', limit.toString())
  request.headers.set('X-RateLimit-Remaining', remaining.toString())
  request.headers.set('X-RateLimit-Reset', reset.toISOString())

  return null // Continue processing
}