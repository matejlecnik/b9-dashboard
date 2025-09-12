// OpenAI functionality moved to API backend
// This file now only exports types and constants for the frontend

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
export const MARKETING_CATEGORIES = [
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

// Note: Actual AI categorization is now handled by the API backend
// Use the /api/categorization endpoints instead of calling OpenAI directly from the frontend