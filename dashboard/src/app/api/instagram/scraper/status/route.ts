
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'
import { scraperApi } from '@/lib/api-wrapper'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const GET = scraperApi(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get scraper control status
    const { data: control, error: controlError } = await supabase
      .from('instagram_scraper_control')
      .select('*')
      .single()

    if (controlError && controlError.code !== 'PGRST116') {
      throw controlError
    }

    // Get today's statistics from realtime logs
    const today = new Date().toISOString().split('T')[0]
    const { data: todayLogs } = await supabase
      .from('instagram_scraper_realtime_logs')
      .select('context')
      .gte('timestamp', `${today}T00:00:00Z`)
      .eq('source', 'instagram_scraper')

    // Calculate today's stats from context data
    const todayStats = todayLogs || []
    const apiCallsToday = todayStats.reduce((sum, log) => {
      const context = log.context as { api_calls_made?: number }
      return sum + (context?.api_calls_made || 0)
    }, 0)

    const creatorsProcessedToday = new Set(
      todayStats
        .filter(l => l.context && (l.context as { creator_id?: string }).creator_id)
        .map(l => (l.context as { creator_id?: string }).creator_id)
    ).size

    // Default status if no control record exists
    const status = control || {
      status: 'stopped',
      last_run_at: null,
      next_run_at: null,
      total_creators_processed: 0,
      total_api_calls_today: 0,
      config: {
        batch_size: 100,
        update_frequency: 21600,
        max_daily_calls: 24000,
        max_monthly_calls: 1000000,
        viral_detection: true,
        analytics_enabled: true,
        cost_tracking: true
      }
    }

    // Add calculated stats
    status.total_api_calls_today = apiCallsToday
    status.total_creators_processed = creatorsProcessedToday

    return NextResponse.json({
      success: true,
      data: status
    })

  } catch (error) {
    logger.error('Error fetching Instagram scraper status:', error)

    return NextResponse.json(
      { error: 'Failed to fetch Instagram scraper status' },
      { status: 500 }
    )
  }
})