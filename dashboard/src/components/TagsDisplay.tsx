'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  MoreVertical,
  Edit2,
  X,
  Search,
  Plus,
  Check
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { TAG_CATEGORIES, getAllTags, searchTags } from '@/lib/tagCategories'

interface TagsDisplayProps {
  tags: string[]
  compactMode?: boolean
  onTagUpdate?: (oldTag: string, newTag: string) => void
  onTagRemove?: (tag: string) => void
  onAddTag?: (tag: string) => void
}

// Emoji icons for each subcategory
const SUBCATEGORY_EMOJIS: { [key: string]: string } = {
  // Physical
  'body_type': '💪',
  'hair': '💇‍♀️',
  'skin': '🎨',
  'mod': '💉',
  'feature': '👁️',
  'age_look': '🕰️',

  // Body Focus
  'ass': '🍑',
  'breasts': '🍒',
  'legs': '🦵',
  'feet': '👣',
  'core': '🔷',
  'pussy': '🌸',
  'full': '👤',
  'other': '👄',
  'face': '👄',
  'lips': '👄',
  'tongue': '👄',
  'hands': '👄',
  'armpits': '👄',

  // Demographics
  'age': '📅',
  'ethnicity': '🌍',
  'asian': '🌏',
  'geo': '📍',

  // Style
  'clothing': '👗',
  'nudity': '🔥',
  'aesthetic': '✨',
  'subculture': '🎭',
  'cosplay': '🦸‍♀️',

  // Themes
  'dynamic': '⚡',
  'roleplay': '🎬',
  'fetish': '🔒',
  'lifestyle': '🏡',
  'mood': '💭',

  // Platform
  'type': '📸',
  'of': '💰',
  'interaction': '💬',

  // Demographics alternate naming
  'demo': '🌍',

  // Default
  'default': '🏷️'
}

// Brand-aligned color schemes with pink/purple theme
const TAG_COLORS: { [key: string]: { bg: string; text: string; border: string; icon: string } } = {
  'physical': {
    bg: 'from-pink-50 to-rose-50',
    text: 'text-pink-700',
    border: 'border-pink-200/50',
    icon: 'text-pink-500'
  },
  'body': {
    bg: 'from-purple-50 to-pink-50',
    text: 'text-purple-700',
    border: 'border-purple-200/50',
    icon: 'text-purple-500'
  },
  'style': {
    bg: 'from-fuchsia-50 to-purple-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200/50',
    icon: 'text-fuchsia-500'
  },
  'theme': {
    bg: 'from-violet-50 to-purple-50',
    text: 'text-violet-700',
    border: 'border-violet-200/50',
    icon: 'text-violet-500'
  },
  'platform': {
    bg: 'from-slate-50 to-gray-50',
    text: 'text-slate-600',
    border: 'border-slate-200/50',
    icon: 'text-slate-500'
  },
  'location': {
    bg: 'from-rose-50 to-pink-50',
    text: 'text-rose-700',
    border: 'border-rose-200/50',
    icon: 'text-rose-500'
  },
  'demographic': {
    bg: 'from-indigo-50 to-purple-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200/50',
    icon: 'text-indigo-500'
  },
  'default': {
    bg: 'from-gray-50 to-slate-50',
    text: 'text-gray-600',
    border: 'border-gray-200/50',
    icon: 'text-gray-500'
  }
}

// Tag edit dropdown component with searchable selection
function TagEditDropdown({
  tag,
  existingTags,
  onUpdate,
  onRemove
}: {
  tag: string
  existingTags: string[]
  onUpdate?: (oldTag: string, newTag: string) => void
  onRemove?: (tag: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Extract category and subcategory from the current tag
  const tagParts = tag.split(':')
  const tagCategory = tagParts[0] || ''
  const tagSubcategory = tagParts[1] || ''

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setIsEditing(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectTag = (newTag: string) => {
    if (newTag !== tag && onUpdate) {
      onUpdate(tag, newTag)
    }
    setIsEditing(false)
    setIsOpen(false)
    setSearchQuery('')
    setSelectedCategory(null)
  }

  // Get filtered tags based on search and category
  const filteredTags = useMemo(() => {
    let tags = searchQuery ? searchTags(searchQuery) : getAllTags()

    // When editing, restrict to same subcategory only
    if (isEditing && tagCategory && tagSubcategory) {
      tags = tags.filter(t => {
        const parts = t.value.split(':')
        return parts[0] === tagCategory && parts[1] === tagSubcategory
      })
    }

    // Filter out already existing tags
    tags = tags.filter(t => !existingTags.includes(t.value) || t.value === tag)

    // Filter by selected category if any (only when not in edit mode)
    if (!isEditing && selectedCategory) {
      tags = tags.filter(t => t.category === selectedCategory)
    }

    return tags
  }, [searchQuery, selectedCategory, existingTags, tag, isEditing, tagCategory, tagSubcategory])

  // Group tags by category for display
  const groupedTags = useMemo(() => {
    const groups: { [key: string]: typeof filteredTags } = {}
    filteredTags.forEach(tag => {
      if (!groups[tag.category]) {
        groups[tag.category] = []
      }
      groups[tag.category].push(tag)
    })
    return groups
  }, [filteredTags])

  useEffect(() => {
    if (isEditing && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isEditing])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/50 rounded"
      >
        <MoreVertical className="w-2.5 h-2.5" />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px] z-50"
          style={{ top: position.top, left: position.left }}
        >
          {isEditing ? (
            <div className="w-80">
              {/* Search input */}
              <div className="p-2 border-b border-gray-100">
                {/* Show which subcategory is being edited */}
                {tagCategory && tagSubcategory && (
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold text-gray-500">
                      Editing: {(() => {
                        const category = TAG_CATEGORIES.find(c => c.name === tagCategory)
                        return category?.label || tagCategory.replace(/_/g, ' ')
                      })()}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      You can only change to other options within this group
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditing(false)
                        setSearchQuery('')
                        setSelectedCategory(null)
                      }
                    }}
                    placeholder={`Search ${tagSubcategory?.replace(/_/g, ' ')} options...`}
                    className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                {/* No category filters in edit mode - restricted to subcategory */}
              </div>

              {/* Tags list */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredTags.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No other options available in this group
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredTags.map(tagOption => (
                      <button
                        key={tagOption.value}
                        onClick={() => handleSelectTag(tagOption.value)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-gray-50",
                          tagOption.value === tag && "bg-pink-50"
                        )}
                      >
                        {tagOption.value === tag && (
                          <Check className="w-3 h-3 text-pink-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{tagOption.label}</span>
                        {tagOption.value === tag && (
                          <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">
                            Current
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setSearchQuery('')
                    setSelectedCategory(null)
                  }}
                  className="w-full px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
              >
                <Edit2 className="w-3 h-3" />
                Edit tag
              </button>
              {onRemove && (
                <button
                  onClick={() => {
                    onRemove(tag)
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 text-left"
                >
                  <X className="w-3 h-3" />
                  Remove tag
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// Add tag button component
function AddTagButton({ existingTags, onAddTag }: { existingTags: string[], onAddTag: (tag: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
        setSelectedCategory(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelectTag = (newTag: string) => {
    onAddTag(newTag)
    setIsOpen(false)
    setSearchQuery('')
    setSelectedCategory(null)
  }

  // Get filtered tags
  const filteredTags = useMemo(() => {
    let tags = searchQuery ? searchTags(searchQuery) : getAllTags()
    tags = tags.filter(t => !existingTags.includes(t.value))
    if (selectedCategory) {
      tags = tags.filter(t => t.category === selectedCategory)
    }
    return tags
  }, [searchQuery, selectedCategory, existingTags])

  // Group tags by category
  const groupedTags = useMemo(() => {
    const groups: { [key: string]: typeof filteredTags } = {}
    filteredTags.forEach(tag => {
      if (!groups[tag.category]) {
        groups[tag.category] = []
      }
      groups[tag.category].push(tag)
    })
    return groups
  }, [filteredTags])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center p-0.5 rounded-md",
          "text-[9px] font-medium transition-all duration-200",
          "hover:shadow-sm cursor-pointer",
          "bg-gradient-to-r border",
          "from-gray-50 to-slate-50 text-gray-600 border-gray-200/50",
          "hover:from-pink-50 hover:to-rose-50 hover:text-pink-600 hover:border-pink-200/50"
        )}
        title="Add Tag"
      >
        <Plus className="w-3 h-3" />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-80"
          style={{ top: position.top, left: position.left }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                    setSearchQuery('')
                    setSelectedCategory(null)
                  }
                }}
                placeholder="Search tags to add..."
                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded",
                  selectedCategory === null
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                All
              </button>
              {TAG_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded capitalize",
                    selectedCategory === cat.name
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {Object.keys(groupedTags).length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                {existingTags.length === getAllTags().length
                  ? "All tags already added"
                  : "No matching tags found"}
              </div>
            ) : (
              Object.entries(groupedTags).map(([category, tags]) => {
                const categoryInfo = TAG_CATEGORIES.find(c => c.name === category)
                return (
                  <div key={category} className="mb-3">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1 capitalize">
                      {categoryInfo?.label || category}
                    </div>
                    <div className="space-y-0.5">
                      {tags.map(tagOption => (
                        <button
                          key={tagOption.value}
                          onClick={() => handleSelectTag(tagOption.value)}
                          className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-gray-50"
                        >
                          <Plus className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{tagOption.label}</span>
                          <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">
                            {tagOption.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export function TagsDisplay({
  tags,
  compactMode = false,
  onTagUpdate,
  onTagRemove,
  onAddTag
}: TagsDisplayProps) {
  // Process tags
  const processedTags = useMemo(() => {
    if (!tags || tags.length === 0) return []

    return tags.map(tag => {
      const parts = tag.split(':')
      const category = parts[0] || 'default'
      const subcategory = parts[1] || 'default'

      // Create more concise display text
      let display = tag
      if (parts.length >= 3) {
        // Show last part only for 3+ part tags
        display = parts[parts.length - 1]
      } else if (parts.length === 2) {
        // Show second part for 2 part tags
        display = parts[1]
      }

      return { full: tag, display, category, subcategory }
    })
  }, [tags])

  if (!tags || tags.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]">🏷️</span>
        <span className="text-[10px] text-gray-400 italic">No tags</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1 w-full">
      {processedTags.map((tag, index) => {
        const colors = TAG_COLORS[tag.category] || TAG_COLORS.default
        const emoji = SUBCATEGORY_EMOJIS[tag.subcategory] || SUBCATEGORY_EMOJIS.default

        return (
          <div
            key={`${tag.full}-${index}`}
            className={cn(
              "group relative inline-flex items-center gap-1 px-1 py-0.5 rounded-md",
              "text-[9px] font-medium transition-all duration-200",
              "hover:shadow-sm cursor-default",
              "bg-gradient-to-r border",
              colors.bg,
              colors.text,
              colors.border,
              compactMode && "px-1 py-0 text-[8px]"
            )}
            title={tag.full}
          >
            {/* Emoji icon */}
            <span className="flex-shrink-0 text-[10px]">
              {emoji}
            </span>

            {/* Tag text */}
            <span className="truncate max-w-[60px]">
              {tag.display}
            </span>

            {/* Edit dropdown */}
            {(onTagUpdate || onTagRemove) && (
              <TagEditDropdown
                tag={tag.full}
                existingTags={tags}
                onUpdate={onTagUpdate}
                onRemove={onTagRemove}
              />
            )}
          </div>
        )
      })}

      {/* Add tag button */}
      {onAddTag && (
        <AddTagButton
          existingTags={tags}
          onAddTag={onAddTag}
        />
      )}
    </div>
  )
}