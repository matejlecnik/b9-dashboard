import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

interface CategorizationRequest {
  batchSize?: number
  limit?: number
  subredditIds?: number[]
}

interface CategorizationStats {
  uncategorized_count: number
  categorized_count: number
  total_subreddits: number
  categories_available: string[]
  last_categorization?: string
}

// Resolve the API URL at request time to avoid build-time inlining
function getRenderApiUrl(): string | undefined {
  // Use bracket notation to prevent Next/webpack from inlining at build time
  return (
    process.env['NEXT_PUBLIC_API_URL'] ||
    process.env['RENDER_API_URL'] ||
    process.env['NEXT_PUBLIC_RENDER_API_URL'] ||
    undefined
  )
}

// POST /api/ai/categorize-batch - Start AI categorization
export async function POST(request: Request) {
  try {
    const RENDER_API_URL = getRenderApiUrl()
    if (!RENDER_API_URL) {
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured. Please set NEXT_PUBLIC_API_URL environment variable.',
        configuration_needed: true
      }, { status: 503 })
    }

    const body: CategorizationRequest = await request.json()
    
    // Extract only the parameters that the backend expects
    const { batchSize = 50, limit, subredditIds } = body
    
    // Validate request parameters
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json({
        success: false,
        error: 'Batch size must be between 1 and 100'
      }, { status: 400 })
    }

    if (limit && (limit < 1 || limit > 1000)) {
      return NextResponse.json({
        success: false,
        error: 'Limit must be between 1 and 1000'
      }, { status: 400 })
    }

    // Forward ONLY the expected parameters to the Render API
    const requestPayload = {
      batchSize: batchSize || 50,
      limit: limit || undefined,
      subredditIds: subredditIds || undefined
    }
    
    // Remove undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(requestPayload).filter(([, v]) => v !== undefined)
    )
    
    console.log('Forwarding to Render API:', { url: RENDER_API_URL, payload: cleanPayload })
    
    // Forward the request to the Render API
    const renderResponse = await fetch(`${RENDER_API_URL}/api/categorization/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'B9-Dashboard/1.0'
      },
      body: JSON.stringify(cleanPayload)
    })

    const renderData = await renderResponse.json()
    
    // Comprehensive logging
    console.log('=== RENDER API RESPONSE DEBUG ===')
    console.log('Status:', renderResponse.status)
    console.log('Full response:', JSON.stringify(renderData, null, 2))
    console.log('Response keys:', Object.keys(renderData))
    if (renderData.results) {
      console.log('Results keys:', Object.keys(renderData.results))
      console.log('Results stats:', renderData.results.stats)
    }
    console.log('=================================')

    if (!renderResponse.ok) {
      console.error('Render API error:', renderData)
      return NextResponse.json({
        success: false,
        error: renderData.detail || 'AI categorization service error',
        render_error: true
      }, { status: renderResponse.status })
    }

    // Forward the complete response from Render
    const response = {
      success: true,
      message: 'AI categorization completed',
      batch_size: batchSize,
      estimated_subreddits: renderData.results?.stats?.total_processed || limit || batchSize,
      estimated_cost: renderData.results?.stats?.total_cost || 0,
      job_id: renderData.job_id,
      render_response: renderData  // This contains the full response including results
    }
    
    console.log('=== SENDING TO FRONTEND ===')
    console.log(JSON.stringify(response, null, 2))
    console.log('===========================')
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error starting AI categorization:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to AI categorization service. Please check the NEXT_PUBLIC_API_URL configuration.',
        connection_error: true
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error while starting categorization'
    }, { status: 500 })
  }
}

// GET /api/ai/categorize-batch - Get categorization statistics and progress
export async function GET() {
  try {
    const RENDER_API_URL = getRenderApiUrl()
    if (!RENDER_API_URL) {
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured',
        configuration_needed: true
      }, { status: 503 })
    }

    // Get stats from the Render API (with development fallback)
    type RenderStatsResponse = {
      uncategorized_count?: number
      categorized_count?: number
      total_subreddits?: number
      categories?: string[]
      last_categorization?: string
      detail?: string
      [key: string]: unknown
    }
    let renderData: RenderStatsResponse
    let renderResponse: Response
    
    try {
      console.log(`🔄 [AI] Attempting to connect to Render API: ${RENDER_API_URL}`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      renderResponse = await fetch(`${RENDER_API_URL}/api/categorization/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'B9-Dashboard/1.0'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      renderData = await renderResponse.json()
    } catch (error) {
      console.warn(`⚠️ [AI] Render API unavailable (development mode):`, error instanceof Error ? error.message : error)
      
      // Development fallback - return mock service status
      return NextResponse.json({
        success: true,
        service_status: 'disconnected',
        message: 'AI service unavailable in development mode',
        development_mode: true,
        stats: {
          uncategorized_count: 5182,
          categorized_count: 1040,
          total_subreddits: 6222,
          categories_available: [
            'Ass & Booty', 'Body Types & Features', 'Lingerie & Underwear',
            'Clothed & Dressed', 'Feet & Foot Fetish', 'Selfie & Amateur'
          ]
        }
      })
    }

    if (!renderResponse.ok) {
      console.error('Render API stats error:', renderData)
      return NextResponse.json({
        success: false,
        error: renderData.detail || 'Failed to get categorization statistics',
        render_error: true
      }, { status: renderResponse.status })
    }

    const stats: CategorizationStats = {
      uncategorized_count: renderData.uncategorized_count || 0,
      categorized_count: renderData.categorized_count || 0,
      total_subreddits: renderData.total_subreddits || 0,
      categories_available: renderData.categories || [],
      last_categorization: renderData.last_categorization
    }

    return NextResponse.json({
      success: true,
      stats,
      service_status: 'connected',
      render_api_url: RENDER_API_URL.replace(/\/+$/, '') // Remove trailing slashes for display
    })

  } catch (error) {
    console.error('Error getting categorization stats:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to AI categorization service',
        connection_error: true,
        service_status: 'disconnected'
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error while getting statistics',
      service_status: 'error'
    }, { status: 500 })
  }
}

// Removed unused categories() helper