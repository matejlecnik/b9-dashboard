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
          background: 'linear-gradient(135deg, rgba(255, 131, 149, 0.2) 0%, transparent 60%)'
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            {Icon && (
              <div className={cn(
                'p-2 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20',
                'text-gray-700'
              )}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <h3 className={cn(designSystem.text.label, 'text-gray-600')}>
              {title}
            </h3>
          </div>

          {/* Value */}
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
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
              <span className="text-xs text-gray-500">vs last period</span>
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
    gray: 'text-gray-600 bg-gray-50',
    pink: 'text-pink-600 bg-pink-50',
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
          'p-2 rounded-lg',
          colors[color]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className={designSystem.text.small}>{label}</p>
        {loading ? (
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  )
}