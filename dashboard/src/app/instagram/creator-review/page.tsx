'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Sparkles, Tag, Check, Slash, Clock, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { StandardToolbar } from '@/components/standard'
import { InstagramMetricsCards } from '@/components/instagram/InstagramMetricsCards'
import { InstagramTable } from '@/components/instagram/InstagramTable'
import { RelatedCreatorsModal } from '@/components/instagram/RelatedCreatorsModal'
import { useDebounce } from '@/hooks/useDebounce'

type FilterType = 'pending' | 'ok' | 'non_related'

interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  media_count: number
  review_status: 'pending' | 'ok' | 'non_related' | null
  reviewed_at: string | null
  reviewed_by: string | null
  discovery_source: string | null
  is_private: boolean
  is_verified: boolean
  avg_views_per_reel_cached: number | null
  engagement_rate_cached: number | null
  viral_content_count_cached: number | null
  external_url: string | null
  bio_links: any[] | null
}


export default function CreatorReviewPage() {
  const [creators, setCreators] = useState<InstagramCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('pending')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [reviewCounts, setReviewCounts] = useState({
    pending: 0,
    ok: 0,
    non_related: 0,
    total: 0
  })
  const [countsLoading, setCountsLoading] = useState(true)
  const [postsMetrics, setPostsMetrics] = useState<Map<string, { avgLikes: number, avgComments: number }>>(new Map())
  const [isRelatedCreatorsModalOpen, setIsRelatedCreatorsModalOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Handle search query change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Fetch counts separately for accurate metrics - memoized with stable dependency
  const fetchCounts = useCallback(async (signal?: AbortSignal) => {
    if (!supabase) {
      console.error('Supabase client not available')
      setCountsLoading(false)
      return
    }

    setCountsLoading(true)
    try {
      const queries = [
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).or('review_status.is.null,review_status.eq.pending'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review_status', 'ok'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review_status', 'non_related'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true })
      ]

      // Add abort signal if provided
      if (signal) {
        queries.forEach(q => q.abortSignal(signal))
      }

      const [pendingResult, okResult, nonRelatedResult, totalResult] = await Promise.all(queries)

      setReviewCounts({
        pending: pendingResult.count || 0,
        ok: okResult.count || 0,
        non_related: nonRelatedResult.count || 0,
        total: totalResult.count || 0
      })
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to fetch counts:', error)
        toast.error('Failed to load creator counts')
      }
    } finally {
      setCountsLoading(false)
    }
  }, [supabase]) // Supabase is memoized so this is stable

  const fetchCreators = useCallback(async (signal?: AbortSignal) => {
    if (!supabase) {
      console.error('Supabase client not available')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('instagram_creators')
        .select('*')
        .order(currentFilter === 'pending' ? 'follower_count' : 'created_at', { ascending: false })

      // Apply filter
      if (currentFilter === 'pending') {
        query = query.or('review_status.is.null,review_status.eq.pending')
      } else {
        query = query.eq('review_status', currentFilter)
      }

      // Apply search
      if (debouncedSearchQuery) {
        query = query.or(`username.ilike.%${debouncedSearchQuery}%,full_name.ilike.%${debouncedSearchQuery}%,biography.ilike.%${debouncedSearchQuery}%`)
      }

      // Add abort signal if provided
      if (signal) {
        query = query.abortSignal(signal)
      }

      const { data, error } = await query

      if (signal?.aborted) return

      if (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching creators:', error)
          toast.error('Failed to fetch creators')
        }
      } else {
        setCreators(data || [])
        // Fetch post metrics for the creators
        if (data && data.length > 0) {
          fetchPostMetrics(data.map(c => c.ig_user_id), signal)
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error:', error)
        toast.error('An error occurred while fetching creators')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [currentFilter, debouncedSearchQuery, supabase])

  // Fetch creators when filter or search changes
  useEffect(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new controller for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    fetchCreators(signal)

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchCreators])

  // Fetch counts only on mount
  useEffect(() => {
    const controller = new AbortController()
    fetchCounts(controller.signal)

    return () => {
      controller.abort()
    }
  }, [fetchCounts])

  // Refetch counts after bulk operations
  const refetchCounts = useCallback(() => {
    const controller = new AbortController()
    fetchCounts(controller.signal)
    return () => controller.abort()
  }, [fetchCounts])

  // Fetch post metrics for creators
  const fetchPostMetrics = useCallback(async (creatorIds: string[], signal?: AbortSignal) => {
    try {
      // Query to get average likes per post for each creator
      let query = supabase!
        .from('instagram_posts')
        .select('creator_id, like_count, comment_count')
        .in('creator_id', creatorIds)

      // Add abort signal if provided
      if (signal) {
        query = query.abortSignal(signal)
      }

      const { data, error } = await query

      if (signal?.aborted) return

      if (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching post metrics:', error)
        }
        return
      }

      // Calculate averages per creator
      const metricsMap = new Map<string, { avgLikes: number, avgComments: number }>()
      const creatorData = new Map<string, { likes: number[], comments: number[] }>()

      // Group by creator
      data?.forEach(post => {
        if (!creatorData.has(post.creator_id)) {
          creatorData.set(post.creator_id, { likes: [], comments: [] })
        }
        const creator = creatorData.get(post.creator_id)!
        if (post.like_count !== null) creator.likes.push(post.like_count)
        if (post.comment_count !== null) creator.comments.push(post.comment_count)
      })

      // Calculate averages
      creatorData.forEach((data, creatorId) => {
        const avgLikes = data.likes.length > 0
          ? data.likes.reduce((a, b) => a + b, 0) / data.likes.length
          : 0
        const avgComments = data.comments.length > 0
          ? data.comments.reduce((a, b) => a + b, 0) / data.comments.length
          : 0
        metricsMap.set(creatorId, { avgLikes, avgComments })
      })

      setPostsMetrics(metricsMap)
    } catch (error) {
      console.error('Error calculating post metrics:', error)
    }
  }, [supabase])

  const updateCreatorStatus = async (creatorId: number, newStatus: 'ok' | 'non_related' | 'pending') => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        toast.error('Database connection not available')
        return
      }

      const { error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .eq('id', creatorId)

      if (error) {
        toast.error('Failed to update status')
      } else {
        toast.success('Status updated successfully')

        // Update local state immediately for better UX
        setCreators(prev => prev.map(c =>
          c.id === creatorId ? { ...c, review_status: newStatus } : c
        ))

        // Refresh counts
        refetchCounts()

        // If item no longer matches filter, remove it
        if (currentFilter !== newStatus) {
          setCreators(prev => prev.filter(c => c.id !== creatorId))
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while updating status')
    }
  }

  const bulkUpdateReview = async (newStatus: 'ok' | 'non_related' | 'pending') => {
    if (selectedCreators.size === 0) return

    try {
      if (!supabase) {
        console.error('Supabase client not available')
        toast.error('Database connection not available')
        return
      }

      const { error } = await supabase
        .from('instagram_creators')
        .update({
          review_status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin'
        })
        .in('id', Array.from(selectedCreators))

      if (error) {
        toast.error('Failed to update creators')
      } else {
        toast.success(`Updated ${selectedCreators.size} creators`)
        setSelectedCreators(new Set())
        fetchCreators()
        refetchCounts()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred during bulk update')
    }
  }


  // Filter pills configuration
  const filterOptions = [
    {
      id: 'pending',
      label: 'Pending',
      count: reviewCounts.pending,
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, #EC4899, #F472B6)', // Pink gradient
    },
    {
      id: 'ok',
      label: 'Approved',
      count: reviewCounts.ok,
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #10B981, #34D399)', // Green gradient
    },
    {
      id: 'non_related',
      label: 'Non Related',
      count: reviewCounts.non_related,
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #F59E0B, #FBBF24)', // Amber gradient
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 131, 149, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 131, 149, 0.05) 0%, transparent 50%)
          `
        }}
      />

      {/* Sidebar */}
      <div className="relative z-50">
        <InstagramSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full flex flex-col min-h-0">
            <div className="space-y-6">

              {/* Metrics Cards and Action Button Row */}
              <div className="flex gap-3 mb-4">
                {/* Metrics Cards - Made smaller */}
                <div className="flex-1">
                  <InstagramMetricsCards
                    totalCreators={reviewCounts.total}
                    pendingCount={reviewCounts.pending}
                    approvedCount={reviewCounts.ok}
                    nonRelatedCount={reviewCounts.non_related}
                    loading={loading}
                  />
                </div>

                {/* Action Button - Aligned with cards */}
                <div className="flex items-stretch">
                  <Button
                    onClick={() => setIsRelatedCreatorsModalOpen(true)}
                    disabled={loading}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] h-auto min-h-[100px] px-6"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      <span className="text-sm font-medium">Get Related<br/>Creators</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Combined Toolbar: Search on left, Filters on right */}
              <div className="flex items-stretch justify-between gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                {/* Search Section - Left Side */}
                <div className="flex items-center flex-1 min-w-0 max-w-xs">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                      <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search creators..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      disabled={loading}
                      className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent transition-all duration-200 h-8"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => handleSearchChange('')}
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
                <div className="flex items-center gap-1.5">
                  {filterOptions.map((filter) => {
                    const IconComponent = filter.icon
                    const isActive = currentFilter === filter.id

                    return (
                      <Button
                        key={filter.id}
                        variant="ghost"
                        onClick={() => setCurrentFilter(filter.id as FilterType)}
                        disabled={loading}
                        className="px-2.5 py-1.5 h-8 rounded-md font-medium transition-all duration-200 border-0 focus:outline-none focus:ring-1 focus:ring-pink-500 text-xs"
                        style={{
                          background: isActive
                            ? filter.activeBg
                            : 'rgba(255, 255, 255, 0.8)',
                          color: isActive ? '#ffffff' : '#374151',
                          border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: isActive
                            ? '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                            : '0 1px 4px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        {IconComponent && <IconComponent className="h-3 w-3 mr-1.5" />}
                        <span>{filter.label}</span>
                        <Badge
                          variant="secondary"
                          className="ml-1.5 border-0 text-xs font-medium"
                          style={{
                            background: isActive
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(0, 0, 0, 0.06)',
                            color: isActive ? 'white' : 'rgba(0, 0, 0, 0.75)',
                            fontSize: '0.7rem',
                          }}
                        >
                          {loading ? '...' : filter.count.toLocaleString('en-US')}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Bulk Actions Toolbar (only when items selected) */}
              {selectedCreators.size > 0 && (
                <StandardToolbar
                  variant="actions"
                  selectedCount={selectedCreators.size}
                  onDeselectAll={() => setSelectedCreators(new Set())}
                  actions={[
                    {
                      id: 'approve',
                      label: 'Approve',
                      icon: Check,
                      onClick: () => bulkUpdateReview('ok'),
                      variant: 'default',
                      disabled: loading
                    },
                    {
                      id: 'non-related',
                      label: 'Non Related',
                      icon: Slash,
                      onClick: () => bulkUpdateReview('non_related'),
                      variant: 'outline',
                      disabled: loading
                    },
                    {
                      id: 'pending',
                      label: 'Mark Pending',
                      icon: Clock,
                      onClick: () => bulkUpdateReview('pending'),
                      variant: 'secondary',
                      disabled: loading
                    }
                  ]}
                />
              )}

              {/* Creators Table - Using Reusable Component */}
              <InstagramTable
                creators={creators}
                loading={loading}
                selectedCreators={selectedCreators}
                setSelectedCreators={setSelectedCreators}
                onUpdateReview={updateCreatorStatus}
                searchQuery={debouncedSearchQuery}
                postsMetrics={postsMetrics}
                className="flex-1"
              />
            </div>
          </div>
        </main>
      </div>

      {/* Related Creators Modal */}
      <RelatedCreatorsModal
        isOpen={isRelatedCreatorsModalOpen}
        onClose={() => setIsRelatedCreatorsModalOpen(false)}
      />
    </div>
  )
}