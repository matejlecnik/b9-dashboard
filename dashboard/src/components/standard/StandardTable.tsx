'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import Image from 'next/image'

// ============================================================================
// TYPES
// ============================================================================

export type TableVariant = 'review' | 'posting' | 'simple'

export interface TableColumn<T> {
  key: string
  header: string
  width?: string
  sortable?: boolean
  render?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface StandardTableProps<T> {
  variant?: TableVariant
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean

  // Selection (only for review variant)
  selectable?: boolean
  selectedItems?: Set<string | number>
  onSelectionChange?: (selected: Set<string | number>) => void
  getItemId?: (item: T) => string | number

  // Sorting
  sortable?: boolean
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'

  // Row actions
  onRowClick?: (item: T, index: number) => void
  rowClassName?: (item: T, index: number) => string

  // Empty state
  emptyMessage?: string

  // Styling
  className?: string
  compact?: boolean
  striped?: boolean
  hoverable?: boolean
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

const TableSkeleton: React.FC<{
  columns: number
  rows?: number
  hasCheckbox?: boolean
}> = ({ columns, rows = 5, hasCheckbox }) => {
  return (
    <div className="w-full animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-4">
          {hasCheckbox && <div className="w-5 h-5 bg-gray-300 rounded" />}
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded" style={{ width: `${100 / columns}%` }} />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3">
            <div className="flex items-center gap-4">
              {hasCheckbox && <div className="w-5 h-5 bg-gray-200 rounded" />}
              {Array.from({ length: columns }).map((_, colIdx) => (
                <div
                  key={colIdx}
                  className="h-4 bg-gray-200 rounded"
                  style={{
                    width: `${(100 / columns) * (0.7 + Math.random() * 0.3)}%`,
                    animationDelay: `${(rowIdx + colIdx) * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StandardTable<T extends Record<string, unknown>>({
  variant = 'simple',
  data,
  columns,
  loading = false,

  selectable = false,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId = (item) => item.id as string | number,

  sortable = false,
  onSort,
  sortKey,
  sortDirection,

  onRowClick,
  rowClassName,

  emptyMessage = 'No data available',

  className,
  compact = false,
  striped = true,
  hoverable = true,
}: StandardTableProps<T>) {

  const [localSortKey, setLocalSortKey] = useState(sortKey)
  const [localSortDirection, setLocalSortDirection] = useState(sortDirection)

  // Enable selection for review variant
  const showCheckboxes = variant === 'review' && selectable

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return

    const allIds = new Set(data.map(item => getItemId(item)))
    const allSelected = data.every(item => selectedItems.has(getItemId(item)))

    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(allIds)
    }
  }, [data, selectedItems, onSelectionChange, getItemId])

  // Handle individual selection
  const handleSelectItem = useCallback((item: T) => {
    if (!onSelectionChange) return

    const id = getItemId(item)
    const newSelected = new Set(selectedItems)

    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }

    onSelectionChange(newSelected)
  }, [selectedItems, onSelectionChange, getItemId])

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    if (!sortable || !onSort) return

    const newDirection =
      localSortKey === key && localSortDirection === 'asc' ? 'desc' : 'asc'

    setLocalSortKey(key)
    setLocalSortDirection(newDirection)
    onSort(key, newDirection)
  }, [sortable, onSort, localSortKey, localSortDirection])

  // Check if all items are selected
  const allSelected = useMemo(() => {
    if (data.length === 0) return false
    return data.every(item => selectedItems.has(getItemId(item)))
  }, [data, selectedItems, getItemId])

  const someSelected = useMemo(() => {
    return data.some(item => selectedItems.has(getItemId(item)))
  }, [data, selectedItems, getItemId])

  // Variant-specific styles
  const variantStyles = {
    review: 'border-gray-200',
    posting: 'border-gray-200',
    simple: 'border-gray-200'
  }

  if (loading) {
    return (
      <div className={cn(
        designSystem.card.default,
        designSystem.radius.lg,
        'overflow-hidden',
        className
      )}>
        <TableSkeleton
          columns={columns.length}
          rows={5}
          hasCheckbox={showCheckboxes}
        />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn(
        designSystem.card.default,
        designSystem.radius.lg,
        'p-12 text-center',
        className
      )}>
        <p className={cn(designSystem.text.body, 'text-gray-500')}>
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      designSystem.card.default,
      designSystem.radius.lg,
      'overflow-hidden',
      variantStyles[variant],
      className
    )}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-3 w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-b9-pink data-[state=checked]:border-b9-pink"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.width,
                    column.headerClassName
                  )}
                >
                  {sortable && column.sortable !== false ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      {column.header}
                      {localSortKey === column.key ? (
                        localSortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              const isSelected = selectedItems.has(getItemId(item))

              return (
                <tr
                  key={getItemId(item)}
                  onClick={() => onRowClick?.(item, index)}
                  className={cn(
                    compact ? 'py-2' : 'py-3',
                    striped && index % 2 === 1 && 'bg-gray-50/50',
                    hoverable && 'hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-b9-pink/5',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(item, index)
                  )}
                >
                  {showCheckboxes && (
                    <td className="px-4 w-12" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(item)}
                        className="data-[state=checked]:bg-b9-pink data-[state=checked]:border-b9-pink"
                      />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 text-sm',
                        compact ? 'py-2' : 'py-3',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(item, index)
                        : (item[column.key] as React.ReactNode)
                      }
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

// Helper for creating subreddit review table columns
export const createReviewColumns = (): TableColumn<Record<string, unknown>>[] => [
  {
    key: 'icon',
    header: '',
    width: 'w-12',
    render: (item) => (
      <div className="relative w-8 h-8">
        {item.icon_img ? (
          <Image
            src={item.icon_img as string}
            alt=""
            fill
            className="rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
        )}
      </div>
    )
  },
  {
    key: 'display_name',
    header: 'Subreddit',
    sortable: true,
    render: (item) => (
      <div>
        <a
          href={`https://reddit.com/r/${item.display_name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-900 hover:text-b9-pink transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          r/{item.display_name}
        </a>
        {item.title && (
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
            {item.title}
          </p>
        )}
      </div>
    )
  },
  {
    key: 'subscribers',
    header: 'Members',
    sortable: true,
    className: 'text-right',
    headerClassName: 'text-right',
    render: (item) => (
      <span className="font-medium">
        {item.subscribers?.toLocaleString() || '0'}
      </span>
    )
  },
  {
    key: 'score',
    header: 'Score',
    sortable: true,
    className: 'text-right',
    headerClassName: 'text-right',
    render: (item) => (
      <span className={cn(
        'font-semibold',
        item.score >= 80 ? 'text-green-600' :
        item.score >= 50 ? 'text-yellow-600' :
        'text-red-600'
      )}>
        {item.score || 0}
      </span>
    )
  }
]

// Helper for creating posting table columns
export const createPostingColumns = (): TableColumn<Record<string, unknown>>[] => [
  {
    key: 'subreddit',
    header: 'Subreddit',
    sortable: true,
    render: (item) => (
      <div className="font-medium text-gray-900">
        r/{item.subreddit}
      </div>
    )
  },
  {
    key: 'post_count',
    header: 'Posts',
    sortable: true,
    className: 'text-center',
    headerClassName: 'text-center',
    render: (item) => (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
        {item.post_count || 0}
      </span>
    )
  },
  {
    key: 'last_posted',
    header: 'Last Posted',
    sortable: true,
    render: (item) => (
      <span className="text-sm text-gray-600">
        {item.last_posted ? new Date(item.last_posted).toLocaleDateString() : 'Never'}
      </span>
    )
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => {
      const status = item.status || 'active'
      const statusColors = {
        active: 'bg-green-100 text-green-800',
        paused: 'bg-yellow-100 text-yellow-800',
        banned: 'bg-red-100 text-red-800'
      }

      return (
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          statusColors[status as keyof typeof statusColors]
        )}>
          {status}
        </span>
      )
    }
  }
]