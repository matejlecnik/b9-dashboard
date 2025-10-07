'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'compact' | 'centered'
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  action,
  variant = 'default',
  className
}) => {
  const variants = {
    default: 'py-12',
    compact: 'py-6',
    centered: 'py-16 min-h-[400px] flex items-center justify-center'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      variants[variant],
      className
    )}>
      {Icon && (
        <div className={cn(
          `mb-4 p-3 ${designSystem.borders.radius.full}`,
          'bg-gray-100 text-gray-400'
        )}>
          <Icon className="h-8 w-8" />
        </div>
      )}

      {title && (
        <h3 className={cn(designSystem.text.h4, 'mb-2')}>
          {title}
        </h3>
      )}

      <p className={cn(designSystem.text.body, 'text-gray-500 max-w-md')}>
        {message}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          className={cn('mt-4', designSystem.radius.sm)}
          variant="outline"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Loading skeleton card
interface LoadingCardProps {
  rows?: number
  showHeader?: boolean
  showImage?: boolean
  className?: string
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  rows = 3,
  showHeader = true,
  showImage = false,
  className
}) => {
  return (
    <div className={cn(
      designSystem.card.default,
      designSystem.radius.lg,
      designSystem.spacing.card,
      'animate-pulse',
      className
    )}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
      )}

      {showImage && (
        <div className={`h-48 w-full bg-gray-200 ${designSystem.borders.radius.sm} mb-4`} />
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-4 bg-gray-200 rounded flex-1" />
            {i === 0 && <div className="h-4 w-16 bg-gray-200 rounded" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// Table loading skeleton
interface LoadingTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export const LoadingTable: React.FC<LoadingTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}) => {
  return (
    <div className={cn(
      designSystem.card.default,
      designSystem.radius.lg,
      'overflow-hidden',
      className
    )}>
      {showHeader && (
        <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex items-center space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className={cn(
                    'h-4 bg-gray-200 rounded animate-pulse',
                    colIndex === 0 ? 'w-32' : 'w-24'
                  )}
                  style={{ animationDelay: `${(rowIndex + colIndex) * 100}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Grid loading skeleton
interface LoadingGridProps {
  items?: number
  columns?: 2 | 3 | 4
  className?: string
}

export const LoadingGrid: React.FC<LoadingGridProps> = ({
  items = 6,
  columns = 3,
  className
}) => {
  const gridClass = {
    2: designSystem.grid.cols2,
    3: designSystem.grid.cols3,
    4: designSystem.grid.cols4
  }[columns]

  return (
    <div className={cn(gridClass, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <LoadingCard key={i} showImage />
      ))}
    </div>
  )
}

// Spinner loading indicator
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'gray' | 'pink' | 'white'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'pink',
  className
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const colors = {
    gray: 'border-gray-600',
    pink: 'border-b9-pink',
    white: 'border-white'
  }

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <div className={cn(
        sizes[size],
        `border-2 ${designSystem.borders.radius.full} animate-spin`,
        colors[color],
        'border-t-transparent'
      )} />
    </div>
  )
}