'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

interface BadgeConfig {
  label: string
  variant?: BadgeVariant
  className?: string
}

interface BadgeFieldProps {
  value: string | number | null | undefined
  className?: string
  variantMap?: Record<string, BadgeVariant>
  classNameMap?: Record<string, string>
  defaultVariant?: BadgeVariant
  defaultClassName?: string
}

export const BadgeField = memo(function BadgeField({
  value,
  className,
  variantMap,
  classNameMap,
  defaultVariant = 'default',
  defaultClassName
}: BadgeFieldProps) {
  if (!value) return <span className="text-sm text-gray-400">—</span>

  const stringValue = String(value)
  const variant = variantMap?.[stringValue] || defaultVariant
  const badgeClassName = classNameMap?.[stringValue] || defaultClassName

  return (
    <Badge
      variant={variant}
      className={cn(badgeClassName, className)}
    >
      {stringValue}
    </Badge>
  )
})

// Preset badge configurations for common use cases
export const BadgePresets = {
  status: {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    inactive: {
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    onboarding: {
      label: 'Onboarding',
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  },
  review: {
    approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-700 border-red-200'
    },
    pending: {
      label: 'Pending',
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    }
  },
  boolean: {
    true: {
      label: 'Yes',
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    false: {
      label: 'No',
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }
}
