'use client'

import { useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react'

interface TablePaginationProps {
  totalItems: number
  itemsPerPage: number
  currentPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  showItemsPerPageSelector?: boolean
  itemsPerPageOptions?: number[]
  disabled?: boolean
}

const TablePagination = memo(function TablePagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPageSelector = true,
  itemsPerPageOptions = [25, 50, 100, 250],
  disabled = false
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  
  const canGoPrevious = currentPage > 1 && !disabled
  const canGoNext = currentPage < totalPages && !disabled

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 7
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 4) {
        // Show first 5 pages + ellipsis + last page
        for (let i = 1; i <= 5; i++) pages.push(i)
        if (totalPages > 6) pages.push('ellipsis')
        if (totalPages > 5) pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        // Show first page + ellipsis + last 5 pages
        pages.push(1)
        if (totalPages > 6) pages.push('ellipsis')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        // Show first page + ellipsis + current page context + ellipsis + last page
        pages.push(1)
        pages.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-gray-500">
        No items to display
      </div>
    )
  }

  return (
    <div className="py-4 border-t border-gray-200 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
      {/* Items per page selector */}
      {showItemsPerPageSelector && (
        <div className="flex items-center justify-center sm:justify-start space-x-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            disabled={disabled}
            className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink disabled:bg-gray-100"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
      )}

      {/* Results info */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          Showing{' '}
          <span className="font-medium text-black">{startItem.toLocaleString()}</span>
          {' '}to{' '}
          <span className="font-medium text-black">{endItem.toLocaleString()}</span>
          {' '}of{' '}
          <span className="font-medium text-b9-pink">{totalItems.toLocaleString()}</span>
          {' '}results
        </div>

        {/* Page info */}
        <Badge variant="outline" className="font-mono text-xs">
          Page {currentPage} of {totalPages}
        </Badge>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center sm:justify-end space-x-1 sm:space-x-2">
        {/* First page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          className="p-2 h-8 w-8"
          title="First page"
        >
          <ChevronsLeft className="h-3 w-3" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="p-2 h-8 w-8"
          title="Previous page"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            <div key={index}>
              {page === 'ellipsis' ? (
                <div className="px-2 py-1 text-gray-400">
                  <MoreHorizontal className="h-3 w-3" />
                </div>
              ) : (
                <Button
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  disabled={disabled}
                  className={`h-8 w-8 p-0 text-xs ${
                    page === currentPage 
                      ? 'bg-b9-pink hover:bg-b9-pink/90 text-white' 
                      : 'hover:bg-b9-pink/5 hover:text-b9-pink hover:border-b9-pink'
                  }`}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="p-2 h-8 w-8"
          title="Next page"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className="p-2 h-8 w-8"
          title="Last page"
        >
          <ChevronsRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
})

// Hook for managing pagination state
export function usePagination(initialItemsPerPage: number = 50) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    // Reset to first page when changing items per page
    setCurrentPage(1)
  }

  const getPaginatedData = <T,>(data: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const resetPagination = () => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    itemsPerPage,
    handlePageChange,
    handleItemsPerPageChange,
    getPaginatedData,
    resetPagination
  }
}

export { TablePagination }
