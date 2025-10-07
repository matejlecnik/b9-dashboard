'use client'

import { PostMetrics } from '@/types/post'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface PostAnalysisStatsProps {
  metrics: PostMetrics | null
  loading?: boolean
}

export function PostAnalysisStats({
  metrics,
  loading = false
}: PostAnalysisStatsProps) {

  // Format hour to readable time with UTC
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period} UTC`
  }

  if (loading) {
    return (
      <div className="flex gap-2 mb-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 bg-white/80 backdrop-blur-sm border border-default {designSystem.borders.radius.sm} p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded", designSystem.background.surface.neutral)} />
              <div className="flex-1">
                <div className={cn("h-3 rounded w-20 mb-1.5", designSystem.background.surface.neutral)} />
                <div className={cn("h-5 rounded w-24", designSystem.background.surface.neutral)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="flex gap-2 mb-3">
      {/* Total Posts Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-default {designSystem.borders.radius.sm} p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className={cn("text-xs font-medium mb-1", designSystem.typography.color.tertiary)}>Total Posts</h3>
        <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>
          {formatNumber(metrics.total_posts_count)}
        </p>
        <p className={cn("text-[10px]", designSystem.typography.color.subtle)}>Approved only</p>
      </div>

      {/* Best Performing Subreddit Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-default {designSystem.borders.radius.sm} p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className={cn("text-xs font-medium mb-1", designSystem.typography.color.tertiary)}>Best Subreddit</h3>
        <p className={cn("text-sm font-bold truncate", designSystem.typography.color.primary)}>
          r/{metrics.best_avg_upvotes_subreddit}
        </p>
        <p className={cn("text-[10px]", designSystem.typography.color.subtle)}>
          {formatNumber(metrics.best_avg_upvotes_value)} upvotes
        </p>
      </div>

      {/* Best Engagement Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-default {designSystem.borders.radius.sm} p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className={cn("text-xs font-medium mb-1", designSystem.typography.color.tertiary)}>Most Comments</h3>
        <p className={cn("text-sm font-bold truncate", designSystem.typography.color.primary)}>
          r/{metrics.best_engagement_subreddit}
        </p>
        <p className={cn("text-[10px]", designSystem.typography.color.subtle)}>
          {formatNumber(metrics.best_engagement_value)} comments
        </p>
      </div>

      {/* Best Posting Time Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-default {designSystem.borders.radius.sm} p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className={cn("text-xs font-medium mb-1", designSystem.typography.color.tertiary)}>Best Time</h3>
        <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>
          {formatHour(metrics.best_performing_hour)}
        </p>
        <p className={cn("text-[10px]", designSystem.typography.color.subtle)}>Peak engagement</p>
      </div>
    </div>
  )
}