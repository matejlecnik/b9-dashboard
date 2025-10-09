'use client'

import { memo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
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
          'flex items-center justify-between p-3',
          designSystem.spacing.gap.default,
          designSystem.borders.radius.xl,
          'bg-[var(--slate-50-alpha-70)] backdrop-blur-[15px]',
          'border border-default shadow-[0_8px_32px_var(--black-alpha-10)]',
          'animate-in slide-in-from-top-2 duration-200',
          className
        )}
      >
        <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
          <span className={cn(designSystem.typography.size.sm, designSystem.typography.weight.semibold, designSystem.typography.color.primary)}>
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
      className={cn('flex flex-col lg:flex-row justify-between', designSystem.spacing.gap.default, className)}
      suppressHydrationWarning
    >
      {/* Left Section - Search Bar */}
      <div className="relative flex-1">
        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10", designSystem.typography.color.subtle)} />
        <Input
          type="text"
          placeholder=""
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            'pl-9 pr-9 h-9 w-full max-w-md font-mac-text text-sm',
            'rounded-xl',
            'transition-all duration-300 ease-out',
            'bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60',
            'backdrop-blur-2xl backdrop-saturate-150',
            'border border-gray-300/40',
            'shadow-[0_2px_8px_var(--black-alpha-04),0_1px_0_var(--white-alpha-60)_inset]',
            'placeholder:text-gray-400 text-gray-900',
            'outline-none focus:outline-none focus-visible:outline-none active:outline-none',
            searchFocused
              ? 'ring-4 ring-gray-400/20 border-gray-400/50 shadow-[0_4px_12px_var(--black-alpha-08)]'
              : 'hover:border-gray-300/60 hover:shadow-[0_4px_10px_var(--black-alpha-06)]'
          )}
          disabled={loading}
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className={cn("absolute right-3 top-1/2 -translate-y-1/2", designSystem.typography.color.disabled, `hover:${designSystem.typography.color.tertiary}`)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right Section - Filter Pills, Sort, Actions */}
      <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
        {/* Filter Pills */}
        {filters && filters.length > 0 && (
        <div className={cn('flex items-center flex-wrap', designSystem.spacing.gap.tight)}>
        {filters.map((filter) => {
          const isActive = currentFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange?.(filter.id)}
              disabled={loading}
              className={cn(
                'group relative px-3 py-1.5 overflow-hidden',
                designSystem.borders.radius.lg,
                designSystem.typography.size.xs,
                designSystem.typography.weight.medium,
                designSystem.animation.transition.default,
                'hover:scale-[1.02]',
                'flex items-center',
                designSystem.spacing.gap.tight,
                isActive ? 'text-white' : designSystem.typography.color.secondary
              )}
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, var(--pink-300-alpha-90), var(--pink-custom-alpha-90))'
                  : 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                backdropFilter: isActive ? 'blur(16px) saturate(180%)' : 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: isActive ? 'blur(16px) saturate(180%)' : 'blur(24px) saturate(150%)',
                boxShadow: isActive
                  ? '0 8px 20px var(--pink-custom-alpha-40), inset 0 2px 2px 0 var(--white-alpha-40)'
                  : '0 8px 20px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-60)',
                border: isActive
                  ? '1px solid var(--black-alpha-10)'
                  : '1px solid var(--slate-400-alpha-60)'
              }}
            >
              {/* Gradient overlay on hover */}
              <div className={cn(
                "absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100",
                designSystem.animation.transition.default,
                isActive
                  ? "bg-gradient-to-br from-primary/30 via-primary/30 to-primary-hover/30"
                  : "bg-gradient-to-br from-primary/20 via-primary/20 to-primary/20"
              )} />

              {/* Shine effect */}
              <div className="absolute inset-0 z-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              {/* Glow effect for active state */}
              {isActive && (
                <div className={cn("absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100", designSystem.animation.transition.slow)}>
                  <div className={cn("absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-hover/20 blur-xl", designSystem.borders.radius.lg)} />
                </div>
              )}

              {/* Content */}
              <div className={cn('relative z-10 flex items-center', designSystem.spacing.gap.tight)}>
                <span className={cn(
                  isActive && "bg-gradient-to-r from-white/80 to-white bg-clip-text text-transparent font-semibold"
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
                        : 'bg-primary/10 text-primary-pressed border-primary/30'
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
          <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
            <Checkbox
              id="toolbar-checkbox"
              checked={checkboxChecked || false}
              onCheckedChange={onCheckboxChange}
              className="h-4 w-4"
            />
            <label
              htmlFor="toolbar-checkbox"
              className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, designSystem.typography.color.secondary, 'cursor-pointer select-none')}
            >
              {checkboxLabel}
            </label>
          </div>
        )}

        {checkboxLabel2 && onCheckboxChange2 && (
          <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
            <Checkbox
              id="toolbar-checkbox-2"
              checked={checkboxChecked2 || false}
              onCheckedChange={onCheckboxChange2}
              className="h-4 w-4"
            />
            <label
              htmlFor="toolbar-checkbox-2"
              className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, designSystem.typography.color.secondary, 'cursor-pointer select-none')}
            >
              {checkboxLabel2}
            </label>
          </div>
        )}

        {/* Slider Filter */}
        {sliderLabel && onSliderChange && (
          <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
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
            <span className={cn(designSystem.typography.size.sm, designSystem.typography.weight.semibold, 'text-primary min-w-[3rem]')}>
              {sliderFormatValue ? sliderFormatValue(sliderValue || sliderMin) : (sliderValue || sliderMin)}
            </span>
          </div>
        )}

        {/* Sort Dropdown */}
        {sortOptions && sortOptions.length > 0 && (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={loading}
              className={cn(
                'group relative px-3 py-1.5 h-9 overflow-hidden',
                'flex items-center',
                designSystem.spacing.gap.default,
                designSystem.borders.radius.lg,
                designSystem.typography.size.xs,
                designSystem.typography.weight.medium,
                designSystem.animation.transition.default,
                'hover:scale-[1.02]',
                designSystem.typography.color.secondary
              )}
              style={{
                background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                boxShadow: '0 8px 20px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-60)',
                border: '1px solid var(--slate-400-alpha-60)'
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 z-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              {/* Content */}
              <div className={cn('relative z-10 flex items-center', designSystem.spacing.gap.default)}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {currentSortOption?.label || 'Sort'}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn('w-48 border-0 backdrop-blur-xl backdrop-saturate-150', designSystem.shadows.lg)}
            style={{
              background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
              border: '1px solid var(--slate-400-alpha-60)',
              boxShadow: '0 12px 32px var(--black-alpha-15)'
            }}
          >
            {sortOptions.map((option) => {
              const Icon = option.icon
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => onSortChange?.(option.id)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    "hover:bg-pink-50/50 transition-colors"
                  )}
                >
                  <div className={cn('flex items-center', designSystem.spacing.gap.default)}>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {option.label}
                  </div>
                  {currentSort === option.id && (
                    <Check className="h-3.5 w-3.5 text-pink-600" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Action Buttons */}
        {actionButtons && actionButtons.length > 0 && (
          <div className={cn('flex', designSystem.spacing.gap.default)}>
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