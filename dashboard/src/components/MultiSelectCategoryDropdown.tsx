'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface MultiSelectCategoryDropdownProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  categoryCounts?: Record<string, number>
  loading?: boolean
  className?: string
}

import { getCategoryDisplayOrder } from '@/lib/categories'

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
        className="flex items-center justify-between w-full py-2 px-3 rounded-lg text-sm border border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-b9-pink/20 focus:border-b9-pink transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
        }}
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
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear all categories"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 w-80 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          style={{
            backdropFilter: 'blur(10px) saturate(150%)',
            WebkitBackdropFilter: 'blur(10px) saturate(150%)',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Select Categories</span>
            {selectedCategories.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-b9-pink hover:text-b9-pink/80 transition-colors"
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
                  className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  role="option"
                  aria-selected={isSelected}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleCategoryToggle(category)}
                    className="mr-3"
                    aria-label={`Toggle ${category} category`}
                  />
                  <span className="flex-1 text-gray-900">
                    {category}
                    {!loading && count > 0 && (
                      <span className="ml-1 text-gray-500">({count.toLocaleString('en-US')})</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>

          {/* Selected Categories Summary */}
          {selectedCategories.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs text-gray-600 mb-2">
                Selected ({selectedCategories.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((category) => (
                  <Badge 
                    key={category} 
                    variant="outline" 
                    className="text-xs bg-b9-pink/10 text-b9-pink border-b9-pink/20"
                  >
                    {category}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCategoryToggle(category)
                      }}
                      className="ml-1 hover:text-b9-pink/70"
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