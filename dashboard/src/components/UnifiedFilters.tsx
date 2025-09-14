'use client'

import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles,
  Tag
} from 'lucide-react'
type ReviewFilterType = 'unreviewed' | 'ok' | 'non_related' | 'no_seller'
type CategorizationFilterType = 'uncategorized' | 'categorized'

type FilterId = ReviewFilterType | CategorizationFilterType

interface Counts {
  unreviewed?: number
  ok?: number
  non_related?: number
  no_seller?: number
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
  loading
}: UnifiedFiltersProps) {
  
  const effectiveCounts: Counts = counts || categoryCounts || {}

  // Determine which filters to show based on current filter context (inlined below)
  interface FilterDef {
    id: FilterId
    label: string
    count: number
    icon: React.ComponentType<{ className?: string }>
    activeBg: string
  }

  const countFor = (key: string): number => {
    switch (key as FilterId) {
      case 'unreviewed':
        return effectiveCounts.unreviewed ?? 0
      case 'non_related':
        return effectiveCounts.non_related ?? 0
      case 'no_seller':
        return effectiveCounts.no_seller ?? 0
      case 'uncategorized':
        return effectiveCounts.uncategorized ?? 0
      case 'categorized':
        return effectiveCounts.categorized ?? 0
      default:
        return 0
    }
  }

  const allFilters: FilterDef[] = (currentFilter === 'unreviewed' || currentFilter === 'non_related' || currentFilter === 'no_seller') ? [
    // Subreddit Review Page Filters - Unreviewed, No Seller, Non Related
    { 
      id: 'unreviewed',
      label: 'Unreviewed',
      count: countFor('unreviewed'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, #FF6B80, #FF8395)' // Secondary B9 pink
    },
    { 
      id: 'no_seller',
      label: 'No Seller',
      count: countFor('no_seller'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #FF99A9, #FFB3C1)' // Light pink for success
    },
    { 
      id: 'non_related',
      label: 'Non Related',
      count: countFor('non_related'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #FF8395, #FFB3C1)' // Primary B9 pink gradient
    }
  ] : [
    // Categorization Page Filters
    { 
      id: 'uncategorized',
      label: 'Uncategorized',
      count: countFor('uncategorized'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, #FF6B80, #FF8395)' // Secondary B9 pink
    },
    { 
      id: 'categorized',
      label: 'Categorized',
      count: countFor('categorized'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, #FF99A9, #FFB3C1)' // Light pink for success
    }
  ]
  
  return (
    <div data-testid="unified-filters" aria-label="Subreddit filters">
      {/* Dynamic Status Filters (Review context) - Compact inline version */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Category filters" data-testid="category-filters">
        {allFilters.map((filter) => {
          const IconComponent = filter.icon
          const isActive = currentFilter === filter.id
          
          return (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => onFilterChange(filter.id)}
              disabled={loading}
              className="px-2.5 py-1.5 h-8 rounded-md font-medium transition-all duration-200 border-0 focus:outline-none focus:ring-1 focus:ring-b9-pink text-xs"
              style={{
                background: isActive 
                  ? filter.activeBg
                  : 'rgba(255, 255, 255, 0.8)',
                color: isActive ? '#ffffff' : '#374151',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: isActive 
                  ? '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 1px 4px rgba(0, 0, 0, 0.02)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              }}
              aria-pressed={isActive}
              data-testid={`filter-btn-${filter.id}`}
              title={`Filter: ${filter.label}`}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(249, 250, 251, 0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                }
              }}
            >
              {IconComponent && <IconComponent className="h-3 w-3 mr-1.5" />}
              <span className="text-xs">{filter.label}</span>
              <Badge 
                variant="secondary" 
                className="ml-1.5 border-0 text-xs font-medium"
                style={{
                  background: isActive 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.06)',
                  color: isActive ? 'white' : 'rgba(0, 0, 0, 0.75)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  fontSize: '0.7rem',
                }}
              >
                {loading ? '...' : filter.count.toLocaleString('en-US')}
              </Badge>
            </Button>
          )
        })}
      </div>

    </div>
  )
})

export { UnifiedFilters }
