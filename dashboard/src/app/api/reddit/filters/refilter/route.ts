import { logger } from '@/lib/logger'
import { protectedApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface Subreddit {
  id: number
  name: string
  title?: string
  description?: string
  public_description?: string
  subscribers?: number
  over_18?: boolean
  rules_data?: Record<string, unknown>
}

export const POST = protectedApi(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { subreddit_names, limit = 100 } = await request.json()
    
    let query = supabase
      .from('subreddits')
      .select('*')
    
    if (subreddit_names && Array.isArray(subreddit_names)) {
      // Re-filter specific subreddits
      query = query.in('name', subreddit_names)
    } else {
      // Re-filter unprocessed subreddits
      query = query
        .or('filter_status.is.null,filter_status.eq.unprocessed')
        .limit(limit)
    }
    
    const { data: subreddits, error } = await query
    
    if (error) {
      logger.error('Error fetching subreddits for re-filtering:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!subreddits || subreddits.length === 0) {
      return NextResponse.json({ 
        title: 'No subreddits found for re-filtering',
        stats: { processed: 0, filtered: 0, passed: 0 }
      })
    }
    
    // This would normally call the Python filtering logic
    // For now, we'll implement a basic TypeScript version of the filtering logic
    const stats = { processed: 0, filtered: 0, passed: 0, errors: 0 }
    const results = []
    
    for (const subreddit of subreddits) {
      try {
        const filterResult = await applyBasicFiltering(subreddit)
        
        // Update the subreddit in database
        const { error: updateError } = await supabase
          .from('subreddits')
          .update({
            filter_status: filterResult.filter_status,
            filter_reason: filterResult.filter_reason,
            filter_keywords: filterResult.filter_keywords,
            seller_ban_detected: filterResult.seller_ban_detected,
            verification_required_detected: filterResult.verification_required_detected,
            filtered_at: new Date().toISOString()
          })
          .eq('id', subreddit.id)
        
        if (updateError) {
          logger.error(`Error updating subreddit ${subreddit.name}:`, updateError)
          stats.errors++
          continue
        }
        
        results.push({
          name: subreddit.name,
          filter_status: filterResult.filter_status,
          filter_reason: filterResult.filter_reason
        })
        
        stats.processed++
        if (filterResult.filter_status === 'filtered') {
          stats.filtered++
        } else {
          stats.passed++
        }
        
      } catch (_error) {
        logger.error(`Error processing subreddit ${subreddit.name}:`, error)
        stats.errors++
      }
    }
    
    return NextResponse.json({ 
      title: `Re-filtering complete: ${stats.processed} processed`,
      stats,
      results: results.slice(0, 20) // Return first 20 results for preview
    })
    
  } catch (error) {
    logger.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Basic filtering logic implemented in TypeScript
async function applyBasicFiltering(subreddit: Subreddit) {
  const name = subreddit.name?.toLowerCase() || ''
  const title = subreddit.title?.toLowerCase() || ''
  const description = subreddit.description?.toLowerCase() || ''
  const publicDescription = subreddit.public_description?.toLowerCase() || ''
  
  const combinedText = `${name} ${title} ${description} ${publicDescription}`
  
  // Extract rules text
  let rulesText = ''
  if (subreddit.rules_data && typeof subreddit.rules_data === 'object') {
    rulesText = Object.values(subreddit.rules_data).join(' ').toLowerCase()
  }
  
  const filterKeywords = {
    explicit_porn: ['gonewild', 'nsfw', 'nude', 'naked', 'porn', 'sex', 'hardcore', 'xxx', 'amateur', 'hookup'],
    male_focused: ['cock', 'dick', 'penis', 'gay', 'men', 'dudes', 'bros', 'male', 'masculine'],
    unrelated: ['gaming', 'politics', 'news', 'sports', 'crypto', 'stocks', 'tech', 'programming', 'food', 'recipes', 'cooking', 'travel'],
    seller_ban_indicators: ['no sellers', 'no onlyfans', 'no selling', 'sellers banned', 'no promotion']
  }
  
  const analysis = {
    matched_keywords: {} as Record<string, string[]>,
    total_matches: 0,
    seller_ban_detected: false,
    verification_required_detected: false,
    filter_reasons: [] as string[]
  }
  
  // Check for keyword matches
  let categoriesWithMatches = 0
  for (const [category, keywords] of Object.entries(filterKeywords)) {
    analysis.matched_keywords[category] = []
    
    for (const keyword of keywords) {
      if (combinedText.includes(keyword) || rulesText.includes(keyword)) {
        analysis.matched_keywords[category].push(keyword)
        analysis.total_matches++
      }
    }
    
    if (analysis.matched_keywords[category].length > 0) {
      categoriesWithMatches++
    }
  }
  
  // Check for seller bans
  const sellerBanPatterns = [
    /no\s+sellers?\b/,
    /no\s+onlyfans\b/,
    /sellers?\s+banned?\b/,
    /no\s+promotion\b/
  ]
  
  for (const pattern of sellerBanPatterns) {
    if (pattern.test(rulesText) || pattern.test(combinedText)) {
      analysis.seller_ban_detected = true
      analysis.filter_reasons.push('Seller ban detected in rules')
      break
    }
  }
  
  // Check for verification requirements
  const verificationPatterns = [
    /verification\s+required\b/,
    /must\s+verify\b/,
    /verified\s+only\b/
  ]
  
  for (const pattern of verificationPatterns) {
    if (pattern.test(rulesText) || pattern.test(combinedText)) {
      analysis.verification_required_detected = true
      break
    }
  }
  
  // Determine if should filter (conservative approach)
  let shouldFilter = false
  
  if (analysis.seller_ban_detected) {
    shouldFilter = true
    analysis.filter_reasons.push('Seller ban detected')
  } else if (categoriesWithMatches >= 2) {
    shouldFilter = true
    analysis.filter_reasons.push(`Keywords matched in ${categoriesWithMatches} categories`)
  } else if (analysis.total_matches >= 2) {
    shouldFilter = true
    analysis.filter_reasons.push(`Multiple keywords matched: ${analysis.total_matches}`)
  }
  
  return {
    filter_status: shouldFilter ? 'filtered' : 'passed',
    filter_reason: analysis.filter_reasons.join('; ') || null,
    filter_keywords: Object.values(analysis.matched_keywords).flat(),
    seller_ban_detected: analysis.seller_ban_detected,
    verification_required_detected: analysis.verification_required_detected
  }
}
