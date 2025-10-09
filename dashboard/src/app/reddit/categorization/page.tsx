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
import { Sparkles, Tag } from 'lucide-react'
import { formatNumber } from '@/lib/formatters'
import { ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'
import { TagFilterDropdown } from '@/components/shared/TagFilterDropdown'
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'
import { UniversalProgressCard } from '@/components/shared/cards/UniversalProgressCard'
import { UniversalInputModal } from '@/components/shared/modals/UniversalInputModal'

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
import { createRedditCategorizationColumns } from '@/components/shared/tables/configs/redditCategorizationColumns'
import type { TableConfig } from '@/components/shared/tables/types'

interface AICategorizationSettings {
  limit: number
  batchSize: number
  useSmartMatching?: boolean
  confidence?: number
}

// Dynamic imports for heavy components
const UniversalTableV2 = dynamic(
  () => import('@/components/shared/tables/UniversalTableV2').then(mod => mod.UniversalTableV2),
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

export default function CategorizationPage() {
  const { addToast } = useToast()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showUntaggedOnly, setShowUntaggedOnly] = useState(true) // Default to showing untagged
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })
  const [showAIModal, setShowAIModal] = useState(false)
  const [categorizationLogs, setCategorizationLogs] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [showTagModal, setShowTagModal] = useState(false)

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
    // Execute mutation
    updateTagsMutation.mutate({
      subredditId: id,
      tags
    })
  }, [updateTagsMutation])

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

      // Refetch to update the list
      refetchSubreddits()

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

  // Create table configuration with column definitions
  const tableConfig: TableConfig<Subreddit> = React.useMemo(() => ({
    columns: createRedditCategorizationColumns({
      onUpdateReview: (id: number, review: string) => updateReview(id, review),
      onShowRules: handleShowRules,
      onUpdateSingleTag: updateSingleTag,
      onRemoveTag: removeTag,
      onAddTag: addTag
    }),
    showCheckbox: true,
    emptyState: {
      title: searchQuery ? 'No subreddits found matching your search' : 'No subreddits to categorize',
      description: searchQuery ? 'Try adjusting your search query' : undefined
    }
  }), [searchQuery, updateReview, handleShowRules, updateSingleTag, removeTag, addTag])

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
                {/* Progress Card using UniversalProgressCard */}
                <UniversalProgressCard
                  title="Categorization Progress"
                  value={`${tagCounts ? Math.floor((tagCounts.tagged / Math.max(1, tagCounts.tagged + tagCounts.untagged)) * 100) : 0}%`}
                  subtitle={`${formatNumber(tagCounts?.tagged || 0)} / ${formatNumber((tagCounts?.tagged || 0) + (tagCounts?.untagged || 0))}`}
                  percentage={tagCounts && (tagCounts.tagged + tagCounts.untagged) > 0
                    ? Math.floor((tagCounts.tagged / (tagCounts.tagged + tagCounts.untagged)) * 100)
                    : 0
                  }
                  loading={isLoadingCounts}
                  className="flex-1"
                />

                {/* AI Review Button using StandardActionButton */}
                <div className="flex-1 max-w-[200px]">
                  <StandardActionButton
                    onClick={handleCategorizeAll}
                    label={aiCategorizationMutation.isPending
                      ? 'Processing...'
                      : !tagCounts || tagCounts.untagged === 0
                      ? 'All done!'
                      : 'AI Tagging'}
                    icon={Sparkles}
                    loading={aiCategorizationMutation.isPending}
                    disabled={!tagCounts || tagCounts.untagged === 0}
                    variant="primary"
                    size="normal"
                  />
                </div>
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
                      onClick: () => setShowTagModal(true),
                      variant: 'secondary'
                    }
                  ] : []}
                  onClearSelection={() => setSelectedSubreddits(new Set())}

                  loading={isLoading || bulkUpdateMutation.isPending}
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
          <ComponentErrorBoundary>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <UniversalTableV2
              data={subreddits}
              config={tableConfig as any}
              loading={isLoading}
              selectedItems={selectedSubreddits}
              onSelectionChange={(ids) => setSelectedSubreddits(ids as Set<number>)}
              getItemId={(subreddit: any) => subreddit.id}
              searchQuery={debouncedSearchQuery}
              onReachEnd={handleReachEnd}
              hasMore={hasNextPage}
              loadingMore={isFetchingNextPage}
            />
          </ComponentErrorBoundary>
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

        {/* Tag Input Modal */}
        <UniversalInputModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onConfirm={(tagInput) => {
            const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
            if (tags.length > 0) {
              updateBulkTags(tags)
            }
            setShowTagModal(false)
          }}
          title="Add Tags"
          subtitle="Enter tags separated by commas"
          placeholder="e.g., anime, gaming, technology"
          suggestions={availableTags || []}
          icon={Tag}
          platform="reddit"
        />
      </div>
    </DashboardLayout>
  )
}