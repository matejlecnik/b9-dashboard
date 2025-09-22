'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PostAnalysisToolbar } from '@/components/PostAnalysisToolbar'
import { PostAnalysisStats } from '@/components/PostAnalysisStats'
import { VirtualizedPostGrid } from '@/components/VirtualizedPostGrid'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { PostAnalysisErrorBanner } from '@/components/PostAnalysisErrorBanner'
import { usePostAnalysis } from '@/hooks/usePostAnalysis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import {
  AlertCircle,
  Info
} from 'lucide-react'
import Image from 'next/image'

interface Creator {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  total_karma: number
  account_age_days: number | null
  icon_img: string | null
  model_id: number | null
  status: string
  verified?: boolean
  is_gold?: boolean
  has_verified_email?: boolean
  created_utc?: string | null
  // Model data
  model?: {
    id: number
    stage_name: string
    status: string
    assigned_tags: string[]
  }
}

export default function PostAnalysisPage() {
  const { addToast } = useToast()
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Creator | null>(null)
  const [loadingCreators, setLoadingCreators] = useState(true)

  const {
    // Data
    posts,
    metrics,
    sfwCount,
    nsfwCount,
    totalPostCount,

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
  } = usePostAnalysis({
    initialPostsPerPage: 20,
    selectedAccount: selectedAccount
  })

  // Memoize the toggle function
  const handleToggleCategoryFilter = useMemo(
    () => () => setIsCategoryFiltering(!isCategoryFiltering),
    [isCategoryFiltering, setIsCategoryFiltering]
  )

  // Fetch creators on mount
  const fetchCreators = useCallback(async () => {
    if (!supabase) return

    try {
      setLoadingCreators(true)
      const { data: usersData, error: usersError } = await supabase
        .from('reddit_users')
        .select(`
          id,
          username,
          link_karma,
          comment_karma,
          total_karma,
          account_age_days,
          icon_img,
          model_id,
          status,
          verified,
          is_gold,
          has_verified_email,
          created_utc
        `)
        .eq('status', 'active')
        .order('total_karma', { ascending: false })
        .limit(100)

      if (usersError) throw usersError

      // Fetch models for users that have model_id
      const modelIds = [...new Set(usersData?.filter(u => u.model_id).map(u => u.model_id))]
      let modelsData: any[] = []

      if (modelIds.length > 0) {
        const { data, error: modelsError } = await supabase
          .from('models')
          .select('id, stage_name, status, assigned_tags')
          .in('id', modelIds)

        if (!modelsError && data) {
          modelsData = data
        }
      }

      // Combine users with their models
      const creatorsWithModels = usersData?.map(user => ({
        ...user,
        model: modelsData.find(m => m.id === user.model_id) || null
      })) || []

      setCreators(creatorsWithModels)
    } catch (error) {
      console.error('Error fetching creators:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load posting accounts',
        type: 'error'
      })
    } finally {
      setLoadingCreators(false)
    }
  }, [])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])


  // Get Reddit profile URL
  const getRedditProfileUrl = (username: string) => {
    return `https://www.reddit.com/user/${username}`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Compact Active Posting Accounts Section */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-md">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base text-gray-900">Active Accounts</CardTitle>
                <Badge variant="outline" className="text-xs bg-pink-50 border-pink-200 py-0">
                  {creators.length}
                </Badge>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Info className="h-3 w-3 mr-1" />
                <span>Select to filter</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {loadingCreators ? (
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-100 rounded p-2 animate-pulse">
                    <div className="w-6 h-6 bg-gray-200 rounded-full mx-auto mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : creators.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">No active accounts</p>
                <p className="text-xs text-gray-500">Manage accounts in the Posting page</p>
              </div>
            ) : (
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
                {creators.map((creator) => {
                  const isSelected = selectedAccount?.id === creator.id
                  const accountAge = creator.account_age_days ?
                    creator.account_age_days > 365 ?
                      `${Math.floor(creator.account_age_days / 365)}y` :
                      `${creator.account_age_days}d`
                    : 'New'

                  return (
                    <div
                      key={creator.id}
                      className={`relative bg-white rounded border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('.no-select')) {
                          setSelectedAccount(isSelected ? null : creator)
                        }
                      }}
                    >
                      <div className="p-1.5">
                        {/* Compact Avatar and Name */}
                        <div className="flex flex-col items-center text-center">
                          <a
                            href={getRedditProfileUrl(creator.username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="no-select mb-0.5"
                            title={`u/${creator.username}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {creator.icon_img ? (
                              <Image
                                src={creator.icon_img}
                                alt={creator.username}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                unoptimized
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-[8px]">
                                {creator.username.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </a>
                          <span className="text-[8px] font-semibold text-gray-900 truncate block max-w-[50px]">
                            {creator.username}
                          </span>
                          {creator.model && (
                            <span className="text-[7px] text-purple-600 font-medium truncate block max-w-[50px]">
                              {creator.model.stage_name}
                            </span>
                          )}
                          <span className="text-[7px] px-1 bg-gray-100 text-gray-600 rounded mt-0.5">
                            {accountAge}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
            onToggleCategoryFilter={handleToggleCategoryFilter}
            sfwOnly={sfwOnly}
            onSfwChange={setSfwOnly}
            ageFilter={ageFilter}
            onAgeFilterChange={setAgeFilter}
            loading={loading}
            sfwCount={sfwCount}
            nsfwCount={nsfwCount}
            currentPostCount={posts.length}
            totalAvailablePosts={sfwOnly ? sfwCount : totalPostCount}
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