'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Progress } from '@/components/ui/progress'

export interface UniversalProgressCardProps {
  // Core data
  title: string
  value: string | number
  subtitle?: string
  percentage: number

  // Behavior
  loading?: boolean
  onClick?: () => void
  className?: string
}

/**
 * UniversalProgressCard - Mac-style progress card
 *
 * Similar to UniversalMetricCard but with prominent progress bar display
 * Used for showing completion/progress metrics (e.g., categorization progress)
 *
 * Design principles:
 * - Same Mac glassmorphism as UniversalMetricCard
 * - Progress bar prominently displayed
 * - Clean typography with percentage and subtitle
 *
 * @example
 * ```tsx
 * <UniversalProgressCard
 *   title="Categorization Progress"
 *   value="85%"
 *   subtitle="850 / 1000"
 *   percentage={85}
 *   loading={false}
 * />
 * ```
 */
export const UniversalProgressCard = memo(function UniversalProgressCard({
  title,
  value,
  subtitle,
  percentage,
  loading = false,
  onClick,
  className
}: UniversalProgressCardProps) {

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
        'p-4',
        'h-[90px]', // Fixed height for consistency with UniversalMetricCard
        'flex flex-col justify-between', // Vertical spacing

        // Mac-style frosted glass
        'backdrop-blur-xl backdrop-saturate-150',

        // Enhanced hover
        'transition-all duration-300 ease-out',
        'hover:scale-[1.01]',

        // Clickable
        onClick && 'cursor-pointer',

        className
      )}
      style={{
        // Exact same background as UniversalMetricCard
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        border: '1px solid var(--slate-400-alpha-60)',
        boxShadow: '0 20px 50px var(--black-alpha-12)'
      }}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/40 via-transparent to-slate-200/20 pointer-events-none" />

      {/* Content */}
      <div className="relative space-y-2">
        {/* Header: Title and Value */}
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "text-[10px] font-medium uppercase tracking-wider whitespace-nowrap",
            "font-mac-text",
            designSystem.typography.color.tertiary
          )}>
            {title}
          </h3>
          <div className="text-right flex-shrink-0 ml-4">
            {loading ? (
              <div className="animate-pulse">
                <div className={cn("h-6 w-12 rounded", designSystem.background.surface.neutral)} />
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "text-lg font-bold",
                  "font-mac-display",
                  designSystem.typography.color.primary
                )}>
                  {formatValue(value)}
                </span>
                {subtitle && (
                  <span className={cn("text-[10px]", designSystem.typography.color.subtle)}>
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {loading ? (
          <div className={cn("h-3 rounded animate-pulse", designSystem.background.surface.neutral)} />
        ) : (
          <Progress
            value={percentage}
            className="h-3"
          />
        )}
      </div>
    </div>
  )
})
