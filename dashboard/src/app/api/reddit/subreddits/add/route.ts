import { logger } from '@/lib/logger'
import { protectedApi } from '@/lib/api-wrapper'
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

export const POST = protectedApi(async (request: NextRequest) => {
  const requestId = Math.random().toString(36).substring(7)

  try {
    logger.log(`🔄 [API:${requestId}] /api/subreddits/add POST - Starting request`)

    const body = await request.json()
    const { subreddit_name, fetchFromReddit = false, review = null } = body

    // Validate input
    if (!subreddit_name || typeof subreddit_name !== 'string') {
      return NextResponse.json(
        { error: 'Subreddit name is required', success: false },
        { status: 400 }
      )
    }

    // Clean the name (remove r/ or u/ prefix if present)
    const cleanName = subreddit_name.replace(/^[ru]\//, '').trim().toLowerCase()

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

    // If fetchFromReddit is true, call the external API to get subreddit details
    if (fetchFromReddit) {
      try {
        logger.log(`🔄 [API:${requestId}] Fetching details from Reddit for: ${cleanName}`)

        // Call external API to fetch subreddit details
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://91.98.91.129:10000'
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
    logger.error(`❌ [API:${requestId}] Unexpected error in POST /api/subreddits/add:`, error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
})
