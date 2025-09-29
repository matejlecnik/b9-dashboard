import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

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

    const { userIds, updates } = body

    // Comprehensive input validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'userIds must be a non-empty array' 
      }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: 'updates must be an object' 
      }, { status: 400 })
    }

    // Validate user IDs
    const invalidIds = userIds.filter(id => typeof id !== 'number' || !Number.isInteger(id) || id <= 0)
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'All user IDs must be positive integers' 
      }, { status: 400 })
    }

    // Validate updates object - only allow specific fields
    const allowedFields = ['our_creator', 'tags', 'notes', 'quality_override']
    const updateFields = Object.keys(updates)
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field))
    
    if (invalidFields.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid update fields: ${invalidFields.join(', ')}. Allowed: ${allowedFields.join(', ')}` 
      }, { status: 400 })
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid update fields provided' 
      }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Check if users exist
    const { data: existingUsers, error: checkError } = await supabase
      .from('reddit_users')
      .select('id, username')
      .in('id', userIds)

    if (checkError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify users exist' 
      }, { status: 500 })
    }

    if (!existingUsers || existingUsers.length !== userIds.length) {
      const foundIds = (existingUsers as Array<{ id: number }> | null)?.map((user) => user.id) || []
      const missingIds = userIds.filter(id => !foundIds.includes(id))
      return NextResponse.json({ 
        success: false, 
        error: `Users not found: ${missingIds.join(', ')}` 
      }, { status: 404 })
    }

    // Perform bulk update
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: updatedUsers, error: updateError } = await supabase
      .from('reddit_users')
      .update(updateData)
      .in('id', userIds)
      .select('id, username, our_creator')

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to update users: ${updateError.message}` 
      }, { status: 500 })
    }

    // Return success response with updated user data
    return NextResponse.json({ 
      success: true,
      message: `Successfully updated ${updatedUsers?.length || 0} users`,
      updatedUsers: updatedUsers || [],
      updates: updateFields
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint to retrieve bulk operation status or history (optional)
export async function GET() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Get recent bulk operations from logs or audit table (if implemented)
    // For now, just return basic stats
    const { data: userStats, error } = await supabase
      .from('reddit_users')
      .select('our_creator', { count: 'exact' })

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch user statistics' 
      }, { status: 500 })
    }

    const creatorCount = (userStats as Array<{ our_creator: boolean }> | null)?.filter((user) => user.our_creator).length || 0
    const totalCount = userStats?.length || 0

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalCount,
        ourCreators: creatorCount,
        nonCreators: totalCount - creatorCount
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}