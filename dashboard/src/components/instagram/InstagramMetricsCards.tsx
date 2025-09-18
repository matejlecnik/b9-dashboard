'use client'

import React, { memo, useMemo } from 'react'
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Heart,
  Eye,
  Film,
  Image
} from 'lucide-react'

interface InstagramMetricsCardsProps {
  totalCreators: number
  pendingCount: number
  approvedCount: number
  nonRelatedCount: number
  avgEngagement?: number
  totalContent?: number
  loading: boolean
  error?: string | null
  className?: string
}

const InstagramMetricsCards = memo(function InstagramMetricsCards({
  totalCreators,
  pendingCount,
  approvedCount,
  nonRelatedCount,
  avgEngagement = 0,
  totalContent = 0,
  loading,
  error,
  className = ""
}: InstagramMetricsCardsProps) {

  const completedCount = approvedCount + nonRelatedCount
  const completionPercentage = totalCreators > 0 ? Math.round((completedCount / totalCreators) * 100) : 0

  // Memoize metrics array to prevent recreation on each render
  const metrics = useMemo(() => [
    {
      title: 'Total Creators',
      value: loading ? '...' : error ? 'Error' : totalCreators.toLocaleString('en-US'),
      subtitle: error ? 'Failed to load' : 'Tracked',
      icon: Users,
      iconColor: error ? 'text-purple-800' : 'text-purple-700',
      gradient: 'from-purple-500 to-pink-500',
      testId: 'total-creators'
    },
    {
      title: 'Pending Review',
      value: loading ? '...' : pendingCount.toLocaleString('en-US'),
      subtitle: pendingCount > 0 ? 'Need Review' : 'All Done!',
      icon: Clock,
      iconColor: pendingCount > 0 ? 'text-pink-600' : 'text-pink-500',
      gradient: 'from-pink-500 to-rose-500',
      isHighlight: pendingCount > 0,
      testId: 'pending-count'
    },
    {
      title: 'Approved',
      value: loading ? '...' : approvedCount.toLocaleString('en-US'),
      subtitle: 'Ready to track',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      gradient: 'from-green-500 to-emerald-500',
      testId: 'approved-count'
    },
    {
      title: `${completionPercentage}%`,
      value: loading ? '...' : `${completedCount}/${totalCreators}`,
      subtitle: 'Complete',
      icon: TrendingUp,
      iconColor: 'text-blue-600',
      gradient: 'from-blue-500 to-indigo-500',
      showProgress: true,
      percentage: completionPercentage,
      testId: 'completion-percentage'
    }
  ], [
    loading,
    error,
    totalCreators,
    pendingCount,
    approvedCount,
    completionPercentage,
    completedCount
  ])

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 ${className}`} data-testid="instagram-metrics-cards">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon
        return (
          <div
            key={index}
            data-testid={metric.testId}
            className={`
              rounded-2xl p-5 transition-all duration-300 ease-out h-full min-h-[120px]
              bg-white/80 backdrop-blur-xl
              border border-white/40
              shadow-[0_8px_32px_rgba(0,0,0,0.08)]
              hover:bg-white/90
              hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]
              hover:scale-[1.02] hover:-translate-y-1
              ${metric.isHighlight ? 'ring-2 ring-pink-300/40' : ''}
              relative overflow-hidden
            `}
          >
            {/* Background gradient decoration */}
            <div
              className={`absolute inset-0 opacity-5 bg-gradient-to-br ${metric.gradient}`}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-xl ${metric.iconColor} bg-white/70 backdrop-blur-sm shadow-sm ring-1 ring-white/30`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                {metric.isHighlight && (
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse delay-150" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-2xl font-bold text-gray-900 tracking-tight">
                  {metric.value}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {metric.title}
                </div>
                <div className="text-xs text-gray-500">
                  {metric.subtitle}
                </div>
              </div>

              {/* Progress bar for completion */}
              {metric.showProgress && !loading && (
                <div className="mt-3">
                  <div className="w-full rounded-full h-1.5 bg-gray-200/70">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{
                        width: `${metric.percentage}%`,
                        boxShadow: '0 1px 3px rgba(99, 102, 241, 0.4)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

export { InstagramMetricsCards }