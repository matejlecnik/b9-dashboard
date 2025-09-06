import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface CategorizationSuggestion {
  category: string
  confidence: number
  reasoning: string
}

export interface CategorizationResult {
  suggestions: CategorizationSuggestion[]
  cost: number
  tokens_used: number
}

// Common Reddit subreddit categories based on marketing relevance
const MARKETING_CATEGORIES = [
  'Adult Content/NSFW',
  'Fashion & Beauty', 
  'Fitness & Health',
  'Gaming',
  'Technology',
  'Food & Cooking',
  'Travel & Lifestyle',
  'Art & Design',
  'Photography',
  'Music',
  'Entertainment',
  'Education',
  'Business & Finance',
  'Home & DIY',
  'Relationships & Dating',
  'Parenting',
  'Pets & Animals',
  'Sports',
  'Automotive',
  'Memes & Humor',
  'News & Politics',
  'Science',
  'Self-Improvement',
  'Shopping & Deals',
  'Local Community'
]

export async function categorizeSubreddit(subreddit: {
  name: string
  display_name_prefixed: string
  title?: string
  public_description?: string
  over18: boolean
  subscribers?: number
  top_content_type?: string
  avg_upvotes_per_post: number
}): Promise<CategorizationResult> {
  
  const prompt = `You are an expert Reddit subreddit categorization system for marketing purposes. Analyze this subreddit and suggest the best marketing category.

SUBREDDIT DATA:
- Name: ${subreddit.name}
- Display Name: ${subreddit.display_name_prefixed}
- Title: ${subreddit.title || 'Not provided'}
- Description: ${subreddit.public_description || 'Not provided'}
- NSFW: ${subreddit.over18 ? 'Yes' : 'No'}
- Subscribers: ${subreddit.subscribers ? subreddit.subscribers.toLocaleString() : 'Unknown'}
- Top Content Type: ${subreddit.top_content_type || 'Unknown'}
- Avg Upvotes Per Post: ${subreddit.avg_upvotes_per_post}

AVAILABLE CATEGORIES:
${MARKETING_CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

INSTRUCTIONS:
1. Analyze the subreddit's name, title, description, and NSFW status
2. Choose the SINGLE most appropriate category from the list above
3. Provide a confidence score (0-100) based on how certain you are
4. Give a brief reasoning for your choice

RESPONSE FORMAT (JSON only):
{
  "category": "exact category name from list",
  "confidence": 85,
  "reasoning": "Brief explanation of why this category fits best"
}

Respond with ONLY the JSON object, no other text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a subreddit categorization expert. Respond only with valid JSON.'
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3, // Lower temperature for more consistent categorization
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    let suggestion: CategorizationSuggestion
    try {
      suggestion = JSON.parse(content)
    } catch (parseError) {
      // Fallback parsing if JSON is malformed
      const categoryMatch = content.match(/"category":\s*"([^"]+)"/i)
      const confidenceMatch = content.match(/"confidence":\s*(\d+)/i)
      const reasoningMatch = content.match(/"reasoning":\s*"([^"]+)"/i)
      
      suggestion = {
        category: categoryMatch ? categoryMatch[1] : 'Adult Content/NSFW',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 50,
        reasoning: reasoningMatch ? reasoningMatch[1] : 'Could not parse reasoning'
      }
    }

    // Validate category is in our list
    if (!MARKETING_CATEGORIES.includes(suggestion.category)) {
      // Find closest match or default to Adult Content for NSFW
      suggestion.category = subreddit.over18 ? 'Adult Content/NSFW' : 'Entertainment'
      suggestion.confidence = Math.max(30, suggestion.confidence - 20)
      suggestion.reasoning += ' (Category corrected to valid option)'
    }

    // Calculate cost (GPT-3.5-turbo pricing: ~$0.0015 per 1K tokens)
    const tokensUsed = response.usage?.total_tokens || 0
    const cost = (tokensUsed / 1000) * 0.0015

    return {
      suggestions: [suggestion],
      cost: cost,
      tokens_used: tokensUsed
    }

  } catch (error) {
    console.error('Error categorizing subreddit:', error)
    
    // Fallback categorization based on simple rules
    let fallbackCategory = 'Entertainment'
    let confidence = 30
    let reasoning = 'Fallback categorization due to API error'
    
    if (subreddit.over18) {
      fallbackCategory = 'Adult Content/NSFW'
      confidence = 70
      reasoning = 'NSFW subreddit automatically categorized as Adult Content'
    } else if (subreddit.name.toLowerCase().includes('game') || subreddit.title?.toLowerCase().includes('game')) {
      fallbackCategory = 'Gaming'
      confidence = 50
    } else if (subreddit.name.toLowerCase().includes('tech') || subreddit.title?.toLowerCase().includes('tech')) {
      fallbackCategory = 'Technology'
      confidence = 50
    }

    return {
      suggestions: [{
        category: fallbackCategory,
        confidence: confidence,
        reasoning: reasoning
      }],
      cost: 0,
      tokens_used: 0
    }
  }
}

export async function bulkCategorizeSubreddits(subreddits: Array<{
  id: number
  name: string
  display_name_prefixed: string
  title?: string
  public_description?: string
  over18: boolean
  subscribers?: number
  top_content_type?: string
  avg_upvotes_per_post: number
}>): Promise<{
  results: Array<{
    id: number
    name: string
    suggestion: CategorizationSuggestion
  }>
  totalCost: number
  totalTokens: number
}> {
  const results = []
  let totalCost = 0
  let totalTokens = 0

  // Process in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < subreddits.length; i += batchSize) {
    const batch = subreddits.slice(i, i + batchSize)
    const batchPromises = batch.map(async (subreddit) => {
      const result = await categorizeSubreddit(subreddit)
      return {
        id: subreddit.id,
        name: subreddit.name,
        suggestion: result.suggestions[0],
        cost: result.cost,
        tokens: result.tokens_used
      }
    })

    const batchResults = await Promise.all(batchPromises)
    
    for (const result of batchResults) {
      results.push({
        id: result.id,
        name: result.name,
        suggestion: result.suggestion
      })
      totalCost += result.cost
      totalTokens += result.tokens
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < subreddits.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return {
    results,
    totalCost,
    totalTokens
  }
}

export { MARKETING_CATEGORIES }