import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get total approved creators
    const { count: totalCreators } = await supabase
      .from('instagram_creators')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'ok')

    // Get today's stats from realtime logs
    const today = new Date().toISOString().split('T')[0]
    const { data: todayLogs } = await supabase
      .from('instagram_scraper_realtime_logs')
      .select('context')
      .gte('timestamp', `${today}T00:00:00Z`)
      .eq('source', 'instagram_scraper')

    // Get this month's stats
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)
    const { data: monthLogs } = await supabase
      .from('instagram_scraper_realtime_logs')
      .select('context')
      .gte('timestamp', firstOfMonth.toISOString())
      .eq('source', 'instagram_scraper')

    // Get last 7 days stats for trend
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: weekLogs } = await supabase
      .from('instagram_scraper_realtime_logs')
      .select('context')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .eq('source', 'instagram_scraper')

    // Helper function to extract metrics from context
    const extractMetrics = (logs: any[]) => {
      const creators = new Set<string>()
      let apiCalls = 0
      let itemsFetched = 0
      let itemsSaved = 0
      let successCount = 0
      let errorCount = 0

      logs?.forEach(log => {
        const ctx = log.context as any
        if (ctx) {
          if (ctx.creator_id) creators.add(ctx.creator_id)
          apiCalls += ctx.api_calls_made || 0
          itemsFetched += ctx.items_fetched || 0
          itemsSaved += ctx.items_saved || 0
          if (ctx.success === true) successCount++
          if (ctx.success === false || ctx.error_message) errorCount++
        }
      })

      return {
        creatorsProcessed: creators.size,
        apiCalls,
        itemsFetched,
        itemsSaved,
        successCount,
        errorCount,
        totalLogs: logs?.length || 0
      }
    }

    // Calculate metrics for each period
    const todayMetrics = extractMetrics(todayLogs || [])
    const monthMetrics = extractMetrics(monthLogs || [])
    const weekMetrics = extractMetrics(weekLogs || [])

    // Cost calculations - $75 for 250k calls
    const costPerCall = 75 / 250000
    const costToday = todayMetrics.apiCalls * costPerCall
    const costMonth = monthMetrics.apiCalls * costPerCall
    const costWeek = weekMetrics.apiCalls * costPerCall

    const successRate = todayMetrics.totalLogs > 0
      ? (todayMetrics.successCount / todayMetrics.totalLogs) * 100
      : 100

    const avgCallsPerCreator = todayMetrics.creatorsProcessed > 0
      ? todayMetrics.apiCalls / todayMetrics.creatorsProcessed
      : 2.4

    const metrics = {
      creators: {
        total: totalCreators || 0,
        processed_today: todayMetrics.creatorsProcessed,
        processed_week: weekMetrics.creatorsProcessed
      },
      api_usage: {
        calls_today: todayMetrics.apiCalls,
        calls_week: weekMetrics.apiCalls,
        calls_month: monthMetrics.apiCalls,
        avg_per_creator: avgCallsPerCreator,
        limit_daily: 24000,
        limit_monthly: 1000000,
        usage_daily_percent: (todayMetrics.apiCalls / 24000) * 100,
        usage_monthly_percent: (monthMetrics.apiCalls / 1000000) * 100
      },
      costs: {
        today: costToday,
        week: costWeek,
        month: costMonth,
        per_creator: todayMetrics.creatorsProcessed > 0 ? costToday / todayMetrics.creatorsProcessed : 0
      },
      content: {
        fetched_today: todayMetrics.itemsFetched,
        saved_today: todayMetrics.itemsSaved,
        fetched_month: monthMetrics.itemsFetched,
        saved_month: monthMetrics.itemsSaved,
        save_rate: todayMetrics.itemsFetched > 0 ? (todayMetrics.itemsSaved / todayMetrics.itemsFetched) * 100 : 100
      },
      performance: {
        success_rate: successRate,
        errors_today: todayMetrics.errorCount,
        errors_month: monthMetrics.errorCount
      }
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error fetching Instagram scraper metrics:', error)

    return NextResponse.json(
      { error: 'Failed to fetch Instagram scraper metrics' },
      { status: 500 }
    )
  }
}