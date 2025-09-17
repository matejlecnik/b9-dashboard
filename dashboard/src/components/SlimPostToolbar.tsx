'use client'

import React, { memo, useCallback } from 'react'
import { Shield, ShieldOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MultiSelectCategoryDropdown } from '@/components/MultiSelectCategoryDropdown'
import { UniversalToolbar } from '@/components/UniversalToolbar'
import { ToolbarSearch } from '@/components/ui/ToolbarComponents'

interface SlimPostToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: 'score' | 'comments'
  onSortChange: (sort: 'score' | 'comments') => void
  selectedCategories: string[]
  onCategoryChange: (categories: string[]) => void
  isCategoryFiltering: boolean
  onToggleCategoryFilter: () => void
  sfwOnly: boolean
  onSFWOnlyChange: (sfwOnly: boolean) => void
  ageFilter: '24h' | '7d' | '30d' | 'all'
  onAgeFilterChange: (age: '24h' | '7d' | '30d' | 'all') => void
  loading?: boolean
  sfwCount?: number
  nsfwCount?: number
  currentPostCount?: number
  totalAvailablePosts?: number
}

const SlimPostToolbar = memo(function SlimPostToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCategories,
  onCategoryChange,
  isCategoryFiltering,
  onToggleCategoryFilter,
  sfwOnly,
  onSFWOnlyChange,
  ageFilter,
  onAgeFilterChange,
  loading = false,
  sfwCount = 0,
  nsfwCount = 0,
  currentPostCount = 0,
  totalAvailablePosts = 0,
}: SlimPostToolbarProps) {

  // Handle SFW toggle
  const handleSFWToggle = useCallback(() => {
    onSFWOnlyChange(!sfwOnly)
  }, [sfwOnly, onSFWOnlyChange])

  // Handle category filtering toggle
  const handleCategoryToggle = useCallback(() => {
    onToggleCategoryFilter()
  }, [onToggleCategoryFilter])

  // Removed unused slider-related code for simplicity

  const content = (
    <>
      {/* Simplified Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">
            Post Analysis
          </h2>
          {currentPostCount > 0 && (
            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 font-semibold">
              {currentPostCount.toLocaleString()} 
              {totalAvailablePosts > currentPostCount && (
                <span className="text-pink-600"> of {totalAvailablePosts.toLocaleString()}</span>
              )}
              {currentPostCount === 1 ? ' post' : ' posts'}
            </Badge>
          )}
          {loading && (
            <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          )}
          {sfwCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium border border-green-200">
              <Shield className="w-3 h-3" />
              <span>{sfwCount.toLocaleString()} SFW</span>
            </div>
          )}
          {nsfwCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-200">
              <ShieldOff className="w-3 h-3" />
              <span>{nsfwCount.toLocaleString()} NSFW</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Search Input */}
        <ToolbarSearch
          id="post-search"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search posts by title, subreddit, or content..."
          className="w-full"
        />

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* SFW Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">SFW Only</span>
            <button
              onClick={handleSFWToggle}
              className={`
                  w-14 h-8 rounded-full p-1 relative focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${sfwOnly 
                    ? 'bg-pink-500' 
                    : 'bg-gray-200'
                  }
                `}
              aria-label={sfwOnly ? "Switch to All Content" : "Switch to SFW Only"}
            >
              <div 
                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                  sfwOnly ? 'translate-x-6' : 'translate-x-0'
                }`} 
              />
            </button>
          </div>

          {/* Category Filter Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category Filter</span>
            <button
              onClick={handleCategoryToggle}
              className={`
                  w-14 h-8 rounded-full p-1 relative focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${isCategoryFiltering 
                    ? 'bg-pink-500' 
                    : 'bg-gray-200'
                  }
                `}
              aria-label={isCategoryFiltering ? "Disable Category Filtering" : "Enable Category Filtering"}
            >
              <div 
                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                  isCategoryFiltering ? 'translate-x-6' : 'translate-x-0'
                }`} 
              />
            </button>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <button
              onClick={() => onSortChange('score')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${sortBy === 'score'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              Top Rated
            </button>
            <button
              onClick={() => onSortChange('comments')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${sortBy === 'comments'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              Most Discussed
            </button>
          </div>

          {/* Age Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Age:</span>
            <button
              onClick={() => onAgeFilterChange('24h')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${ageFilter === '24h'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              24h
            </button>
            <button
              onClick={() => onAgeFilterChange('7d')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${ageFilter === '7d'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              7d
            </button>
            <button
              onClick={() => onAgeFilterChange('30d')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${ageFilter === '30d'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              30d
            </button>
            <button
              onClick={() => onAgeFilterChange('all')}
              className={`
                  px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20
                  ${ageFilter === 'all'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                  }
                `}
            >
              All
            </button>
          </div>

          {/* Categories */}
          {isCategoryFiltering && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Categories:</span>
              <MultiSelectCategoryDropdown
                selectedCategories={selectedCategories}
                onCategoriesChange={onCategoryChange}
                className="min-w-[200px]"
              />
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="mb-6 relative z-30">
      <UniversalToolbar variant="unified" animate={false} customContent={content} />
    </div>
  )
})

export { SlimPostToolbar }