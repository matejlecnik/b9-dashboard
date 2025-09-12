import { NextResponse } from 'next/server'

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

// Get the Render API URL from environment variables
const RENDER_API_URL = process.env.RENDER_API_URL || process.env.NEXT_PUBLIC_RENDER_API_URL

if (!RENDER_API_URL) {
  console.error('⚠️ RENDER_API_URL environment variable not set. AI categorization will not work.')
}

// POST /api/ai/categorize-batch - Start AI categorization
export async function POST(request: Request) {
  try {
    if (!RENDER_API_URL) {
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured. Please set RENDER_API_URL environment variable.',
        configuration_needed: true
      }, { status: 503 })
    }

    const body = await request.json()
    
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
      Object.entries(requestPayload).filter(([_, v]) => v !== undefined)
    )
    
    console.log('Forwarding to Render API:', cleanPayload)
    
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

    if (!renderResponse.ok) {
      console.error('Render API error:', renderData)
      return NextResponse.json({
        success: false,
        error: renderData.detail || 'AI categorization service error',
        render_error: true
      }, { status: renderResponse.status })
    }

    return NextResponse.json({
      success: true,
      message: 'AI categorization started successfully',
      batch_size: batchSize,
      estimated_subreddits: renderData.subreddits_to_process || 0,
      estimated_cost: renderData.estimated_cost || 0,
      job_id: renderData.job_id,
      render_response: renderData
    })

  } catch (error) {
    console.error('Error starting AI categorization:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to AI categorization service. Please check the RENDER_API_URL configuration.',
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
      renderResponse = await fetch(`${RENDER_API_URL}/api/categorization/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'B9-Dashboard/1.0'
        },
        // Add timeout for development
        signal: AbortSignal.timeout(5000)
      })
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