import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface TagCategorizationRequest {
  batch_size?: number
  limit?: number
}

// Resolve the API URL at request time to avoid build-time inlining
function getRenderApiUrl(): string | undefined {
  return (
    process.env['NEXT_PUBLIC_API_URL'] ||
    process.env['RENDER_API_URL'] ||
    process.env['NEXT_PUBLIC_RENDER_API_URL'] ||
    undefined
  )
}

// POST /api/categorization/tags/start - Start AI tag categorization
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const RENDER_API_URL = getRenderApiUrl()
    if (!RENDER_API_URL) {
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured. Please set NEXT_PUBLIC_API_URL environment variable.',
        configuration_needed: true
      }, { status: 500 })
    }

    const body: TagCategorizationRequest = await request.json()
    const { batch_size = 30, limit = 100 } = body

    console.log('🎯 Starting tag categorization:', { batch_size, limit })

    // Call the Python backend API for tag categorization
    const apiUrl = `${RENDER_API_URL}/api/categorization/tags/start`
    console.log('📡 Calling Render API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch_size,
        limit
      }),
      signal: AbortSignal.timeout(300000), // 5 minute timeout for batch processing
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Render API error:', { status: response.status, error: errorText })

      // Try to parse as JSON for structured error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json({
          success: false,
          error: errorData.error || errorData.detail || 'Failed to start tag categorization',
          details: errorData
        }, { status: response.status })
      } catch {
        return NextResponse.json({
          success: false,
          error: `Backend service error: ${response.status} ${response.statusText}`,
          details: errorText
        }, { status: response.status })
      }
    }

    const result = await response.json()
    console.log('✅ Tag categorization response received:', {
      status: result.status,
      stats: result.stats,
      resultsCount: result.results?.length || 0
    })

    // Return the response from the backend
    // The backend should return the categorization results with stats
    return NextResponse.json({
      success: true,
      render_response: result,
      job_id: result.job_id || `tag_batch_${Date.now()}`,
      estimated_subreddits: limit,
      duration_ms: Date.now() - startTime
    })

  } catch (error) {
    console.error('❌ Tag categorization error:', error)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Tag categorization timed out after 5 minutes',
        }, { status: 504 })
      }

      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to start tag categorization',
    }, { status: 500 })
  }
}