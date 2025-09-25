import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { protectedApi } from '@/lib/api-wrapper'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const DELETE = protectedApi(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({
        success: false,
        error: 'Valid model ID is required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 })
    }

    // First check if model exists
    const { data: model, error: fetchError } = await supabase
      .from('models')
      .select('stage_name')
      .eq('id', Number(id))
      .single()

    if (fetchError || !model) {
      return NextResponse.json({
        success: false,
        error: 'Model not found'
      }, { status: 404 })
    }

    // Unlink any Reddit accounts (set their model_id to null)
    const { error: unlinkError } = await supabase
      .from('reddit_users')
      .update({ model_id: null })
      .eq('model_id', Number(id))

    if (unlinkError) {
      logger.error('Error unlinking reddit accounts:', unlinkError)
      // Continue with deletion anyway
    }

    // Hard delete the model
    const { error: deleteError } = await supabase
      .from('models')
      .delete()
      .eq('id', Number(id))

    if (deleteError) {
      logger.error('Error deleting model:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete model'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      title: `Model "${model.stage_name}" deleted successfully`
    })

  } catch (error) {
    logger.error('Unexpected error in delete model API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
})
