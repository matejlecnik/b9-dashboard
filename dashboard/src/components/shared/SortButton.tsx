'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type SortField = 'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour' | 'moderator_score' | 'health_score'
type SortDirection = 'asc' | 'desc'

interface SortOption {
  field: SortField
  label: string
  icon: React.ReactNode
  description: string
}

interface SortButtonProps {
  sortBy: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField, direction: SortDirection) => void
  className?: string
  loading?: boolean
}

const SORT_OPTIONS: SortOption[] = [
  {
    field: 'engagement',
    label: 'Engagement',
    icon: '📈',
    description: 'Sort by subscriber engagement ratio percentage'
  },
  {
    field: 'subscribers',
    label: 'Members',
    icon: '👥',
    description: 'Sort by total subscriber count'
  },
  {
    field: 'avg_upvotes',
    label: 'Avg Upvotes',
    icon: '⬆️',
    description: 'Sort by average upvotes per post'
  },
  {
    field: 'best_hour',
    label: 'Best Hour',
    icon: '🕐',
    description: 'Sort by optimal posting hour'
  },
  {
    field: 'moderator_score',
    label: 'Mod Activity',
    icon: '👮',
    description: 'Sort by moderator activity score'
  },
  {
    field: 'health_score',
    label: 'Community Health',
    icon: '💚',
    description: 'Sort by community health score'
  }
]

export function SortButton({ 
  sortBy, 
  sortDirection, 
  onSortChange, 
  className = '',
  loading = false 
}: SortButtonProps) {

  const handleSortFieldChange = (field: SortField) => {
    // If clicking the same field, toggle direction; otherwise use desc as default
    const newDirection = field === sortBy 
      ? (sortDirection === 'desc' ? 'asc' : 'desc')
      : 'desc'
    onSortChange(field, newDirection)
  }

  const handleDirectionToggle = () => {
    onSortChange(sortBy, sortDirection === 'desc' ? 'asc' : 'desc')
  }

  return (
    <div className={cn(designSystem.layout.flex.rowStart, "gap-2", className)}>
      {/* Sort field selector */}
      <div className="relative group">
        <select
          value={sortBy}
          onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
          disabled={loading}
          className={cn(
            `appearance-none ${designSystem.borders.radius.sm} px-4 pr-10 py-2 text-sm font-medium cursor-pointer`,
            "disabled:opacity-50 disabled:cursor-not-allowed",
            designSystem.glass.light,
            designSystem.borders.default,
            "hover:bg-white/90 hover:border-strong",
            "focus:outline-none focus:ring-2 focus:ring-b9-pink/20 focus:border-b9-pink",
            designSystem.transitions.default,
            designSystem.shadows.sm,
            "font-mac-text",
            designSystem.typography.color.secondary
          )}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.field} value={option.field}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className={cn("h-4 w-4", designSystem.typography.color.disabled)} />
        </div>
      </div>

      {/* Direction toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDirectionToggle}
        disabled={loading}
        className={cn(
          "h-10 px-3 border-default hover:bg-white/90 hover:border-strong hover:scale-105",
          designSystem.glass.light,
          designSystem.transitions.default,
          designSystem.shadows.sm
        )}
        title={`Sort ${sortDirection === 'desc' ? 'descending (high to low)' : 'ascending (low to high)'}`}
      >
        <span className="flex items-center gap-2">
          {sortDirection === 'desc' ? (
            <>
              <ChevronDown className={cn("h-4 w-4", designSystem.typography.color.tertiary)} />
              <span className={cn("text-xs font-medium", designSystem.typography.color.tertiary)}>High</span>
            </>
          ) : (
            <>
              <ChevronUp className={cn("h-4 w-4", designSystem.typography.color.tertiary)} />
              <span className={cn("text-xs font-medium", designSystem.typography.color.tertiary)}>Low</span>
            </>
          )}
        </span>
      </Button>

    </div>
  )
}

// Alternative compact version for mobile
export function CompactSortButton({ 
  sortBy, 
  sortDirection, 
  onSortChange, 
  className = '',
  loading = false 
}: SortButtonProps) {
  const currentOption = SORT_OPTIONS.find(option => option.field === sortBy) || SORT_OPTIONS[0]

  const cycleSort = () => {
    const currentIndex = SORT_OPTIONS.findIndex(option => option.field === sortBy)
    
    // If currently descending, switch to ascending
    if (sortDirection === 'desc') {
      onSortChange(sortBy, 'asc')
      return
    }
    
    // If currently ascending, move to next field (descending)
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
    const nextField = SORT_OPTIONS[nextIndex].field
    onSortChange(nextField, 'desc')
  }

  return (
    <Button
      variant="outline"
      onClick={cycleSort}
      disabled={loading}
      className={cn(
        "h-10 px-4 border-default hover:bg-white/90 hover:border-strong",
        designSystem.glass.light,
        designSystem.transitions.default,
        designSystem.shadows.sm,
        className
      )}
      title={`Currently sorting by ${currentOption.label} (${sortDirection === 'desc' ? 'high to low' : 'low to high'}). Tap to change.`}
    >
      <span className="flex items-center gap-2 text-sm">
        <span>{currentOption.icon}</span>
        <span className="font-medium">{currentOption.label}</span>
        {sortDirection === 'desc' ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </span>
    </Button>
  )
}