
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase'


// Type for viral posts
interface ViralPost {
  id: string | number
  total_count?: number
  [key: string]: unknown // Allow additional fields from the database
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
let cachedData: ViralPost[] | null = null
let cacheTimestamp: number = 0 // Reset cache to force fresh data

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const timeRangeHours = parseInt(searchParams.get('timeRangeHours') || '72')
    const postsPerSubreddit = parseInt(searchParams.get('postsPerSubreddit') || '3')
    const totalLimit = parseInt(searchParams.get('totalLimit') || '10000')

    // Check cache
    const now = Date.now()
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      logger.log('[ViralPosts API] Returning cached data')
      return NextResponse.json({
        data: cachedData,
        cached: true,
        cacheAge: Math.round((now - cacheTimestamp) / 1000) // Age in seconds
      })
    }

    // Get service client for server-side queries
    const supabase = createServiceClient()
    if (!supabase) {
      throw new Error('Failed to create Supabase service client')
    }

    // Fetch posts in batches of 1000 to bypass Supabase RPC limit
    const batchSize = 1000
    const postMap = new Map<string, ViralPost>() // Use Map to deduplicate by ID
    let offset = 0
    let hasMore = true
    let totalCount = 0

    logger.log(`[ViralPosts API] Fetching up to ${totalLimit} posts in batches of ${batchSize}`)

    while (hasMore && offset < totalLimit) {
      const { data, error } = await supabase.rpc('get_viral_posts_paginated', {
        time_range_hours: timeRangeHours,
        posts_per_subreddit: postsPerSubreddit,
        page_limit: batchSize,
        page_offset: offset,
        total_limit: totalLimit
      })

      if (error) {
        logger.error(`[ViralPosts API] RPC error at offset ${offset}:`, error)
        throw error
      }

      const batch: ViralPost[] = data || []

      // Get total count from first batch
      if (batch.length > 0 && offset === 0) {
        totalCount = batch[0].total_count || 0
        logger.log(`[ViralPosts API] Total available posts: ${totalCount}`)
      }

      // Remove the total_count field and deduplicate posts
      const cleanedBatch = batch.map((item: ViralPost): Omit<ViralPost, 'total_count'> => {
        // Create a copy without total_count
        const post = Object.keys(item)
          .filter(key => key !== 'total_count')
          .reduce((obj, key) => {
            obj[key] = item[key]
            return obj
          }, {} as Record<string, unknown>)
        return post as Omit<ViralPost, 'total_count'>
      })

      // Add to Map using ID as key to ensure uniqueness
      cleanedBatch.forEach((post) => {
        if (post.id) {
          postMap.set(post.id.toString(), post as ViralPost)
        }
      })

      logger.log(`[ViralPosts API] Batch ${offset / batchSize + 1}: fetched ${batch.length} posts, unique total: ${postMap.size}`)

      // Check if we have more posts to fetch
      if (batch.length < batchSize || postMap.size >= totalLimit || postMap.size >= totalCount) {
        hasMore = false
      } else {
        offset += batchSize
      }
    }

    // Convert Map back to array for response
    const allPosts = Array.from(postMap.values())

    // Update cache
    cachedData = allPosts
    cacheTimestamp = now

    logger.log(`[ViralPosts API] Successfully fetched ${allPosts.length} unique viral posts`)

    return NextResponse.json({
      data: allPosts,
      cached: false,
      totalPosts: allPosts.length
    })
  } catch (error) {
    logger.error('[ViralPosts API] Error:', error)

    // Return cached data if available, even if stale
    if (cachedData) {
      logger.log('[ViralPosts API] Returning stale cache due to error')
      return NextResponse.json({
        data: cachedData,
        cached: true,
        stale: true,
        error: 'Using cached data due to error'
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch viral posts',
        title: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}