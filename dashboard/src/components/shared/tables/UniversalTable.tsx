'use client'

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { TagsDisplay } from '@/components/shared/TagsDisplay'
import { BookOpen, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useLRUSet } from '@/lib/lru-cache'
import { logger } from '@/lib/logger'
import { formatNumber } from '@/lib/formatters'
import type { Subreddit } from '@/types/subreddit'

// Removed local TagsDisplay; using shared component


// Performance constants inline since @/lib/performance was removed
const PERFORMANCE_CONSTANTS = {
  BATCH_SIZE: 20,
  PRELOAD_BUFFER: 3,
  CLEANUP_INTERVAL: 10000,
  MAX_CACHED_ITEMS: 1000,
  LARGE_DATASET_THRESHOLD: 5000
}

// Simplified performance hooks
function useMemoryOptimizedData<T>(data: ReadonlyArray<T>, maxItems: number): { optimizedData: T[] } {
  const optimizedData = data.length > maxItems ? [...data.slice(data.length - maxItems)] : [...data]
  return { optimizedData }
}

// Performance monitoring removed - not needed

// Skeleton loader component
const UniversalTableSkeleton = () => (
  <div className="animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/4 mr-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mr-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    ))}
  </div>
)

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type TableVariant = 'standard' | 'virtualized' | 'compact'
type TableMode = 'review' | 'category'

interface UniversalTableProps {
  // Core data
  subreddits: Subreddit[]
  loading: boolean

  // Selection
  selectedSubreddits?: Set<number>
  setSelectedSubreddits?: (ids: Set<number>) => void
  allowSelectionInReview?: boolean

  // Update handlers
  onBulkUpdateTags?: (tags: string[]) => void
  onUpdateReview?: (id: number, reviewText: string) => void
  onBulkUpdateReview?: (reviewText: string) => void
  onUpdateSingleTag?: (id: number, oldTag: string, newTag: string) => void
  onRemoveTag?: (id: number, tag: string) => void
  onAddTag?: (id: number, tag: string) => void
  
  // Mode and behavior
  mode?: TableMode
  variant?: TableVariant
  platform?: 'reddit' | 'instagram'
  
  // Infinite scroll
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  
  // Performance and UI
  searchQuery?: string
  highlightedIndex?: number
  onShowRules?: (subreddit: Subreddit) => void
  
  // Styling and layout
  className?: string
  testId?: string
  showHeader?: boolean
  showSelection?: boolean
  showIcons?: boolean
  compactMode?: boolean
  
  // Image handling
  brokenIcons?: Set<number | string>
  handleIconError?: (id: number | string) => void

  // Animation
  removingIds?: Set<number>
}

// ============================================================================
// REDDIT IMAGE UTILITIES
// ============================================================================

/**
 * Check if URL is a valid Reddit image URL
 */
function isValidRedditImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    const urlObj = new URL(url)
    const validHosts = [
      'i.redd.it',
      'preview.redd.it', 
      'external-preview.redd.it',
      'styles.redditmedia.com',
      'b.thumbs.redditmedia.com',
      'a.thumbs.redditmedia.com'
    ]
    
    return validHosts.includes(urlObj.hostname)
  } catch {
    return false
  }
}

/**
 * Get optimized Reddit image URL
 */
function getOptimizedRedditImageUrl(url: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  if (!isValidRedditImageUrl(url)) return url
  
  try {
    // Decode HTML entities (e.g., &amp; -> &)
    const decodedUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    
    // For Reddit preview URLs, we can optimize the size
    if (decodedUrl.includes('preview.redd.it')) {
      const sizeParams = {
        small: 'width=64&height=64',
        medium: 'width=128&height=128', 
        large: 'width=256&height=256'
      }
      
      const separator = decodedUrl.includes('?') ? '&' : '?'
      return `${decodedUrl}${separator}${sizeParams[size]}&crop=smart&auto=webp&s=`
    }
    
    return decodedUrl
  } catch {
    return url
  }
}

// ============================================================================
// MEMOIZATION HELPER - CUSTOM PROPS COMPARISON
// ============================================================================

/**
 * Custom comparison function for UniversalTable to prevent unnecessary re-renders.
 * Properly compares complex data types like Sets and arrays.
 */
const areUniversalTablePropsEqual = (
  prevProps: UniversalTableProps,
  nextProps: UniversalTableProps
): boolean => {
  // 1. Compare primitive values and simple references
  if (prevProps.loading !== nextProps.loading) return false
  if (prevProps.mode !== nextProps.mode) return false
  if (prevProps.variant !== nextProps.variant) return false
  if (prevProps.allowSelectionInReview !== nextProps.allowSelectionInReview) return false
  if (prevProps.hasMore !== nextProps.hasMore) return false
  if (prevProps.loadingMore !== nextProps.loadingMore) return false
  if (prevProps.searchQuery !== nextProps.searchQuery) return false
  if (prevProps.highlightedIndex !== nextProps.highlightedIndex) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.testId !== nextProps.testId) return false
  if (prevProps.showHeader !== nextProps.showHeader) return false
  if (prevProps.showSelection !== nextProps.showSelection) return false
  if (prevProps.showIcons !== nextProps.showIcons) return false
  if (prevProps.compactMode !== nextProps.compactMode) return false

  // 2. Compare arrays by reference and length
  // For subreddits array, we check reference first (most common case)
  // If reference changed, check if actual content changed
  if (prevProps.subreddits !== nextProps.subreddits) {
    if (!prevProps.subreddits || !nextProps.subreddits) return false
    if (prevProps.subreddits.length !== nextProps.subreddits.length) return false
    // For large arrays, we only do reference check to avoid expensive deep comparison
    // Parent should ensure stable references when data hasn't changed
    return false
  }

  // availableCategories removed - not used

  // 3. Helper function to compare Sets efficiently
  const areSetsEqual = (a: Set<unknown> | undefined, b: Set<unknown> | undefined): boolean => {
    // Handle undefined cases
    if (a === b) return true // Both undefined or same reference
    if (!a || !b) return false // One is undefined

    // Type check - ensure both are actually Sets
    if (!(a instanceof Set) || !(b instanceof Set)) return false

    // Compare size first (fast check)
    if (a.size !== b.size) return false

    // Compare contents
    for (const item of a) {
      if (!b.has(item)) return false
    }
    return true
  }

  // 4. Compare Set props
  if (!areSetsEqual(prevProps.selectedSubreddits, nextProps.selectedSubreddits)) return false
  if (!areSetsEqual(prevProps.brokenIcons, nextProps.brokenIcons)) return false
  if (!areSetsEqual(prevProps.removingIds, nextProps.removingIds)) return false

  // 5. Compare callback functions
  // We allow callback changes as they're necessary for functionality
  // But we check if they're the same reference for optimization
  if (prevProps.setSelectedSubreddits !== nextProps.setSelectedSubreddits) return false
  if (prevProps.onBulkUpdateTags !== nextProps.onBulkUpdateTags) return false
  if (prevProps.onUpdateReview !== nextProps.onUpdateReview) return false
  if (prevProps.onBulkUpdateReview !== nextProps.onBulkUpdateReview) return false
  if (prevProps.onUpdateSingleTag !== nextProps.onUpdateSingleTag) return false
  if (prevProps.onRemoveTag !== nextProps.onRemoveTag) return false
  if (prevProps.onAddTag !== nextProps.onAddTag) return false
  if (prevProps.onReachEnd !== nextProps.onReachEnd) return false
  if (prevProps.onShowRules !== nextProps.onShowRules) return false
  if (prevProps.handleIconError !== nextProps.handleIconError) return false

  // All props are equal, prevent re-render
  return true
}

// ============================================================================
// UNIVERSAL TABLE COMPONENT
// ============================================================================

export const UniversalTable = memo(function UniversalTable({
  // Core props
  subreddits,
  loading,
  selectedSubreddits = new Set(),
  setSelectedSubreddits,
  allowSelectionInReview = false,

  // Update handlers
  onUpdateReview,
  onUpdateSingleTag,
  onRemoveTag,
  onAddTag,

  // Mode and behavior
  mode = 'category',
  
  // Infinite scroll
  onReachEnd,
  hasMore = false,
  loadingMore = false,
  
  // Performance and UI
  searchQuery = '',
  highlightedIndex,
  onShowRules,
  
  // Styling
  className = '',
  testId,
  showHeader = true,
  showSelection = true,
  showIcons = true,
  compactMode = false,
  
  // Image handling
  brokenIcons = new Set(),
  handleIconError,

  // Animation
  removingIds = new Set()
}: UniversalTableProps) {
  
  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  // Performance monitoring disabled for now
  // const { mark, measure, measureAsync } = usePerformanceMonitor('UniversalTable') as any

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Sorting removed - backend handles via orderBy parameter
  // Use LRU Set to prevent memory leaks (max 200 broken icons cached)
  const brokenIconsLRU = useLRUSet<number>(200)
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  
  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================
  
  // Memory optimization for large datasets
  const { optimizedData: memoryOptimizedSubreddits } = useMemoryOptimizedData(
    subreddits, 
    PERFORMANCE_CONSTANTS.MAX_CACHED_ITEMS
  )
  
  // Use memory-optimized data if dealing with large dataset
  const workingSubreddits = subreddits.length > PERFORMANCE_CONSTANTS.LARGE_DATASET_THRESHOLD 
    ? memoryOptimizedSubreddits 
    : subreddits
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const finalBrokenIcons = useMemo(() => {
    // Combine external broken icons with LRU-cached broken icons
    const lruArray = brokenIconsLRU.toArray()
    const externalArray = brokenIcons ? Array.from(brokenIcons) : []
    return new Set([...externalArray, ...lruArray])
  }, [brokenIcons, brokenIconsLRU])
  
  const handleUpdate = useCallback((id: number, value: string) => {
    if (onUpdateReview) return onUpdateReview(id, value)
  }, [onUpdateReview])
  
  const handleIconErrorInternal = useCallback((id: number | string) => {
    logger.log(`🖼️ [Image] Failed to load icon for subreddit ID: ${id}`)
    
    if (handleIconError) {
      handleIconError(id)
    } else {
      // Convert to number for internal tracking
      const numericId = typeof id === 'string' ? parseInt(id) : id
      if (!isNaN(numericId)) {
        brokenIconsLRU.add(numericId)
        logger.log(`🖼️ [Image] Added ${numericId} to LRU broken icons. Total broken: ${brokenIconsLRU.size}`)
      }
    }
  }, [handleIconError, brokenIconsLRU])
  
  // ============================================================================
  // SORTING LOGIC
  // ============================================================================

  // NOTE: Sorting disabled for infinite scroll compatibility
  // Backend query handles sorting via orderBy parameter
  // Client-side re-sorting breaks pagination across multiple pages
  const processedSubreddits = useMemo(() => {
    if (!workingSubreddits?.length) return []

    // Return data as-is - backend already sorted correctly
    return [...workingSubreddits]
  }, [workingSubreddits])
  
  // ============================================================================
  // INFINITE SCROLL SETUP
  // ============================================================================
  
  useEffect(() => {
    if (!onReachEnd || !hasMore) return
    
    const rootEl = wrapperRef.current
    const target = sentinelRef.current
    if (!rootEl || !target) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onReachEnd()
        }
      },
      {
        root: null, // Use viewport instead of the scrollable container
        rootMargin: '200px 0px',
        threshold: 0.1 // Increase threshold for more reliable triggering
      }
    )
    
    observer.observe(target)
    return () => observer.disconnect()
  }, [onReachEnd, hasMore, loadingMore])
  
  // ============================================================================
  // ROW RENDERER
  // ============================================================================
  
  const renderRow = useCallback((subreddit: Subreddit, index: number) => {
    const isSelected = selectedSubreddits?.has(subreddit.id) || false
    const isHighlighted = typeof highlightedIndex === 'number' && highlightedIndex === index
    const isRemoving = removingIds.has(subreddit.id)
    const iconUrl = (subreddit.community_icon && subreddit.community_icon.trim() !== '')
      ? subreddit.community_icon
      : (subreddit.icon_img && subreddit.icon_img.trim() !== ''
        ? subreddit.icon_img
        : '')
    const isBroken = finalBrokenIcons.has(subreddit.id)
    const safeDisplayName = subreddit.display_name_prefixed || (subreddit.name ? `r/${subreddit.name}` : 'Unknown subreddit')
    const safeTitle = subreddit.title || ''

    return (
      <div
        className={cn(
          "flex items-center px-4 py-2 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-300",
          isHighlighted && "bg-pink-50 border-pink-200",
          isSelected && "bg-pink-50/50",
          compactMode && "py-1",
          isRemoving && "opacity-0 scale-95 pointer-events-none"
        )}
        role="row"
        aria-selected={isSelected}
        data-testid={`subreddit-row-${subreddit.id}`}
      >
        {/* Selection checkbox */}
        {showSelection && (mode === 'category' || allowSelectionInReview) && setSelectedSubreddits && (
          <div className="w-10 flex justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked: boolean) => {
                const newSelected = new Set(selectedSubreddits)
                if (checked) {
                  newSelected.add(subreddit.id)
                } else {
                  newSelected.delete(subreddit.id)
                }
                setSelectedSubreddits(newSelected)
              }}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${safeDisplayName}`}
            />
          </div>
        )}
        
        {/* Icon */}
        {showIcons && (
          <a 
            href={`https://www.reddit.com/${safeDisplayName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 flex justify-center hover:opacity-80 transition-opacity"
          >
            {iconUrl && iconUrl.trim() !== '' && !isBroken ? (
              (() => {
                const optimizedUrl = isValidRedditImageUrl(iconUrl) 
                  ? getOptimizedRedditImageUrl(iconUrl, compactMode ? 'small' : 'medium')
                  : iconUrl
                
                return (
                  <div className={cn(
                    "overflow-hidden rounded-full border border-gray-200",
                    compactMode ? "w-6 h-6" : "w-8 h-8"
                  )}>
                    <Image
                      src={optimizedUrl}
                      alt={`${subreddit.name || safeDisplayName} icon`}
                      width={compactMode ? 24 : 32}
                      height={compactMode ? 24 : 32}
                      className="w-full h-full object-cover"
                      onError={() => handleIconErrorInternal(subreddit.id)}
                      unoptimized
                      loading="lazy"
                    />
                  </div>
                )
              })()
            ) : (
              <div className={cn(
                "rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xs font-bold border border-pink-500",
                compactMode ? "w-6 h-6" : "w-8 h-8"
              )}>
                {subreddit.name?.charAt(0)?.toUpperCase() || 'R'}
              </div>
            )}
          </a>
        )}
        
        {/* Name and title */}
        <a
          href={`https://www.reddit.com/${safeDisplayName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-72 min-w-0 px-3 hover:opacity-80 transition-opacity"
        >
          <div className={cn(
            "font-semibold text-gray-900 truncate flex items-center gap-2",
            compactMode ? "text-xs" : "text-sm"
          )}>
            {safeDisplayName}
            {/* Verification Badge */}
            {subreddit.verification_required && (
              <span title="Verification Required">
                <BadgeCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              </span>
            )}
            {/* NSFW/SFW Badge */}
            {(() => {
              const nsfwFlag = typeof subreddit.is_nsfw === 'boolean'
                ? subreddit.is_nsfw
                : (typeof subreddit.over18 === 'boolean' ? subreddit.over18 : undefined)
              if (typeof nsfwFlag !== 'boolean') return null
              return (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                nsfwFlag
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-green-100 text-green-800 border border-green-200",
                compactMode && "px-1.5 py-0 text-[10px]"
              )}>
                {nsfwFlag ? "NSFW" : "SFW"}
              </span>
              )
            })()}
          </div>
          {safeTitle && !compactMode && (
            <div className="text-xs text-gray-600 line-clamp-2">
              {safeTitle}
            </div>
          )}
        </a>
        
        {/* Rules button */}
        <div className="w-14 flex justify-center">
          {onShowRules && (() => {
            // Check if rules_data exists and has content
            const hasRulesData = subreddit.rules_data && 
              typeof subreddit.rules_data === 'object' && (
                (Array.isArray(subreddit.rules_data) && subreddit.rules_data.length > 0) ||
                (typeof subreddit.rules_data === 'object' && 'rules' in subreddit.rules_data && 
                 Array.isArray((subreddit.rules_data as { rules?: unknown[] }).rules) && ((subreddit.rules_data as { rules?: unknown[] }).rules?.length || 0) > 0)
              );
            
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasRulesData) {
                    onShowRules(subreddit);
                  } else {
                    const confirmOpen = window.confirm(
                      `No rules data found for ${safeDisplayName}.\n\nWould you like to open the subreddit rules page on Reddit?`
                    );
                    if (confirmOpen) {
                      window.open(
                        `https://www.reddit.com/${safeDisplayName}/about/rules`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }
                }}
                className={cn(
                  "p-0 hover:bg-gray-100",
                  compactMode ? "h-6 w-6" : "h-8 w-8"
                )}
                aria-label={`View rules for ${safeDisplayName}`}
              >
                <BookOpen className={cn(
                  hasRulesData ? "text-gray-500" : "text-gray-300",
                  compactMode ? "h-3 w-3" : "h-4 w-4"
                )} />
              </Button>
            )
          })()}
        </div>
        
        {/* Subscribers */}
        <div className="w-24 text-center">
          <div className={cn(
            "font-medium text-gray-700",
            compactMode ? "text-xs" : "text-sm"
          )}>
            {typeof subreddit.subscribers === 'number' ? formatNumber(subreddit.subscribers) : '—'}
          </div>
        </div>
        
        {/* Engagement */}
        <div className="w-24 text-center">
          {typeof subreddit.engagement === 'number' ? (
            <span className={cn(
              "font-medium",
              compactMode ? "text-xs" : "text-sm",
              subreddit.engagement > 0.15 ? 'text-pink-600' :
              subreddit.engagement > 0.05 ? 'text-gray-700' : 'text-gray-500'
            )}>
              {(subreddit.engagement * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
        
        {/* Upvotes */}
        <div className="w-16 text-center">
          <div className={cn(
            "font-medium text-gray-700",
            compactMode ? "text-xs" : "text-sm"
          )}>
            {typeof subreddit.avg_upvotes_per_post === 'number' ? formatNumber(Math.round(subreddit.avg_upvotes_per_post)) : '—'}
          </div>
        </div>
        
        {/* Review column */}
        <div className="w-52 px-2">
          {mode === 'review' || mode === 'category' ? (
            <div className="flex gap-1">
              {['Ok', 'No Seller', 'Non Related'].map((option) => (
                <Button
                  key={option}
                  variant={subreddit.review === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUpdate(subreddit.id, option)}
                  className={cn(
                    "text-xs",
                    compactMode ? "h-6 px-1" : "h-7 px-2",
                    subreddit.review === option && "bg-pink-500 hover:bg-pink-600 text-white"
                  )}
                  title={`Mark as ${option}`}
                >
                  {compactMode ? option.charAt(0) : option}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Tags column (only in category mode) */}
        {mode === 'category' && (
          <div className="flex-1 px-2 min-w-0">
            <TagsDisplay
              tags={Array.isArray(subreddit.tags) ? subreddit.tags : []}
              compactMode={compactMode}
              onTagUpdate={onUpdateSingleTag ? (oldTag: string, newTag: string) => onUpdateSingleTag(subreddit.id, oldTag, newTag) : undefined}
              onTagRemove={onRemoveTag ? (tag: string) => onRemoveTag(subreddit.id, tag) : undefined}
              onAddTag={onAddTag ? (tag: string) => onAddTag(subreddit.id, tag) : undefined}
            />
          </div>
        )}
      </div>
    )
  }, [
    selectedSubreddits,
    setSelectedSubreddits,
    mode,
    allowSelectionInReview,
    showSelection,
    showIcons,
    compactMode,
    highlightedIndex,
    finalBrokenIcons,
    handleIconErrorInternal,
    onShowRules,
    handleUpdate,
    removingIds,
    onUpdateSingleTag,
    onRemoveTag,
    onAddTag
  ])

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading && processedSubreddits.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-2 text-gray-500">Loading subreddits...</span>
      </div>
    )
  }

  return (
    <div
        ref={containerRef}
        className={cn(
          "flex flex-col h-full rounded-2xl border border-black/5 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden",
          className
        )}
        role="table"
        aria-busy={loadingMore}
        data-testid={testId}
      >
      {/* Header */}
      {showHeader && (
        <div
          className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-200/50 font-medium text-gray-700 text-sm sticky top-0 z-10"
          role="row"
          aria-label="Table header"
        >
          {showSelection && (mode === 'category' || allowSelectionInReview) && setSelectedSubreddits && (
            <div className="w-10 flex justify-center" role="columnheader">
              <Checkbox
                checked={selectedSubreddits.size === processedSubreddits.length && processedSubreddits.length > 0}
                onCheckedChange={(checked: boolean) => {
                  if (checked) {
                    setSelectedSubreddits(new Set(processedSubreddits.map(s => s.id)))
                  } else {
                    setSelectedSubreddits(new Set())
                  }
                }}
                aria-label="Select all"
              />
            </div>
          )}
          {showIcons && <div className="w-14 flex justify-center font-medium text-gray-700 pr-3" role="columnheader">Icon</div>}
          <div className="w-72 px-3" role="columnheader">Subreddit</div>
          <div className="w-14 flex justify-center font-medium text-gray-700 pr-3" role="columnheader">Rules</div>
          <div className="w-24 text-center font-medium text-gray-700 pr-3" role="columnheader">Members</div>
          <div className="w-24 text-center font-medium text-gray-700 pr-3" role="columnheader">Engagement</div>
          <div className="w-16 text-center font-medium text-gray-700 pr-3" role="columnheader">Avg Upvotes</div>
          <div className="w-52 px-2 font-medium text-gray-700" role="columnheader">
            {mode === 'review' ? 'Review' : 'Review'}
          </div>
          {mode === 'category' && (
            <div className="flex-1 px-2 font-medium text-gray-700" role="columnheader">
              Tags
            </div>
          )}
          <div className="flex-1 flex justify-end pr-4">
            <span className="text-xs text-gray-400" aria-label="Row count">
              {processedSubreddits.length.toLocaleString()} results
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div ref={wrapperRef} className="flex-1 overflow-auto">
        {loading ? (
          <UniversalTableSkeleton />
        ) : processedSubreddits.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No subreddits found
            {searchQuery && (
              <span className="ml-1">for &quot;{searchQuery}&quot;</span>
            )}
          </div>
        ) : (
          <>
            {processedSubreddits.map((subreddit, index) => (
              <div key={subreddit.id}>
                {renderRow(subreddit, index)}
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                    <span className="ml-2 text-gray-500">Loading more...</span>
                  </>
                ) : (
                  <div className="text-gray-400">Scroll to load more</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}, areUniversalTablePropsEqual)

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

// Factory functions for common table configurations
export const createSubredditReviewTable = (props: Omit<UniversalTableProps, 'variant' | 'mode'>) => ({
  ...props,
  variant: 'standard' as const,
  mode: 'review' as const,
  showSelection: true,
  allowSelectionInReview: true
})

export const createCategorizationTable = (props: Omit<UniversalTableProps, 'variant' | 'mode'>) => ({
  ...props,
  variant: 'standard' as const,
  mode: 'category' as const,
  showSelection: true,
  showIcons: true
})

export const createCompactSubredditTable = (props: Omit<UniversalTableProps, 'variant' | 'compactMode'>) => ({
  ...props,
  variant: 'compact' as const,
  compactMode: true
})

// Re-export Subreddit type for backwards compatibility
export type { Subreddit } from '@/types/subreddit'