import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type Subreddit, type Post } from '@/lib/supabase/index'

// ============================================================================
// TYPES
// ============================================================================

type AllowedCategory = 'Ok' | 'No Seller' | 'Non Related'
type SortField = 'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour' | 'moderator_score' | 'health_score'
type SortDirection = 'asc' | 'desc'

interface Creator {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  account_age_days: number | null
  icon_img: string | null
  our_creator: boolean
}

type BaseSubreddit = Omit<Subreddit, 'review'> & { 
  review: Subreddit['review'] | AllowedCategory | null 
}

interface SubredditWithPosts extends Omit<BaseSubreddit, 'category_text' | 'created_at'> {
  recent_posts?: Post[]
  post_count?: number
  avg_score?: number
  engagement_score?: number
  best_posting_hour?: number
  moderator_activity_score?: number
  community_health_score?: number
  categories?: string[]
  category_text?: string | null
}

interface UsePostingAnalysisReturn {
  // Data
  subreddits: SubredditWithPosts[]
  filteredSubreddits: SubredditWithPosts[]
  topCreators: Creator[]
  
  // Loading states
  loading: boolean
  creatorsLoading: boolean
  
  // Filter states
  searchQuery: string
  selectedCategories: string[]
  sfwOnly: boolean
  sortBy: SortField
  sortDirection: SortDirection
  
  // Actions
  setSearchQuery: (query: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSfwOnly: (sfw: boolean) => void
  setSortBy: (sort: SortField) => void
  setSortDirection: (direction: SortDirection) => void
  handleSort: (field: SortField, direction: SortDirection) => void
  clearAllFilters: () => void
  
  // Computed values
  totalResults: number
  filteredResults: number
  sfwCount: number
  
  // Error handling
  error: string | null
  setError: (error: string | null) => void
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export function usePostingAnalysis(): UsePostingAnalysisReturn {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [subreddits, setSubreddits] = useState<SubredditWithPosts[]>([])
  const [topCreators, setTopCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [creatorsLoading, setCreatorsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sfwOnly, setSfwOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortField>('engagement')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const fetchSubreddits = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const query = supabase
        .from('reddit_subreddits')
        .select(`
          id, name, display_name_prefixed, title, description, subscribers,
          subscriber_engagement_ratio, avg_upvotes_per_post, over18,
          community_icon, banner_img, review, category_text,
          recent_posts, post_count, avg_score, engagement_score,
          best_posting_hour, moderator_activity_score, community_health_score
        `)
        .eq('review', 'Ok') // Only show approved subreddits for posting
        .not('category_text', 'is', null) // Only categorized subreddits
        .order('subscriber_engagement_ratio', { ascending: false })
        .limit(500) // Reasonable limit for posting recommendations
      
      const { data, error: fetchError } = await query
      
      if (fetchError) {
        throw new Error(`Failed to fetch subreddits: ${fetchError.message}`)
      }
      
      setSubreddits((data || []) as unknown as SubredditWithPosts[])
      
    } catch (err) {
      console.error('Failed to fetch subreddits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch subreddits')
    } finally {
      setLoading(false)
    }
  }, [])
  
  const fetchTopCreators = useCallback(async () => {
    try {
      setCreatorsLoading(true)
      
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data, error: fetchError } = await supabase
        .from('reddit_users')
        .select('id, username, link_karma, comment_karma, account_age_days, icon_img, our_creator')
        .eq('our_creator', true)
        .order('overall_user_score', { ascending: false })
        .limit(10)
      
      if (fetchError) {
        throw new Error(`Failed to fetch creators: ${fetchError.message}`)
      }
      
      setTopCreators((data || []) as unknown as Creator[])
      
    } catch (err) {
      console.error('Failed to fetch top creators:', err)
    } finally {
      setCreatorsLoading(false)
    }
  }, [])
  
  // ============================================================================
  // FILTERING AND SORTING
  // ============================================================================
  
  const filteredSubreddits = useMemo(() => {
    let filtered = [...subreddits]
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(sub => 
        sub.name?.toLowerCase().includes(query) ||
        sub.display_name_prefixed?.toLowerCase().includes(query) ||
        sub.title?.toLowerCase().includes(query) ||
        sub.description?.toLowerCase().includes(query) ||
        sub.category_text?.toLowerCase().includes(query)
      )
    }
    
    // Apply SFW filter
    if (sfwOnly) {
      filtered = filtered.filter(sub => !sub.over18)
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(sub => {
        const category = sub.category_text ?? null
        return !!category && selectedCategories.includes(category)
      })
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: number | undefined
      let bVal: number | undefined
      
      switch (sortBy) {
        case 'subscribers':
          aVal = a.subscribers || 0
          bVal = b.subscribers || 0
          break
        case 'avg_upvotes':
          aVal = a.avg_upvotes_per_post || 0
          bVal = b.avg_upvotes_per_post || 0
          break
        case 'engagement':
          aVal = a.subscriber_engagement_ratio || 0
          bVal = b.subscriber_engagement_ratio || 0
          break
        case 'best_hour':
          aVal = a.best_posting_hour || 0
          bVal = b.best_posting_hour || 0
          break
        case 'moderator_score':
          aVal = a.moderator_activity_score || 0
          bVal = b.moderator_activity_score || 0
          break
        case 'health_score':
          aVal = a.community_health_score || 0
          bVal = b.community_health_score || 0
          break
        default:
          return 0
      }
      
      const comparison = aVal - bVal
      return sortDirection === 'desc' ? -comparison : comparison
    })
    
    return filtered
  }, [subreddits, searchQuery, sfwOnly, selectedCategories, sortBy, sortDirection])
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const totalResults = subreddits.length
  const filteredResults = filteredSubreddits.length
  const sfwCount = subreddits.filter(sub => !sub.over18).length
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const handleSort = useCallback((field: SortField, direction: SortDirection) => {
    setSortBy(field)
    setSortDirection(direction)
  }, [])
  
  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategories([])
    setSfwOnly(false)
    setSortBy('engagement')
    setSortDirection('desc')
  }, [])
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initial data load
  useEffect(() => {
    Promise.all([
      fetchSubreddits(),
      fetchTopCreators()
    ]).catch(err => {
      console.error('Initial data load failed:', err)
    })
  }, [fetchSubreddits, fetchTopCreators])
  
  return {
    // Data
    subreddits,
    filteredSubreddits,
    topCreators,
    
    // Loading states
    loading,
    creatorsLoading,
    
    // Filter states
    searchQuery,
    selectedCategories,
    sfwOnly,
    sortBy,
    sortDirection,
    
    // Actions
    setSearchQuery,
    setSelectedCategories,
    setSfwOnly,
    setSortBy,
    setSortDirection,
    handleSort,
    clearAllFilters,
    
    // Computed values
    totalResults,
    filteredResults,
    sfwCount,
    
    // Error handling
    error,
    setError
  }
}
