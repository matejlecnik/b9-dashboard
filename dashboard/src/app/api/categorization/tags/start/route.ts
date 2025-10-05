import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface TagCategorizationRequest {
  batch_size?: number
  limit?: number
}

// Get the Render API URL
function getRenderApiUrl(): string {
  return process.env['NEXT_PUBLIC_API_URL'] || 'https://b9-dashboard.onrender.com'
}

// POST /api/categorization/tags/start - Start AI tag categorization
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const API_URL = getRenderApiUrl()

    const body: TagCategorizationRequest = await request.json()
    const { batch_size = 30, limit = 100 } = body


    // Call the Render backend API for tag categorization
    const apiUrl = `${API_URL}/api/ai/categorization/start`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize: batch_size,
        limit
      }),
      signal: AbortSignal.timeout(300000), // 5 minute timeout for batch processing
    })

    if (!response.ok) {
      const errorText = await response.text()

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