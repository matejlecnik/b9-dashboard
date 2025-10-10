'use client'

import { useState } from 'react'
import { Search, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PostingCategoryFilter } from '@/components/shared/PostingCategoryFilter'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import React from 'react'

export type PostSortField = 'score' | 'comments'
export type AgeFilter = '24h' | '7d' | '30d' | 'all'

interface PostAnalysisToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  sfwOnly: boolean
  onSfwChange: (sfwOnly: boolean) => void
  sortBy: PostSortField
  onSortChange: (sort: PostSortField) => void
  ageFilter: AgeFilter
  onAgeFilterChange: (age: AgeFilter) => void
  loading: boolean
  currentPostCount: number
  totalAvailablePosts: number
  sfwCount?: number
  nsfwCount?: number
  onRefresh?: () => void
  availableCategories?: string[]
  isCategoryFiltering?: boolean // Deprecated - kept for compatibility
  onToggleCategoryFilter?: () => void // Deprecated - kept for compatibility
}

export const PostAnalysisToolbar = React.memo(function PostAnalysisToolbar({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  sfwOnly,
  onSfwChange,
  sortBy,
  onSortChange,
  ageFilter,
  onAgeFilterChange,
  loading,
  currentPostCount,
  totalAvailablePosts,
  sfwCount = 0,
  onRefresh,
  availableCategories = [
    'Age Demographics',
    'Ass & Booty',
    'Body Types & Features',
    'Boobs & Chest',
    'Clothed & Dressed',
    'Cosplay & Fantasy',
    'Ethnic & Cultural',
    'Feet & Foot Fetish',
    'Full Body & Nude',
    'Goth & Alternative',
    'Gym & Fitness',
    'Interactive & Personalized',
    'Lifestyle & Themes',
    'Lingerie & Underwear',
    'OnlyFans Promotion',
    'Selfie & Amateur',
    'Specific Body Parts'
  ]
}: PostAnalysisToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  return (
    <div className="bg-white/95 backdrop-blur-sm ${designSystem.borders.radius.md} border border-default shadow-sm overflow-hidden">
      {/* Main Toolbar */}
      <div className="flex items-center gap-3 p-3">
        {/* Search Section - Enhanced */}
        <div className={`relative flex-1 max-w-md transition-all duration-200 ${isSearchFocused ? 'max-w-lg' : ''}`}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Search className={cn("h-4 w-4 transition-colors", isSearchFocused ? 'text-primary' : designSystem.typography.color.disabled)} />
          </div>
          <input
            type="text"
            placeholder=""
            title="Search posts by title, subreddit, author..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            disabled={loading}
            className={`
              w-full pl-9 pr-9 py-2 text-sm border ${designSystem.borders.radius.sm}
              bg-white focus:outline-none transition-all duration-200
              ${isSearchFocused
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-default hover:border-strong'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={cn("absolute inset-y-0 right-0 pr-3 flex items-center transition-colors", designSystem.typography.color.disabled, `hover:${designSystem.typography.color.tertiary}`)}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Section */}
        <div className="flex items-center gap-2">
          {/* SFW Filter Checkbox - Copied from Posting */}
          <label className={cn("flex items-center gap-2 px-3 py-1.5 h-8 bg-white border border-default ${designSystem.borders.radius.sm} transition-colors cursor-pointer", designSystem.background.hover.subtle)}>
            <div className="relative">
              <input
                type="checkbox"
                checked={sfwOnly}
                onChange={(e) => onSfwChange(e.target.checked)}
                className="sr-only"
              />
              <div className={`
                w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                ${sfwOnly
                  ? 'bg-primary border-primary'
                  : 'bg-white border-strong hover:border-primary'
                }
              `}>
                {sfwOnly && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>
              SFW
            </span>
            {sfwOnly && sfwCount > 0 && (
              <span className="text-xs text-primary font-semibold">
                ({formatNumber(sfwCount)})
              </span>
            )}
          </label>

          {/* Category Filter - Using PostingCategoryFilter component */}
          <PostingCategoryFilter
            availableCategories={availableCategories}
            selectedCategories={selectedCategories}
            onCategoriesChange={onCategoriesChange}
            loading={loading}
          />

          {/* Age Filter */}
          <div className="flex items-center gap-1 bg-white border border-default ${designSystem.borders.radius.sm} p-1">
            {(['24h', '7d', '30d', 'all'] as AgeFilter[]).map((age) => (
              <button
                key={age}
                onClick={() => onAgeFilterChange(age)}
                className={cn(
                  "px-3 py-1 text-xs font-medium ${designSystem.borders.radius.sm} transition-colors",
                  ageFilter === age
                    ? 'bg-primary text-white'
                    : cn(designSystem.typography.color.tertiary, designSystem.background.hover.light)
                )}
                disabled={loading}
              >
                {age === 'all' ? 'All Time' : age}
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-1 bg-white border border-default ${designSystem.borders.radius.sm} p-1">
            <button
              onClick={() => onSortChange('score')}
              className={cn(
                "px-3 py-1 text-xs font-medium ${designSystem.borders.radius.sm} transition-colors",
                sortBy === 'score'
                  ? 'bg-primary text-white'
                  : cn(designSystem.typography.color.tertiary, designSystem.background.hover.light)
              )}
              disabled={loading}
            >
              Most Upvotes
            </button>
            <button
              onClick={() => onSortChange('comments')}
              className={cn(
                "px-3 py-1 text-xs font-medium ${designSystem.borders.radius.sm} transition-colors",
                sortBy === 'comments'
                  ? 'bg-primary text-white'
                  : cn(designSystem.typography.color.tertiary, designSystem.background.hover.light)
              )}
              disabled={loading}
            >
              Most Comments
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="px-3"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Result Count */}
          <div className={cn("text-xs font-medium", designSystem.typography.color.tertiary)}>
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                {formatNumber(currentPostCount)} / {formatNumber(totalAvailablePosts)} posts
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  )
})