'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  AlertCircle,
  Sparkles,
  TrendingUp,
  Heart,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { ActiveAccountsSection } from '@/components/shared/ActiveAccountsSection'
import { TagFilterDropdown } from '@/components/shared/TagFilterDropdown'
import { useToast } from '@/components/ui/toast'
import { useErrorHandler } from '@/lib/errorUtils'
import { useThrottledCallback, PERFORMANCE_SETTINGS } from '@/lib/performance-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useAvailableTags } from '@/hooks/queries/useRedditCategorization'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import type { SubredditWithPosts } from '@/components/features/DiscoveryTable'

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
  models?: {
    id: number
    stage_name: string
    status: string
    assigned_tags: string[]
  }
}

// Type for DiscoveryTable props
interface DiscoveryTableProps {
  subreddits: SubredditWithPosts[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  sfwOnly?: boolean
  onUpdate?: (id: number, updates: Partial<SubredditWithPosts>) => void
  onTagUpdate?: (id: number, oldTag: string, newTag: string) => void
  onTagRemove?: (id: number, tag: string) => void
  onAddTag?: (id: number, tag: string) => void
}

// Type for AddUserModal props
interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
}

// Dynamic imports for heavy components
const DiscoveryTable = dynamic<DiscoveryTableProps>(
  () => import('@/components/features/DiscoveryTable').then(mod => ({ default: mod.DiscoveryTable })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />
  }
)

const AddUserModal = dynamic<AddUserModalProps>(
  () => import('@/components/features/AddUserModal').then(mod => ({ default: mod.AddUserModal })),
  { ssr: false }
)

type SortField = 'score' | 'avg_upvotes' | 'min_post_karma' | 'engagement'
type SortDirection = 'asc' | 'desc'

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
  // Tag filtering
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { data: availableTags } = useAvailableTags()
  // Filters & sorting
  const [sfwOnly, setSfwOnly] = useState<boolean>(false)
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false)
  const [minEngagement, setMinEngagement] = useState<number>(0.005)
  const [, setSliderPosition] = useState<number>(0) // 0-100 for UI slider - kept for future use
  const [tempSliderPosition, setTempSliderPosition] = useState<number>(0) // Temporary position while dragging
  const [sortBy, setSortBy] = useState<SortField>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  // Counts for UI - currently unused but kept for future filtering UI
  const [, setSfwCount] = useState(0)
  const [, setNsfwCount] = useState(0)
  const [, setVerifiedCount] = useState(0)

  // Load filter counts for UI - simplified for now without tag filtering
  const loadFilterCounts = useCallback(async () => {
    if (!supabase) return
    try {
      const sb = supabase as NonNullable<typeof supabase>

      // For now, get counts without tag filtering to avoid complexity
      // TODO: Use get_subreddit_filter_counts RPC function when available
      let baseQuery = sb
        .from('reddit_subreddits')
        .select('id, over18, verification_required', { count: 'exact', head: true })
        .eq('review', 'Ok')

      // Apply search filter if present
      if (debouncedSearchQuery?.trim()) {
        baseQuery = baseQuery.or(`name.ilike.%${debouncedSearchQuery}%,title.ilike.%${debouncedSearchQuery}%,public_description.ilike.%${debouncedSearchQuery}%`)
      }

      // Get total count
      const { count: totalCount, error: totalError } = await baseQuery

      if (totalError) {
        logger.error('Error fetching total count:', totalError)
        throw totalError
      }

      // Get SFW count (need fresh query)
      const { count: sfwCount, error: sfwError } = await sb
        .from('reddit_subreddits')
        .select('id', { count: 'exact', head: true })
        .eq('review', 'Ok')
        .eq('over18', false)
        .or(debouncedSearchQuery?.trim() ? `name.ilike.%${debouncedSearchQuery}%,title.ilike.%${debouncedSearchQuery}%,public_description.ilike.%${debouncedSearchQuery}%` : 'id.gte.0')

      if (sfwError) {
        logger.error('Error fetching SFW count:', sfwError)
        throw sfwError
      }

      // Get verified count (need fresh query)
      const { count: verifiedCount, error: verifiedError } = await sb
        .from('reddit_subreddits')
        .select('id', { count: 'exact', head: true })
        .eq('review', 'Ok')
        .eq('verification_required', true)
        .or(debouncedSearchQuery?.trim() ? `name.ilike.%${debouncedSearchQuery}%,title.ilike.%${debouncedSearchQuery}%,public_description.ilike.%${debouncedSearchQuery}%` : 'id.gte.0')

      if (verifiedError) {
        logger.error('Error fetching verified count:', verifiedError)
        throw verifiedError
      }

      setSfwCount(sfwCount || 0)
      setNsfwCount((totalCount || 0) - (sfwCount || 0))
      setVerifiedCount(verifiedCount || 0)
    } catch {
      setSfwCount(0)
      setNsfwCount(0)
      setVerifiedCount(0)
    }
  }, [debouncedSearchQuery])

  // Optimized fetch with server-side pagination and filtering
  const fetchOkSubreddits = useCallback(async (
    page = 0,
    append = false,
    searchTerm = '',
    filters: {
      sfwOnly: boolean,
      verifiedOnly: boolean,
      minEngagement: number,
      sortBy: SortField,
      sortDirection: SortDirection,
      selectedAccount: Creator | null,
      selectedTags: string[]
    }
  ) => {
    if (!append) setLoading(true)
    try {
      if (!supabase) {
        logger.error('Supabase client not initialized')
        throw new Error('Supabase client not initialized')
      }
      const sb = supabase as NonNullable<typeof supabase>

      // Get account tags if an account is selected
      let accountTags: string[] = []
      if (filters.selectedAccount?.model?.assigned_tags && Array.isArray(filters.selectedAccount.model.assigned_tags)) {
        accountTags = filters.selectedAccount.model.assigned_tags.filter(tag => tag != null)
      }

      // Handle tag filtering logic:
      // - If no filter tags selected AND no account selected: show all subreddits
      // - If only account selected: show subreddits matching account tags
      // - If filter tags selected: show subreddits matching those filter tags (override account tags)
      let tagsToUse: string[] = []

      if (filters.selectedTags && filters.selectedTags.length > 0) {
        // User explicitly selected filter tags - use only those
        tagsToUse = filters.selectedTags
      } else if (accountTags.length > 0) {
        // No filter tags selected but account has tags - use account tags
        tagsToUse = accountTags
      }
      // If both are empty, tagsToUse remains empty array = show all

      logger.log('[Posting] Using RPC function with filters:', {
        page,
        pageSize: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        sfwOnly: filters.sfwOnly,
        verifiedOnly: filters.verifiedOnly,
        minEngagement: filters.minEngagement,
        searchTerm: searchTerm?.substring(0, 20),
        accountTags: accountTags.length,
        selectedTags: filters.selectedTags?.length || 0,
        tagsToUse: tagsToUse
      })

      // Use the RPC function for filtering
      // Empty array means show all, non-empty means filter by those tags
      const { data: subreddits, error } = await sb
        .rpc('filter_subreddits_by_tags_jsonb', {
          account_tags: tagsToUse,
          sfw_only: filters.sfwOnly,
          verified_only: filters.verifiedOnly,
          min_engagement: filters.minEngagement,
          search_term: searchTerm || '',
          sort_by: filters.sortBy,
          sort_direction: filters.sortDirection,
          limit_count: PAGE_SIZE,
          offset_count: page * PAGE_SIZE
        })

      if (error) {
        logger.error('Supabase query error:', error.message || 'Unknown error')
        logger.error('Error details:', {
          title: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      const processedSubreddits: SubredditWithPosts[] = (subreddits || []).map((subreddit: SubredditWithPosts) => ({
        ...subreddit,
        recent_posts: [],
        review: subreddit.review ?? null,
        primary_category: subreddit.primary_category || null,
        created_at: subreddit.created_at || new Date().toISOString()
      }))

      logger.log(`[Posting] Fetched ${processedSubreddits.length} subreddits from server`)

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
      logger.error('Error fetching Ok subreddits:', errorMessage)
      if (error instanceof Error) {
        logger.error('Error stack:', error.stack)
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
  }, [addToast, loadFilterCounts]) // Remove filter deps to avoid stale closures



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
      logger.error('Error fetching creator stats:', error)
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
      logger.error('Error fetching creators:', error)
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
      const response = await fetch('/api/reddit/users/toggle-creator', {
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
      logger.error('Error toggling creator:', error)
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
    }
  }, [okSubreddits, handleError])

  // Debounce search query
  // Search query effect is now handled by useDebounce hook

  // Refresh when sort, search, account, tags, or filters change
  useEffect(() => {
    // Reset to first page and re-fetch when sort, search, account, tags, or filters change
    setCurrentPage(0)
    fetchOkSubreddits(0, false, debouncedSearchQuery, {
      sfwOnly,
      verifiedOnly,
      minEngagement,
      sortBy,
      sortDirection,
      selectedAccount,
      selectedTags
    })
     
  }, [sortBy, sortDirection, debouncedSearchQuery, selectedAccount, selectedTags, sfwOnly, verifiedOnly, minEngagement, fetchOkSubreddits])


  // Since we're using server-side filtering and pagination, just pass through the data
  const filteredOkSubreddits = useMemo(() => {
    return okSubreddits
  }, [okSubreddits])

  // Handler functions for toolbar
  const handleSfwChange = useCallback((sfwOnly: boolean) => {
    setSfwOnly(sfwOnly)
  }, [])

  const handleVerifiedChange = useCallback((verifiedOnly: boolean) => {
    setVerifiedOnly(verifiedOnly)
  }, [])

  // Convert slider position (0-100) to actual engagement value (0.005-1)
  const sliderToEngagement = (position: number): number => {
    // Linear mapping for smooth, predictable control
    // Position 0 = 0.005, Position 100 = 1.0
    const minValue = 0.005
    const maxValue = 1.0

    // Simple linear interpolation
    const percentage = position / 100
    return minValue + (maxValue - minValue) * percentage
  }

  // Handle slider movement (updates visual only)
  const handleEngagementChange = useCallback((values: number[]) => {
    if (values[0] !== undefined) {
      setTempSliderPosition(values[0])
    }
  }, [])

  // Handle slider release (triggers filtering)
  const handleEngagementCommit = useCallback((values: number[]) => {
    if (values[0] !== undefined) {
      setSliderPosition(values[0])
      setTempSliderPosition(values[0]) // Keep temp in sync
      const engagement = sliderToEngagement(values[0])
      setMinEngagement(engagement)
      logger.log('[Posting] Slider commit - engagement:', engagement)
    }
  }, [])


  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchOkSubreddits(nextPage, true, debouncedSearchQuery, {
        sfwOnly,
        verifiedOnly,
        minEngagement,
        sortBy,
        sortDirection,
        selectedAccount,
        selectedTags
      })
    }
  }, [currentPage, hasMore, loading, fetchOkSubreddits, debouncedSearchQuery, sfwOnly, verifiedOnly, minEngagement, sortBy, sortDirection, selectedAccount, selectedTags])

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


  // Initial load ONLY - don't duplicate the filter effect
  useEffect(() => {
    setSliderPosition(0) // Initialize slider position
    setTempSliderPosition(0) // Initialize temp slider position
    fetchCreators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setCurrentPage(0)
      fetchOkSubreddits(0, false, debouncedSearchQuery, {
        sfwOnly,
        verifiedOnly,
        minEngagement,
        sortBy,
        sortDirection,
        selectedAccount,
        selectedTags
      })
    }, 300000)
    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sfwOnly, verifiedOnly, minEngagement, sortBy, sortDirection, selectedAccount, selectedTags])

  // Use filtered subreddits (either client-side filtered or server-filtered)
  const sortedSubreddits = useMemo(() => {
    return filteredOkSubreddits
  }, [filteredOkSubreddits])


  // Summary stats (unused variables removed for TypeScript compliance)

  return (
    <DashboardLayout
      title=""
      subtitle={undefined}
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Active Posting Accounts Section - Using Shared Component */}
        <ActiveAccountsSection
          creators={creators}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          loadingCreators={loadingCreators}
          onAddUser={() => setShowAddUserModal(true)}
          onRemoveCreator={toggleCreator}
          removingCreator={removingCreator}
        />

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
                      const response = await fetch('/api/reddit/users/toggle-creator', {
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
                      logger.error('Error removing account:', error)
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

        {/* StandardToolbar and Tag Filter */}
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <StandardToolbar
              // Search
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}

              // First Checkbox for SFW filter
              checkboxLabel="SFW Only"
              checkboxChecked={sfwOnly}
              onCheckboxChange={handleSfwChange}

              // Second Checkbox for Verified filter
              checkboxLabel2="Verified Only"
              checkboxChecked2={verifiedOnly}
              onCheckboxChange2={handleVerifiedChange}

              // Engagement Slider
              sliderLabel="Min Engagement"
              sliderMin={0}
              sliderMax={100}
              sliderStep={0.1}
              sliderValue={tempSliderPosition}
              onSliderChange={handleEngagementChange}
              onSliderCommit={handleEngagementCommit}
              sliderFormatValue={() => {
                // Show as percentage for better UX based on temp position while dragging
                const tempEngagement = sliderToEngagement(tempSliderPosition)
                const percentage = (tempEngagement * 100).toFixed(1)
                return `${percentage}%`
              }}

              // Sort options
              sortOptions={[
                { id: 'score', label: 'Score', icon: Sparkles },
                { id: 'engagement', label: 'Engagement', icon: TrendingUp },
                { id: 'avg_upvotes', label: 'Avg Upvotes', icon: Heart },
                { id: 'min_post_karma', label: 'Min Karma', icon: Users }
              ]}
              currentSort={sortBy}
              onSortChange={(newSortBy: string) => {
                // Toggle direction if same sort field
                if (newSortBy === sortBy) {
                  setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
                } else {
                  setSortBy(newSortBy as SortField)
                  setSortDirection('desc')
                }
              }}

              loading={loading}
              accentColor="linear-gradient(135deg, #FF8395, #FF7A85)"
            />
          </div>

          {/* Tag Filter Dropdown */}
          <TagFilterDropdown
            availableTags={(availableTags as string[]) || []}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            loading={loading}
            // Don't show "untagged only" option in posting page
            showUntaggedOnly={false}
            onShowUntaggedChange={undefined}
          />
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
              onUpdate={(id: number, updates: Partial<SubredditWithPosts>) => {
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