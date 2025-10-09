'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface TextFieldProps {
  value: string | null | undefined
  className?: string
  truncate?: boolean
  maxLength?: number
  placeholder?: string
  bold?: boolean
  color?: 'primary' | 'secondary' | 'tertiary' | 'subtle'
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

  const baseClassName = cn(
    'text-sm',
    bold && 'font-semibold',
    truncate && 'truncate',
    colorClass,
    className
  )

  if (dangerouslySetHTML && value) {
    return (
      <div
        className={baseClassName}
        dangerouslySetInnerHTML={{ __html: truncatedValue }}
      />
    )
  }

  return (
    <div className={baseClassName}>
      {truncatedValue}
    </div>
  )
})
