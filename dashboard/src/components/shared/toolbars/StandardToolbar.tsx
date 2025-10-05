'use client'

import { memo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  X,
  ChevronDown,
  ArrowUpDown,
  Check,
  type LucideIcon
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface FilterOption {
  id: string
  label: string
  count?: number
}

export interface SortOption {
  id: string
  label: string
  icon?: LucideIcon
}

export interface ActionButton {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  loading?: boolean
}

export interface BulkAction {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
}

export interface StandardToolbarProps {
  // Search (always present)
  searchValue: string
  onSearchChange: (value: string) => void

  // Filter Pills (optional)
  filters?: FilterOption[]
  currentFilter?: string
  onFilterChange?: (filterId: string) => void

  // Sort (optional)
  sortOptions?: SortOption[]
  currentSort?: string
  onSortChange?: (sortId: string) => void

  // Checkbox Filter (optional)
  checkboxLabel?: string
  checkboxChecked?: boolean
  onCheckboxChange?: (checked: boolean) => void

  // Second Checkbox Filter (optional)
  checkboxLabel2?: string
  checkboxChecked2?: boolean
  onCheckboxChange2?: (checked: boolean) => void

  // Slider Filter (optional)
  sliderLabel?: string
  sliderMin?: number
  sliderMax?: number
  sliderStep?: number
  sliderValue?: number
  onSliderChange?: (value: number[]) => void
  onSliderCommit?: (value: number[]) => void
  sliderFormatValue?: (value: number) => string

  // Action Buttons (optional)
  actionButtons?: ActionButton[]

  // Bulk Actions (conditional on selection)
  selectedCount?: number
  bulkActions?: BulkAction[]
  onClearSelection?: () => void

  // Common
  loading?: boolean
  className?: string
  accentColor?: string // Dashboard-specific accent color
}

// ============================================================================
// COMPONENT
// ============================================================================

const StandardToolbar = memo(function StandardToolbar({
  searchValue,
  onSearchChange,
  filters,
  currentFilter,
  onFilterChange,
  sortOptions,
  currentSort,
  onSortChange,
  checkboxLabel,
  checkboxChecked,
  onCheckboxChange,
  checkboxLabel2,
  checkboxChecked2,
  onCheckboxChange2,
  sliderLabel,
  sliderMin = 0,
  sliderMax = 100,
  sliderStep = 1,
  sliderValue,
  onSliderChange,
  onSliderCommit,
  sliderFormatValue,
  actionButtons,
  selectedCount = 0,
  bulkActions,
  onClearSelection,
  loading = false,
  className = '',
}: StandardToolbarProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  const handleClearSearch = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])

  const currentSortOption = sortOptions?.find(opt => opt.id === currentSort)

  // Show bulk actions bar when items are selected
  if (selectedCount > 0 && bulkActions && bulkActions.length > 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 p-3 rounded-xl',
          'bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]',
          'border border-gray-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]',
          'animate-in slide-in-from-top-2 duration-200',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            {selectedCount} selected
          </span>
          {bulkActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={action.onClick}
                className="h-8"
              >
                {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                {action.label}
              </Button>
            )
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-col lg:flex-row gap-3 justify-between', className)}
      suppressHydrationWarning
    >
      {/* Left Section - Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
        <Input
          type="text"
          placeholder=""
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            'pl-9 pr-9 h-9 rounded-lg w-full max-w-md',
            'bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]',
            'border border-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)]',
            'transition-all duration-200',
            searchFocused && 'ring-2 ring-pink-200/50'
          )}
          disabled={loading}
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right Section - Filter Pills, Sort, Actions */}
      <div className="flex items-center gap-3">
        {/* Filter Pills */}
        {filters && filters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map((filter) => {
          const isActive = currentFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange?.(filter.id)}
              disabled={loading}
              className={cn(
                'group relative px-3 py-1.5 rounded-lg text-xs font-medium overflow-hidden',
                'transition-all duration-300 hover:scale-[1.02]',
                'flex items-center gap-1.5',
                isActive ? 'text-white' : 'text-gray-700'
              )}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, rgba(255, 182, 193, 0.9), rgba(255, 105, 135, 0.9))'
                  : 'linear-gradient(135deg, rgba(255, 182, 193, 0.08), rgba(255, 192, 203, 0.08))',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                boxShadow: isActive
                  ? '0 8px 20px rgba(255, 105, 135, 0.4), inset 0 2px 2px 0 rgba(255, 255, 255, 0.4)'
                  : '0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Gradient overlay on hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                isActive
                  ? "bg-gradient-to-br from-pink-300/30 via-pink-400/30 to-pink-500/30"
                  : "bg-gradient-to-br from-pink-200/20 via-pink-300/20 to-pink-400/20"
              )} />

              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              {/* Glow effect for active state */}
              {isActive && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-400/20 to-pink-500/20 blur-xl" />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-1.5">
                <span className={cn(
                  isActive && "bg-gradient-to-r from-pink-100 to-white bg-clip-text text-transparent font-semibold"
                )}>
                  {filter.label}
                </span>
                {filter.count !== undefined && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'h-5 px-1.5 min-w-[20px] text-[10px] font-medium',
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-pink-50/50 text-pink-700 border-pink-200/30'
                    )}
                  >
                    {loading ? '...' : filter.count.toLocaleString('en-US')}
                  </Badge>
                )}
              </div>
            </button>
          )
        })}
        </div>
        )}

        {/* Checkbox Filters */}
        {checkboxLabel && onCheckboxChange && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="toolbar-checkbox"
              checked={checkboxChecked || false}
              onCheckedChange={onCheckboxChange}
              className="h-4 w-4"
            />
            <label
              htmlFor="toolbar-checkbox"
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              {checkboxLabel}
            </label>
          </div>
        )}

        {checkboxLabel2 && onCheckboxChange2 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="toolbar-checkbox-2"
              checked={checkboxChecked2 || false}
              onCheckedChange={onCheckboxChange2}
              className="h-4 w-4"
            />
            <label
              htmlFor="toolbar-checkbox-2"
              className="text-sm font-medium text-gray-700 cursor-pointer select-none"
            >
              {checkboxLabel2}
            </label>
          </div>
        )}

        {/* Slider Filter */}
        {sliderLabel && onSliderChange && (
          <div className="flex items-center gap-2">
            <div className="w-40">
              <Slider
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={[sliderValue || sliderMin]}
                onValueChange={onSliderChange}
                onValueCommit={onSliderCommit || onSliderChange}
                disabled={loading}
                className="cursor-pointer"
              />
            </div>
            <span className="text-sm font-semibold text-pink-600 min-w-[3rem]">
              {sliderFormatValue ? sliderFormatValue(sliderValue || sliderMin) : (sliderValue || sliderMin)}
            </span>
          </div>
        )}

        {/* Sort Dropdown */}
        {sortOptions && sortOptions.length > 0 && (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2',
                'bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]',
                'border border-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.05)]'
              )}
              disabled={loading}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {currentSortOption?.label || 'Sort'}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white border border-gray-200 shadow-lg backdrop-blur-[15px]"
          >
            {sortOptions.map((option) => {
              const Icon = option.icon
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => onSortChange?.(option.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {option.label}
                  </div>
                  {currentSort === option.id && (
                    <Check className="h-3.5 w-3.5 text-pink-500" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div className="flex gap-2">
            {actionButtons.map((button) => {
              const Icon = button.icon
              return (
                <Button
                  key={button.id}
                  variant={button.variant || 'default'}
                  size="sm"
                  onClick={button.onClick}
                  disabled={loading || button.loading}
                  className="h-9"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                  {button.label}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

export { StandardToolbar }