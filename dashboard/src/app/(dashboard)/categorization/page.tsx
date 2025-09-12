'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit } from '@/lib/supabase'
import { UniversalTable, createCategorizationTable } from '@/components/UniversalTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { TableSkeleton } from '@/components/UniversalLoading'
import { useErrorHandler } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/UniversalErrorBoundary'
import { CategoryFilterDropdown } from '@/components/CategoryFilterDropdown'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Sparkles } from 'lucide-react'
import { AICategorizationModal, type AICategorizationSettings } from '@/components/AICategorizationModal'


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

  // Update category for single subreddit
  const updateCategory = useCallback(async (id: number, categoryText: string) => {
    const subreddit = subreddits.find(sub => sub.id === id)
    
    await handleAsyncOperation(async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase
        .from('subreddits')
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

        // If switching views, remove item from current list
        if (selectedCategories.length === 0 && nowCategorized) {
          setSubreddits(prev => prev.filter(sub => sub.id !== id))
        }
        if (selectedCategories.length > 0 && !nowCategorized) {
          setSubreddits(prev => prev.filter(sub => sub.id !== id))
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
    setShowAIModal(false)
    setCategorizingAll(true)
    setCategorizationLogs([]) // Clear previous logs
    
    try {
      // Add initial log
      setCategorizationLogs(prev => [...prev, `Starting AI categorization with ${settings.limit} items...`])
      
      const response = await fetch('/api/ai/categorize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: settings.batchSize,
          limit: settings.limit,
          model: settings.model,
          temperature: settings.temperature,
          categories: settings.categories,
          apiKeyOverride: settings.apiKeyOverride
        })
      })
      
      // Log response status
      setCategorizationLogs(prev => [...prev, `API Response: ${response.status} ${response.statusText}`])
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start AI categorization')
      }
      
      if (data.success) {
        setCategorizationLogs(prev => [...prev, `Successfully started categorization for ${data.estimated_subreddits || settings.limit} subreddits`])
        
        addToast({
          type: 'success',
          title: 'AI Categorization Started',
          description: `Processing ${data.estimated_subreddits || settings.limit} subreddits with ${settings.model}...`,
          duration: 5000
        })
        
        // Auto-refresh based on settings
        if (settings.autoRefreshDelay > 0) {
          setTimeout(() => {
            fetchSubreddits(0, false)
          }, settings.autoRefreshDelay)
        }
      } else {
        throw new Error(data.error || 'Categorization failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start AI categorization'
      setCategorizationLogs(prev => [...prev, `Error: ${errorMsg}`])
      
      console.error('AI categorization error:', error)
      addToast({
        type: 'error',
        title: 'AI Categorization Failed',
        description: errorMsg,
        duration: 5000
      })
      
      // Keep modal open if there was an error to show logs
      setShowAIModal(true)
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
        .from('subreddits')
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
          <ComponentErrorBoundary componentName="Progress and AI Cards">
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
                        {categoryCounts.categorized.toLocaleString()} / {(categoryCounts.categorized + categoryCounts.uncategorized).toLocaleString()}
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
                
                {/* AI Review Button - Glass Morphism */}
                <button
                  onClick={handleCategorizeAll}
                  disabled={loading || categorizingAll || categoryCounts.uncategorized === 0}
                  className="group relative px-5 py-3.5 min-w-[130px] overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20" />
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center">
                    <Sparkles className="h-5 w-5 text-pink-500 mb-1 group-hover:text-pink-600 transition-colors" />
                    <span className="text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      AI Review
                    </span>
                    <span className="text-[10px] text-gray-600 mt-0.5">
                      {categorizingAll 
                        ? 'Processing...' 
                        : categoryCounts.uncategorized === 0
                        ? 'All done!'
                        : `${Math.min(categoryCounts.uncategorized, 500)} items`
                      }
                    </span>
                  </div>
                </button>
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
              {selectedSubreddits.size.toLocaleString()} selected
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
              <ComponentErrorBoundary componentName="Categorization Table">
                <UniversalTable
                  {...createCategorizationTable({
                    subreddits: displayedSubreddits,
                    selectedSubreddits,
                    setSelectedSubreddits,
                    onUpdateCategory: updateCategory,
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
                    testId: 'categorization-table'
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