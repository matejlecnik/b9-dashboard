'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface ColorThreshold {
  maxDays: number
  color: string
}

interface DateFieldProps {
  daysAgo: number | null | undefined
  className?: string
  placeholder?: string
  bold?: boolean
  colorThresholds?: ColorThreshold[]
}

export const DateField = memo(function DateField({
  daysAgo,
  className,
  placeholder = '—',
  bold = false,
  colorThresholds
}: DateFieldProps) {
  if (daysAgo === null || daysAgo === undefined) {
    return <span className={cn("text-sm", designSystem.typography.color.disabled)}>{placeholder}</span>
  }

  // Format the date string
  const formatDate = (days: number): string => {
    if (days < 1) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${Math.round(days)}d ago`
    if (days < 30) return `${Math.round(days / 7)}w ago`
    if (days < 365) return `${Math.round(days / 30)}mo ago`
    return `${Math.round(days / 365)}y ago`
  }

  // Determine color based on thresholds
  let colorClass: string = designSystem.typography.color.secondary
  if (colorThresholds) {
    // Sort thresholds by maxDays ascending
    const sorted = [...colorThresholds].sort((a, b) => a.maxDays - b.maxDays)
    for (const threshold of sorted) {
      if (daysAgo <= threshold.maxDays) {
        colorClass = threshold.color
        break
      }
    }
    // If no threshold matched, use last threshold's color
    if (daysAgo > sorted[sorted.length - 1].maxDays) {
      colorClass = sorted[sorted.length - 1].color
    }
  }

  return (
    <span className={cn(
      'text-sm',
      bold && 'font-semibold',
      colorClass,
      className
    )}>
      {formatDate(daysAgo)}
    </span>
  )
})

// Preset color threshold configurations
export const DatePresets = {
  recentActivity: [
    { maxDays: 7, color: 'text-pink-600' },
    { maxDays: 14, color: designSystem.typography.color.secondary },
    { maxDays: 30, color: designSystem.typography.color.tertiary },
    { maxDays: Infinity, color: designSystem.typography.color.disabled }
  ],
  lastPosted: [
    { maxDays: 1, color: 'text-pink-600' },
    { maxDays: 7, color: designSystem.typography.color.secondary },
    { maxDays: 14, color: designSystem.typography.color.tertiary },
    { maxDays: 30, color: designSystem.typography.color.disabled }
  ]
}
