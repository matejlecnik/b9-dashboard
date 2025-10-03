import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
// Removed zod schema to eliminate dependency

interface ScraperLog {
  timestamp: string
  message: string
  level: string
  context?: Record<string, unknown> | null
}

interface SubredditQualityData {
  name: string
  description: string | null
  subscriber_engagement_ratio: number | null
  total_posts_last_30: number | null
}

interface NewSubredditData {
  name: string
  created_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        discovery: { subreddits_found_24h: 0, new_subreddits: [], processing_speed: 0 },
        data_quality: { total_records: 0, complete_records: 0, missing_fields: 0, quality_score: 0, error_rate: 0 },
        system_health: { database: 'error', scraper: 'error', reddit_api: 'error', storage: 'error' },
        recent_activity: [],
        error_feed: [],
        last_updated: new Date().toISOString()
      }, { status: 503 })
    }
    
    // Get last 24h activity stats
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Get recent subreddits discovered (last 24h)
    const { data: newSubreddits } = await supabase
      .from('subreddits')
      .select('name, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    // Get data quality metrics efficiently with aggregated query
    const { data: qualityMetrics, error: qualityError } = await supabase
      .rpc('get_data_quality_metrics')

    // If stored procedure doesn't exist, fall back to counting approach
    let totalRecords = 0, completeRecords = 0, qualityScore = 0
    
    if (qualityError || !qualityMetrics) {
      // Fallback: use count queries instead of fetching all data
      const { count: totalCount } = await supabase
        .from('subreddits')
        .select('id', { count: 'exact', head: true })
      
      // More realistic quality check - records with basic info populated
      const { count: withDescription } = await supabase
        .from('subreddits')
        .select('id', { count: 'exact', head: true })
        .not('description', 'is', null)
      
      const { count: withSubscribers } = await supabase
        .from('subreddits')
        .select('id', { count: 'exact', head: true })
        .not('subscribers', 'is', null)
        .gt('subscribers', 0)
      
      totalRecords = totalCount || 0
      // Quality based on having either description or subscriber count
      completeRecords = Math.max(withDescription || 0, withSubscribers || 0)
      qualityScore = totalRecords > 0 ? Math.round((completeRecords / totalRecords) * 100) : 0
    } else {
      totalRecords = qualityMetrics.total_records || 0
      completeRecords = qualityMetrics.complete_records || 0
      qualityScore = qualityMetrics.quality_score || 0
    }
    
    const missingFields = totalRecords - completeRecords

    // Get scraper logs from Supabase - improved query with better error handling
    const { data: logs, error: logsError } = await supabase
      .from('scraper_logs')
      .select('timestamp, level, message, context, source')
      .gte('timestamp', yesterday.toISOString())
      .order('timestamp', { ascending: false })
      .limit(50)

    // Handle logs data properly
    const scraperLogs = logsError ? [] : (logs || [])

    // Get active account count for system health
    const { data: activeAccounts } = await supabase
      .from('scraper_accounts')
      .select('id')
      .eq('status', 'active')
      .eq('is_enabled', true)

    // Determine system health based on actual data
    const hasRecentActivity = scraperLogs.some((log: ScraperLog) => 
      new Date(log.timestamp) > new Date(now.getTime() - 10 * 60 * 1000) // last 10 minutes
    )
    
    // More accurate system health assessment
    const systemHealth = {
      database: totalRecords > 0 ? 'healthy' : 'warning', // Database is healthy if we have data
      scraper: (activeAccounts?.length || 0) > 0 && hasRecentActivity ? 'running' : 'stopped',
      reddit_api: scraperLogs.some((log: ScraperLog) => 
        log.message.includes('authentication failed') || log.message.includes('rate limit')
      ) ? 'warning' : 'healthy',
      storage: 'healthy'
    }

    // Get recent errors and activity
    const recentActivity = [
      ...scraperLogs.filter((log: ScraperLog) => log.level !== 'error').slice(0, 5).map((log: ScraperLog) => ({
        type: 'system',
        message: log.message,
        timestamp: log.timestamp,
        status: log.level === 'warn' ? 'warning' : 'success'
      })),
      ...(newSubreddits || []).slice(0, 5).map((sub: NewSubredditData) => ({
        type: 'discovery',
        message: `New subreddit discovered: r/${sub.name}`,
        timestamp: sub.created_at,
        status: 'success'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    const errorFeed = scraperLogs
      .filter((log: ScraperLog) => log.level === 'error')
      .map((log: ScraperLog) => ({
        timestamp: log.timestamp,
        message: log.message,
        context: log.context || {},
        level: 'error'
      }))

    const response = {
      discovery: {
        subreddits_found_24h: newSubreddits?.length || 0,
        new_subreddits: newSubreddits || [],
        processing_speed: Math.round((newSubreddits?.length || 0) / 24) // per hour
      },
      data_quality: {
        total_records: totalRecords,
        complete_records: completeRecords,
        missing_fields: missingFields,
        quality_score: qualityScore,
        error_rate: scraperLogs.filter((log: Record<string, unknown>) => log.level === 'error').length
      },
      system_health: systemHealth,
      recent_activity: recentActivity,
      error_feed: errorFeed,
      last_updated: new Date().toISOString()
    }

    // Removed zod validation - return response directly
    return NextResponse.json(response)
    
  } catch {
    return NextResponse.json({
      discovery: { subreddits_found_24h: 0, new_subreddits: [], processing_speed: 0 },
      data_quality: { total_records: 0, complete_records: 0, missing_fields: 0, quality_score: 0, error_rate: 0 },
      system_health: { database: 'error', scraper: 'error', reddit_api: 'error', storage: 'error' },
      recent_activity: [],
      error_feed: [],
      last_updated: new Date().toISOString()
    }, { status: 500 })
  }
}