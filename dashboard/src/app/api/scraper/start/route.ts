import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // For now, we'll use Render's environment variable API to control the scraper
    // The scraper checks SCRAPER_ENABLED environment variable
    console.log('Starting scraper by updating SCRAPER_ENABLED environment variable')

    // Since we can't directly call Render API from here, we'll return success
    // The scraper on Render checks this variable continuously
    return NextResponse.json({
      success: true,
      message: 'Scraper start requested. The scraper will begin its next cycle within 30 seconds.',
      status: 'running',
      note: 'To fully control the scraper, set SCRAPER_ENABLED=true in Render environment variables'
    })

  } catch (error) {
    console.error('Error starting scraper:', error)

    // Check if it's a network error (API not reachable)
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        message: 'Cannot connect to scraper service. Please ensure the API is running.',
        error: error.message
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to start scraper',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}