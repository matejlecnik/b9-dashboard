'use client'

import { useState, useMemo } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface TagFilterDropdownProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  showUntaggedOnly?: boolean
  onShowUntaggedChange?: (show: boolean) => void
  loading?: boolean
}

// Category display names and emojis
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  niche: { label: 'Niche', emoji: '🎯' },
  focus: { label: 'Focus', emoji: '👁️' },
  body: { label: 'Body Type', emoji: '💪' },
  ass: { label: 'Ass', emoji: '🍑' },
  breasts: { label: 'Breasts', emoji: '🍒' },
  age: { label: 'Age', emoji: '📅' },
  ethnicity: { label: 'Ethnicity', emoji: '🌍' },
  style: { label: 'Style', emoji: '✨' },
  hair: { label: 'Hair', emoji: '💇‍♀️' },
  special: { label: 'Special', emoji: '⭐' },
  content: { label: 'Content', emoji: '📸' },
}

export function TagFilterDropdown({
  availableTags,
  selectedTags,
  onTagsChange,
  showUntaggedOnly = false,
  onShowUntaggedChange,
  loading = false,
}: TagFilterDropdownProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Group tags by category
  const groupedTags = useMemo(() => {
    const groups: Record<string, string[]> = {}

    availableTags.forEach(tag => {
      if (tag.includes(':')) {
        const [category, subcategory] = tag.split(':')
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(subcategory)
      }
    })

    // Sort subcategories within each category
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.localeCompare(b))
    })

    return groups
  }, [availableTags])

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedTags

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, string[]> = {}

    Object.entries(groupedTags).forEach(([category, subcategories]) => {
      // Check if category matches
      if (category.toLowerCase().includes(query)) {
        filtered[category] = subcategories
      } else {
        // Check if any subcategory matches
        const matchingSubcategories = subcategories.filter(sub =>
          sub.toLowerCase().includes(query)
        )
        if (matchingSubcategories.length > 0) {
          filtered[category] = matchingSubcategories
        }
      }
    })

    return filtered
  }, [groupedTags, searchQuery])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    onTagsChange(newTags)
  }

  const toggleAllInCategory = (category: string) => {
    const categoryTags = groupedTags[category]?.map(sub => `${category}:${sub}`) || []
    const allSelected = categoryTags.every(tag => selectedTags.includes(tag))

    if (allSelected) {
      // Remove all tags from this category
      onTagsChange(selectedTags.filter(tag => !categoryTags.includes(tag)))
    } else {
      // Add all tags from this category
      const newTags = new Set([...selectedTags, ...categoryTags])
      onTagsChange(Array.from(newTags))
    }
  }

  const clearAll = () => {
    onTagsChange([])
    // Automatically enable "Show untagged only" when clearing all tags
    if (onShowUntaggedChange) {
      onShowUntaggedChange(true)
    }
  }

  const selectAll = () => {
    const allTags: string[] = []
    Object.entries(groupedTags).forEach(([category, subcategories]) => {
      subcategories.forEach(sub => {
        allTags.push(`${category}:${sub}`)
      })
    })
    onTagsChange(allTags)
  }

  const selectedCount = selectedTags.length
  const totalCount = Object.values(groupedTags).reduce((sum, subs) => sum + subs.length, 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={loading}
          className={cn(
            "group relative min-w-[140px] h-9 px-3 overflow-hidden",
            "flex items-center justify-between gap-2",
            designSystem.borders.radius.lg,
            designSystem.animation.transition.default,
            "hover:scale-[1.02]",
            designSystem.typography.color.secondary
          )}
          style={{
            background: selectedCount > 0
              ? 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)'
              : 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            boxShadow: selectedCount > 0
              ? '0 8px 20px var(--pink-custom-alpha-40), inset 0 2px 2px 0 var(--white-alpha-40)'
              : '0 8px 20px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-60)',
            border: selectedCount > 0
              ? '1px solid var(--pink-600)'
              : '1px solid var(--slate-400-alpha-60)'
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 z-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between gap-2 w-full">
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              <span className={cn(
                "text-sm",
                selectedCount > 0 ? "font-medium text-pink-600" : designSystem.typography.color.tertiary
              )}>
                {selectedCount > 0 ? (
                  <span>Tags ({selectedCount})</span>
                ) : (
                  'Filter'
                )}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn(
          "w-[280px] p-0 border-0",
          "backdrop-blur-xl backdrop-saturate-150",
          designSystem.borders.radius.lg,
          designSystem.shadows.lg
        )}
        style={{
          background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
          border: '1px solid var(--slate-400-alpha-60)',
          boxShadow: '0 12px 32px var(--black-alpha-15)'
        }}
        align="end"
      >
        {/* Header with search and select buttons */}
        <div className={cn(
          "p-3 border-b border-gray-200/40"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-sm font-semibold", designSystem.typography.color.secondary)}>Filter by Tags</span>
            <span className={cn("text-xs", designSystem.typography.color.subtle)}>
              {showUntaggedOnly ? 'Untagged' : `${selectedCount}/${totalCount} selected`}
            </span>
          </div>

          {/* Show Untagged Only Option */}
          {onShowUntaggedChange && (
            <div className={cn(
              "mb-2 p-2",
              "bg-white/30 border border-gray-200/40",
              designSystem.borders.radius.md
            )}>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showUntaggedOnly}
                  onCheckedChange={(checked) => {
                    onShowUntaggedChange(!!checked)
                    if (checked) {
                      // Clear all tag selections when showing untagged only
                      onTagsChange([])
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className={cn("text-xs font-medium", designSystem.typography.color.secondary)}>Show untagged only</span>
              </label>
            </div>
          )}

          {/* Select/Deselect All Buttons */}
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className={cn(
                "flex-1 h-7 text-xs",
                "bg-white/30 border-gray-200/40",
                "hover:bg-pink-50/50 hover:text-pink-600 hover:border-pink-200/40",
                "transition-colors duration-200",
                designSystem.typography.color.tertiary
              )}
              disabled={selectedCount === totalCount}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className={cn(
                "flex-1 h-7 text-xs",
                "bg-white/30 border-gray-200/40",
                "hover:bg-pink-50/50 hover:text-pink-600 hover:border-pink-200/40",
                "transition-colors duration-200",
                designSystem.typography.color.tertiary
              )}
              disabled={selectedCount === 0}
            >
              Deselect All
            </Button>
          </div>

          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 text-xs",
              "bg-white/30 border border-gray-200/40",
              "focus:outline-none focus:ring-1 focus:ring-pink-500/20 focus:border-pink-200/40",
              "focus:bg-pink-50/30",
              "transition-all duration-200",
              designSystem.borders.radius.md
            )}
          />
        </div>

        {/* Tag categories */}
        <div className={cn(
          "max-h-[350px] overflow-y-auto",
          showUntaggedOnly && "opacity-50 pointer-events-none"
        )}>
          {Object.entries(filteredGroups).map(([category, subcategories], categoryIndex) => {
            const isExpanded = expandedCategories.has(category)
            const categoryConfig = CATEGORY_CONFIG[category] || {
              label: category,
              emoji: '📌'
            }
            const categoryTags = subcategories.map(sub => `${category}:${sub}`)
            const selectedInCategory = categoryTags.filter(tag =>
              selectedTags.includes(tag)
            ).length
            const allSelected = selectedInCategory === subcategories.length
            const isPinkCategory = categoryIndex % 2 === 0

            return (
              <div key={category} className="border-b border-gray-200/40 last:border-b-0">
                {/* Category header */}
                <div className={cn(
                  "flex items-center justify-between px-2 py-1.5 transition-all duration-200",
                  isPinkCategory
                    ? "bg-gradient-to-r from-pink-50/30 to-rose-50/20 hover:from-pink-50/50 hover:to-rose-50/40"
                    : "bg-gradient-to-r from-gray-50/50 to-slate-50/30 hover:from-gray-100/50 hover:to-slate-100/30",
                  isPinkCategory && selectedInCategory > 0 && "from-pink-50/60 to-rose-50/40"
                )}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-1.5 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-3 w-3 transition-transform duration-200" />
                    )}
                    <span className="text-xs font-medium flex items-center gap-1">
                      <span className="text-base">{categoryConfig.emoji}</span>
                      <span className={cn(designSystem.typography.color.secondary)}>{categoryConfig.label}</span>
                      {selectedInCategory > 0 && (
                        <span className={cn(
                          "ml-1 h-4 px-1.5 text-[10px] font-medium rounded-full",
                          "bg-gradient-to-r from-pink-50/50 to-rose-50/50",
                          "text-pink-600 border border-pink-200/40"
                        )}>
                          {selectedInCategory}
                        </span>
                      )}
                    </span>
                  </button>
                  <Checkbox
                    checked={allSelected && subcategories.length > 0}
                    onCheckedChange={() => toggleAllInCategory(category)}
                    className="mr-1 h-3.5 w-3.5"
                    aria-label={`Select all ${categoryConfig.label}`}
                  />
                </div>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="pl-6 pr-2 pb-1">
                    {subcategories.map(subcategory => {
                      const fullTag = `${category}:${subcategory}`
                      const isSelected = selectedTags.includes(fullTag)

                      return (
                        <div
                          key={fullTag}
                          className={cn(
                            "flex items-center justify-between py-0.5 px-1 transition-colors duration-200",
                            "hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-slate-50/60",
                            designSystem.borders.radius.sm
                          )}
                        >
                          <label
                            className="flex items-center gap-1.5 flex-1 cursor-pointer"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTag(fullTag)}
                              aria-label={`Select ${subcategory}`}
                              className="h-4 w-4"
                            />
                            <span className={cn(
                              "text-xs capitalize transition-colors duration-200",
                              isSelected ? "font-medium text-pink-600" : designSystem.typography.color.tertiary
                            )}>
                              {subcategory.replace(/_/g, ' ')}
                            </span>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer with selected count */}
        {selectedCount > 0 && (
          <div className={cn(
            "px-3 py-2 border-t border-gray-200/40"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pink-600">
                {selectedCount} tag{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className={cn(
                  "h-6 px-2 text-xs",
                  "hover:text-pink-600 hover:bg-pink-50/50",
                  "transition-colors duration-200",
                  designSystem.typography.color.tertiary
                )}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}