'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, CheckCircle2, XCircle, Clock, ExternalLink, Users, Eye, Heart, Sparkles, Tag, Check, Ban, Slash } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { InstagramSidebar } from '@/components/InstagramSidebar'
import { StandardToolbar } from '@/components/standard'
import { InstagramMetricsCards } from '@/components/instagram/InstagramMetricsCards'
import { useDebounce } from '@/hooks/useDebounce'

type FilterType = 'pending' | 'ok' | 'non_related' | 'all'

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
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const getReviewStatusConfig = (status: string | null) => {
  switch (status) {
    case 'ok':
      return { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
    case 'non_related':
      return { label: 'Non Related', color: 'bg-red-100 text-red-800', icon: XCircle }
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    default:
      return { label: 'Unreviewed', color: 'bg-gray-100 text-gray-800', icon: Clock }
  }
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

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle search query change with performance optimization
  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setSearchQuery(query)
    })
  }, [])

  // Fetch counts separately for accurate metrics
  const fetchCounts = useCallback(async () => {
    try {
      const [pendingResult, okResult, nonRelatedResult, totalResult] = await Promise.all([
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).or('review_status.is.null,review_status.eq.pending'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review_status', 'ok'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true }).eq('review_status', 'non_related'),
        supabase.from('instagram_creators').select('*', { count: 'exact', head: true })
      ])

      setReviewCounts({
        pending: pendingResult.count || 0,
        ok: okResult.count || 0,
        non_related: nonRelatedResult.count || 0,
        total: totalResult.count || 0
      })
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }, [supabase])

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('instagram_creators')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filter
      if (currentFilter !== 'all') {
        if (currentFilter === 'pending') {
          query = query.or('review_status.is.null,review_status.eq.pending')
        } else {
          query = query.eq('review_status', currentFilter)
        }
      }

      // Apply search
      if (debouncedSearchQuery) {
        query = query.or(`username.ilike.%${debouncedSearchQuery}%,full_name.ilike.%${debouncedSearchQuery}%,biography.ilike.%${debouncedSearchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching creators:', error)
        toast.error('Failed to fetch creators')
      } else {
        setCreators(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while fetching creators')
    } finally {
      setLoading(false)
    }
  }, [supabase, currentFilter, debouncedSearchQuery])

  useEffect(() => {
    fetchCreators()
    fetchCounts()
  }, [fetchCreators, fetchCounts])

  const updateCreatorStatus = async (creatorId: number, newStatus: 'ok' | 'non_related' | 'pending') => {
    try {
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
        fetchCounts()

        // If item no longer matches filter, remove it
        if (currentFilter !== 'all' && currentFilter !== newStatus) {
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
        fetchCounts()
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred during bulk update')
    }
  }

  const toggleSelectCreator = (creatorId: number) => {
    const newSelected = new Set(selectedCreators)
    if (newSelected.has(creatorId)) {
      newSelected.delete(creatorId)
    } else {
      newSelected.add(creatorId)
    }
    setSelectedCreators(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCreators.size === creators.length) {
      setSelectedCreators(new Set())
    } else {
      setSelectedCreators(new Set(creators.map(c => c.id)))
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
    },
    {
      id: 'all',
      label: 'All',
      count: reviewCounts.total,
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #6366F1, #818CF8)', // Indigo gradient
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

              {/* Metrics Cards */}
              <div className="mb-6">
                <InstagramMetricsCards
                  totalCreators={reviewCounts.total}
                  pendingCount={reviewCounts.pending}
                  approvedCount={reviewCounts.ok}
                  nonRelatedCount={reviewCounts.non_related}
                  loading={loading}
                />
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

              {/* Creators Table */}
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader>
                  <CardTitle>Creators ({creators.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                  {loading ? (
                    <div className="p-8 text-center">Loading creators...</div>
                  ) : creators.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {debouncedSearchQuery ? 'No creators found matching your search' : 'No creators in this category'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <input
                                type="checkbox"
                                checked={selectedCreators.size === creators.length && creators.length > 0}
                                onChange={toggleSelectAll}
                                className="rounded border-gray-300"
                              />
                            </TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Followers</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead>Engagement</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creators.map((creator) => {
                            const statusConfig = getReviewStatusConfig(creator.review_status)
                            const StatusIcon = statusConfig.icon

                            return (
                              <TableRow key={creator.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedCreators.has(creator.id)}
                                    onChange={() => toggleSelectCreator(creator.id)}
                                    className="rounded border-gray-300"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={creator.profile_pic_url || ''} alt={creator.username} />
                                      <AvatarFallback>{creator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium truncate">@{creator.username}</p>
                                        {creator.is_verified && (
                                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                                        )}
                                        {creator.is_private && (
                                          <Badge variant="outline" className="text-xs">Private</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500 truncate">{creator.full_name || 'No name'}</p>
                                      {creator.biography && (
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">{creator.biography}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 text-gray-400" />
                                      <span className="font-medium">{formatNumber(creator.followers)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Following: {formatNumber(creator.following)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm space-y-1">
                                    <div>{formatNumber(creator.posts_count || creator.media_count)} posts</div>
                                    {creator.viral_content_count_cached && creator.viral_content_count_cached > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {creator.viral_content_count_cached} viral
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {creator.avg_views_per_reel_cached && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Eye className="h-3 w-3 text-gray-400" />
                                        <span>{formatNumber(Math.round(creator.avg_views_per_reel_cached))}</span>
                                      </div>
                                    )}
                                    {creator.engagement_rate_cached && (
                                      <div className="flex items-center gap-1 text-sm">
                                        <Heart className="h-3 w-3 text-gray-400" />
                                        <span>{(creator.engagement_rate_cached * 100).toFixed(1)}%</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("flex items-center gap-1", statusConfig.color)}>
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={creator.review_status || 'pending'}
                                      onValueChange={(value) => updateCreatorStatus(creator.id, value as 'ok' | 'non_related' | 'pending')}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="ok">Approve</SelectItem>
                                        <SelectItem value="non_related">Non Related</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      asChild
                                    >
                                      <a
                                        href={`https://instagram.com/${creator.username}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}