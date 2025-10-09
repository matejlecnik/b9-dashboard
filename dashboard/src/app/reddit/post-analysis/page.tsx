'use client'

import { useRef, useEffect } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { PostAnalysisErrorBanner } from '@/components/common/PostAnalysisErrorBanner'
import { StandardPostCard } from '@/components/shared/StandardPostCard'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { UniversalMetricCard } from '@/components/shared/cards/UniversalMetricCard'
import { usePostAnalysis } from '@/hooks/usePostAnalysis'
import type { Post } from '@/types/post'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export default function PostAnalysisPage() {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    // Data
    posts,
    metrics,

    // Loading states
    loading,
    metricsLoading,
    hasMore,

    // Actions
    loadMorePosts,

    // Error handling
    error,
    setError
  } = usePostAnalysis({
    initialPostsPerPage: 20
  })

  // Format hour to readable time with UTC
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period} UTC`
  }

  // Infinite scroll setup
  useEffect(() => {
    if (!hasMore || loading) return

    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMorePosts()
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
  }, [hasMore, loading, loadMorePosts])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Error Banner */}
        <PostAnalysisErrorBanner
          error={error}
          onDismiss={() => setError(null)}
        />

        {/* Stats Dashboard */}
        <ComponentErrorBoundary>
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <UniversalMetricCard
                  key={i}
                  title="Loading..."
                  value=""
                  loading={true}
                />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
              <UniversalMetricCard
                title="Total Posts"
                value={metrics.total_posts_count}
                subtitle="Approved only"
              />
              <UniversalMetricCard
                title="Best Subreddit"
                value={`r/${metrics.best_avg_upvotes_subreddit}`}
                subtitle={`${formatNumber(metrics.best_avg_upvotes_value)} upvotes`}
              />
              <UniversalMetricCard
                title="Most Comments"
                value={`r/${metrics.best_engagement_subreddit}`}
                subtitle={`${formatNumber(metrics.best_engagement_value)} comments`}
              />
              <UniversalMetricCard
                title="Best Time"
                value={formatHour(metrics.best_performing_hour)}
                subtitle="Peak engagement"
              />
            </div>
          ) : null}
        </ComponentErrorBoundary>

        {/* Post Grid with Standardized Cards */}
        <ComponentErrorBoundary>
          {loading && posts.length === 0 ? (
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
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {posts.map((post, index) => (
                  <StandardPostCard
                    key={post.reddit_id || `${post.id}-${index}`}
                    post={post}
                    onPostClick={(p: Post) => {
                      const redditUrl = `https://www.reddit.com/r/${p.subreddit_name}/comments/${p.reddit_id}/`
                      window.open(redditUrl, '_blank')
                    }}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                  {loading ? (
                    <>
                      <div className={`animate-spin ${designSystem.borders.radius.full} h-6 w-6 border-b-2 border-primary`}></div>
                      <span className={cn("ml-2", designSystem.typography.color.subtle)}>Loading more posts...</span>
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