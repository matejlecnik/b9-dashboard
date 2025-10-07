'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Tag, UserPlus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { StandardToolbar, UniversalCreatorTable, StandardActionButton } from '@/components/shared'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { InstagramCard } from '@/components/instagram'
import { AddCreatorModal } from '@/components/instagram/AddCreatorModal'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

// Import React Query hooks
import {
  useNichingStats,
  useNichingCreators,
  useBulkUpdateCreatorNiche,
  type NichingFilters
} from '@/hooks/queries/useInstagramReview'

import type { Creator } from '@/components/shared'

type FilterType = 'unniched' | 'niched' | 'all'

export default function NichingPage() {
  // Simplified state - only 4 useState hooks
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('unniched')
  const [selectedCreators, setSelectedCreators] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch stats using React Query hook
  const { data: stats } = useNichingStats()

  // Convert filter to niches array for the hook
  const getNichesFilter = useCallback((): string[] | null => {
    if (currentFilter === 'unniched') return null // null = show only unniched
    if (currentFilter === 'all') return [] // empty array = show all
    // currentFilter === 'niched'
    return stats?.availableNiches || [] // show all niched
  }, [currentFilter, stats?.availableNiches])

  // Fetch creators using React Query hook with infinite scroll
  const filters: NichingFilters = useMemo(() => ({
    search: debouncedSearchQuery,
    niches: getNichesFilter(),
    orderBy: 'followers',
    order: 'desc'
  }), [debouncedSearchQuery, getNichesFilter])

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useNichingCreators(filters)

  // Flatten paginated data
  const creators = useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Mutations
  const bulkUpdateMutation = useBulkUpdateCreatorNiche()

  // Bulk update handler
  const bulkUpdateNiche = useCallback(async (niche: string | null) => {
    if (selectedCreators.size === 0) return

    await bulkUpdateMutation.mutateAsync({
      creatorIds: Array.from(selectedCreators),
      niche
    })
    setSelectedCreators(new Set())
  }, [selectedCreators, bulkUpdateMutation])

  // Calculate stats for display
  const displayStats = {
    all: stats?.total || 0,
    unniched: stats?.unniched || 0,
    niched: stats?.niched || 0
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Progress Card with Add Creator Button */}
        <ComponentErrorBoundary>
          <div className="flex gap-3">
            {/* Progress Bar Card */}
            <InstagramCard className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className={cn("text-sm font-semibold", designSystem.typography.color.primary)}>Niching Progress</h3>
                <div className="text-right">
                  <span className={cn("text-lg font-bold", designSystem.typography.color.primary)}>
                    {Math.round(((displayStats.niched) / Math.max(1, displayStats.all)) * 100)}%
                  </span>
                  <p className={cn("text-xs mt-0.5", designSystem.typography.color.subtle)}>
                    {formatNumber(displayStats.niched)} / {formatNumber(displayStats.all)}
                  </p>
                </div>
              </div>
              <Progress
                value={displayStats.all > 0
                  ? (displayStats.niched / displayStats.all) * 100
                  : 0
                }
                className="h-3"
              />
            </InstagramCard>

            {/* Add Creator Button */}
            <StandardActionButton
              onClick={() => setShowAddModal(true)}
              label="Add Creator"
              icon={UserPlus}
              variant="primary"
            />
          </div>
        </ComponentErrorBoundary>

        {/* StandardToolbar */}
        <ComponentErrorBoundary>
          <StandardToolbar
            // Search
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}

            // Filters
            filters={[
              {
                id: 'all',
                label: 'All',
                count: displayStats.all
              },
              {
                id: 'unniched',
                label: 'Unniched',
                count: displayStats.unniched
              },
              {
                id: 'niched',
                label: 'Niched',
                count: displayStats.niched
              }
            ]}
            currentFilter={currentFilter}
            onFilterChange={(filterId: string) => {
              setCurrentFilter(filterId as FilterType)
              setSelectedCreators(new Set()) // Clear selection on filter change
            }}

            // Bulk actions (when items selected)
            selectedCount={selectedCreators.size}
            bulkActions={selectedCreators.size > 0 ? [
              {
                id: 'set-niche',
                label: 'Set Niche',
                icon: Tag,
                onClick: () => {
                  const niche = prompt('Enter niche for selected creators:')
                  if (niche !== null) {
                    bulkUpdateNiche(niche.trim() || null)
                  }
                },
                variant: 'secondary' as const
              }
            ] : []}
            onClearSelection={() => setSelectedCreators(new Set())}

            loading={isLoading}
            accentColor="linear-gradient(135deg, #E1306C, #F77737)"
          />
        </ComponentErrorBoundary>

        {/* Extended Instagram Table */}
        <ComponentErrorBoundary>
          <InstagramCard className="relative overflow-hidden" padding="none">
            <UniversalCreatorTable
              creators={creators as unknown as Creator[]}
              loading={isLoading}
              selectedCreators={selectedCreators}
              setSelectedCreators={setSelectedCreators}
              searchQuery={debouncedSearchQuery}
              onReachEnd={fetchNextPage}
              hasMore={hasNextPage || false}
              loadingMore={isFetchingNextPage}
              onUpdateReview={() => {
                // Review status updates are handled via useUpdateCreatorStatus hook
                // in the table component itself
              }}
            />
          </InstagramCard>
        </ComponentErrorBoundary>
      </div>

      {/* Add Creator Modal */}
      <AddCreatorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreatorAdded={() => {
          // Refresh the creators list after adding
          // The query will auto-refetch due to cache invalidation
        }}
      />
    </DashboardLayout>
  )
}
