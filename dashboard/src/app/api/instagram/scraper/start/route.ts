
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'
import { scraperApi } from '@/lib/api-wrapper'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const renderApiKey = process.env.RENDER_API_KEY

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

    // If we have Render API key, trigger the job
    if (renderApiKey) {
      try {
        const renderServiceId = process.env.RENDER_INSTAGRAM_SERVICE_ID
        if (renderServiceId) {
          const response = await fetch(`https://api.render.com/v1/services/${renderServiceId}/jobs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${renderApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              startCommand: 'python unified_scraper.py'
            })
          })

          if (!response.ok) {
            logger.error('Failed to trigger Render job:', await response.text())
          }
        }
      } catch (renderError) {
        logger.error('Render API error:', renderError)
        // Continue even if Render trigger fails
      }
    }

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