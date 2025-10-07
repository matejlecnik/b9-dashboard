'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Star,
  Crown,
  AlertCircle
} from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
      activeBg: 'linear-gradient(135deg, var(--pink-600), var(--pink-500))' // Secondary B9 pink
    },
    {
      id: 'high',
      label: 'High Quality',
      count: userCounts?.high_quality_users ?? 0,
      icon: Star,
      activeBg: 'linear-gradient(135deg, var(--green-500), var(--green-400))' // Green for high quality
    },
    {
      id: 'our_creators',
      label: 'Our Creators',
      count: userCounts?.our_creators ?? 0,
      icon: Crown,
      activeBg: 'linear-gradient(135deg, var(--pink-400), var(--pink-300))' // Light pink for creators
    },
    {
      id: 'low',
      label: 'Low Quality',
      count: userCounts?.low_quality_users ?? 0,
      icon: AlertCircle,
      activeBg: 'linear-gradient(135deg, var(--gray-400), var(--gray-300))' // Gray for low quality
    }
  ]

  return (
    <div data-testid="user-filters" aria-label="User filters">
      {/* Compact inline filter buttons matching UnifiedFilters style */}
      <div className={cn(designSystem.layout.flex.rowStart, "gap-1.5 flex-wrap")} role="group" aria-label="User quality filters" data-testid="user-quality-filters">
        {filters.map((filter) => {
          const IconComponent = filter.icon
          const isActive = currentFilter === filter.id

          return (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => onFilterChange(filter.id)}
              disabled={loading}
              className={cn(
                "px-2.5 py-1.5 h-8 rounded-lg font-medium text-xs border font-mac-text",
                "focus:outline-none focus:ring-1 focus:ring-b9-pink",
                designSystem.transitions.default,
                isActive ? "text-white border-white/10" : `${designSystem.typography.color.secondary} border-black/8 hover:${designSystem.background.hover.subtle}/90`
              )}
              style={{
                background: isActive ? filter.activeBg : 'var(--white-alpha-80)',
                boxShadow: isActive
                  ? '0 2px 8px var(--black-alpha-08), inset 0 1px 0 var(--white-alpha-10)'
                  : '0 1px 4px var(--black-alpha-02)'
              }}
              aria-pressed={isActive}
              data-testid={`user-filter-btn-${filter.id}`}
              title={`Filter: ${filter.label}`}
            >
              {IconComponent && <IconComponent className="h-3 w-3 mr-1.5" />}
              <span className="text-xs">{filter.label}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1.5 border-0 text-xs font-medium font-mac-text",
                  isActive ? "bg-white/20 text-white" : "bg-black/6 text-black/75"
                )}
                style={{ fontSize: '0.7rem' }}
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