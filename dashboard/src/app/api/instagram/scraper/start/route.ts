
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'
import { scraperApi } from '@/lib/api-wrapper'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const POST = scraperApi(async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update scraper status in database
    const { data: existingControl } = await supabase
      .from('instagram_scraper_control')
      .select('id')
      .single()

    const updateData = {
      status: 'running',
      last_run_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
    }

    if (existingControl) {
      await supabase
        .from('instagram_scraper_control')
        .update(updateData)
        .eq('id', existingControl.id)
    } else {
      await supabase
        .from('instagram_scraper_control')
        .insert([updateData])
    }

    // Note: Scraper job triggering is handled by external infrastructure

    // Log the start action
    await supabase
      .from('instagram_scraper_logs')
      .insert([{
        script_name: 'unified_scraper',
        action: 'manual_start',
        success: true,
        details: { triggered_by: 'dashboard' }
      }])

    return NextResponse.json({
      success: true,
      title: 'Instagram scraper started successfully'
    })

  } catch (error) {
    logger.error('Error starting Instagram scraper:', error)

    return NextResponse.json(
      { error: 'Failed to start Instagram scraper' },
      { status: 500 }
    )
  }
})