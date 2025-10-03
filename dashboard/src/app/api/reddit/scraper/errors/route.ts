import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { scraperApi } from '@/lib/api-wrapper'
import { createClient } from '@/lib/supabase'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const GET = scraperApi(async () => {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        title: 'Database connection failed'
      }, { status: 503 })
    }

    // Get recent error logs
    const { data: errors, error } = await supabase
      .from('scraper_logs')
      .select('timestamp, message, context, level')
      .eq('level', 'error')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      logger.error('Error fetching error logs:', error)
      return NextResponse.json({
        success: false,
        title: 'Failed to fetch error logs'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      errors: errors || [],
      count: errors?.length || 0
    })

  } catch (error) {
    logger.error('Error in GET /api/reddit/scraper/errors:', error)
    return NextResponse.json({
      success: false,
      title: 'Internal server error'
    }, { status: 500 })
  }
})

export const DELETE = scraperApi(async () => {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        title: 'Database connection failed'
      }, { status: 503 })
    }

    // Delete error logs older than 24 hours or all of them
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error: deleteError } = await supabase
      .from('scraper_logs')
      .delete()
      .eq('level', 'error')
      .lt('timestamp', cutoffTime)

    if (deleteError) {
      logger.error('Error clearing error logs:', deleteError)
      return NextResponse.json({
        success: false,
        title: 'Failed to clear error logs'
      }, { status: 500 })
    }

    // Log the clear operation
    const { error: logError } = await supabase
      .from('scraper_logs')
      .insert([{
        level: 'info',
        title: 'Error logs cleared via dashboard',
        source: 'dashboard',
        context: {
          operation: 'clear(error)s',
          timestamp: new Date().toISOString(),
          user_initiated: true,
          cutoff_time: cutoffTime
        }
      }])

    if (logError) {
      logger.error('Error logging clear operation:', logError)
    }

    return NextResponse.json({
      success: true,
      title: 'Error logs cleared successfully',
      cleared_count: data?.length || 0
    })

  } catch (error) {
    logger.error('Error clearing scraper errors:', error)
    return NextResponse.json({
      success: false,
      title: 'Internal server error'
    }, { status: 500 })
  }
})