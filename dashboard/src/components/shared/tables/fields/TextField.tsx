'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { BadgesField, type Badge } from './BadgesField'

interface TextFieldProps {
  value: string | null | undefined
  className?: string
  truncate?: boolean
  maxLength?: number
  placeholder?: string
  bold?: boolean
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  subtitle?: string | undefined
  subtitleColor?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  badges?: Badge[]
  dangerouslySetHTML?: boolean
}

export const TextField = memo(function TextField({
  value,
  className,
  truncate = true,
  maxLength,
  placeholder = '—',
  bold = false,
  color = 'primary',
  subtitle,
  subtitleColor = 'tertiary',
  badges,
  dangerouslySetHTML = false
}: TextFieldProps) {
  const displayValue = value || placeholder
  const truncatedValue = maxLength && displayValue.length > maxLength
    ? `${displayValue.substring(0, maxLength)}...`
    : displayValue

  const colorClass = {
    primary: designSystem.typography.color.primary,
    secondary: designSystem.typography.color.secondary,
    tertiary: designSystem.typography.color.tertiary,
    subtle: designSystem.typography.color.subtle
  }[color]

  const subtitleColorClass = {
    primary: designSystem.typography.color.primary,
    secondary: designSystem.typography.color.secondary,
    tertiary: designSystem.typography.color.tertiary,
    subtle: designSystem.typography.color.subtle
  }[subtitleColor]

  const baseClassName = cn(
    'text-sm',
    bold && 'font-semibold',
    truncate && 'truncate',
    colorClass
  )

  // If we have subtitle or badges, use a flex container
  if (subtitle || (badges && badges.length > 0)) {
    return (
      <div className={cn('flex flex-col gap-0.5', className)}>
        <div className="flex items-center gap-2">
          {dangerouslySetHTML && value ? (
            <div
              className={baseClassName}
              dangerouslySetInnerHTML={{ __html: truncatedValue }}
            />
          ) : (
            <div className={baseClassName}>{truncatedValue}</div>
          )}
          {badges && badges.length > 0 && <BadgesField badges={badges} size="sm" />}
        </div>
        {subtitle && (
          <div className={cn('text-xs', truncate && 'truncate', subtitleColorClass)}>
            {subtitle}
          </div>
        )}
      </div>
    )
  }

  // Simple single-value rendering
  if (dangerouslySetHTML && value) {
    return (
      <div
        className={cn(baseClassName, className)}
        dangerouslySetInnerHTML={{ __html: truncatedValue }}
      />
    )
  }

  return (
    <div className={cn(baseClassName, className)}>
      {truncatedValue}
    </div>
  )
})
