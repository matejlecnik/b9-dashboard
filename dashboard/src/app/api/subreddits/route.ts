import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`🔄 [API:${requestId}] /api/subreddits - Starting request`)
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const filter = searchParams.get('filter') || 'uncategorized'
    const review = searchParams.get('review')
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const search = searchParams.get('search') || ''
    const includeStats = (searchParams.get('stats') || 'false') === 'true'

    console.log(`🔄 [API:${requestId}] Query params:`, { 
      limit, offset, filter, categories: categories.length, search: search.length > 0 ? `"${search.substring(0, 20)}..."` : 'none',
      timestamp: new Date().toISOString()
    })

    const supabase = await createClient()
    if (!supabase) {
      console.error('❌ [API] Supabase client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Build the query - include tags field for new tag system
    let query = supabase
      .from('reddit_subreddits')
      .select(
        'id,name,display_name_prefixed,title,subscribers,avg_upvotes_per_post,review,tags,primary_category,community_icon,icon_img,top_content_type,rules_data,over18,comment_to_upvote_ratio'
      )

    // Apply filters - checking primary_category field
    if (filter === 'categorized') {
      // Categorized means it has a primary_category (not null and not empty string)
      query = query.not('primary_category', 'is', null).neq('primary_category', '')
    } else if (filter === 'uncategorized') {
      // Uncategorized means no primary_category (null OR empty string)
      query = query.or('primary_category.is.null,primary_category.eq.')
    } else if (filter === 'unreviewed') {
      query = query.is('review', null)
    } else if (filter === 'ok') {
      query = query.eq('review', 'Ok')
    } else if (filter === 'non_related') {
      query = query.eq('review', 'Non Related')
    } else if (filter === 'no_seller') {
      query = query.eq('review', 'No Seller')
    }

    // Optional explicit review filter (e.g., review=Ok). For categorized/uncategorized, default to Ok.
    if (review) {
      query = query.eq('review', review)
    } else if (filter === 'categorized' || filter === 'uncategorized') {
      query = query.eq('review', 'Ok')
    }

    // Apply category filter
    if (categories.length > 0) {
      query = query.in('primary_category', categories)
    }

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name_prefixed.ilike.%${search}%,title.ilike.%${search}%`)
    }

    // Apply pagination and ordering by average upvotes
    query = query
      .order('avg_upvotes_per_post', { ascending: false })
      .range(offset, offset + limit - 1)

    console.log(`🔄 [API:${requestId}] Executing Supabase query...`)
    const queryStartTime = Date.now()
    const { data, error, count } = await query
    const queryDuration = Date.now() - queryStartTime

    if (error) {
      console.error(`❌ [API:${requestId}] Supabase query failed:`, {
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
    let stats: { total: number; categorized: number; uncategorized: number } | undefined
    let statsDuration = 0
    if (includeStats) {
      console.log(`🔄 [API:${requestId}] Computing stats...`)
      const statsStartTime = Date.now()
      const baseFilters = <T extends {
        not: (...args: unknown[]) => T
        or: (...args: unknown[]) => T
        is: (...args: unknown[]) => T
        eq: (...args: unknown[]) => T
      }>(q: T): T => {
        let baseQuery = q.not('name', 'ilike', 'u_%')
        if (search) {
          baseQuery = baseQuery.or(`name.ilike.%${search}%,display_name_prefixed.ilike.%${search}%,title.ilike.%${search}%`)
        }
        // Match review constraint if applied to main query
        if (review || filter === 'categorized' || filter === 'uncategorized') {
          baseQuery = baseQuery.eq('review', review || 'Ok')
        }
        return baseQuery
      }

      const [totalResult, categorizedResult, uncategorizedResult] = await Promise.all([
        baseFilters(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })),
        // Categorized: has primary_category (not null AND not empty string)
        baseFilters(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })).not('primary_category', 'is', null).neq('primary_category', ''),
        // Uncategorized: no primary_category (null OR empty string)
        baseFilters(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })).or('primary_category.is.null,primary_category.eq.')
      ])
      statsDuration = Date.now() - statsStartTime

      stats = {
        total: totalResult.count || 0,
        categorized: categorizedResult.count || 0,
        uncategorized: uncategorizedResult.count || 0
      }
    }

    const totalDuration = Date.now() - startTime
    console.log(`✅ [API:${requestId}] Query successful:`, { 
      resultCount: data?.length || 0, 
      totalCount: count,
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
      totalCount: count,
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
    console.error('❌ [API] Unexpected error in /api/subreddits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)

  try {
    console.log(`🔄 [API:${requestId}] /api/subreddits POST - Starting request`)

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

    console.log(`🔄 [API:${requestId}] Adding subreddit: ${cleanName}, fetchFromReddit: ${fetchFromReddit}`)

    const supabase = await createClient()
    if (!supabase) {
      console.error('❌ [API] Supabase client not available')
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

    let subredditData: any = {
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
        console.log(`🔄 [API:${requestId}] Fetching details from Reddit for: ${cleanName}`)

        // Call Python backend to fetch subreddit details
        const backendUrl = process.env.PYTHON_BACKEND_URL || 'https://b9-dashboard.onrender.com'
        const response = await fetch(`${backendUrl}/api/subreddits/fetch-single`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subreddit_name: cleanName }),
        })

        if (response.ok) {
          const redditData = await response.json()
          console.log(`✅ [API:${requestId}] Fetched Reddit data:`, redditData)

          // Merge Reddit data with our base data
          subredditData = {
            ...subredditData,
            ...redditData,
            name: cleanName, // Ensure our clean name is used
            display_name_prefixed: `r/${cleanName}`,
            review: review || null, // Preserve the review status
          }
        } else {
          console.warn(`⚠️ [API:${requestId}] Failed to fetch from Reddit, adding basic entry`)
        }
      } catch (error) {
        console.error(`❌ [API:${requestId}] Error fetching from Reddit:`, error)
      }
    }

    // Insert the new subreddit
    const { data: newSubreddit, error: insertError } = await supabase
      .from('reddit_subreddits')
      .insert(subredditData)
      .select()
      .single()

    if (insertError) {
      console.error(`❌ [API:${requestId}] Failed to insert subreddit:`, insertError)
      return NextResponse.json(
        { error: 'Failed to add subreddit to database', success: false },
        { status: 500 }
      )
    }

    console.log(`✅ [API:${requestId}] Successfully added subreddit:`, newSubreddit)

    return NextResponse.json({
      success: true,
      subreddit: newSubreddit,
      message: `Successfully added r/${cleanName}`
    })

  } catch (error) {
    console.error(`❌ [API:${requestId}] Unexpected error in POST /api/subreddits:`, error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}