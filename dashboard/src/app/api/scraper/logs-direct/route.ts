import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '200')
    const level = searchParams.get('level') || null
    const search = searchParams.get('search') || null
    const since = searchParams.get('since') || null // ISO timestamp for real-time updates

    // Build query
    let query = supabase
      .from('reddit_scraper_logs')
      .select('id, timestamp, level, message, context, source')
      .order('timestamp', { ascending: false })
      .limit(limit)

    // Add filters
    if (level && level !== 'all') {
      query = query.eq('level', level)
    }

    if (search) {
      query = query.ilike('message', `%${search}%`)
    }

    // For real-time updates, only fetch logs newer than the provided timestamp
    if (since) {
      query = query.gt('timestamp', since)
      query = query.order('timestamp', { ascending: true }) // Return oldest first for appending
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to fetch logs: ${error.message}`)
    }

    // Transform logs for the frontend
    const transformedLogs = (logs || []).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level || 'info',
      message: formatLogMessage(log.message, log.context),
      source: log.source || 'scraper',
      context: log.context
    }))

    // If fetching updates (since parameter), reverse to maintain chronological order
    if (since) {
      transformedLogs.reverse()
    }

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      count: transformedLogs.length,
      hasMore: transformedLogs.length === limit
    })

  } catch (error) {
    console.error('Error fetching logs from Supabase:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logs',
      logs: []
    }, { status: 500 })
  }
}

// Helper function to format log messages with context
function formatLogMessage(message: string, context: any): string {
  if (!context) return message

  let formatted = message

  // Add subreddit context
  if (context.subreddit) {
    formatted = `[r/${context.subreddit}] ${formatted}`
  }

  // Add operation context
  if (context.operation) {
    formatted = `[${context.operation}] ${formatted}`
  }

  // Add performance metrics
  if (context.processing_time_ms) {
    formatted += ` (${context.processing_time_ms}ms)`
  }

  // Add data counts
  if (context.posts_collected) {
    formatted += ` - ${context.posts_collected} posts`
  }

  if (context.users_discovered) {
    formatted += ` - ${context.users_discovered} users`
  }

  return formatted
}

// Get log statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action || 'stats'

    if (action === 'stats') {

      // Get log statistics
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Count logs by level
      const { data: levelCounts } = await supabase
        .from('reddit_scraper_logs')
        .select('level', { count: 'exact', head: true })
        .gte('timestamp', oneDayAgo.toISOString())

      // Get recent activity stats
      const { count: totalLogs } = await supabase
        .from('reddit_scraper_logs')
        .select('*', { count: 'exact', head: true })

      const { count: lastHourLogs } = await supabase
        .from('reddit_scraper_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneHourAgo.toISOString())

      const { count: lastDayLogs } = await supabase
        .from('reddit_scraper_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneDayAgo.toISOString())

      return NextResponse.json({
        success: true,
        stats: {
          total: totalLogs || 0,
          lastHour: lastHourLogs || 0,
          lastDay: lastDayLogs || 0,
          levelCounts: levelCounts || {}
        }
      })
    }

    if (action === 'clear') {
      // Clear old logs (keep last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { error } = await supabase
        .from('reddit_scraper_logs')
        .delete()
        .lt('timestamp', sevenDaysAgo.toISOString())

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Old logs cleared successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error processing log action:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process action'
    }, { status: 500 })
  }
}