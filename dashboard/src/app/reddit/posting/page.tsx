'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type React from 'react'
import { supabase, type Subreddit, type Post } from '../../../lib/supabase'
import { useErrorHandler } from '@/lib/errorUtils'

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
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
  const [allFetchedSubreddits, setAllFetchedSubreddits] = useState<SubredditWithPosts[]>([])

  // Load filter counts for UI
  const loadFilterCounts = useCallback(async () => {
    if (!supabase) return
    try {
      const sb = supabase as NonNullable<typeof supabase>
      const [sfwResult, nsfwResult, verifiedResult] = await Promise.all([
        sb.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .eq('over18', false),
        sb.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .eq('over18', true),
        sb.from('reddit_subreddits').select('id', { count: 'exact', head: true })
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .eq('verification_required', true)
      ])
      setSfwCount(sfwResult.count || 0)
      setNsfwCount(nsfwResult.count || 0)
      setVerifiedCount(verifiedResult.count || 0)
    } catch {
      setSfwCount(0)
      setNsfwCount(0)
      setVerifiedCount(0)
    }
  }, [])

  // Optimized fetch with pagination and selective fields - now filtered by tags
  const fetchOkSubreddits = useCallback(async (page = 0, append = false, searchTerm = '') => {
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
        'min_post_karma': 'min_post_karma',
        'engagement': 'subscriber_engagement_ratio'
      }

      const sortColumn = sortColumnMap[sortBy]

      // Get account tags if an account is selected
      let accountTags: string[] = []
      if (selectedAccount?.model?.assigned_tags) {
        accountTags = selectedAccount.model.assigned_tags
      }

      // Use RPC function to filter by tags if account has tags
      if (accountTags.length > 0) {
        // Fetch ALL matching subreddits on first page or when filters change
        const shouldFetchAll = page === 0 && !append

        let allSubreddits: any[] = []

        if (shouldFetchAll) {
          // Fetch all data in batches to overcome 1000 row limit
          const BATCH_SIZE = 1000
          let currentOffset = 0
          let hasMoreData = true

          console.log('[Posting] Fetching all subreddits matching account tags...')

          while (hasMoreData) {
            const { data: batch, error } = await sb.rpc('filter_subreddits_by_tags', {
              tag_array: accountTags,
              search_term: searchTerm && searchTerm.trim() ? searchTerm.trim() : null,
              review_filter: 'Ok',
              filter_type: 'all',
              limit_count: BATCH_SIZE,
              offset_count: currentOffset
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

            const batchData = batch || []
            allSubreddits = [...allSubreddits, ...batchData]

            console.log(`[Posting] Fetched batch: ${batchData.length} subreddits (total: ${allSubreddits.length})`)

            // Check if we should continue fetching
            if (batchData.length < BATCH_SIZE) {
              hasMoreData = false
            } else {
              currentOffset += BATCH_SIZE
            }
          }

          console.log(`[Posting] Total subreddits fetched: ${allSubreddits.length}`)
          setAllFetchedSubreddits(allSubreddits)
        } else {
          // Regular paginated fetch for load more
          const { data: subreddits, error } = await sb.rpc('filter_subreddits_by_tags', {
            tag_array: accountTags,
            search_term: searchTerm && searchTerm.trim() ? searchTerm.trim() : null,
            review_filter: 'Ok',
            filter_type: 'all',
            limit_count: PAGE_SIZE,
            offset_count: page * PAGE_SIZE
          })

          if (error) {
            console.error('Supabase RPC error:', error.message || 'Unknown error')
            throw error
          }

          allSubreddits = subreddits || []

          // When appending, use existing all fetched subreddits
          if (append) {
            allSubreddits = allFetchedSubreddits
          }
        }

        // Apply filters to all subreddits
        let filteredSubreddits = allSubreddits

        // Apply SFW filter
        if (sfwOnly) {
          filteredSubreddits = filteredSubreddits.filter((s: any) => !s.over18)
        }

        // Apply verification filter
        if (verifiedOnly) {
          filteredSubreddits = filteredSubreddits.filter((s: any) => s.verification_required === true)
        }

        // Update counts based on filtered results
        const sfwSubs = allSubreddits.filter((s: any) => !s.over18)
        const nsfwSubs = allSubreddits.filter((s: any) => s.over18)
        const verifiedSubs = allSubreddits.filter((s: any) => s.verification_required === true)

        setSfwCount(sfwSubs.length)
        setNsfwCount(nsfwSubs.length)
        setVerifiedCount(verifiedSubs.length)

        // Sort the results
        filteredSubreddits.sort((a: any, b: any) => {
          const aVal = a[sortColumn] || 0
          const bVal = b[sortColumn] || 0

          if (sortDirection === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
          }
        })

        // Apply pagination to filtered results
        const startIdx = page * PAGE_SIZE
        const endIdx = startIdx + PAGE_SIZE
        const paginatedSubreddits = shouldFetchAll
          ? filteredSubreddits.slice(startIdx, endIdx)
          : filteredSubreddits // When not fetching all, results are already paginated from RPC

        // Process and set the results
        const processedSubreddits: SubredditWithPosts[] = paginatedSubreddits.map((subreddit: any) => ({
          ...subreddit,
          recent_posts: [],
          review: subreddit.review ?? null,
          primary_category: subreddit.primary_category || null,
          created_at: new Date().toISOString()
        })) as SubredditWithPosts[]

        if (append) {
          setOkSubreddits(prev => [...prev, ...processedSubreddits])
        } else {
          setOkSubreddits(processedSubreddits)
        }

        // Check if there are more results
        const totalFilteredCount = shouldFetchAll ? filteredSubreddits.length : processedSubreddits.length
        setHasMore(shouldFetchAll ? endIdx < totalFilteredCount : processedSubreddits.length === PAGE_SIZE)
        setLastUpdated(new Date())

        return // Exit early since we handled everything
      }

      // Build the base query (no account tags case)
      let query = sb
        .from('reddit_subreddits')
        .select(`
          id, name, display_name_prefixed, title, public_description,
          subscribers, avg_upvotes_per_post, subscriber_engagement_ratio,
          best_posting_hour, best_posting_day, over18, primary_category,
          image_post_avg_score, video_post_avg_score, text_post_avg_score,
          last_scraped_at, min_account_age_days, min_comment_karma,
          min_post_karma, allow_images, icon_img, community_icon,
          top_content_type, comment_to_upvote_ratio, accounts_active,
          verification_required, tags, rules_data
        `)
        .eq('review', 'Ok')
        .not('name', 'ilike', 'u_%')

      // Apply search filter (server-side)
      if (searchTerm && searchTerm.trim()) {
        const search = searchTerm.trim()
        query = query.or(`name.ilike.%${search}%,display_name_prefixed.ilike.%${search}%,title.ilike.%${search}%,public_description.ilike.%${search}%,top_content_type.ilike.%${search}%`)
      }

      // Apply SFW filter
      if (sfwOnly) {
        query = query.eq('over18', false)
      }

      // Apply verification filter
      if (verifiedOnly) {
        query = query.eq('verification_required', true)
      }

      // Apply sorting and pagination
      const { data: subreddits, error } = await query
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) {
        console.error('Supabase query error:', error.message || 'Unknown error')
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }


      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedSubreddits: SubredditWithPosts[] = (subreddits || []).map((subreddit: any) => ({
        ...subreddit,
        recent_posts: [],
        review: subreddit.review ?? null,
        primary_category: subreddit.primary_category || null,
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
  }, [sortBy, sortDirection, addToast, loadFilterCounts, sfwOnly, verifiedOnly, selectedAccount, allFetchedSubreddits])



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
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

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



  // Apply client-side filtering when we have all fetched data
  const filteredOkSubreddits = useMemo(() => {
    // If we have account-based filtering with allFetchedSubreddits, apply filters
    if (selectedAccount?.model?.assigned_tags && allFetchedSubreddits.length > 0) {
      let filtered = [...allFetchedSubreddits]

      // Apply SFW filter
      if (sfwOnly) {
        filtered = filtered.filter(s => !s.over18)
      }

      // Apply Verified filter
      if (verifiedOnly) {
        filtered = filtered.filter(s => s.verification_required === true)
      }

      // Apply search filter
      if (debouncedSearchQuery) {
        const search = debouncedSearchQuery.toLowerCase()
        filtered = filtered.filter(s =>
          s.name?.toLowerCase().includes(search) ||
          s.display_name_prefixed?.toLowerCase().includes(search) ||
          s.title?.toLowerCase().includes(search) ||
          s.public_description?.toLowerCase().includes(search)
        )
      }

      // Sort the results
      const sortColumnMap: Record<SortField, string> = {
        'avg_upvotes': 'avg_upvotes_per_post',
        'min_post_karma': 'min_post_karma',
        'engagement': 'subscriber_engagement_ratio'
      }
      const sortColumn = sortColumnMap[sortBy]

      filtered.sort((a: any, b: any) => {
        const aVal = a[sortColumn] || 0
        const bVal = b[sortColumn] || 0

        if (sortDirection === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
        }
      })

      // Apply pagination
      const startIdx = currentPage * PAGE_SIZE
      const endIdx = startIdx + PAGE_SIZE
      const paginated = filtered.slice(0, endIdx) // Show all up to current page

      // Update counts
      const sfwSubs = allFetchedSubreddits.filter((s: any) => !s.over18)
      const nsfwSubs = allFetchedSubreddits.filter((s: any) => s.over18)
      const verifiedSubs = allFetchedSubreddits.filter((s: any) => s.verification_required === true)

      // Update hasMore state
      if (filtered.length !== okSubreddits.length || endIdx < filtered.length) {
        setHasMore(endIdx < filtered.length)
      }

      return paginated
    }

    // Otherwise use server-filtered data
    return okSubreddits
  }, [okSubreddits, allFetchedSubreddits, selectedAccount, sfwOnly, verifiedOnly, debouncedSearchQuery, sortBy, sortDirection, currentPage])

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