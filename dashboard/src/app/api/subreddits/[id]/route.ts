import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for subreddit updates
const SubredditUpdateSchema = z.object({
  review: z.enum(['Ok', 'No Seller', 'Non Related']).nullable().optional(),
  category_text: z.union([
    z.string().length(0), // Allow empty string for uncategorized
    z.string().min(1).max(100),
    z.null()
  ]).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  const params = await context.params
  
  try {
    console.log(`🔄 [API:${requestId}] GET /api/subreddits/${params.id} - Starting request`)
    
    const subredditId = parseInt(params.id, 10)
    if (isNaN(subredditId)) {
      return NextResponse.json(
        { error: 'Invalid subreddit ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    if (!supabase) {
      console.error(`❌ [API:${requestId}] Supabase server client not available`)
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { data: subreddit, error } = await supabase
      .from('reddit_subreddits')
      .select('*')
      .eq('id', subredditId)
      .single()

    if (error) {
      console.error(`❌ [API:${requestId}] Subreddit fetch failed:`, error)
      return NextResponse.json(
        { error: `Failed to fetch subreddit: ${error.message}` },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      )
    }

    const totalDuration = Date.now() - startTime
    console.log(`✅ [API:${requestId}] Subreddit fetched successfully:`, {
      id: subreddit.id,
      name: subreddit.name,
      performance: { totalDuration: `${totalDuration}ms` }
    })

    return NextResponse.json({
      success: true,
      subreddit,
      performance: {
        totalDuration: `${totalDuration}ms`
      }
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`❌ [API:${requestId}] Request failed:`, error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        performance: { totalDuration: `${totalDuration}ms` }
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  const params = await context.params
  
  try {
    console.log(`🔄 [API:${requestId}] PATCH /api/subreddits/${params.id} - Starting request`)
    
    const subredditId = parseInt(params.id, 10)
    if (isNaN(subredditId)) {
      return NextResponse.json(
        { error: 'Invalid subreddit ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log(`🔄 [API:${requestId}] Request body:`, body)

    // Validate request body
    const validationResult = SubredditUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      console.error(`❌ [API:${requestId}] Validation failed:`, validationResult.error.issues)
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    const supabase = await createClient()
    if (!supabase) {
      console.error(`❌ [API:${requestId}] Supabase server client not available`)
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Check if subreddit exists
    const { data: existingSubreddit, error: fetchError } = await supabase
      .from('reddit_subreddits')
      .select('id, name, display_name_prefixed, review, category_text')
      .eq('id', subredditId)
      .single()

    if (fetchError) {
      console.error(`❌ [API:${requestId}] Subreddit fetch failed:`, fetchError)
      return NextResponse.json(
        { error: fetchError.code === 'PGRST116' ? 'Subreddit not found' : `Database error: ${fetchError.message}` },
        { status: fetchError.code === 'PGRST116' ? 404 : 500 }
      )
    }

    // Perform update
    const updateStartTime = Date.now()
    const { data: updatedSubreddit, error: updateError } = await supabase
      .from('reddit_subreddits')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', subredditId)
      .select('*')
      .single()

    if (updateError) {
      console.error(`❌ [API:${requestId}] Subreddit update failed:`, updateError)
      return NextResponse.json(
        { error: `Failed to update subreddit: ${updateError.message}` },
        { status: 500 }
      )
    }

    const updateDuration = Date.now() - updateStartTime
    const totalDuration = Date.now() - startTime

    console.log(`✅ [API:${requestId}] Subreddit updated successfully:`, {
      id: updatedSubreddit.id,
      name: updatedSubreddit.name,
      changes: updateData,
      performance: {
        updateDuration: `${updateDuration}ms`,
        totalDuration: `${totalDuration}ms`
      }
    })

    return NextResponse.json({
      success: true,
      subreddit: updatedSubreddit,
      previousState: {
        review: existingSubreddit.review,
        category_text: existingSubreddit.category_text
      },
      changes: updateData,
      performance: {
        updateDuration: `${updateDuration}ms`,
        totalDuration: `${totalDuration}ms`
      }
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`❌ [API:${requestId}] Request failed:`, error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        performance: { totalDuration: `${totalDuration}ms` }
      },
      { status: 500 }
    )
  }
}
