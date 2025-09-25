import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { protectedApi } from '@/lib/api-wrapper'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const POST = protectedApi(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const {
      stage_name,
      assigned_tags = [],
      status = 'inactive',
      commission_rate,
      payment_type = 'bank',
      platform_accounts = {}
    } = body

    // Validate required fields
    if (!stage_name || typeof stage_name !== 'string' || stage_name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Stage name is required'
      }, { status: 400 })
    }

    // Validate tags format
    if (!Array.isArray(assigned_tags)) {
      return NextResponse.json({
        success: false,
        error: 'Assigned tags must be an array'
      }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 })
    }

    // Insert new model
    const { data: model, error } = await supabase
      .from('models')
      .insert({
        stage_name: stage_name.trim(),
        assigned_tags: assigned_tags,
        status: status,
        commission_rate: commission_rate || null,
        payment_type: payment_type,
        platform_accounts: platform_accounts || {},
        metrics: {}
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating model:', error)

      // Check for duplicate stage name
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'A model with this stage name already exists'
        }, { status: 409 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to create model'
      }, { status: 500 })
    }

    // Connect Reddit accounts if provided
    if (platform_accounts.reddit && platform_accounts.reddit.length > 0) {
      for (const username of platform_accounts.reddit) {
        // Check if Reddit user exists
        const { data: existingUser } = await supabase
          .from('reddit_users')
          .select('id')
          .eq('username', username)
          .single()

        if (existingUser) {
          // Update existing user to link to this model
          await supabase
            .from('reddit_users')
            .update({ model_id: model.id })
            .eq('id', existingUser.id)
        } else {
          // Create new Reddit user linked to this model
          await supabase
            .from('reddit_users')
            .insert({
              username: username,
              model_id: model.id,
              status: 'inactive',
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
    }

    return NextResponse.json({
      success: true,
      title: `Model ${stage_name} created successfully`,
      model
    })

  } catch (error) {
    logger.error('Unexpected error in create model API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
})
