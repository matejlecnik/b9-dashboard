'use client'

import React, { useState, memo } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CategoryFilterPills } from './CategoryFilterPills'
import { SortButton, CompactSortButton } from './SortButton'
import { UniversalToolbar } from './UniversalToolbar'

type SortField = 'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour' | 'moderator_score' | 'health_score'
type SortDirection = 'asc' | 'desc'

interface SimplifiedPostingToolbarProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  
  // Sorting
  sortBy: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField, direction: SortDirection) => void
  
  // SFW Filtering
  sfwOnly: boolean
  onSFWOnlyChange: (sfwOnly: boolean) => void
  sfwCount?: number
  
  // Category Filtering
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  categoryCounts?: Record<string, number>
  
  // Controls
  onClearAllFilters: () => void
  loading?: boolean
  
  // Results
  totalResults?: number
  filteredResults?: number
}

export const SimplifiedPostingToolbar = memo(function SimplifiedPostingToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  sfwOnly,
  onSFWOnlyChange,
  sfwCount = 0,
  selectedCategories,
  onCategoriesChange,
  categoryCounts = {},
  onClearAllFilters,
  loading = false,
  totalResults = 0,
  filteredResults = 0
}: SimplifiedPostingToolbarProps) {
  const [showCategoryFilters, setShowCategoryFilters] = useState(false)
  
  const hasActiveFilters = selectedCategories.length > 0 || sfwOnly || searchQuery.trim()
  
  // Helper functions for CategoryFilterPills
  const handleCategoryToggle = (category: string) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]
    onCategoriesChange(newSelected)
  }
  
  const handleClearCategories = () => {
    onCategoriesChange([])
  }

  return (
    <div className="space-y-4">
      <UniversalToolbar
        variant="unified"
        search={{
          id: 'posting-search',
          placeholder: 'Search subreddits by name, description...',
          value: searchQuery,
          onChange: onSearchChange,
          maxWidth: 'lg:max-w-[40%]'
        }}
        filters={[
          {
            id: 'categories-toggle',
            label: 'Categories',
            isActive: showCategoryFilters,
            onClick: () => setShowCategoryFilters(!showCategoryFilters),
            count: selectedCategories.length,
            activeBg: 'linear-gradient(135deg, #FF8395, #FF6B80)',
            activeTextColor: '#ffffff'
          },
          {
            id: 'sfw-all',
            label: 'All',
            isActive: !sfwOnly,
            onClick: () => onSFWOnlyChange(false),
            count: 'All',
            activeBg: 'linear-gradient(135deg, #FF6B80, #FF8395)',
            activeTextColor: '#ffffff'
          },
          {
            id: 'sfw-only',
            label: 'SFW Only',
            isActive: sfwOnly,
            onClick: () => onSFWOnlyChange(true),
            count: sfwCount.toLocaleString('en-US'),
            activeBg: 'linear-gradient(135deg, #FF99A9, #FFB3C1)',
            activeTextColor: '#ffffff'
          }
        ]}
        actions={hasActiveFilters ? [{
          id: 'clear-filters',
          label: 'Clear',
          icon: X,
          onClick: onClearAllFilters,
          variant: 'ghost' as const,
          className: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50',
          title: 'Clear all filters'
        }] : []}
        customContent={
          <>
            {/* Sort Controls */}
            <div className="flex items-center gap-3 justify-end mt-3">
              <div className="hidden lg:block">
                <SortButton 
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSortChange={onSortChange}
                  loading={loading}
                />
              </div>
              
              <div className="lg:hidden">
                <CompactSortButton 
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSortChange={onSortChange}
                  loading={loading}
                />
              </div>
            </div>

            {/* Category Filters Expansion */}
            {showCategoryFilters && (
              <div className="mt-4 p-4 border-t border-gray-200/50">
                <CategoryFilterPills 
                  selectedCategories={selectedCategories}
                  onCategoryToggle={handleCategoryToggle}
                  onClearCategories={handleClearCategories}
                  subredditCounts={categoryCounts}
                  loading={loading}
                />
              </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3">
                {selectedCategories.length > 0 && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    {selectedCategories.length === 1 
                      ? selectedCategories[0] 
                      : `${selectedCategories.length} categories`
                    }
                  </Badge>
                )}
                {sfwOnly && (
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                    SFW Only
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                    Search active
                  </Badge>
                )}
              </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-pink-600">
                  {loading ? '...' : filteredResults.toLocaleString('en-US')}
                </span>
                {filteredResults !== totalResults && (
                  <> of <span className="font-semibold text-gray-900">
                    {totalResults.toLocaleString('en-US')}
                  </span></>
                )} subreddits
              </div>
            </div>
          </>
        }
        layout="responsive"
        showResultsSummary={false}
        loading={loading}
        keyboard={{ enabled: false }}
        testId="simplified-posting-toolbar"
      />

      {/* Active search indicator */}
      {searchQuery.trim() && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {loading ? (
              'Searching...'
            ) : (
              <>
                Search results for{' '}
                <span className="font-medium text-pink-600">
                  &quot;{searchQuery}&quot;
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
})