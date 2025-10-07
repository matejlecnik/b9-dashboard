'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { memo } from 'react'
import React from 'react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
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
      case 'ok':
        return effectiveCounts.ok ?? 0
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

  const allFilters: FilterDef[] = (currentFilter === 'unreviewed' || currentFilter === 'ok' || currentFilter === 'non_related' || currentFilter === 'no_seller') ? [
    // Subreddit Review Page Filters - Unreviewed, Ok, No Seller, Non Related
    {
      id: 'unreviewed',
      label: 'Unreviewed',
      count: countFor('unreviewed'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, var(--pink-600), var(--pink-500))' // Secondary B9 pink
    },
    {
      id: 'ok',
      label: 'Ok',
      count: countFor('ok'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, var(--green-500), var(--green-400))' // Green for approved
    },
    {
      id: 'no_seller',
      label: 'No Seller',
      count: countFor('no_seller'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, var(--pink-400), var(--pink-300))' // Light pink for success
    },
    {
      id: 'non_related',
      label: 'Non Related',
      count: countFor('non_related'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, var(--pink-500), var(--pink-300))' // Primary B9 pink gradient
    }
  ] : [
    // Categorization Page Filters
    { 
      id: 'uncategorized',
      label: 'Uncategorized',
      count: countFor('uncategorized'),
      icon: Sparkles,
      activeBg: 'linear-gradient(135deg, var(--pink-600), var(--pink-500))' // Secondary B9 pink
    },
    { 
      id: 'categorized',
      label: 'Categorized',
      count: countFor('categorized'),
      icon: Tag,
      activeBg: 'linear-gradient(135deg, var(--pink-400), var(--pink-300))' // Light pink for success
    }
  ]
  
  return (
    <div data-testid="unified-filters" aria-label="Subreddit filters">
      {/* Dynamic Status Filters (Review context) - Compact inline version */}
      <div className={cn('flex items-center flex-wrap', designSystem.spacing.gap.tight)} role="group" aria-label="Category filters" data-testid="category-filters">
        {allFilters.map((filter) => {
          const IconComponent = filter.icon
          const isActive = currentFilter === filter.id
          
          return (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => onFilterChange(filter.id)}
              disabled={loading}
              className={cn(
                'px-2.5 py-1.5 h-8 border-0',
                designSystem.borders.radius.sm,
                designSystem.typography.weight.medium,
                designSystem.animation.transition.default,
                'focus:outline-none focus:ring-1 focus:ring-b9-pink',
                designSystem.typography.size.xs,
                'font-mac-text'
              )}
              style={{
                background: isActive
                  ? filter.activeBg
                  : 'var(--white-alpha-80)',
                color: isActive ? 'white' : 'var(--gray-700)',
                border: isActive ? '1px solid var(--white-alpha-10)' : '1px solid var(--black-alpha-08)',
                boxShadow: isActive
                  ? '0 2px 8px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-10)'
                  : '0 1px 4px var(--black-alpha-02)'
              }}
              aria-pressed={isActive}
              data-testid={`filter-btn-${filter.id}`}
              title={`Filter: ${filter.label}`}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--gray-50-alpha-90)';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--white-alpha-80)';
                }
              }}
            >
              {IconComponent && <IconComponent className="h-3 w-3 mr-1.5" />}
              <span className={designSystem.typography.size.xs}>{filter.label}</span>
              <Badge
                variant="secondary"
                className={cn('ml-1.5 border-0', designSystem.typography.size.xs, designSystem.typography.weight.medium, 'font-mac-text')}
                style={{
                  background: isActive
                    ? 'var(--white-alpha-20)'
                    : 'var(--black-alpha-06)',
                  color: isActive ? 'white' : 'var(--black-alpha-75)',
                  fontSize: '0.7rem'
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
