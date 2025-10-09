'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface NumberFieldProps {
  value: number | null | undefined
  className?: string
  format?: 'number' | 'compact' | 'abbreviated'
  decimals?: number
  placeholder?: string
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  bold?: boolean
}

export const NumberField = memo(function NumberField({
  value,
  className,
  format = 'number',
  decimals = 0,
  placeholder = '—',
  color = 'secondary',
  bold = false
}: NumberFieldProps) {
  const formatNumber = (num: number): string => {
    switch (format) {
      case 'compact':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: decimals
        }).format(num)

      case 'abbreviated':
        if (num >= 1000000) {
          return `${(num / 1000000).toFixed(decimals)}M`
        } else if (num >= 1000) {
          return `${(num / 1000).toFixed(decimals)}K`
        }
        return num.toFixed(decimals)

      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: decimals
        }).format(num)
    }
  }

  const displayValue = value !== null && value !== undefined
    ? formatNumber(value)
    : placeholder

  const colorClass = {
    primary: designSystem.typography.color.primary,
    secondary: designSystem.typography.color.secondary,
    tertiary: designSystem.typography.color.tertiary,
    subtle: designSystem.typography.color.subtle
  }[color]

  return (
    <span className={cn(
      'text-sm',
      bold && 'font-semibold',
      colorClass,
      className
    )}>
      {displayValue}
    </span>
  )
})
