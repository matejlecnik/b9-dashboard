'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit } from '@/lib/supabase/index'
import { UniversalTable, createCategorizationTable } from '@/components/UniversalTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { TableSkeleton } from '@/components/UniversalLoading'
import { useErrorHandler } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { CategoryFilterDropdown } from '@/components/CategoryFilterDropdown'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Sparkles } from 'lucide-react'
import { AICategorizationModal, type AICategorizationSettings } from '@/components/AICategorizationModal'
import { formatNumber } from '@/lib/utils'


const PAGE_SIZE = 50 // Standard page size

export default function CategorizationPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState({
    uncategorized: 0,
    categorized: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [brokenIcons, setBrokenIcons] = useState<Set<number>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'Age Demographics',
    'Ass & Booty',
    'Body Types & Features',
    'Boobs & Chest',
    'Clothed & Dressed',
    'Cosplay & Fantasy',
    'Ethnic & Cultural',
    'Feet & Foot Fetish',
    'Full Body & Nude',
    'Goth & Alternative',
    'Gym & Fitness',
    'Interactive & Personalized',
    'Lifestyle & Themes',
    'Lingerie & Underwear',
    'OnlyFans Promotion',
    'Selfie & Amateur',
    'Specific Body Parts'
  ])
  const [bulkCategory, setBulkCategory] = useState('')
  const [categorizingAll, setCategorizingAll] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [categorizationLogs, setCategorizationLogs] = useState<string[]>([])
  const fetchingPageRef = useRef<number | null>(null)
  const [lastAction, setLastAction] = useState<{
    type: 'single' | 'bulk'
    items: Array<{ id: number, prevReview: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null }>
  } | null>(null)
  const recentlyUpdatedIdsRef = useRef<Set<number>>(new Set())
  
  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  
  // Use server-side filtering
  const displayedSubreddits = subreddits

  // Handle search query change with performance optimization
  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setSearchQuery(query)
    })
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

  // Handle category filter change
  const handleCategoryChange = useCallback((categories: string[]) => {
    React.startTransition(() => {
      setSelectedCategories(categories)
    })
  }, [])

  // Close rules modal
  const handleCloseRules = useCallback(() => {
    setRulesModal({ isOpen: false, subreddit: null })
  }, [])

  // Show rules modal for a subreddit
  const handleShowRules = useCallback((subreddit: Subreddit) => {
    setRulesModal({ isOpen: true, subreddit })
  }, [])

  // Load available categories once
  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/categories?limit=1000')
        if (!res.ok) return
        const json = await res.json()
        const rawNames: string[] = (((json?.categories as Array<{ name?: unknown }> | undefined) ?? [])
          .map((c) => c?.name)
          .filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0)) as string[]
        const uniqueNames: string[] = Array.from(new Set<string>(rawNames))
        const names: string[] = uniqueNames.sort((a: string, b: string) => a.localeCompare(b))
        if (isMounted && names.length > 0) {
          React.startTransition(() => {
            setAvailableCategories(names)
          })
        }
      } catch {}
    })()
    return () => { isMounted = false }
  }, [])

  // Simplified subreddit fetching - matching subreddit-review pattern
  const fetchSubreddits = useCallback(async (page = 0, append = false) => {
    // Prevent duplicate fetches
    if (fetchingPageRef.current === page) {
      console.log('🚫 [CATEGORIZATION] Skipping duplicate fetch for page', page)
      return
    }
    
    fetchingPageRef.current = page
    
    if (page === 0) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      // Build API request URL with query parameters
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
        filter: selectedCategories.length === 0 ? 'uncategorized' : 'categorized',
        stats: page === 0 ? 'true' : 'false', // Get stats on first page
      })

      // Add category filter if categories are selected
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','))
      }

      // Always restrict to reviewed Ok subreddits for categorization
      params.append('review', 'Ok')

      // Add search query if active
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim())
      }

      const apiUrl = `/api/subreddits?${params.toString()}`
      console.log('🔄 [CATEGORIZATION] API request URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      const result = await response.json()
      
      console.log('🔄 [CATEGORIZATION] API result:', { 
        success: result.success, 
        dataLength: result.subreddits?.length || 0,
        hasError: !response.ok,
        errorMessage: result.error
      })

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch subreddits')
      }

      const newData = result.subreddits || []
      console.log('✅ [CATEGORIZATION] Fetched subreddits successfully:', { 
        count: newData.length, 
        page, 
        sampleData: newData.slice(0, 2).map((s: { name?: string; category_text?: string | null }) => ({name: s.name, category: s.category_text})) 
      })
      setHasMore(result.hasMore || false)
      
      if (append) {
        setSubreddits(prev => {
          const updated = [...prev, ...newData]
          console.log('✅ [CATEGORIZATION] Updated subreddits (append):', { 
            previousCount: prev.length, 
            newCount: newData.length, 
            totalCount: updated.length 
          })
          return updated
        })
      } else {
        setSubreddits(newData)
        setCurrentPage(0)
        console.log('✅ [CATEGORIZATION] Updated subreddits (replace):', { 
          newCount: newData.length,
          firstItem: newData[0]?.name || 'none'
        })
      }

      // Update counts if available - these are already filtered for OK subreddits
      if (page === 0 && result.stats) {
        setCategoryCounts({
          uncategorized: result.stats.uncategorized || 0,
          categorized: result.stats.categorized || 0
        })
      }
      
    } catch (error) {
      console.error('❌ [CATEGORIZATION] fetchSubreddits error:', error)
      addToast({
        type: 'error',
        title: 'Failed to load subreddits',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      // Always update loading states in finally block
      if (page === 0) {
        console.log('✅ [CATEGORIZATION] Setting loading to false for page 0 (finally)')
        setLoading(false)
      } else {
        console.log('✅ [CATEGORIZATION] Setting loadingMore to false for page', page, '(finally)')
        setLoadingMore(false)
      }
      // Clear the fetching flag
      fetchingPageRef.current = null
    }
  }, [debouncedSearchQuery, selectedCategories, addToast])

  // Undo last action (single review update)
  const undoLastAction = useCallback(async () => {
    if (!lastAction) return

    try {
      // Apply reverts sequentially using API
      for (const item of lastAction.items) {
        const response = await fetch(`/api/subreddits/${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ review: item.prevReview })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to undo review for subreddit ${item.id}`)
        }
      }

      setLastAction(null)
      addToast({
        type: 'success',
        title: 'Undo Complete',
        description: 'Reverted the last review change.',
        duration: 3000
      })

      // Refresh to show the reverted item back in the list
      fetchSubreddits(0, false)
    } catch (error) {
      console.error('Undo failed:', error)
      addToast({
        type: 'error',
        title: 'Undo Failed',
        description: 'Could not revert the last change. Please try again.',
        duration: 5000
      })
    }
  }, [lastAction, addToast, fetchSubreddits])

  // Update review for single subreddit - matching subreddit-review page pattern
  const updateReview = useCallback(async (id: number, reviewText: string) => {
    const subreddit = subreddits.find(sub => sub.id === id)
    const review = reviewText as 'Ok' | 'No Seller' | 'Non Related'

    await handleAsyncOperation(async () => {
      const response = await fetch(`/api/subreddits/${id}`, {
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

      return { subreddit, review }
    }, {
      context: 'review_update',
      showToast: false,
      onSuccess: ({ subreddit, review }) => {
        // Track this as our own update to avoid reacting to Supabase realtime updates
        recentlyUpdatedIdsRef.current.add(id)
        setTimeout(() => {
          recentlyUpdatedIdsRef.current.delete(id)
        }, 2000)

        // Store undo information
        const prevReview = subreddit?.review ?? null
        setLastAction({ type: 'single', items: [{ id, prevReview }] })

        // Check if we should remove item from categorization view
        // In categorization, we only show "Ok" items, so remove if not Ok
        const shouldRemove = review !== 'Ok'

        if (shouldRemove) {
          // Add to removing list for fade effect
          setRemovingIds(prev => new Set([...prev, id]))

          // Update counts immediately for better UX
          if (selectedCategories.length === 0) {
            // We're in uncategorized view
            setCategoryCounts(prev => ({
              ...prev,
              uncategorized: Math.max(0, prev.uncategorized - 1)
            }))
          } else {
            // We're in categorized view
            setCategoryCounts(prev => ({
              ...prev,
              categorized: Math.max(0, prev.categorized - 1)
            }))
          }

          // Delay actual removal for smooth transition
          setTimeout(() => {
            setSubreddits(prev => prev.filter(sub => sub.id !== id))
            setRemovingIds(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }, 300)
        } else {
          // Update in place - item stays as Ok
          setSubreddits(prev => prev.map(sub =>
            sub.id === id
              ? { ...sub, review }
              : sub
          ))
        }

        addToast({
          type: 'success',
          title: 'Review Updated',
          description: `${subreddit?.display_name_prefixed} marked as ${review}`,
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => { void undoLastAction() }
          }
        })
      },
      onError: () => {
        // Don't refetch all data on error - let user retry
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: `Failed to update ${subreddit?.display_name_prefixed}. Please try again.`,
          duration: 5000
        })
      }
    })
  }, [subreddits, handleAsyncOperation, addToast, selectedCategories, undoLastAction])

  // Update category for single subreddit
  const updateCategory = useCallback(async (id: number, categoryText: string) => {
    const subreddit = subreddits.find(sub => sub.id === id)
    
    await handleAsyncOperation(async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase
        .from('reddit_subreddits')
        .update({ category_text: categoryText })
        .eq('id', id)
      if (error) throw new Error(`Failed to update category: ${error.message}`)
      return { subreddit, categoryText }
    }, {
      context: 'category_update',
      showToast: false,
      onSuccess: ({ subreddit, categoryText }) => {
        // Optimistic update
        setSubreddits(prev => prev.map(sub => 
          sub.id === id 
            ? { ...sub, category_text: categoryText }
            : sub
        ))
        
        const wasCategorized = (subreddit?.category_text || '').trim() !== ''
        const nowCategorized = categoryText.trim() !== ''

        // Check if item should be removed from current view
        const shouldRemove = (
          (selectedCategories.length === 0 && nowCategorized) ||
          (selectedCategories.length > 0 && !nowCategorized)
        )

        if (shouldRemove) {
          // Add to removing list for fade effect
          setRemovingIds(prev => new Set([...prev, id]))

          // Delay actual removal for smooth transition
          setTimeout(() => {
            setSubreddits(prev => prev.filter(sub => sub.id !== id))
            setRemovingIds(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }, 300)
        }

        // Update counts
        if (wasCategorized !== nowCategorized) {
          setCategoryCounts(prev => ({
            uncategorized: Math.max(0, prev.uncategorized + (nowCategorized ? -1 : 1)),
            categorized: Math.max(0, prev.categorized + (nowCategorized ? 1 : -1))
          }))
        }
        
        addToast({ 
          type: 'success', 
          title: categoryText.trim() === '' ? 'Category Cleared' : 'Category Updated', 
          description: categoryText.trim() === ''
            ? `${subreddit?.display_name_prefixed} set to Uncategorized`
            : `${subreddit?.display_name_prefixed} assigned to ${categoryText}`, 
          duration: 3000 
        })
      },
      onError: () => { 
        fetchSubreddits(0, false)
      }
    })
  }, [subreddits, handleAsyncOperation, selectedCategories, addToast, fetchSubreddits])

  // Handle opening AI categorization modal
  const handleCategorizeAll = useCallback(() => {
    if (categoryCounts.uncategorized === 0) {
      addToast({
        type: 'info',
        title: 'No Uncategorized Items',
        description: 'All subreddits have already been categorized!',
        duration: 3000
      })
      return
    }
    setShowAIModal(true)
  }, [categoryCounts.uncategorized, addToast])
  
  // Handle starting AI categorization with settings
  const handleStartAICategorization = useCallback(async (settings: AICategorizationSettings) => {
    // Keep modal open to show logs
    setCategorizingAll(true)
    setCategorizationLogs([]) // Clear previous logs
    
    try {
      // Add initial log
      setCategorizationLogs(prev => [...prev, `Starting AI tagging with ${settings.limit} items...`])
      
      const response = await fetch('/api/categorization/tags/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_size: settings.batchSize,
          limit: settings.limit
        })
      })
      
      // Log response status
      setCategorizationLogs(prev => [...prev, `API Response: ${response.status} ${response.statusText}`])
      
      const data = await response.json()
      
      // Comprehensive logging
      console.log('=== FRONTEND RECEIVED DATA ===')
      console.log('Full data:', JSON.stringify(data, null, 2))
      console.log('Data keys:', Object.keys(data))
      if (data.render_response) {
        console.log('Render response keys:', Object.keys(data.render_response))
        console.log('Render response:', JSON.stringify(data.render_response, null, 2))
      }
      console.log('==============================')
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start AI categorization')
      }
      
      // Check if we have the actual categorization results
      const renderResponse = data.render_response
      
      if (renderResponse && renderResponse.status === 'completed' && renderResponse.results) {
        // We have the complete results from the backend
        const results = renderResponse.results
        console.log('Processing completed results:', results)
        console.log('Stats:', results.stats)
        console.log('Individual results:', results.results)
        
        setCategorizationLogs(prev => [...prev, `✅ Categorization completed successfully!`])
        setCategorizationLogs(prev => [...prev, `📊 Processed: ${results.stats?.total_processed || 0} items`])
        setCategorizationLogs(prev => [...prev, `✓ Successful: ${results.stats?.successful || 0}`])
        setCategorizationLogs(prev => [...prev, `✗ Errors: ${results.stats?.errors || 0}`])
        setCategorizationLogs(prev => [...prev, `💰 Total cost: $${results.stats?.total_cost?.toFixed(4) || '0.00'}`])
        
        // Add individual results if available
        if (results.results && Array.isArray(results.results)) {
          setCategorizationLogs(prev => [...prev, `📝 Individual Results:`])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results.results.forEach((result: any) => {
            if (result.success) {
              setCategorizationLogs(prev => [...prev, `  ✓ ${result.subreddit_name} → ${result.category}`])
            } else {
              setCategorizationLogs(prev => [...prev, `  ✗ ${result.subreddit_name}: ${result.error_message || 'Failed'}`])
            }
          })
        }
        
        addToast({
          type: 'success',
          title: 'AI Tagging Complete',
          description: `Successfully tagged ${results.stats?.successful || 0} out of ${results.stats?.total_processed || 0} subreddits`,
          duration: 5000
        })
        
        // Auto-refresh after a delay to show updated results
        setTimeout(() => {
          fetchSubreddits(0, false)
        }, 2000)
        
        // Close modal after showing results for a few seconds
        setTimeout(() => {
          setShowAIModal(false)
          setCategorizationLogs([])
        }, 10000) // Keep modal open for 10 seconds to show results
      } else if (data.success) {
        // The categorization has been started but we don't have results yet
        console.log('Processing success response without completed status')
        console.log('Render response:', renderResponse)
        
        setCategorizationLogs(prev => [...prev, `📋 Job ID: ${data.job_id || 'N/A'}`])
        setCategorizationLogs(prev => [...prev, `🔄 Processing ${data.estimated_subreddits || settings.limit} subreddits...`])
        
        // Check different possible response structures
        if (renderResponse) {
          // Log what we received
          setCategorizationLogs(prev => [...prev, `📦 Response type: ${typeof renderResponse}`])
          setCategorizationLogs(prev => [...prev, `📦 Response status: ${renderResponse.status || 'processing'}`])

          if (renderResponse.message) {
            setCategorizationLogs(prev => [...prev, `📢 ${renderResponse.message}`])

            // Check if the message indicates an error
            if (renderResponse.message.includes('Failed') || renderResponse.message.includes('Error')) {
              setCategorizationLogs(prev => [...prev, `⚠️ Warning: ${renderResponse.message}`])
            }
          }

          // Check if results are directly in renderResponse (not nested)
          if (renderResponse.stats) {
            const stats = renderResponse.stats
            console.log('Found stats directly in renderResponse:', stats)
            setCategorizationLogs(prev => [...prev, `✅ Categorization completed!`])
            setCategorizationLogs(prev => [...prev, `📊 Processed: ${stats.total_processed || 0} items`])
            setCategorizationLogs(prev => [...prev, `✓ Successful: ${stats.successful || 0}`])
            setCategorizationLogs(prev => [...prev, `✗ Errors: ${stats.errors || 0}`])
            if (stats.total_cost !== undefined) {
              setCategorizationLogs(prev => [...prev, `💰 Total cost: $${stats.total_cost.toFixed(4)}`])
            }

            // If all items failed, show a warning
            if (stats.total_processed > 0 && stats.successful === 0) {
              setCategorizationLogs(prev => [...prev, `⚠️ All items failed to process. Check Render deployment status.`])
              setCategorizationLogs(prev => [...prev, `💡 Common issues: OpenAI API parameter changes, deployment in progress`])
            }
          }

          // Check if we have individual error results
          if (renderResponse.results && Array.isArray(renderResponse.results)) {
            const errorResults = renderResponse.results.filter((r: any) => !r.success)
            if (errorResults.length > 0) {
              setCategorizationLogs(prev => [...prev, `📝 Error Details:`])
              // Show first 3 errors
              errorResults.slice(0, 3).forEach((result: any) => {
                setCategorizationLogs(prev => [...prev, `  ⚠️ ${result.subreddit_name}: ${result.error_message}`])
              })
              if (errorResults.length > 3) {
                setCategorizationLogs(prev => [...prev, `  ... and ${errorResults.length - 3} more errors`])
              }
            }
          }
        }
        
        // Show appropriate toast based on results
        const hasStats = renderResponse?.stats
        const successCount = hasStats ? (renderResponse.stats.successful || 0) : 0
        const totalCount = hasStats ? (renderResponse.stats.total_processed || 0) : (data.estimated_subreddits || settings.limit)

        if (hasStats && successCount === 0 && totalCount > 0) {
          addToast({
            type: 'error',
            title: 'AI Tagging Failed',
            description: `Failed to process ${totalCount} subreddits. Check the logs for details.`,
            duration: 7000
          })
        } else {
          addToast({
            type: 'success',
            title: 'AI Tagging Complete',
            description: hasStats
              ? `Successfully tagged ${successCount} out of ${totalCount} subreddits`
              : `Processing completed for ${totalCount} subreddits`,
            duration: 5000
          })
        }
        
        // Auto-refresh to show updated results
        setTimeout(() => {
          fetchSubreddits(0, false)
        }, 3000)
        
        // Close modal after a delay
        setTimeout(() => {
          setShowAIModal(false)
          setCategorizationLogs([])
        }, 8000)
      } else {
        throw new Error(data.error || 'Categorization failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start AI categorization'
      setCategorizationLogs(prev => [...prev, `❌ Error: ${errorMsg}`])
      
      console.error('AI tagging error:', error)
      addToast({
        type: 'error',
        title: 'AI Tagging Failed',
        description: errorMsg,
        duration: 5000
      })
    } finally {
      setCategorizingAll(false)
    }
  }, [addToast, fetchSubreddits])

  // Bulk category update
  const updateBulkCategory = useCallback(async (categoryText: string) => {
    const selectedIds = Array.from(selectedSubreddits)
    if (selectedIds.length === 0) return
    
    await handleAsyncOperation(async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase
        .from('reddit_subreddits')
        .update({ category_text: categoryText })
        .in('id', selectedIds)
      if (error) throw new Error(`Failed to update categories: ${error.message}`)
      return { count: selectedIds.length, categoryText }
    }, {
      context: 'bulk_category_update',
      showToast: false,
      onSuccess: ({ count, categoryText }) => {
        // Update all selected subreddits
        setSubreddits(prev => prev.map(sub => 
          selectedSubreddits.has(sub.id)
            ? { ...sub, category_text: categoryText }
            : sub
        ))
        
        // Clear selection
        setSelectedSubreddits(new Set())
        
        addToast({ 
          type: 'success', 
          title: 'Bulk Update Complete', 
          description: (categoryText || '').trim() === ''
            ? `${count} subreddits set to Uncategorized`
            : `${count} subreddits assigned to ${categoryText}`, 
          duration: 3000 
        })
      },
      onError: () => { 
        fetchSubreddits(0, false)
      }
    })
  }, [selectedSubreddits, handleAsyncOperation, addToast, fetchSubreddits])

  // Simplified data loading on mount and filter changes
  useEffect(() => {
    console.log('🔄 [CATEGORIZATION] useEffect triggered - initializing data fetch', { 
      currentFilter: selectedCategories.length === 0 ? 'uncategorized' : 'categorized', 
      selectedCategories: selectedCategories.length, 
      debouncedSearchQuery
    })
    setCurrentPage(0)
    setHasMore(true)
    
    // Simple loading: just fetch the data
    console.log('🔄 [CATEGORIZATION] Calling fetchSubreddits...')
    fetchSubreddits(0, false).catch((error) => {
      console.error('❌ [CATEGORIZATION] fetchSubreddits failed:', error)
    })
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, selectedCategories])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen min-h-0">
        <h2 className="sr-only">Subreddit Categorization</h2>

        {/* Progress Bar and AI Review Cards */}
        <div className="mb-6">
          <ComponentErrorBoundary>
            {loading ? (
              <div className="flex gap-3">
                <div className="flex-1 h-20 bg-gray-100 rounded-xl animate-pulse" />
                <div className="w-32 h-20 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="flex gap-3">
                {/* Progress Bar Card - 80% width */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Categorization Progress
                    </h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round((categoryCounts.categorized / Math.max(1, categoryCounts.categorized + categoryCounts.uncategorized)) * 100)}%
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatNumber(categoryCounts.categorized)} / {formatNumber(categoryCounts.categorized + categoryCounts.uncategorized)}
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={categoryCounts.categorized + categoryCounts.uncategorized > 0 
                      ? (categoryCounts.categorized / (categoryCounts.categorized + categoryCounts.uncategorized)) * 100
                      : 0
                    }
                    className="h-3"
                  />
                </div>
                
                {/* AI Review Button using standardized component */}
                <Button
                  onClick={handleCategorizeAll}
                  disabled={loading || categorizingAll || categoryCounts.uncategorized === 0}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {categorizingAll
                      ? 'Processing...'
                      : categoryCounts.uncategorized === 0
                      ? 'All done!'
                      : `AI Tagging (${Math.min(categoryCounts.uncategorized, 500)} items)`}
                  </span>
                </Button>
              </div>
            )}
          </ComponentErrorBoundary>
        </div>

        {/* Combined Toolbar: Search on left, Filters on right */}
        <div className="flex items-stretch gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
          {/* Search Section - Left Side */}
          <div className="flex items-center flex-1 min-w-0 max-w-xs">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder=""
                title="Search subreddits by name, title, or description"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={loading || loadingMore}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent transition-all duration-200 h-8 relative"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Spacer to push filter to the right */}
          <div className="flex-1" />

          {/* Category Filter Dropdown - Right Side */}
          <div className="flex items-center gap-2 ml-auto">
            <CategoryFilterDropdown
              availableCategories={availableCategories}
              selectedCategories={selectedCategories}
              onCategoriesChange={handleCategoryChange}
              loading={loading}
              uncategorizedCount={categoryCounts.uncategorized}
              categorizedCount={categoryCounts.categorized}
            />
          </div>
        </div>

        {/* Bulk Actions Toolbar (only when items selected) */}
        {selectedSubreddits.size > 0 && (
          <div className="mb-4 p-3 bg-white/70 backdrop-blur-md border border-pink-100 rounded-xl flex items-center gap-3">
            <div className="text-sm font-medium">
              {formatNumber(selectedSubreddits.size)} selected
            </div>
            <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v)}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const value = (bulkCategory || '').trim()
                if (value === '' || availableCategories.includes(value)) {
                  updateBulkCategory(value)
                } else {
                  addToast({
                    type: 'warning',
                    title: 'Unknown category',
                    description: 'Please select a category from the list.',
                    duration: 3000
                  })
                }
              }}
              disabled={loading}
              className="h-9"
            >
              Apply to selected
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedSubreddits(new Set())}
              className="h-9"
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Main Categorization Interface */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="space-y-6">
              <TableSkeleton />
            </div>
          ) : (
            <>
              <ComponentErrorBoundary>
                <UniversalTable
                  {...createCategorizationTable({
                    subreddits: displayedSubreddits,
                    selectedSubreddits,
                    setSelectedSubreddits,
                    onUpdateCategory: updateCategory,
                    onUpdateReview: updateReview,
                    availableCategories,
                    loading,
                    hasMore,
                    loadingMore,
                    onReachEnd: () => {
                      if (loading || loadingMore || !hasMore || fetchingPageRef.current !== null) return
                      const nextPage = currentPage + 1
                      setCurrentPage(nextPage)
                      // Append next page
                      void fetchSubreddits(nextPage, true)
                    },
                    searchQuery: debouncedSearchQuery,
                    brokenIcons,
                    handleIconError,
                    onShowRules: handleShowRules,
                    testId: 'categorization-table',
                    removingIds
                  })}
                />
              </ComponentErrorBoundary>
            </>
          )}
        </div>

        {/* Enhanced Rules Modal */}
        {rulesModal.isOpen && rulesModal.subreddit && (
          <div 
            className="fixed inset-0 z-50 p-4 flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(6px) saturate(140%)',
              WebkitBackdropFilter: 'blur(6px) saturate(140%)'
            }}
            onClick={handleCloseRules}
          >
            <div 
              className="bg-white/95 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-b9-pink text-white flex items-center justify-center font-bold">
                    {(() => {
                      const dp = rulesModal.subreddit.display_name_prefixed || 'r/'
                      const idx = dp.startsWith('r/') || dp.startsWith('u/') ? 2 : 0
                      const ch = dp.length > idx ? dp.charAt(idx).toUpperCase() : 'R'
                      return ch
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black">
                      {rulesModal.subreddit.display_name_prefixed} Rules
                    </h2>
                    <p className="text-sm text-gray-600">{rulesModal.subreddit.title}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseRules}
                  className="rounded-full p-2 hover:bg-gray-100"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {(() => {
                  try {
                    // Parse rules_data if it exists
                    const rulesData = rulesModal.subreddit.rules_data
                    let rules: Array<{
                      short_name?: string;
                      title?: string;
                      description?: string;
                      violation_reason?: string;
                    }> = []
                    
                    if (rulesData) {
                      if (typeof rulesData === 'string') {
                        try {
                          // Skip empty strings entirely
                          if (rulesData.trim() === '') {
                            rules = []
                          } else {
                            const parsed = JSON.parse(rulesData)
                            rules = Array.isArray(parsed) ? parsed : (parsed.rules && Array.isArray(parsed.rules)) ? parsed.rules : []
                          }
                        } catch (error) {
                          console.warn('Failed to parse rules data:', error)
                          rules = []  // Default to empty array on parse error
                        }
                      } else if (Array.isArray(rulesData)) {
                        rules = rulesData
                      } else if (typeof rulesData === 'object' && rulesData !== null && 'rules' in rulesData && Array.isArray((rulesData as {rules: unknown}).rules)) {
                        rules = (rulesData as {rules: typeof rules}).rules
                      }
                    }

                    if (rules && rules.length > 0) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800">Subreddit Rules</h3>
                            <a
                              href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-b9-pink hover:underline"
                            >
                              View on Reddit →
                            </a>
                          </div>
                          <div className="space-y-3">
                            {rules.map((rule, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-b9-pink text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">
                                      {rule.short_name || rule.title || `Rule ${index + 1}`}
                                    </h4>
                                    {rule.description && (
                                      <p className="text-sm text-gray-600 leading-relaxed">
                                        {rule.description}
                                      </p>
                                    )}
                                    {rule.violation_reason && rule.violation_reason !== rule.short_name && (
                                      <p className="text-xs text-gray-500 mt-1 italic">
                                        Violation: {rule.violation_reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="text-center py-8">
                          <div className="mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-2xl text-gray-400">📋</span>
                            </div>
                            <p className="text-gray-600">No rules data available for this subreddit.</p>
                            <p className="text-sm text-gray-500 mt-1">Rules may not have been scraped yet or the subreddit has no posted rules.</p>
                          </div>
                          <a
                            href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-b9-pink hover:underline"
                          >
                            View on Reddit →
                          </a>
                        </div>
                      )
                    }
                  } catch (error) {
                    console.error('Error parsing rules data:', error)
                    return (
                      <div className="text-center py-8">
                        <div className="mb-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl text-gray-700">⚠️</span>
                          </div>
                          <p className="text-gray-600">Error loading rules data.</p>
                          <p className="text-sm text-gray-500 mt-1">The rules data may be malformed or corrupted.</p>
                        </div>
                        <a
                          href={`https://www.reddit.com/${rulesModal.subreddit.display_name_prefixed}/about/rules`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-b9-pink hover:underline"
                        >
                          View on Reddit →
                        </a>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        )}
        
        {/* AI Categorization Modal */}
        <AICategorizationModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onStart={handleStartAICategorization}
          uncategorizedCount={categoryCounts.uncategorized}
          availableCategories={availableCategories}
          isProcessing={categorizingAll}
          logs={categorizationLogs}
        />
      </div>
    </DashboardLayout>
  )
}