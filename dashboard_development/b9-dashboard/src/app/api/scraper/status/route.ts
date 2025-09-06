import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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
    
    // Get last 24h activity stats
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Get recent subreddits discovered (last 24h)
    const { data: newSubreddits, error: subredditsError } = await supabase
      .from('subreddits')
      .select('name, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    // Get data quality metrics
    const { data: allSubreddits, error: qualityError } = await supabase
      .from('subreddits')
      .select('name, description, subscriber_engagement_ratio, total_posts_last_30')
      .limit(1000)

    // Calculate data quality metrics
    const totalRecords = allSubreddits?.length || 0
    const completeRecords = allSubreddits?.filter((s: SubredditQualityData) => 
      s.description && 
      s.subscriber_engagement_ratio !== null && 
      s.total_posts_last_30 !== null
    ).length || 0
    const missingFields = totalRecords - completeRecords
    const qualityScore = totalRecords > 0 ? (completeRecords / totalRecords) * 100 : 0

    // Get scraper logs from Supabase (we'll create this table)
    const { data: logs, error: logsError } = await supabase
      .from('scraper_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20)

    // If scraper_logs table doesn't exist, we'll return empty logs
    const scraperLogs = logsError ? [] : (logs || [])

    // Mock some system health data (this would come from actual monitoring)
    const systemHealth = {
      database: qualityError ? 'error' : 'healthy',
      scraper: 'running', // This would be determined by checking last activity
      reddit_api: 'healthy',
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

    return NextResponse.json({
      discovery: {
        subreddits_found_24h: newSubreddits?.length || 0,
        new_subreddits: newSubreddits || [],
        processing_speed: Math.round((newSubreddits?.length || 0) / 24) // per hour
      },
      data_quality: {
        total_records: totalRecords,
        complete_records: completeRecords,
        missing_fields: missingFields,
        quality_score: Math.round(qualityScore),
        error_rate: scraperLogs.filter(log => log.level === 'error').length
      },
      system_health: systemHealth,
      recent_activity: recentActivity,
      error_feed: errorFeed,
      last_updated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching scraper status:', error)
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