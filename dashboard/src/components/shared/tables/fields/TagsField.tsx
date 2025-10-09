'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface TagsFieldProps {
  tags: string[] | null | undefined
  className?: string
  maxVisible?: number
  showCount?: boolean
  extractCategories?: boolean
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'sm' | 'md'
}

export const TagsField = memo(function TagsField({
  tags,
  className,
  maxVisible = 2,
  showCount = true,
  extractCategories = false,
  variant = 'secondary',
  size = 'sm'
}: TagsFieldProps) {
  if (!tags || tags.length === 0) {
    return <span className={cn("text-sm", designSystem.typography.color.tertiary)}>No tags</span>
  }

  const getTagCategories = (tagList: string[]) => {
    const categories = new Set<string>()
    tagList.forEach(tag => {
      const category = tag.split(':')[0]
      if (category) categories.add(category)
    })
    return Array.from(categories)
  }

  const displayTags = extractCategories ? getTagCategories(tags) : tags
  const visibleTags = displayTags.slice(0, maxVisible)
  const remainingCount = displayTags.length - maxVisible

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  }

  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", className)}>
      {showCount && (
        <span className={cn(sizeClasses[size], "flex-shrink-0", designSystem.typography.color.tertiary)}>
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
        </span>
      )}
      {displayTags.length > 0 && (
        <div className="flex gap-1 overflow-hidden">
          {visibleTags.map((tag, index) => (
            <Badge
              key={index}
              variant={variant}
              className={cn(
                sizeClasses[size],
                variant === 'secondary' && 'bg-secondary/10 text-secondary-pressed border-secondary/30',
                "flex-shrink-0"
              )}
            >
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                sizeClasses[size],
                "flex-shrink-0",
                designSystem.background.surface.light,
                designSystem.typography.color.tertiary
              )}
            >
              +{remainingCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
})
