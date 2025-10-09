'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface ColorThreshold {
  min: number
  color: string
}

interface PercentageFieldProps {
  value: number | null | undefined
  className?: string
  decimals?: number
  placeholder?: string
  bold?: boolean
  colorThresholds?: ColorThreshold[]
  showSign?: boolean
  showPercentSymbol?: boolean
}

export const PercentageField = memo(function PercentageField({
  value,
  className,
  decimals = 1,
  placeholder = '—',
  bold = false,
  colorThresholds,
  showSign = false,
  showPercentSymbol = true
}: PercentageFieldProps) {
  if (value === null || value === undefined) {
    return <span className={cn("text-sm", designSystem.typography.color.disabled)}>{placeholder}</span>
  }

  // Determine color based on thresholds
  let colorClass = designSystem.typography.color.secondary
  if (colorThresholds) {
    // Sort thresholds by min value descending to check highest first
    const sorted = [...colorThresholds].sort((a, b) => b.min - a.min)
    for (const threshold of sorted) {
      if (value >= threshold.min) {
        colorClass = threshold.color
        break
      }
    }
  }

  const formattedValue = value.toFixed(decimals)
  const sign = showSign && value > 0 ? '+' : ''
  const percent = showPercentSymbol ? '%' : ''

  return (
    <span className={cn(
      'text-sm',
      bold && 'font-semibold',
      colorClass,
      className
    )}>
      {sign}{formattedValue}{percent}
    </span>
  )
})

// Preset color threshold configurations
export const PercentagePresets = {
  engagement: [
    { min: 15, color: 'text-pink-600' },      // >= 15% excellent
    { min: 5, color: designSystem.typography.color.secondary },  // >= 5% good
    { min: 0, color: designSystem.typography.color.subtle }      // < 5% low
  ],
  growth: [
    { min: 10, color: 'text-pink-600' },
    { min: 5, color: 'text-pink-500' },
    { min: 0, color: designSystem.typography.color.secondary },
    { min: -Infinity, color: designSystem.typography.color.tertiary }
  ],
  saveRatio: [
    { min: 10, color: 'text-pink-600' },     // >= 10% excellent
    { min: 5, color: 'text-pink-500' },      // >= 5% good
    { min: 0, color: designSystem.typography.color.tertiary }  // < 5% low
  ]
}
