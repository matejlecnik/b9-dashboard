'use client'

import React, { memo, useCallback, useRef, useEffect, useState } from 'react'
import { UniversalCreatorTable } from './UniversalCreatorTable'
import type { InstagramCreator } from './UniversalCreatorTable'

interface VirtualizedCreatorTableProps {
  creators: InstagramCreator[]
  loading: boolean
  selectedCreators?: Set<number>
  setSelectedCreators?: (ids: Set<number>) => void
  onUpdateReview?: (id: number, review: 'ok' | 'non_related' | 'pending') => void
  searchQuery?: string
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  postsMetrics?: Map<string, { avgLikes: number, avgComments: number }>
}

/**
 * VirtualizedCreatorTable - Optimized table for large datasets
 * Uses viewport-based rendering to only render visible rows
 */
const VirtualizedCreatorTable = memo(function VirtualizedCreatorTable({
  creators,
  loading,
  selectedCreators,
  setSelectedCreators,
  onUpdateReview,
  searchQuery,
  onReachEnd,
  hasMore = false,
  loadingMore = false,
  className,
  postsMetrics: _postsMetrics
}: VirtualizedCreatorTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })

  // Constants for virtualization
  const ITEM_HEIGHT = 80 // Approximate height of each row
  const BUFFER = 5 // Number of items to render outside viewport
  const OVERSCAN = 3 // Additional items to render for smoother scrolling

  // Handle scroll to update visible range
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const scrollTop = containerRef.current.scrollTop
    const containerHeight = containerRef.current.clientHeight

    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER)
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT)
    const end = Math.min(creators.length, start + visibleCount + BUFFER + OVERSCAN)

    setVisibleRange({ start, end })

    // Trigger load more when near bottom
    const scrollHeight = containerRef.current.scrollHeight
    const scrollPosition = scrollTop + containerHeight
    const threshold = 200 // Load more when within 200px of bottom

    if (scrollPosition >= scrollHeight - threshold && hasMore && !loadingMore && onReachEnd) {
      onReachEnd()
    }
  }, [creators.length, hasMore, loadingMore, onReachEnd])

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Only render visible creators
  const visibleCreators = creators.slice(visibleRange.start, visibleRange.end)

  // Calculate spacers for virtual scrolling
  const topSpacerHeight = visibleRange.start * ITEM_HEIGHT
  const bottomSpacerHeight = Math.max(0, (creators.length - visibleRange.end) * ITEM_HEIGHT)

  if (creators.length < 100) {
    // For small datasets, use regular table
    return (
      <UniversalCreatorTable
        creators={creators}
        loading={loading}
        selectedCreators={selectedCreators}
        setSelectedCreators={setSelectedCreators}
        onUpdateReview={onUpdateReview}
        searchQuery={searchQuery}
        onReachEnd={onReachEnd}
        hasMore={hasMore}
        loadingMore={loadingMore}
        className={className}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto max-h-[800px] ${className || ''}`}
      style={{ position: 'relative' }}
    >
      {/* Top spacer to maintain scroll position */}
      {topSpacerHeight > 0 && (
        <div style={{ height: topSpacerHeight }} />
      )}

      {/* Render only visible items */}
      <UniversalCreatorTable
        creators={visibleCreators}
        loading={loading}
        selectedCreators={selectedCreators}
        setSelectedCreators={setSelectedCreators}
        onUpdateReview={onUpdateReview}
        searchQuery={searchQuery}
        onReachEnd={() => {}} // Handle in scroll listener
        hasMore={false} // Prevent double loading
        loadingMore={loadingMore}
      />

      {/* Bottom spacer */}
      {bottomSpacerHeight > 0 && (
        <div style={{ height: bottomSpacerHeight }} />
      )}

      {/* Loading indicator */}
      {loadingMore && (
        <div className="p-4 text-center text-gray-500">
          Loading more...
        </div>
      )}
    </div>
  )
})

export { VirtualizedCreatorTable }