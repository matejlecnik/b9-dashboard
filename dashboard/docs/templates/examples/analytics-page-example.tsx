/**
 * Example: Instagram Analytics Page Using Templates
 *
 * This example shows how to build a complete analytics page using the template system.
 * It includes metrics, charts, date range selection, and filters.
 */

'use client'

import React, { useState } from 'react'
import { Users, TrendingUp, Heart, MessageSquare } from 'lucide-react'

// Import template
import { AnalyticsPageTemplate } from '@/components/templates'

// Import data hooks
import {
  useInstagramAnalytics,
  useEngagementMetrics,
  useGrowthMetrics
} from '@/hooks/queries/useInstagramAnalytics'

export default function InstagramAnalyticsExample() {
  // 1. Date range state
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  })

  // 2. Filter state
  const [filters, setFilters] = useState({
    metric: 'engagement',
    period: 'daily',
    category: 'all'
  })

  // 3. Fetch analytics data
  const { data: analytics, isLoading, refetch } = useInstagramAnalytics({
    from: dateRange.from,
    to: dateRange.to,
    metric: filters.metric,
    period: filters.period
  })

  // 4. Fetch engagement metrics
  const { data: engagement } = useEngagementMetrics({
    from: dateRange.from,
    to: dateRange.to,
    category: filters.category
  })

  // 5. Fetch growth metrics
  const { data: growth } = useGrowthMetrics({
    from: dateRange.from,
    to: dateRange.to
  })

  // 6. Define key metrics
  const metrics = React.useMemo(() => {
    if (!analytics) return []

    return [
      {
        label: 'Total Followers',
        value: analytics.followers?.toLocaleString() || '0',
        change: analytics.followersChange || 0,
        changeLabel: 'vs last period',
        icon: Users,
        trend: analytics.followersChange > 0 ? 'up' : 'down'
      },
      {
        label: 'Engagement Rate',
        value: `${analytics.engagementRate || 0}%`,
        change: analytics.engagementChange || 0,
        changeLabel: 'vs last period',
        icon: Heart,
        trend: analytics.engagementChange > 0 ? 'up' : 'down'
      },
      {
        label: 'Growth Rate',
        value: `${growth?.rate || 0}%`,
        change: growth?.change || 0,
        changeLabel: 'monthly',
        icon: TrendingUp,
        trend: growth?.change > 0 ? 'up' : 'down'
      },
      {
        label: 'Avg. Comments',
        value: engagement?.avgComments?.toLocaleString() || '0',
        change: engagement?.commentsChange || 0,
        changeLabel: 'per post',
        icon: MessageSquare,
        trend: engagement?.commentsChange > 0 ? 'up' : 'down'
      }
    ]
  }, [analytics, engagement, growth])

  // 7. Define charts
  const charts = React.useMemo(() => {
    if (!analytics) return []

    return [
      {
        id: 'engagement-over-time',
        title: 'Engagement Over Time',
        subtitle: 'Daily engagement rate trends',
        type: 'line',
        data: analytics.engagementTimeSeries || [],
        config: {
          xKey: 'date',
          yKey: 'engagement',
          color: '#E1306C'
        }
      },
      {
        id: 'content-performance',
        title: 'Content Performance',
        subtitle: 'Performance by content type',
        type: 'bar',
        data: analytics.contentPerformance || [],
        config: {
          xKey: 'type',
          yKey: 'engagement',
          color: '#F77737'
        }
      },
      {
        id: 'audience-demographics',
        title: 'Audience Demographics',
        subtitle: 'Age distribution',
        type: 'pie',
        data: analytics.demographics || [],
        config: {
          dataKey: 'value',
          nameKey: 'age_group',
          colors: ['#E1306C', '#F77737', '#FCAF45', '#C13584', '#833AB4']
        }
      },
      {
        id: 'top-posts',
        title: 'Top Performing Posts',
        subtitle: 'By engagement rate',
        type: 'bar',
        data: analytics.topPosts || [],
        config: {
          xKey: 'post_id',
          yKey: 'engagement',
          horizontal: true,
          color: '#833AB4'
        },
        className: 'md:col-span-2'
      },
      {
        id: 'hashtag-performance',
        title: 'Hashtag Performance',
        subtitle: 'Top 10 hashtags',
        type: 'bar',
        data: analytics.hashtagPerformance || [],
        config: {
          xKey: 'hashtag',
          yKey: 'reach',
          color: '#C13584'
        }
      },
      {
        id: 'posting-patterns',
        title: 'Best Posting Times',
        subtitle: 'Engagement by hour',
        type: 'line',
        data: analytics.postingPatterns || [],
        config: {
          xKey: 'hour',
          yKey: 'engagement',
          color: '#405DE6'
        }
      }
    ]
  }, [analytics])

  // 8. Define filters
  const filterOptions = [
    {
      id: 'metric',
      label: 'Metric',
      options: [
        { value: 'engagement', label: 'Engagement' },
        { value: 'reach', label: 'Reach' },
        { value: 'impressions', label: 'Impressions' },
        { value: 'saves', label: 'Saves' }
      ],
      defaultValue: 'engagement'
    },
    {
      id: 'period',
      label: 'Period',
      options: [
        { value: 'hourly', label: 'Hourly' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      defaultValue: 'daily'
    },
    {
      id: 'category',
      label: 'Category',
      options: [
        { value: 'all', label: 'All Content' },
        { value: 'reels', label: 'Reels' },
        { value: 'posts', label: 'Posts' },
        { value: 'stories', label: 'Stories' },
        { value: 'igtv', label: 'IGTV' }
      ],
      defaultValue: 'all'
    }
  ]

  // 9. Date presets
  const datePresets = [
    {
      label: 'Last 7 Days',
      value: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    },
    {
      label: 'Last 30 Days',
      value: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    },
    {
      label: 'Last 90 Days',
      value: {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    },
    {
      label: 'Year to Date',
      value: {
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date()
      }
    }
  ]

  // 10. Handle filter change
  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }))
  }

  // 11. Handle export
  const handleExport = async () => {
    // Export logic here
    console.log('Exporting analytics data...')

    // You could implement CSV/PDF export
    const exportData = {
      dateRange,
      filters,
      metrics,
      charts: charts.map(c => ({ id: c.id, data: c.data }))
    }

    // Download as JSON for example
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-analytics-${Date.now()}.json`
    a.click()
  }

  // 12. Render using AnalyticsPageTemplate
  return (
    <AnalyticsPageTemplate
      // Page metadata
      title="Instagram Analytics"
      subtitle="Track performance and engagement metrics"
      platform="instagram"

      // Data
      metrics={metrics}
      charts={charts}
      isLoading={isLoading}

      // Date range
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      datePresets={datePresets}

      // Filters
      filters={filterOptions}
      filterValues={filters}
      onFilterChange={handleFilterChange}

      // Actions
      onRefresh={() => refetch()}
      onExport={handleExport}
      refreshInterval={60} // Refresh every 60 seconds
      lastUpdated={new Date()}

      // Customization
      metricsLayout="grid"
      chartsPerRow={2}
    />
  )
}

/**
 * Benefits of using the template:
 *
 * 1. Consistent UI: Same layout across all analytics pages
 * 2. Built-in features: Date range picker, filters, export
 * 3. Auto-refresh: Configurable refresh intervals
 * 4. Responsive design: Adaptive chart grid
 * 5. Error handling: Built-in error states
 * 6. Loading states: Skeleton loaders included
 * 7. Platform theming: Automatic color schemes
 *
 * To customize further:
 * - Pass custom chart components via component prop
 * - Override accentColor for custom themes
 * - Adjust chartsPerRow for different layouts
 * - Add custom filter types as needed
 */