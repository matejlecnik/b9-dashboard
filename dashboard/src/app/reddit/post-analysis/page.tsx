'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PostAnalysisToolbar } from '@/components/PostAnalysisToolbar'
import { PostAnalysisStats } from '@/components/PostAnalysisStats'
import { VirtualizedPostGrid } from '@/components/VirtualizedPostGrid'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { PostAnalysisErrorBanner } from '@/components/PostAnalysisErrorBanner'
import { usePostAnalysis } from '@/hooks/usePostAnalysis'

export default function PostAnalysisPage() {
  const {
    // Data
    posts,
    metrics,
    sfwCount,
    nsfwCount,
    
    // Loading states
    loading,
    metricsLoading,
    hasMore,
    
    // Filter states
    searchQuery,
    selectedCategories,
    isCategoryFiltering,
    sfwOnly,
    ageFilter,
    sortBy,
    
    // Actions
    setSearchQuery,
    setSelectedCategories,
    setIsCategoryFiltering,
    setSfwOnly,
    setAgeFilter,
    setSortBy,
    loadMorePosts,
    
    // Error handling
    error,
    setError
  } = usePostAnalysis({ initialPostsPerPage: 20 })

  return (
    <DashboardLayout>
      <div className="space-y-8">
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

        {/* Filters and Toolbar */}
        <ComponentErrorBoundary>
          <PostAnalysisToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            isCategoryFiltering={isCategoryFiltering}
            onToggleCategoryFilter={() => setIsCategoryFiltering(!isCategoryFiltering)}
            sfwOnly={sfwOnly}
            onSfwChange={setSfwOnly}
            ageFilter={ageFilter}
            onAgeFilterChange={setAgeFilter}
            loading={loading}
            sfwCount={sfwCount}
            nsfwCount={nsfwCount}
            currentPostCount={posts.length}
            totalAvailablePosts={sfwCount + nsfwCount}
          />
        </ComponentErrorBoundary>

        {/* Post Grid */}
        <ComponentErrorBoundary>
          <VirtualizedPostGrid
            posts={posts}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMorePosts}
            className="min-h-[600px]"
          />
        </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}