'use client'

import { memo } from 'react'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface RulesButtonFieldProps {
  rulesData: unknown
  displayName: string
  onShowRules?: () => void
  className?: string
  size?: 'sm' | 'md'
}

export const RulesButtonField = memo(function RulesButtonField({
  rulesData,
  displayName,
  onShowRules,
  className,
  size = 'sm'
}: RulesButtonFieldProps) {
  if (!onShowRules) {
    return null
  }

  // Check if rules_data exists and has content
  let hasRulesData = false

  if (rulesData) {
    // Check for string format (current production format): "[{...}]"
    if (typeof rulesData === 'string') {
      try {
        const parsed = JSON.parse(rulesData)
        hasRulesData = Array.isArray(parsed) && parsed.length > 0
      } catch {
        hasRulesData = false
      }
    }
    // Check for object format: {rules: [...]}
    else if (typeof rulesData === 'object') {
      hasRulesData = (
        (Array.isArray(rulesData) && rulesData.length > 0) ||
        ('rules' in rulesData &&
         Array.isArray((rulesData as { rules?: unknown[] }).rules) &&
         ((rulesData as { rules?: unknown[] }).rules?.length || 0) > 0)
      )
    }
  }

  const handleClick = () => {
    if (hasRulesData) {
      onShowRules()
    } else {
      const confirmOpen = window.confirm(
        `No rules data found for ${displayName}.\n\nWould you like to open the subreddit rules page on Reddit?`
      )
      if (confirmOpen) {
        window.open(
          `https://www.reddit.com/${displayName}/about/rules`,
          '_blank',
          'noopener,noreferrer'
        )
      }
    }
  }

  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "p-0",
        designSystem.background.hover.light,
        buttonSize,
        className
      )}
      aria-label={`View rules for ${displayName}`}
    >
      <BookOpen className={cn(
        iconSize,
        hasRulesData ? "text-primary" : designSystem.typography.color.disabled
      )} />
    </Button>
  )
})
