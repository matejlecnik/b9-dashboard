import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

export async function GET() {
  try {
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing Supabase environment variables',
        env_check: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, { status: 500 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection not available'
      }, { status: 503 })
    }
    
    // Test database connection by trying to fetch subreddits count
    const { error, count } = await supabase
      .from('reddit_subreddits')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Dashboard API is working',
      supabase_connection: 'connected',
      subreddits_count: count ?? 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
