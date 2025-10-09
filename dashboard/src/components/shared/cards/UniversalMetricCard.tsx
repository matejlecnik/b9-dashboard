'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

export interface UniversalMetricCardProps {
  // Core data (minimal, Mac-style)
  title: string
  value: string | number
  subtitle?: string

  // Optional features
  progressBar?: {
    percentage: number
  }
  highlighted?: boolean

  // Behavior
  loading?: boolean
  onClick?: () => void
  className?: string
}

/**
 * UniversalMetricCard - Apple Mac-style minimal metric card
 *
 * Design principles:
 * - Minimal, clean, no icons
 * - Unified glassmorphic design
 * - SF Pro typography
 * - Subtle animations
 * - Consistent colors (no platform variants)
 *
 * @example
 * ```tsx
 * <UniversalMetricCard
 *   title="Success Rate"
 *   value="98.5%"
 *   subtitle="197/200"
 * />
 *
 * <UniversalMetricCard
 *   title="Total Users"
 *   value={309608}
 *   subtitle="In Database"
 *   highlighted
 * />
 * ```
 */
export const UniversalMetricCard = memo(function UniversalMetricCard({
  title,
  value,
  subtitle,
  progressBar,
  highlighted = false,
  loading = false,
  onClick,
  className
}: UniversalMetricCardProps) {

  // Format value for display
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-US')
    }
    return val
  }

  return (
    <div
      className={cn(
        // Base Mac-style card
        'relative overflow-hidden group',
        'rounded-2xl',
        'p-3',
        'h-[90px]', // Fixed height for consistency
        'flex flex-col justify-between', // Vertical spacing

        // Mac-style frosted glass (no background color - using gradient in style)
        'backdrop-blur-xl backdrop-saturate-150',

        // Enhanced hover (very Mac-like)
        'transition-all duration-300 ease-out',
        'hover:scale-[1.01]',

        // Highlighted variant (subtle pink ring)
        highlighted && 'ring-1 ring-primary/20',

        // Clickable
        onClick && 'cursor-pointer',

        className
      )}
      style={{
        // Exact sidebar background gradient (matching SidebarTemplate)
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        // Sidebar-style border and shadow system (matching SidebarTemplate)
        border: '1px solid var(--slate-400-alpha-60)',
        boxShadow: '0 20px 50px var(--black-alpha-12)'
      }}
      onClick={onClick}
    >
      {/* Subtle gradient overlay (barely visible, adds depth) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/40 via-transparent to-slate-200/20 pointer-events-none" />

      {/* Content */}
      <div className="relative space-y-1">
        {/* Title - small, subtle */}
        <div className={cn(
          "text-[10px] font-medium uppercase tracking-wider",
          "font-mac-text",
          designSystem.typography.color.tertiary
        )}>
          {title}
        </div>

        {/* Value - large, bold */}
        {loading ? (
          <div className={cn(
            "h-7 w-20 rounded animate-pulse",
            designSystem.background.surface.neutral
          )} />
        ) : (
          <div className={cn(
            "text-2xl font-semibold tracking-tight",
            "font-mac-display",
            designSystem.typography.color.primary
          )}>
            {formatValue(value)}
          </div>
        )}

        {/* Subtitle - minimal */}
        {subtitle && (
          <div className={cn(
            "text-[10px] font-medium",
            "font-mac-text",
            designSystem.typography.color.subtle
          )}>
            {subtitle}
          </div>
        )}

        {/* Progress bar - minimal, subtle */}
        {progressBar && !loading && (
          <div className="pt-2">
            <div className="relative w-full h-[2px] bg-black/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 bg-primary/60',
                  'transition-all duration-500 ease-out'
                )}
                style={{ width: `${progressBar.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
