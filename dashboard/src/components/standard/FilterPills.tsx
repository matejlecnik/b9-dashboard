'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { X } from 'lucide-react'

interface FilterOption {
  id: string
  label: string
  count?: number
  color?: 'gray' | 'pink' | 'green' | 'blue' | 'red'
  icon?: React.ReactNode
}

interface FilterPillsProps {
  options: FilterOption[]
  selected: string | string[]
  onChange: (value: string | string[]) => void
  multiSelect?: boolean
  showCount?: boolean
  variant?: 'pills' | 'tabs' | 'buttons'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options,
  selected,
  onChange,
  multiSelect = false,
  showCount = true,
  variant = 'pills',
  size = 'md',
  className
}) => {
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])

  const handleClick = (optionId: string) => {
    if (multiSelect) {
      const newSelected = new Set(selectedSet)
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId)
      } else {
        newSelected.add(optionId)
      }
      onChange(Array.from(newSelected))
    } else {
      onChange(optionId)
    }
  }

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, string> = {
      gray: isSelected
        ? `${designSystem.background.surface.inverse} text-white border-${designSystem.background.surface.inverse}`
        : `bg-white ${designSystem.typography.color.secondary} border-strong ${designSystem.background.hover.subtle}`,
      pink: isSelected
        ? 'bg-b9-pink text-white border-b9-pink'
        : `bg-white ${designSystem.typography.color.secondary} border-strong hover:bg-primary/10`,
      green: isSelected
        ? 'bg-green-600 text-white border-green-600'
        : `bg-white ${designSystem.typography.color.secondary} border-strong hover:bg-green-50`,
      blue: isSelected
        ? 'bg-blue-600 text-white border-blue-600'
        : `bg-white ${designSystem.typography.color.secondary} border-strong hover:bg-blue-50`,
      red: isSelected
        ? 'bg-red-600 text-white border-red-600'
        : `bg-white ${designSystem.typography.color.secondary} border-strong hover:bg-red-50`
    }
    return colors[color] || colors.gray
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const variants = {
    pills: designSystem.radius.full,
    tabs: 'rounded-t-lg',
    buttons: designSystem.radius.sm
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isSelected = selectedSet.has(option.id)
        return (
          <button
            key={option.id}
            onClick={() => handleClick(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 font-medium border',
              sizes[size],
              variants[variant],
              getColorClasses(option.color || 'gray', isSelected),
              designSystem.animation.fast,
              'focus:outline-none focus:ring-2 focus:ring-b9-pink/50'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {showCount && option.count !== undefined && (
              <span className={cn(
                `ml-1 px-1.5 py-0.5 text-xs ${designSystem.borders.radius.full}`,
                isSelected
                  ? 'bg-white/20 text-white'
                  : cn(designSystem.background.surface.light, designSystem.typography.color.tertiary)
              )}>
                {option.count >= 1000 ? `${(option.count / 1000).toFixed(1)}k` : option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Active filters display with clear functionality
interface ActiveFiltersProps {
  filters: Array<{
    id: string
    label: string
    value: string
  }>
  onRemove: (filterId: string) => void
  onClearAll?: () => void
  className?: string
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  onRemove,
  onClearAll,
  className
}) => {
  if (filters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className={cn(designSystem.text.small, designSystem.typography.color.subtle)}>
        Active filters:
      </span>
      {filters.map((filter) => (
        <div
          key={filter.id}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-sm',
            designSystem.radius.full,
            designSystem.background.surface.light,
            designSystem.typography.color.secondary
          )}
        >
          <span className="font-medium">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className={cn("ml-1", `hover:${designSystem.typography.color.primary}`)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className={cn(
            'text-sm text-b9-pink hover:text-primary-pressed',
            designSystem.animation.fast
          )}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

// Filter group with label
interface FilterGroupProps {
  label: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'flex items-center justify-between',
          collapsible && 'cursor-pointer'
        )}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <h3 className={cn(designSystem.text.label, designSystem.typography.color.secondary)}>
          {label}
        </h3>
        {collapsible && (
          <svg
            className={cn(
              'h-4 w-4 transform',
              designSystem.typography.color.disabled,
              designSystem.animation.fast,
              isOpen ? 'rotate-180' : ''
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>
      {(!collapsible || isOpen) && (
        <div className={designSystem.animation.fade}>
          {children}
        </div>
      )}
    </div>
  )
}