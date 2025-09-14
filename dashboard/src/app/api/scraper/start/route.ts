import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Call the Python API on Render to start the scraper
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'

    console.log('Starting scraper via API:', `${apiUrl}/api/scraper/start`)

    const response = await fetch(`${apiUrl}/api/scraper/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const responseText = await response.text()
    console.log('API Response:', response.status, responseText)

    if (!response.ok) {
      console.error('Failed to start scraper:', responseText)

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
        message: 'Failed to start scraper',
        error: responseText
      }, { status: response.status })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { message: responseText }
    }

    console.log('Scraper started successfully:', data)

    return NextResponse.json({
      success: true,
      message: 'Scraper started for 24/7 operation',
      status: 'running',
      ...data
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