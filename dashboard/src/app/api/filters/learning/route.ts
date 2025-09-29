import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const { data: patterns, error, count } = await supabase
      .from('filter_learning_patterns')
      .select(`
        *,
        subreddits (
          name,
          title,
          review,
          filter_status
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Calculate accuracy statistics
    const accuracy_stats = calculateAccuracyStats(patterns || [])
    
    return NextResponse.json({ 
      patterns,
      total_count: count,
      accuracy_stats
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { 
      subreddit_name, 
      predicted_filter, 
      actual_user_decision, 
      keywords_matched = [],
      confidence_score = 0.0 
    } = await request.json()
    
    if (!subreddit_name || predicted_filter === undefined || !actual_user_decision) {
      return NextResponse.json(
        { error: 'subreddit_name, predicted_filter, and actual_user_decision are required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('filter_learning_patterns')
      .insert({
        subreddit_name,
        predicted_filter,
        actual_user_decision,
        keywords_matched,
        confidence_score,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ learning_pattern: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface FilterPattern {
  predicted_filter: boolean
  actual_user_decision: string
}

// Helper function to calculate accuracy statistics
function calculateAccuracyStats(patterns: FilterPattern[]) {
  if (!patterns || patterns.length === 0) {
    return {
      total_predictions: 0,
      correct_predictions: 0,
      accuracy_percentage: 0,
      false_positives: 0,
      false_negatives: 0,
      precision: 0,
      recall: 0
    }
  }
  
  let correct_predictions = 0
  let false_positives = 0  // Predicted filter=true, but user marked as "Ok"
  let false_negatives = 0  // Predicted filter=false, but user marked as "No Seller" or "Non Related"
  let true_positives = 0   // Predicted filter=true, user marked as "No Seller" or "Non Related"
  let true_negatives = 0   // Predicted filter=false, user marked as "Ok"
  
  for (const pattern of patterns) {
    const predicted_should_filter = pattern.predicted_filter
    const actual_should_filter = pattern.actual_user_decision !== 'Ok'
    
    if (predicted_should_filter === actual_should_filter) {
      correct_predictions++
      
      if (predicted_should_filter) {
        true_positives++
      } else {
        true_negatives++
      }
    } else {
      if (predicted_should_filter && !actual_should_filter) {
        false_positives++
      } else if (!predicted_should_filter && actual_should_filter) {
        false_negatives++
      }
    }
  }
  
  const total_predictions = patterns.length
  const accuracy_percentage = total_predictions > 0 
    ? (correct_predictions / total_predictions * 100).toFixed(1) 
    : 0
    
  const precision = (true_positives + false_positives) > 0 
    ? (true_positives / (true_positives + false_positives) * 100).toFixed(1)
    : 0
    
  const recall = (true_positives + false_negatives) > 0 
    ? (true_positives / (true_positives + false_negatives) * 100).toFixed(1)
    : 0
  
  return {
    total_predictions,
    correct_predictions,
    accuracy_percentage: parseFloat(accuracy_percentage as string),
    false_positives,
    false_negatives,
    true_positives,
    true_negatives,
    precision: parseFloat(precision as string),
    recall: parseFloat(recall as string)
  }
}