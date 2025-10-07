'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import {
  getTagLabel,
  searchTags,
  getAllTags,
  TAG_CATEGORIES,
  type TagOption,
  type TagCategory
} from '@/lib/tagCategories'

import {
  MoreVertical,
  Edit2,
  X,
  Search,
  Plus,
  Check
} from 'lucide-react'

interface TagsDisplayProps {
  tags: string[]
  compactMode?: boolean
  onTagUpdate?: (oldTag: string, newTag: string) => void
  onTagRemove?: (tag: string) => void
  onAddTag?: (tag: string) => void
}

// Category emojis for the new 11-category system
const CATEGORY_EMOJIS: { [key: string]: string } = {
  'niche': '🎯',
  'focus': '👁️',
  'body': '💪',
  'ass': '🍑',
  'breasts': '🍒',
  'age': '📅',
  'ethnicity': '🌍',
  'style': '✨',
  'hair': '💇‍♀️',
  'special': '⭐',
  'content': '📸',
  'default': '🏷️'
}

/**
 * Brand-aligned color schemes for the 11 categories
 * Migrated to Design Token System v2.0 where applicable
 */
const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
  'niche': {
    bg: 'from-secondary/10 to-primary/10',
    text: 'text-secondary-pressed',
    border: 'border-secondary/30'
  },
  'focus': {
    bg: 'from-primary/10 to-rose-50',
    text: 'text-primary-pressed',
    border: 'border-primary/30'
  },
  'body': {
    bg: 'from-fuchsia-50 to-secondary/10',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200/50'
  },
  'ass': {
    bg: 'from-rose-50 to-primary/10',
    text: 'text-rose-700',
    border: 'border-rose-200/50'
  },
  'breasts': {
    bg: 'from-primary/10 to-fuchsia-50',
    text: 'text-primary-pressed',
    border: 'border-primary/30'
  },
  'age': {
    bg: 'from-indigo-50 to-secondary/10',
    text: 'text-indigo-700',
    border: 'border-indigo-200/50'
  },
  'ethnicity': {
    bg: 'from-blue-50 to-indigo-50',
    text: 'text-blue-700',
    border: 'border-blue-200/50'
  },
  'style': {
    bg: 'from-violet-50 to-secondary/10',
    text: 'text-violet-700',
    border: 'border-violet-200/50'
  },
  'hair': {
    bg: 'from-amber-50 to-orange-50',
    text: 'text-amber-700',
    border: 'border-amber-200/50'
  },
  'special': {
    bg: 'from-emerald-50 to-teal-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/50'
  },
  'content': {
    bg: 'from-slate-50 to-gray-50',
    text: 'text-slate-600',
    border: 'border-slate-200/50'
  },
  'default': {
    bg: 'from-gray-50 to-slate-50',
    text: designSystem.typography.color.tertiary,
    border: 'border-default/50'
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

  // Extract category from the current tag
  const tagCategory = tag.split(':')[0] || ''

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

    // When editing, restrict to same category only
    if (isEditing && tagCategory) {
      tags = tags.filter((t: TagOption) => t.category === tagCategory)
    }

    // Filter out already existing tags
    tags = tags.filter((t: TagOption) => !existingTags.includes(t.value) || t.value === tag)

    // Filter by selected category if any (only when not in edit mode)
    if (!isEditing && selectedCategory) {
      tags = tags.filter((t: TagOption) => t.category === selectedCategory)
    }

    return tags
  }, [searchQuery, selectedCategory, existingTags, tag, isEditing, tagCategory])

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
          className="fixed bg-white {designSystem.borders.radius.sm} shadow-lg border border-default py-1 min-w-[150px] z-50"
          style={{ top: position.top, left: position.left }}
        >
          {isEditing ? (
            <div className="w-80">
              {/* Search input */}
              <div className="p-2 border-b border-light">
                {/* Show which category is being edited */}
                {tagCategory && (
                  <div className="mb-2">
                    <div className={cn("text-[10px] font-semibold", designSystem.typography.color.subtle)}>
                      Editing: {(() => {
                        const category = TAG_CATEGORIES.find((c: TagCategory) => c.name === tagCategory)
                        return category?.label || tagCategory.replace(/_/g, ' ')
                      })()}
                    </div>
                    <div className={cn("text-[9px] mt-0.5", designSystem.typography.color.disabled)}>
                      You can only change to other options within this category
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className={cn("absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3", designSystem.typography.color.disabled)} />
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
                    placeholder={`Search ${tagCategory} options...`}
                    className="w-full pl-7 pr-2 py-1 text-xs border border-default rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Tags list */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredTags.length === 0 ? (
                  <div className={cn("text-xs text-center py-4", designSystem.typography.color.subtle)}>
                    No other options available in this category
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredTags.map((tagOption: TagOption) => (
                      <button
                        key={tagOption.value}
                        onClick={() => handleSelectTag(tagOption.value)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded",
                          designSystem.background.hover.subtle,
                          tagOption.value === tag && "bg-primary/10"
                        )}
                      >
                        {tagOption.value === tag && (
                          <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                        <span className="truncate">{tagOption.label}</span>
                        {tagOption.value === tag && (
                          <span className={cn("text-[9px] ml-auto flex-shrink-0", designSystem.typography.color.disabled)}>
                            Current
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <div className="p-2 border-t border-light">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setSearchQuery('')
                    setSelectedCategory(null)
                  }}
                  className={cn("w-full px-2 py-1 text-xs rounded", designSystem.background.surface.light, designSystem.background.hover.neutral, designSystem.typography.color.tertiary)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className={cn("flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left", designSystem.background.hover.subtle)}
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
    tags = tags.filter((t: TagOption) => !existingTags.includes(t.value))
    if (selectedCategory) {
      tags = tags.filter((t: TagOption) => t.category === selectedCategory)
    }
    return tags
  }, [searchQuery, selectedCategory, existingTags])

  // Group tags by category
  const groupedTags = useMemo(() => {
    const groups: { [key: string]: TagOption[] } = {}
    filteredTags.forEach((tag: TagOption) => {
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
          "inline-flex items-center p-0.5 {designSystem.borders.radius.sm}",
          "text-[9px] font-medium transition-all duration-200",
          "hover:shadow-sm cursor-pointer",
          "bg-gradient-to-r border",
          "from-gray-50 to-slate-50 border-light",
          designSystem.typography.color.tertiary,
          "hover:from-primary/10 hover:to-rose-50 hover:text-primary-hover hover:border-primary/30"
        )}
        title="Add Tag"
      >
        <Plus className="w-3 h-3" />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white {designSystem.borders.radius.sm} shadow-lg border border-default z-50 w-80"
          style={{ top: position.top, left: position.left }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-light">
            <div className="relative">
              <Search className={cn("absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3", designSystem.typography.color.disabled)} />
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
                className="w-full pl-7 pr-2 py-1 text-xs border border-default rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded",
                  selectedCategory === null
                    ? "bg-primary text-white"
                    : cn(designSystem.background.surface.light, designSystem.background.hover.neutral, designSystem.typography.color.tertiary)
                )}
              >
                All
              </button>
              {TAG_CATEGORIES.map((cat: TagCategory) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded",
                    selectedCategory === cat.name
                      ? "bg-primary text-white"
                      : cn(designSystem.background.surface.light, designSystem.background.hover.neutral, designSystem.typography.color.tertiary)
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {Object.keys(groupedTags).length === 0 ? (
              <div className={cn("text-xs text-center py-4", designSystem.typography.color.subtle)}>
                {existingTags.length === getAllTags().length
                  ? "All tags already added"
                  : "No matching tags found"}
              </div>
            ) : (
              Object.entries(groupedTags).map(([category, tags]) => {
                const categoryInfo = TAG_CATEGORIES.find((c: TagCategory) => c.name === category)
                return (
                  <div key={category} className="mb-3">
                    <div className={cn("text-[10px] font-semibold mb-1", designSystem.typography.color.subtle)}>
                      {categoryInfo?.label || category}
                    </div>
                    <div className="space-y-0.5">
                      {tags.map((tagOption: TagOption) => (
                        <button
                          key={tagOption.value}
                          onClick={() => handleSelectTag(tagOption.value)}
                          className={cn("w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded", designSystem.background.hover.subtle)}
                        >
                          <Plus className={cn("w-3 h-3 flex-shrink-0", designSystem.typography.color.disabled)} />
                          <span className="truncate">{tagOption.label}</span>
                          <span className={cn("text-[9px] ml-auto flex-shrink-0", designSystem.typography.color.disabled)}>
                            {categoryInfo?.label || tagOption.category}
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

      // Get the display label from the tag system
      const label = getTagLabel(tag)

      return {
        full: tag,
        display: label,
        category
      }
    })
  }, [tags])

  if (!tags || tags.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]">🏷️</span>
        <span className={cn("text-[10px] italic", designSystem.typography.color.disabled)}>No tags</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1 w-full">
      {processedTags.map((tag, index) => {
        const colors = CATEGORY_COLORS[tag.category] || CATEGORY_COLORS.default
        const emoji = CATEGORY_EMOJIS[tag.category] || CATEGORY_EMOJIS.default

        return (
          <div
            key={`${tag.full}-${index}`}
            className={cn(
              "group relative inline-flex items-center gap-1 px-1.5 py-0.5 {designSystem.borders.radius.sm}",
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
            <span className="truncate max-w-[80px]">
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