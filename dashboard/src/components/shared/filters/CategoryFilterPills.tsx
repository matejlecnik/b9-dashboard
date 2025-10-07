'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface CategoryFilterPillsProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  onClearCategories: () => void
  subredditCounts?: Record<string, number>
  loading?: boolean
}

const CATEGORIES = [
  'Age Demographics',
  'Ass & Booty', 
  'Body Types & Features',
  'Boobs & Chest',
  'Clothed & Dressed',
  'Cosplay & Fantasy',
  'Ethnic & Cultural',
  'Feet & Foot Fetish',
  'Goth & Alternative',
  'Gym & Fitness',
  'Interactive & Personalized',
  'Lifestyle & Themes',
  'OnlyFans Promotion',
  'Selfie & Amateur',
  'Specific Body Parts'
]

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, string> = {
    'Age Demographics': '👥',
    'Ass & Booty': '🍑',
    'Body Types & Features': '💪',
    'Boobs & Chest': '👙',
    'Clothed & Dressed': '👗',
    'Cosplay & Fantasy': '🎭',
    'Ethnic & Cultural': '🌍',
    'Feet & Foot Fetish': '🦶',
    'Goth & Alternative': '🖤',
    'Gym & Fitness': '🏋️',
    'Interactive & Personalized': '💬',
    'Lifestyle & Themes': '✨',
    'OnlyFans Promotion': '📸',
    'Selfie & Amateur': '🤳',
    'Specific Body Parts': '👁️'
  }
  return iconMap[category] || '🏷️'
}

export function CategoryFilterPills({ 
  selectedCategories, 
  onCategoryToggle, 
  onClearCategories,
  subredditCounts = {},
  loading = false 
}: CategoryFilterPillsProps) {
  const hasSelectedCategories = selectedCategories.length > 0

  return (
    <div className="space-y-3">
      {/* Header with clear button */}
      <div className={designSystem.layout.flex.rowBetween}>
        <h4 className={cn(designSystem.typography.size.sm, designSystem.typography.weight.medium, designSystem.typography.color.secondary)}>Categories</h4>
        {hasSelectedCategories && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCategories}
            className={cn('h-6 px-2', designSystem.typography.color.subtle, `hover:${designSystem.typography.color.secondary}`, `hover:${designSystem.background.hover.light}/50`, designSystem.typography.size.xs)}
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Category pills grid */}
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', designSystem.spacing.gap.tight)}>
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category)
          const count = subredditCounts[category] || 0
          const hasCount = count > 0
          
          return (
            <Button
              key={category}
              variant="ghost"
              onClick={() => onCategoryToggle(category)}
              disabled={loading || (!hasCount && !isSelected)}
              className={cn('h-auto p-2 flex flex-col items-center justify-center text-center border hover:scale-105', designSystem.animation.transition.default)}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, var(--pink-500), var(--pink-600))'
                  : 'var(--white-alpha-80)',
                color: isSelected ? 'white' : 'var(--gray-700)',
                border: isSelected ? '1px solid var(--white-alpha-10)' : '1px solid var(--black-alpha-08)',
                boxShadow: isSelected
                  ? '0 2px 8px var(--pink-alpha-15), inset 0 1px 0 var(--white-alpha-10)'
                  : '0 1px 4px var(--black-alpha-02)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                opacity: (!hasCount && !isSelected) ? 0.5 : 1,
                cursor: (!hasCount && !isSelected) ? 'not-allowed' : 'pointer',
              }}
              title={`${category} (${count} subreddits)`}
            >
              {/* Category icon */}
              <span className={cn(designSystem.typography.size.lg, 'mb-1')} role="img" aria-label={category}>
                {getCategoryIcon(category)}
              </span>

              {/* Category name */}
              <span className={cn(designSystem.typography.size.xs, designSystem.typography.weight.medium, 'leading-tight')}>
                {category}
              </span>

              {/* Count badge */}
              <Badge
                variant="secondary"
                className={cn('mt-1 border-0', designSystem.typography.size.xs, designSystem.typography.weight.medium)}
                style={{
                  background: isSelected
                    ? 'var(--white-alpha-20)'
                    : 'var(--black-alpha-06)',
                  color: isSelected ? 'white' : 'var(--black-alpha-75)',
                }}
              >
                {loading ? '...' : count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Selected categories summary */}
      {hasSelectedCategories && (
        <div className={cn('flex flex-wrap items-center pt-2 border-t', designSystem.spacing.gap.tight, designSystem.borders.color.light)}>
          <span className={cn(designSystem.typography.size.xs, designSystem.typography.weight.medium, designSystem.typography.color.tertiary)}>Selected:</span>
          {selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="outline"
              className={cn(designSystem.typography.size.xs, 'bg-b9-pink/10 text-b9-pink border-b9-pink/20 hover:bg-b9-pink/20 cursor-pointer')}
              onClick={() => onCategoryToggle(category)}
              title={`Remove ${category} filter`}
            >
              {getCategoryIcon(category)} {category}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}