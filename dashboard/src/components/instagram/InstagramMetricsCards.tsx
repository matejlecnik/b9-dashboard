'use client'

import { memo, useMemo } from 'react'


interface InstagramMetricsCardsProps {
  totalCreators: number
  pendingCount: number
  approvedCount: number
  nonRelatedCount: number
  loading: boolean
  error?: string | null
  className?: string
}

const InstagramMetricsCards = memo(function InstagramMetricsCards({
  totalCreators,
  pendingCount,
  approvedCount,
  nonRelatedCount,
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
      testId: 'total-creators'
    },
    {
      title: 'Pending Review',
      value: loading ? '...' : pendingCount.toLocaleString('en-US'),
      subtitle: pendingCount > 0 ? 'Need Review' : 'All Done!',
      isHighlight: pendingCount > 0,
      testId: 'pending-count'
    },
    {
      title: 'Approved',
      value: loading ? '...' : approvedCount.toLocaleString('en-US'),
      subtitle: 'Ready to track',
      hasActivity: approvedCount > 0,
      testId: 'approved-count'
    },
    {
      title: 'Progress',
      value: loading ? '...' : `${completedCount}/${totalCreators}`,
      subtitle: `${completionPercentage}% Complete`,
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
        return (
          <div
            key={index}
            data-testid={metric.testId}
            className={`
              rounded-xl p-3 transition-all duration-300 ease-out h-full min-h-[80px]
              bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]
              border border-white/20
              shadow-[0_8px_32px_rgba(0,0,0,0.1)]
              hover:bg-[rgba(248,250,252,0.8)]
              hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]
              hover:scale-[1.02] hover:-translate-y-1
              ${metric.isHighlight ? 'ring-2 ring-pink-200/30' : ''}
            `}
          >

            <div className="space-y-1">
              <div
                className="text-xl font-bold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]"
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
                className="text-[11px] text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]"
              >
                {metric.subtitle}
              </div>
            </div>

            {/* Progress bar for completion */}
            {metric.showProgress && !loading && (
              <div className="mt-2">
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