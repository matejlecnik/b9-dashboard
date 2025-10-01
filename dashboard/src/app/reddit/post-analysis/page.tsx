'use client'

import { useRef, useEffect } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { PostAnalysisErrorBanner } from '@/components/common/PostAnalysisErrorBanner'
import { PostAnalysisStats } from '@/components/common/PostAnalysisStats'
import { StandardPostCard } from '@/components/shared/StandardPostCard'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { usePostAnalysis } from '@/hooks/usePostAnalysis'
import type { Post } from '@/types/post'

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

        {/* Metrics Dashboard */}
        <ComponentErrorBoundary>
          <PostAnalysisStats
            metrics={metrics}
            loading={metricsLoading}
          />
        </ComponentErrorBoundary>


        {/* Post Grid with Standardized Cards */}
        <ComponentErrorBoundary>
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                      <span className="ml-2 text-gray-500">Loading more posts...</span>
                    </>
                  ) : (
                    <div className="text-gray-400">Scroll to load more</div>
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