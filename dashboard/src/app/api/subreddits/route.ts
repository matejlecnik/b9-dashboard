import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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

    // Build the query
    let query = supabase
      .from('subreddits')
      .select(
        'id,name,display_name_prefixed,title,subscribers,subscriber_engagement_ratio,avg_upvotes_per_post,review,category_text,community_icon,icon_img,top_content_type,rules_data,over18'
      )

    // Apply filters
    if (filter === 'categorized') {
      // Categorized means it has a non-empty category_text
      query = query.not('category_text', 'is', null).neq('category_text', '')
    } else if (filter === 'uncategorized') {
      // Uncategorized means null OR empty string
      query = query.or('category_text.is.null,category_text.eq.')
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
      query = query.in('category_text', categories)
    }

    // Apply search
    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name_prefixed.ilike.%${search}%,title.ilike.%${search}%`)
    }

    // Apply pagination and ordering (use id desc for performance)
    query = query
      .order('id', { ascending: false })
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
        baseFilters(supabase.from('subreddits').select('*', { count: 'exact', head: true })),
        // Categorized: not null AND not empty string
        baseFilters(supabase.from('subreddits').select('*', { count: 'exact', head: true })).not('category_text', 'is', null).neq('category_text', ''),
        // Uncategorized: null OR empty string
        baseFilters(supabase.from('subreddits').select('*', { count: 'exact', head: true })).or('category_text.is.null,category_text.eq.')
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