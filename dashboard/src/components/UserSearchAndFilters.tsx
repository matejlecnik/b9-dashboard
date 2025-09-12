'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Users, Star, Crown, AlertCircle } from 'lucide-react'
import { UniversalToolbar } from '@/components/UniversalToolbar'
import { ToolbarSearch, ToolbarFilterButton } from '@/components/ui/ToolbarComponents'
import { B9_GRADIENTS } from '@/lib/toolbarStyles'

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
      activeTextColor: '#ffffff',
      getCount: (counts) => counts.total_users
    },
    {
      id: 'high',
      label: 'High Quality',
      icon: Star,
      activeBg: 'linear-gradient(135deg, #FF99A9, #FFB3C1)', // Light pink for high quality
      activeTextColor: '#ffffff',
      getCount: (counts) => counts.high_quality_users
    },
    {
      id: 'our_creators',
      label: 'Our Creators',
      icon: Crown,
      activeBg: B9_GRADIENTS.primary, // Secondary B9 pink
      activeTextColor: '#ffffff',
      getCount: (counts) => counts.our_creators
    },
    {
      id: 'low',
      label: 'Low Quality',
      icon: AlertCircle,
      activeBg: B9_GRADIENTS.neutral, // Neutral gray
      activeTextColor: '#ffffff',
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
        <ToolbarSearch
          id="user-search"
          placeholder="Search users by username..."
          value={searchQuery}
          onChange={onSearchChange}
          disabled={loading}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          maxWidth="lg:max-w-[60%]"
        />

        {/* Filter Pills (40% on larger screens) */}
        <div className="flex items-center gap-1.5 flex-wrap lg:justify-end" role="group" aria-label="User quality filters">
          {filters.map((filter) => {
            const isActive = currentFilter === filter.id
            const count = userCounts ? filter.getCount(userCounts) : 0
            
            return (
              <ToolbarFilterButton
                key={filter.id}
                id={`user-filter-${filter.id}`}
                label={filter.label}
                icon={filter.icon}
                isActive={isActive}
                count={loading ? undefined : count}
                onClick={() => onFilterChange(filter.id)}
                disabled={loading}
                gradient={
                  filter.id === 'all' ? 'primaryLight' :
                  filter.id === 'high' ? 'success' :
                  filter.id === 'our_creators' ? 'primary' :
                  'neutral'
                }
              />
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
          <p className="text-sm text-gray-600">
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