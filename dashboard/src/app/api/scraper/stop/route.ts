import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Always use production API on Render
    const API_URL = 'https://b9-dashboard.onrender.com'

    console.log('Stopping scraper via backend API:', API_URL)

    // Call the backend Python API to stop the scraper
    const response = await fetch(`${API_URL}/api/scraper/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to stop scraper' }))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status} error`)
    }

    const data = await response.json()

    console.log('Scraper stopped successfully:', data)

    return NextResponse.json({
      success: true,
      message: data.message || 'Scraper stopped successfully',
      status: data.status || 'stopped',
      details: data.details || {}
    })

  } catch (error) {
    console.error('Error stopping scraper:', error)

    // Check if it's a network error (API not reachable)
    if (error instanceof Error && (error.message.includes('fetch') || error.name === 'AbortError')) {
      return NextResponse.json({
        success: false,
        message: 'Cannot connect to scraper service on Render. The API might be starting up, please try again.',
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