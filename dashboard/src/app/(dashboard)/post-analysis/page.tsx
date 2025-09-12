'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { SlimPostToolbar } from '@/components/SlimPostToolbar'
import { VirtualizedPostGrid } from '@/components/VirtualizedPostGrid'
import { ComponentErrorBoundary } from '@/components/UniversalErrorBoundary'
import { PostAnalysisMetrics } from '@/components/PostAnalysisMetrics'
import { PostAnalysisErrorBanner } from '@/components/PostAnalysisErrorBanner'
import { usePostAnalysis } from '@/hooks/usePostAnalysis'

export default function PostAnalysisPage() {
  const {
    // Data
    posts,
    metrics,
    sfwCount,
    nsfwCount,
    topCategories,
    
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
        <ComponentErrorBoundary componentName="Post Analysis Metrics">
          <PostAnalysisMetrics
            metrics={metrics}
            loading={metricsLoading}
            sfwCount={sfwCount}
            nsfwCount={nsfwCount}
            topCategories={topCategories}
          />
        </ComponentErrorBoundary>

        {/* Filters and Toolbar */}
        <ComponentErrorBoundary componentName="Post Analysis Toolbar">
          <SlimPostToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            isCategoryFiltering={isCategoryFiltering}
            onToggleCategoryFilter={() => setIsCategoryFiltering(!isCategoryFiltering)}
            sfwOnly={sfwOnly}
            onSFWOnlyChange={setSfwOnly}
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
        <ComponentErrorBoundary componentName="Post Grid">
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