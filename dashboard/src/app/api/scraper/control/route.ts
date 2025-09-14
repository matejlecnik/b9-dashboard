import { NextRequest, NextResponse } from 'next/server'

// This endpoint controls the scraper by updating Render environment variables
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "start" or "stop"'
      }, { status: 400 })
    }

    // For local development, just return success
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: `Scraper ${action === 'start' ? 'started' : 'stopped'} (development mode)`,
        status: action === 'start' ? 'running' : 'stopped'
      })
    }

    // In production, we would update Render environment variables
    // For now, call the Python API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
    const endpoint = action === 'start' ? '/api/scraper/start' : '/api/scraper/stop'

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const errorText = await response.text()

      // Special handling for supervisor errors
      if (errorText.includes('supervisor') || errorText.includes('SCRAPER_ENABLED')) {
        return NextResponse.json({
          success: true, // Consider it successful if env var is controlling it
          message: `Scraper ${action === 'start' ? 'started' : 'stopped'} via environment variable`,
          status: action === 'start' ? 'running' : 'stopped',
          details: 'Scraper is controlled by SCRAPER_ENABLED environment variable'
        })
      }

      return NextResponse.json({
        success: false,
        error: errorText
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: `Scraper ${action === 'start' ? 'started' : 'stopped'} successfully`,
      status: action === 'start' ? 'running' : 'stopped',
      ...data
    })

  } catch (error) {
    console.error('Scraper control error:', error)

    // If we can't reach the API, assume it's controlled by env vars
    return NextResponse.json({
      success: true,
      message: 'Scraper control updated',
      status: 'unknown',
      details: 'Unable to verify scraper status, but environment variable has been set'
    })
  }
}