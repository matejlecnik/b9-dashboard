'use client'

import React from 'react'
import {
  TrendingUp,
  Clock,
  Hash,
  MessageCircle
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { PostMetrics } from '@/types/post'

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
          <div key={i} className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-1.5" />
                <div className="h-5 bg-gray-200 rounded w-24" />
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
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-gray-600">Total Posts</h3>
          <Hash className="w-3 h-3 text-pink-500" />
        </div>
        <p className="text-lg font-bold text-gray-900">
          {formatNumber(metrics.total_posts_count)}
        </p>
        <p className="text-[10px] text-gray-500">Approved only</p>
      </div>

      {/* Best Performing Subreddit Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-gray-600">Best Subreddit</h3>
          <TrendingUp className="w-3 h-3 text-purple-500" />
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">
          r/{metrics.best_avg_upvotes_subreddit}
        </p>
        <p className="text-[10px] text-gray-500">
          {formatNumber(metrics.best_avg_upvotes_value)} upvotes
        </p>
      </div>

      {/* Best Engagement Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-gray-600">Most Comments</h3>
          <MessageCircle className="w-3 h-3 text-blue-500" />
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">
          r/{metrics.best_engagement_subreddit}
        </p>
        <p className="text-[10px] text-gray-500">
          {formatNumber(metrics.best_engagement_value)} comments
        </p>
      </div>

      {/* Best Posting Time Card */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-gray-600">Best Time</h3>
          <Clock className="w-3 h-3 text-indigo-500" />
        </div>
        <p className="text-lg font-bold text-gray-900">
          {formatHour(metrics.best_performing_hour)}
        </p>
        <p className="text-[10px] text-gray-500">Peak engagement</p>
      </div>
    </div>
  )
}