import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action')
    const success = searchParams.get('success')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    let query = supabase
      .from('instagram_scraper_realtime_logs')
      .select('*', { count: 'exact' })
      .eq('source', 'instagram_scraper')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (action) {
      query = query.ilike('message', `%${action}%`)
    }

    if (success !== null) {
      if (success === 'true') {
        query = query.eq('level', 'success')
      } else {
        query = query.eq('level', 'error')
      }
    }

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }

    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('instagram_scraper_realtime_logs')
      .select('level, context')
      .eq('source', 'instagram_scraper')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const summary = {
      total_logs: count || 0,
      actions: {} as Record<string, number>,
      success_count: 0,
      error_count: 0
    }

    if (summaryData) {
      summaryData.forEach(log => {
        const action = (log.context as any)?.action || 'unknown'
        summary.actions[action] = (summary.actions[action] || 0) + 1
        if (log.level === 'success' || log.level === 'info') {
          summary.success_count++
        } else if (log.level === 'error') {
          summary.error_count++
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      summary
    })

  } catch (error) {
    console.error('Error fetching Instagram scraper logs:', error)

    return NextResponse.json(
      { error: 'Failed to fetch Instagram scraper logs' },
      { status: 500 }
    )
  }
}