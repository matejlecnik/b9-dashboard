import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`🔄 [API:${requestId}] /api/subreddits/stats - Starting request`)
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'review' // 'review' or 'category'
    const search = searchParams.get('search') || ''
    
    console.log(`🔄 [API:${requestId}] Query params:`, { 
      type, 
      search: search ? `"${search}"` : 'none',
      timestamp: new Date().toISOString()
    })

    const supabase = await createClient()
    if (!supabase) {
      console.error(`❌ [API:${requestId}] Supabase server client not available`)
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    console.log(`🔄 [API:${requestId}] Computing stats...`)
    const statsStartTime = Date.now()

    if (type === 'review') {
      // Review stats for subreddit-review page
      const today = new Date().toISOString().split('T')[0]
      
      // Build base query with search if provided (avoid any; preserve chaining type)
      const buildBaseQuery = <T extends {
        not: (...args: unknown[]) => T
        or: (...args: unknown[]) => T
      }>(baseQuery: T): T => {
        let query = baseQuery.not('name', 'ilike', 'u_%') // Exclude user profiles

        if (search.trim()) {
          const q = search.trim()
          query = query.or(
            `name.ilike.%${q}%,display_name_prefixed.ilike.%${q}%,title.ilike.%${q}%,top_content_type.ilike.%${q}%`
          )
        }

        return query
      }

      const [
        unreviewedResult,
        okResult, 
        nonRelatedResult,
        noSellerResult,
        newTodayResult,
        totalResult
      ] = await Promise.all([
        // Count unreviewed (review is null)
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
          .is('review', null),
        // Count Ok reviewed  
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
          .eq('review', 'Ok'),
        // Count Non Related
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
          .eq('review', 'Non Related'),
        // Count No Seller
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
          .eq('review', 'No Seller'),
        // Count new today (all states)
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
          .gte('created_utc', today),
        // Total count
        buildBaseQuery(supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }))
      ])

      const statsDuration = Date.now() - statsStartTime
      const totalDuration = Date.now() - startTime

      const stats = {
        unreviewed: unreviewedResult.count || 0,
        ok: okResult.count || 0,
        non_related: nonRelatedResult.count || 0,
        no_seller: noSellerResult.count || 0,
        new_today: newTodayResult.count || 0,
        total: totalResult.count || 0
      }

      console.log(`✅ [API:${requestId}] Review stats computed:`, {
        stats,
        performance: {
          statsDuration: `${statsDuration}ms`,
          totalDuration: `${totalDuration}ms`
        }
      })

      return NextResponse.json({
        success: true,
        stats,
        type: 'review',
        search: search || null,
        performance: {
          statsDuration: `${statsDuration}ms`,
          totalDuration: `${totalDuration}ms`
        }
      })

    } else if (type === 'category') {
      // Category stats for categorization page (already handled by main /api/subreddits endpoint)
      const [totalResult, categorizedResult, uncategorizedResult] = await Promise.all([
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true }).not('name', 'ilike', 'u_%'),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .not('name', 'ilike', 'u_%')
          .not('primary_category', 'is', null)
          .neq('primary_category', ''),
        supabase.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .not('name', 'ilike', 'u_%')
          .or('primary_category.is.null,primary_category.eq.')
      ])

      const statsDuration = Date.now() - statsStartTime
      const totalDuration = Date.now() - startTime

      const stats = {
        total: totalResult.count || 0,
        categorized: categorizedResult.count || 0,
        uncategorized: uncategorizedResult.count || 0
      }

      console.log(`✅ [API:${requestId}] Category stats computed:`, {
        stats,
        performance: {
          statsDuration: `${statsDuration}ms`,
          totalDuration: `${totalDuration}ms`
        }
      })

      return NextResponse.json({
        success: true,
        stats,
        type: 'category',
        search: search || null,
        performance: {
          statsDuration: `${statsDuration}ms`,
          totalDuration: `${totalDuration}ms`
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid stats type. Use type=review or type=category' },
      { status: 400 }
    )

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`❌ [API:${requestId}] Stats computation failed:`, error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        performance: {
          totalDuration: `${totalDuration}ms`
        }
      },
      { status: 500 }
    )
  }
}
