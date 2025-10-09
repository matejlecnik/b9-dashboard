'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/shared/SkeletonLoaders'
import { queryKeys } from '@/lib/react-query'
import { DashboardLayout } from '@/components/shared'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Tag } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { TagFilterDropdown } from '@/components/shared/TagFilterDropdown'

// Import React Query hooks
import {
  useCategorizedSubreddits,
  useTagCounts,
  useAvailableTags,
  useUpdateSubredditTags,
  useBulkUpdateTags,
  useAICategorization
} from '@/hooks/queries/useRedditCategorization'

// Import types
import type { Subreddit } from '@/types/subreddit'

interface AICategorizationSettings {
  limit: number
  batchSize: number
  useSmartMatching?: boolean
  confidence?: number
}

// Dynamic imports for heavy components
const UniversalTable = dynamic(
  () => import('@/components/shared/tables/UniversalTable').then(mod => mod.UniversalTable),
  { ssr: false, loading: () => <TableSkeleton /> }
)

const AICategorizationModal = dynamic(
  () => import('@/components/features/ai/AICategorizationModal').then(mod => ({ default: mod.AICategorizationModal })),
  { ssr: false }
)

const SubredditRulesModal = dynamic(
  () => import('@/components/features/SubredditRulesModal').then(mod => ({ default: mod.SubredditRulesModal })),
  { ssr: false }
)

// Import createCategorizationTable statically since we need it immediately

export default function CategorizationPage() {
  const { addToast } = useToast()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showUntaggedOnly, setShowUntaggedOnly] = useState(true) // Default to showing untagged
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [brokenIcons, setBrokenIcons] = useState<Set<number>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })
  const [showAIModal, setShowAIModal] = useState(false)
  const [categorizationLogs, setCategorizationLogs] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  // Query client for cache management
  const queryClient = useQueryClient()

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Force refresh tags cache on mount to ensure latest tags are shown
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reddit.filters() })
  }, [queryClient])

  // React Query hooks
  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchSubreddits
  } = useCategorizedSubreddits({
    search: debouncedSearchQuery,
    tags: selectedTags,
    review: 'Ok', // Always filter for Ok subreddits in categorization
    showUntaggedOnly: selectedTags.length === 0 ? showUntaggedOnly : false, // Only show untagged when no tags selected
    orderBy: 'subscribers',
    order: 'desc'
  })

  // Flatten pages for display
  const subreddits = React.useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Tag counts with loading state
  const { data: tagCounts, isLoading: isLoadingCounts } = useTagCounts() as {
    data: { tagged: number; untagged: number } | undefined,
    isLoading: boolean
  }

  // Available tags
  const { data: availableTags } = useAvailableTags()

  // Mutations
  const updateTagsMutation = useUpdateSubredditTags()
  const bulkUpdateMutation = useBulkUpdateTags()
  const aiCategorizationMutation = useAICategorization()

  // Load available categories (still using API for now as it's different from tags)
  React.useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/reddit/categories?limit=500')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.categories) {
            const categoryNames = json.categories
              .filter((c: { name?: string }) => c?.name)
              .map((c: { name: string }) => c.name)
              .sort((a: string, b: string) => a.localeCompare(b))

            if (isMounted) {
              setAvailableCategories(categoryNames)
            }
          }
        }
      } catch (error) {
        logger.error('Error loading categories:', error)
      }
    })()
    return () => { isMounted = false }
  }, [])

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle tag filter change
  const handleTagChange = useCallback((tags: string[]) => {
    setSelectedTags(tags)
    // If tags are selected, disable untagged filter
    if (tags.length > 0) {
      setShowUntaggedOnly(false)
    }
  }, [])

  // Handle broken icon URLs
  const handleIconError = useCallback((id: string | number) => {
    setBrokenIcons(prev => {
      const next = new Set(prev)
      const numericId = typeof id === 'string' ? Number.parseInt(id, 10) : id
      if (!Number.isNaN(numericId)) {
        next.add(numericId)
      }
      // Auto cleanup when hitting limit to prevent memory leak
      if (next.size > 100) {
        // Keep only the most recent 50 entries
        const sorted = Array.from(next).slice(-50)
        return new Set(sorted)
      }
      return next
    })
  }, [])

  // Show rules modal for a subreddit
  const handleShowRules = useCallback((subreddit: Subreddit) => {
    setRulesModal({ isOpen: true, subreddit })
  }, [])

  // Close rules modal
  const handleCloseRules = useCallback(() => {
    setRulesModal({ isOpen: false, subreddit: null })
  }, [])

  // Update tags for single subreddit using React Query mutation
  const updateTags = useCallback(async (id: number, tags: string[]) => {

    // Check if item should be removed from current view after update
    const nowTagged = tags.length > 0

    // Determine if we should remove the item from view
    let shouldRemove = false

    if (selectedTags.length === 0) {
      // When no specific tags are selected
      if (showUntaggedOnly) {
        // If showing untagged only, remove when item becomes tagged
        shouldRemove = nowTagged
      } else {
        // If showing all, never remove
        shouldRemove = false
      }
    } else {
      // When specific tags are selected, remove if item no longer has selected tags
      shouldRemove = !tags.some(tag => selectedTags.includes(tag))
    }

    if (shouldRemove) {
      // Add to removing list for fade effect
      setRemovingIds(prev => new Set([...prev, id]))

      // Delay actual removal for smooth transition
      setTimeout(() => {
        setRemovingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 300)
    }

    // Execute mutation
    updateTagsMutation.mutate({
      subredditId: id,
      tags
    })
  }, [selectedTags, showUntaggedOnly, updateTagsMutation])

  // Update review for single subreddit (using API as we don't have a mutation for this yet)
  const updateReview = useCallback(async (id: number, reviewText: string) => {
    const subreddit = subreddits.find((sub: Subreddit) => sub.id === id)
    const review = reviewText as 'Ok' | 'No Seller' | 'Non Related' | 'Banned'

    try {
      const response = await fetch(`/api/reddit/subreddits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ review })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update review')
      }

      // Check if we should remove item from categorization view
      // In categorization, we only show "Ok" items, so remove if not Ok
      const shouldRemove = review !== 'Ok'

      if (shouldRemove) {
        // Add to removing list for fade effect
        setRemovingIds(prev => new Set([...prev, id]))

        // Delay actual removal for smooth transition
        setTimeout(() => {
          setRemovingIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          // Refetch to update the list
          refetchSubreddits()
        }, 300)
      }

      addToast({
        type: 'success',
        title: 'Review Updated',
        description: `${subreddit?.display_name_prefixed} marked as ${review}`,
        duration: 5000
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: `Failed to update ${subreddit?.display_name_prefixed}. Please try again.`,
        duration: 5000
      })
    }
  }, [subreddits, addToast, refetchSubreddits])

  // Tag operation functions
  const addTag = useCallback(async (id: number, tagToAdd: string) => {
    const subreddit = subreddits.find((sub: Subreddit) => sub.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
    if (!currentTags.includes(tagToAdd)) {
      updateTags(id, [...currentTags, tagToAdd])
    }
  }, [subreddits, updateTags])

  const removeTag = useCallback(async (id: number, tagToRemove: string) => {
    const subreddit = subreddits.find((sub: Subreddit) => sub.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
    updateTags(id, currentTags.filter((t: string) => t !== tagToRemove))
  }, [subreddits, updateTags])

  const updateSingleTag = useCallback(async (id: number, oldTag: string, newTag: string) => {
    const subreddit = subreddits.find((sub: Subreddit) => sub.id === id)
    if (!subreddit) return

    const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
    updateTags(id, currentTags.map((t: string) => t === oldTag ? newTag : t))
  }, [subreddits, updateTags])

  // Handle opening AI categorization modal
  const handleCategorizeAll = useCallback(() => {
    if (!tagCounts || tagCounts.untagged === 0) {
      addToast({
        type: 'info',
        title: 'No Uncategorized Items',
        description: 'All subreddits have already been categorized!',
        duration: 3000
      })
      return
    }
    setShowAIModal(true)
  }, [tagCounts, addToast])

  // Handle starting AI categorization with settings
  const handleStartAICategorization = useCallback(async (settings: AICategorizationSettings) => {
    setCategorizationLogs([`Starting AI tagging with up to ${settings.limit} items...`])

    // Let backend handle finding uncategorized subreddits
    // This ensures we always get fresh data from the database
    aiCategorizationMutation.mutate(
      {
        subredditIds: undefined,  // Backend will find all uncategorized items
        batchSize: settings.batchSize,
        limit: settings.limit,
        onProgress: (progress: number) => {
          setCategorizationLogs(prev => [...prev, `Progress: ${progress}%`])
        }
      },
      {
        onSuccess: (results: Array<{ id: number; tags: string[] }>) => {
          setCategorizationLogs(prev => [...prev, `✅ Categorization completed successfully!`])
          setCategorizationLogs(prev => [...prev, `📊 Processed ${results.length} items`])

          // Close modal after showing results
          setTimeout(() => {
            setShowAIModal(false)
            setCategorizationLogs([])
          }, 5000)
        },
        onError: (error: unknown) => {
          const errorMsg = error instanceof Error ? error.message : 'Failed to start AI categorization'
          setCategorizationLogs(prev => [...prev, `❌ Error: ${errorMsg}`])
        }
      }
    )
  }, [aiCategorizationMutation])

  // Bulk tags update using React Query mutation
  const updateBulkTags = useCallback(async (tags: string[]) => {
    const selectedIds = Array.from(selectedSubreddits)
    if (selectedIds.length === 0) return

    bulkUpdateMutation.mutate(
      {
        subredditIds: selectedIds,
        tags
      },
      {
        onSuccess: () => {
          // Clear selection after success
          setSelectedSubreddits(new Set())
        }
      }
    )
  }, [selectedSubreddits, bulkUpdateMutation])

  // Handle reaching end of list for infinite scroll
  const handleReachEnd = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Categorization</h2>

        {/* Progress Bar and AI Review Cards */}
        <div className="mb-6">
          <ComponentErrorBoundary>
            {isLoading ? (
              <div className="flex gap-3">
                <div className={cn("flex-1 h-20 animate-pulse", designSystem.borders.radius.md, designSystem.background.surface.light)} />
                <div className={cn("w-32 h-20 animate-pulse", designSystem.borders.radius.md, designSystem.background.surface.light)} />
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                {/* Progress Bar Card - 80% width */}
                <div className={cn("flex-1 min-w-0 bg-white/80 backdrop-blur-sm border border-default p-4 shadow-sm hover:shadow-md transition-shadow", designSystem.borders.radius.md)}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn("text-sm font-semibold whitespace-nowrap", designSystem.typography.color.primary)}>
                      Categorization Progress
                    </h3>
                    <div className="text-right flex-shrink-0 ml-4">
                      {isLoadingCounts ? (
                        <div className="animate-pulse">
                          <div className={cn("h-6 w-12 rounded mb-1", designSystem.background.surface.neutral)}></div>
                          <div className={cn("h-3 w-20 rounded", designSystem.background.surface.neutral)}></div>
                        </div>
                      ) : (
                        <>
                          <span className={cn("text-lg font-bold", designSystem.typography.color.primary)}>
                            {tagCounts ? Math.round((tagCounts.tagged / Math.max(1, tagCounts.tagged + tagCounts.untagged)) * 100) : 0}%
                          </span>
                          <p className={cn("text-xs mt-0.5", designSystem.typography.color.subtle)}>
                            {formatNumber(tagCounts?.tagged || 0)} / {formatNumber((tagCounts?.tagged || 0) + (tagCounts?.untagged || 0))}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {isLoadingCounts ? (
                    <div className={cn("h-3 rounded animate-pulse", designSystem.background.surface.neutral)} />
                  ) : (
                    <Progress
                      value={tagCounts && (tagCounts.tagged + tagCounts.untagged) > 0
                        ? (tagCounts.tagged / (tagCounts.tagged + tagCounts.untagged)) * 100
                        : 0
                      }
                      className="h-3"
                    />
                  )}
                </div>

                {/* AI Review Button using standardized component */}
                <button
                  onClick={handleCategorizeAll}
                  disabled={isLoading || aiCategorizationMutation.isPending || !tagCounts || tagCounts.untagged === 0}
                  className={cn("group relative min-h-[100px] w-[140px] px-4 overflow-hidden transition-all duration-300 hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed", designSystem.borders.radius.lg)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 12px 32px -8px rgba(236, 72, 153, 0.25), inset 0 2px 2px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/25 via-secondary/25 to-blue-400/25" />

                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={cn("absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl", designSystem.borders.radius.lg)} />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center">
                    <Sparkles className="h-5 w-5 text-primary mb-1 group-hover:text-primary-hover transition-colors" />
                    <span className="text-xs font-semibold bg-gradient-to-r from-primary-hover to-secondary-hover bg-clip-text text-transparent text-center">
                      {aiCategorizationMutation.isPending
                        ? 'Processing...'
                        : !tagCounts || tagCounts.untagged === 0
                        ? 'All done!'
                        : `AI Tagging`}
                    </span>
                    {!aiCategorizationMutation.isPending && tagCounts && tagCounts.untagged > 0 && (
                      <span className={cn("text-[10px] mt-0.5", designSystem.typography.color.subtle)}>
                        {Math.min(tagCounts.untagged, 500)} items
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}
          </ComponentErrorBoundary>
        </div>

        {/* Toolbar with search and tag filter */}
        <div className="mb-4">
          <ComponentErrorBoundary>
            <div className="flex gap-3 items-center">
              {/* Simplified StandardToolbar */}
              <div className="flex-1">
                <StandardToolbar
                  // Search
                  searchValue={searchQuery}
                  onSearchChange={handleSearchChange}

                  // Bulk actions (when items selected)
                  selectedCount={selectedSubreddits.size}
                  bulkActions={selectedSubreddits.size > 0 ? [
                    {
                      id: 'bulk-tag',
                      label: 'Add Tags',
                      icon: Tag,
                      onClick: () => {
                        // Show tag selection dialog
                        const tagInput = prompt('Enter tags for selected items (comma-separated):')
                        if (tagInput !== null) {
                          const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
                          if (tags.length > 0) {
                            updateBulkTags(tags)
                          }
                        }
                      },
                      variant: 'secondary'
                    }
                  ] : []}
                  onClearSelection={() => setSelectedSubreddits(new Set())}

                  loading={isLoading || bulkUpdateMutation.isPending}
                  accentColor="linear-gradient(135deg, #FF8395, #FF7A85)"
                />
              </div>

              {/* Tag Filter Dropdown on the right */}
              <TagFilterDropdown
                availableTags={availableTags || []}
                selectedTags={selectedTags}
                onTagsChange={handleTagChange}
                showUntaggedOnly={showUntaggedOnly}
                onShowUntaggedChange={setShowUntaggedOnly}
                loading={isLoading}
              />
            </div>
          </ComponentErrorBoundary>
        </div>

        {/* Main Categorization Interface */}
        <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="space-y-6">
              <TableSkeleton />
            </div>
          ) : (
            <ComponentErrorBoundary>
              <UniversalTable
                variant="standard"
                mode="category"
                subreddits={subreddits}
                selectedSubreddits={selectedSubreddits}
                setSelectedSubreddits={setSelectedSubreddits}
                onBulkUpdateTags={updateBulkTags}
                onUpdateReview={updateReview}
                onUpdateSingleTag={updateSingleTag}
                onRemoveTag={removeTag}
                onAddTag={addTag}
                loading={isLoading}
                hasMore={hasNextPage || false}
                loadingMore={isFetchingNextPage}
                onReachEnd={handleReachEnd}
                searchQuery={debouncedSearchQuery}
                brokenIcons={brokenIcons}
                handleIconError={handleIconError}
                onShowRules={handleShowRules}
                testId="categorization-table"
                removingIds={removingIds}
              />
            </ComponentErrorBoundary>
          )}
        </div>

        {/* Rules Modal */}
        {rulesModal.isOpen && rulesModal.subreddit && (
          <SubredditRulesModal
            isOpen={rulesModal.isOpen}
            onClose={handleCloseRules}
            subreddit={rulesModal.subreddit}
          />
        )}

        {/* AI Categorization Modal */}
        <AICategorizationModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onStart={handleStartAICategorization}
          uncategorizedCount={tagCounts?.untagged || 0}
          availableCategories={availableCategories}
          isProcessing={aiCategorizationMutation.isPending}
          logs={categorizationLogs}
        />
      </div>
    </DashboardLayout>
  )
}