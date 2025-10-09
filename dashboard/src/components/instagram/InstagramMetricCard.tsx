'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface InstagramMetricCardProps {
  icon: ReactNode
  iconColor?: 'primary' | 'secondary' | 'tertiary'
  value: string | number
  label: string
  sublabel?: string
  highlighted?: boolean
  badge?: ReactNode
  className?: string
}

/**
 * InstagramMetricCard - Standardized metric card for Instagram pages
 *
 * @deprecated Use UniversalMetricCard with variant="viral" instead
 * This component will be removed in v5.0.0
 *
 * Migration example:
 * ```tsx
 * // OLD
 * <InstagramMetricCard
 *   icon={<Film className="h-4 w-4" />}
 *   iconColor="secondary"
 *   value={formatNumber(8001)}
 *   label="Total Reels"
 *   sublabel="In Database"
 * />
 *
 * // NEW
 * <UniversalMetricCard
 *   variant="viral"
 *   icon={Film}
 *   iconColor="secondary"
 *   title="Total Reels"
 *   value={formatNumber(8001)}
 *   subtitle="In Database"
 * />
 * ```
 */
export function InstagramMetricCard({
  icon,
  iconColor = 'secondary',
  value,
  label,
  sublabel,
  highlighted = false,
  badge,
  className
}: InstagramMetricCardProps) {
  const iconColors = {
    primary: 'text-primary',
    secondary: 'text-secondary-pressed',
    tertiary: 'text-gray-600'
  }

  return (
    <div
      className={cn(
        // Base layout
        `${designSystem.borders.radius.lg} p-4 h-full min-h-[100px]`,
        // Glassmorphism using design tokens (replaces inline bg-[rgba(...)])
        'bg-slate-50/70 backdrop-blur-md',
        'border border-white/20',
        'shadow-[0_8px_32px_rgba(0,0,0,0.1)]',
        // Transitions
        'transition-all duration-300 ease-out',
        // Hover states
        'hover:bg-slate-50/80',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]',
        'hover:scale-[1.02]',
        'hover:-translate-y-1',
        // Highlighted variant (primary border ring)
        highlighted && 'ring-2 ring-primary/30',
        className
      )}
    >
      {/* Icon and optional badge */}
      <div className="flex items-center justify-between mb-2">
        <div className={cn(
          `p-2 ${designSystem.borders.radius.md} shadow-sm ring-1 ring-white/20`,
          'bg-white/60 backdrop-blur-sm',
          iconColors[iconColor]
        )}>
          {icon}
        </div>
        {badge}
      </div>

      {/* Metric content */}
      <div className="space-y-1.5">
        {/* Value */}
        <div className="text-lg font-bold text-gray-900">
          {value}
        </div>

        {/* Label */}
        <div className="text-xs font-semibold text-gray-800">
          {label}
        </div>

        {/* Optional sublabel */}
        {sublabel && (
          <div className="text-xs text-gray-600">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )
}
