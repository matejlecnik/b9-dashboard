'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { StandardReelCard } from '@/components/instagram/StandardReelCard'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { UniversalMetricCard } from '@/components/shared/cards/UniversalMetricCard'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { useInstagramReels, useReelsStats } from '@/hooks/queries/useInstagramReels'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export default function InstagramReelsPage() {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sliderIndex, setSliderIndex] = useState(0) // Default to "Last 1 day" (index 0 = 1 day)
  const [currentSort, setCurrentSort] = useState('play_count')

  // Discrete age filter values (8 points only)
  const ageFilterValues = [1, 2, 3, 4, 5, 6, 7, 30]
  const maxDaysAgo = ageFilterValues[sliderIndex]

  // Debounce for better performance
  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedMaxDaysAgo = useDebounce(maxDaysAgo, 500)

  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInstagramReels({
    search: debouncedSearch,
    maxDaysAgo: debouncedMaxDaysAgo,
    orderBy: currentSort as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    order: 'desc'
  })

  // Flatten pages for display
  const reels = useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useReelsStats(debouncedMaxDaysAgo)

  // Format slider value (8 discrete points)
  const formatSliderValue = useCallback((days: number) => {
    if (days === 1) return "Last 24h"
    if (days === 7) return "Last week"
    if (days === 30) return "Last month"
    return `Last ${days} days`
  }, [])

  // Format cutoff date for display
  const _formatCutoffDate = useCallback((daysAgo: number) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysAgo)
    return cutoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  // Infinite scroll setup
  useEffect(() => {
    if (!hasNextPage || isLoading) return

    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.1
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasNextPage, isLoading, isFetchingNextPage, fetchNextPage])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Metrics Cards */}
        <ComponentErrorBoundary>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <UniversalMetricCard
                  key={i}
                  title="Loading..."
                  value=""
                  loading={true}
                />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <UniversalMetricCard
                title="Total Reels"
                value={formatNumber(stats.totalReels)}
                subtitle={`From ${stats.uniqueCreators} creators`}
              />
              <UniversalMetricCard
                title="Total Views"
                value={formatNumber(stats.totalViews)}
                subtitle="All time"
              />
              <UniversalMetricCard
                title="Avg Engagement"
                value={`${stats.avgEngagement.toFixed(1)}%`}
                subtitle="Engagement rate"
              />
              <UniversalMetricCard
                title="Top Creator"
                value={stats.topCreator ? `@${stats.topCreator}` : 'N/A'}
                subtitle={formatNumber(stats.topCreatorViews) + " views"}
                highlighted
              />
            </div>
          ) : null}
        </ComponentErrorBoundary>

        {/* StandardToolbar with Age Slider */}
        <ComponentErrorBoundary>
          <StandardToolbar
            // Search
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}

            // Age Slider (8 discrete points only: 1, 2, 3, 4, 5, 6, 7, 30 days)
            sliderLabel="Post Age"
            sliderMin={0}
            sliderMax={7}
            sliderStep={1}
            sliderValue={sliderIndex}
            onSliderChange={(value) => setSliderIndex(value[0])}
            onSliderCommit={(value) => setSliderIndex(value[0])}
            sliderFormatValue={(index) => formatSliderValue(ageFilterValues[index])}

            // Sort dropdown
            sortOptions={[
              { id: 'play_count', label: 'Most Views' },
              { id: 'engagement_rate', label: 'Highest Engagement' },
              { id: 'taken_at', label: 'Most Recent' },
              { id: 'like_count', label: 'Most Liked' }
            ]}
            currentSort={currentSort}
            onSortChange={setCurrentSort}

            loading={isLoading}
            accentColor="linear-gradient(135deg, #E1306C, #F77737)"
          />
        </ComponentErrorBoundary>

        {/* Reels Grid */}
        <ComponentErrorBoundary>
          {isLoading && reels.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl h-[400px] animate-pulse"
                  style={{
                    background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
                    border: '1px solid var(--slate-400-alpha-60)',
                    boxShadow: '0 20px 50px var(--black-alpha-12)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/40 via-transparent to-slate-200/20" />
                </div>
              ))}
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className={cn("text-6xl opacity-20")}>🎬</div>
              <h3 className={cn("text-xl font-semibold", designSystem.typography.color.primary)}>
                No reels found
              </h3>
              <p className={cn("text-sm", designSystem.typography.color.secondary)}>
                {searchQuery ? 'Try adjusting your search query or date range' : 'Try adjusting your date range'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {reels.map((reel) => (
                  <StandardReelCard
                    key={reel.media_pk}
                    reel={reel}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasNextPage && (
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                  {isFetchingNextPage ? (
                    <>
                      <div className={`animate-spin ${designSystem.borders.radius.full} h-6 w-6 border-b-2 border-pink-600`}></div>
                      <span className={cn("ml-2", designSystem.typography.color.subtle)}>Loading more reels...</span>
                    </>
                  ) : (
                    <div className={cn(designSystem.typography.color.disabled)}>Scroll to load more</div>
                  )}
                </div>
              )}
            </div>
          )}
        </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
