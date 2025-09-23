'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type React from 'react'
import { supabase, type Subreddit, type Post } from '../../../lib/supabase'
import { useErrorHandler } from '@/lib/errorUtils'
import { useThrottledCallback, useRequestDeduplicator, PERFORMANCE_SETTINGS } from '@/lib/performance-utils'
import { useDebounce } from '@/hooks/useDebounce'

interface Creator {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  total_karma: number
  account_age_days: number | null
  icon_img: string | null
  model_id: number | null
  status: string
  verified?: boolean
  is_gold?: boolean
  has_verified_email?: boolean
  created_utc?: string | null
  // Model data
  model?: {
    id: number
    stage_name: string
    status: string
    assigned_tags: string[]
  }
}

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import dynamic from 'next/dynamic'
import {
  ChevronDown,
  X,
  UserPlus,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import Image from 'next/image'

// Dynamic imports for heavy components
const DiscoveryTable = dynamic(
  () => import('@/components/DiscoveryTable').then(mod => ({ default: mod.DiscoveryTable })),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" /> }
)

const AddUserModal = dynamic(
  () => import('@/components/AddUserModal').then(mod => ({ default: mod.AddUserModal })),
  { ssr: false }
)

type AllowedCategory = 'Ok' | 'No Seller' | 'Non Related'
type SortField = 'avg_upvotes' | 'min_post_karma' | 'engagement'
type SortDirection = 'asc' | 'desc'

type BaseSubreddit = Omit<Subreddit, 'review'> & { review: Subreddit['review'] | AllowedCategory | null }

interface SubredditWithPosts extends Omit<BaseSubreddit, 'created_at' | 'tags'> {
  recent_posts?: Post[]
  public_description?: string | null
  comment_to_upvote_ratio?: number | null
  primary_category?: string | null
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
  verification_required?: boolean | null
  tags?: string[] | null
}

const PAGE_SIZE = 30


export default function PostingPage() {
  const { addToast } = useToast()
  const { handleError } = useErrorHandler()
  const [okSubreddits, setOkSubreddits] = useState<SubredditWithPosts[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Creator | null>(null)
  const [loadingCreators, setLoadingCreators] = useState(true)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ id: number, username: string } | null>(null)
  const [removingCreator, setRemovingCreator] = useState<number | null>(null)
  const [, setCreatorStats] = useState<Record<number, { posts: number, avgScore: number, topSubreddit: string }>>({})
  const [, setLoadingStats] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setLastUpdated] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, PERFORMANCE_SETTINGS.SEARCH_DEBOUNCE)
  const requestDeduplicator = useRequestDeduplicator()
  // Filters & sorting
  const [sfwOnly, setSfwOnly] = useState<boolean>(false)
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<SortField>('avg_upvotes')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  // Counts for UI
  const [sfwCount, setSfwCount] = useState(0)
  const [nsfwCount, setNsfwCount] = useState(0)
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [subreddits, setSubreddits] = useState<SubredditWithPosts[]>([])

  // Load filter counts for UI - now using optimized single query
  const loadFilterCounts = useCallback(async () => {
    if (!supabase) return
    try {
      const sb = supabase as NonNullable<typeof supabase>

      // Get account tags if an account is selected
      let accountTags: string[] = []
      if (selectedAccount?.model?.assigned_tags) {
        accountTags = selectedAccount.model.assigned_tags
      }

      // Use the new optimized count function
      const { data, error } = await sb.rpc('get_posting_page_counts', {
        tag_array: accountTags.length > 0 ? accountTags : null,
        search_term: debouncedSearchQuery?.trim() || null
      })

      if (error) {
        console.error('Error fetching counts:', error)
        throw error
      }

      if (data && data[0]) {
        setSfwCount(Number(data[0].sfw_count) || 0)
        setNsfwCount(Number(data[0].nsfw_count) || 0)
        setVerifiedCount(Number(data[0].verified_count) || 0)
      }
    } catch {
      setSfwCount(0)
      setNsfwCount(0)
      setVerifiedCount(0)
    }
  }, [selectedAccount, debouncedSearchQuery])

  // Optimized fetch with server-side pagination and filtering
  const fetchOkSubreddits = useCallback(async (page = 0, append = false, searchTerm = '') => {
    if (!append) setLoading(true)
    try {
      if (!supabase) {
        console.error('Supabase client not initialized')
        throw new Error('Supabase client not initialized')
      }
      const sb = supabase as NonNullable<typeof supabase>

      // Get account tags if an account is selected
      let accountTags: string[] = []
      if (selectedAccount?.model?.assigned_tags) {
        accountTags = selectedAccount.model.assigned_tags
      }

      console.log('[Posting] Using server-side pagination:', {
        page,
        pageSize: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy,
        sortDirection,
        sfwOnly,
        verifiedOnly,
        searchTerm: searchTerm?.substring(0, 20),
        accountTags: accountTags.length
      })

      // Use request deduplication to prevent duplicate API calls (optional for now)
      // const dedupeKey = `filter_subreddits_${page}_${searchTerm}_${sfwOnly}_${verifiedOnly}_${sortBy}_${sortDirection}_${JSON.stringify(accountTags)}`

      // Use the new optimized RPC function for server-side filtering and sorting
      const { data: subreddits, error } = await sb.rpc('filter_subreddits_for_posting', {
        tag_array: accountTags.length > 0 ? accountTags : null,
        search_term: searchTerm && searchTerm.trim() ? searchTerm.trim() : null,
        sfw_only: sfwOnly,
        verified_only: verifiedOnly,
        sort_by: sortBy,
        sort_order: sortDirection,
        limit_count: PAGE_SIZE,
        offset_count: page * PAGE_SIZE
      })

      if (error) {
        console.error('Supabase RPC error:', error.message || 'Unknown error')
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      const processedSubreddits: SubredditWithPosts[] = (subreddits || []).map((subreddit: any) => ({
        ...subreddit,
        recent_posts: [],
        review: subreddit.review ?? null,
        primary_category: subreddit.primary_category || null,
        created_at: subreddit.created_at || new Date().toISOString()
      })) as SubredditWithPosts[]

      console.log(`[Posting] Fetched ${processedSubreddits.length} subreddits from server`)

      if (append) {
        setOkSubreddits(prev => [...prev, ...processedSubreddits])
      } else {
        setOkSubreddits(processedSubreddits)
      }

      // Update has more based on results
      setHasMore(processedSubreddits.length === PAGE_SIZE)
      setLastUpdated(new Date())

      // Update counts when filters change (page 0)
      if (page === 0) {
        loadFilterCounts()
      }

      return // Success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error fetching Ok subreddits:', errorMessage)
      if (error instanceof Error) {
        console.error('Error stack:', error.stack)
      }
      addToast({
        type: 'error',
        title: 'Error Loading Posting Data',
        description: 'Failed to load subreddits and posts. Please try again.',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortDirection, addToast, loadFilterCounts, sfwOnly, verifiedOnly, selectedAccount])



  // Fetch stats for creators
  const fetchCreatorStats = useCallback(async (usernames: string[]) => {
    try {
      if (!supabase) return
      setLoadingStats(true)
      const sb = supabase as NonNullable<typeof supabase>

      const stats: Record<number, { posts: number, avgScore: number, topSubreddit: string }> = {}

      for (const username of usernames) {
        const { data: posts } = await sb
          .from('reddit_posts')
          .select('score, subreddit_name')
          .eq('author_username', username)
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

  // Fetch only active posting accounts (linked to models)
  const fetchCreators = useCallback(async () => {
    setLoadingCreators(true)
    try {
      if (!supabase) return
      const sb = supabase as NonNullable<typeof supabase>

      // Fetch accounts that are linked to models and active
      const { data: creatorsData, error } = await sb
        .from('reddit_users')
        .select(`
          *,
          models!inner (
            id,
            stage_name,
            status,
            assigned_tags
          )
        `)
        .not('model_id', 'is', null)
        .eq('status', 'active')
        .order('total_karma', { ascending: false })

      if (error) throw error

      // Transform data to include model info
      const transformedCreators: Creator[] = (creatorsData || []).map(creator => ({
        ...creator,
        model: creator.models || null
      }))

      setCreators(transformedCreators)

      // Auto-select first account (highest karma)
      if (transformedCreators.length > 0 && !selectedAccount) {
        setSelectedAccount(transformedCreators[0])
      }

      // Fetch stats for each creator
      if (transformedCreators.length > 0) {
        await fetchCreatorStats(transformedCreators.map(c => c.username))
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Posting Accounts',
        description: error instanceof Error ? error.message : 'Failed to load posting accounts. Please try again.',
        duration: 5000
      })
    }
    setLoadingCreators(false)
  }, [addToast, fetchCreatorStats, selectedAccount])

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

  // Tag management functions
  const updateTags = useCallback(async (id: number, oldTag: string, newTag: string) => {
    if (!id || !oldTag || !newTag || oldTag === newTag) return

    const subreddit = okSubreddits.find(s => s.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
    const newTags = currentTags.map(tag => tag === oldTag ? newTag : tag)

    // Optimistic update
    setOkSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))
    setSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))

    const { error } = await supabase!
      .from('reddit_subreddits')
      .update({ tags: newTags })
      .eq('id', id)

    if (error) {
      handleError(error, 'Failed to update tag')
      // Revert on error
      setOkSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
      setSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
    }
  }, [okSubreddits, handleError])

  const removeTag = useCallback(async (id: number, tagToRemove: string) => {
    if (!id || !tagToRemove) return

    const subreddit = okSubreddits.find(s => s.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
    const newTags = currentTags.filter(tag => tag !== tagToRemove)

    // Optimistic update
    setOkSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))
    setSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))

    const { error } = await supabase!
      .from('reddit_subreddits')
      .update({ tags: newTags })
      .eq('id', id)

    if (error) {
      handleError(error, 'Failed to remove tag')
      // Revert on error
      setOkSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
      setSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
    }
  }, [okSubreddits, handleError])

  const addTag = useCallback(async (id: number, tagToAdd: string) => {
    if (!id || !tagToAdd) return

    const subreddit = okSubreddits.find(s => s.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []

    // Don't add duplicate tags
    if (currentTags.includes(tagToAdd)) return

    const newTags = [...currentTags, tagToAdd]

    // Optimistic update
    setOkSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))
    setSubreddits(prev => prev.map(s =>
      s.id === id ? { ...s, tags: newTags } : s
    ))

    const { error } = await supabase!
      .from('reddit_subreddits')
      .update({ tags: newTags })
      .eq('id', id)

    if (error) {
      handleError(error, 'Failed to add tag')
      // Revert on error
      setOkSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
      setSubreddits(prev => prev.map(s =>
        s.id === id ? { ...s, tags: currentTags } : s
      ))
    }
  }, [okSubreddits, handleError])

  // Track if this is the initial mount
  const isInitialMount = useRef(true)

  // Debounce search query
  // Search query effect is now handled by useDebounce hook

  // Refresh when sort, search, account, or filters change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // Reset to first page and re-fetch when sort, search, account, or filters change
    setCurrentPage(0)
    fetchOkSubreddits(0, false, debouncedSearchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDirection, debouncedSearchQuery, selectedAccount, sfwOnly, verifiedOnly])



  // Separate memo for counts calculation (using server-provided counts)
  const subredditCounts = useMemo(() => {
    return { sfw: sfwCount, nsfw: nsfwCount, verified: verifiedCount }
  }, [sfwCount, nsfwCount, verifiedCount])

  // Since we're using server-side filtering and pagination, just pass through the data
  const filteredOkSubreddits = useMemo(() => {
    return okSubreddits
  }, [okSubreddits])

  // Handler functions for toolbar
  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortBy(field)
    setSortDirection(direction)
    setCurrentPage(0)
  }, [])

  const handleSfwChange = useCallback((sfwOnly: boolean) => {
    setSfwOnly(sfwOnly)
  }, [])

  const handleVerifiedChange = useCallback((verifiedOnly: boolean) => {
    setVerifiedOnly(verifiedOnly)
  }, [])


  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchOkSubreddits(nextPage, true, debouncedSearchQuery)
    }
  }, [currentPage, hasMore, loading, fetchOkSubreddits, debouncedSearchQuery])

  // Optimized infinite scroll with proper throttling
  const throttledHandleScroll = useThrottledCallback(
    () => {
      // Check if we're near the bottom of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight

      // Load more when user is within 500px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 500) {
        handleLoadMore()
      }
    },
    PERFORMANCE_SETTINGS.SCROLL_THROTTLE,
    [handleLoadMore]
  )

  useEffect(() => {
    window.addEventListener('scroll', throttledHandleScroll)
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [throttledHandleScroll])


  // Initial load
  useEffect(() => {
    setCurrentPage(0)
    fetchOkSubreddits(0, false, '')
    fetchCreators()
    loadFilterCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setCurrentPage(0)
      fetchOkSubreddits(0, false, debouncedSearchQuery)
    }, 300000)
    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery])

  // Use filtered subreddits (either client-side filtered or server-filtered)
  const sortedSubreddits = useMemo(() => {
    return filteredOkSubreddits
  }, [filteredOkSubreddits])


  // Summary stats
  const showingCount = sortedSubreddits.length
  const totalCount = sfwCount + nsfwCount


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
        {/* Active Posting Accounts Section */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CardTitle className="text-lg text-gray-900">Posting Accounts</CardTitle>
                <Badge variant="outline" className="text-xs bg-pink-50 border-pink-200">
                  {creators.length} {creators.length === 1 ? 'account' : 'accounts'}
                </Badge>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="group relative px-4 py-2.5 min-w-[120px] overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 12px 32px -8px rgba(236, 72, 153, 0.25), inset 0 2px 2px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/25 via-purple-400/25 to-blue-400/25" />

                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 blur-xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  <Sparkles className="h-5 w-5 text-pink-500 mb-1 group-hover:text-pink-600 transition-colors" />
                  <span className="text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Add User
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
                <p className="text-gray-600 font-medium mb-2">No active posting accounts</p>
                <p className="text-sm text-gray-500 mb-4">Add active Reddit accounts linked to models</p>
                <button
                  onClick={() => setShowAddUserModal(true)}
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

                    const isSelected = selectedAccount?.id === creator.id

                    return (
                      <div
                        key={creator.id}
                        className={`relative bg-white rounded-md border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                        onClick={(e) => {
                          // Don't select if clicking on remove button, avatar or username
                          if (!(e.target as HTMLElement).closest('.no-select')) {
                            setSelectedAccount(creator)
                          }
                        }}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="no-select absolute -top-1.5 -right-1.5 h-4 w-4 p-0 bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                              className="no-select relative mb-1"
                              title={`u/${creator.username}`}
                              onClick={(e) => e.stopPropagation()}
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
                              className="no-select hover:text-b9-pink"
                              title={`u/${creator.username}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-semibold text-gray-900 hover:text-b9-pink truncate block max-w-[60px]">
                                {creator.username}
                              </span>
                            </a>

                            {/* Model name */}
                            {creator.model && (
                              <span className="text-[9px] text-purple-600 font-medium truncate block max-w-[60px]">
                                {creator.model.stage_name}
                              </span>
                            )}

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

                          {/* Compact Karma */}
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
                Are you sure you want to remove <strong>u/{confirmRemove.username}</strong> from posting accounts?
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
                        description: `u/${confirmRemove.username} has been removed from posting accounts`,
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

        {/* Search and Filter Bar */}
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
                SFW
              </span>
              {sfwOnly && sfwCount > 0 && (
                <span className="text-xs text-b9-pink font-semibold">
                  ({sfwCount})
                </span>
              )}
            </label>

            {/* Verified Filter Checkbox */}
            <label className="flex items-center gap-2 px-3 py-1.5 h-8 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => handleVerifiedChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                  ${verifiedOnly
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300 hover:border-blue-500'
                  }
                `}>
                  {verifiedOnly && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                Verified
              </span>
              {verifiedOnly && verifiedCount > 0 && (
                <span className="text-xs text-blue-500 font-semibold">
                  ({verifiedCount})
                </span>
              )}
            </label>

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
                <option value="engagement-desc">Engagement ↓</option>
                <option value="engagement-asc">Engagement ↑</option>
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

        {/* Show message if no account selected or no matching subreddits */}
        {!selectedAccount ? (
          <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-2">Select a posting account</p>
              <p className="text-sm text-gray-500">Click on an account above to see matching subreddits</p>
            </CardContent>
          </Card>
        ) : sortedSubreddits.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-2">No matching subreddits</p>
              <p className="text-sm text-gray-500">
                {selectedAccount?.model?.assigned_tags && selectedAccount.model.assigned_tags.length > 0
                  ? "No approved subreddits match this account's tags. Try adjusting your filters."
                  : "No approved subreddits found. Try adjusting your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* DiscoveryTable Component */}
            <DiscoveryTable
              subreddits={sortedSubreddits}
              loading={loading && currentPage === 0}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              sfwOnly={sfwOnly}
              onUpdate={(id, updates) => {
                // Update okSubreddits state when tags are modified
                setOkSubreddits(prev => prev.map(sub =>
                  sub.id === id
                    ? { ...sub, ...updates }
                    : sub
                ))
              }}
              onTagUpdate={updateTags}
              onTagRemove={removeTag}
              onAddTag={addTag}
            />

            {/* Loading indicator for infinite scroll */}
            {loading && currentPage > 0 && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink"></div>
                <span className="ml-3 text-gray-600">Loading more subreddits...</span>
              </div>
            )}
          </>
        )}

        {/* Add User Modal */}
        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onUserAdded={fetchCreators}
        />
      </div>
    </DashboardLayout>
  )
}