
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase'
import { scraperApi } from '@/lib/api-wrapper'
import type { SupabaseClient } from '@supabase/supabase-js'

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

    // Update scraper accounts to active status
    const { error: updateError } = await supabase
      .from('scraper_accounts')
      .update({ 
        status: 'active',
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

    // Log the start operation
    const { error: logError } = await supabase
      .from('scraper_logs')
      .insert([{
        level: 'info',
        title: 'Scraper started via dashboard',
        source: 'dashboard',
        context: {
          operation: 'start',
          timestamp: new Date().toISOString(),
          user_initiated: true
        }
      }])

    if (logError) {
      logger.error('Error logging start operation:', logError)
    }

    // In a real implementation, you would also:
    // 1. Send signal to actual Python scraper service
    // 2. Start background processes
    // 3. Initialize proxy rotation
    
    return NextResponse.json({
      success: true,
      title: 'Scraper started successfully',
      status: 'running',
      active_accounts: await getActiveAccountCount(supabase)
    })

  } catch (error) {
    logger.error('Error starting scraper:', error)
    return NextResponse.json({
      success: false,
      title: 'Internal server error'
    }, { status: 500 })
  }
})

async function getActiveAccountCount(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('scraper_accounts')
    .select('id')
    .eq('status', 'active')
    .eq('is_enabled', true)
    .neq('status', 'banned')

  return data?.length || 0
}