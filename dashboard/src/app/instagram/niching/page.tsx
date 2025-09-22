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
import { Progress } from '@/components/ui/progress'
import { Search, Hash, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/utils'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { InstagramTable } from '@/components/instagram/InstagramTable'
import { NicheFilterDropdown } from '@/components/instagram/NicheFilterDropdown'
import { NicheSelector } from '@/components/instagram/NicheSelector'
import { useDebounce } from '@/hooks/useDebounce'


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
  avg_likes_per_post?: number | null
  niche?: string | null
}

const PAGE_SIZE = 50

export default function NichingPage() {
  const [creators, setCreators] = useState<InstagramCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [nicheCounts, setNicheCounts] = useState<Record<string, number>>({
    all: 0,
    unniched: 0,
    'Girl next door': 0
  })
  const [availableNiches, setAvailableNiches] = useState<string[]>(['Girl next door'])
  const [bulkNiche, setBulkNiche] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customNiche, setCustomNiche] = useState('')
  const [postsMetrics, setPostsMetrics] = useState<Map<string, { avgLikes: number, avgComments: number }>>(new Map())
  const fetchingPageRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Handle search query change
  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setSearchQuery(query)
    })
  }, [])

  // Fetch available niches and counts
  const fetchNicheCounts = useCallback(async (signal?: AbortSignal) => {
    if (!supabase) {
      console.error('Supabase client not available')
      return
    }

    try {
      // Get all approved creators for total count
      const totalQuery = supabase
        .from('instagram_creators')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'ok')

      // Get unniched count
      const unnichedQuery = supabase
        .from('instagram_creators')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'ok')
        .is('niche', null)

      // Get all unique niches with counts
      const nichesQuery = supabase
        .from('instagram_creators')
        .select('niche')
        .eq('review_status', 'ok')
        .not('niche', 'is', null)

      if (signal) {
        totalQuery.abortSignal(signal)
        unnichedQuery.abortSignal(signal)
        nichesQuery.abortSignal(signal)
      }

      const [totalResult, unnichedResult, nichesResult] = await Promise.all([
        totalQuery,
        unnichedQuery,
        nichesQuery
      ])

      if (signal?.aborted) return

      // Count occurrences of each niche
      const nicheCounts: Record<string, number> = {
        all: totalResult.count || 0,
        unniched: unnichedResult.count || 0
      }

      if (nichesResult.data) {
        const niches = nichesResult.data.map(d => d.niche).filter(Boolean) as string[]
        const uniqueNiches = new Set<string>()

        niches.forEach(niche => {
          uniqueNiches.add(niche)
          nicheCounts[niche] = (nicheCounts[niche] || 0) + 1
        })

        setAvailableNiches(Array.from(uniqueNiches).sort())
      }

      setNicheCounts(nicheCounts)
    } catch (error) {
      if (error && (error as any).name !== 'AbortError') {
        console.error('Error fetching niche counts:', error)
      }
    }
  }, [supabase])

  // Fetch creators
  const fetchCreators = useCallback(async (signal?: AbortSignal) => {
    if (fetchingPageRef.current === 0) return

    if (!supabase) {
      console.error('Supabase client not available')
      setLoading(false)
      return
    }

    fetchingPageRef.current = 0
    setLoading(true)

    try {
      let query = supabase
        .from('instagram_creators')
        .select('*')
        .eq('review_status', 'ok')
        .order('followers', { ascending: false })
        .range(0, PAGE_SIZE - 1)

      // Apply niche filter
      if (selectedNiches.length === 0) {
        // Show unniched creators
        query = query.is('niche', null)
      } else if (selectedNiches.length === availableNiches.length) {
        // Show all niched creators (not unniched)
        query = query.not('niche', 'is', null)
      } else {
        // Filter by specific niches
        query = query.in('niche', selectedNiches)
      }

      // Apply search
      if (debouncedSearchQuery.trim()) {
        query = query.ilike('username', `%${debouncedSearchQuery.trim()}%`)
      }

      if (signal) {
        query = query.abortSignal(signal)
      }

      const { data, error } = await query

      if (signal?.aborted) return

      if (error) throw error

      setCreators(data || [])
      setHasMore((data?.length || 0) === PAGE_SIZE)
      setCurrentPage(0)

      // Fetch post metrics
      if (data && data.length > 0) {
        fetchPostMetrics(data.map(c => c.ig_user_id), signal)
      }
    } catch (error) {
      if (error && (error as any).name !== 'AbortError') {
        console.error('Error fetching creators:', error)
        toast.error('Failed to load creators')
      }
    } finally {
      setLoading(false)
      fetchingPageRef.current = null
    }
  }, [supabase, selectedNiches, availableNiches, debouncedSearchQuery])

  // Load more creators
  const loadMoreCreators = useCallback(async () => {
    if (loadingMore || !hasMore || fetchingPageRef.current !== null) return

    const nextPage = currentPage + 1
    fetchingPageRef.current = nextPage
    setLoadingMore(true)

    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }

      let query = supabase
        .from('instagram_creators')
        .select('*')
        .eq('review_status', 'ok')
        .order('followers', { ascending: false })
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1)

      // Apply niche filter
      if (selectedNiches.length === 0) {
        // Show unniched creators
        query = query.is('niche', null)
      } else if (selectedNiches.length === availableNiches.length) {
        // Show all niched creators (not unniched)
        query = query.not('niche', 'is', null)
      } else {
        // Filter by specific niches
        query = query.in('niche', selectedNiches)
      }

      // Apply search
      if (debouncedSearchQuery.trim()) {
        query = query.ilike('username', `%${debouncedSearchQuery.trim()}%`)
      }

      const { data, error } = await query

      if (error) throw error

      const newData = data || []
      setCreators(prev => [...prev, ...newData])
      setHasMore(newData.length === PAGE_SIZE)
      setCurrentPage(nextPage)

      // Fetch post metrics for new creators
      if (newData.length > 0) {
        fetchPostMetrics(newData.map(c => c.ig_user_id))
      }
    } catch (error) {
      console.error('Error loading more creators:', error)
    } finally {
      setLoadingMore(false)
      fetchingPageRef.current = null
    }
  }, [supabase, selectedNiches, availableNiches, debouncedSearchQuery, currentPage, hasMore, loadingMore])

  // Fetch post metrics
  const fetchPostMetrics = useCallback(async (creatorIds: string[], signal?: AbortSignal) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }

      let query = supabase
        .from('instagram_posts')
        .select('creator_id, like_count, comment_count')
        .in('creator_id', creatorIds)

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

  // Update niche for single creator
  const updateNiche = useCallback(async (creatorId: number, niche: string | null) => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        toast.error('Database connection not available')
        return
      }

      const { error } = await supabase
        .from('instagram_creators')
        .update({ niche })
        .eq('id', creatorId)

      if (error) {
        toast.error('Failed to update niche')
      } else {
        toast.success('Niche updated successfully')

        // Update local state
        setCreators(prev => prev.map(c =>
          c.id === creatorId ? { ...c, niche } : c
        ))

        // Refresh counts
        fetchNicheCounts()

        // If item no longer matches filter, remove it
        if (selectedNiches.length === 0 && niche !== null) {
          // Was showing unniched, now it has a niche
          setCreators(prev => prev.filter(c => c.id !== creatorId))
        } else if (selectedNiches.length > 0 && !selectedNiches.includes(niche || '')) {
          // Was showing specific niches, this one doesn't match anymore
          setCreators(prev => prev.filter(c => c.id !== creatorId))
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while updating niche')
    }
  }, [supabase, selectedNiches, fetchNicheCounts])

  // Bulk update niches
  const bulkUpdateNiche = useCallback(async (niche: string | null) => {
    if (selectedCreators.size === 0) return

    try {
      if (!supabase) {
        console.error('Supabase client not available')
        toast.error('Database connection not available')
        return
      }

      const { error } = await supabase
        .from('instagram_creators')
        .update({ niche })
        .in('id', Array.from(selectedCreators))

      if (error) {
        toast.error('Failed to update creators')
      } else {
        toast.success(`Updated ${selectedCreators.size} creators`)
        setSelectedCreators(new Set())

        // Refresh data
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()
        fetchCreators(abortControllerRef.current.signal)
        fetchNicheCounts(abortControllerRef.current.signal)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred during bulk update')
    }
  }, [selectedCreators, supabase, fetchCreators, fetchNicheCounts])


  // Initial load
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    fetchNicheCounts(signal)
    fetchCreators(signal)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNiches, debouncedSearchQuery])

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
        <main className="flex-1 overflow-auto bg-transparent flex flex-col">
          <div className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
            <div className="space-y-6">
              {/* Progress Card with AI Button */}
              <div className="flex gap-3">
                {/* Progress Bar Card */}
                <div className="flex-1 rounded-2xl p-4 transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Niching Progress</h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round(((nicheCounts.all - nicheCounts.unniched) / Math.max(1, nicheCounts.all)) * 100)}%
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatNumber(nicheCounts.all - nicheCounts.unniched)} / {formatNumber(nicheCounts.all)}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={nicheCounts.all > 0
                      ? ((nicheCounts.all - nicheCounts.unniched) / nicheCounts.all) * 100
                      : 0
                    }
                    className="h-3"
                  />
                </div>

                {/* Add Creator Button (AI Style) */}
                <Button
                  onClick={() => toast.info('Add creator functionality coming soon')}
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Creator</span>
                </Button>
              </div>

              {/* Standard Toolbar with Search and Filters */}
              <div className="flex items-stretch gap-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
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
                <div className="flex items-center gap-2 ml-auto">
                  <NicheFilterDropdown
                    availableNiches={availableNiches}
                    selectedNiches={selectedNiches}
                    onNichesChange={setSelectedNiches}
                    loading={loading}
                    unnichedCount={nicheCounts.unniched}
                    nichedCount={nicheCounts.all - nicheCounts.unniched}
                    nicheCounts={nicheCounts}
                  />
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              {selectedCreators.size > 0 && (
                <div className="flex items-center gap-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedCreators.size} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCreators(new Set())}
                      className="h-8 text-xs"
                    >
                      Deselect all
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={bulkNiche}
                      onValueChange={(v) => {
                        if (v === 'add_new') {
                          setShowCustomInput(true)
                          setBulkNiche('')
                        } else {
                          setBulkNiche(v)
                          setShowCustomInput(false)
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Select niche" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Niche</SelectItem>
                        {availableNiches.map((niche) => (
                          <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                        ))}
                        <SelectItem value="add_new">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Add new niche...
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {showCustomInput && (
                      <Input
                        type="text"
                        placeholder="Enter new niche..."
                        value={customNiche}
                        onChange={(e) => setCustomNiche(e.target.value)}
                        className="w-[180px] h-8"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && customNiche.trim()) {
                            bulkUpdateNiche(customNiche.trim())
                            setCustomNiche('')
                            setShowCustomInput(false)
                          }
                        }}
                      />
                    )}

                    <Button
                      onClick={() => {
                        if (bulkNiche === 'none') {
                          bulkUpdateNiche(null)
                        } else if (bulkNiche && bulkNiche !== 'add_new') {
                          bulkUpdateNiche(bulkNiche)
                        } else if (showCustomInput && customNiche.trim()) {
                          bulkUpdateNiche(customNiche.trim())
                          setCustomNiche('')
                          setShowCustomInput(false)
                        }
                      }}
                      disabled={loading || (!bulkNiche && !customNiche.trim())}
                      className="h-8"
                    >
                      Apply Niche
                    </Button>
                  </div>
                </div>
              )}

              {/* Extended Instagram Table with Niche Column */}
              <div className="relative rounded-2xl overflow-hidden transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <InstagramTable
                  creators={creators}
                  loading={loading}
                  selectedCreators={selectedCreators}
                  setSelectedCreators={setSelectedCreators}
                  searchQuery={debouncedSearchQuery}
                  onReachEnd={loadMoreCreators}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  postsMetrics={postsMetrics}
                  onUpdateReview={async (id, status) => {
                    // Update review status
                    try {
                      if (!supabase) {
                        console.error('Supabase client not available')
                        toast.error('Database connection not available')
                        return
                      }

                      const { error } = await supabase
                        .from('instagram_creators')
                        .update({
                          review_status: status,
                          reviewed_at: new Date().toISOString(),
                          reviewed_by: 'admin'
                        })
                        .eq('id', id)

                      if (error) {
                        toast.error('Failed to update review status')
                      } else {
                        toast.success('Review status updated')
                        // Update local state
                        setCreators(prev => prev.map(c =>
                          c.id === id ? { ...c, review_status: status } : c
                        ))
                      }
                    } catch (error) {
                      console.error('Error updating review:', error)
                      toast.error('An error occurred')
                    }
                  }}
                  customColumns={[
                    {
                      key: 'niche',
                      label: 'Niche',
                      width: 'w-40',
                      render: (creator) => {
                        const creatorWithNiche = creator as InstagramCreator
                        return (
                          <NicheSelector
                            creatorId={creatorWithNiche.id}
                            currentNiche={creatorWithNiche.niche || null}
                            availableNiches={availableNiches}
                            onNicheChange={(niche) => updateNiche(creatorWithNiche.id, niche)}
                          />
                        )
                      }
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}