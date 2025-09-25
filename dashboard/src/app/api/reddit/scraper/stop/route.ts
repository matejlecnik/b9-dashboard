import { logger } from '@/lib/logger'
import { scraperApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const POST = scraperApi(async () => {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        title: 'Database connection failed'
      }, { status: 503 })
    }

    // Update scraper accounts to inactive status (except banned ones)
    const { error: updateError } = await supabase
      .from('scraper_accounts')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('is_enabled', true)
      .neq('status', 'banned')

    if (updateError) {
      logger.error('Error updating scraper accounts:', updateError)
      return NextResponse.json({
        success: false,
        title: 'Failed to update account status'
      }, { status: 500 })
    }

    // Log the stop operation
    const { error: logError } = await supabase
      .from('scraper_logs')
      .insert([{
        level: 'info',
        title: 'Scraper stopped via dashboard',
        source: 'dashboard',
        context: {
          operation: 'stop',
          timestamp: new Date().toISOString(),
          user_initiated: true,
          reason: 'Manual stop'
        }
      }])

    if (logError) {
      logger.error('Error logging stop operation:', logError)
    }

    // In a real implementation, you would also:
    // 1. Send stop signal to actual Python scraper service
    // 2. Gracefully terminate background processes
    // 3. Clean up active connections
    
    return NextResponse.json({
      success: true,
      title: 'Scraper stopped successfully',
      status: 'stopped',
      active_accounts: 0
    })

  } catch (error) {
    logger.error('Error stopping scraper:', error)
    return NextResponse.json({
      success: false,
      title: 'Internal server error'
    }, { status: 500 })
  }
})