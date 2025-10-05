import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface SubredditData {
  name: string
  display_name_prefixed: string
  created_at: string
  review?: string | null
  primary_category?: string | null
  tags?: string[] | null
  [key: string]: unknown // Allow additional fields from Reddit API
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  try {
    logger.log(`🔄 [API:${requestId}] /api/subreddits - Starting request`)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const filter = searchParams.get('filter') || 'uncategorized'
    const review = searchParams.get('review')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const search = searchParams.get('search') || ''
    const includeStats = (searchParams.get('stats') || 'false') === 'true'

    logger.log(`🔄 [API:${requestId}] Query params:`, {
      limit, offset, filter, tags: tags.length, search: search.length > 0 ? `"${search.substring(0, 20)}..."` : 'none',
      timestamp: new Date().toISOString()
    })

    const supabase = await createClient()
    if (!supabase) {
      logger.error('❌ [API] Supabase client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Determine review filter based on filter type
    let reviewFilter = review
    if (!review) {
      // Handle review-based filters from subreddit-review page
      if (filter === 'unreviewed') {
        reviewFilter = '__NULL__'  // Special marker for NULL values
      } else if (filter === 'ok') {
        reviewFilter = 'Ok'
      } else if (filter === 'non_related') {
        reviewFilter = 'Non Related'
      } else if (filter === 'no_seller') {
        reviewFilter = 'No Seller'
      } else if (filter === 'categorized' || filter === 'uncategorized') {
        // For categorization page, default to 'Ok' reviewed items
        reviewFilter = 'Ok'
      }
    }

    // Use the RPC function for filtering
    logger.log(`🔄 [API:${requestId}] Using RPC function for filtering...`)
    const queryStartTime = Date.now()

    const { data, error } = await supabase.rpc('filter_subreddits_by_tags', {
      tag_array: tags.length > 0 ? tags : null,
      search_term: search || null,
      review_filter: reviewFilter || null,
      filter_type: filter === 'categorized' ? 'categorized' :
                   filter === 'uncategorized' ? 'uncategorized' : 'all',
      limit_count: limit,
      offset_count: offset
    })

    const queryDuration = Date.now() - queryStartTime

    if (error) {
      logger.error(`❌ [API:${requestId}] Supabase RPC failed:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        queryDuration,
        totalDuration: Date.now() - startTime
      })
      return NextResponse.json(
        { error: `Database query failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Compute stats optionally to avoid heavy counts during initial loads
    let stats: { total: number; tagged: number; untagged: number } | undefined
    let statsDuration = 0
    if (includeStats) {
      logger.log(`🔄 [API:${requestId}] Computing stats using RPC...`)
      const statsStartTime = Date.now()

      const { data: statsData, error: statsError } = await supabase.rpc('get_subreddit_tag_stats', {
        search_term: search || null,
        review_filter: reviewFilter || null
      })

      statsDuration = Date.now() - statsStartTime

      if (!statsError && statsData && statsData[0]) {
        stats = {
          total: Number(statsData[0].total_count) || 0,
          tagged: Number(statsData[0].tagged_count) || 0,
          untagged: Number(statsData[0].untagged_count) || 0
        }
      } else {
        logger.warn(`⚠️ [API:${requestId}] Failed to get stats:`, statsError)
        stats = { total: 0, tagged: 0, untagged: 0 }
      }
    }

    const totalDuration = Date.now() - startTime
    logger.log(`✅ [API:${requestId}] Query successful:`, {
      resultCount: data?.length || 0,
      tags: tags.length > 0 ? tags : 'none',
      stats,
      performance: {
        queryDuration: `${queryDuration}ms`,
        statsDuration: `${statsDuration}ms`,
        totalDuration: `${totalDuration}ms`
      },
      sampleNames: (data as Array<{ name?: string | null }> | null)?.slice(0, 3).map(s => s.name)
    })

    return NextResponse.json({
      success: true,
      subreddits: data || [],
      count: data?.length || 0,
      totalCount: stats?.total || data?.length || 0,
      hasMore: data && data.length === limit,
      stats,
      _debug: process.env.NODE_ENV === 'development' ? {
        requestId,
        performance: {
          queryDuration,
          statsDuration,
          totalDuration
        }
      } : undefined
    })

  } catch (error) {
    logger.error('❌ [API] Unexpected error in /api/subreddits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)

  try {
    logger.log(`🔄 [API:${requestId}] /api/subreddits POST - Starting request`)

    const body = await request.json()
    const { name, fetchFromReddit = false, review = null } = body

    // Validate input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Subreddit name is required', success: false },
        { status: 400 }
      )
    }

    // Clean the name (remove r/ or u/ prefix if present)
    const cleanName = name.replace(/^[ru]\//, '').trim().toLowerCase()

    // Validate format
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
      return NextResponse.json(
        { error: 'Invalid subreddit name format', success: false },
        { status: 400 }
      )
    }

    if (cleanName.length < 3 || cleanName.length > 21) {
      return NextResponse.json(
        { error: 'Subreddit name must be between 3 and 21 characters', success: false },
        { status: 400 }
      )
    }

    logger.log(`🔄 [API:${requestId}] Adding subreddit: ${cleanName}, fetchFromReddit: ${fetchFromReddit}`)

    const supabase = await createClient()
    if (!supabase) {
      logger.error('❌ [API] Supabase client not available')
      return NextResponse.json(
        { error: 'Database connection not available', success: false },
        { status: 500 }
      )
    }

    // Check if subreddit already exists
    const { data: existingSubreddit } = await supabase
      .from('reddit_subreddits')
      .select('id, name')
      .eq('name', cleanName)
      .single()

    if (existingSubreddit) {
      return NextResponse.json(
        { error: `Subreddit r/${cleanName} already exists in the database`, success: false },
        { status: 409 }
      )
    }

    // Validate review status if provided
    if (review && !['Ok', 'No Seller', 'Non Related'].includes(review)) {
      return NextResponse.json(
        { error: 'Invalid review status', success: false },
        { status: 400 }
      )
    }

    let subredditData: SubredditData = {
      name: cleanName,
      display_name_prefixed: `r/${cleanName}`,
      created_at: new Date().toISOString(),
      review: review || null,  // Use the provided review status or null
      primary_category: null,
      tags: null
    }

    // If fetchFromReddit is true, call the Python backend to get subreddit details
    if (fetchFromReddit) {
      try {
        logger.log(`🔄 [API:${requestId}] Fetching details from Reddit for: ${cleanName}`)

        // Call Render backend to fetch subreddit details
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'
        const response = await fetch(`${backendUrl}/api/subreddits/fetch-single`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subreddit_name: cleanName }),
        })

        if (response.ok) {
          const redditData = await response.json()
          logger.log(`✅ [API:${requestId}] Fetched Reddit data:`, redditData)

          // Merge Reddit data with our base data
          subredditData = {
            ...subredditData,
            ...redditData,
            name: cleanName, // Ensure our clean name is used
            display_name_prefixed: `r/${cleanName}`,
            review: review || null, // Preserve the review status
          }
        } else {
          logger.warn(`⚠️ [API:${requestId}] Failed to fetch from Reddit, adding basic entry`)
        }
      } catch (error) {
        logger.error(`❌ [API:${requestId}] Error fetching from Reddit:`, error)
      }
    }

    // Insert the new subreddit
    const { data: newSubreddit, error: insertError } = await supabase
      .from('reddit_subreddits')
      .insert(subredditData)
      .select()
      .single()

    if (insertError) {
      logger.error(`❌ [API:${requestId}] Failed to insert subreddit:`, insertError)
      return NextResponse.json(
        { error: 'Failed to add subreddit to database', success: false },
        { status: 500 }
      )
    }

    logger.log(`✅ [API:${requestId}] Successfully added subreddit:`, newSubreddit)

    return NextResponse.json({
      success: true,
      subreddit: newSubreddit,
      title: `Successfully added r/${cleanName}`
    })

  } catch (error) {
    logger.error(`❌ [API:${requestId}] Unexpected error in POST /api/subreddits:`, error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
