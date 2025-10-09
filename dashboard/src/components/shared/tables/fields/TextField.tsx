'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { BadgesField, type Badge } from './BadgesField'
import { type LinkSubtitle } from '../types'

interface TextFieldProps {
  value: string | null | undefined
  className?: string
  truncate?: boolean
  maxLength?: number
  placeholder?: string
  bold?: boolean
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
  subtitle?: string | LinkSubtitle | undefined
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

  // Render subtitle - handle both string and link types
  const renderSubtitle = () => {
    if (!subtitle) return null

    // Check if subtitle is a link object
    if (typeof subtitle === 'object' && 'type' in subtitle && subtitle.type === 'link') {
      const linkText = subtitle.showHostname
        ? new URL(subtitle.url).hostname.replace('www.', '')
        : subtitle.url

      return (
        <a
          href={subtitle.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'text-xs',
            truncate && 'truncate',
            'text-blue-500 hover:text-blue-600 hover:underline',
            'transition-colors duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
        </a>
      )
    }

    // Regular string subtitle
    return (
      <div className={cn('text-xs', truncate && 'truncate', subtitleColorClass)}>
        {subtitle as string}
      </div>
    )
  }

  // If we have subtitle or badges, use a flex container
  if (subtitle || (badges && badges.length > 0)) {
    return (
      <div className={cn('flex flex-col gap-0.5 min-w-0', className)}>
        <div className="flex items-center gap-2 min-w-0">
          {dangerouslySetHTML && value ? (
            <div
              className={cn(baseClassName, 'min-w-0')}
              dangerouslySetInnerHTML={{ __html: truncatedValue }}
            />
          ) : (
            <div className={cn(baseClassName, 'min-w-0')}>{truncatedValue}</div>
          )}
          {badges && badges.length > 0 && <BadgesField badges={badges} size="sm" />}
        </div>
        {renderSubtitle()}
      </div>
    )
  }

  // Simple single-value rendering
  if (dangerouslySetHTML && value) {
    return (
      <div
        className={cn(baseClassName, 'min-w-0', className)}
        dangerouslySetInnerHTML={{ __html: truncatedValue }}
      />
    )
  }

  return (
    <div className={cn(baseClassName, 'min-w-0', className)}>
      {truncatedValue}
    </div>
  )
})
