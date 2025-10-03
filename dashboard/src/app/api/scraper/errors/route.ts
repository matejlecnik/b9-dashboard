import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed'
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
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch error logs'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      errors: errors || [],
      count: errors?.length || 0
    })

  } catch {
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed'
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
      return NextResponse.json({
        success: false,
        message: 'Failed to clear error logs'
      }, { status: 500 })
    }

    // Log the clear operation
    const { error: logError } = await supabase
      .from('scraper_logs')
      .insert([{
        level: 'info',
        message: 'Error logs cleared via dashboard',
        source: 'dashboard',
        context: {
          operation: 'clear_errors',
          timestamp: new Date().toISOString(),
          user_initiated: true,
          cutoff_time: cutoffTime
        }
      }])

    if (logError) {
    }

    return NextResponse.json({
      success: true,
      message: 'Error logs cleared successfully',
      cleared_count: data?.length || 0
    })

  } catch {
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}