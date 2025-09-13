'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type React from 'react'
import { supabase, type Subreddit, type Post } from '../../../lib/supabase'

interface Creator {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  account_age_days: number | null
  icon_img: string | null
  our_creator: boolean
  total_posts?: number
  avg_score?: number
  best_subreddit?: string
  subreddit_description?: string | null
  verified?: boolean
  is_gold?: boolean
  has_verified_email?: boolean
  created_utc?: string | null
}
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { PostingCategoryFilter } from '@/components/PostingCategoryFilter'
import { DiscoveryTable } from '@/components/DiscoveryTable'
import { 
  ChevronDown,
  X,
  UserPlus,
  AlertCircle,
  Search
} from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'

type AllowedCategory = 'Ok' | 'No Seller' | 'Non Related'
type SortField = 'avg_upvotes' | 'min_post_karma'
type SortDirection = 'asc' | 'desc'

type BaseSubreddit = Omit<Subreddit, 'review'> & { review: Subreddit['review'] | AllowedCategory | null }

interface SubredditWithPosts extends Omit<BaseSubreddit, 'category_text' | 'created_at'> {
  recent_posts?: Post[]
  public_description?: string | null
  avg_engagement_velocity?: number | null
  category_text?: string | null
  min_account_age_days?: number | null
  min_comment_karma?: number | null
  min_post_karma?: number | null
  allow_images?: boolean | null
  moderator_activity_score?: number | null
  community_health_score?: number | null
  image_post_avg_score?: number | null
  video_post_avg_score?: number | null
  text_post_avg_score?: number | null
  created_at?: string
}

const PAGE_SIZE = 30


export default function PostingPage() {
  const { addToast } = useToast()
  const [okSubreddits, setOkSubreddits] = useState<SubredditWithPosts[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [loadingCreators, setLoadingCreators] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ id: number, username: string } | null>(null)
  const [searchingUser, setSearchingUser] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Creator[]>([])
  const [removingCreator, setRemovingCreator] = useState<number | null>(null)
  const [creatorStats, setCreatorStats] = useState<Record<number, { posts: number, avgScore: number, topSubreddit: string }>>({})
  const [, setLoadingStats] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setLastUpdated] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const availableCategories = [
    'Age Demographics',
    'Ass & Booty',
    'Body Types & Features',
    'Boobs & Chest',
    'Clothed & Dressed',
    'Cosplay & Fantasy',
    'Ethnic & Cultural',
    'Feet & Foot Fetish',
    'Full Body & Nude',
    'Goth & Alternative',
    'Gym & Fitness',
    'Interactive & Personalized',
    'Lifestyle & Themes',
    'Lingerie & Underwear',
    'OnlyFans Promotion',
    'Selfie & Amateur',
    'Specific Body Parts'
  ]
  const [selectedCategories, setSelectedCategories] = useState<string[]>(availableCategories)
  // Filters & sorting
  const [sfwOnly, setSfwOnly] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<SortField>('avg_upvotes')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  // Counts for UI
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)

  // Load filter counts for UI
  const loadFilterCounts = useCallback(async () => {
    if (!supabase) return
    try {
      const sb = supabase as NonNullable<typeof supabase>
      const [sfwResult, nsfwResult] = await Promise.all([
        sb.from('subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .eq('over18', false),
        sb.from('subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .eq('over18', true)
      ])
      setSfwCount(sfwResult.count || 0)
      setNsfwCount(nsfwResult.count || 0)
      const { data: categoryData } = await sb
        .from('subreddits')
        .select('category_text')
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%')
        .not('category_text', 'is', null)
        .not('category_text', 'eq', '')
      const counts: Record<string, number> = {}
      if (categoryData && Array.isArray(categoryData)) {
        categoryData.forEach(item => {
          if (item && item.category_text) {
            counts[item.category_text] = (counts[item.category_text] || 0) + 1
          }
        })
      }
      setCategoryCounts(counts)
    } catch {
      setCategoryCounts({})
      setSfwCount(0)
      setNsfwCount(0)
    }
  }, [])

  // Optimized fetch with pagination and selective fields
  const fetchOkSubreddits = useCallback(async (page = 0, append = false) => {
    if (!append) setLoading(true)
    try {
      if (!supabase) {
        console.error('Supabase client not initialized')
        throw new Error('Supabase client not initialized')
      }
      const sb = supabase as NonNullable<typeof supabase>
      
      // Build sort column mapping
      const sortColumnMap: Record<SortField, string> = {
        'avg_upvotes': 'avg_upvotes_per_post',
        'min_post_karma': 'min_post_karma'
      }
      
      const sortColumn = sortColumnMap[sortBy]
      
      // Build the base query
      let query = sb
        .from('subreddits')
        .select(`
          id, name, display_name_prefixed, title, public_description,
          subscribers, avg_upvotes_per_post, subscriber_engagement_ratio,
          best_posting_hour, best_posting_day, over18, category_text,
          moderator_activity_score, community_health_score,
          image_post_avg_score, video_post_avg_score, text_post_avg_score,
          last_scraped_at, min_account_age_days, min_comment_karma, 
          min_post_karma, allow_images, icon_img, community_icon,
          top_content_type, avg_engagement_velocity, accounts_active
        `)
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%')
      
      // Apply category filter server-side
      if (selectedCategories.length === 0) {
        // Show only uncategorized
        query = query.or('category_text.is.null,category_text.eq.')
      } else if (selectedCategories.length < availableCategories.length) {
        // Show only selected categories
        query = query.in('category_text', selectedCategories)
      }
      // If all categories selected, no additional filter needed
      
      // Apply SFW filter
      if (sfwOnly) {
        query = query.eq('over18', false)
      }
      
      // Apply sorting and pagination
      const { data: subreddits, error } = await query
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        
      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      
      const processedSubreddits: SubredditWithPosts[] = (subreddits || []).map((subreddit: any) => ({
        ...subreddit,
        recent_posts: [], // Will be loaded lazily when expanded
        review: subreddit.review ?? null,
        category_text: subreddit.category_text || null, // Explicitly preserve category_text
        created_at: new Date().toISOString()
      })) as SubredditWithPosts[]

      if (append) {
        setOkSubreddits(prev => [...prev, ...processedSubreddits])
      } else {
        setOkSubreddits(processedSubreddits)
      }
      
      setHasMore(processedSubreddits.length === PAGE_SIZE)
      setLastUpdated(new Date())
      
      // Load counts for filters on first page
      if (page === 0) {
        await loadFilterCounts()
      }
    } catch (error) {
      console.error('Error fetching Ok subreddits:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      addToast({
        type: 'error',
        title: 'Error Loading Posting Data',
        description: 'Failed to load subreddits and posts. Please try again.',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortDirection, addToast, loadFilterCounts, selectedCategories, availableCategories.length, sfwOnly])
  
  
  
  // Fetch stats for creators
  const fetchCreatorStats = useCallback(async (usernames: string[]) => {
    try {
      if (!supabase) return
      setLoadingStats(true)
      const sb = supabase as NonNullable<typeof supabase>
      
      const stats: Record<number, { posts: number, avgScore: number, topSubreddit: string }> = {}
      
      for (const username of usernames) {
        const { data: posts } = await sb
          .from('posts')
          .select('score, subreddit_name')
          .eq('author', username)
          .order('score', { ascending: false })
          .limit(100)
        
        if (posts && posts.length > 0) {
          const avgScore = posts.reduce((sum, p) => sum + p.score, 0) / posts.length
          const topSubreddit = posts[0].subreddit_name || ''
          const creator = creators.find(c => c.username === username)
          if (creator) {
            stats[creator.id] = {
              posts: posts.length,
              avgScore: Math.round(avgScore),
              topSubreddit
            }
          }
        }
      }
      
      setCreatorStats(stats)
    } catch (error) {
      console.error('Error fetching creator stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [creators])
  
  // Fetch creators marked as "our creator" with stats
  const fetchCreators = useCallback(async () => {
    setLoadingCreators(true)
    try {
      if (!supabase) return
      const sb = supabase as NonNullable<typeof supabase>
      
      const { data: creatorsData, error } = await sb
        .from('users')
        .select('*')
        .eq('our_creator', true)
        .order('link_karma', { ascending: false })
      
      if (error) throw error
      setCreators(creatorsData || [])
      
      // Fetch stats for each creator
      if (creatorsData && creatorsData.length > 0) {
        await fetchCreatorStats(creatorsData.map(c => c.username))
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Creators',
        description: error instanceof Error ? error.message : 'Failed to load creator accounts. Please try again.',
        duration: 5000
      })
    }
    setLoadingCreators(false)
  }, [addToast, fetchCreatorStats])
  
  // Search for users to add as creators
  const searchUsers = useCallback(async () => {
    if (!userSearchQuery.trim()) return
    
    setSearchingUser(true)
    try {
      if (!supabase) return
      const sb = supabase as NonNullable<typeof supabase>
      
      const { data: users, error } = await sb
        .from('users')
        .select('*')
        .ilike('username', `%${userSearchQuery}%`)
        .eq('our_creator', false)
        .limit(10)
        .order('link_karma', { ascending: false })
      
      if (error) throw error
      setSearchResults(users || [])
    } catch (error) {
      console.error('Error searching users:', error)
      addToast({
        type: 'error',
        title: 'Search Failed',
        description: 'Failed to search for users. Please try again.',
        duration: 3000
      })
    }
    setSearchingUser(false)
  }, [userSearchQuery, addToast])
  
  // Toggle account status
  const toggleCreator = useCallback(async (userId: number, makeCreator: boolean, username?: string) => {
    // If removing, show confirmation first
    if (!makeCreator && !username) {
      return
    }
    if (!makeCreator) {
      setConfirmRemove({ id: userId, username: username || '' })
      return
    }
    
    try {
      const response = await fetch('/api/users/toggle-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, our_creator: makeCreator })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update creator status')
      }
      
      addToast({
        type: 'success',
        title: makeCreator ? 'Account Added' : 'Account Removed',
        description: result.message?.replace('creator', 'account'),
        duration: 3000
      })
      
      // Refresh creators list
      await fetchCreators()
      setSearchResults([])
      setUserSearchQuery('')
    } catch (error) {
      console.error('Error toggling creator:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update creator status',
        duration: 5000
      })
    } finally {
      setRemovingCreator(null)
    }
  }, [fetchCreators, addToast])
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true)
  
  // Refresh when sort or filters change (after initial load)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // Reset to first page and re-fetch when filters change
    setCurrentPage(0)
    fetchOkSubreddits(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDirection, selectedCategories, sfwOnly])



  // Client-side filtering for text search only (other filters are applied server-side)
  const filteredOkSubreddits = useMemo(() => {
    let filtered = okSubreddits
    
    // Text search only - all other filtering is done server-side
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((subreddit) => (
        subreddit.name.toLowerCase().includes(q) ||
        subreddit.display_name_prefixed.toLowerCase().includes(q) ||
        (subreddit.public_description || subreddit.title || '').toLowerCase().includes(q) ||
        (subreddit.top_content_type || '').toLowerCase().includes(q) ||
        (subreddit.category_text || '').toLowerCase().includes(q)
      ))
    }
    
    return filtered
  }, [okSubreddits, searchQuery])

  // Handler functions for toolbar
  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortBy(field)
    setSortDirection(direction)
    setCurrentPage(0)
  }, [])
  
  const handleCategoriesChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories)
  }, [])
  
  const handleSfwChange = useCallback((sfwOnly: boolean) => {
    setSfwOnly(sfwOnly)
  }, [])
  
  const handleSelectAllCategories = useCallback(() => {
    setSelectedCategories(availableCategories)
  }, [])
  
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSfwOnly(false)
    setSelectedCategories(availableCategories) // Reset to all selected
  }, [])
  
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchOkSubreddits(nextPage, true)
    }
  }, [currentPage, hasMore, loading, fetchOkSubreddits])

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're near the bottom of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      // Load more when user is within 500px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 500) {
        handleLoadMore()
      }
    }

    // Add throttling to prevent excessive calls
    let timeoutId: NodeJS.Timeout
    const throttledScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 100)
    }

    window.addEventListener('scroll', throttledScroll)
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      clearTimeout(timeoutId)
    }
  }, [handleLoadMore])


  // Initial load
  useEffect(() => {
    setCurrentPage(0)
    fetchOkSubreddits(0, false)
    fetchCreators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Auto-refresh every 5 minutes (less frequent than before)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setCurrentPage(0)
      fetchOkSubreddits(0, false)
    }, 300000) // 5 minutes instead of 2
    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Final sorted subreddits (already sorted from server, just apply client filters)
  const sortedSubreddits = filteredOkSubreddits


  // Summary stats
  const showingCount = sortedSubreddits.length
  const totalCount = sfwCount + nsfwCount
  // const totalMembersFiltered = sortedSubreddits.reduce((sum, s) => sum + (s.subscribers || 0), 0)

  
  // Get Reddit profile URL
  const getRedditProfileUrl = (username: string) => {
    return `https://www.reddit.com/user/${username}`
  }

  return (
    <DashboardLayout
      title=""
      subtitle={undefined}
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Active Accounts Section - Enhanced */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CardTitle className="text-lg text-gray-900">Active Accounts</CardTitle>
                <Badge variant="outline" className="text-xs bg-pink-50 border-pink-200">
                  {creators.length} {creators.length === 1 ? 'account' : 'accounts'}
                </Badge>
              </div>
              <button
                onClick={() => setShowAddAccount(!showAddAccount)}
                className="group relative px-4 py-2 min-w-[110px] overflow-hidden rounded-md transition-all duration-300 hover:scale-[1.02] flex items-center justify-center text-xs font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20" />
                
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                {/* Content */}
                <div className="relative flex items-center">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                    Add Account
                  </span>
                </div>
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingCreators ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : creators.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-2">No active accounts</p>
                <p className="text-sm text-gray-500 mb-4">Add accounts to track their performance</p>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="group relative px-4 py-2.5 overflow-hidden rounded-md transition-all duration-300 hover:scale-[1.02] inline-flex items-center justify-center text-sm font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20" />
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  {/* Content */}
                  <div className="relative flex items-center">
                    <UserPlus className="h-4 w-4 mr-2 text-pink-500" />
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                      Add Your First Account
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {creators.map((creator) => {
                    const accountAge = creator.account_age_days ? 
                      creator.account_age_days > 365 ? 
                        `${Math.floor(creator.account_age_days / 365)}y` : 
                        `${creator.account_age_days}d` 
                      : 'New'
                    
                    return (
                      <div key={creator.id} className="relative bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => toggleCreator(creator.id, false, creator.username)}
                          disabled={removingCreator === creator.id}
                        >
                          {removingCreator === creator.id ? (
                            <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-gray-400" />
                          ) : (
                            <X className="h-2.5 w-2.5" />
                          )}
                        </Button>
                        
                        <div className="p-2">
                          {/* Avatar and Name */}
                          <div className="flex flex-col items-center text-center">
                            <a 
                              href={getRedditProfileUrl(creator.username)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative mb-1"
                              title={`u/${creator.username}`}
                            >
                              {creator.icon_img ? (
                                <Image
                                  src={creator.icon_img}
                                  alt={`${creator.username} avatar`}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 hover:border-b9-pink transition-colors"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-b9-pink to-pink-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                                  {creator.username.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </a>
                            <a 
                              href={getRedditProfileUrl(creator.username)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-b9-pink"
                              title={`u/${creator.username}`}
                            >
                              <span className="text-[10px] font-semibold text-gray-900 hover:text-b9-pink truncate block max-w-[60px]">
                                {creator.username}
                              </span>
                            </a>
                            
                            {/* Minimal badges */}
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <span className="text-[9px] px-1 py-0 bg-gray-100 text-gray-600 rounded">
                                {accountAge}
                              </span>
                              {creator.verified && (
                                <span className="text-[9px] text-blue-500" title="Verified">✓</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Compact Karma - Separate Post and Comment */}
                          <div className="mt-1.5 text-center space-y-0.5">
                            <div className="text-[9px] text-gray-600">
                              <span className="text-gray-500">PK</span> <span className="font-medium">{creator.link_karma > 1000 ? `${(creator.link_karma / 1000).toFixed(0)}k` : creator.link_karma}</span>
                            </div>
                            <div className="text-[9px] text-gray-600">
                              <span className="text-gray-500">CK</span> <span className="font-medium">{creator.comment_karma > 1000 ? `${(creator.comment_karma / 1000).toFixed(0)}k` : creator.comment_karma}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Add Account Section */}
                {showAddAccount && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center space-x-2 mb-4">
                      <UserPlus className="h-4 w-4 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Add New Account</h4>
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search Reddit username..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                          className="pl-10 pr-3"
                        />
                      </div>
                      <Button
                        onClick={searchUsers}
                        disabled={searchingUser || !userSearchQuery.trim()}
                        className="bg-b9-pink hover:bg-pink-600 text-white"
                      >
                        {searchingUser ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          'Search'
                        )}
                      </Button>
                    </div>
                    
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-600 mb-3">Found {searchResults.length} users:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {searchResults.map((user) => {
                            const accountAge = user.account_age_days ? 
                              user.account_age_days > 365 ? 
                                `${Math.floor(user.account_age_days / 365)}y` : 
                                `${user.account_age_days}d` 
                              : 'New'
                            
                            return (
                              <div key={user.id} className="relative bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all">
                                <div className="flex flex-col items-center text-center">
                                  {/* Avatar */}
                                  <div className="mb-2">
                                    {user.icon_img ? (
                                      <Image
                                        src={user.icon_img}
                                        alt={`${user.username} avatar`}
                                        width={36}
                                        height={36}
                                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 via-b9-pink to-pink-600 flex items-center justify-center text-white font-bold text-xs">
                                        {user.username.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Username */}
                                  <div className="font-medium text-xs text-gray-900 truncate max-w-full mb-1">
                                    u/{user.username}
                                  </div>
                                  
                                  {/* Stats */}
                                  <div className="flex items-center gap-1 mb-2">
                                    <span className="text-[10px] px-1 py-0.5 bg-white text-gray-600 rounded">
                                      {accountAge}
                                    </span>
                                    {user.link_karma > 10000 && (
                                      <span className="text-[10px] px-1 py-0.5 bg-yellow-100 text-yellow-600 rounded">
                                        {(user.link_karma / 1000).toFixed(0)}k
                                      </span>
                                    )}
                                    {user.verified && (
                                      <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Bio if available */}
                                  {user.subreddit_description && (
                                    <p className="text-[10px] text-gray-600 line-clamp-2 mb-2 italic">
                                      {user.subreddit_description}
                                    </p>
                                  )}
                                  
                                  {/* Karma display */}
                                  <div className="text-[10px] text-gray-500 mb-2">
                                    {user.link_karma.toLocaleString()} • {user.comment_karma.toLocaleString()}
                                  </div>
                                  
                                  {/* Add button */}
                                  <Button
                                    size="sm"
                                    onClick={() => toggleCreator(user.id, true)}
                                    className="bg-b9-pink hover:bg-pink-600 text-white text-[10px] h-6 px-2 w-full"
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Confirmation Dialog */}
        {confirmRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to remove <strong>u/{confirmRemove.username}</strong> from active accounts?
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRemove(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={async () => {
                    const { id } = confirmRemove
                    setRemovingCreator(id)
                    setConfirmRemove(null)
                    
                    try {
                      const response = await fetch('/api/users/toggle-creator', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, our_creator: false })
                      })
                      
                      const result = await response.json()
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || 'Failed to remove account')
                      }
                      
                      addToast({
                        type: 'success',
                        title: 'Account Removed',
                        description: `u/${confirmRemove.username} has been removed from active accounts`,
                        duration: 3000
                      })
                      
                      await fetchCreators()
                    } catch (error) {
                      console.error('Error removing account:', error)
                      addToast({
                        type: 'error',
                        title: 'Failed to Remove',
                        description: error instanceof Error ? error.message : 'Failed to remove account',
                        duration: 5000
                      })
                    } finally {
                      setRemovingCreator(null)
                    }
                  }}
                  disabled={removingCreator === confirmRemove.id}
                >
                  {removingCreator === confirmRemove.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    'Remove'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar - Same style as categorization */}
        <div className="flex items-stretch gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
          {/* Search Section - Left Side */}
          <div className="flex items-center flex-1 min-w-0 max-w-xs">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder=""
                title="Search subreddits by name, title, or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent transition-all duration-200 h-8 relative"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Filters Section - Right Side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* SFW Filter Checkbox */}
            <label className="flex items-center gap-2 px-3 py-1.5 h-8 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={sfwOnly}
                  onChange={(e) => handleSfwChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                  ${sfwOnly 
                    ? 'bg-b9-pink border-b9-pink' 
                    : 'bg-white border-gray-300 hover:border-b9-pink'
                  }
                `}>
                  {sfwOnly && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                SFW Only
              </span>
              {sfwOnly && sfwCount > 0 && (
                <span className="text-xs text-b9-pink font-semibold">
                  ({sfwCount})
                </span>
              )}
            </label>
            
            <PostingCategoryFilter
              availableCategories={availableCategories}
              selectedCategories={selectedCategories}
              onCategoriesChange={handleCategoriesChange}
              loading={loading}
            />
            
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-')
                  handleSortChange(field as SortField, direction as SortDirection)
                }}
                className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 h-8"
              >
                <option value="avg_upvotes-desc">Avg Upvotes ↓</option>
                <option value="avg_upvotes-asc">Avg Upvotes ↑</option>
                <option value="min_post_karma-desc">Min Post Karma ↓</option>
                <option value="min_post_karma-asc">Min Post Karma ↑</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Stats */}
            <div className="text-xs text-gray-600 px-3">
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <span>{showingCount} of {totalCount}</span>
              )}
            </div>
          </div>
        </div>


        {/* DiscoveryTable Component */}
        <DiscoveryTable
          subreddits={sortedSubreddits}
          loading={loading && currentPage === 0}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
        
        {/* Loading indicator for infinite scroll */}
        {loading && currentPage > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink"></div>
            <span className="ml-3 text-gray-600">Loading more subreddits...</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
