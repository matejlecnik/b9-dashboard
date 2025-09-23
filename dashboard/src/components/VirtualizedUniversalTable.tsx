'use client'

import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Image from 'next/image'
import { type Subreddit } from '@/lib/supabase/index'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CategorySelector } from '@/components/CategorySelector'
import { TagsDisplay } from '@/components/TagsDisplay'
import { cn } from '@/lib/utils'
import { BookOpen, BadgeCheck } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { useLRUSet } from '@/lib/lru-cache'

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

const ROW_HEIGHT = 64 // Fixed row height for virtual scrolling (px)
const OVERSCAN = 5 // Number of rows to render outside viewport
const SCROLL_DEBOUNCE_MS = 10 // Debounce scroll events

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type TableMode = 'review' | 'category'

interface VirtualizedUniversalTableProps {
  // Core data
  subreddits: Subreddit[]
  loading: boolean

  // Selection
  selectedSubreddits?: Set<number>
  setSelectedSubreddits?: (ids: Set<number>) => void
  allowSelectionInReview?: boolean

  // Update handlers
  onUpdateCategory?: (id: number, categoryText: string) => void
  onUpdateReview?: (id: number, reviewText: string) => void
  onUpdateTags?: (id: number, oldTag: string, newTag: string) => void
  onRemoveTag?: (id: number, tag: string) => void
  onAddTag?: (id: number, tag: string) => void

  // Mode and behavior
  mode?: TableMode

  // Performance and UI
  availableCategories?: string[]
  searchQuery?: string
  onShowRules?: (subreddit: Subreddit) => void

  // Styling
  className?: string
  testId?: string
  showHeader?: boolean
  showSelection?: boolean
  showIcons?: boolean

  // Image handling
  brokenIcons?: Set<number | string>
  handleIconError?: (id: number | string) => void

  // Animation
  removingIds?: Set<number>
}

// ============================================================================
// MEMOIZATION HELPER - CUSTOM PROPS COMPARISON
// ============================================================================

const arePropsEqual = (
  prevProps: VirtualizedUniversalTableProps,
  nextProps: VirtualizedUniversalTableProps
): boolean => {
  // Compare primitive values
  if (prevProps.loading !== nextProps.loading) return false
  if (prevProps.mode !== nextProps.mode) return false
  if (prevProps.allowSelectionInReview !== nextProps.allowSelectionInReview) return false
  if (prevProps.searchQuery !== nextProps.searchQuery) return false
  if (prevProps.className !== nextProps.className) return false
  if (prevProps.testId !== nextProps.testId) return false
  if (prevProps.showHeader !== nextProps.showHeader) return false
  if (prevProps.showSelection !== nextProps.showSelection) return false
  if (prevProps.showIcons !== nextProps.showIcons) return false

  // Compare arrays by reference and length
  if (prevProps.subreddits !== nextProps.subreddits) {
    if (!prevProps.subreddits || !nextProps.subreddits) return false
    if (prevProps.subreddits.length !== nextProps.subreddits.length) return false
    return false // Parent should ensure stable references
  }

  // Helper function to compare Sets efficiently
  const areSetsEqual = (a: Set<any> | undefined, b: Set<any> | undefined): boolean => {
    if (a === b) return true
    if (!a || !b) return false
    if (a.size !== b.size) return false
    for (const item of a) {
      if (!b.has(item)) return false
    }
    return true
  }

  // Compare Set props
  if (!areSetsEqual(prevProps.selectedSubreddits, nextProps.selectedSubreddits)) return false
  if (!areSetsEqual(prevProps.brokenIcons, nextProps.brokenIcons)) return false
  if (!areSetsEqual(prevProps.removingIds, nextProps.removingIds)) return false

  // Compare callback functions (by reference)
  if (prevProps.setSelectedSubreddits !== nextProps.setSelectedSubreddits) return false
  if (prevProps.onUpdateCategory !== nextProps.onUpdateCategory) return false
  if (prevProps.onUpdateReview !== nextProps.onUpdateReview) return false
  if (prevProps.onUpdateTags !== nextProps.onUpdateTags) return false
  if (prevProps.onRemoveTag !== nextProps.onRemoveTag) return false
  if (prevProps.onAddTag !== nextProps.onAddTag) return false
  if (prevProps.onShowRules !== nextProps.onShowRules) return false
  if (prevProps.handleIconError !== nextProps.handleIconError) return false

  return true
}

// ============================================================================
// REDDIT IMAGE UTILITIES (reused from UniversalTable)
// ============================================================================

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

function getOptimizedRedditImageUrl(url: string, size: 'small' | 'medium' = 'small'): string {
  if (!isValidRedditImageUrl(url)) return url

  try {
    const decodedUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

    if (decodedUrl.includes('preview.redd.it')) {
      const sizeParams = {
        small: 'width=32&height=32',
        medium: 'width=64&height=64'
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
// VIRTUALIZED UNIVERSAL TABLE COMPONENT
// ============================================================================

export const VirtualizedUniversalTable = memo(function VirtualizedUniversalTable({
  // Core props
  subreddits,
  loading,
  selectedSubreddits = new Set(),
  setSelectedSubreddits,
  allowSelectionInReview = false,

  // Update handlers
  onUpdateCategory,
  onUpdateReview,
  onUpdateTags,
  onRemoveTag,
  onAddTag,

  // Mode and behavior
  mode = 'category',

  // Performance and UI
  availableCategories = [],
  searchQuery = '',
  onShowRules,

  // Styling
  className = '',
  testId,
  showHeader = true,
  showSelection = true,
  showIcons = true,

  // Image handling
  brokenIcons = new Set(),
  handleIconError,

  // Animation
  removingIds = new Set()
}: VirtualizedUniversalTableProps) {

  // ============================================================================
  // STATE AND REFS
  // ============================================================================

  const parentRef = useRef<HTMLDivElement>(null)
  // Use LRU Set to prevent memory leaks (max 200 broken icons cached)
  const brokenIconsLRU = useLRUSet<number>(200)

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const finalBrokenIcons = useMemo(() => {
    // Combine external broken icons with LRU-cached broken icons
    const lruArray = brokenIconsLRU.toArray()
    const externalArray = brokenIcons ? Array.from(brokenIcons) : []
    return new Set([...externalArray, ...lruArray])
  }, [brokenIcons, brokenIconsLRU.version])

  const handleUpdate = useCallback((id: number, value: string) => {
    if (onUpdateReview) return onUpdateReview(id, value)
    if (onUpdateCategory) return onUpdateCategory(id, value)
  }, [onUpdateReview, onUpdateCategory])

  const handleIconErrorInternal = useCallback((id: number | string) => {
    if (handleIconError) {
      handleIconError(id)
    } else {
      const numericId = typeof id === 'string' ? parseInt(id) : id
      if (!isNaN(numericId)) {
        brokenIconsLRU.add(numericId)
        // LRU automatically handles size limits (200 max)
      }
    }
  }, [handleIconError])

  // ============================================================================
  // VIRTUAL SCROLLING SETUP
  // ============================================================================

  const virtualizer = useVirtualizer({
    count: subreddits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    getItemKey: (index) => subreddits[index]?.id || index,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // ============================================================================
  // ROW RENDERER
  // ============================================================================

  const renderRow = useCallback((subreddit: Subreddit, index: number) => {
    const isSelected = selectedSubreddits?.has(subreddit.id) || false
    const isRemoving = removingIds.has(subreddit.id)
    const iconUrl = subreddit.community_icon
    const isBroken = finalBrokenIcons.has(subreddit.id)
    const safeDisplayName = subreddit.display_name_prefixed || (subreddit.name ? `r/${subreddit.name}` : 'Unknown')
    const safeTitle = subreddit.title || ''

    return (
      <div
        key={subreddit.id}
        className={cn(
          "flex items-center px-4 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-300",
          isSelected && "bg-pink-50/50",
          isRemoving && "opacity-0 scale-95 pointer-events-none"
        )}
        style={{
          height: `${ROW_HEIGHT}px`,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualItems[index]?.start || 0}px)`
        }}
      >
        {/* Selection checkbox */}
        {showSelection && (mode === 'category' || allowSelectionInReview) && setSelectedSubreddits && (
          <div className="w-10 flex justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                const newSelected = new Set(selectedSubreddits)
                if (checked) {
                  newSelected.add(subreddit.id)
                } else {
                  newSelected.delete(subreddit.id)
                }
                setSelectedSubreddits(newSelected)
              }}
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
              <div className="w-8 h-8 overflow-hidden rounded-full border border-gray-200">
                <Image
                  src={getOptimizedRedditImageUrl(iconUrl, 'small')}
                  alt={`${subreddit.name} icon`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  onError={() => handleIconErrorInternal(subreddit.id)}
                  unoptimized
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
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
          <div className="font-semibold text-sm text-gray-900 truncate flex items-center gap-2">
            {safeDisplayName}
            {(subreddit as any).verification_required && (
              <BadgeCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            )}
            {subreddit.over18 !== null && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                subreddit.over18
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              )}>
                {subreddit.over18 ? "NSFW" : "SFW"}
              </span>
            )}
          </div>
          {safeTitle && (
            <div className="text-xs text-gray-600 line-clamp-1">
              {safeTitle}
            </div>
          )}
        </a>

        {/* Rules button */}
        <div className="w-14 flex justify-center">
          {onShowRules && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShowRules(subreddit)}
              className="h-8 w-8 p-0"
            >
              <BookOpen className="h-4 w-4 text-gray-500" />
            </Button>
          )}
        </div>

        {/* Subscribers */}
        <div className="w-24 text-center">
          <div className="font-medium text-sm text-gray-700">
            {typeof subreddit.subscribers === 'number' ? formatNumber(subreddit.subscribers) : '—'}
          </div>
        </div>

        {/* Engagement */}
        <div className="w-24 text-center">
          {typeof subreddit.engagement === 'number' ? (
            <span className={cn(
              "font-medium text-sm",
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
          <div className="font-medium text-sm text-gray-700">
            {typeof subreddit.avg_upvotes_per_post === 'number'
              ? formatNumber(Math.round(subreddit.avg_upvotes_per_post))
              : '—'}
          </div>
        </div>

        {/* Review column */}
        <div className="w-52 px-2">
          {(mode === 'review' || mode === 'category') && (
            <div className="flex gap-1">
              {['Ok', 'No Seller', 'Non Related'].map((option) => (
                <Button
                  key={option}
                  variant={subreddit.review === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUpdate(subreddit.id, option)}
                  className={cn(
                    "h-7 px-2 text-xs",
                    subreddit.review === option && "bg-pink-500 hover:bg-pink-600 text-white"
                  )}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Category column (only in category mode) */}
        {mode === 'category' && (
          <>
            <div className="w-32 px-2">
              <CategorySelector
                subredditId={subreddit.id}
                currentCategory={subreddit.primary_category || ''}
                onUpdateCategory={(id, category) => handleUpdate(id, category)}
                compact={false}
                availableCategories={availableCategories}
              />
            </div>

            {/* Tags column */}
            <div className="w-96 px-2">
              <TagsDisplay
                tags={subreddit.tags || []}
                compactMode={false}
                onTagUpdate={onUpdateTags ? (oldTag, newTag) => onUpdateTags(subreddit.id, oldTag, newTag) : undefined}
                onTagRemove={onRemoveTag ? (tag) => onRemoveTag(subreddit.id, tag) : undefined}
                onAddTag={onAddTag ? (tag) => onAddTag(subreddit.id, tag) : undefined}
              />
            </div>
          </>
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
    finalBrokenIcons,
    handleIconErrorInternal,
    onShowRules,
    handleUpdate,
    availableCategories,
    removingIds,
    virtualItems,
    onUpdateTags,
    onRemoveTag,
    onAddTag
  ])

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading && subreddits.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-2 text-gray-500">Loading subreddits...</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl border border-black/5 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden",
        className
      )}
      role="table"
      data-testid={testId}
    >
      {/* Header */}
      {showHeader && (
        <div
          className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-200/50 font-medium text-gray-700 text-sm sticky top-0 z-10"
          role="row"
        >
          {showSelection && (mode === 'category' || allowSelectionInReview) && setSelectedSubreddits && (
            <div className="w-10 flex justify-center">
              <Checkbox
                checked={selectedSubreddits.size === subreddits.length && subreddits.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedSubreddits(new Set(subreddits.map(s => s.id)))
                  } else {
                    setSelectedSubreddits(new Set())
                  }
                }}
              />
            </div>
          )}
          {showIcons && <div className="w-14 flex justify-center">Icon</div>}
          <div className="w-72 px-3">Subreddit</div>
          <div className="w-14 flex justify-center">Rules</div>
          <div className="w-24 text-center">Members</div>
          <div className="w-24 text-center">Engagement</div>
          <div className="w-16 text-center">Upvotes</div>
          <div className="w-52 px-2">Review</div>
          {mode === 'category' && (
            <>
              <div className="w-32 px-2">Category</div>
              <div className="w-96 px-2">Tags</div>
            </>
          )}
          <div className="flex-1 flex justify-end pr-4">
            <span className="text-xs text-gray-400">
              {subreddits.length.toLocaleString()} results
            </span>
          </div>
        </div>
      )}

      {/* Virtual scroll container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ position: 'relative' }}
      >
        {subreddits.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No subreddits found
            {searchQuery && (
              <span className="ml-1">for &quot;{searchQuery}&quot;</span>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const subreddit = subreddits[virtualItem.index]
              return renderRow(subreddit, virtualItem.index)
            })}
          </div>
        )}
      </div>
    </div>
  )
}, arePropsEqual)

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const createVirtualizedReviewTable = (props: Omit<VirtualizedUniversalTableProps, 'mode'>) => ({
  ...props,
  mode: 'review' as const,
  showSelection: true,
  allowSelectionInReview: true
})

export const createVirtualizedCategorizationTable = (props: Omit<VirtualizedUniversalTableProps, 'mode'>) => ({
  ...props,
  mode: 'category' as const,
  showSelection: true
})