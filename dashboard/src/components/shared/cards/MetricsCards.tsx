'use client'

import { memo, useMemo } from 'react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'


interface MetricsCardsProps {
  // Platform-specific props
  platform?: 'reddit' | 'instagram'

  // Reddit props (backward compatible)
  totalSubreddits?: number
  uncategorizedCount?: number
  statusCount?: number
  statusTitle?: string
  newTodayCount?: number

  // Instagram props
  totalCreators?: number
  pendingCount?: number
  approvedCount?: number
  nonRelatedCount?: number

  // Common props
  loading: boolean
  error?: string | null
  reviewCounts?: {
    unreviewed: number
    ok: number
    non_related: number
    no_seller: number
    total: number
  }
  className?: string
}

const MetricsCards = memo(function MetricsCards({
  platform = 'reddit',
  // Reddit props
  totalSubreddits = 0,
  uncategorizedCount,
  statusCount,
  statusTitle,
  newTodayCount = 0,
  // Instagram props
  totalCreators = 0,
  pendingCount = 0,
  approvedCount = 0,
  nonRelatedCount = 0,
  // Common props
  loading,
  error,
  reviewCounts,
  className = ""
}: MetricsCardsProps) {
  // Platform-specific calculations
  let effectiveStatusCount: number
  let effectiveTitle: string
  let completedCount: number
  let completionPercentage: number
  let totalForDisplay: number
  let secondMetricTitle: string
  let secondMetricValue: number
  let secondMetricSubtitle: string
  let hasActivity: boolean

  if (platform === 'instagram') {
    // Instagram metrics
    totalForDisplay = totalCreators
    effectiveStatusCount = pendingCount
    effectiveTitle = 'Pending Review'
    completedCount = approvedCount + nonRelatedCount
    completionPercentage = totalCreators > 0 ? Math.round((completedCount / totalCreators) * 100) : 0
    secondMetricTitle = 'Approved'
    secondMetricValue = approvedCount
    secondMetricSubtitle = 'Ready to track'
    hasActivity = approvedCount > 0
  } else {
    // Reddit metrics
    effectiveStatusCount = typeof statusCount === 'number' ? statusCount : (uncategorizedCount || 0)
    effectiveTitle = statusTitle || 'Unreviewed'
    completedCount = totalSubreddits - effectiveStatusCount
    completionPercentage = totalSubreddits > 0 ? Math.round((completedCount / totalSubreddits) * 100) : 0
    totalForDisplay = totalSubreddits
    secondMetricTitle = 'Added Today'
    secondMetricValue = newTodayCount
    secondMetricSubtitle = newTodayCount > 0 ? 'New Discoveries' : 'No New Ones'
    hasActivity = newTodayCount > 0
  }
  
  if (reviewCounts) {
    // For review page: completed = ok + non_related + no_seller
    completedCount = reviewCounts.ok + reviewCounts.non_related + reviewCounts.no_seller
    totalForDisplay = reviewCounts.total
    completionPercentage = reviewCounts.total > 0 ? Math.round((completedCount / reviewCounts.total) * 100) : 0
  }

  // Memoize metrics array to prevent recreation on each render
  const metrics = useMemo(() => [
    {
      title: platform === 'instagram' ? 'Total Creators' : 'Total Subreddits',
      value: loading ? '...' : error ? 'Error' : totalForDisplay.toLocaleString('en-US'),
      subtitle: error ? 'Failed to load' : 'In Database',
      testId: platform === 'instagram' ? 'total-creators' : 'total-subreddits'
    },
    {
      title: secondMetricTitle,
      value: loading ? '...' : secondMetricValue.toLocaleString('en-US'),
      subtitle: secondMetricSubtitle,
      hasActivity: hasActivity,
      testId: platform === 'instagram' ? 'approved-count' : 'new-today-count'
    },
    {
      title: effectiveTitle,
      value: loading ? '...' : effectiveStatusCount.toLocaleString('en-US'),
      subtitle: effectiveStatusCount > 0 ? 'Need Review' : 'All Done!',
      isHighlight: effectiveStatusCount > 0,
      testId: platform === 'instagram' ? 'pending-count' : 'status-count'
    },
    {
      title: 'Progress',
      value: loading ? '...' : `${completedCount}/${totalForDisplay}`,
      subtitle: `${completionPercentage}% Complete`,
      showProgress: true,
      percentage: completionPercentage,
      testId: 'completion-percentage'
    }
  ], [
    platform,
    loading,
    error,
    totalForDisplay,
    secondMetricValue,
    secondMetricTitle,
    secondMetricSubtitle,
    hasActivity,
    effectiveTitle,
    effectiveStatusCount,
    completionPercentage,
    completedCount
  ])



  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3', className)} data-testid={`${platform}-metrics-cards`}>
      {metrics.map((metric, index) => {
        return (
          <div
            key={index}
            data-testid={metric.testId}
            className={cn(
              designSystem.borders.radius.md,
              'p-3 h-full min-h-[80px]',
              designSystem.animation.transition.default,
              'bg-[var(--slate-50-alpha-70)] backdrop-blur-[15px]',
              'border', platform === 'instagram' ? 'border-white/20' : 'border-default',
              'shadow-[0_8px_32px_var(--black-alpha-10)]',
              'hover:bg-[var(--slate-50-alpha-80)]',
              'hover:shadow-[0_12px_40px_var(--black-alpha-15)]',
              'hover:scale-[1.02] hover:-translate-y-1',
              metric.isHighlight && 'ring-2 ring-primary/30'
            )}
          >
            <div className="space-y-1">
              <div className={cn(designSystem.typography.size.xl, designSystem.typography.weight.bold, designSystem.typography.color.primary, 'font-mac-display text-shadow-subtle')}>
                {metric.value}
              </div>
              <div className={cn(designSystem.typography.size.xs, designSystem.typography.weight.semibold, designSystem.typography.color.secondary, 'font-mac-text')}>
                {metric.title}
              </div>
              <div className={cn("text-[11px]", designSystem.typography.color.tertiary, 'font-mac-text')}>
                {metric.subtitle}
              </div>
            </div>

            {/* Progress bar for completion */}
            {metric.showProgress && !loading && (
              <div className="mt-2">
                <div
                  className={cn('w-full h-1', designSystem.borders.radius.full)}
                  style={{
                    background: 'var(--black-alpha-06)',
                  }}
                >
                  <div
                    className={cn('h-1', designSystem.borders.radius.full, designSystem.animation.transition.slow)}
                    style={{
                      width: `${metric.percentage}%`,
                      background: 'linear-gradient(135deg, var(--pink-500), var(--pink-600))',
                      boxShadow: '0 1px 2px var(--pink-alpha-20)',
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export { MetricsCards }
