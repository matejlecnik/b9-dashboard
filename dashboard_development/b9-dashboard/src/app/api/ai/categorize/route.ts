import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { categorizeSubreddit } from '@/lib/openai'

// POST /api/ai/categorize - Categorize a single subreddit
export async function POST(request: Request) {
  try {
    const { subredditId } = await request.json()
    
    if (!subredditId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subreddit ID is required' 
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    // Get subreddit data
    const { data: subreddit, error: fetchError } = await supabase
      .from('subreddits')
      .select(`
        id, name, display_name_prefixed, title, public_description, 
        over18, subscribers, top_content_type, avg_upvotes_per_post
      `)
      .eq('id', subredditId)
      .single()
    
    if (fetchError || !subreddit) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subreddit not found' 
      }, { status: 404 })
    }

    // Check if already has AI suggestion
    const { data: existingSuggestion } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .eq('subreddit_id', subredditId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSuggestion && !request.url.includes('force=true')) {
      return NextResponse.json({ 
        success: true,
        suggestion: {
          category: existingSuggestion.suggested_category,
          confidence: existingSuggestion.confidence_score,
          reasoning: existingSuggestion.reasoning,
          cached: true
        },
        cost: 0,
        tokens_used: 0
      })
    }

    // Get AI categorization
    const result = await categorizeSubreddit(subreddit)
    const suggestion = result.suggestions[0]

    // Save to database
    const { error: insertError } = await supabase
      .from('ai_categorization_suggestions')
      .insert({
        subreddit_id: subreddit.id,
        subreddit_name: subreddit.name,
        suggested_category: suggestion.category,
        confidence_score: suggestion.confidence,
        reasoning: suggestion.reasoning,
        cost_usd: result.cost,
        tokens_used: result.tokens_used
      })

    if (insertError) {
      console.error('Error saving AI suggestion:', insertError)
      // Continue even if save fails - return the suggestion
    }

    return NextResponse.json({ 
      success: true,
      suggestion: {
        category: suggestion.category,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        cached: false
      },
      cost: result.cost,
      tokens_used: result.tokens_used
    })

  } catch (error) {
    console.error('Error in AI categorization:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/ai/categorize?subredditId=123 - Get existing AI suggestion
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const subredditId = url.searchParams.get('subredditId')
    
    if (!subredditId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subreddit ID is required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { data: suggestion, error } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .eq('subreddit_id', parseInt(subredditId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch suggestion' 
      }, { status: 500 })
    }

    if (!suggestion) {
      return NextResponse.json({ 
        success: false, 
        error: 'No AI suggestion found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      suggestion: {
        category: suggestion.suggested_category,
        confidence: suggestion.confidence_score,
        reasoning: suggestion.reasoning,
        userFeedback: suggestion.user_feedback,
        actualCategory: suggestion.actual_category
      }
    })

  } catch (error) {
    console.error('Error fetching AI suggestion:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT /api/ai/categorize - Provide feedback on AI suggestion
export async function PUT(request: Request) {
  try {
    const { subredditId, feedback, actualCategory } = await request.json()
    
    if (!subredditId || !feedback) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subreddit ID and feedback are required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    // Update the suggestion with user feedback
    const { error: updateError } = await supabase
      .from('ai_categorization_suggestions')
      .update({
        user_feedback: feedback,
        actual_category: actualCategory,
        updated_at: new Date().toISOString()
      })
      .eq('subreddit_id', subredditId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update feedback' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Feedback recorded successfully'
    })

  } catch (error) {
    console.error('Error updating AI suggestion feedback:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}