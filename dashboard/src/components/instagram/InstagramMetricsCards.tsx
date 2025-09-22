'use client'

import React, { memo, useMemo } from 'react'
import {
  Users,
  CheckCircle,
  Clock,
  BarChart3,
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
      subtitle: error ? 'Failed to load' : 'In Database',
      icon: Users,
      iconColor: 'text-black',
      testId: 'total-creators'
    },
    {
      title: 'Pending Review',
      value: loading ? '...' : pendingCount.toLocaleString('en-US'),
      subtitle: pendingCount > 0 ? 'Need Review' : 'All Done!',
      icon: Clock,
      iconColor: 'text-black',
      isHighlight: pendingCount > 0,
      testId: 'pending-count'
    },
    {
      title: 'Approved',
      value: loading ? '...' : approvedCount.toLocaleString('en-US'),
      subtitle: 'Ready to track',
      icon: CheckCircle,
      iconColor: 'text-black',
      hasActivity: approvedCount > 0,
      testId: 'approved-count'
    },
    {
      title: `${completionPercentage}%`,
      value: loading ? '...' : `${completedCount}/${totalCreators}`,
      subtitle: 'Complete',
      icon: BarChart3,
      iconColor: 'text-pink-500',
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
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5 ${className}`} data-testid="instagram-metrics-cards">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon
        return (
          <div
            key={index}
            data-testid={metric.testId}
            className={`
              rounded-2xl p-4 transition-all duration-300 ease-out h-full min-h-[100px]
              bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]
              border border-white/20
              shadow-[0_8px_32px_rgba(0,0,0,0.1)]
              hover:bg-[rgba(248,250,252,0.8)]
              hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]
              hover:scale-[1.02] hover:-translate-y-1
              ${metric.isHighlight ? 'ring-2 ring-pink-200/30' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-2 rounded-xl ${metric.iconColor} bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`}
              >
                <IconComponent className="h-4 w-4" />
              </div>
              {metric.isHighlight && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #FF8395, #FF7A85)',
                    boxShadow: '0 1px 2px rgba(255, 131, 149, 0.25)',
                  }}
                ></div>
              )}
              {metric.hasActivity && (
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #34D399)',
                    boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)',
                  }}
                ></div>
              )}
            </div>

            <div className="space-y-1.5">
              <div
                className="text-lg font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]"
                style={{
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {metric.value}
              </div>
              <div
                className="text-xs font-semibold text-gray-800 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]"
              >
                {metric.title}
              </div>
              <div
                className="text-xs text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]"
              >
                {metric.subtitle}
              </div>
            </div>

            {/* Progress bar for completion */}
            {metric.showProgress && !loading && (
              <div className="mt-1.5">
                <div
                  className="w-full rounded-full h-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div
                    className="h-1 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${metric.percentage}%`,
                      background: 'linear-gradient(135deg, #FF8395, #FF7A85)',
                      boxShadow: '0 1px 2px rgba(255, 131, 149, 0.2)',
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

export { InstagramMetricsCards }