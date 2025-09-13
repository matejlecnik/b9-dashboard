'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCategoryStyles } from '@/lib/categoryColors'

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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  // Close dropdown when clicking outside and calculate position
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

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 256 + window.scrollX // 256px is the width of dropdown (w-64)
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

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[99999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
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
                      border: `1px solid ${styles.borderColor || styles.backgroundColor}`
                    }}
                  >
                    {category}
                  </span>
                </label>
              )
            })}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="text-xs text-gray-600">
              {selectedCategories.length} of {availableCategories.length} selected
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}