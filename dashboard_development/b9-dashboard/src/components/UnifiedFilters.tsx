'use client'

import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  X,
  Sparkles,
  Tag
} from 'lucide-react'
type ReviewFilterType = 'unreviewed' | 'ok'
type CategorizationFilterType = 'uncategorized' | 'categorized'

type FilterId = ReviewFilterType | CategorizationFilterType | 'all'

interface Counts {
  unreviewed?: number
  ok?: number
  uncategorized?: number
  categorized?: number
}

interface UnifiedFiltersProps {
  currentFilter: string
  onFilterChange: (filter: string) => void
  categoryCounts?: Counts
  counts?: Counts
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
}

const UnifiedFilters = memo(function UnifiedFilters({
  currentFilter,
  onFilterChange,
  categoryCounts,
  counts,
  searchQuery,
  onSearchChange,
  loading
}: UnifiedFiltersProps) {
  
  const effectiveCounts: Counts = counts || categoryCounts || {}

  const countFor = (key: string): number => {
    switch (key as FilterId) {
      case 'unreviewed':
        return effectiveCounts.unreviewed ?? 0
      case 'ok':
        return effectiveCounts.ok ?? 0
      case 'uncategorized':
        return effectiveCounts.uncategorized ?? 0
      case 'categorized':
        return effectiveCounts.categorized ?? 0
      case 'all':
      default:
        return (effectiveCounts.uncategorized ?? 0) + (effectiveCounts.categorized ?? 0)
    }
  }
  
  // Determine which filters to show based on current filter context
  const isCategorizationContext = !(currentFilter === 'unreviewed' || currentFilter === 'ok')
  interface FilterDef {
    id: FilterId
    label: string
    count: number
    icon: React.ComponentType<{ className?: string }>
    activeBg: string
  }

  const allFilters: FilterDef[] = (currentFilter === 'unreviewed' || currentFilter === 'ok') ? [
    // Subreddit Review Page Filters - ONLY these two
    { 
      id: 'unreviewed',
      label: 'Unreviewed',
      count: countFor('unreviewed'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, #EC4899, #DB2777)'
    },
    { 
      id: 'ok',
      label: 'Ok',
      count: countFor('ok'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #10B981, #059669)'
    }
  ] : [
    // Categorization Page Filters
    { 
      id: 'all',
      label: 'All',
      count: countFor('all'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #6366F1, #4F46E5)'
    },
    { 
      id: 'uncategorized',
      label: 'Uncategorized',
      count: countFor('uncategorized'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, #EC4899, #DB2777)'
    },
    { 
      id: 'categorized',
      label: 'Categorized',
      count: countFor('categorized'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #10B981, #059669)'
    }
  ]

  return (
    <div className="mb-8" data-testid="unified-filters" aria-label="Subreddit filters">
      {/* Main Filter Bar */}
      <div 
        className="rounded-2xl border-0 p-4"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          
          {/* Search */}
          <div className="relative flex-1" role="search">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search subreddits..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border-0 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-b9-pink transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              }}
              disabled={loading}
              aria-label="Search subreddits"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Dynamic Status Filters (Review context) */}
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Category filters" data-testid="category-filters">
            {allFilters.map((filter) => {
              const IconComponent = filter.icon
              const isActive = currentFilter === filter.id
              
              return (
                <Button
                  key={filter.id}
                  variant="ghost"
                  onClick={() => onFilterChange(filter.id)}
                  disabled={loading}
                  className="px-4 py-3 h-auto rounded-xl font-medium transition-all duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-b9-pink"
                  style={{
                    background: isActive 
                      ? filter.activeBg
                      : '#ffffff',
                    color: isActive ? '#ffffff' : '#374151',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
                    boxShadow: isActive 
                      ? '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  }}
                  aria-pressed={isActive}
                  data-testid={`filter-btn-${filter.id}`}
                  title={`Filter: ${filter.label}`}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                >
                  {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                  {filter.label}
                  <Badge 
                    variant="secondary" 
                    className="ml-2 border-0 text-xs font-medium"
                    style={{
                      background: isActive 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(0, 0, 0, 0.06)',
                      color: isActive ? 'white' : 'rgba(0, 0, 0, 0.75)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                    }}
                  >
                    {loading ? '...' : filter.count.toLocaleString()}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Secondary filters removed (only three primary views remain) */}

        {/* Active Filters Indicator */}
        {(searchQuery || currentFilter === 'ok' || currentFilter === 'unreviewed') && (
          <div 
            className="mt-4 pt-4"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span 
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                }}
              >
                Active status:
              </span>
              {searchQuery && (
                <Badge 
                  variant="outline" 
                  className="border-0 text-xs"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'rgba(59, 130, 246, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  }}
                >
                  Search: &quot;{searchQuery}&quot;
                </Badge>
              )}
              {(currentFilter === 'ok' || currentFilter === 'unreviewed') && (
                <Badge 
                  variant="outline" 
                  className="border-0 text-xs"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  }}
                >
                  Status: {allFilters.find((f) => f.id === currentFilter)?.label || currentFilter}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSearchChange('')
                  onFilterChange(isCategorizationContext ? 'all' : 'unreviewed')
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 h-auto"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {(searchQuery || currentFilter === 'ok' || currentFilter === 'unreviewed') && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-600">
            {loading ? (
              'Loading results...'
            ) : (
              <>
                Showing{' '}
                <span className="font-semibold text-b9-pink">
                  {countFor(currentFilter).toLocaleString()}
                </span>{' '}
                {allFilters.find((f) => f.id === currentFilter)?.label || currentFilter} subreddits
                {searchQuery && (
                  <>
                    {' '}matching &quot;<span className="font-medium">{searchQuery}</span>&quot;
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
})

export { UnifiedFilters }
