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
import { InstagramCard, InstagramMetricCard, ViralFilters, ViralReelsGrid } from '@/components/instagram'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { MetricsCardsSkeleton } from '@/components/shared/SkeletonLoaders'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
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
                    <InstagramMetricCard
                      icon={<Film className="h-4 w-4" />}
                      iconColor="secondary"
                      value={formatNumber(stats?.total_reels || 8001)}
                      label="Total Reels"
                      sublabel="In Database"
                    />

                    <InstagramMetricCard
                      icon={<TrendingUp className="h-4 w-4" />}
                      iconColor="primary"
                      value={formatNumber(stats?.total_viral || 6566)}
                      label="Viral Reels"
                      sublabel="50K+ Views"
                      highlighted
                      badge={
                        <div className={`w-1.5 h-1.5 ${designSystem.borders.radius.full} bg-gradient-to-br from-primary to-primary-hover shadow-sm`} />
                      }
                    />

                    <InstagramMetricCard
                      icon={<Sparkles className="h-4 w-4" />}
                      iconColor="secondary"
                      value={formatNumber(stats?.ultra_viral || 3)}
                      label="Ultra Viral"
                      sublabel="50M+ Views"
                    />

                    <InstagramMetricCard
                      icon={<Eye className="h-4 w-4" />}
                      iconColor="tertiary"
                      value={formatNumber(stats?.avg_views || 1008541)}
                      label="Avg Views"
                      sublabel="Per Viral Reel"
                      className="[&>div:first-child>div:first-child]:text-blue-600"
                    />

                    <InstagramMetricCard
                      icon={<Play className="h-4 w-4" />}
                      iconColor="tertiary"
                      value={formatNumber(stats?.max_views || 112747183)}
                      label="Max Views"
                      sublabel="Top Performer"
                      className="[&>div:first-child>div:first-child]:text-green-600"
                      badge={
                        <div className={`w-1 h-1 ${designSystem.borders.radius.full} bg-gradient-to-br from-green-500 to-green-400 shadow-sm`} />
                      }
                    />
                  </div>
                )}
              </ComponentErrorBoundary>

              {/* Top Creators */}
              {topCreators.length > 0 && (
                <InstagramCard hover>
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
                          <div className={`w-12 h-12 ${designSystem.borders.radius.full} bg-gradient-to-br from-secondary to-primary border-2 border-white shadow-md transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">
                              {creator.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        </a>
                        <p className={cn("text-[10px] mt-1 truncate max-w-[60px] opacity-0 group-hover:opacity-100 transition-opacity", designSystem.typography.color.tertiary)}>
                          @{creator.username}
                        </p>
                      </div>
                    ))}
                  </div>
                </InstagramCard>
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
                <InstagramCard hover padding="none">
                  <div className="px-6 py-4 border-b border-light">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Viral Reels Feed</h3>
                      <span className={cn("text-sm", designSystem.typography.color.tertiary)}>
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
                </InstagramCard>
              </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}