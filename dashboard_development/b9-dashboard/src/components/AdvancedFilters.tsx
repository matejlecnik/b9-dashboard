'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  BarChart3
} from 'lucide-react'

export interface FilterState {
  subscriberRange: [number, number]
  engagementRange: [number, number]
  avgUpvotesRange: [number, number]
  contentType: 'all' | 'nsfw' | 'sfw'
  dateRange: 'all' | 'today' | 'week' | 'month'
  minSubscribers: number | null
  maxSubscribers: number | null
  minEngagement: number | null
  maxEngagement: number | null
}

interface AdvancedFiltersProps {
  isOpen: boolean
  onToggle: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClearFilters: () => void
  totalResults: number
  filteredResults: number
}

export function AdvancedFilters({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
  filteredResults
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)
  
  const hasActiveFilters = 
    filters.contentType !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.minSubscribers !== null ||
    filters.maxSubscribers !== null ||
    filters.minEngagement !== null ||
    filters.maxEngagement !== null

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
  }

  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      subscriberRange: [0, 1000000],
      engagementRange: [0, 100],
      avgUpvotesRange: [0, 10000],
      contentType: 'all',
      dateRange: 'all',
      minSubscribers: null,
      maxSubscribers: null,
      minEngagement: null,
      maxEngagement: null
    }
    setLocalFilters(defaultFilters)
    onFiltersChange(defaultFilters)
    onClearFilters()
  }

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="bg-b9-pink text-white ml-2">
              {Object.values(filters).filter(v => v !== 'all' && v !== null).length}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-b9-pink">{filteredResults}</span> of{' '}
          <span className="font-semibold">{totalResults}</span> subreddits
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="ml-3 h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {isOpen && (
        <Card className="border-2 border-b9-pink/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-black">Filter Options</CardTitle>
            <CardDescription>
              Refine your results with advanced filtering options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Subscriber Count Filter */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Subscriber Count
                  </label>
                </div>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min subscribers"
                    value={localFilters.minSubscribers || ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      minSubscribers: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                  />
                  <input
                    type="number"
                    placeholder="Max subscribers"
                    value={localFilters.maxSubscribers || ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      maxSubscribers: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                  />
                </div>
              </div>

              {/* Engagement Filter */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Engagement Ratio (%)
                  </label>
                </div>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min engagement %"
                    step="0.01"
                    value={localFilters.minEngagement || ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      minEngagement: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                  />
                  <input
                    type="number"
                    placeholder="Max engagement %"
                    step="0.01"
                    value={localFilters.maxEngagement || ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      maxEngagement: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                  />
                </div>
              </div>

              {/* Content Type Filter */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Content Type
                  </label>
                </div>
                <select
                  value={localFilters.contentType}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    contentType: e.target.value as 'all' | 'nsfw' | 'sfw'
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                >
                  <option value="all">All Content</option>
                  <option value="sfw">SFW Only</option>
                  <option value="nsfw">NSFW Only</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Date Added
                  </label>
                </div>
                <select
                  value={localFilters.dateRange}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    dateRange: e.target.value as 'all' | 'today' | 'week' | 'month'
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Filter by multiple criteria to find exactly what you need
                </span>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="hover:bg-gray-50"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  className="bg-b9-pink hover:bg-b9-pink/90 text-white"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
