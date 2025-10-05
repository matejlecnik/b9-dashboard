import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

interface TagCategorizationRequest {
  batch_size?: number
  limit?: number
  batchSize?: number  // Frontend sends camelCase
  subredditIds?: number[]  // Frontend sends specific IDs
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
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  console.log('🎯 [API Route] POST /api/reddit/categorization/tags/start - Request received')

  try {
    const RENDER_API_URL = getRenderApiUrl()

    console.log('🔧 [API Route] Environment check', {
      RENDER_API_URL: RENDER_API_URL ? `${RENDER_API_URL.substring(0, 30)}...` : 'NOT SET',
      configured: !!RENDER_API_URL
    })

    if (!RENDER_API_URL) {
      console.error('❌ [API Route] RENDER_API_URL not configured')
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured. Please set NEXT_PUBLIC_API_URL environment variable.',
        configuration_needed: true
      }, { status: 500 })
    }

    const body: TagCategorizationRequest = await request.json()

    console.log('📦 [API Route] Request body received', {
      body,
      bodyKeys: Object.keys(body)
    })

    // Handle both camelCase (from frontend) and snake_case formats
    const batch_size = body.batch_size || body.batchSize || 30
    const limit = body.limit || (body.subredditIds ? body.subredditIds.length : 100)
    const subreddit_ids = body.subredditIds || null

    console.log('🔄 [API Route] Converted parameters', {
      batch_size,
      limit,
      subreddit_ids_count: subreddit_ids?.length || 'all uncategorized'
    })

    logger.log('🎯 Starting tag categorization:', {
      batch_size,
      limit,
      subreddit_ids_count: subreddit_ids?.length || 'all uncategorized'
    })

    // Call the Python backend API for tag categorization
    const apiUrl = `${RENDER_API_URL}/api/ai/categorization/tag-subreddits`

    console.log('📡 [API Route] Calling Render backend API', {
      apiUrl,
      method: 'POST',
      body: {
        batch_size,
        limit,
        subreddit_ids: subreddit_ids ? `[${subreddit_ids.length} IDs]` : null
      }
    })

    logger.log('📡 Calling Render API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch_size: batch_size,
        limit: limit,
        subreddit_ids: subreddit_ids  // Pass specific IDs or null for all uncategorized
      }),
      signal: AbortSignal.timeout(300000), // 5 minute timeout for batch processing
    })

    console.log('✅ [API Route] Render API response received', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error('❌ [API Route] Render API returned error', {
        status: response.status,
        errorText: errorText.substring(0, 500)
      })

      logger.error('❌ Render API error:', { status: response.status, error: errorText })

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

    console.log('📊 [API Route] Backend result received', {
      success: result.success,
      message: result.message,
      stats: result.stats
    })

    logger.log('✅ Tag categorization response received:', {
      success: result.success,
      message: result.message,
      stats: result.stats
    })

    // Transform backend response to match frontend expectations
    // Backend returns: { success, message, stats }
    // Frontend expects: results array with categorized items
    const transformedResults = []

    // Extract successfully categorized count from stats if available
    const successfulCount = result.stats?.successful || 0

    console.log('🔄 [API Route] Transforming response', {
      successfulCount,
      willCreateResultsArray: successfulCount
    })

    // Create mock results array for frontend compatibility
    // (The actual categorization is already saved in the backend)
    for (let i = 0; i < successfulCount; i++) {
      transformedResults.push({
        id: i,
        tags: [],  // Tags are already saved in DB by backend
        success: true
      })
    }

    const finalResponse = {
      success: result.success,
      message: result.message,
      stats: result.stats,
      results: transformedResults,
      render_response: result,
      job_id: `tag_batch_${Date.now()}`,
      estimated_subreddits: result.stats?.total_processed || limit,
      duration_ms: Date.now() - startTime
    }

    console.log('✅ [API Route] Sending response to frontend', {
      success: finalResponse.success,
      resultsCount: finalResponse.results.length,
      stats: finalResponse.stats
    })

    const apiResponse = NextResponse.json(finalResponse)

    // Add CORS headers
    apiResponse.headers.set('Access-Control-Allow-Origin', '*')
    apiResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    apiResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return apiResponse

  } catch (error) {
    logger.error('❌ Tag categorization error:', error)

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
