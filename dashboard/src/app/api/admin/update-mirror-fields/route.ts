'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const startTime = Date.now()

    // First, get the list of subreddits that we want to update
    // Only include: unreviewed (null), 'Ok', or 'No Seller'
    const { data: targetSubreddits, error: subFetchError } = await supabase
      .from('reddit_subreddits')
      .select('name, category_text, over18')
      .or('review.is.null,review.eq.Ok,review.eq.No Seller')

    if (subFetchError) {
      console.error('Error fetching target subreddits:', subFetchError)
      return NextResponse.json({ error: subFetchError.message }, { status: 500 })
    }

    if (!targetSubreddits || targetSubreddits.length === 0) {
      return NextResponse.json({
        message: 'No target subreddits found',
        targetSubreddits: 0,
        updated: 0
      })
    }

    const subredditNames = targetSubreddits.map(s => s.name)
    console.log(`Found ${subredditNames.length} target subreddits to update posts for`)

    // Update posts from these subreddits that don't have mirror fields yet
    // Process 10,000 at a time for better performance
    const { data: postsToUpdate, error: fetchError } = await supabase
      .from('reddit_posts')
      .select('id, subreddit_name')
      .in('subreddit_name', subredditNames)
      .is('sub_category_text', null)
      .limit(10000)

    if (fetchError) {
      console.error('Error fetching posts:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!postsToUpdate || postsToUpdate.length === 0) {
      return NextResponse.json({
        message: 'No posts to update for target subreddits',
        targetSubreddits: subredditNames.length,
        postsToUpdate: 0,
        updated: 0
      })
    }

    console.log(`Processing ${postsToUpdate.length} posts from ${subredditNames.length} subreddits`)

    // Create a map for quick lookup
    const subredditMap = new Map(
      targetSubreddits.map(s => [s.name, { category_text: s.category_text, over18: s.over18 }])
    )

    // Update posts in larger batches for better performance
    let updatedCount = 0
    let errorCount = 0
    const batchSize = 500  // Increased batch size for 10k posts

    for (let i = 0; i < postsToUpdate.length; i += batchSize) {
      const batch = postsToUpdate.slice(i, i + batchSize)
      const updates = []

      // Prepare batch updates
      for (const post of batch) {
        const subData = subredditMap.get(post.subreddit_name)
        if (subData) {
          updates.push({
            id: post.id,
            sub_category_text: subData.category_text,
            sub_over18: subData.over18
          })
        }
      }

      // Perform batch update
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('reddit_posts')
          .upsert(updates, { onConflict: 'id' })

        if (updateError) {
          console.error(`Batch update error:`, updateError)
          errorCount += updates.length
        } else {
          updatedCount += updates.length
        }
      }

      // Log progress
      if ((i + batchSize) % 2000 === 0 || i + batchSize >= postsToUpdate.length) {
        console.log(`Progress: ${Math.min(i + batchSize, postsToUpdate.length)}/${postsToUpdate.length} posts processed`)
      }
    }

    const duration = Date.now() - startTime

    // Get remaining count for status
    const { count: remainingCount } = await supabase
      .from('reddit_posts')
      .select('*', { count: 'exact', head: true })
      .in('subreddit_name', subredditNames)
      .is('sub_category_text', null)

    return NextResponse.json({
      message: `Updated ${updatedCount} posts from ${subredditNames.length} target subreddits`,
      stats: {
        targetSubreddits: subredditNames.length,
        subredditTypes: ['unreviewed', 'Ok', 'No Seller'],
        postsProcessed: postsToUpdate.length,
        postsUpdated: updatedCount,
        errors: errorCount,
        remainingPosts: remainingCount || 0,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        postsPerSecond: Math.round(updatedCount / (duration / 1000))
      }
    })

  } catch (error) {
    console.error('Error in update-mirror-fields:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check status
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get count of posts missing mirror fields from target subreddits
    const { data: targetSubreddits } = await supabase
      .from('reddit_subreddits')
      .select('name')
      .or('review.is.null,review.eq.Ok,review.eq.No Seller')

    if (!targetSubreddits) {
      return NextResponse.json({ error: 'Could not fetch subreddits' }, { status: 500 })
    }

    const subredditNames = targetSubreddits.map(s => s.name)

    const { count: totalMissing } = await supabase
      .from('reddit_posts')
      .select('*', { count: 'exact', head: true })
      .in('subreddit_name', subredditNames)
      .is('sub_category_text', null)

    const { count: totalPosts } = await supabase
      .from('reddit_posts')
      .select('*', { count: 'exact', head: true })
      .in('subreddit_name', subredditNames)

    return NextResponse.json({
      status: {
        targetSubreddits: subredditNames.length,
        totalPostsInTargetSubs: totalPosts || 0,
        postsNeedingUpdate: totalMissing || 0,
        percentComplete: totalPosts ? Math.round(((totalPosts - (totalMissing || 0)) / totalPosts) * 100) : 100,
        estimatedBatches: Math.ceil((totalMissing || 0) / 10000)
      }
    })

  } catch (error) {
    console.error('Error checking status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}