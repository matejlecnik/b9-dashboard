import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { bulkCategorizeSubreddits } from '@/lib/openai'

// POST /api/ai/bulk-categorize - Start bulk categorization
export async function POST(request: Request) {
  try {
    const { limit = 50, sessionName = 'Bulk Categorization Session', onlyUncategorized = true } = await request.json()
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 })
    }

    const supabase = await createClient()
    
    // Build query for subreddits to categorize
    let query = supabase
      .from('subreddits')
      .select(`
        id, name, display_name_prefixed, title, public_description, 
        over18, subscribers, top_content_type, avg_upvotes_per_post, category_text
      `)
      .eq('review', 'Ok')
      .not('name', 'ilike', 'u_%')
      .order('subscribers', { ascending: false })
      .limit(Math.min(limit, 100)) // Cap at 100 for safety

    if (onlyUncategorized) {
      query = query.or('category_text.is.null,category_text.eq.')
    }

    const { data: subreddits, error: fetchError } = await query
    
    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subreddits' 
      }, { status: 500 })
    }

    if (!subreddits || subreddits.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No subreddits found to categorize' 
      }, { status: 404 })
    }

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('ai_categorization_sessions')
      .insert({
        session_name: sessionName,
        total_subreddits: subreddits.length,
        status: 'running',
        created_by: 'API'
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create session' 
      }, { status: 500 })
    }

    // Start background processing
    processSubredditsInBackground(subreddits, session.id)

    return NextResponse.json({ 
      success: true,
      sessionId: session.id,
      message: `Started bulk categorization for ${subreddits.length} subreddits`,
      totalSubreddits: subreddits.length,
      estimatedCost: (subreddits.length * 0.002).toFixed(4), // Rough estimate
      estimatedTime: `${Math.ceil(subreddits.length / 5)} minutes` // ~5 per minute with batching
    })

  } catch (error) {
    console.error('Error starting bulk categorization:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function processSubredditsInBackground(subreddits: any[], sessionId: number) {
  const supabase = await createClient()
  
  try {
    console.log(`Starting bulk categorization for ${subreddits.length} subreddits`)
    
    const result = await bulkCategorizeSubreddits(subreddits)
    
    // Save all suggestions to database
    const suggestions = result.results.map(r => ({
      subreddit_id: r.id,
      subreddit_name: r.name,
      suggested_category: r.suggestion.category,
      confidence_score: r.suggestion.confidence,
      reasoning: r.suggestion.reasoning,
      cost_usd: result.totalCost / result.results.length, // Distribute cost evenly
      tokens_used: Math.round(result.totalTokens / result.results.length)
    }))

    const { error: insertError } = await supabase
      .from('ai_categorization_suggestions')
      .insert(suggestions)

    if (insertError) {
      console.error('Error saving bulk suggestions:', insertError)
    }

    // Calculate metrics
    const avgConfidence = result.results.reduce((sum, r) => sum + r.suggestion.confidence, 0) / result.results.length

    // Update session status
    await supabase
      .from('ai_categorization_sessions')
      .update({
        status: 'completed',
        processed_subreddits: result.results.length,
        total_cost_usd: result.totalCost,
        total_tokens: result.totalTokens,
        avg_confidence: avgConfidence,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    console.log(`Bulk categorization completed. Cost: $${result.totalCost.toFixed(4)}, Avg Confidence: ${avgConfidence.toFixed(1)}%`)

  } catch (error) {
    console.error('Error in background processing:', error)
    
    // Update session with error
    await supabase
      .from('ai_categorization_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
  }
}

// GET /api/ai/bulk-categorize?sessionId=123 - Get session status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID is required' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: session, error } = await supabase
      .from('ai_categorization_sessions')
      .select('*')
      .eq('id', parseInt(sessionId))
      .single()

    if (error || !session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }

    // Get suggestions for this session (approximate by time range)
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .gte('created_at', session.created_at)
      .lte('created_at', session.completed_at || new Date().toISOString())
      .order('confidence_score', { ascending: false })

    return NextResponse.json({ 
      success: true,
      session: {
        id: session.id,
        name: session.session_name,
        status: session.status,
        totalSubreddits: session.total_subreddits,
        processedSubreddits: session.processed_subreddits,
        totalCost: session.total_cost_usd,
        totalTokens: session.total_tokens,
        avgConfidence: session.avg_confidence,
        accuracyRate: session.accuracy_rate,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        errorMessage: session.error_message
      },
      suggestions: suggestions || [],
      progress: session.total_subreddits > 0 ? 
        (session.processed_subreddits / session.total_subreddits) * 100 : 0
    })

  } catch (error) {
    console.error('Error fetching session status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}