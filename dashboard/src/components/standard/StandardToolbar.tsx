'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  X,
  Check,
  Ban,
  Slash,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'

// ============================================================================
// TYPES
// ============================================================================

export type ToolbarVariant = 'actions' | 'filters' | 'search'

interface Action {
  id: string
  label: string
  onClick: () => void | Promise<void>
  icon?: LucideIcon
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  disabled?: boolean
  loading?: boolean
  count?: number
}

interface FilterOption {
  id: string
  label: string
  count?: number
  active?: boolean
  color?: 'default' | 'pink' | 'green' | 'yellow' | 'red' | 'blue'
}

export interface StandardToolbarProps {
  // Variant
  variant: ToolbarVariant

  // Actions variant props
  actions?: Action[]
  selectedCount?: number
  onSelectAll?: () => void
  onDeselectAll?: () => void
  showSelection?: boolean

  // Filters variant props
  filters?: FilterOption[]
  onFilterChange?: (filterId: string) => void
  activeFilters?: string[]

  // Search variant props
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearchIcon?: boolean
  onClearSearch?: () => void

  // Common props
  className?: string
  loading?: boolean
  compact?: boolean
  sticky?: boolean
}

// ============================================================================
// ACTIONS TOOLBAR
// ============================================================================

const ActionsToolbar: React.FC<{
  actions: Action[]
  selectedCount?: number
  onSelectAll?: () => void
  onDeselectAll?: () => void
  showSelection?: boolean
  compact?: boolean
}> = ({
  actions,
  selectedCount = 0,
  onSelectAll,
  onDeselectAll,
  showSelection = true,
  compact = false
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Selection info */}
      {showSelection && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium',
              compact ? 'text-sm' : 'text-base'
            )}>
              {selectedCount > 0 ? (
                <>
                  <span className="text-b9-pink">{formatNumber(selectedCount)}</span>
                  <span className="text-gray-600"> selected</span>
                </>
              ) : (
                <span className="text-gray-500">No items selected</span>
              )}
            </span>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-1">
              {onSelectAll && (
                <Button
                  variant="ghost"
                  size={compact ? 'sm' : 'default'}
                  onClick={onSelectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
              )}
              {onDeselectAll && (
                <Button
                  variant="ghost"
                  size={compact ? 'sm' : 'default'}
                  onClick={onDeselectAll}
                  className="text-xs"
                >
                  Deselect All
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
              disabled={action.disabled || (showSelection && selectedCount === 0)}
              className={cn(
                designSystem.radius.sm,
                action.loading && 'pointer-events-none'
              )}
            >
              {action.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : Icon ? (
                <Icon className="h-4 w-4" />
              ) : null}
              <span className={cn(Icon && 'ml-2')}>
                {action.label}
                {action.count !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {formatNumber(action.count)}
                  </Badge>
                )}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// FILTERS TOOLBAR
// ============================================================================

const FiltersToolbar: React.FC<{
  filters: FilterOption[]
  onFilterChange?: (filterId: string) => void
  activeFilters?: string[]
  compact?: boolean
}> = ({
  filters,
  onFilterChange,
  activeFilters = [],
  compact = false
}) => {
  const colorClasses = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    pink: 'bg-b9-pink/10 text-b9-pink hover:bg-b9-pink/20',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    red: 'bg-red-100 text-red-700 hover:bg-red-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => {
        const isActive = filter.active || activeFilters.includes(filter.id)
        const color = filter.color || 'default'

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange?.(filter.id)}
            className={cn(
              'px-3 py-1.5 rounded-full font-medium transition-colors',
              'inline-flex items-center gap-2',
              compact ? 'text-xs' : 'text-sm',
              isActive
                ? 'bg-b9-pink text-white hover:bg-b9-pink/90'
                : colorClasses[color],
              'focus:outline-none focus:ring-2 focus:ring-b9-pink/50'
            )}
          >
            {filter.label}
            {filter.count !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              )}>
                {formatNumber(filter.count)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// SEARCH TOOLBAR
// ============================================================================

const SearchToolbar: React.FC<{
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearchIcon?: boolean
  onClearSearch?: () => void
  filters?: FilterOption[]
  onFilterChange?: (filterId: string) => void
  activeFilters?: string[]
  compact?: boolean
}> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearchIcon = true,
  onClearSearch,
  filters,
  onFilterChange,
  activeFilters,
  compact = false
}) => {
  const [localValue, setLocalValue] = useState(searchValue)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalValue(value)
    onSearchChange?.(value)
  }, [onSearchChange])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onSearchChange?.('')
    onClearSearch?.()
  }, [onSearchChange, onClearSearch])

  return (
    <div className="flex items-center gap-4">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        {showSearchIcon && (
          <Search className={cn(
            'absolute left-3 text-gray-400 pointer-events-none',
            compact ? 'h-4 w-4 top-2' : 'h-5 w-5 top-2.5'
          )} />
        )}
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={searchPlaceholder}
          className={cn(
            designSystem.radius.sm,
            showSearchIcon && 'pl-10',
            localValue && 'pr-10',
            compact && 'h-8 text-sm'
          )}
        />
        {localValue && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-2 text-gray-400 hover:text-gray-600',
              compact ? 'top-2' : 'top-2.5'
            )}
          >
            <X className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
        )}
      </div>

      {/* Optional filters alongside search */}
      {filters && filters.length > 0 && (
        <>
          <div className="h-8 w-px bg-gray-200" />
          <FiltersToolbar
            filters={filters}
            onFilterChange={onFilterChange}
            activeFilters={activeFilters}
            compact={compact}
          />
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const StandardToolbar: React.FC<StandardToolbarProps> = ({
  variant,

  // Actions props
  actions = [],
  selectedCount,
  onSelectAll,
  onDeselectAll,
  showSelection,

  // Filters props
  filters = [],
  onFilterChange,
  activeFilters,

  // Search props
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showSearchIcon,
  onClearSearch,

  // Common
  className,
  loading = false,
  compact = false,
  sticky = false
}) => {

  const containerClasses = cn(
    'bg-white border-b border-gray-200',
    compact ? 'px-4 py-2' : 'px-6 py-3',
    sticky && 'sticky top-0 z-10',
    loading && 'opacity-50 pointer-events-none',
    className
  )

  return (
    <div className={containerClasses}>
      {variant === 'actions' && (
        <ActionsToolbar
          actions={actions}
          selectedCount={selectedCount}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          showSelection={showSelection}
          compact={compact}
        />
      )}

      {variant === 'filters' && (
        <FiltersToolbar
          filters={filters}
          onFilterChange={onFilterChange}
          activeFilters={activeFilters}
          compact={compact}
        />
      )}

      {variant === 'search' && (
        <SearchToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          showSearchIcon={showSearchIcon}
          onClearSearch={onClearSearch}
          filters={filters}
          onFilterChange={onFilterChange}
          activeFilters={activeFilters}
          compact={compact}
        />
      )}
    </div>
  )
}

// ============================================================================
// PRESET HELPERS
// ============================================================================

export const createReviewToolbar = (props: {
  selectedCount: number
  onApprove: () => void
  onReject: () => void
  onMarkNonRelated: () => void
  onDeselectAll: () => void
}) => (
  <StandardToolbar
    variant="actions"
    selectedCount={props.selectedCount}
    onDeselectAll={props.onDeselectAll}
    actions={[
      {
        id: 'approve',
        label: 'Approve',
        icon: Check,
        variant: 'default',
        onClick: props.onApprove
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: Ban,
        variant: 'secondary',
        onClick: props.onReject
      },
      {
        id: 'non-related',
        label: 'Non Related',
        icon: Slash,
        variant: 'outline',
        onClick: props.onMarkNonRelated
      }
    ]}
  />
)

export const createFilterToolbar = (props: {
  filters: FilterOption[]
  activeFilter: string
  onFilterChange: (id: string) => void
}) => (
  <StandardToolbar
    variant="filters"
    filters={props.filters}
    activeFilters={[props.activeFilter]}
    onFilterChange={props.onFilterChange}
  />
)

export const createSearchToolbar = (props: {
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder?: string
  filters?: FilterOption[]
  activeFilters?: string[]
  onFilterChange?: (id: string) => void
}) => (
  <StandardToolbar
    variant="search"
    searchValue={props.searchValue}
    onSearchChange={props.onSearchChange}
    searchPlaceholder={props.placeholder}
    filters={props.filters}
    activeFilters={props.activeFilters}
    onFilterChange={props.onFilterChange}
  />
)