'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Filter, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TAG_CATEGORIES, getTagLabel } from '@/lib/tagCategories'
import { formatNumber } from '@/lib/utils'

interface TagFilterDropdownProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  loading?: boolean
  untaggedCount?: number
  taggedCount?: number
}

// Category emojis for visual grouping
const CATEGORY_EMOJIS: { [key: string]: string } = {
  'niche': '🎯',
  'focus': '👁️',
  'body': '💪',
  'ass': '🍑',
  'breasts': '🎀',
  'age': '📅',
  'ethnicity': '🌍',
  'style': '✨',
  'hair': '💇',
  'special': '⭐',
  'content': '📸'
}

export function TagFilterDropdown({
  availableTags,
  selectedTags,
  onTagsChange,
  loading = false,
  untaggedCount = 0,
  taggedCount = 0
}: TagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
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
        left: rect.right - 320 // 320px is the dropdown width
      })
    }
  }, [isOpen])

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const handleSelectAll = () => {
    onTagsChange(availableTags)
  }

  const handleClearAll = () => {
    onTagsChange([])
  }

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }

  const isShowingUntagged = selectedTags.length === 0
  const displayText = isShowingUntagged
    ? `Untagged (${formatNumber(untaggedCount)})`
    : selectedTags.length === availableTags.length
    ? `All Tags (${formatNumber(taggedCount)})`
    : selectedTags.length === 1
    ? getTagLabel(selectedTags[0])
    : `${selectedTags.length} tags`

  // Group available tags by category
  const tagsByCategory = TAG_CATEGORIES.reduce((acc, category) => {
    const categoryTags = availableTags.filter(tag => tag.startsWith(`${category.name}:`))
    if (categoryTags.length > 0) {
      acc[category.name] = {
        label: category.label,
        tags: categoryTags
      }
    }
    return acc
  }, {} as Record<string, { label: string, tags: string[] }>)

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="h-8 px-3 text-xs font-medium border-gray-200 hover:bg-gray-50 flex items-center gap-2"
      >
        <Tag className="h-3.5 w-3.5" />
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
          className="w-80 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Filter by Tags</span>
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

            {/* Show untagged option */}
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={isShowingUntagged}
                  onChange={() => handleClearAll()}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border ${
                  isShowingUntagged
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-300'
                }`}>
                  {isShowingUntagged && (
                    <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-700 flex-1">
                Show Untagged
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {untaggedCount}
              </Badge>
            </label>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {Object.entries(tagsByCategory).map(([categoryName, categoryData]) => {
              const isExpanded = expandedCategories.has(categoryName)
              const categorySelectedCount = categoryData.tags.filter(tag =>
                selectedTags.includes(tag)
              ).length

              return (
                <div key={categoryName} className="mb-2">
                  <button
                    onClick={() => toggleCategory(categoryName)}
                    className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_EMOJIS[categoryName] || '📌'}</span>
                      <span className="text-xs font-medium text-gray-700">{categoryData.label}</span>
                      {categorySelectedCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {categorySelectedCount}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {isExpanded && (
                    <div className="mt-1 ml-6">
                      {categoryData.tags.map(tag => {
                        const label = getTagLabel(tag)
                        const isSelected = selectedTags.includes(tag)

                        return (
                          <label
                            key={tag}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <div className="relative flex items-center justify-center w-4 h-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleTag(tag)}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded border ${
                                isSelected
                                  ? 'bg-pink-500 border-pink-500'
                                  : 'bg-white border-gray-300'
                              }`}>
                                {isSelected && (
                                  <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-700 flex-1">{label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {Object.keys(tagsByCategory).length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                No tags available
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}