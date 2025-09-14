'use client'

import React, { useState, memo } from 'react'
import { Tags, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MultiSelectCategoryDropdown } from '@/components/MultiSelectCategoryDropdown'
import { UniversalToolbar } from '@/components/UniversalToolbar'
import { ToolbarSearch, ToolbarFilterButton } from '@/components/ui/ToolbarComponents'

type FilterType = 'uncategorized' | 'categorized'

interface CategoryCounts {
  uncategorized: number
  categorized: number
}

interface CategorySearchAndFiltersProps {
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  categoryCounts: CategoryCounts
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
  selectedCategories?: string[]
  onCategoryChange?: (categories: string[]) => void
  onCategorizeAll?: () => void
  categorizingAll?: boolean
  isCategoryFiltering?: boolean
  onToggleCategoryFilter?: () => void
  onSelectAll?: () => void
  availableCategories?: string[]
  aiServiceStatus?: 'checking' | 'connected' | 'disconnected' | 'error'
}

// FilterConfig removed as it's not used in this simplified toolbar

export const CategorySearchAndFilters = memo(function CategorySearchAndFilters({
  currentFilter,
  onFilterChange,
  categoryCounts,
  searchQuery,
  onSearchChange,
  loading,
  selectedCategories = [],
  onCategoryChange = () => {},
  onCategorizeAll = () => {},
  categorizingAll = false,
  aiServiceStatus = 'checking'
}: CategorySearchAndFiltersProps) {
  const [, setIsSearchFocused] = useState(false)

  // Keyboard shortcuts DISABLED per user request

  const content = (
    <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        
        {/* Search Bar */}
        <ToolbarSearch
          id="category-search"
          placeholder="Search subreddits by name, title, or category..."
          value={searchQuery}
          onChange={onSearchChange}
          disabled={loading}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />

        {/* Filter Buttons and Category Dropdown */}
        <div className="flex items-center gap-3 flex-wrap lg:justify-end relative z-40" role="group" aria-label="Categorization filters">
          <ToolbarFilterButton
            id="filter-uncategorized"
            label="Uncategorized"
            icon={AlertTriangle}
            isActive={currentFilter === 'uncategorized'}
            count={loading ? undefined : categoryCounts.uncategorized}
            onClick={() => onFilterChange('uncategorized')}
            disabled={loading}
            gradient="primaryLight"
          />

          <ToolbarFilterButton
            id="filter-categorized"
            label="Categorized"
            icon={Tags}
            isActive={currentFilter === 'categorized'}
            count={loading ? undefined : categoryCounts.categorized}
            onClick={() => onFilterChange('categorized')}
            disabled={loading}
            gradient="success"
          />

          {/* Category Multi-Select Dropdown */}
          <MultiSelectCategoryDropdown
            selectedCategories={selectedCategories}
            onCategoriesChange={onCategoryChange}
            loading={loading}
          />

          {/* Categorize All Button with AI Service Status */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onCategorizeAll}
              disabled={loading || categorizingAll || categoryCounts.uncategorized === 0 || aiServiceStatus === 'disconnected'}
              className="px-4 py-2 h-auto"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {categorizingAll ? 'Categorizing...' : 'AI Categorize All'}
            </Button>
            
            {/* AI Service Status Indicator */}
            <Badge 
              variant={
                aiServiceStatus === 'connected' ? 'default' : 
                aiServiceStatus === 'disconnected' ? 'destructive' : 
                'secondary'
              }
              className={`text-xs ${
                aiServiceStatus === 'connected' ? 'bg-green-100 text-green-800 border-green-200' :
                aiServiceStatus === 'disconnected' ? 'bg-red-100 text-red-800 border-red-200' :
                'bg-gray-100 text-gray-600 border-gray-200'
              }`}
              title={
                aiServiceStatus === 'connected' ? 'AI service is online and ready' :
                aiServiceStatus === 'disconnected' ? 'AI service is not available' :
                aiServiceStatus === 'error' ? 'AI service connection error' :
                'Checking AI service status...'
              }
            >
              {aiServiceStatus === 'connected' && '🟢 AI Ready'}
              {aiServiceStatus === 'disconnected' && '🔴 AI Offline'}
              {aiServiceStatus === 'error' && '⚠️ AI Error'}
              {aiServiceStatus === 'checking' && '🟡 Checking...'}
            </Badge>
          </div>
        </div>
    </div>
  )

  return (
    <UniversalToolbar
      variant="unified"
      className="relative z-30"
      testId="category-search-and-filters"
      animate={false}
      customContent={content}
    />
  )
})