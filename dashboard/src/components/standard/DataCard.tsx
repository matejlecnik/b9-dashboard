'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { LucideIcon } from 'lucide-react'

interface DataCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
  variant?: 'default' | 'glass' | 'elevated'
  className?: string
  onClick?: () => void
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading = false,
  variant = 'glass',
  className,
  onClick
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
      return val.toLocaleString('en-US')
    }
    return val
  }

  return (
    <div
      className={cn(
        designSystem.card[variant],
        designSystem.radius.lg,
        designSystem.spacing.card,
        designSystem.animation.normal,
        designSystem.shadows.hover,
        onClick && 'cursor-pointer',
        'relative overflow-hidden',
        className
      )}
      onClick={onClick}
    >
      {/* Background gradient accent */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, var(--pink-alpha-20) 0%, transparent 60%)'
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            {Icon && (
              <div className={cn(
                `p-2 ${designSystem.borders.radius.md} bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`,
                designSystem.typography.color.secondary
              )}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <h3 className={cn(designSystem.text.label, designSystem.typography.color.tertiary)}>
              {title}
            </h3>
          </div>

          {/* Value */}
          {loading ? (
            <div className={cn("h-8 w-24 rounded animate-pulse", designSystem.background.surface.neutral)} />
          ) : (
            <p className={cn("text-2xl font-bold", designSystem.typography.color.primary)}>
              {formatValue(value)}
            </p>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className={cn(designSystem.text.small, 'mt-1')}>
              {subtitle}
            </p>
          )}

          {/* Trend */}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className={cn("text-xs", designSystem.typography.color.subtle)}>vs last period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Metric Grid for organizing multiple DataCards
interface MetricGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  children,
  columns = 4,
  className
}) => {
  const gridClass = {
    2: designSystem.grid.cols2,
    3: designSystem.grid.cols3,
    4: designSystem.grid.cols4,
    5: designSystem.grid.cols5
  }[columns]

  return (
    <div className={cn(gridClass, className)}>
      {children}
    </div>
  )
}

// Stat Card - simpler version for basic stats
interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: 'gray' | 'pink' | 'green' | 'red' | 'blue'
  loading?: boolean
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'gray',
  loading = false,
  className
}) => {
  const colors = {
    gray: `${designSystem.typography.color.tertiary} ${designSystem.background.surface.subtle}`,
    pink: 'text-primary-hover bg-primary/10',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50'
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4',
      designSystem.radius.md,
      designSystem.card.default,
      className
    )}>
      {Icon && (
        <div className={cn(
          `p-2 ${designSystem.borders.radius.sm}`,
          colors[color]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className={designSystem.text.small}>{label}</p>
        {loading ? (
          <div className={cn("h-6 w-16 rounded animate-pulse mt-1", designSystem.background.surface.neutral)} />
        ) : (
          <p className={cn("text-lg font-semibold", designSystem.typography.color.primary)}>{value}</p>
        )}
      </div>
    </div>
  )
}