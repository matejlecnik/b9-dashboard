import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database connection not available'
      }, { status: 503 })
    }

    // Fetch all models
    const { data: models, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching models:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch models'
      }, { status: 500 })
    }

    // Get reddit account counts for each model
    const processedModels = await Promise.all(
      (models || []).map(async (model: any) => {
        const { count: redditCount } = await supabase
          .from('reddit_users')
          .select('*', { count: 'exact', head: true })
          .eq('model_id', model.id)

        // Calculate total account count from platform_accounts
        const totalAccounts = Object.values(model.platform_accounts || {})
          .flat()
          .length

        return {
          ...model,
          reddit_account_count: redditCount || 0,
          account_count: totalAccounts
        }
      })
    )

    return NextResponse.json({
      success: true,
      models: processedModels
    })

  } catch (error) {
    console.error('Unexpected error in list models API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}