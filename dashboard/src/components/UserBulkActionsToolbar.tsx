'use client'

import { memo } from 'react'
import { UniversalToolbar, createUserBulkActionsToolbar } from './UniversalToolbar'

interface UserBulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onSelectNone: () => void
  onBulkToggleCreator?: () => void
  onBulkExport?: () => void
  onBulkDelete?: () => void
}

const UserBulkActionsToolbar = memo(function UserBulkActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onBulkToggleCreator,
  onBulkExport,
  onBulkDelete
}: UserBulkActionsToolbarProps) {
  // Use the new UniversalToolbar with preset configuration
  const toolbarProps = createUserBulkActionsToolbar({
    selectedCount,
    totalCount,
    onSelectAll,
    onSelectNone,
    onBulkToggleCreator,
    onBulkExport,
    onBulkDelete
  })

  // Keyboard shortcuts DISABLED per user request

  return (
    <UniversalToolbar 
      {...toolbarProps} 
      keyboard={{ enabled: false }}
      testId="user-bulk-actions-toolbar" 
    />
  )
})

export { UserBulkActionsToolbar }