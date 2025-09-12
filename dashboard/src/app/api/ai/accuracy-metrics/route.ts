import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Type definitions
interface AiCategorizationSuggestion {
  id: string
  subreddit_id: string
  suggested_category: string
  confidence_score: number
  user_feedback?: 'accepted' | 'rejected' | 'modified'
  actual_category?: string
  created_at: string
  cost_usd?: number
  tokens_used?: number
}

// Removed unused AiCategorizationSession interface

interface CategoryStats {
  total: number
  accurate: number
}

interface CategoryBreakdown {
  category: string
  total: number
  accurate: number
  accuracy: number
}

interface ConfidenceDistribution {
  range: string
  count: number
  withFeedback: number
  accuracy: number
}

interface DailyMetrics {
  date: string
  suggestions: number
  withFeedback: number
  accuracy: number
  avgConfidence: number
  cost: number
}

// GET /api/ai/accuracy-metrics - Get AI categorization accuracy metrics
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')
    const confidenceThreshold = parseFloat(url.searchParams.get('confidenceThreshold') || '70')
    
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get overall metrics
    const { data: overallMetrics, error: metricsError } = await supabase
      .from('ai_categorization_suggestions')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())

    if (metricsError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch metrics' 
      }, { status: 500 })
    }

    if (!overallMetrics || overallMetrics.length === 0) {
      return NextResponse.json({ 
        success: true,
        metrics: {
          totalSuggestions: 0,
          totalWithFeedback: 0,
          accuracyRate: 0,
          avgConfidence: 0,
          totalCost: 0,
          totalTokens: 0,
          highConfidenceAccuracy: 0,
          lowConfidenceAccuracy: 0,
          categoryBreakdown: [],
          confidenceDistribution: [],
          dailyMetrics: []
        }
      })
    }

    // Calculate accuracy metrics
    const withFeedback = overallMetrics.filter((s: AiCategorizationSuggestion) => s.user_feedback)
    const accepted = withFeedback.filter((s: AiCategorizationSuggestion) => s.user_feedback === 'accepted')
    const accurateGuesses = withFeedback.filter((s: AiCategorizationSuggestion) => 
      s.user_feedback === 'accepted' || 
      (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)
    )

    const accuracyRate = withFeedback.length > 0 ? 
      (accurateGuesses.length / withFeedback.length) * 100 : 0

    // High confidence vs low confidence accuracy
    const highConfidenceSuggestions = withFeedback.filter((s: AiCategorizationSuggestion) => s.confidence_score >= confidenceThreshold)
    const lowConfidenceSuggestions = withFeedback.filter((s: AiCategorizationSuggestion) => s.confidence_score < confidenceThreshold)
    
    const highConfidenceAccurate = highConfidenceSuggestions.filter((s: AiCategorizationSuggestion) => 
      s.user_feedback === 'accepted' || 
      (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)
    )
    const lowConfidenceAccurate = lowConfidenceSuggestions.filter((s: AiCategorizationSuggestion) => 
      s.user_feedback === 'accepted' || 
      (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)
    )

    const highConfidenceAccuracy = highConfidenceSuggestions.length > 0 ?
      (highConfidenceAccurate.length / highConfidenceSuggestions.length) * 100 : 0
    const lowConfidenceAccuracy = lowConfidenceSuggestions.length > 0 ?
      (lowConfidenceAccurate.length / lowConfidenceSuggestions.length) * 100 : 0

    // Category breakdown
    const categoryStats = new Map<string, CategoryStats>()
    withFeedback.forEach((s: AiCategorizationSuggestion) => {
      if (!categoryStats.has(s.suggested_category)) {
        categoryStats.set(s.suggested_category, { total: 0, accurate: 0 })
      }
      const stats = categoryStats.get(s.suggested_category)!
      stats.total += 1
      if (s.user_feedback === 'accepted' || 
          (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)) {
        stats.accurate += 1
      }
    })

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      total: stats.total,
      accurate: stats.accurate,
      accuracy: (stats.accurate / stats.total) * 100
    })).sort((a, b) => b.total - a.total)

    // Confidence distribution
    const confidenceBuckets = [0, 20, 40, 60, 80, 90, 95]
    const confidenceDistribution: ConfidenceDistribution[] = []
    
    for (let i = 0; i < confidenceBuckets.length; i++) {
      const min = confidenceBuckets[i]
      const max = confidenceBuckets[i + 1] || 100
      const inRange = overallMetrics.filter((s: AiCategorizationSuggestion) => s.confidence_score >= min && s.confidence_score < max)
      const withFeedbackInRange = inRange.filter((s: AiCategorizationSuggestion) => s.user_feedback)
      const accurateInRange = withFeedbackInRange.filter((s: AiCategorizationSuggestion) => 
        s.user_feedback === 'accepted' || 
        (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)
      )
      
      confidenceDistribution.push({
        range: `${min}-${max}%`,
        count: inRange.length,
        withFeedback: withFeedbackInRange.length,
        accuracy: withFeedbackInRange.length > 0 ? 
          (accurateInRange.length / withFeedbackInRange.length) * 100 : 0
      })
    }

    // Daily metrics for the last 7 days
    const dailyMetrics: DailyMetrics[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()
      
      const dayMetrics = overallMetrics.filter((s: AiCategorizationSuggestion) => 
        s.created_at >= startOfDay && s.created_at <= endOfDay
      )
      
      const dayWithFeedback = dayMetrics.filter((s: AiCategorizationSuggestion) => s.user_feedback)
      const dayAccurate = dayWithFeedback.filter((s: AiCategorizationSuggestion) => 
        s.user_feedback === 'accepted' || 
        (s.user_feedback === 'modified' && s.actual_category === s.suggested_category)
      )
      
      dailyMetrics.push({
        date: date.toISOString().split('T')[0],
        suggestions: dayMetrics.length,
        withFeedback: dayWithFeedback.length,
        accuracy: dayWithFeedback.length > 0 ? 
          (dayAccurate.length / dayWithFeedback.length) * 100 : 0,
        avgConfidence: dayMetrics.length > 0 ?
          dayMetrics.reduce((sum: number, s: AiCategorizationSuggestion) => sum + s.confidence_score, 0) / dayMetrics.length : 0,
        cost: dayMetrics.reduce((sum: number, s: AiCategorizationSuggestion) => sum + (s.cost_usd || 0), 0)
      })
    }

    // Get session metrics
    const { data: sessions } = await supabase
      .from('ai_categorization_sessions')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    const metrics = {
      totalSuggestions: overallMetrics.length,
      totalWithFeedback: withFeedback.length,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      avgConfidence: Math.round((overallMetrics.reduce((sum: number, s: AiCategorizationSuggestion) => sum + s.confidence_score, 0) / overallMetrics.length) * 100) / 100,
      totalCost: overallMetrics.reduce((sum: number, s: AiCategorizationSuggestion) => sum + (s.cost_usd || 0), 0),
      totalTokens: overallMetrics.reduce((sum: number, s: AiCategorizationSuggestion) => sum + (s.tokens_used || 0), 0),
      highConfidenceAccuracy: Math.round(highConfidenceAccuracy * 100) / 100,
      lowConfidenceAccuracy: Math.round(lowConfidenceAccuracy * 100) / 100,
      categoryBreakdown,
      confidenceDistribution,
      dailyMetrics,
      sessions: sessions || [],
      feedbackStats: {
        accepted: accepted.length,
        rejected: withFeedback.filter((s: AiCategorizationSuggestion) => s.user_feedback === 'rejected').length,
        modified: withFeedback.filter((s: AiCategorizationSuggestion) => s.user_feedback === 'modified').length
      }
    }

    return NextResponse.json({ 
      success: true,
      metrics,
      period: `Last ${days} days`,
      confidenceThreshold
    })

  } catch (error) {
    console.error('Error fetching accuracy metrics:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}