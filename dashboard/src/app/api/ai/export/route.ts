import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

// Type definitions
interface SubredditData {
  id: string
  name: string
  display_name_prefixed: string
  title: string
  public_description: string
  subscribers: number
  over18: boolean
  primary_category: string
  avg_upvotes_per_post: number
  avg_comments_per_post?: number
  top_content_type?: string
  created_at: string
}

interface AiSuggestionWithSubreddit {
  id: string
  subreddit_id: string
  suggested_category: string
  confidence_score: number
  reasoning: string
  user_feedback?: string
  actual_category?: string
  cost_usd?: number
  tokens_used?: number
  created_at: string
  subreddits: SubredditData
}

// Removed unused AiSession interface

interface SubredditWithAiSuggestion extends SubredditData {
  ai_suggestion?: {
    suggested_category: string
    confidence_score: number
    user_feedback?: string
  }
}

type CsvRow = (string | number)[]

// GET /api/ai/export - Export categorization results
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    const includeAISuggestions = url.searchParams.get('includeAI') === 'true'
    const onlyWithFeedback = url.searchParams.get('onlyFeedback') === 'true'
    const days = parseInt(url.searchParams.get('days') || '30')
    
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    if (includeAISuggestions) {
      // Export AI suggestions with subreddit data
      let query = supabase
        .from('ai_categorization_suggestions')
        .select(`
          *,
          subreddits!inner(
            name, display_name_prefixed, title, public_description,
            subscribers, over18, primary_category, avg_upvotes_per_post
          )
        `)
        .gte('created_at', cutoffDate.toISOString())
        .order('confidence_score', { ascending: false })

      if (onlyWithFeedback) {
        query = query.not('user_feedback', 'is', null)
      }

      const { data: suggestions, error } = await query

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch suggestions' 
        }, { status: 500 })
      }

      if (format === 'json') {
        return NextResponse.json({
          success: true,
          data: suggestions,
          exportedAt: new Date().toISOString(),
          filters: { days, onlyWithFeedback }
        })
      }

      // CSV format
      const headers = [
        'Subreddit Name',
        'Display Name',
        'Title', 
        'Subscribers',
        'NSFW',
        'Current Category',
        'AI Suggested Category',
        'Confidence %',
        'Reasoning',
        'User Feedback',
        'Actual Category',
        'Cost USD',
        'Tokens Used',
        'Created At'
      ]

      const rows: CsvRow[] = suggestions.map((s: AiSuggestionWithSubreddit) => [
        s.subreddits.name || '',
        s.subreddits.display_name_prefixed || '',
        s.subreddits.title || '',
        s.subreddits.subscribers || 0,
        s.subreddits.over18 ? 'Yes' : 'No',
        s.subreddits.primary_category || 'Uncategorized',
        s.suggested_category || '',
        s.confidence_score || 0,
        `"${(s.reasoning || '').replace(/"/g, '""')}"`,
        s.user_feedback || '',
        s.actual_category || '',
        s.cost_usd || 0,
        s.tokens_used || 0,
        s.created_at || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row: CsvRow) => row.join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ai-categorization-results-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })

    } else {
      // Export regular subreddit categorization data
      const { data: subreddits, error } = await supabase
        .from('reddit_subreddits')
        .select(`
          id, name, display_name_prefixed, title, public_description,
          subscribers, over18, primary_category, avg_upvotes_per_post,
          avg_comments_per_post, top_content_type, created_at
        `)
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%')
        .order('subscribers', { ascending: false })

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch subreddits' 
        }, { status: 500 })
      }

      if (format === 'json') {
        return NextResponse.json({
          success: true,
          data: subreddits,
          exportedAt: new Date().toISOString(),
          totalSubreddits: subreddits.length,
          categorized: subreddits.filter((s: SubredditData) => s.primary_category).length,
          uncategorized: subreddits.filter((s: SubredditData) => !s.primary_category).length
        })
      }

      // CSV format for subreddits
      const headers = [
        'Subreddit Name',
        'Display Name', 
        'Title',
        'Description',
        'Subscribers',
        'NSFW',
        'Category',
        'Avg Upvotes Per Post',
        'Avg Comments Per Post',
        'Top Content Type',
        'Created At'
      ]

      const rows: CsvRow[] = subreddits.map((s: SubredditData) => [
        s.name || '',
        s.display_name_prefixed || '',
        `"${(s.title || '').replace(/"/g, '""')}"`,
        `"${(s.public_description || '').replace(/"/g, '""')}"`,
        s.subscribers || 0,
        s.over18 ? 'Yes' : 'No',
        s.primary_category || 'Uncategorized',
        s.avg_upvotes_per_post || 0,
        s.avg_comments_per_post || 0,
        s.top_content_type || '',
        s.created_at || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row: CsvRow) => row.join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="subreddit-categorization-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/ai/export - Export specific data
export async function POST(request: Request) {
  try {
    const { 
      subredditIds, 
      sessionId, 
      format = 'csv'
    } = await request.json()
    
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    if (sessionId) {
      // Export specific session data
      const { data: session, error: sessionError } = await supabase
        .from('ai_categorization_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json({ 
          success: false, 
          error: 'Session not found' 
        }, { status: 404 })
      }

      const { data: suggestions, error: suggestionsError } = await supabase
        .from('ai_categorization_suggestions')
        .select(`
          *,
          subreddits!inner(
            name, display_name_prefixed, title, subscribers, over18, primary_category
          )
        `)
        .gte('created_at', session.created_at)
        .lte('created_at', session.completed_at || new Date().toISOString())
        .order('confidence_score', { ascending: false })

      if (suggestionsError) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch session suggestions' 
        }, { status: 500 })
      }

      if (format === 'json') {
        return NextResponse.json({
          success: true,
          session,
          suggestions,
          exportedAt: new Date().toISOString()
        })
      }

      // CSV for session
      const headers = [
        'Session Name',
        'Subreddit Name',
        'Suggested Category',
        'Confidence %',
        'User Feedback',
        'Actual Category',
        'Cost USD',
        'Created At'
      ]

      const rows: CsvRow[] = suggestions.map((s: AiSuggestionWithSubreddit) => [
        session.session_name,
        s.subreddits.name,
        s.suggested_category,
        s.confidence_score,
        s.user_feedback || '',
        s.actual_category || '',
        s.cost_usd || 0,
        s.created_at
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row: CsvRow) => row.join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="session-${sessionId}-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })

    } else if (subredditIds && subredditIds.length > 0) {
      // Export specific subreddits
      const { data: subreddits, error } = await supabase
        .from('reddit_subreddits')
        .select('*')
        .in('id', subredditIds)

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch subreddits' 
        }, { status: 500 })
      }

      // Get AI suggestions for these subreddits if they exist
      const { data: suggestions } = await supabase
        .from('ai_categorization_suggestions')
        .select('*')
        .in('subreddit_id', subredditIds)

      const subredditsWithAI: SubredditWithAiSuggestion[] = subreddits.map((sub: SubredditData) => {
        const suggestion = suggestions?.find((s: { subreddit_id: string }) => s.subreddit_id === sub.id)
        return {
          ...sub,
          ai_suggestion: suggestion
        }
      })

      if (format === 'json') {
        return NextResponse.json({
          success: true,
          data: subredditsWithAI,
          exportedAt: new Date().toISOString()
        })
      }

      // CSV format
      const headers = [
        'Name', 'Display Name', 'Title', 'Subscribers', 'Category',
        'AI Suggested Category', 'AI Confidence', 'AI Feedback'
      ]

      const rows: CsvRow[] = subredditsWithAI.map((s: SubredditWithAiSuggestion) => [
        s.name,
        s.display_name_prefixed || '',
        s.title || '',
        s.subscribers || 0,
        s.primary_category || '',
        s.ai_suggestion?.suggested_category || '',
        s.ai_suggestion?.confidence_score || '',
        s.ai_suggestion?.user_feedback || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row: CsvRow) => row.join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="selected-subreddits-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'No data specified for export' 
    }, { status: 400 })

  } catch (error) {
    console.error('Error in POST export:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}