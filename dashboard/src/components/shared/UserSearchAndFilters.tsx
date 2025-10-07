'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Users, Star, Crown, AlertCircle } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { UniversalToolbar } from '@/components/shared/UniversalToolbar'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

// B9 Agency brand gradients
const B9_GRADIENTS = {
  primary: 'linear-gradient(135deg, var(--pink-500), var(--pink-600))',
  primaryLight: 'linear-gradient(135deg, var(--pink-300), var(--pink-400))',
  neutral: 'linear-gradient(135deg, var(--gray-400), var(--gray-500))'
}

type QualityFilter = 'all' | 'high' | 'our_creators' | 'low'

interface UserCounts {
  total_users: number
  high_quality_users: number
  our_creators: number
  low_quality_users: number
}

interface UserSearchAndFiltersProps {
  currentFilter: QualityFilter
  onFilterChange: (filter: QualityFilter) => void
  userCounts: UserCounts | null
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
}

interface FilterConfig {
  id: QualityFilter
  label: string
  icon: React.ComponentType<{ className?: string }>
  activeBg: string
  activeTextColor: string
  getCount: (counts: UserCounts) => number
}

export const UserSearchAndFilters = React.memo(function UserSearchAndFilters({
  currentFilter,
  onFilterChange,
  userCounts,
  searchQuery,
  onSearchChange,
  loading
}: UserSearchAndFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Filter configurations - using B9 brand colors with pink gradient primary
  const filters: FilterConfig[] = useMemo(() => [
    {
      id: 'all',
      label: 'All Users',
      icon: Users,
      activeBg: B9_GRADIENTS.primaryLight, // Primary B9 pink gradient
      activeTextColor: 'white',
      getCount: (counts) => counts.total_users
    },
    {
      id: 'high',
      label: 'High Quality',
      icon: Star,
      activeBg: 'linear-gradient(135deg, var(--pink-400), var(--pink-300))', // Light pink for high quality
      activeTextColor: 'white',
      getCount: (counts) => counts.high_quality_users
    },
    {
      id: 'our_creators',
      label: 'Our Creators',
      icon: Crown,
      activeBg: B9_GRADIENTS.primary, // Secondary B9 pink
      activeTextColor: 'white',
      getCount: (counts) => counts.our_creators
    },
    {
      id: 'low',
      label: 'Low Quality',
      icon: AlertCircle,
      activeBg: B9_GRADIENTS.neutral, // Neutral gray
      activeTextColor: 'white',
      getCount: (counts) => counts.low_quality_users
    }
  ], [])

  // Preserve focus during re-renders
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [userCounts, loading, isSearchFocused]) // Re-focus when these props change

  // Keyboard shortcuts DISABLED per user request

  const content = (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        {/* Search Bar (60% on larger screens) */}
        {/* ToolbarSearch component not found - using placeholder */}
        <input
          id="user-search"
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="px-4 py-2 border rounded-lg lg:max-w-[60%] w-full"
        />

        {/* Filter Pills (40% on larger screens) */}
        <div className="flex items-center gap-1.5 flex-wrap lg:justify-end" role="group" aria-label="User quality filters">
          {filters.map((filter) => {
            const isActive = currentFilter === filter.id
            const rawCount = userCounts ? filter.getCount(userCounts) : 0
            const formattedCount = formatNumber(rawCount)

            return (
              <button
                key={filter.id}
                id={`user-filter-${filter.id}`}
                onClick={() => onFilterChange(filter.id)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                  isActive ? 'bg-blue-500 text-white' : designSystem.background.surface.light
                }`}
              >
                <filter.icon className="w-4 h-4" />
                <span>{filter.label}</span>
                {!loading && <span className="text-xs">({formattedCount})</span>}
              </button>
            )
          })}
        </div>
    </div>
  )

  return (
    <>
      <UniversalToolbar
        variant="unified"
        testId="user-search-and-filters"
        animate={false}
        customContent={content}
      />
      {/* Active Search Indicator */}
      {searchQuery.trim() && (
        <div className="mt-3 text-center">
          <p className={cn("text-sm", designSystem.typography.color.tertiary)}>
            {loading ? (
              'Searching users...'
            ) : (
              <>
                Showing results for{' '}
                <span className="font-medium text-b9-pink">
                  &quot;{searchQuery}&quot;
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </>
  )
})