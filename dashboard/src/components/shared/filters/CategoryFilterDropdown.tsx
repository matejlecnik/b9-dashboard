'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, Check } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { getCategoryStyles } from '@/lib/colors'
import { createPortal } from 'react-dom'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface CategoryFilterDropdownProps {
  availableCategories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  loading?: boolean
  uncategorizedCount?: number
  categorizedCount?: number
}

export function CategoryFilterDropdown({
  availableCategories,
  selectedCategories,
  onCategoriesChange,
  loading = false,
  uncategorizedCount = 0,
  categorizedCount = 0
}: CategoryFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 256 // 256px is the dropdown width
      })
    }
  }, [isOpen])

  const handleToggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  const handleSelectAll = () => {
    onCategoriesChange(availableCategories)
  }

  const handleClearAll = () => {
    onCategoriesChange([])
  }

  const isShowingUncategorized = selectedCategories.length === 0
  const displayText = isShowingUncategorized
    ? `Uncategorized (${formatNumber(uncategorizedCount)})`
    : selectedCategories.length === availableCategories.length
    ? `All Categories (${formatNumber(categorizedCount)})`
    : selectedCategories.length === 1
    ? selectedCategories[0]
    : `${selectedCategories.length} categories`

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          'h-8 px-3 flex items-center',
          designSystem.spacing.gap.tight,
          designSystem.typography.size.xs,
          designSystem.typography.weight.medium,
          'border-default',
          designSystem.background.hover.subtle
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{displayText}</span>
        <ChevronDown className={cn('h-3.5 w-3.5', designSystem.animation.transition.default, isOpen && 'rotate-180')} />
      </Button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
          className={cn('w-64 bg-white border border-default', designSystem.borders.radius.sm, designSystem.shadows.lg)}
        >
          <div className={cn('p-2 border-b', designSystem.borders.color.light)}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn(designSystem.typography.size.xs, designSystem.typography.weight.semibold, designSystem.typography.color.secondary)}>Filter Categories</span>
              <div className={cn('flex', designSystem.spacing.gap.tight)}>
                <button
                  onClick={handleSelectAll}
                  className={cn(designSystem.typography.size.xs, designSystem.typography.weight.medium, 'text-blue-600 hover:text-blue-700 px-2 py-0.5 hover:bg-blue-50', designSystem.borders.radius.xs)}
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className={cn(designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.typography.color.tertiary, `hover:${designSystem.typography.color.secondary}`, 'px-2 py-0.5', designSystem.background.hover.subtle, designSystem.borders.radius.xs)}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Show uncategorized option */}
            <label className={cn('flex items-center px-2 py-1.5 cursor-pointer', designSystem.background.hover.subtle, designSystem.spacing.gap.tight, designSystem.borders.radius.xs)}>
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isShowingUncategorized}
                  onChange={() => handleClearAll()}
                  className="sr-only"
                />
                <div className={cn('w-4 h-4 border', designSystem.borders.radius.xs, isShowingUncategorized ? 'bg-primary border-primary' : 'bg-white border-strong')}>
                  {isShowingUncategorized && (
                    <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                  )}
                </div>
              </div>
              <span className={cn(designSystem.typography.size.xs, designSystem.typography.color.secondary, 'flex-1')}>
                Show Uncategorized
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {uncategorizedCount}
              </Badge>
            </label>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className={cn(designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.typography.color.subtle, 'px-2 py-1')}>Categories</div>
            {availableCategories.map(category => {
              const styles = getCategoryStyles(category)
              return (
                <label
                  key={category}
                  className={cn('flex items-center px-2 py-1.5 cursor-pointer group', designSystem.background.hover.subtle, designSystem.spacing.gap.tight, designSystem.borders.radius.xs)}
                >
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleToggleCategory(category)}
                      className="sr-only"
                    />
                    <div className={cn('w-4 h-4 border', designSystem.borders.radius.xs, selectedCategories.includes(category) ? 'bg-primary border-primary' : 'bg-white border-strong')}>
                      {selectedCategories.includes(category) && (
                        <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(designSystem.typography.size.xs, 'flex-1 truncate px-2 py-0.5', designSystem.borders.radius.sm, designSystem.animation.transition.default)}
                    style={{
                      backgroundColor: styles.backgroundColor,
                      color: styles.color,
                      border: `1px solid ${styles.borderColor}`
                    }}
                  >
                    {category}
                  </span>
                </label>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}