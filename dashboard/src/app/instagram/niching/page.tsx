'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/index'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { InstagramTable } from '@/components/instagram/InstagramTable'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Hash, Search, Users, X } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
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
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [nicheCounts, setNicheCounts] = useState({
    unniched: 0,
    niched: 0
  })
  const [availableNiches, setAvailableNiches] = useState<string[]>(['Girl next door'])
  const [bulkNiche, setBulkNiche] = useState('')
  const [customNiche, setCustomNiche] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [nicheFilter, setNicheFilter] = useState<'all' | 'unniched' | 'niched'>('unniched')
  const fetchingPageRef = useRef<number | null>(null)

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Fetch available niches from database
  const fetchAvailableNiches = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('instagram_creators')
      .select('niche')
      .not('niche', 'is', null)
      .order('niche')

    if (!error && data) {
      const uniqueNiches = Array.from(new Set(data.map(d => d.niche).filter(Boolean))) as string[]
      setAvailableNiches(uniqueNiches.length > 0 ? uniqueNiches : ['Girl next door'])
    }
  }, [])

  // Fetch creators
  const fetchCreators = useCallback(async (page = 0, append = false) => {
    if (fetchingPageRef.current === page) return

    fetchingPageRef.current = page

    if (page === 0) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      if (!supabase) throw new Error('Supabase not initialized')

      let query = supabase
        .from('instagram_creators')
        .select('*', { count: 'exact' })
        .eq('review_status', 'ok') // Only show approved creators
        .order('followers', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      // Apply niche filter
      if (nicheFilter === 'unniched') {
        query = query.is('niche', null)
      } else if (nicheFilter === 'niched') {
        query = query.not('niche', 'is', null)
      }

      // Apply search
      if (debouncedSearchQuery.trim()) {
        query = query.ilike('username', `%${debouncedSearchQuery.trim()}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      const newData = data || []
      setHasMore(newData.length === PAGE_SIZE)

      if (append) {
        setCreators(prev => [...prev, ...newData])
      } else {
        setCreators(newData)
        setCurrentPage(0)
      }

      // Update counts on first page
      if (page === 0) {
        const countQuery = supabase
          .from('instagram_creators')
          .select('niche', { count: 'exact', head: true })
          .eq('review_status', 'ok')

        const [nichedResult, unnichedResult] = await Promise.all([
          countQuery.not('niche', 'is', null),
          supabase.from('instagram_creators').select('niche', { count: 'exact', head: true }).eq('review_status', 'ok').is('niche', null)
        ])

        setNicheCounts({
          niched: nichedResult.count || 0,
          unniched: unnichedResult.count || 0
        })
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
    } finally {
      if (page === 0) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
      fetchingPageRef.current = null
    }
  }, [debouncedSearchQuery, nicheFilter])

  // Update niche for single creator
  const updateNiche = useCallback(async (id: number, niche: string | null) => {
    if (!supabase) return

    const { error } = await supabase
      .from('instagram_creators')
      .update({ niche })
      .eq('id', id)

    if (!error) {
      // Optimistic update
      setCreators(prev => prev.map(c =>
        c.id === id ? { ...c, niche } : c
      ))

      // Update counts
      const creator = creators.find(c => c.id === id)
      if (creator) {
        const wasNiched = creator.niche !== null
        const isNowNiched = niche !== null

        if (wasNiched !== isNowNiched) {
          setNicheCounts(prev => ({
            niched: prev.niched + (isNowNiched ? 1 : -1),
            unniched: prev.unniched + (isNowNiched ? -1 : 1)
          }))
        }
      }

      // Refresh available niches if new one added
      if (niche && !availableNiches.includes(niche)) {
        setAvailableNiches(prev => [...prev, niche].sort())
      }
    }
  }, [creators, availableNiches])

  // Bulk update niches
  const updateBulkNiche = useCallback(async (niche: string | null) => {
    if (!supabase || selectedCreators.size === 0) return

    const selectedIds = Array.from(selectedCreators)

    const { error } = await supabase
      .from('instagram_creators')
      .update({ niche })
      .in('id', selectedIds)

    if (!error) {
      // Update all selected creators
      setCreators(prev => prev.map(c =>
        selectedCreators.has(c.id) ? { ...c, niche } : c
      ))

      // Clear selection
      setSelectedCreators(new Set())

      // Refresh counts
      fetchCreators(0, false)

      // Refresh available niches if new one added
      if (niche && !availableNiches.includes(niche)) {
        setAvailableNiches(prev => [...prev, niche].sort())
      }
    }
  }, [selectedCreators, availableNiches, fetchCreators])

  // Handle niche selection for individual creator
  const handleNicheSelect = useCallback((creatorId: number, value: string) => {
    if (value === 'add_new') {
      // Show custom input for this specific creator
      const customValue = prompt('Enter new niche name:')
      if (customValue && customValue.trim()) {
        updateNiche(creatorId, customValue.trim())
      }
    } else if (value === 'none') {
      updateNiche(creatorId, null)
    } else {
      updateNiche(creatorId, value)
    }
  }, [updateNiche])

  // Initial load
  useEffect(() => {
    fetchAvailableNiches()
    fetchCreators(0, false)
  }, [fetchAvailableNiches, fetchCreators, nicheFilter, debouncedSearchQuery])

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
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Creator Niching</h1>
                <p className="text-sm text-gray-600 mt-1">Assign niche categories to approved creators</p>
              </div>

              {/* Progress Card */}
              <div className="rounded-2xl p-4 transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Niching Progress</h3>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {Math.round((nicheCounts.niched / Math.max(1, nicheCounts.niched + nicheCounts.unniched)) * 100)}%
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatNumber(nicheCounts.niched)} / {formatNumber(nicheCounts.niched + nicheCounts.unniched)}
                    </p>
                  </div>
                </div>
                <Progress
                  value={nicheCounts.niched + nicheCounts.unniched > 0
                    ? (nicheCounts.niched / (nicheCounts.niched + nicheCounts.unniched)) * 100
                    : 0
                  }
                  className="h-3"
                />
              </div>

              {/* Filters and Search */}
              <div className="flex items-center gap-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant={nicheFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setNicheFilter('all')}
                    className="h-8"
                  >
                    All
                    <Badge variant="secondary" className="ml-1.5">
                      {formatNumber(nicheCounts.niched + nicheCounts.unniched)}
                    </Badge>
                  </Button>
                  <Button
                    size="sm"
                    variant={nicheFilter === 'unniched' ? 'default' : 'outline'}
                    onClick={() => setNicheFilter('unniched')}
                    className="h-8"
                  >
                    Un-niched
                    <Badge variant="secondary" className="ml-1.5">
                      {formatNumber(nicheCounts.unniched)}
                    </Badge>
                  </Button>
                  <Button
                    size="sm"
                    variant={nicheFilter === 'niched' ? 'default' : 'outline'}
                    onClick={() => setNicheFilter('niched')}
                    className="h-8"
                  >
                    Niched
                    <Badge variant="secondary" className="ml-1.5">
                      {formatNumber(nicheCounts.niched)}
                    </Badge>
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedCreators.size > 0 && (
                <div className="p-3 bg-white/70 backdrop-blur-md border border-pink-100 rounded-xl flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {formatNumber(selectedCreators.size)} selected
                  </div>
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
                    <SelectTrigger className="w-[220px] h-9">
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
                      className="w-[200px] h-9"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customNiche.trim()) {
                          updateBulkNiche(customNiche.trim())
                          setCustomNiche('')
                          setShowCustomInput(false)
                        }
                      }}
                    />
                  )}

                  <Button
                    onClick={() => {
                      if (showCustomInput && customNiche.trim()) {
                        updateBulkNiche(customNiche.trim())
                        setCustomNiche('')
                        setShowCustomInput(false)
                      } else if (bulkNiche === 'none') {
                        updateBulkNiche(null)
                      } else if (bulkNiche) {
                        updateBulkNiche(bulkNiche)
                      }
                    }}
                    disabled={loading || (showCustomInput && !customNiche.trim()) || (!showCustomInput && !bulkNiche)}
                    className="h-9"
                  >
                    Apply to selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCreators(new Set())}
                    className="h-9"
                  >
                    Clear selection
                  </Button>
                </div>
              )}

              {/* Table with Niche Column */}
              <div className="rounded-2xl overflow-hidden transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <InstagramTableWithNiche
                  creators={creators.map(c => ({
                    ...c,
                    nicheDisplay: (
                      <Select
                        value={c.niche || 'none'}
                        onValueChange={(value) => handleNicheSelect(c.id, value)}
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-gray-500">No niche</span>
                          </SelectItem>
                          {availableNiches.map((niche) => (
                            <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                          ))}
                          <SelectItem value="add_new">
                            <span className="flex items-center gap-1 text-pink-600">
                              <Hash className="h-3 w-3" />
                              Add new...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )
                  }))}
                  loading={loading}
                  selectedCreators={selectedCreators}
                  setSelectedCreators={setSelectedCreators}
                  searchQuery={debouncedSearchQuery}
                  onReachEnd={() => {
                    if (!loading && !loadingMore && hasMore && fetchingPageRef.current === null) {
                      const nextPage = currentPage + 1
                      setCurrentPage(nextPage)
                      fetchCreators(nextPage, true)
                    }
                  }}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Extended table component with niche column
function InstagramTableWithNiche(props: any) {
  const extendedCreators = props.creators.map((creator: any) => ({
    ...creator,
    // Add niche display to the creator object
    _nicheDisplay: creator.nicheDisplay
  }))

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-200/50 font-medium text-gray-700 text-sm">
        {props.setSelectedCreators && (
          <div className="w-10 flex justify-center">
            <input
              type="checkbox"
              checked={props.selectedCreators?.size === props.creators.length && props.creators.length > 0}
              onChange={() => {
                if (props.selectedCreators?.size === props.creators.length && props.creators.length > 0) {
                  props.setSelectedCreators(new Set())
                } else {
                  props.setSelectedCreators(new Set(props.creators.map((c: any) => c.id)))
                }
              }}
            />
          </div>
        )}
        <div className="w-96 px-3">Profile</div>
        <div className="w-28 text-center px-2">Followers</div>
        <div className="w-40 px-2">Niche</div>
        <div className="flex-1" />
      </div>

      {/* Body */}
      <div className="max-h-[600px] overflow-auto">
        {props.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
            <span className="ml-2 text-gray-500">Loading creators...</span>
          </div>
        ) : props.creators.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No creators found
          </div>
        ) : (
          <>
            {props.creators.map((creator: any, index: number) => (
              <div
                key={creator.id}
                className={`flex items-center px-4 py-4 border-b border-gray-100/50 hover:bg-gray-50/30 transition-all duration-200 ${
                  index % 2 === 0 ? 'bg-gray-50/10' : ''
                }`}
              >
                {/* Checkbox */}
                {props.setSelectedCreators && (
                  <div className="w-10 flex justify-center">
                    <input
                      type="checkbox"
                      checked={props.selectedCreators?.has(creator.id)}
                      onChange={() => {
                        const newSelected = new Set(props.selectedCreators)
                        if (newSelected.has(creator.id)) {
                          newSelected.delete(creator.id)
                        } else {
                          newSelected.add(creator.id)
                        }
                        props.setSelectedCreators(newSelected)
                      }}
                    />
                  </div>
                )}

                {/* Profile */}
                <div className="flex items-start gap-3 w-96 px-3">
                  <a
                    href={`https://instagram.com/${creator.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    {creator.profile_pic_url ? (
                      <img
                        src={creator.profile_pic_url}
                        alt={creator.username}
                        className="h-12 w-12 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm flex items-center justify-center font-semibold">
                        {creator.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </a>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">@{creator.username}</div>
                    {creator.full_name && (
                      <div className="text-xs text-gray-500 truncate">{creator.full_name}</div>
                    )}
                  </div>
                </div>

                {/* Followers */}
                <div className="w-28 text-center px-2">
                  <div className="font-semibold text-gray-800 text-sm">
                    {formatNumber(creator.followers)}
                  </div>
                </div>

                {/* Niche */}
                <div className="w-40 px-2">
                  {creator._nicheDisplay}
                </div>

                <div className="flex-1" />
              </div>
            ))}

            {/* Load more sentinel */}
            {props.hasMore && (
              <div className="h-20 flex items-center justify-center">
                {props.loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500" />
                    <span className="ml-2 text-gray-500">Loading more...</span>
                  </>
                ) : (
                  <div className="text-gray-400">Scroll to load more</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}