'use client'

import React, { ReactNode, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { DashboardTemplate } from './DashboardTemplate'
import { MetricsCards } from '@/components/shared/cards/MetricsCards'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { TableSkeleton, MetricsCardsSkeleton } from '@/components/shared/SkeletonLoaders'
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { LucideIcon } from 'lucide-react'

// Dynamic import for table
const UniversalTable = dynamic(
  () => import('@/components/shared/tables/UniversalTable').then(mod => mod.UniversalTable),
  { ssr: false, loading: () => <TableSkeleton /> }
)

export interface ReviewPageFilter {
  id: string
  label: string
  count: number
}

export interface ReviewPageSortOption {
  id: string
  label: string
  icon?: LucideIcon
}

export interface ReviewPageBulkAction {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ReviewPageStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

interface ReviewPageTemplateProps {
  // Page metadata
  title: string
  subtitle?: string
  platform?: 'instagram' | 'reddit' | 'models'

  // Data
  data: any[]
  stats: ReviewPageStats | null
  isLoading: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onFetchNextPage?: () => void

  // Search
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Filters
  filters: ReviewPageFilter[]
  currentFilter: string
  onFilterChange: (filter: string) => void

  // Sorting
  sortOptions?: ReviewPageSortOption[]
  currentSort?: string
  onSortChange?: (sort: string) => void

  // Selection
  selectedItems: Set<number>
  onSelectionChange: (items: Set<number>) => void

  // Actions
  bulkActions?: ReviewPageBulkAction[]
  onItemUpdate?: (id: number, updates: any) => void
  actionButtons?: ReactNode

  // Customization
  accentColor?: string
  emptyMessage?: string
  tableColumns?: any[]
}

/**
 * ReviewPageTemplate - Template for review/approval workflow pages
 *
 * Features:
 * - Metrics cards at top
 * - Search and filter toolbar
 * - Data table with selection
 * - Bulk actions
 * - Infinite scroll
 *
 * Usage:
 * ```tsx
 * <ReviewPageTemplate
 *   title="Creator Review"
 *   platform="instagram"
 *   data={creators}
 *   stats={stats}
 *   isLoading={isLoading}
 *   searchValue={search}
 *   onSearchChange={handleSearch}
 *   filters={filters}
 *   currentFilter={currentFilter}
 *   onFilterChange={handleFilterChange}
 *   selectedItems={selected}
 *   onSelectionChange={setSelected}
 *   bulkActions={bulkActions}
 * />
 * ```
 */
export const ReviewPageTemplate: React.FC<ReviewPageTemplateProps> = ({
  title,
  subtitle,
  platform = 'instagram',
  data,
  stats,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  currentFilter,
  onFilterChange,
  sortOptions,
  currentSort,
  onSortChange,
  selectedItems,
  onSelectionChange,
  bulkActions,
  onItemUpdate,
  actionButtons,
  accentColor,
  emptyMessage = 'No items found',
  tableColumns
}) => {
  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    onSelectionChange(new Set())
  }, [onSelectionChange])

  // Get accent color based on platform
  const platformAccentColor = accentColor || {
    instagram: 'linear-gradient(135deg, #E1306C, #F77737)',
    reddit: 'linear-gradient(135deg, #FF4500, #FF8717)',
    models: 'linear-gradient(135deg, #9333EA, #EC4899)'
  }[platform]

  return (
    <DashboardTemplate title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {/* Metrics Cards */}
        <ComponentErrorBoundary>
          {!stats ? (
            <MetricsCardsSkeleton />
          ) : (
            <MetricsCards
              platform={platform}
              totalCreators={stats.total}
              pendingCount={stats.pending}
              approvedCount={stats.approved}
              nonRelatedCount={stats.rejected}
              loading={false}
            />
          )}
        </ComponentErrorBoundary>

        {/* Toolbar */}
        <ComponentErrorBoundary>
          <StandardToolbar
            // Search
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}

            // Filters
            filters={filters}
            currentFilter={currentFilter}
            onFilterChange={onFilterChange}

            // Sort
            sortOptions={sortOptions}
            currentSort={currentSort}
            onSortChange={onSortChange}

            // Actions
            actionButtons={actionButtons}

            // Bulk actions
            selectedCount={selectedItems.size}
            bulkActions={bulkActions}
            onClearSelection={handleClearSelection}

            // Styling
            loading={isLoading}
            accentColor={platformAccentColor}
          />
        </ComponentErrorBoundary>

        {/* Data Table */}
        <ComponentErrorBoundary>
          <UniversalTable
            data={data}
            columns={tableColumns}
            loading={isLoading}
            selectedItems={selectedItems}
            setSelectedItems={onSelectionChange}
            onUpdateItem={onItemUpdate}
            hasMore={hasNextPage}
            onReachEnd={onFetchNextPage}
            loadingMore={isFetchingNextPage}
            emptyMessage={emptyMessage}
          />
        </ComponentErrorBoundary>
      </div>
    </DashboardTemplate>
  )
}

export default ReviewPageTemplate