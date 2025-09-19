'use client'

import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Star,
  Crown,
  AlertCircle
} from 'lucide-react'

type QualityFilter = 'all' | 'high' | 'our_creators' | 'low'

interface UserCounts {
  total_users: number
  high_quality_users: number
  our_creators: number
  low_quality_users: number
}

interface UserFiltersProps {
  currentFilter: QualityFilter
  onFilterChange: (filter: QualityFilter) => void
  userCounts: UserCounts | null
  loading: boolean
}

interface FilterDef {
  id: QualityFilter
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  activeBg: string
}

const UserFilters = memo(function UserFilters({
  currentFilter,
  onFilterChange,
  userCounts,
  loading
}: UserFiltersProps) {

  const filters: FilterDef[] = [
    {
      id: 'all',
      label: 'All Users',
      count: userCounts?.total_users ?? 0,
      icon: Users,
      activeBg: 'linear-gradient(135deg, #FF6B80, #FF8395)' // Secondary B9 pink
    },
    {
      id: 'high',
      label: 'High Quality',
      count: userCounts?.high_quality_users ?? 0,
      icon: Star,
      activeBg: 'linear-gradient(135deg, #4CAF50, #66BB6A)' // Green for high quality
    },
    {
      id: 'our_creators',
      label: 'Our Creators',
      count: userCounts?.our_creators ?? 0,
      icon: Crown,
      activeBg: 'linear-gradient(135deg, #FF99A9, #FFB3C1)' // Light pink for creators
    },
    {
      id: 'low',
      label: 'Low Quality',
      count: userCounts?.low_quality_users ?? 0,
      icon: AlertCircle,
      activeBg: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)' // Gray for low quality
    }
  ]

  return (
    <div data-testid="user-filters" aria-label="User filters">
      {/* Compact inline filter buttons matching UnifiedFilters style */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="User quality filters" data-testid="user-quality-filters">
        {filters.map((filter) => {
          const IconComponent = filter.icon
          const isActive = currentFilter === filter.id

          return (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => onFilterChange(filter.id)}
              disabled={loading}
              className="px-2.5 py-1.5 h-8 rounded-md font-medium transition-all duration-200 border-0 focus:outline-none focus:ring-1 focus:ring-b9-pink text-xs"
              style={{
                background: isActive
                  ? filter.activeBg
                  : 'rgba(255, 255, 255, 0.8)',
                color: isActive ? '#ffffff' : '#374151',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: isActive
                  ? '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 1px 4px rgba(0, 0, 0, 0.02)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              }}
              aria-pressed={isActive}
              data-testid={`user-filter-btn-${filter.id}`}
              title={`Filter: ${filter.label}`}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(249, 250, 251, 0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                }
              }}
            >
              {IconComponent && <IconComponent className="h-3 w-3 mr-1.5" />}
              <span className="text-xs">{filter.label}</span>
              <Badge
                variant="secondary"
                className="ml-1.5 border-0 text-xs font-medium"
                style={{
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.06)',
                  color: isActive ? 'white' : 'rgba(0, 0, 0, 0.75)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                  fontSize: '0.7rem',
                }}
              >
                {loading ? '...' : filter.count.toLocaleString('en-US')}
              </Badge>
            </Button>
          )
        })}
      </div>
    </div>
  )
})

export { UserFilters }