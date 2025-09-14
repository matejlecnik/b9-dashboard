import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { loggingService } from '@/lib/logging-service'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 1) {
      // Log invalid search request
      await loggingService.logUserTracking(
        'search-invalid-query',
        undefined,
        {
          query: query || 'empty',
          error: 'Search query is required'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'Search query is required',
        users: []
      }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available',
        users: []
      }, { status: 503 })
    }

    // Search for users by username (case insensitive partial match)
    const { data: users, error } = await supabase
      .from('reddit_users')
      .select(`
        id,
        username,
        link_karma,
        comment_karma,
        account_age_days,
        icon_img,
        our_creator,
        verified,
        is_gold,
        has_verified_email,
        created_utc,
        bio,
        overall_user_score
      `)
      .ilike('username', `%${query}%`)
      .order('overall_user_score', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Database error:', error)

      // Log search error
      await loggingService.logUserTracking(
        'search-database-error',
        undefined,
        {
          query,
          error: error.message,
          error_type: 'database'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'Failed to search users',
        users: []
      }, { status: 500 })
    }

    // Log successful search
    await loggingService.logUserTracking(
      'search-success',
      undefined,
      {
        query,
        results_count: users?.length || 0,
        has_results: (users?.length || 0) > 0
      },
      true,
      Date.now() - startTime
    )

    return NextResponse.json({
      success: true,
      users: users || [],
      count: users?.length || 0
    })

  } catch (error) {
    console.error('Error searching users:', error)

    // Log unexpected error
    await loggingService.logUserTracking(
      'search-error',
      undefined,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        error_type: 'unexpected'
      },
      false,
      Date.now() - startTime
    )

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      users: []
    }, { status: 500 })
  }
}