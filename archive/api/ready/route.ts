
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

// Readiness probe - checks if the app is ready to serve traffic
// Used by load balancers to determine if the instance should receive traffic
export const GET = async (_request: NextRequest) => {
  try {
    // Check if essential environment variables are set
    const hasEnvVars = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    if (!hasEnvVars) {
      return NextResponse.json({
        status: 'not_ready',
        reason: 'Missing environment variables',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Quick database connectivity check
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({
        status: 'not_ready',
        reason: 'Database client unavailable',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // Try a simple query with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    )

    const queryPromise = supabase
      .from('reddit_subreddits')
      .select('id')
      .limit(1)

    try {
      await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      return NextResponse.json({
        status: 'not_ready',
        reason: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // All checks passed - app is ready
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      status: 'not_ready',
      reason: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}