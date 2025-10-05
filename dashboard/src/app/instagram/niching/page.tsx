'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Users,
  TrendingUp,
  Clock,
  UserPlus,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { StandardToolbar, UniversalCreatorTable } from '@/components/shared'
import { NicheSelector } from '@/components/instagram/NicheSelector'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { useDebounce } from '@/hooks/useDebounce'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatNumber } from '@/lib/formatters'
import { toast } from 'sonner'


import type { Creator } from '@/components/shared'

const PAGE_SIZE = 50

export default function NichingPage() {
  const [creators, setCreators] = useState<Record<string, unknown>[]>([])
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
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customNiche, setCustomNiche] = useState('')
  const fetchingPageRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Handle search query change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Fetch available niches and counts
  const fetchNicheCounts = useCallback(async (signal?: AbortSignal) => {
    if (!supabase) {
      logger.error('Supabase client not available')
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
      if (error && (error as Error).name !== 'AbortError') {
        logger.error('Error fetching niche counts:', error)
      }
    }
  }, [])

  // Fetch creators
  const fetchCreators = useCallback(async (signal?: AbortSignal) => {
    if (fetchingPageRef.current === 0) return

    if (!supabase) {
      logger.error('Supabase client not available')
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
    } catch (error) {
      if (error && (error as Error).name !== 'AbortError') {
        logger.error('Error fetching creators:', error)
        toast.error('Failed to load creators')
      }
    } finally {
      setLoading(false)
      fetchingPageRef.current = null
    }
  }, [selectedNiches, availableNiches, debouncedSearchQuery])

  // Load more creators
  const loadMoreCreators = useCallback(async () => {
    if (loadingMore || !hasMore || fetchingPageRef.current !== null) return

    const nextPage = currentPage + 1
    fetchingPageRef.current = nextPage
    setLoadingMore(true)

    try {
      if (!supabase) {
        logger.error('Supabase client not available')
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
    } catch (error) {
      logger.error('Error loading more creators:', error)
    } finally {
      setLoadingMore(false)
      fetchingPageRef.current = null
    }
  }, [selectedNiches, availableNiches, debouncedSearchQuery, currentPage, hasMore, loadingMore])

  // Update niche for single creator
  const updateNiche = useCallback(async (creatorId: number, niche: string | null) => {
    try {
      if (!supabase) {
        logger.error('Supabase client not available')
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
      logger.error('Error:', error)
      toast.error('An error occurred while updating niche')
    }
  }, [selectedNiches, fetchNicheCounts])

  // Bulk update niches
  const bulkUpdateNiche = useCallback(async (niche: string | null) => {
    if (selectedCreators.size === 0) return

    try {
      if (!supabase) {
        logger.error('Supabase client not available')
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
      logger.error('Error:', error)
      toast.error('An error occurred during bulk update')
    }
  }, [selectedCreators, fetchCreators, fetchNicheCounts])


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
    <DashboardLayout>
      <div className="flex flex-col gap-6">
              {/* Progress Card with AI Button */}
              <ComponentErrorBoundary>
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
              </ComponentErrorBoundary>

              {/* StandardToolbar */}
              <ComponentErrorBoundary>
                <StandardToolbar
                // Search
                searchValue={searchQuery}
                onSearchChange={handleSearchChange}

                // Filters
                filters={[
                  {
                    id: 'all',
                    label: 'All',
                    count: nicheCounts.all
                  },
                  {
                    id: 'unniched',
                    label: 'Unniched',
                    count: nicheCounts.unniched
                  },
                  {
                    id: 'niched',
                    label: 'Niched',
                    count: nicheCounts.all - nicheCounts.unniched
                  }
                ]}
                currentFilter={selectedNiches.length === 0 ? 'unniched' : 'niched'}
                onFilterChange={(filterId: string) => {
                  if (filterId === 'unniched') {
                    setSelectedNiches([])
                  } else if (filterId === 'niched') {
                    setSelectedNiches(availableNiches)
                  } else {
                    setSelectedNiches([])
                  }
                }}

                // Sort options
                sortOptions={[
                  { id: 'followers', label: 'Followers', icon: Users },
                  { id: 'engagement', label: 'Engagement', icon: TrendingUp },
                  { id: 'recent', label: 'Recent', icon: Clock }
                ]}
                currentSort="followers"
                onSortChange={() => {
                  // Sort is handled by the database query
                }}

                // Action buttons
                actionButtons={[
                  {
                    id: 'add-creator',
                    label: 'Add Creator',
                    icon: UserPlus,
                    onClick: () => {toast.info('Add creator functionality coming soon')},
                    variant: 'default' as const
                  }
                ]}

                // Bulk actions (when items selected)
                selectedCount={selectedCreators.size}
                bulkActions={selectedCreators.size > 0 ? [
                  {
                    id: 'set-niche',
                    label: 'Set Niche',
                    icon: Tag,
                    onClick: () => {
                      const niche = prompt('Enter niche for selected creators:')
                      if (niche !== null) {
                        bulkUpdateNiche(niche || 'none')
                      }
                    },
                    variant: 'secondary' as const
                  }
                ] : []}
                onClearSelection={() => setSelectedCreators(new Set())}

                  loading={loading}
                  accentColor="linear-gradient(135deg, #E1306C, #F77737)"
                />
              </ComponentErrorBoundary>

              {showCustomInput && (
                <div className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                  <Input
                    type="text"
                    placeholder="Enter new niche..."
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    className="w-[240px] h-8"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customNiche.trim()) {
                        bulkUpdateNiche(customNiche.trim())
                        setCustomNiche('')
                        setShowCustomInput(false)
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (customNiche.trim()) {
                        bulkUpdateNiche(customNiche.trim())
                        setCustomNiche('')
                        setShowCustomInput(false)
                      }
                    }}
                    disabled={loading || !customNiche.trim()}
                    className="h-8"
                  >
                    Apply Niche
                  </Button>
                </div>
              )}

              {/* Extended Instagram Table with Niche Column */}
              <ComponentErrorBoundary>
                <div className="relative rounded-2xl overflow-hidden transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                  <UniversalCreatorTable
                  creators={creators as unknown as Creator[]}
                  loading={loading}
                  selectedCreators={selectedCreators}
                  setSelectedCreators={setSelectedCreators}
                  searchQuery={debouncedSearchQuery}
                  onReachEnd={loadMoreCreators}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onUpdateReview={(id: number, status: 'ok' | 'non_related' | 'pending') => {
                    // Update review status
                    (async () => {
                      try {
                        if (!supabase) {
                          logger.error('Supabase client not available')
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
                        logger.error('Error updating review:', error)
                        toast.error('An error occurred')
                      }
                    })()
                    }}
                  />
                </div>
              </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}