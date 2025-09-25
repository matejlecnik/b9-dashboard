import { logger } from '@/lib/logger'
import { protectedApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for bulk review request
const bulkSubredditReviewSchema = z.object({
  subredditIds: z.array(z.number()).min(1).max(100), // Limit to 100 subreddits at once
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed']).nullable()
})

// Safe validation helper
function safeValidateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { data?: T; error?: string } {
  try {
    const result = schema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues.map(i => i.message).join(', ') }
    }
    return { data: result.data }
  } catch {
    return { error: 'Invalid request data' }
  }
}

// Response schema for audit trail
interface ReviewUpdateResult {
  id: number
  name: string
  display_name_prefixed: string
  previousReview: string | null
  newReview: string | null
  success: boolean
  error?: string
}

// Subset of subreddit fields used in this endpoint
interface SubredditRow {
  id: number
  name: string
  display_name_prefixed: string
  review: string | null
  subscribers?: number | null
  avg_upvotes_per_post?: number | null
}

export const PATCH = protectedApi(async (request: NextRequest) => {
  try {
    logger.log('🔄 [API] /api/subreddits/bulk-review - Starting bulk review update')
    
    const supabase = await createClient()
    if (!supabase) {
      logger.error('❌ [API] Supabase server client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = safeValidateRequest(bulkSubredditReviewSchema, body)

    if (validation.error) {
      logger.error('❌ [API] Invalid request body:', validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { subredditIds, review } = validation.data!

    // Fetch existing subreddits for audit trail and validation
    const { data: existingSubreddits, error: fetchError } = await supabase
      .from('reddit_subreddits')
      .select('id, name, display_name_prefixed, review')
      .in('id', subredditIds)

    if (fetchError) {
      logger.error('❌ [API] Error fetching subreddits:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch subreddits: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingSubreddits || existingSubreddits.length !== subredditIds.length) {
      const foundIds = (existingSubreddits as SubredditRow[] | null)?.map(s => s.id) || []
      const missingIds = subredditIds.filter(id => !foundIds.includes(id))
      logger.error('❌ [API] Some subreddits not found:', missingIds)
      return NextResponse.json(
        { 
          error: 'Some subreddits not found',
          missingIds
        },
        { status: 404 }
      )
    }

    // Prepare audit trail
    const auditTrail: ReviewUpdateResult[] = (existingSubreddits as SubredditRow[]).map(sub => ({
      id: sub.id,
      name: sub.name,
      display_name_prefixed: sub.display_name_prefixed,
      previousReview: sub.review,
      newReview: review,
      success: false // Will be updated after DB operation
    }))

    logger.log('🔄 [API] Updating subreddit reviews:', { 
      count: subredditIds.length,
      review,
      sampleNames: (existingSubreddits as SubredditRow[]).slice(0, 3).map(s => s.name)
    })

    // Perform bulk update with transaction-like behavior
    const updateData = {
      review,
      updated_at: new Date().toISOString()
    }

    const { data: updatedSubreddits, error: updateError } = await supabase
      .from('reddit_subreddits')
      .update(updateData)
      .in('id', subredditIds)
      .select('id, name, display_name_prefixed, review')

    if (updateError) {
      logger.error('❌ [API] Bulk review update failed:', updateError)
      return NextResponse.json(
        { 
          error: `Bulk review update failed: ${updateError.message}`,
          auditTrail: auditTrail.map(item => ({ ...item, success: false, error: updateError.message }))
        },
        { status: 500 }
      )
    }

    // Update audit trail with success status
    const updatedIds = new Set((updatedSubreddits as SubredditRow[] | null)?.map(s => s.id) || [])
    const finalAuditTrail = auditTrail.map(item => ({
      ...item,
      success: updatedIds.has(item.id)
    }))

    // Compute review stats for response (helpful for frontend state updates)
    const reviewCounts = {
      total: existingSubreddits.length,
      updated: updatedSubreddits?.length || 0,
      byReview: {} as Record<string, number>
    }

    if (review) {
      reviewCounts.byReview[review] = updatedSubreddits?.length || 0
    }

    logger.log('✅ [API] Bulk review update successful:', {
      totalRequested: subredditIds.length,
      actuallyUpdated: updatedSubreddits?.length || 0,
      review,
      reviewCounts
    })

    return NextResponse.json({
      success: true,
      title: `Successfully updated ${updatedSubreddits?.length || 0} subreddit reviews to "${review || 'cleared'}"`,
      results: {
        totalRequested: subredditIds.length,
        actuallyUpdated: updatedSubreddits?.length || 0,
        review,
        reviewCounts
      },
      auditTrail: finalAuditTrail,
      updatedSubreddits: updatedSubreddits || []
    })

  } catch (error) {
    logger.error('❌ [API] Unexpected error in bulk review update:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        title: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// POST endpoint for bulk review preview (dry run)
export const POST = protectedApi(async (request: NextRequest) => {
  try {
    logger.log('🔄 [API] /api/subreddits/bulk-review - Preview mode (dry run)')
    
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const validation = safeValidateRequest(bulkSubredditReviewSchema, body)

    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { subredditIds, review } = validation.data!

    // Fetch subreddits that would be affected
    const { data: subreddits, error } = await supabase
      .from('reddit_subreddits')
      .select('id, name, display_name_prefixed, review, subscribers, avg_upvotes_per_post')
      .in('id', subredditIds)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch subreddits: ${error.message}` },
        { status: 500 }
      )
    }

    // Analyze impact
    const list: SubredditRow[] = (subreddits as SubredditRow[] | null) ?? []
    const impact = {
      totalSubreddits: list.length,
      currentReviewStates: {} as Record<string, number>,
      wouldChangeTo: review,
      estimatedSubscriberImpact: list.reduce((sum, s: SubredditRow) => sum + (s.subscribers ?? 0), 0),
      avgUpvotesImpact: list.reduce((sum, s: SubredditRow) => sum + (s.avg_upvotes_per_post ?? 0), 0)
    }

    // Count current review states
    list.forEach((sub: SubredditRow) => {
      const currentReview = sub.review || 'unreviewed'
      impact.currentReviewStates[currentReview] = (impact.currentReviewStates[currentReview] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      preview: true,
      affectedSubreddits: subreddits || [],
      impact,
      wouldUpdate: subreddits?.length || 0
    })

  } catch (error) {
    logger.error('❌ [API] Error in bulk review preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
