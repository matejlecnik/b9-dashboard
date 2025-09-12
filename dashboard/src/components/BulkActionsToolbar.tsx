'use client'

import React, { memo } from 'react'
import { UniversalToolbar, createBulkActionsToolbar } from './UniversalToolbar'

interface BulkActionsToolbarProps {
  selectedCount: number
  onBulkOk: () => void
  onBulkNoSeller: () => void
  onBulkNonRelated: () => void
  onClearSelection: () => void
  onUndoLastAction?: () => void
  disabled?: boolean
  className?: string
  // New search props
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
}

export const BulkActionsToolbar = memo(function BulkActionsToolbar({
  selectedCount,
  onBulkOk,
  onBulkNoSeller,
  onBulkNonRelated,
  onClearSelection,
  onUndoLastAction,
  disabled = false,
  className = '',
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search subreddits...'
}: BulkActionsToolbarProps) {
  // Use the new UniversalToolbar with preset configuration
  const toolbarProps = createBulkActionsToolbar({
    selectedCount,
    onBulkOk,
    onBulkNoSeller,
    onBulkNonRelated,
    onClearSelection,
    onUndoLastAction,
    disabled,
    className
  })

  // Add search configuration if search handlers are provided
  const enhancedProps = onSearchChange ? {
    ...toolbarProps,
    search: {
      id: 'subreddit-search',
      placeholder: searchPlaceholder,
      value: searchQuery,
      onChange: onSearchChange,
      disabled,
      maxWidth: '300px'
    }
  } : toolbarProps

  return <UniversalToolbar {...enhancedProps} testId="bulk-actions-toolbar" />
})


