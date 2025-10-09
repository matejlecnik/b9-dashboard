'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Card, CardContent, CardTitle } from './Card'
import { StatCard } from './DataCard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
// import { SocialIcon } from './IconLibrary'

// ============================================================================
// TYPES
// ============================================================================

interface PlaceholderStat {
  label: string
  value: string
  subtitle?: string
}

export interface StandardPlaceholderProps {
  // Basic info
  title: string
  subtitle?: string
  description: string
  launchDate?: string

  // Icon
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  iconColor?: 'pink' | 'blue' | 'black' | 'green' | 'purple' | 'orange'
  customIcon?: React.ReactNode

  // Stats
  stats?: PlaceholderStat[]

  // Navigation
  backUrl?: string
  backLabel?: string

  // Styling
  gradientFrom?: string
  gradientVia?: string
  gradientTo?: string
  variant?: 'light' | 'dark'
  className?: string
}

// ============================================================================
// COLOR SCHEMES
// ============================================================================

const colorSchemes = {
  pink: {
    gradient: 'from-primary/10 via-secondary/10 to-primary/10',
    iconBg: 'bg-gradient-to-br from-primary-hover via-primary to-primary-pressed',
    iconText: 'text-white',
    statColor: 'pink' as const,
    button: `${designSystem.typography.color.secondary} ${designSystem.background.hover.light}`
  },
  blue: {
    gradient: 'from-cyan-50 via-blue-50 to-cyan-50',
    iconBg: 'bg-cyan-600',
    iconText: 'text-white',
    statColor: 'blue' as const,
    button: `${designSystem.typography.color.secondary} ${designSystem.background.hover.light}`
  },
  black: {
    gradient: 'from-black via-gray-900 to-black',
    iconBg: 'bg-black',
    iconText: 'text-white',
    statColor: 'gray' as const,
    button: 'text-white border-white hover:bg-white hover:text-black',
    cardBg: `${designSystem.background.surface.inverse}/50 border-gray-800`,
    textColor: 'text-white',
    subtitleColor: designSystem.typography.color.disabled,
    statBg: 'bg-black/50'
  },
  green: {
    gradient: 'from-green-50 via-emerald-50 to-green-50',
    iconBg: 'bg-green-600',
    iconText: 'text-white',
    statColor: 'green' as const,
    button: `${designSystem.typography.color.secondary} ${designSystem.background.hover.light}`
  },
  purple: {
    gradient: 'from-secondary/10 via-indigo-50 to-secondary/10',
    iconBg: 'bg-secondary-hover',
    iconText: 'text-white',
    statColor: 'purple' as const,
    button: `${designSystem.typography.color.secondary} ${designSystem.background.hover.light}`
  },
  orange: {
    gradient: 'from-orange-50 via-amber-50 to-orange-50',
    iconBg: 'bg-orange-600',
    iconText: 'text-white',
    statColor: 'orange' as const,
    button: `${designSystem.typography.color.secondary} ${designSystem.background.hover.light}`
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const StandardPlaceholder: React.FC<StandardPlaceholderProps> = ({
  title,
  subtitle,
  description,
  launchDate,

  icon: Icon,
  iconColor = 'pink',
  customIcon,

  stats = [],

  backUrl = '/dashboards',
  backLabel = 'Back to Dashboards',

  gradientFrom,
  gradientVia,
  gradientTo,
  variant = 'light',
  className
}) => {

  const scheme = colorSchemes[iconColor]
  const isDark = variant === 'dark' || iconColor === 'black'

  // Build gradient class
  const gradientClass = gradientFrom && gradientTo
    ? `from-${gradientFrom} via-${gradientVia || gradientFrom} to-${gradientTo}`
    : scheme.gradient

  // Default stats if none provided
  const displayStats = stats.length > 0 ? stats : [
    { label: 'Launch', value: launchDate?.split(' ')[0] || 'Q2', subtitle: launchDate?.split(' ')[1] || '2025' },
    { label: 'Status', value: 'AI', subtitle: 'Powered' },
    { label: 'Monitoring', value: '24/7', subtitle: 'Real-time' }
  ]

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br',
      gradientClass,
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href={backUrl}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  designSystem.radius.sm,
                  isDark ? 'text-white hover:bg-white/10' : ''
                )}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className={cn(
                designSystem.text.h1,
                isDark ? 'text-white' : ''
              )}>
                {title}
              </h1>
              {subtitle && (
                <p className={cn(
                  designSystem.text.subtitle,
                  'mt-1',
                  isDark ? designSystem.typography.color.disabled : ''
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card
          variant="glass"
          className={cn(
            'max-w-2xl mx-auto mt-20',
            isDark && 'cardBg' in scheme && scheme.cardBg
          )}
        >
          <CardContent className="text-center py-12">
            {/* Icon */}
            {(Icon || customIcon) && (
              <div className={cn(
                'mx-auto mb-6 p-4',
                scheme.iconBg,
                designSystem.radius.md,
                designSystem.shadows.lg
              )}>
                {customIcon || (
                  Icon && <Icon className={cn('h-12 w-12', scheme.iconText)} />
                )}
              </div>
            )}

            {/* Title in card */}
            <CardTitle className={isDark && 'textColor' in scheme ? scheme.textColor : ''}>
              {description}
            </CardTitle>

            {/* Launch date or subtitle */}
            {launchDate && (
              <p className={cn(
                designSystem.text.body,
                'mt-4 mb-8',
                isDark && 'subtitleColor' in scheme ? scheme.subtitleColor : ''
              )}>
                Coming Soon - {launchDate}
              </p>
            )}

            {/* Stats */}
            {displayStats.length > 0 && (
              <div className={cn(
                'grid gap-4 mb-8',
                displayStats.length === 3 ? 'grid-cols-3' :
                displayStats.length === 2 ? 'grid-cols-2' :
                displayStats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3'
              )}>
                {displayStats.map((stat, index) => (
                  isDark ? (
                    <div
                      key={index}
                      className={cn(
                        `p-4 ${designSystem.borders.radius.sm}`,
                        'statBg' in scheme && scheme.statBg
                      )}
                    >
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className={cn("text-sm", designSystem.typography.color.disabled)}>{stat.subtitle || stat.label}</p>
                    </div>
                  ) : (
                    <StatCard
                      key={index}
                      label={stat.label}
                      value={stat.value}
                      color={scheme.statColor as 'gray' | 'pink' | 'green' | 'red' | 'blue' | undefined}
                    />
                  )
                ))}
              </div>
            )}

            {/* Back button */}
            <div className="pt-4">
              <Link href={backUrl}>
                <Button
                  variant="outline"
                  className={cn(
                    designSystem.radius.sm,
                    isDark && scheme.button
                  )}
                >
                  {backLabel}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}