import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

/**
 * useTemplateActions - Common action handlers for templates
 *
 * Provides:
 * - Bulk action handlers
 * - Single item updates
 * - Success/error notifications
 * - Query invalidation
 */

export interface UseTemplateActionsOptions {
  queryKey: string[]
  onSuccess?: (message: string) => void
  onError?: (error: Error) => void
  showToasts?: boolean
}

export interface BulkActionParams {
  ids: number[]
  action: string
  data?: any
}

export interface SingleActionParams {
  id: number
  updates: any
}

export interface UseTemplateActionsReturn {
  // Bulk actions
  executeBulkAction: (params: BulkActionParams) => Promise<void>
  isBulkActionPending: boolean

  // Single actions
  updateSingleItem: (params: SingleActionParams) => Promise<void>
  isUpdatePending: boolean

  // Delete action
  deleteItem: (id: number) => Promise<void>
  isDeletePending: boolean

  // Utility
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

export function useTemplateActions({
  queryKey,
  onSuccess,
  onError,
  showToasts = true
}: UseTemplateActionsOptions): UseTemplateActionsReturn {
  const queryClient = useQueryClient()

  // Show success message
  const showSuccess = useCallback((message: string) => {
    if (showToasts) {
      toast.success(message)
    }
    onSuccess?.(message)
    logger.log(message)
  }, [showToasts, onSuccess])

  // Show error message
  const showError = useCallback((message: string) => {
    if (showToasts) {
      toast.error(message)
    }
    logger.error(message)
  }, [showToasts])

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ ids, action, data }: BulkActionParams) => {
      // This should be replaced with actual API call
      const response = await fetch('/api/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, data })
      })

      if (!response.ok) {
        throw new Error('Bulk action failed')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      showSuccess(`Successfully updated ${variables.ids.length} items`)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error, variables) => {
      const message = `Failed to update ${variables.ids.length} items`
      showError(message)
      onError?.(error)
    }
  })

  // Single item update mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: SingleActionParams) => {
      // This should be replaced with actual API call
      const response = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Update failed')
      }

      return response.json()
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey })

      const previousData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => {
        if (Array.isArray(old)) {
          return old.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        }
        return old
      })

      return { previousData }
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      showError('Update failed')
      onError?.(error)
    },
    onSuccess: () => {
      showSuccess('Item updated successfully')
      queryClient.invalidateQueries({ queryKey })
    }
  })

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      // This should be replaced with actual API call
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }
    },
    onMutate: async (id) => {
      // Optimistic delete
      await queryClient.cancelQueries({ queryKey })

      const previousData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter(item => item.id !== id)
        }
        return old
      })

      return { previousData }
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      showError('Delete failed')
      onError?.(error)
    },
    onSuccess: () => {
      showSuccess('Item deleted successfully')
      queryClient.invalidateQueries({ queryKey })
    }
  })

  // Execute bulk action
  const executeBulkAction = useCallback(async (params: BulkActionParams) => {
    if (params.ids.length === 0) {
      showError('No items selected')
      return
    }

    await bulkActionMutation.mutateAsync(params)
  }, [bulkActionMutation, showError])

  // Update single item
  const updateSingleItem = useCallback(async (params: SingleActionParams) => {
    await updateItemMutation.mutateAsync(params)
  }, [updateItemMutation])

  // Delete item
  const deleteItem = useCallback(async (id: number) => {
    await deleteItemMutation.mutateAsync(id)
  }, [deleteItemMutation])

  return {
    // Bulk actions
    executeBulkAction,
    isBulkActionPending: bulkActionMutation.isPending,

    // Single actions
    updateSingleItem,
    isUpdatePending: updateItemMutation.isPending,

    // Delete action
    deleteItem,
    isDeletePending: deleteItemMutation.isPending,

    // Utility
    showSuccess,
    showError
  }
}

export default useTemplateActions