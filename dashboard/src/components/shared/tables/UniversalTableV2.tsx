'use client'

import { memo, useCallback, useEffect, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { TextField } from './fields/TextField'
import { NumberField } from './fields/NumberField'
import { PercentageField } from './fields/PercentageField'
import { BadgeField } from './fields/BadgeField'
import { TagsField } from './fields/TagsField'
import { AvatarField } from './fields/AvatarField'
import { ActionsField } from './fields/ActionsField'
import {
  type TableConfig,
  type ColumnDefinition,
  getColumnValue
} from './types'

interface UniversalTableV2Props<T> {
  data: T[]
  config: TableConfig<T>
  loading?: boolean
  selectedItems?: Set<number | string>
  onSelectionChange?: (ids: Set<number | string>) => void
  getItemId: (item: T) => number | string
  searchQuery?: string
  className?: string
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
}

function UniversalTableV2Component<T>({
  data,
  config,
  loading = false,
  selectedItems = new Set(),
  onSelectionChange,
  getItemId,
  searchQuery = '',
  className,
  onReachEnd,
  hasMore = false,
  loadingMore = false
}: UniversalTableV2Props<T>) {
  const visibleColumns = config.columns.filter(col => !col.hidden)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return
    if (selectedItems.size === data.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(data.map(getItemId)))
    }
  }, [data, selectedItems, onSelectionChange, getItemId])

  const handleSelectItem = useCallback((id: number | string) => {
    if (!onSelectionChange) return
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }, [selectedItems, onSelectionChange])

  // Infinite scroll setup
  useEffect(() => {
    if (!onReachEnd || !hasMore) return

    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onReachEnd()
        }
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.1
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [onReachEnd, hasMore, loadingMore])

  // Render field based on type
  const renderField = (column: ColumnDefinition<T>, item: T) => {
    const value = getColumnValue(item, column.accessor)
    const { field } = column

    switch (field.type) {
      case 'text':
        // Resolve subtitle if it's a function
        const subtitle = typeof field.subtitle === 'function'
          ? field.subtitle(item)
          : field.subtitle

        // Resolve badges if it's a function
        const badges = typeof field.badges === 'function'
          ? field.badges(item)
          : field.badges

        return (
          <TextField
            value={value}
            truncate={field.truncate}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            bold={field.bold}
            color={field.color}
            subtitle={subtitle}
            subtitleColor={field.subtitleColor}
            badges={badges}
            dangerouslySetHTML={field.dangerouslySetHTML}
            className={column.className}
          />
        )

      case 'number':
        return (
          <NumberField
            value={value}
            format={field.format}
            decimals={field.decimals}
            placeholder={field.placeholder}
            color={field.color}
            bold={field.bold}
            className={column.className}
          />
        )

      case 'percentage':
        return (
          <PercentageField
            value={value}
            decimals={field.decimals}
            placeholder={field.placeholder}
            bold={field.bold}
            colorThresholds={field.colorThresholds}
            showSign={field.showSign}
            showPercentSymbol={field.showPercentSymbol}
            className={column.className}
          />
        )

      case 'badge':
        return (
          <BadgeField
            value={value}
            variantMap={field.variantMap}
            classNameMap={field.classNameMap}
            defaultVariant={field.defaultVariant}
            defaultClassName={field.defaultClassName}
            className={column.className}
          />
        )

      case 'tags':
        return (
          <TagsField
            tags={value}
            maxVisible={field.maxVisible}
            showCount={field.showCount}
            extractCategories={field.extractCategories}
            variant={field.variant}
            size={field.size}
            className={column.className}
          />
        )

      case 'avatar':
        // Extract alt text from item (prefer username > full_name > name)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const altText = (item as any).username || (item as any).full_name || (item as any).name || ''

        return (
          <AvatarField
            src={value}
            alt={altText}
            fallback={field.fallback}
            size={field.size}
            showBorder={field.showBorder}
            className={column.className}
          />
        )

      case 'actions':
        return (
          <ActionsField
            actions={field.getActions(item)}
            size={field.size}
            className={column.className}
          />
        )

      case 'custom':
        return field.render(item)

      default:
        return <span>{String(value || '—')}</span>
    }
  }

  // Get alignment class
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'justify-center'
      case 'right':
        return 'justify-end'
      default:
        return ''
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div
        className={cn("flex items-center justify-center h-64", designSystem.borders.radius.lg)}
        style={{
          background: 'rgba(249, 250, 251, 0.85)',
          backdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(203, 213, 225, 0.6)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        <div
          className={`animate-spin ${designSystem.borders.radius.full} h-8 w-8 border-2 border-pink-500/20 border-t-pink-500`}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.3))'
          }}
        ></div>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    const emptyState = config.emptyState || {
      title: searchQuery ? 'No results found' : 'No data',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }

    return (
      <div
        className={cn("flex-1", designSystem.borders.radius.lg)}
        style={{
          background: 'rgba(249, 250, 251, 0.85)',
          backdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(203, 213, 225, 0.6)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        <div className={cn("flex flex-col items-center justify-center py-16", designSystem.typography.color.subtle)}>
          {emptyState.icon}
          <div className="mb-4 text-sm">{emptyState.title}</div>
          {emptyState.description && (
            <span className="text-xs">{emptyState.description}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3 h-full", className)}>
      {/* Header Card */}
      <div
        className={cn("flex-shrink-0", designSystem.borders.radius.lg)}
        style={{
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)',
          backdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(203, 213, 225, 0.6)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
        }}
      >
        <div className={cn("flex items-center px-4 py-3 font-medium text-sm", designSystem.typography.color.secondary)}>
          {config.showCheckbox && onSelectionChange && (
            <div className="w-10 flex-shrink-0 flex justify-center">
              <Checkbox
                checked={selectedItems.size === data.length && data.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </div>
          )}
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className={cn(
                "flex",
                column.width || "flex-1",
                column.align ? getAlignClass(column.align) : "px-3",
                column.headerClassName
              )}
              role="columnheader"
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Body Card */}
      <div
        className={cn("flex-1 flex flex-col overflow-hidden", designSystem.borders.radius.lg)}
        style={{
          background: 'rgba(241, 245, 249, 0.92)',
          backdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(203, 213, 225, 0.6)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Scrollable Body Content */}
        <div ref={wrapperRef} className="flex-1 overflow-auto min-h-[320px]">
          {data.map((item) => {
            const itemId = getItemId(item)
            const isSelected = selectedItems.has(itemId)
            const rowClass = typeof config.rowClassName === 'function'
              ? config.rowClassName(item)
              : config.rowClassName

            return (
              <div
                key={String(itemId)}
                className={cn(
                  "flex items-center px-4 py-3 group/row cursor-pointer",
                  rowClass
                )}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(239, 68, 68, 0.06))'
                    : 'rgba(248, 250, 252, 0.4)',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                  boxShadow: isSelected
                    ? '0 0 0 1px rgba(236, 72, 153, 0.12), 0 4px 12px rgba(236, 72, 153, 0.06)'
                    : 'none'
                }}
                onClick={() => config.onRowClick?.(item)}
              >
                {config.showCheckbox && onSelectionChange && (
                  <div className="w-10 flex-shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectItem(itemId)}
                      aria-label={`Select item ${itemId}`}
                    />
                  </div>
                )}
                {visibleColumns.map((column) => (
                  <div
                    key={column.id}
                    className={cn(
                      "flex",
                      column.width || "flex-1",
                      column.align ? getAlignClass(column.align) : "px-3"
                    )}
                  >
                    {renderField(column, item)}
                  </div>
                ))}
              </div>
            )
          })}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              {loadingMore ? (
                <>
                  <div className={cn("animate-spin h-6 w-6 border-b-2 border-pink-600", designSystem.borders.radius.full)}></div>
                  <span className={cn("ml-2", designSystem.typography.color.subtle)}>Loading more...</span>
                </>
              ) : (
                <div className={designSystem.typography.color.disabled}>Scroll to load more</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const UniversalTableV2 = memo(UniversalTableV2Component) as typeof UniversalTableV2Component
