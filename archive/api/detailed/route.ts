
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface HealthCheckResult {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  details?: any
  error?: string
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    if (!supabase) {
      return {
        name: 'database',
        status: 'unhealthy',
        error: 'Supabase client unavailable'
      }
    }

    // Test with a simple query
    const { error, count } = await supabase
      .from('reddit_subreddits')
      .select('id', { count: 'exact', head: true })

    const responseTime = Date.now() - start

    if (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }

    return {
      name: 'database',
      status: 'healthy',
      responseTime,
      details: { subreddits_count: count }
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkRateLimit(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = createServiceClient()
    if (!supabase) {
      return {
        name: 'rate_limiting',
        status: 'degraded',
        error: 'Service client unavailable'
      }
    }

    // Check if rate limit table exists and is accessible
    const { error } = await supabase
      .from('api_rate_limits')
      .select('id')
      .limit(1)

    const responseTime = Date.now() - start

    if (error) {
      logger.error('Rate limit check error:', error)
      return {
        name: 'rate_limiting',
        status: 'degraded',
        responseTime,
        error: 'Rate limiting may not be working'
      }
    }

    return {
      name: 'rate_limiting',
      status: 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      name: 'rate_limiting',
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkRedditData(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    if (!supabase) {
      return {
        name: 'reddit_data',
        status: 'unhealthy',
        error: 'Supabase client unavailable'
      }
    }

    // Get latest post date to check if data is fresh
    const { data: latestPost, error: postError } = await supabase
      .from('reddit_posts')
      .select('created_utc')
      .order('created_utc', { ascending: false })
      .limit(1)
      .single()

    // Get scraper stats
    const { count: totalSubreddits } = await supabase
      .from('reddit_subreddits')
      .select('id', { count: 'exact', head: true })

    const { count: reviewedSubreddits } = await supabase
      .from('reddit_subreddits')
      .select('id', { count: 'exact', head: true })
      .not('review', 'is', null)

    const responseTime = Date.now() - start

    // Check data freshness
    const now = new Date()
    const lastPostDate = latestPost?.created_utc ? new Date(latestPost.created_utc) : null
    const hoursSinceLastPost = lastPostDate
      ? (now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60)
      : Infinity

    const status = hoursSinceLastPost < 24 ? 'healthy'
      : hoursSinceLastPost < 72 ? 'degraded'
      : 'unhealthy'

    return {
      name: 'reddit_data',
      status,
      responseTime,
      details: {
        total_subreddits: totalSubreddits,
        reviewed_subreddits: reviewedSubreddits,
        last_post_hours_ago: Math.round(hoursSinceLastPost),
        data_freshness: status === 'healthy' ? 'recent'
          : status === 'degraded' ? 'stale'
          : 'very_stale'
      }
    }
  } catch (error) {
    return {
      name: 'reddit_data',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkInstagramData(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    if (!supabase) {
      return {
        name: 'instagram_data',
        status: 'unhealthy',
        error: 'Supabase client unavailable'
      }
    }

    const { count: totalCreators } = await supabase
      .from('instagram_creators')
      .select('id', { count: 'exact', head: true })

    const { count: reviewedCreators } = await supabase
      .from('instagram_creators')
      .select('id', { count: 'exact', head: true })
      .not('review_status', 'is', null)

    const responseTime = Date.now() - start

    return {
      name: 'instagram_data',
      status: 'healthy',
      responseTime,
      details: {
        total_creators: totalCreators,
        reviewed_creators: reviewedCreators
      }
    }
  } catch (error) {
    return {
      name: 'instagram_data',
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Detailed health check endpoint
export const GET = async (_request: NextRequest) => {
  const startTime = Date.now()

  // Run all health checks in parallel
  const [database, rateLimit, redditData, instagramData] = await Promise.all([
    checkDatabase(),
    checkRateLimit(),
    checkRedditData(),
    checkInstagramData()
  ])

  const checks = [database, rateLimit, redditData, instagramData]

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy')
  const hasDegraded = checks.some(c => c.status === 'degraded')

  const overallStatus = hasUnhealthy ? 'unhealthy'
    : hasDegraded ? 'degraded'
    : 'healthy'

  const statusCode = overallStatus === 'healthy' ? 200
    : overallStatus === 'degraded' ? 200
    : 503

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    totalResponseTime: Date.now() - startTime,
    checks,
    environment: {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION
    }
  }, { status: statusCode })
}