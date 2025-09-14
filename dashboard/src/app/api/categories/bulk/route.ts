import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for bulk category updates
const BulkCategoryUpdateSchema = z.object({
  subredditIds: z.array(z.number().int().positive()).min(1).max(100), // Limit to 100 for performance
  categoryId: z.string().uuid().nullable(), // UUID or null to clear category
  categoryText: z.string().min(1).max(100).nullable().optional() // Legacy text field
})

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 [API] /api/categories/bulk - Starting bulk update')
    
    const supabase = await createClient()
    if (!supabase) {
      console.error('❌ [API] Supabase server client not available')
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = BulkCategoryUpdateSchema.safeParse(body)
    
    if (!parseResult.success) {
      console.error('❌ [API] Invalid request body:', parseResult.error.issues)
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { subredditIds, categoryId, categoryText } = parseResult.data

    // Verify subreddits exist and get current states for audit
    const { data: existingSubreddits, error: fetchError } = await supabase
      .from('reddit_subreddits')
      .select('id, name, display_name_prefixed, category_id, category_text')
      .in('id', subredditIds)

    if (fetchError) {
      console.error('❌ [API] Error fetching subreddits:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch subreddits: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingSubreddits || existingSubreddits.length !== subredditIds.length) {
      const foundIds = (existingSubreddits as Array<{ id: number }> | null)?.map((s) => s.id) || []
      const missingIds = subredditIds.filter(id => !foundIds.includes(id))
      console.error('❌ [API] Some subreddits not found:', missingIds)
      return NextResponse.json(
        { 
          error: 'Some subreddits not found',
          missingIds
        },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: { updated_at: string; category_id?: string | null; category_text?: string | null } = {
      updated_at: new Date().toISOString()
    }

    if (categoryId !== undefined) {
      updateData.category_id = categoryId
    }
    if (categoryText !== undefined) {
      updateData.category_text = categoryText
    }

    console.log('🔄 [API] Updating subreddits:', { 
      count: subredditIds.length,
      categoryId,
      categoryText: categoryText?.substring(0, 20) + (categoryText && categoryText.length > 20 ? '...' : '')
    })

    // Perform bulk update
    const { data: updatedSubreddits, error: updateError } = await supabase
      .from('reddit_subreddits')
      .update(updateData)
      .in('id', subredditIds)
      .select('id, name, display_name_prefixed, category_id, category_text')

    if (updateError) {
      console.error('❌ [API] Bulk update failed:', updateError)
      return NextResponse.json(
        { error: `Bulk update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Update category usage count if categoryId provided
    if (categoryId) {
      const { error: usageError } = await supabase.rpc('increment_category_usage', {
        category_id: categoryId,
        increment_by: subredditIds.length
      })
      
      if (usageError) {
        console.warn('⚠️ [API] Failed to update category usage count:', usageError)
        // Don't fail the request for this
      }
    }

    console.log('✅ [API] Bulk update successful:', {
      updatedCount: updatedSubreddits?.length || 0,
      categoryId,
      categoryText
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedSubreddits?.length || 0} subreddits`,
      updatedSubreddits: updatedSubreddits || [],
      previousStates: (existingSubreddits as Array<{ id: number; name: string; category_id: string | null; category_text: string | null }>).
        map((s) => ({
          id: s.id,
          name: s.name,
          previousCategoryId: s.category_id,
          previousCategoryText: s.category_text
        }))
    })

  } catch (error) {
    console.error('❌ [API] Unexpected error in bulk category update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to preview bulk update (dry run)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] /api/categories/bulk - Preview mode (dry run)')
    
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const parseResult = BulkCategoryUpdateSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: parseResult.error.issues
        },
        { status: 400 }
      )
    }

    const { subredditIds, categoryId } = parseResult.data

    // Fetch subreddits that would be affected
    const { data: subreddits, error } = await supabase
      .from('reddit_subreddits')
      .select('id, name, display_name_prefixed, category_id, category_text')
      .in('id', subredditIds)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch subreddits: ${error.message}` },
        { status: 500 }
      )
    }

    // Fetch category details if provided
    let categoryDetails = null
    if (categoryId) {
      const { data: category } = await supabase
        .from('reddit_categories')
        .select('id, name, description, color')
        .eq('id', categoryId)
        .single()
      
      categoryDetails = category
    }

    return NextResponse.json({
      success: true,
      preview: true,
      affectedSubreddits: subreddits || [],
      categoryDetails,
      wouldUpdate: subreddits?.length || 0
    })

  } catch (error) {
    console.error('❌ [API] Error in bulk preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
