import { useState, useCallback, useMemo, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * useTemplateData - Common data management hook for templates
 *
 * Provides:
 * - Search state management
 * - Filter state management
 * - Selection state management
 * - Pagination helpers
 * - Debounced search
 */

export interface UseTemplateDataOptions {
  defaultFilter?: string
  defaultSort?: string
  searchDebounceMs?: number
  clearSelectionOnFilterChange?: boolean
}

export interface UseTemplateDataReturn {
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearchQuery: string

  // Filter
  currentFilter: string
  setCurrentFilter: (filter: string) => void

  // Sort
  currentSort: string
  setCurrentSort: (sort: string) => void

  // Selection
  selectedItems: Set<number>
  setSelectedItems: (items: Set<number>) => void
  toggleSelection: (id: number) => void
  selectAll: (ids: number[]) => void
  clearSelection: () => void
  isSelected: (id: number) => boolean

  // Pagination
  currentPage: number
  setCurrentPage: (page: number) => void
  resetPagination: () => void
}

export function useTemplateData({
  defaultFilter = 'all',
  defaultSort = 'created_at',
  searchDebounceMs = 500,
  clearSelectionOnFilterChange = true
}: UseTemplateDataOptions = {}): UseTemplateDataReturn {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, searchDebounceMs)

  // Filter state
  const [currentFilter, setCurrentFilterState] = useState(defaultFilter)

  // Sort state
  const [currentSort, setCurrentSort] = useState(defaultSort)

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)

  // Clear selection when filter changes
  const setCurrentFilter = useCallback((filter: string) => {
    setCurrentFilterState(filter)
    if (clearSelectionOnFilterChange) {
      setSelectedItems(new Set())
    }
    setCurrentPage(0) // Reset to first page
  }, [clearSelectionOnFilterChange])

  // Toggle individual selection
  const toggleSelection = useCallback((id: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all items
  const selectAll = useCallback((ids: number[]) => {
    setSelectedItems(new Set(ids))
  }, [])

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  // Check if item is selected
  const isSelected = useCallback((id: number) => {
    return selectedItems.has(id)
  }, [selectedItems])

  // Reset pagination
  const resetPagination = useCallback(() => {
    setCurrentPage(0)
  }, [])

  // Reset pagination when search changes
  useEffect(() => {
    resetPagination()
  }, [debouncedSearchQuery, resetPagination])

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Filter
    currentFilter,
    setCurrentFilter,

    // Sort
    currentSort,
    setCurrentSort,

    // Selection
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,

    // Pagination
    currentPage,
    setCurrentPage,
    resetPagination
  }
}

export default useTemplateData