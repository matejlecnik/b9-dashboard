import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
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
    let query = supabase.from('reddit_users').select('id, username')

    if (id) {
      query = query.eq('id', id)
    } else if (username) {
      query = query.eq('username', username)
    }

    const { data: existingUser, error: checkError } = await query.single()

    if (checkError || !existingUser) {
      console.error('User lookup error:', checkError)
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
      return NextResponse.json({ 
        success: false, 
        error: `Failed to update user: ${updateError.message}` 
      }, { status: 500 })
    }

    // Log the action for audit purposes
    console.log(`User ${existingUser.username} (ID: ${existingUser.id}) creator status changed to: ${our_creator}`)

    return NextResponse.json({ 
      success: true,
      message: `User ${existingUser.username} ${our_creator ? 'marked as' : 'removed from'} our creators`
    })

  } catch (error) {
    console.error('Unexpected error in toggle-creator API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}


