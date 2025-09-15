import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Get the backend API URL from environment variable or use localhost for development
    const API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000'

    console.log('Starting scraper via backend API:', API_URL)

    // Call the backend Python API to start the scraper
    const response = await fetch(`${API_URL}/api/scraper/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to start scraper' }))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status} error`)
    }

    const data = await response.json()

    console.log('Scraper started successfully:', data)

    return NextResponse.json({
      success: true,
      message: data.message || 'Scraper started successfully',
      status: data.status || 'running',
      details: data.details || {}
    })

  } catch (error) {
    console.error('Error starting scraper:', error)

    // Check if it's a network error (API not reachable)
    if (error instanceof Error && (error.message.includes('fetch') || error.name === 'AbortError')) {
      return NextResponse.json({
        success: false,
        message: 'Cannot connect to scraper service. Please ensure the API is running on localhost:8000.',
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