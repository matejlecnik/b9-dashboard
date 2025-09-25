'use client'

import { memo, useMemo } from 'react'


interface MetricsCardsProps {
  totalSubreddits: number
  // Backward-compatible prop name used by categorization page
  uncategorizedCount?: number
  // Generic props preferred by review page to avoid category wording
  statusCount?: number
  statusTitle?: string
  newTodayCount: number
  loading: boolean
  error?: string | null
  // Additional props for review page completion calculation
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
  totalSubreddits, 
  uncategorizedCount, 
  statusCount,
  statusTitle,
  newTodayCount,
  loading,
  error,
  reviewCounts,
  className = ""
}: MetricsCardsProps) {
  const effectiveStatusCount = typeof statusCount === 'number' ? statusCount : (uncategorizedCount || 0)
  const effectiveTitle = statusTitle || 'Unreviewed'
  
  // Use new completion calculation when reviewCounts is provided (review page)
  let completedCount = totalSubreddits - effectiveStatusCount
  let completionPercentage = totalSubreddits > 0 ? Math.round((completedCount / totalSubreddits) * 100) : 0
  let totalForDisplay = totalSubreddits
  
  if (reviewCounts) {
    // For review page: completed = ok + non_related + no_seller
    completedCount = reviewCounts.ok + reviewCounts.non_related + reviewCounts.no_seller
    totalForDisplay = reviewCounts.total
    completionPercentage = reviewCounts.total > 0 ? Math.round((completedCount / reviewCounts.total) * 100) : 0
  }

  // Memoize metrics array to prevent recreation on each render
  const metrics = useMemo(() => [
    {
      title: 'Total Subreddits',
      value: loading ? '...' : error ? 'Error' : totalForDisplay.toLocaleString('en-US'),
      subtitle: error ? 'Failed to load' : 'In Database',
      testId: 'total-subreddits'
    },
    {
      title: 'Added Today',
      value: loading ? '...' : newTodayCount.toLocaleString('en-US'),
      subtitle: newTodayCount > 0 ? 'New Discoveries' : 'No New Ones',
      hasActivity: newTodayCount > 0,
      testId: 'new-today-count'
    },
    {
      title: effectiveTitle,
      value: loading ? '...' : effectiveStatusCount.toLocaleString('en-US'),
      subtitle: effectiveStatusCount > 0 ? 'Need Review' : 'All Done!',
      isHighlight: effectiveStatusCount > 0,
      testId: 'status-count'
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
    loading,
    error,
    totalForDisplay,
    newTodayCount,
    effectiveTitle,
    effectiveStatusCount,
    completionPercentage,
    completedCount
  ])



  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5 ${className}`} data-testid="metrics-cards">
      {metrics.map((metric, index) => {
        return (
          <div
            key={index}
            data-testid={metric.testId}
            className={`
              rounded-xl p-3 transition-all duration-300 ease-out h-full min-h-[80px]
              bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px]
              border border-gray-200
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

export { MetricsCards }
