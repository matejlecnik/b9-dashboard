'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
  hoverable?: boolean
  delay?: number
}

interface AnimatedCardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
}

export function AnimatedCard({
  className,
  children,
  hoverable = false,
  delay = 0,
  ...props
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        // Simplified styling for performance
        'rounded-2xl bg-white border border-gray-200 shadow-lg',
        'fade-in', // CSS-only fade animation
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        ...(hoverable && { cursor: 'pointer' })
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function AnimatedCardHeader({
  className,
  children,
  ...props
}: AnimatedCardSectionProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function AnimatedCardContent({
  className,
  children,
  ...props
}: AnimatedCardSectionProps) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function AnimatedCardFooter({
  className,
  children,
  ...props
}: AnimatedCardSectionProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Simplified metrics card for performance
export function MetricsCard({
  title,
  value,
  change,
  trend,
  icon,
  className,
  ...props
}: {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon?: ReactNode
  className?: string
} & AnimatedCardProps) {
  const trendColor = trend === 'up' ? 'text-pink-600' : trend === 'down' ? 'text-gray-800' : 'text-gray-600'
  
  return (
    <AnimatedCard
      className={cn('p-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
          </p>
          {change !== undefined && (
            <p className={cn('text-xs font-medium mt-1', trendColor)}>
              {change > 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 rounded-xl bg-gray-50">
            {icon}
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}