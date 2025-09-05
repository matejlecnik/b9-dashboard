'use client'

import React, { memo } from 'react'
import { 
  Database, 
  Tags, 
  BarChart3,
  Calendar
} from 'lucide-react'

interface MetricsCardsProps {
  totalSubreddits: number
  uncategorizedCount: number
  newTodayCount: number
  loading: boolean
}

const MetricsCards = memo(function MetricsCards({ 
  totalSubreddits, 
  uncategorizedCount, 
  newTodayCount,
  loading 
}: MetricsCardsProps) {
  const categorizedCount = totalSubreddits - uncategorizedCount
  const completionPercentage = totalSubreddits > 0 ? Math.round((categorizedCount / totalSubreddits) * 100) : 0

  const metrics = [
    {
      title: 'Total Subreddits',
      value: loading ? '...' : totalSubreddits.toLocaleString(),
      subtitle: 'In Database',
      icon: Database,
      iconColor: 'text-gray-700'
    },
    {
      title: 'Added Today',
      value: loading ? '...' : newTodayCount.toLocaleString(),
      subtitle: newTodayCount > 0 ? 'New Discoveries' : 'No New Ones',
      icon: Calendar,
      iconColor: newTodayCount > 0 ? 'text-blue-600' : 'text-gray-500',
      hasActivity: newTodayCount > 0
    },
    {
      title: 'Uncategorized',
      value: loading ? '...' : uncategorizedCount.toLocaleString(),
      subtitle: uncategorizedCount > 0 ? 'Need Review' : 'All Done!',
      icon: Tags,
      iconColor: uncategorizedCount > 0 ? 'text-b9-pink' : 'text-green-600',
      isHighlight: uncategorizedCount > 0
    },
    {
      title: `${completionPercentage}%`,
      value: loading ? '...' : `${categorizedCount}/${totalSubreddits}`,
      subtitle: 'Complete',
      icon: BarChart3,
      iconColor: 'text-gray-700',
      showProgress: true,
      percentage: completionPercentage
    }
  ]



  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5" data-testid="metrics-cards">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon
        return (
          <div 
            key={index} 
            className={`rounded-lg p-3 transition-all duration-200 hover:shadow-md border-0 ${
              metric.isHighlight ? 'shadow-md' : 'shadow-sm'
            }`}
            style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: metric.isHighlight
                ? `0 7px 20px rgba(0, 0, 0, 0.12), 0 2px 7px rgba(0, 0, 0, 0.08)`
                : `0 3px 12px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.06)`,
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className={`p-2 rounded-lg ${metric.iconColor}`}
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <IconComponent className="h-3.5 w-3.5" />
              </div>
              {metric.isHighlight && (
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    background: 'linear-gradient(135deg, #FF8395, #FF7A85)',
                    boxShadow: '0 1px 4px rgba(255, 131, 149, 0.35)',
                  }}
                ></div>
              )}
              {metric.hasActivity && (
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
                  }}
                ></div>
              )}
            </div>
            
            <div className="space-y-2">
              <div 
                className="text-lg font-bold text-gray-900"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
              >
                {metric.value}
              </div>
              <div 
                className="text-[11px] font-semibold text-gray-800"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                }}
              >
                {metric.title}
              </div>
              <div 
                className="text-[10px] text-gray-600"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                }}
              >
                {metric.subtitle}
              </div>
            </div>
            
            {/* Progress bar for completion */}
            {metric.showProgress && !loading && (
              <div className="mt-2.5">
                <div 
                  className="w-full rounded-full h-1.5"
                  style={{
                    background: 'rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${metric.percentage}%`,
                      background: 'linear-gradient(135deg, #FF8395, #FF7A85)',
                      boxShadow: '0 1px 3px rgba(255, 131, 149, 0.3)',
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
