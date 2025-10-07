'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Button } from '@/components/ui/button'
import { Filter, ChevronDown, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { getCategoryStyles } from '@/lib/colors'


interface PostingCategoryFilterProps {
  availableCategories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  loading?: boolean
}

export function PostingCategoryFilter({
  availableCategories,
  selectedCategories,
  onCategoriesChange,
  loading = false
}: PostingCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update dropdown position when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 256 + window.scrollX, // 256px is w-64
        width: 256
      })
    }
  }, [isOpen])

  const handleSelectAll = () => {
    onCategoriesChange(availableCategories)
  }

  const handleClearAll = () => {
    onCategoriesChange([])
  }

  const handleToggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  // Get display text
  const getDisplayText = () => {
    if (selectedCategories.length === 0) {
      return 'No categories'
    } else if (selectedCategories.length === availableCategories.length) {
      return 'All categories'
    } else if (selectedCategories.length === 1) {
      return selectedCategories[0]
    } else {
      return `${selectedCategories.length} categories`
    }
  }

  const displayText = getDisplayText()

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn('h-8 px-3 border-default flex items-center', designSystem.background.hover.subtle, designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.spacing.gap.default)}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{displayText}</span>
        <ChevronDown className={cn('h-3.5 w-3.5', designSystem.animation.transition.default, isOpen && 'rotate-180')} />
      </Button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={cn('fixed bg-white border border-default z-[9999]', designSystem.borders.radius.lg, designSystem.shadows.lg)}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="p-2 border-b border-light">
            <div className="flex items-center justify-between mb-2">
              <span className={cn(designSystem.typography.size.xs, designSystem.typography.weight.semibold, designSystem.typography.color.secondary)}>Filter Categories</span>
              <div className={cn('flex', designSystem.spacing.gap.tight)}>
                <button
                  onClick={handleSelectAll}
                  className={cn('text-blue-600 hover:text-blue-700 px-2 py-0.5 hover:bg-blue-50', designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.borders.radius.sm)}
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className={cn('px-2 py-0.5', designSystem.background.hover.subtle, `hover:${designSystem.typography.color.secondary}`, designSystem.typography.color.tertiary, designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.borders.radius.sm)}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className={cn('px-2 py-1', designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.typography.color.subtle)}>Categories</div>
            {availableCategories.map(category => {
              const styles = getCategoryStyles(category)
              return (
                <label
                  key={category}
                  className={cn('flex items-center px-2 py-1.5 cursor-pointer group', designSystem.background.hover.subtle, designSystem.spacing.gap.default, designSystem.borders.radius.sm)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleToggleCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                      className="sr-only"
                    />
                    <div className={cn('w-4 h-4 border', designSystem.borders.radius.sm, selectedCategories.includes(category) ? 'bg-primary border-primary' : 'bg-white border-strong')}>
                      {selectedCategories.includes(category) && (
                        <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn('flex-1 truncate px-2 py-0.5', designSystem.typography.size.xs, designSystem.borders.radius.lg, designSystem.animation.transition.default)}
                    style={{
                      backgroundColor: styles.backgroundColor,
                      color: styles.color,
                      border: `1px solid ${styles.borderColor || styles.backgroundColor}`
                    }}
                  >
                    {category}
                  </span>
                </label>
              )
            })}
          </div>

          <div className={cn("p-2 border-t border-light", designSystem.background.surface.subtle)}>
            <div className={cn(designSystem.typography.size.xs, designSystem.typography.color.tertiary)}>
              {selectedCategories.length} of {availableCategories.length} selected
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}