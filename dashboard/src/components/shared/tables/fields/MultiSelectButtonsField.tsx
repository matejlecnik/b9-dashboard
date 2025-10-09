'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  displayLabel?: string // For compact mode
}

interface MultiSelectButtonsFieldProps {
  options: SelectOption[]
  value: string | null | undefined
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
  compactMode?: boolean
}

export const MultiSelectButtonsField = memo(function MultiSelectButtonsField({
  options,
  value,
  onChange,
  className,
  size = 'sm',
  compactMode = false
}: MultiSelectButtonsFieldProps) {
  const buttonHeight = size === 'sm' ? (compactMode ? 'h-6' : 'h-7') : 'h-9'
  const buttonPadding = size === 'sm' ? (compactMode ? 'px-1' : 'px-2') : 'px-3'

  return (
    <div className={cn('flex gap-1', className)}>
      {options.map((option) => {
        const isSelected = value === option.value
        const displayText = compactMode && option.displayLabel
          ? option.displayLabel
          : option.label

        return (
          <Button
            key={option.value}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(option.value)}
            className={cn(
              'text-xs font-semibold',
              buttonHeight,
              buttonPadding,
              isSelected
                ? '!text-white !border-0 before:hidden'
                : 'hover:border-primary/40'
            )}
            style={
              isSelected
                ? {
                    background: 'linear-gradient(135deg, var(--pink-500), var(--pink-600))',
                    border: '1px solid var(--pink-600)',
                    boxShadow: '0 2px 8px var(--pink-alpha-20)',
                    borderRadius: '0.5rem', // 8px - matches rounded-lg
                  }
                : undefined
            }
            title={`Mark as ${option.label}`}
          >
            {displayText}
          </Button>
        )
      })}
    </div>
  )
})

// Preset option configurations for common use cases
export const SelectOptionPresets = {
  reddit: {
    review: [
      { value: 'Ok', label: 'Ok', displayLabel: 'O' },
      { value: 'No Seller', label: 'No Seller', displayLabel: 'N' },
      { value: 'Non Related', label: 'Non Related', displayLabel: 'NR' }
    ]
  },
  instagram: {
    review: [
      { value: 'ok', label: 'Ok', displayLabel: 'O' },
      { value: 'non_related', label: 'Non Related', displayLabel: 'NR' },
      { value: 'pending', label: 'Unreviewed', displayLabel: 'U' }
    ]
  }
}
