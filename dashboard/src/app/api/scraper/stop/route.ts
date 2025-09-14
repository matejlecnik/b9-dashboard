import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Call the Python API on Render to stop the scraper
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'

    console.log('Stopping scraper via API:', `${apiUrl}/api/scraper/stop`)

    const response = await fetch(`${apiUrl}/api/scraper/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const responseText = await response.text()
    console.log('API Response:', response.status, responseText)

    if (!response.ok) {
      console.error('Failed to stop scraper:', responseText)

      // If it's a supervisor-related error, return a helpful message
      if (responseText.includes('supervisor') || responseText.includes('ImportError')) {
        return NextResponse.json({
          success: false,
          message: 'Scraper service not available. The service may not be deployed yet.',
          error: 'Supervisor not configured'
        }, { status: 503 })
      }

      return NextResponse.json({
        success: false,
        message: 'Failed to stop scraper',
        error: responseText
      }, { status: response.status })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { message: responseText }
    }

    console.log('Scraper stopped successfully:', data)

    return NextResponse.json({
      success: true,
      message: 'Scraper stopped',
      status: 'stopped',
      ...data
    })

  } catch (error) {
    console.error('Error stopping scraper:', error)

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
      message: 'Failed to stop scraper',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}