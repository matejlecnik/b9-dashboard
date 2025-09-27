'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, Check } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { getCategoryStyles } from '@/lib/categoryColors'
import { createPortal } from 'react-dom'

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
        className="h-8 px-3 text-xs font-medium border-gray-200 hover:bg-gray-50 flex items-center gap-2"
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
          className="w-64 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Filter Categories</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 hover:bg-blue-50 rounded"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-0.5 hover:bg-gray-50 rounded"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Show uncategorized option */}
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isShowingUncategorized}
                  onChange={() => handleClearAll()}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border ${
                  isShowingUncategorized
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-300'
                }`}>
                  {isShowingUncategorized && (
                    <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-700 flex-1">
                Show Uncategorized
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {uncategorizedCount}
              </Badge>
            </label>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1">Categories</div>
            {availableCategories.map(category => {
              const styles = getCategoryStyles(category)
              return (
                <label
                  key={category}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer group"
                >
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleToggleCategory(category)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border ${
                      selectedCategories.includes(category)
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {selectedCategories.includes(category) && (
                        <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>
                  </div>
                  <span
                    className="text-xs flex-1 truncate px-2 py-0.5 rounded-md transition-all"
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