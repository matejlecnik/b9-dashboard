'use client'

import React, { memo } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CategoryFilterPillsProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  onClearCategories: () => void
  subredditCounts?: Record<string, number>
  loading?: boolean
  className?: string
}

export const CategoryFilterPills = memo(function CategoryFilterPills({
  selectedCategories,
  onCategoryToggle,
  onClearCategories,
  subredditCounts = {},
  loading = false,
  className = ""
}: CategoryFilterPillsProps) {
  
  if (selectedCategories.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        {selectedCategories.map((category) => (
          <Badge
            key={category}
            variant="secondary"
            className="bg-pink-100 text-pink-800 hover:bg-pink-200 transition-colors cursor-pointer"
            onClick={() => !loading && onCategoryToggle(category)}
          >
            {category}
            {subredditCounts[category] && (
              <span className="ml-1 text-xs opacity-75">
                ({subredditCounts[category]})
              </span>
            )}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        ))}
      </div>
      
      {selectedCategories.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCategories}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 p-1 h-auto"
        >
          Clear all
        </Button>
      )}
    </div>
  )
})