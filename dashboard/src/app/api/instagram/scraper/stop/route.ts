import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update scraper status in database
    const { data: existingControl } = await supabase
      .from('instagram_scraper_control')
      .select('id')
      .single()

    const updateData = {
      status: 'stopped',
      next_run_at: null
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

    // Log the stop action
    await supabase
      .from('instagram_scraper_logs')
      .insert([{
        script_name: 'unified_scraper',
        action: 'manual_stop',
        success: true,
        details: { triggered_by: 'dashboard' }
      }])

    // Note: Actual stopping of the running process would be handled by
    // checking the status in the scraper script itself or via Render API

    return NextResponse.json({
      success: true,
      message: 'Instagram scraper stop signal sent'
    })

  } catch (error) {
    console.error('Error stopping Instagram scraper:', error)

    return NextResponse.json(
      { error: 'Failed to stop Instagram scraper' },
      { status: 500 }
    )
  }
}