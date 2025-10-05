'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Film,
  TrendingUp,
  Sparkles,
  Eye,
  Play,
  Heart,
  Clock
} from 'lucide-react'
import { StandardToolbar } from '@/components/shared'
import { ViralFilters } from '@/components/instagram/ViralFilters'
import { ViralReelsGrid } from '@/components/instagram/ViralReelsGrid'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { MetricsCardsSkeleton } from '@/components/shared/SkeletonLoaders'
import { formatNumber } from '@/lib/formatters'
import type { ViralReelsFilters } from '@/lib/supabase/viral-reels'
import {
  useViralReels,
  useViralReelsStats,
  useTopCreators
} from '@/hooks/queries/useInstagramReview'

export default function ViralContentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ViralReelsFilters>({
    minViews: 50000,
    sortBy: 'views',
    sortOrder: 'desc'
  })

  // Fetch viral reels with infinite scroll
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useViralReels(filters)

  // Fetch stats
  const { data: stats } = useViralReelsStats(filters)

  // Fetch top creators
  const { data: topCreators = [] } = useTopCreators(filters, 5)

  // Flatten infinite pages into single array
  const reels = useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  const handleFiltersChange = useCallback((newFilters: ViralReelsFilters) => {
    setFilters(newFilters)
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters({
      minViews: 50000,
      sortBy: 'views',
      sortOrder: 'desc'
    })
  }, [])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
              {/* Stats Cards */}
              <ComponentErrorBoundary>
                {isLoading && !stats ? (
                  <MetricsCardsSkeleton />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl text-purple-700 bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                      <Film className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                      {formatNumber(stats?.total_reels || 8001)}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Total Reels
                    </div>
                    <div className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      In Database
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1 ring-2 ring-pink-200/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl text-[#FF8395] bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #FF8395, #FF7A85)', boxShadow: '0 1px 2px rgba(255, 131, 149, 0.25)' }}></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                      {formatNumber(stats?.total_viral || 6566)}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Viral Reels
                    </div>
                    <div className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      50K+ Views
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl text-purple-700 bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                      {formatNumber(stats?.ultra_viral || 3)}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Ultra Viral
                    </div>
                    <div className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      50M+ Views
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl text-blue-600 bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                      <Eye className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                      {formatNumber(stats?.avg_views || 1008541)}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Avg Views
                    </div>
                    <div className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Per Viral Reel
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl text-green-600 bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                      <Play className="h-4 w-4" />
                    </div>
                    <div className="w-1 h-1 rounded-full" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)' }}></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                      {formatNumber(stats?.max_views || 112747183)}
                    </div>
                    <div className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Max Views
                    </div>
                    <div className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                      Top Performer
                    </div>
                  </div>
                </div>
                </div>
                )}
              </ComponentErrorBoundary>

              {/* Top Creators */}
              {topCreators.length > 0 && (
                <div className="rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] p-4">
                  <div className="flex items-center gap-4 overflow-x-auto">
                    {topCreators.map((creator) => (
                      <div
                        key={creator.username}
                        className="flex flex-col items-center group flex-shrink-0"
                      >
                        <a
                          href={`https://instagram.com/${creator.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white shadow-md transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {creator.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        </a>
                        <p className="text-[10px] text-gray-600 mt-1 truncate max-w-[60px] opacity-0 group-hover:opacity-100 transition-opacity">
                          @{creator.username}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* StandardToolbar */}
              <ComponentErrorBoundary>
                <StandardToolbar
                // Search
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}

                // Filters
                filters={[
                  {
                    id: 'all',
                    label: 'All Reels',
                    count: stats?.total_reels || 0
                  },
                  {
                    id: 'viral',
                    label: 'Viral (50K+)',
                    count: stats?.total_viral || 0
                  },
                  {
                    id: 'mega',
                    label: 'Mega (1M+)',
                    count: stats?.mega_viral || 0
                  },
                  {
                    id: 'ultra',
                    label: 'Ultra (50M+)',
                    count: stats?.ultra_viral || 0
                  }
                ]}
                currentFilter={
                  filters?.minViews || 0 >= 50000000 ? 'ultra' :
                  filters?.minViews || 0 >= 1000000 ? 'mega' :
                  filters?.minViews || 0 >= 50000 ? 'viral' : 'all'
                }
                onFilterChange={(filterId: string) => {
                  const minViews =
                    filterId === 'ultra' ? 50000000 :
                    filterId === 'mega' ? 1000000 :
                    filterId === 'viral' ? 50000 : 0
                  handleFiltersChange({ ...filters, minViews })
                }}

                // Sort options
                sortOptions={[
                  { id: 'views', label: 'Views', icon: Eye },
                  { id: 'likes', label: 'Likes', icon: Heart },
                  { id: 'engagement', label: 'Engagement', icon: TrendingUp },
                  { id: 'recent', label: 'Recent', icon: Clock }
                ]}
                currentSort={filters.sortBy}
                onSortChange={(sortBy: string) => handleFiltersChange({ ...filters, sortBy: sortBy as 'views' | 'likes' | 'engagement' | 'recent' })}

                  loading={isLoading}
                  accentColor="linear-gradient(135deg, #E1306C, #F77737)"
                />
              </ComponentErrorBoundary>

              {/* Advanced Filters */}
              <ComponentErrorBoundary>
                <ViralFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                  onReset={handleResetFilters}
                />
              </ComponentErrorBoundary>

              {/* Viral Reels Grid */}
              <ComponentErrorBoundary>
                <div className="rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Viral Reels Feed</h3>
                      <span className="text-sm text-gray-600">
                        {reels.length} reels shown {hasNextPage && '• More available'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <ViralReelsGrid
                      reels={reels}
                      loading={isLoading}
                      hasMore={hasNextPage || false}
                      onLoadMore={() => fetchNextPage()}
                      loadingMore={isFetchingNextPage}
                    />
                  </div>
                </div>
              </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}