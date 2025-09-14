import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { loggingService } from '@/lib/logging-service'

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse and validate request body
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }, { status: 400 })
    }

    const { id, username, our_creator } = body

    // Comprehensive input validation
    if (!id && !username) {
      return NextResponse.json({
        success: false,
        error: 'Either user ID or username is required'
      }, { status: 400 })
    }

    if (id !== undefined && (typeof id !== 'number' || !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({
        success: false,
        error: 'User ID must be a positive integer'
      }, { status: 400 })
    }

    if (username !== undefined && (typeof username !== 'string' || username.trim().length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Username must be a non-empty string'
      }, { status: 400 })
    }

    if (typeof our_creator !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'our_creator must be a boolean value'
      }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = await createClient()
    
    if (!supabase) {
      console.error('Failed to create Supabase client')
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Check if user exists before updating
    let query = supabase!.from('reddit_users').select('id, username')

    if (id) {
      query = query.eq('id', id)
    } else if (username) {
      query = query.eq('username', username)
    }

    const { data: existingUser, error: checkError } = await query.single()

    if (checkError || !existingUser) {
      console.error('User lookup error:', checkError)

      // Log failed user lookup
      await loggingService.logUserTracking(
        'toggle-creator-lookup-failed',
        username || `user-${id}`,
        {
          error: checkError?.message || 'User not found',
          lookup_method: id ? 'by_id' : 'by_username'
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    // Update the user's creator status
    const { error: updateError } = await supabase
      .from('reddit_users')
      .update({
        our_creator,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)

    if (updateError) {
      console.error('Toggle creator error:', updateError)

      // Log update failure
      await loggingService.logUserTracking(
        'toggle-creator-update-failed',
        existingUser.username,
        {
          user_id: existingUser.id,
          attempted_status: our_creator,
          error: updateError.message
        },
        false,
        Date.now() - startTime
      )

      return NextResponse.json({
        success: false,
        error: `Failed to update user: ${updateError.message}`
      }, { status: 500 })
    }

    // Log the action for audit purposes
    console.log(`User ${existingUser.username} (ID: ${existingUser.id}) creator status changed to: ${our_creator}`)

    // Log successful toggle
    await loggingService.logUserTracking(
      'toggle-creator-success',
      existingUser.username,
      {
        user_id: existingUser.id,
        new_status: our_creator,
        previous_status: !our_creator
      },
      true,
      Date.now() - startTime
    )

    return NextResponse.json({
      success: true,
      message: `User ${existingUser.username} ${our_creator ? 'marked as' : 'removed from'} our creators`
    })

  } catch (error) {
    console.error('Unexpected error in toggle-creator API:', error)

    // Log unexpected error
    await loggingService.logUserTracking(
      'toggle-creator-error',
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
      error: 'Internal server error'
    }, { status: 500 })
  }
}


