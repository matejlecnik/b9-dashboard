'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { type Subreddit } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetricsCards } from '@/components/MetricsCards'
import { VirtualizedSubredditTable } from '@/components/VirtualizedSubredditTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/SkeletonLoaders'
import { useToast } from '@/components/ui/toast'
import { useErrorHandler } from '@/lib/errorUtils'
import { CategorySearchAndFilters } from '@/components/CategorySearchAndFilters'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { useDebounce } from '@/hooks/useDebounce'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type FilterType = 'uncategorized' | 'categorized'
type SubredditQuery = any


const PAGE_SIZE = 50 // Load 50 records at a time

export default function CategorizationPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null)
  
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalSubreddits, setTotalSubreddits] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('categorized')
  const [categoryCounts, setCategoryCounts] = useState({
    uncategorized: 0,
    categorized: 0
  })
  // Pre-populate with static categories to prevent API calls, then update with database data
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [categorizingAll, setCategorizingAll] = useState(false)
  const [isCategoryFiltering, setIsCategoryFiltering] = useState(false)
  const didAutoSwitchRef = useRef(false)
  const [bulkCategory, setBulkCategory] = useState('')
  
  // Initialize Supabase client on mount (consistent with app-wide client)
  useEffect(() => {
    try {
      setSupabaseClient(supabase)
    } catch (e) {
      console.error('Supabase client initialization failed', e)
    }
  }, [])
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Memoized filtered subreddits based on debounced search query
  const filteredSubreddits = useMemo(() => {
    // If no search query, return all subreddits (they're already filtered server-side)
    if (!debouncedSearchQuery.trim()) {
      return subreddits
    }

    // Apply client-side search filter
    const query = debouncedSearchQuery.toLowerCase()
    return subreddits.filter(subreddit => 
      subreddit.name.toLowerCase().includes(query) ||
      subreddit.display_name_prefixed.toLowerCase().includes(query) ||
      subreddit.title?.toLowerCase().includes(query) ||
      subreddit.top_content_type?.toLowerCase().includes(query) ||
      subreddit.category_text?.toLowerCase().includes(query)
    )
  }, [subreddits, debouncedSearchQuery])

  // Use all filtered subreddits
  const displayedSubreddits = filteredSubreddits

  // Handle search query change with debouncing
  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setSearchQuery(query)
    })
  }, [])

  // Handle category filter change
  const handleCategoryChange = useCallback((categories: string[]) => {
    React.startTransition(() => {
      setSelectedCategories(categories)
      // Automatically enable category filtering when categories are selected
      if (categories.length > 0 && !isCategoryFiltering) {
        setIsCategoryFiltering(true)
      }
    })
  }, [isCategoryFiltering])

  // Handle category filter toggle
  const handleToggleCategoryFilter = useCallback(() => {
    React.startTransition(() => {
      setIsCategoryFiltering(!isCategoryFiltering)
      // Don't clear categories when toggling - preserve user selections
    })
  }, [isCategoryFiltering])

  // Handle select all categories - use current availableCategories instead of hardcoded list
  const handleSelectAll = useCallback(() => {
    React.startTransition(() => {
      setSelectedCategories(availableCategories)
      setIsCategoryFiltering(true)
    })
  }, [availableCategories])

  // Helper functions for query building
  const applyBaseFilters = useCallback((query: SubredditQuery) => {
    return query
      .eq('review', 'Ok') // Only show OK-reviewed subreddits for categorization
      .not('name', 'ilike', 'u_%') // Exclude user feeds
  }, [])

  const applyCategoryFilters = useCallback((query: SubredditQuery, isCategoryFiltering: boolean, selectedCategories: string[]) => {
    if (isCategoryFiltering && selectedCategories.length > 0) {
      // Server-side category filtering - only fetch matching categories
      return query.in('category_text', selectedCategories)
    } else if (isCategoryFiltering && selectedCategories.length === 0) {
      // When category filtering is ON but no specific categories selected,
      // show ALL categorized subreddits (not uncategorized ones)
      return query.not('category_text', 'is', null).neq('category_text', '')
    }
    return query
  }, [])

  const applyStandardFilters = useCallback((query: SubredditQuery, currentFilter: FilterType) => {
    if (currentFilter === 'uncategorized') {
      // Uncategorized = NULL or empty string
      return query.or('category_text.is.null,category_text.eq.')
    } else if (currentFilter === 'categorized') {
      // Categorized = NOT NULL and not empty
      return query.not('category_text', 'is', null).neq('category_text', '')
    }
    return query
  }, [])

  const buildFilteredQuery = useCallback((baseQuery: SubredditQuery) => {
    let query = applyBaseFilters(baseQuery)
    
    if (isCategoryFiltering) {
      query = applyCategoryFilters(query, isCategoryFiltering, selectedCategories)
    } else {
      query = applyStandardFilters(query, currentFilter)
    }
    
    return query
  }, [applyBaseFilters, applyCategoryFilters, applyStandardFilters, isCategoryFiltering, selectedCategories, currentFilter])


  // Optimized fetch counts and category statistics (no full-table scans)
  const fetchCounts = useCallback(async () => {
    if (!supabaseClient) {
      console.warn('Supabase client not initialized')
      return
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)

    try {
      // Fetch counts in parallel using head:true to avoid data transfer
      const base = supabaseClient.from('subreddits')
      const baseFilters = (q: SubredditQuery) => q.eq('review', 'Ok').not('name', 'ilike', 'u_%')

      const [totalRes, categorizedRes, uncategorizedRes, todayRes, weekRes, categoriesResp] = await Promise.all([
        baseFilters(base.select('*', { count: 'exact', head: true })),
        baseFilters(base.select('*', { count: 'exact', head: true })).not('category_text', 'is', null).neq('category_text', ''),
        baseFilters(base.select('*', { count: 'exact', head: true })).or('category_text.is.null,category_text.eq.'),
        baseFilters(base.select('*', { count: 'exact', head: true })).not('category_text', 'is', null).neq('category_text', '').gte('updated_at', todayMidnight.toISOString()),
        baseFilters(base.select('*', { count: 'exact', head: true })).not('category_text', 'is', null).neq('category_text', '').gte('updated_at', sevenDaysAgo.toISOString()),
        fetch('/api/categories?limit=2000', { cache: 'no-store' }).then(res => res.ok ? res.json() : { categories: [] })
      ])

      const totalCount = (totalRes as any).count || 0
      const categorizedCount = (categorizedRes as any).count || 0
      const uncategorizedCount = (uncategorizedRes as any).count || 0
      const categorizedToday = (todayRes as any).count || 0
      const categorizedThisWeek = (weekRes as any).count || 0
      const dailyVelocity = Math.round(categorizedThisWeek / 7)

      // Derive category stats from API categories response
      const catList: Array<{ name: string; usage_count?: number }> = (categoriesResp as any)?.categories || []
      const totalCategories = catList.length
      const mostUsedCategory = totalCategories > 0
        ? [...catList].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))[0].name
        : ''
      const averageSubredditsPerCategory = totalCategories > 0 ? Math.round(categorizedCount / totalCategories) : 0

      const uniqueCategories = [...new Set(catList.map(c => c.name))].sort((a, b) => a.localeCompare(b))

      React.startTransition(() => {
        setTotalSubreddits(totalCount)
        setCategoryCounts({ uncategorized: uncategorizedCount, categorized: categorizedCount })
        if (uniqueCategories.length > 0) setAvailableCategories(uniqueCategories)

        if (!didAutoSwitchRef.current && currentFilter === 'uncategorized' && uncategorizedCount === 0 && categorizedCount > 0) {
          didAutoSwitchRef.current = true
          setCurrentFilter('categorized')
        }
      })
    } catch (e) {
      console.error('Failed to fetch counts/stats:', e)
    }
  }, [currentFilter, supabaseClient])

  // Fetch paginated subreddits - only OK-reviewed subreddits with server-side filtering
  const fetchSubreddits = useCallback(async (page = 0, append = false) => {
    // Batch loading state updates
    React.startTransition(() => {
      if (page === 0) setLoading(true)
      else setLoadingMore(true)
    })

    await handleAsyncOperation(async () => {
      if (!supabaseClient) {
        throw new Error('Supabase client not initialized')
      }
      
      // Build filtered query using helper functions
      let query = buildFilteredQuery(
        supabaseClient
          .from('subreddits')
          .select('*')
      )

      query = query
        .order('avg_upvotes_per_post', { ascending: false })
        .order('subscribers', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data: subredditData, error: subredditError } = await query
      
      if (subredditError) {
        console.error('Failed to fetch subreddits:', subredditError)
        return
      }

      const newData = subredditData || []
      
      // Batch all data state updates
      React.startTransition(() => {
        setHasMore(newData.length === PAGE_SIZE)
        
        if (append) {
          setSubreddits(prev => [...prev, ...newData])
        } else {
          setSubreddits(newData)
          setCurrentPage(0)
        }
      })

      // Fetch counts on initial load (non-blocking)
      if (page === 0) {
        fetchCounts().catch((e) => console.error('fetchCounts failed:', e))
      }

      // If uncategorized view is empty, auto-switch to categorized (once).
      if (!append && page === 0 && newData.length === 0 && currentFilter === 'uncategorized' && !didAutoSwitchRef.current) {
        didAutoSwitchRef.current = true
        React.startTransition(() => {
          setCurrentFilter('categorized')
        })
      }
    }, {
      context: 'subreddit_fetch',
      retries: 2,
      onError: (error) => {
        console.error('Failed to fetch subreddits:', error)
        // Keep existing data on error to avoid blank screen
      }
    })
    
    // Batch loading completion state updates
    React.startTransition(() => {
      if (page === 0) setLoading(false)
      else setLoadingMore(false)
    })
  }, [currentFilter, isCategoryFiltering, selectedCategories, handleAsyncOperation, supabaseClient, buildFilteredQuery])


  const updateCategory = useCallback(async (id: number, categoryText: string) => {
    const subreddit = subreddits.find(sub => sub.id === id)
    
    await handleAsyncOperation(async () => {
      if (!supabaseClient) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabaseClient
        .from('subreddits')
        .update({ category_text: categoryText })
        .eq('id', id)
      if (error) throw new Error(`Failed to update category: ${error.message}`)
      return { subreddit, categoryText }
    }, {
      context: 'category_update',
      showToast: false,
      onSuccess: ({ subreddit, categoryText }) => {
        // Batch all success state updates
        React.startTransition(() => {
          // Optimistic update - update the subreddit immediately
          setSubreddits(prev => prev.map(sub => 
            sub.id === id 
              ? { ...sub, category_text: categoryText }
              : sub
          ))
          
          const wasCategorized = (subreddit?.category_text || '').trim() !== ''
          const nowCategorized = categoryText.trim() !== ''

          // If switching views, remove item from current list accordingly
          if (currentFilter === 'uncategorized' && nowCategorized) {
            setSubreddits(prev => prev.filter(sub => sub.id !== id))
          }
          if (currentFilter === 'categorized' && !nowCategorized) {
            setSubreddits(prev => prev.filter(sub => sub.id !== id))
          }

          // Update counts based on transition
          if (wasCategorized !== nowCategorized) {
            setCategoryCounts(prev => ({
              uncategorized: Math.max(0, prev.uncategorized + (nowCategorized ? -1 : 1)),
              categorized: Math.max(0, prev.categorized + (nowCategorized ? 1 : -1))
            }))
          }
        })
        
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
        // Call fetchSubreddits directly to avoid circular dependency
        React.startTransition(() => {
          setCurrentPage(0)
          setHasMore(true)
        })
        // Simplified refresh without circular deps
        fetchSubreddits(0, false).catch(console.error)
      }
    })
  }, [subreddits, handleAsyncOperation, currentFilter, addToast, supabaseClient, fetchSubreddits])
  
  // Bulk category update
  const updateBulkCategory = useCallback(async (categoryText: string) => {
    const selectedIds = Array.from(selectedSubreddits)
    if (selectedIds.length === 0) return
    
    await handleAsyncOperation(async () => {
      if (!supabaseClient) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabaseClient
        .from('subreddits')
        .update({ category_text: categoryText })
        .in('id', selectedIds)
      if (error) throw new Error(`Failed to update categories: ${error.message}`)
      return { count: selectedIds.length, categoryText }
    }, {
      context: 'bulk_category_update',
      showToast: false,
      onSuccess: ({ count, categoryText }) => {
        // Batch all bulk update success state changes
        React.startTransition(() => {
          // Update all selected subreddits
          setSubreddits(prev => prev.map(sub => 
            selectedSubreddits.has(sub.id)
              ? { ...sub, category_text: categoryText }
              : sub
          ))
          
          // Clear selection
          setSelectedSubreddits(new Set())
        })
        
        addToast({ 
          type: 'success', 
          title: 'Bulk Update Complete', 
          description: (categoryText || '').trim() === ''
            ? `${count} subreddits set to Uncategorized`
            : `${count} subreddits assigned to ${categoryText}`, 
          duration: 3000 
        })
        
        // Refresh counts
        fetchCounts().catch(console.error)
      },
      onError: () => { 
        // Call fetchSubreddits directly to avoid circular dependency
        React.startTransition(() => {
          setCurrentPage(0)
          setHasMore(true)
        })
        fetchSubreddits(0, false).catch(console.error)
      }
    })
  }, [selectedSubreddits, handleAsyncOperation, addToast, supabaseClient, fetchCounts, fetchSubreddits])

  const handleCategorizeAll = async () => {
    React.startTransition(() => {
      setCategorizingAll(true)
    })
    
    try {
      const response = await fetch('/api/categorize-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to start AI categorization')
      }
      
      await response.json()
      
      addToast({
        type: 'success',
        title: 'AI Categorization Started',
        description: `Processing ${categoryCounts.uncategorized} uncategorized subreddits...`,
        duration: 5000
      })
      
      // Refresh data after a delay to see results
      setTimeout(() => {
        React.startTransition(() => {
          setCurrentPage(0)
          setHasMore(true)
        })
        fetchSubreddits(0, false)
      }, 3000)
      
    } catch (error) {
      console.error('Error starting AI categorization:', error)
      addToast({
        type: 'error',
        title: 'AI Categorization Failed',
        description: 'Failed to start AI categorization. Please try again.',
        duration: 5000
      })
    } finally {
      React.startTransition(() => {
        setCategorizingAll(false)
      })
    }
  }

  // Removed unused IntersectionObserver in favor of virtualized onReachEnd

  // Consolidated data fetching and real-time subscriptions
  useEffect(() => {
    if (!supabaseClient) return
    
    let cancelled = false
    let channel: ReturnType<SupabaseClient['channel']> | null = null
    let refreshTimeout: NodeJS.Timeout | null = null
    let refreshInterval: NodeJS.Timeout | null = null
    
    // Reset pagination state
    React.startTransition(() => {
      setCurrentPage(0)
      setHasMore(true)
    })
    
    const initializeData = async () => {
      try {
        if (!cancelled) {
          await fetchSubreddits(0, false)
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Initial fetchSubreddits failed:', e)
        }
      }
    }
    
    // Set up real-time subscription with debounced refresh
    const setupSubscription = () => {
      if (cancelled || !supabaseClient) return
      
      channel = supabaseClient
        .channel('categorization-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'subreddits' },
          () => { 
            if (!cancelled) {
              // Debounce rapid changes with 2-second delay
              if (refreshTimeout) clearTimeout(refreshTimeout)
              refreshTimeout = setTimeout(() => {
                if (!cancelled) {
                  React.startTransition(() => {
                    setCurrentPage(0)
                    setHasMore(true)
                  })
                  fetchSubreddits(0, false).catch(console.error)
                }
              }, 2000)
            }
          }
        )
        .subscribe()
    }
    
    // Set up periodic refresh (15 minutes) - integrated into main effect
    const setupPeriodicRefresh = () => {
      if (cancelled) return
      
      refreshInterval = setInterval(() => {
        if (!cancelled) {
          React.startTransition(() => {
            setCurrentPage(0)
            setHasMore(true)
          })
          fetchSubreddits(0, false).catch(console.error)
        }
      }, 900000) // 15 minutes
    }
    
    // Initialize everything
    initializeData()
    setupSubscription()
    setupPeriodicRefresh()
    
    return () => {
      cancelled = true
      if (refreshTimeout) clearTimeout(refreshTimeout)
      if (refreshInterval) clearInterval(refreshInterval)
      if (channel) {
        supabaseClient.removeChannel(channel).catch(console.error)
      }
    }
  }, [currentFilter, isCategoryFiltering, selectedCategories, supabaseClient, fetchSubreddits])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* Metrics Cards */}
        <ComponentErrorBoundary componentName="Metrics Cards">
          {loading ? (
            <MetricsCardsSkeleton />
          ) : (
            <MetricsCards 
              totalSubreddits={totalSubreddits}
              uncategorizedCount={categoryCounts.uncategorized}
              newTodayCount={0}
              loading={loading}
            />
          )}
        </ComponentErrorBoundary>

        {/* Category Search and Filters */}
        <CategorySearchAndFilters
          currentFilter={currentFilter}
          onFilterChange={(value) => {
            React.startTransition(() => {
              setCurrentFilter(value)
              // Clear selected categories when switching to uncategorized
              if (value === 'uncategorized') {
                setSelectedCategories([])
                setIsCategoryFiltering(false)
              }
            })
          }}
          categoryCounts={categoryCounts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
          loading={loading}
          onCategorizeAll={handleCategorizeAll}
          categorizingAll={categorizingAll}
          isCategoryFiltering={isCategoryFiltering}
          onToggleCategoryFilter={handleToggleCategoryFilter}
          onSelectAll={handleSelectAll}
          availableCategories={availableCategories}
        />


        {/* Main Categorization Interface */}
        <div className="flex-1 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
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
            {loading ? (
              <TableSkeleton />
            ) : (
              <ComponentErrorBoundary componentName="Subreddit Table">
                <div className="flex-1 min-h-0 relative">
                  <VirtualizedSubredditTable
                    subreddits={displayedSubreddits}
                    selectedSubreddits={selectedSubreddits}
                    setSelectedSubreddits={setSelectedSubreddits}
                    onUpdateCategory={updateCategory}
                    availableCategories={availableCategories}
                    loading={loading}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onReachEnd={() => {
                      if (loading || loadingMore || !hasMore) return
                      setCurrentPage((prev) => {
                        const next = prev + 1
                        void fetchSubreddits(next, true)
                        return next
                      })
                    }}
                    searchQuery={debouncedSearchQuery}
                  />
                </div>
              </ComponentErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}