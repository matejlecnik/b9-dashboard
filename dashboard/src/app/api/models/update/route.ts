import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      stage_name,
      assigned_tags,
      status,
      commission_rate,
      payment_type,
      platform_accounts
    } = body

    // Validate required fields
    if (!id || typeof id !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valid model ID is required'
      }, { status: 400 })
    }

    if (stage_name !== undefined && (!stage_name || typeof stage_name !== 'string' || stage_name.trim().length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Stage name cannot be empty'
      }, { status: 400 })
    }

    if (assigned_tags !== undefined && !Array.isArray(assigned_tags)) {
      return NextResponse.json({
        success: false,
        error: 'Assigned tags must be an array'
      }, { status: 400 })
    }

    if (status !== undefined && !['active', 'inactive', 'onboarding'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status value'
      }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 })
    }

    // Get the current model to check for status change
    const { data: currentModel } = await supabase
      .from('models')
      .select('status')
      .eq('id', id)
      .single()

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (stage_name !== undefined) updateData.stage_name = stage_name.trim()
    if (assigned_tags !== undefined) updateData.assigned_tags = assigned_tags
    if (status !== undefined) updateData.status = status
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate || null
    if (payment_type !== undefined) updateData.payment_type = payment_type
    if (platform_accounts !== undefined) updateData.platform_accounts = platform_accounts || {}

    // Update model
    const { data: model, error } = await supabase
      .from('models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating model:', error)

      // Check for duplicate stage name
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'A model with this stage name already exists'
        }, { status: 409 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to update model'
      }, { status: 500 })
    }

    if (!model) {
      return NextResponse.json({
        success: false,
        error: 'Model not found'
      }, { status: 404 })
    }

    // Handle Reddit account updates
    if (platform_accounts && platform_accounts.reddit) {
      // Final model status to use for reddit accounts
      const finalModelStatus = model.status || 'active'

      // Get current Reddit accounts linked to this model
      const { data: currentRedditUsers } = await supabase
        .from('reddit_users')
        .select('username')
        .eq('model_id', id)

      const currentUsernames = currentRedditUsers?.map((u: any) => u.username) || []
      const newUsernames = platform_accounts.reddit || []

      // Find accounts to add
      const toAdd = newUsernames.filter((username: string) => !currentUsernames.includes(username))

      // Find accounts to remove
      const toRemove = currentUsernames.filter((username: string) => !newUsernames.includes(username))

      // Add new Reddit accounts
      for (const username of toAdd) {
        // Check if Reddit user exists
        const { data: existingUser } = await supabase
          .from('reddit_users')
          .select('id')
          .eq('username', username)
          .single()

        if (existingUser) {
          // Update existing user to link to this model and sync status
          await supabase
            .from('reddit_users')
            .update({
              model_id: id,
              status: finalModelStatus // Set reddit user status based on model status
            })
            .eq('id', existingUser.id)
        } else {
          // Create new Reddit user linked to this model
          await supabase
            .from('reddit_users')
            .insert({
              username: username,
              model_id: id,
              status: finalModelStatus, // Set initial status based on model status
              comment_karma: 0,
              link_karma: 0,
              total_karma: 0,
              is_employee: false,
              is_mod: false,
              is_gold: false,
              verified: false,
              has_verified_email: false,
              is_suspended: false,
              subreddit_subscribers: 0,
              subreddit_over_18: false,
              accept_followers: true,
              hide_from_robots: false,
              pref_show_snoovatar: true,
              our_creator: false
            })
        }
      }

      // Remove Reddit accounts no longer linked
      for (const username of toRemove) {
        await supabase
          .from('reddit_users')
          .update({ model_id: null })
          .eq('username', username)
          .eq('model_id', id)
      }
    }

    // CASCADE STATUS CHANGES TO REDDIT USERS
    // If status changed to inactive, update all linked reddit_users
    if (status && currentModel && currentModel.status !== status) {
      if (status === 'inactive') {
        // Set all linked reddit_users to inactive
        const { error: updateError } = await supabase
          .from('reddit_users')
          .update({ status: 'inactive' })
          .eq('model_id', id)

        if (updateError) {
          console.error('Error cascading status to reddit_users:', updateError)
          // Don't fail the whole operation, just log the error
        } else {
          console.log(`Updated all reddit_users for model ${id} to inactive status`)
        }
      } else if (status === 'active' && currentModel.status !== 'active') {
        // When activating a model, activate all linked reddit_users
        const { error: updateError } = await supabase
          .from('reddit_users')
          .update({ status: 'active' })
          .eq('model_id', id)

        if (updateError) {
          console.error('Error activating reddit_users:', updateError)
        } else {
          console.log(`Updated all reddit_users for model ${id} to active status`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Model updated successfully`,
      model
    })

  } catch (error) {
    console.error('Unexpected error in update model API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}