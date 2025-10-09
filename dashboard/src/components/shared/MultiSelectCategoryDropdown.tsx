'use client'

import { useState, useEffect, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { X, ChevronDown } from 'lucide-react'
import { getCategoryDisplayOrder } from '@/lib/categories'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface MultiSelectCategoryDropdownProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  categoryCounts?: Record<string, number>
  loading?: boolean
  className?: string
}


const CATEGORIES = getCategoryDisplayOrder()

export function MultiSelectCategoryDropdown({ 
  selectedCategories, 
  onCategoriesChange, 
  categoryCounts = {},
  loading = false,
  className = ''
}: MultiSelectCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategoryToggle = (category: string) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]
    
    onCategoriesChange(newSelected)
  }

  const clearAll = () => {
    onCategoriesChange([])
  }

  const displayText = selectedCategories.length === 0 
    ? 'Categories' 
    : selectedCategories.length === 1 
      ? selectedCategories[0]
      : `${selectedCategories.length} categories`

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          `w-full py-2 px-3 ${designSystem.borders.radius.sm} text-sm border border-default`,
          "hover:bg-white/90 hover:border-strong",
          "focus:outline-none focus:ring-2 focus:ring-b9-pink/20 focus:border-b9-pink",
          "disabled:opacity-50 disabled:cursor-not-allowed font-mac-text",
          designSystem.layout.flex.rowBetween,
          designSystem.glass.light,
          designSystem.transitions.default,
          designSystem.shadows.sm
        )}
        aria-label="Filter by categories"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayText}</span>
        <div className="flex items-center ml-2 space-x-1">
          {selectedCategories.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearAll()
              }}
              className={cn("transition-colors", designSystem.typography.color.disabled, `hover:${designSystem.typography.color.tertiary}`)}
              aria-label="Clear all categories"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", designSystem.typography.color.disabled, isOpen && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            `absolute z-50 w-80 mt-1 ${designSystem.borders.radius.sm} max-h-80 overflow-y-auto`,
            designSystem.glass.medium,
            designSystem.borders.default,
            designSystem.shadows.lg
          )}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Header */}
          <div className={cn("px-4 py-2 border-b border-light", designSystem.layout.flex.rowBetween)}>
            <span className={cn("text-sm font-medium font-mac-text", designSystem.typography.color.secondary)}>Select Categories</span>
            {selectedCategories.length > 0 && (
              <button
                onClick={clearAll}
                className={cn(
                  "text-xs text-b9-pink hover:text-b9-pink/80 font-mac-text",
                  designSystem.transitions.default
                )}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Categories List */}
          <div className="py-2">
            {CATEGORIES.map((category) => {
              const count = categoryCounts[category] || 0
              const isSelected = selectedCategories.includes(category)
              
              return (
                <label
                  key={category}
                  className={cn(
                    `px-4 py-2 text-sm cursor-pointer hover:${designSystem.background.hover.subtle}`,
                    designSystem.layout.flex.rowStart,
                    designSystem.transitions.default
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleCategoryToggle(category)}
                    className="mr-3"
                    aria-label={`Toggle ${category} category`}
                  />
                  <span className={cn("flex-1 font-mac-text", designSystem.typography.color.primary)}>
                    {category}
                    {!loading && count > 0 && (
                      <span className={cn("ml-1", designSystem.typography.color.subtle)}>({count.toLocaleString('en-US')})</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          {/* Selected Categories Summary */}
          {selectedCategories.length > 0 && (
            <div className={`px-4 py-3 border-t border-light ${designSystem.background.surface.subtle}/50`}>
              <div className={cn("text-xs mb-2 font-mac-text", designSystem.typography.color.tertiary)}>
                Selected ({selectedCategories.length}):
              </div>
              <div className={cn(designSystem.layout.flex.rowStart, "flex-wrap gap-1")}>
                {selectedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="outline"
                    className="text-xs bg-b9-pink/10 text-b9-pink border-b9-pink/20 font-mac-text"
                  >
                    {category}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCategoryToggle(category)
                      }}
                      className={cn("ml-1 hover:text-b9-pink/70", designSystem.transitions.default)}
                      aria-label={`Remove ${category} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}