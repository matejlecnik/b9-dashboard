'use client'

import { memo } from 'react'
import {
  FileText,
  Trophy,
  Target,
  Tags,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PostMetrics {
  total_posts_count?: number
  avg_score_value?: number
  avg_comments_value?: number
}

interface PostAnalysisMetricsProps {
  metrics: PostMetrics | null
  loading: boolean
  sfwCount: number
  nsfwCount: number
  topCategories: Array<{ category: string; count: number }>
  className?: string
}

export const PostAnalysisMetrics = memo(function PostAnalysisMetrics({
  metrics,
  loading,
  sfwCount,
  nsfwCount,
  topCategories,
  className = ''
}: PostAnalysisMetricsProps) {
  const totalPosts = (metrics?.total_posts_count || 0)
  const avgScore = metrics?.avg_score_value || 0
  const avgComments = metrics?.avg_comments_value || 0

  if (loading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5 mb-1 ${className}`}>
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="rounded-2xl p-4 h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.6s ease-out forwards'
            }}
          >
            <div className="animate-pulse space-y-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="space-y-2">
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
                <div className="w-24 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const metricsCards = [
    {
      icon: FileText,
      label: 'Total Posts',
      value: totalPosts.toLocaleString('en-US'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: Trophy,
      label: 'Avg Score',
      value: avgScore.toFixed(1),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      icon: Target,
      label: 'Avg Comments',
      value: Math.round(avgComments).toLocaleString('en-US'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      icon: Tags,
      label: 'Top Category',
      value: topCategories[0]?.category || 'None',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5 mb-1">
        {metricsCards.map((metric) => {
          const Icon = metric.icon
          return (
            <Card
              key={metric.label}
              className="p-4 h-full min-h-[100px] bg-white/50 backdrop-blur-md shadow-lg"
            >
              <div className="flex flex-col h-full">
                <div className={`w-10 h-10 rounded-xl ${metric.bgColor} ${metric.borderColor} border flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1 leading-tight">
                    {metric.label}
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                    {metric.value}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* SFW/NSFW Breakdown */}
      {(sfwCount > 0 || nsfwCount > 0) && (
        <div className="flex items-center gap-3 justify-center">
          {sfwCount > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
              {sfwCount.toLocaleString()} SFW
            </Badge>
          )}
          {nsfwCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1">
              {nsfwCount.toLocaleString()} NSFW
            </Badge>
          )}
        </div>
      )}

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Top Categories</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {topCategories.slice(0, 5).map((category) => (
              <Badge 
                key={category.category}
                variant="outline" 
                className="bg-pink-50 text-pink-700 border-pink-200"
              >
                {category.category} ({category.count})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
