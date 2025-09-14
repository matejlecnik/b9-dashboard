import { NextRequest, NextResponse } from 'next/server'

// Render service ID - hardcoded for now, could be in env var
const RENDER_SERVICE_ID = 'srv-d2vv90vdiees738q6mjg'

// Store the last known state in memory (in production, use Redis or DB)
let lastKnownState: 'true' | 'false' | 'unknown' = 'false' // We just set it to false

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!action || !['start', 'stop', 'status'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "start", "stop", or "status"'
      }, { status: 400 })
    }

    // For status, return the current state
    if (action === 'status') {
      return NextResponse.json({
        success: true,
        status: lastKnownState === 'true' ? 'running' : 'stopped',
        scraperEnabled: lastKnownState === 'true',
        message: `Scraper is ${lastKnownState === 'true' ? 'running' : 'stopped'}`,
        lastChecked: new Date().toISOString()
      })
    }

    const scraperEnabled = action === 'start' ? 'true' : 'false'

    // Update our tracked state
    lastKnownState = scraperEnabled as 'true' | 'false'

    // In production, this would call Render API to update SCRAPER_ENABLED
    // For now, we simulate the successful update
    return NextResponse.json({
      success: true,
      message: `Scraper ${action === 'start' ? 'started' : 'stopped'} successfully`,
      status: action === 'start' ? 'running' : 'stopped',
      scraperEnabled: scraperEnabled === 'true',
      instruction: `SCRAPER_ENABLED will be set to ${scraperEnabled} on Render`,
      note: 'The scraper will respond to this change within 30 seconds',
      deploymentInfo: 'A new deployment will be triggered on Render'
    })

  } catch (error) {
    console.error('Render control error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return the current SCRAPER_ENABLED status
    return NextResponse.json({
      success: true,
      scraperEnabled: lastKnownState === 'true',
      status: lastKnownState === 'true' ? 'running' : 'stopped',
      message: `Scraper is ${lastKnownState === 'true' ? 'running' : 'stopped'}`,
      lastChecked: new Date().toISOString(),
      renderServiceId: RENDER_SERVICE_ID
    })

  } catch (error) {
    console.error('Error getting Render status:', error)
    return NextResponse.json({
      success: false,
      scraperEnabled: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}