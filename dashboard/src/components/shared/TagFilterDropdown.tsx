'use client'

import { useState, useMemo } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
        <Button
          variant="outline"
          className={cn(
            "min-w-[140px] h-9 px-3 bg-white border-strong",
            designSystem.background.hover.subtle,
            "flex items-center justify-between gap-2",
            selectedCount > 0 && "border-primary ring-1 ring-primary/30"
          )}
          disabled={loading}
        >
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-sm">
              {selectedCount > 0 ? (
                <span className="font-medium">Tags ({selectedCount})</span>
              ) : (
                'Filter'
              )}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[280px] p-0 bg-white" align="end">
        {/* Header with search and select buttons */}
        <div className={cn("p-3 border-b", designSystem.background.surface.subtle)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Filter by Tags</span>
            <span className={cn("text-xs", designSystem.typography.color.subtle)}>
              {showUntaggedOnly ? 'Untagged' : `${selectedCount}/${totalCount} selected`}
            </span>
          </div>

          {/* Show Untagged Only Option */}
          {onShowUntaggedChange && (
            <div className="mb-2 p-2 bg-white rounded border border-default">
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
              className="flex-1 h-7 text-xs bg-white"
              disabled={selectedCount === totalCount}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="flex-1 h-7 text-xs bg-white"
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
            className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Tag categories */}
        <div className={cn(
          "max-h-[350px] overflow-y-auto bg-white",
          showUntaggedOnly && "opacity-50 pointer-events-none"
        )}>
          {Object.entries(filteredGroups).map(([category, subcategories]) => {
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

            return (
              <div key={category} className="border-b last:border-b-0">
                {/* Category header */}
                <div className={cn("flex items-center justify-between px-2 py-1.5", designSystem.background.hover.subtle)}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-1.5 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span className="text-xs font-medium flex items-center gap-1">
                      <span className="text-base">{categoryConfig.emoji}</span>
                      <span>{categoryConfig.label}</span>
                      {selectedInCategory > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {selectedInCategory}
                        </Badge>
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
                          className={cn("flex items-center justify-between py-0.5 px-1 rounded", designSystem.background.hover.subtle)}
                        >
                          <label
                            className="flex items-center gap-1.5 flex-1 cursor-pointer"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTag(fullTag)}
                              aria-label={`Select ${subcategory}`}
                              className="h-3.5 w-3.5"
                            />
                            <span className={cn(
                              "text-xs capitalize",
                              isSelected && "font-medium text-primary-hover"
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
          <div className={cn("px-3 py-2 border-t", designSystem.background.surface.subtle)}>
            <div className="flex items-center justify-between">
              <span className={cn("text-xs", designSystem.typography.color.tertiary)}>
                {selectedCount} tag{selectedCount !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-xs hover:text-primary-hover"
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