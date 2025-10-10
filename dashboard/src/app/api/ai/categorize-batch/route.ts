import { NextResponse } from 'next/server'
import { loggingService } from '@/lib/logging-service'
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
function getApiUrl(): string | undefined {
  // Use bracket notation to prevent Next/webpack from inlining at build time
  return (
    process.env['NEXT_PUBLIC_API_URL'] ||
    undefined
  )
}

// POST /api/ai/categorize-batch - Start AI categorization
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const API_URL = getApiUrl()
    if (!API_URL) {
      // Log configuration error
      await loggingService.logAICategorization(
        'service-not-configured',
        {
          error: 'NEXT_PUBLIC_API_URL not set'
        },
        false,
        Date.now() - startTime
      )

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
      // Log invalid batch size
      await loggingService.logAICategorization(
        'invalid-batch-size',
        {
          batch_size: batchSize,
          error: 'Batch size must be between 1 and 100'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'Batch size must be between 1 and 100'
      }, { status: 400 })
    }

    if (limit && (limit < 1 || limit > 1000)) {
      // Log invalid limit
      await loggingService.logAICategorization(
        'invalid-limit',
        {
          limit,
          error: 'Limit must be between 1 and 1000'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'Limit must be between 1 and 1000'
      }, { status: 400 })
    }

    // Forward ONLY the expected parameters to the API
    const requestPayload = {
      batchSize: batchSize || 50,
      limit: limit || undefined,
      subredditIds: subredditIds || undefined
    }
    
    // Remove undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(requestPayload).filter(([, v]) => v !== undefined)
    )
    

    // Forward the request to the external API
    const apiResponse = await fetch(`${API_URL}/api/ai/categorization/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'B9-Dashboard/1.0'
      },
      body: JSON.stringify(cleanPayload)
    })

    const apiData = await apiResponse.json()

    // Comprehensive logging
    if (apiData.results) {
    }

    if (!apiResponse.ok) {

      // Log API error
      await loggingService.logAICategorization(
        'api-error',
        {
          status: apiResponse.status,
          error: apiData.detail || 'Unknown error',
          batch_size: batchSize,
          limit
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: apiData.detail || 'AI categorization service error',
        api_error: true
      }, { status: apiResponse.status })
    }

    // Forward the complete response from API
    const response = {
      success: true,
      message: 'AI categorization completed',
      batch_size: batchSize,
      estimated_subreddits: apiData.results?.stats?.total_processed || limit || batchSize,
      estimated_cost: apiData.results?.stats?.total_cost || 0,
      job_id: apiData.job_id,
      api_response: apiData  // This contains the full response including results
    }
    

    // Log successful categorization start
    await loggingService.logAICategorization(
      'categorization-started',
      {
        batch_size: batchSize,
        limit: limit || batchSize,
        estimated_subreddits: apiData.results?.stats?.total_processed || limit || batchSize,
        estimated_cost: apiData.results?.stats?.total_cost || 0,
        job_id: apiData.job_id,
        subreddit_ids: subredditIds?.length || 0
      },
      true,
      Date.now() - startTime
    )

    return NextResponse.json(response)

  } catch (error) {

    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Log connection error
      const apiUrl = getApiUrl()
      await loggingService.logAICategorization(
        'connection-error',
        {
          error: error.message,
          api_url: apiUrl
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'Failed to connect to AI categorization service. Please check the NEXT_PUBLIC_API_URL configuration.',
        connection_error: true
      }, { status: 503 })
    }

    // Log unexpected error
    await loggingService.logAICategorization(
      'unexpected-error',
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      false,
      Date.now() - startTime
    )

    return NextResponse.json({
      success: false,
      error: 'Internal server error while starting categorization'
    }, { status: 500 })
  }
}

// GET /api/ai/categorize-batch - Get categorization statistics and progress
export async function GET() {
  const startTime = Date.now()

  try {
    const API_URL = getApiUrl()
    if (!API_URL) {
      return NextResponse.json({
        success: false,
        error: 'AI categorization service not configured',
        configuration_needed: true
      }, { status: 503 })
    }

    // Get stats from the API service (with development fallback)
    type ApiStatsResponse = {
      uncategorized_count?: number
      categorized_count?: number
      total_subreddits?: number
      categories?: string[]
      last_categorization?: string
      detail?: string
      [key: string]: unknown
    }
    let apiData: ApiStatsResponse
    let apiResponse: Response

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      apiResponse = await fetch(`${API_URL}/api/ai/categorization/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'B9-Dashboard/1.0'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      apiData = await apiResponse.json()
    } catch (_error) {
      
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

    if (!apiResponse.ok) {

      // Log stats fetch error
      await loggingService.logAICategorization(
        'stats-fetch-error',
        {
          status: apiResponse.status,
          error: apiData.detail || 'Unknown error'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: apiData.detail || 'Failed to get categorization statistics',
        api_error: true
      }, { status: apiResponse.status })
    }

    const stats: CategorizationStats = {
      uncategorized_count: apiData.uncategorized_count || 0,
      categorized_count: apiData.categorized_count || 0,
      total_subreddits: apiData.total_subreddits || 0,
      categories_available: apiData.categories || [],
      last_categorization: apiData.last_categorization
    }

    // Log successful stats fetch
    await loggingService.logAICategorization(
      'stats-fetched',
      {
        uncategorized: stats.uncategorized_count,
        categorized: stats.categorized_count,
        total: stats.total_subreddits
      },
      true,
      Date.now() - startTime
    )

    return NextResponse.json({
      success: true,
      stats,
      service_status: 'connected',
      api_url: API_URL.replace(/\/+$/, '') // Remove trailing slashes for display
    })

  } catch (error) {

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