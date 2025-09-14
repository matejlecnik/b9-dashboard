'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
}
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { SimplifiedPostingToolbar } from '@/components/SimplifiedPostingToolbar'
import { 
  Users, 
  Clock, 
  MessageCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Zap,
  Calendar,
  Shield,
  Copy,
  Activity,
  Heart,
  Image as ImageIcon,
  Video,
  FileText
} from 'lucide-react'
import { BookOpen } from 'lucide-react'
import Image from 'next/image'

type AllowedCategory = 'Ok' | 'No Seller' | 'Non Related'
type SortField = 'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour' | 'moderator_score' | 'health_score'
type SortDirection = 'asc' | 'desc'

type BaseSubreddit = Omit<Subreddit, 'review'> & { review: Subreddit['review'] | AllowedCategory | 'User Feed' | null }

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
  const [loading, setLoading] = useState(true)
  const [expandedSubreddits, setExpandedSubreddits] = useState<Set<number>>(new Set())
  const [topPostsBySubreddit, setTopPostsBySubreddit] = useState<Record<number, Post[]>>({})
  const [loadingTopPosts, setLoadingTopPosts] = useState<Set<number>>(new Set())
  const [, setLastUpdated] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  // Filters & sorting
  const [sfwOnly, setSfwOnly] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<SortField>('engagement')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  // Counts for UI
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)

  // Optimized fetch with pagination and selective fields
  const fetchOkSubreddits = useCallback(async (page = 0, append = false) => {
    if (!append) setLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const sb = supabase as NonNullable<typeof supabase>
      
      // Build sort column mapping
      const sortColumnMap: Record<SortField, string> = {
        'engagement': 'subscriber_engagement_ratio',
        'subscribers': 'subscribers', 
        'avg_upvotes': 'avg_upvotes_per_post',
        'best_hour': 'best_posting_hour',
        'moderator_score': 'moderator_activity_score',
        'health_score': 'community_health_score'
      }
      
      const sortColumn = sortColumnMap[sortBy]
      
      // Optimized query with selective fields
      const { data: subreddits, error } = await sb
        .from('subreddits')
        .select(`
          id, name, display_name_prefixed, title, public_description,
          subscribers, avg_upvotes_per_post, subscriber_engagement_ratio,
          best_posting_hour, best_posting_day, over18, category_text,
          moderator_activity_score, community_health_score,
          image_post_avg_score, video_post_avg_score, text_post_avg_score,
          last_scraped_at, min_account_age_days, min_comment_karma, 
          min_post_karma, allow_images, icon_img, community_icon,
          top_content_type, avg_engagement_velocity
        `)
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%')
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        
      if (error) throw error

      const processedSubreddits: SubredditWithPosts[] = (subreddits || []).map((subreddit: any) => ({
        ...subreddit,
        recent_posts: [], // Will be loaded lazily when expanded
        review: subreddit.review || null,
        created_at: new Date().toISOString()
      }))

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
      addToast({
        type: 'error',
        title: 'Error Loading Posting Data',
        description: 'Failed to load subreddits and posts. Please try again.',
        duration: 5000
      })
    }
    setLoading(false)
  }, [sortBy, sortDirection, addToast])
  
  // Load filter counts for UI
  const loadFilterCounts = useCallback(async () => {
    if (!supabase) return
    
    try {
      const sb = supabase as NonNullable<typeof supabase>
      
      // Get SFW/NSFW counts
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
      
      // Get category counts
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
    } catch (error) {
      console.error('Error loading filter counts:', error)
      // Set empty counts object to prevent undefined issues
      setCategoryCounts({})
      setSfwCount(0)
      setNsfwCount(0)
    }
  }, [])
  
  // Fetch creators marked as "our creator"
  const fetchCreators = useCallback(async () => {
    setLoadingCreators(true)
    try {
      if (!supabase) return
      const sb = supabase as NonNullable<typeof supabase>
      
      const { data: creatorsData, error } = await sb
        .from('users')
        .select('id, username, link_karma, comment_karma, account_age_days, icon_img, our_creator')
        .eq('our_creator', true)
        .order('username')
      
      if (error) throw error
      setCreators(creatorsData || [])
    } catch (error) {
      console.error('Error fetching creators:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Creators',
        description: 'Failed to load creator accounts. Please try again.',
        duration: 5000
      })
    }
    setLoadingCreators(false)
  }, [addToast])
  
  // Refresh when sort changes (after initial load)
  useEffect(() => {
    // Only run if we already have data (not on initial mount)
    if (okSubreddits.length > 0) {
      setCurrentPage(0)
      fetchOkSubreddits(0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDirection])


  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays}d ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  // Sanitize subreddit icon URL (community_icon often contains &amp;)
  const getIconUrl = (subreddit: SubredditWithPosts): string | null => {
    let url = (subreddit.icon_img && String(subreddit.icon_img).trim()) || (subreddit.community_icon && String(subreddit.community_icon).trim()) || ''
    if (!url) return null
    url = url.replace(/&amp;/g, '&')
    if (url.startsWith('//')) url = `https:${url}`
    return url
  }

  // Generate a color based on subreddit name for consistent placeholder avatars
  const getSubredditColor = (name: string) => {
    const colors = [
      '#FF8395', // B9 Pink (primary)
      '#FF6B80', // Medium Dark Pink
      '#FF99A9', // Medium Pink
      '#FFB3C1', // Light Pink
      '#FF4D68', // Dark Pink
      '#E63950', // Very Dark Pink
      '#737373', // Medium Gray
      '#525252', // Dark Gray
      '#404040', // Very Dark Gray
      '#6b7280'  // Neutral Gray
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Get initials from subreddit name for placeholder
  const getSubredditInitials = (name: string) => {
    // Remove r/ prefix and get first 2 characters
    const cleanName = name.replace(/^r\//, '').replace(/^u\//, '')
    return cleanName.substring(0, 2).toUpperCase()
  }

  // Advanced client-side filtering with memoization
  const filteredOkSubreddits = useMemo(() => {
    let filtered = okSubreddits
    
    // Text search
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
    
    // SFW filter
    if (sfwOnly) {
      filtered = filtered.filter(s => !s.over18)
    }
    
    // Category filter (multiple categories)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(s => 
        s.category_text && selectedCategories.includes(s.category_text)
      )
    }
    
    return filtered
  }, [okSubreddits, searchQuery, sfwOnly, selectedCategories])

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
  
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSfwOnly(false)
    setSelectedCategories([])
  }, [])
  
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchOkSubreddits(nextPage, true)
    }
  }, [currentPage, hasMore, loading, fetchOkSubreddits])


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

  // Toggle expand and lazy-load top posts
  const toggleExpanded = async (subredditId: number) => {
    setExpandedSubreddits(prev => {
      const ns = new Set(prev)
      if (ns.has(subredditId)) ns.delete(subredditId)
      else ns.add(subredditId)
      return ns
    })
    if (!topPostsBySubreddit[subredditId]) {
      setLoadingTopPosts(prev => new Set(prev).add(subredditId))
      try {
        const sr = okSubreddits.find(s => s.id === subredditId)
        if (sr && supabase) {
          const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('subreddit_name', sr.name)
            .order('score', { ascending: false })
            .limit(20)
          setTopPostsBySubreddit(prev => ({ ...prev, [subredditId]: posts || [] }))
        }
      } finally {
        setLoadingTopPosts(prev => { const ns = new Set(prev); ns.delete(subredditId); return ns })
      }
    }
  }

  // (removed content-type icon rendering)

  const copyTitle = async (e: React.MouseEvent, title: string) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    try {
      await navigator.clipboard.writeText(title)
      addToast({ type: 'success', title: 'Copied', description: 'Title copied to clipboard', duration: 1500 })
    } catch {
      addToast({ type: 'error', title: 'Copy failed', description: 'Could not copy title', duration: 2000 })
    }
  }

  // removed copyLink / copyMarkdown per new UX

  // Summary stats
  const showingCount = sortedSubreddits.length
  const totalCount = sfwCount + nsfwCount
  const totalMembersFiltered = sortedSubreddits.reduce((sum, s) => sum + (s.subscribers || 0), 0)

  // Get best content type for a subreddit
  const getBestContentType = useCallback((subreddit: SubredditWithPosts) => {
    const scores = {
      image: subreddit.image_post_avg_score || 0,
      video: subreddit.video_post_avg_score || 0, 
      text: subreddit.text_post_avg_score || 0
    }
    
    const bestType = Object.keys(scores).reduce((a, b) => 
      scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
    )
    
    return { type: bestType, score: scores[bestType as keyof typeof scores] }
  }, [])
  
  // Get engagement quality color
  const getEngagementColor = useCallback((ratio: number) => {
    if (ratio > 0.05) return 'text-pink-600' // Excellent
    if (ratio > 0.02) return 'text-gray-700'  // Good  
    if (ratio > 0.01) return 'text-gray-600' // Average
    return 'text-gray-800' // Poor
  }, [])
  
  // Get health score color and label
  const getHealthScore = useCallback((score: number | null) => {
    if (!score) return { color: 'text-gray-400', label: 'N/A' }
    if (score >= 8) return { color: 'text-pink-600', label: 'Excellent' }
    if (score >= 6) return { color: 'text-gray-700', label: 'Good' }
    if (score >= 4) return { color: 'text-gray-600', label: 'Fair' }
    return { color: 'text-gray-800', label: 'Poor' }
  }, [])
  
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
        {/* Active Accounts Section */}
        <Card className="bg-white/70 backdrop-blur-md border-0">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-700">Active accounts</CardTitle>
              <Badge variant="outline" className="text-xs">{creators.length} creators</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {loadingCreators ? (
              <div className="flex items-center space-x-4">
                <div className="flex space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ) : creators.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No active creator accounts found</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {creators.map((creator) => (
                  <div key={creator.id} className="flex items-center space-x-3 bg-white/50 rounded-lg p-3 border border-gray-200/50">
                    <a 
                      href={getRedditProfileUrl(creator.username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                      title={`Open u/${creator.username} on Reddit`}
                    >
                      {creator.icon_img ? (
                        <Image
                          src={creator.icon_img}
                          alt={`${creator.username} avatar`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-b9-pink to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                          {creator.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a 
                        href={getRedditProfileUrl(creator.username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-900 hover:text-b9-pink truncate block"
                      >
                        u/{creator.username}
                      </a>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span title="Post karma">📮 {creator.link_karma.toLocaleString('en-US')}</span>
                        <span title="Comment karma">💬 {creator.comment_karma.toLocaleString('en-US')}</span>
                        {creator.account_age_days && (
                          <span title="Account age">📅 {creator.account_age_days}d</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Simplified Posting Toolbar */}
        <SimplifiedPostingToolbar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          sfwOnly={sfwOnly}
          onSFWOnlyChange={handleSfwChange}
          sfwCount={sfwCount}
          selectedCategories={selectedCategories}
          onCategoriesChange={handleCategoriesChange}
          categoryCounts={categoryCounts}
          onClearAllFilters={handleClearAllFilters}
          loading={loading}
          totalResults={totalCount}
          filteredResults={showingCount}
        />


        {/* Subreddits List with Load More */}
        <div id="subreddit-list" className="space-y-4">
          {loading && currentPage === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="flex space-x-4 mt-3">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedSubreddits.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No subreddits found</div>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery || selectedCategories.length > 0 || sfwOnly
                  ? 'Try adjusting your filters or search terms'
                  : 'No approved subreddits available'
                }
              </p>
              {(searchQuery || selectedCategories.length > 0 || sfwOnly) && (
                <Button onClick={handleClearAllFilters} variant="outline">
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            sortedSubreddits.map((subreddit) => (
              <div key={subreddit.id} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-sm"></div>
                <Card className="relative bg-white/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/30"></div>
                  
                  {/* Main Subreddit Header */}
                  <CardHeader className="relative pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Subreddit Icon / Avatar */}
                        <a 
                          href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative"
                          title={`Open ${subreddit.display_name_prefixed} on Reddit`}
                        >
                          {getIconUrl(subreddit) ? (
                            <Image
                              src={getIconUrl(subreddit) || ''}
                              alt={`${subreddit.name} icon`}
                              width={56}
                              height={56}
                              className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow"
                              unoptimized
                            />
                          ) : null}
                          <div 
                            className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg border border-gray-200 ${
                              getIconUrl(subreddit) ? 'hidden' : 'flex'
                            }`}
                            style={{
                              backgroundColor: getSubredditColor(subreddit.name),
                              display: getIconUrl(subreddit) ? 'none' : 'flex'
                            }}
                          >
                            {getSubredditInitials(subreddit.name)}
                          </div>
                          {/* Removed corner 18+ badge to avoid duplication with SFW/NSFW */}
                        </a>

                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <a
                              href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xl font-bold text-gray-900 hover:text-b9-pink"
                            >
                              {subreddit.display_name_prefixed}
                            </a>
                            {/* Category badge */}
                            {subreddit.review && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-semibold border bg-white/60">
                                {subreddit.review}
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1.5 py-0.5 font-semibold border ${subreddit.over18 ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-pink-50 text-pink-700 border-pink-300'}`}
                            >
                              {subreddit.over18 ? 'NSFW' : 'SFW'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mt-1 line-clamp-2">{subreddit.public_description || subreddit.title}</p>
                          
                          {/* Enhanced Key Metrics Row */}
                          <div className="space-y-3 mt-3">
                            {/* Primary metrics */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="flex items-center space-x-1 text-sm">
                                <Users className="h-4 w-4 text-gray-700" />
                                <span className="font-medium text-gray-900">{(subreddit.subscribers || 0).toLocaleString('en-US')}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                <ArrowUpCircle className="h-4 w-4 text-pink-600" />
                                <span className="font-medium text-gray-900">{Math.round(subreddit.avg_upvotes_per_post || 0)}</span>
                                <span className="text-gray-500">avg</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                <TrendingUp className={`h-4 w-4 ${getEngagementColor(subreddit.subscriber_engagement_ratio || 0)}`} />
                                <span className={`font-medium ${getEngagementColor(subreddit.subscriber_engagement_ratio || 0)}`}>
                                  {((subreddit.subscriber_engagement_ratio || 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                              {subreddit.avg_engagement_velocity && (
                                <div className="flex items-center space-x-1 text-sm">
                                  <Zap className="h-4 w-4 text-gray-600" />
                                  <span className="font-medium text-gray-900">{Math.round(subreddit.avg_engagement_velocity)}</span>
                                  <span className="text-gray-500">upvotes/hr</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Secondary metrics row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="flex items-center space-x-2 text-sm">
                                <Clock className="h-4 w-4 text-pink-600" />
                                <span className="font-medium text-gray-900">{subreddit.best_posting_hour || '?'}:00</span>
                                {subreddit.best_posting_day && (
                                  <>
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium">{subreddit.best_posting_day}</span>
                                  </>
                                )}
                              </div>
                              
                              {/* Health scores */}
                              {subreddit.community_health_score && (
                                <div className="flex items-center space-x-1 text-sm">
                                  <Heart className={`h-4 w-4 ${getHealthScore(subreddit.community_health_score).color}`} />
                                  <span className={`font-medium ${getHealthScore(subreddit.community_health_score).color}`}>
                                    {getHealthScore(subreddit.community_health_score).label}
                                  </span>
                                </div>
                              )}
                              
                              {subreddit.moderator_activity_score && (
                                <div className="flex items-center space-x-1 text-sm">
                                  <Activity className={`h-4 w-4 ${getHealthScore(subreddit.moderator_activity_score).color}`} />
                                  <span className="font-medium text-gray-900">{subreddit.moderator_activity_score.toFixed(1)}</span>
                                  <span className="text-gray-500">mod</span>
                                </div>
                              )}
                              
                              {/* Best content type indicator */}
                              {(() => {
                                const bestContent = getBestContentType(subreddit)
                                if (bestContent.score > 0) {
                                  const IconComponent = {
                                    image: ImageIcon,
                                    video: Video,
                                    text: FileText
                                  }[bestContent.type] || FileText
                                  
                                  return (
                                    <div className="flex items-center space-x-1 text-sm">
                                      <IconComponent className="h-4 w-4 text-gray-600" />
                                      <span className="font-medium text-gray-900">{bestContent.type}</span>
                                      <span className="text-gray-500">({Math.round(bestContent.score)})</span>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                          
                          {/* Minimal Requirements Row */}
                          {(subreddit.min_account_age_days || subreddit.min_comment_karma || subreddit.min_post_karma || subreddit.allow_images !== null) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                              <span className="text-gray-600 font-medium">Requirements:</span>
                              {subreddit.min_account_age_days && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <Calendar className="h-3 w-3" />
                                  <span>{subreddit.min_account_age_days}d account</span>
                                </div>
                              )}
                              {subreddit.min_comment_karma && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>{subreddit.min_comment_karma} comment karma</span>
                                </div>
                              )}
                              {subreddit.min_post_karma && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <ArrowUpCircle className="h-3 w-3" />
                                  <span>{subreddit.min_post_karma} post karma</span>
                                </div>
                              )}
                              {subreddit.allow_images === false && (
                                <div className="flex items-center space-x-1 text-gray-800">
                                  <Shield className="h-3 w-3" />
                                  <span>No images</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={`https://www.reddit.com/${subreddit.display_name_prefixed.replace(/^\//, '')}/about/rules`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                          title="Subreddit rules"
                          aria-label="Open subreddit rules"
                        >
                          <BookOpen className="h-5 w-5" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(subreddit.id)}
                          className="text-gray-500 hover:text-gray-700"
                          title={expandedSubreddits.has(subreddit.id) ? 'Hide top posts' : 'Show top posts'}
                          aria-expanded={expandedSubreddits.has(subreddit.id)}
                        >
                          {expandedSubreddits.has(subreddit.id) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </Button>
                        {subreddit.last_scraped_at && (
                          <div className="flex items-center text-xs text-gray-500" title={`updated ${timeAgo(subreddit.last_scraped_at)}`}>
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{timeAgo(subreddit.last_scraped_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSubreddits.has(subreddit.id) && (
                    <CardContent className="relative pt-0">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <MessageCircle className="h-5 w-5 text-gray-700" />
                          <h4 className="font-semibold text-gray-900">Top 20 Most Upvoted Posts</h4>
                          {loadingTopPosts.has(subreddit.id) && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-b9-pink ml-2"></div>
                          )}
                        </div>
                        {topPostsBySubreddit[subreddit.id] && topPostsBySubreddit[subreddit.id].length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[70vh] overflow-y-auto">
                            {topPostsBySubreddit[subreddit.id].map((post) => {
                              const postUrl = `https://www.reddit.com/comments/${post.reddit_id}`
                              const thumb = (post as unknown as { thumbnail?: string }).thumbnail
                              const hasThumb = !!thumb && /^https?:\/\//.test(thumb) && !/(self|default)$/i.test(thumb)
                              return (
                                <a key={post.id} href={postUrl} target="_blank" rel="noopener noreferrer" className="group block bg-white/70 rounded-xl border border-gray-200 overflow-hidden">
                                  {/* Media */}
                                  <div className="relative aspect-square bg-gray-100">
                                    {hasThumb ? (
                                      <Image src={thumb} alt="thumb" fill sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw" className="object-cover" unoptimized />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">No preview</div>
                                    )}
                                    <div className="absolute top-1 right-1">
                                      <button
                                        onClick={(e) => copyTitle(e, post.title)}
                                        className="p-1.5 rounded-md bg-white/80 text-gray-700 hover:bg-white shadow"
                                        title="Copy title"
                                        aria-label="Copy title"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Meta */}
                                  <div className="p-2">
                                    <div className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.25rem]">{post.title}</div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                      <div className="flex items-center space-x-2">
                                        <span className="flex items-center space-x-1">
                                          <ArrowUpCircle className="h-3 w-3" />
                                          <span>{post.score}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                          <MessageCircle className="h-3 w-3" />
                                          <span>{post.num_comments}</span>
                                        </span>
                                      </div>
                                      <span>{timeAgo(post.created_utc)}</span>
                                    </div>
                                  </div>
                                </a>
                              )
                            })}
                          </div>
                        ) : !loadingTopPosts.has(subreddit.id) ? (
                          <div className="text-sm text-gray-500 italic">No top posts data</div>
                        ) : null}
                      </div>
                    </CardContent>
                  )}

                </Card>
              </div>
            ))
          )}
          
          {/* Load More Button */}
          {hasMore && sortedSubreddits.length > 0 && (
            <div className="text-center py-8">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                size="lg"
                className="bg-white/80 backdrop-blur-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-b9-pink mr-2"></div>
                    Loading More...
                  </>
                ) : (
                  'Load More Subreddits'
                )}
              </Button>
            </div>
          )}
          
          {/* End of results indicator */}
          {!hasMore && sortedSubreddits.length > 0 && (
            <div className="text-center py-6">
              <div className="text-sm text-gray-500">
                You&apos;ve reached the end of the results
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
