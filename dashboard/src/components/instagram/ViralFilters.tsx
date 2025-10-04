'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TrendingUp, SortAsc, Calendar } from 'lucide-react'
import type { ViralReelsFilters } from '@/lib/supabase/viral-reels'

interface ViralFiltersProps {
  filters: ViralReelsFilters
  onFiltersChange: (filters: ViralReelsFilters) => void
  onReset?: () => void
}

const viewThresholds = [
  { value: '50000', label: '50K+ views (Viral)' },
  { value: '100000', label: '100K+ views' },
  { value: '500000', label: '500K+ views' },
  { value: '1000000', label: '1M+ views (Mega Viral)' },
  { value: '10000000', label: '10M+ views' },
  { value: '50000000', label: '50M+ views (Ultra Viral)' },
]

const sortOptions = [
  { value: 'views', label: 'Most Views' },
  { value: 'likes', label: 'Most Likes' },
  { value: 'engagement', label: 'Highest Engagement' },
  { value: 'recent', label: 'Most Recent' },
]

const dateRanges = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 3 Months' },
  { value: '180', label: 'Last 6 Months' },
]

export function ViralFilters({
  filters,
  onFiltersChange,
  onReset
}: ViralFiltersProps) {
  const handleViewThresholdChange = (value: string) => {
    onFiltersChange({
      ...filters,
      minViews: parseInt(value)
    })
  }

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as ViralReelsFilters['sortBy']
    })
  }

  const handleDateRangeChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({
        ...filters,
        dateFrom: undefined,
        dateTo: undefined
      })
    } else {
      const days = parseInt(value)
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - days)

      onFiltersChange({
        ...filters,
        dateFrom: dateFrom.toISOString(),
        dateTo: new Date().toISOString()
      })
    }
  }

  return (
    <div className="rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* View Threshold */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            View Threshold
          </Label>
          <Select
            value={filters.minViews?.toString() || '50000'}
            onValueChange={handleViewThresholdChange}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select threshold" />
            </SelectTrigger>
            <SelectContent>
              {viewThresholds.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <SortAsc className="h-3 w-3" />
            Sort By
          </Label>
          <Select
            value={filters.sortBy || 'views'}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Time Period
          </Label>
          <Select
            defaultValue="all"
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="pt-2 border-t grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <p className="text-gray-500">Threshold</p>
          <p className="font-semibold text-purple-600">
            {filters.minViews ? `${(filters.minViews / 1000).toFixed(0)}K+` : '50K+'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Sorting</p>
          <p className="font-semibold text-purple-600 capitalize">
            {filters.sortBy || 'Views'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Order</p>
          <p className="font-semibold text-purple-600">
            {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </p>
        </div>
      </div>
    </div>
  )
}