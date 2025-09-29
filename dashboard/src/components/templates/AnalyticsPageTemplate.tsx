'use client'

import React, { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { DashboardTemplate } from './DashboardTemplate'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Dynamic imports for charts
const LineChart = dynamic(
  () => import('@/components/shared/charts/LineChart').then(mod => mod.LineChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const BarChart = dynamic(
  () => import('@/components/shared/charts/BarChart').then(mod => mod.BarChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const PieChart = dynamic(
  () => import('@/components/shared/charts/PieChart').then(mod => mod.PieChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

// Chart skeleton loader
const ChartSkeleton = () => (
  <div className="h-[300px] flex items-center justify-center">
    <Skeleton className="w-full h-full" />
  </div>
)

export interface AnalyticsMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
}

export interface AnalyticsChart {
  id: string
  title: string
  subtitle?: string
  type: 'line' | 'bar' | 'pie' | 'custom'
  data: any
  config?: any
  component?: ReactNode
  className?: string
}

export interface AnalyticsFilter {
  id: string
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue?: string
}

interface AnalyticsPageTemplateProps {
  // Page metadata
  title: string
  subtitle?: string
  platform?: 'instagram' | 'reddit' | 'models'

  // Data
  metrics: AnalyticsMetric[]
  charts: AnalyticsChart[]
  isLoading?: boolean
  error?: Error | null

  // Date range
  dateRange?: { from: Date; to: Date }
  onDateRangeChange?: (range: { from: Date; to: Date }) => void
  datePresets?: Array<{ label: string; value: { from: Date; to: Date } }>

  // Filters
  filters?: AnalyticsFilter[]
  filterValues?: Record<string, string>
  onFilterChange?: (filterId: string, value: string) => void

  // Actions
  onRefresh?: () => void
  onExport?: () => void
  refreshInterval?: number
  lastUpdated?: Date

  // Customization
  accentColor?: string
  metricsLayout?: 'grid' | 'row'
  chartsPerRow?: 1 | 2 | 3
}

/**
 * AnalyticsPageTemplate - Template for analytics and reporting pages
 *
 * Features:
 * - Key metrics display with trends
 * - Multiple chart types (line, bar, pie)
 * - Date range selection
 * - Filter controls
 * - Export and refresh actions
 * - Auto-refresh capability
 *
 * Usage:
 * ```tsx
 * <AnalyticsPageTemplate
 *   title="Performance Analytics"
 *   platform="instagram"
 *   metrics={metrics}
 *   charts={charts}
 *   dateRange={dateRange}
 *   onDateRangeChange={handleDateChange}
 *   filters={filters}
 *   onFilterChange={handleFilterChange}
 *   onExport={handleExport}
 * />
 * ```
 */
export const AnalyticsPageTemplate: React.FC<AnalyticsPageTemplateProps> = ({
  title,
  subtitle,
  platform = 'instagram',
  metrics,
  charts,
  isLoading = false,
  error = null,
  dateRange,
  onDateRangeChange,
  datePresets,
  filters = [],
  filterValues = {},
  onFilterChange,
  onRefresh,
  onExport,
  refreshInterval,
  lastUpdated,
  accentColor,
  metricsLayout = 'grid',
  chartsPerRow = 2
}) => {
  // Auto-refresh effect
  React.useEffect(() => {
    if (refreshInterval && onRefresh) {
      const interval = setInterval(onRefresh, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, onRefresh])

  // Get platform accent color
  const platformAccentColor = accentColor || {
    instagram: 'linear-gradient(135deg, #E1306C, #F77737)',
    reddit: 'linear-gradient(135deg, #FF4500, #FF8717)',
    models: 'linear-gradient(135deg, #9333EA, #EC4899)'
  }[platform]

  // Render metric card
  const renderMetric = (metric: AnalyticsMetric, index: number) => (
    <Card key={index} className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="text-2xl font-bold mt-1">{metric.value}</p>
          {metric.change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {metric.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : null}
              <span className={`text-sm ${
                metric.trend === 'up' ? 'text-green-500' :
                metric.trend === 'down' ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
                {metric.changeLabel && ` ${metric.changeLabel}`}
              </span>
            </div>
          )}
        </div>
        {metric.icon && (
          <metric.icon className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </Card>
  )

  // Render chart
  const renderChart = (chart: AnalyticsChart) => {
    if (chart.component) return chart.component

    switch (chart.type) {
      case 'line':
        return <LineChart data={chart.data} config={chart.config} />
      case 'bar':
        return <BarChart data={chart.data} config={chart.config} />
      case 'pie':
        return <PieChart data={chart.data} config={chart.config} />
      default:
        return <div>Unsupported chart type</div>
    }
  }

  // Chart grid class
  const chartGridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }[chartsPerRow]

  return (
    <DashboardTemplate title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {/* Controls Bar */}
        <ComponentErrorBoundary>
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Date Range & Filters */}
              <div className="flex flex-wrap gap-3 flex-1">
                {onDateRangeChange && (
                  <DateRangePicker
                    value={dateRange}
                    onChange={onDateRangeChange}
                    presets={datePresets}
                  />
                )}

                {filters.map(filter => (
                  <Select
                    key={filter.id}
                    value={filterValues[filter.id] || filter.defaultValue}
                    onValueChange={(value) => onFilterChange?.(filter.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                )}
                {onExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                )}
              </div>
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </Card>
        </ComponentErrorBoundary>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <p className="text-red-600">Error loading analytics: {error.message}</p>
          </Card>
        )}

        {/* Key Metrics */}
        {!error && (
          <ComponentErrorBoundary>
            <div className={`grid gap-4 ${
              metricsLayout === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1'
            }`}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </Card>
                ))
              ) : (
                metrics.map((metric, index) => renderMetric(metric, index))
              )}
            </div>
          </ComponentErrorBoundary>
        )}

        {/* Charts Grid */}
        {!error && (
          <ComponentErrorBoundary>
            <div className={`grid gap-6 ${chartGridClass}`}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <ChartSkeleton />
                  </Card>
                ))
              ) : (
                charts.map(chart => (
                  <Card key={chart.id} className={`p-6 ${chart.className || ''}`}>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{chart.title}</h3>
                      {chart.subtitle && (
                        <p className="text-sm text-muted-foreground">{chart.subtitle}</p>
                      )}
                    </div>
                    <div className="min-h-[300px]">
                      {renderChart(chart)}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ComponentErrorBoundary>
        )}
      </div>
    </DashboardTemplate>
  )
}

export default AnalyticsPageTemplate