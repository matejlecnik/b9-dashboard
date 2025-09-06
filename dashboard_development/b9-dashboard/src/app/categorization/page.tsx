'use client'

import { useState, useEffect } from 'react'
import { supabase, type Subreddit } from '../../../lib/supabase'
import { MetricsCards } from '@/components/MetricsCards'
import { SubredditTable } from '@/components/SubredditTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/SkeletonLoaders'
import { useErrorHandler, networkUtils } from '@/lib/errorUtils'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { UnifiedFilters } from '@/components/UnifiedFilters'
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { TablePagination, usePagination } from '@/components/TablePagination'

type FilterType = 'all' | 'uncategorized' | 'ok' | 'no-seller' | 'non-related'

export default function CategorizationPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation, handleError } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [totalSubreddits, setTotalSubreddits] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('uncategorized')
  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    uncategorized: 0,
    ok: 0,
    noSeller: 0,
    nonRelated: 0
  })
  const [newTodayCount, setNewTodayCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination state
  const pagination = usePagination(50) // 50 items per page initially

  // Filter subreddits based on search query
  const filteredSubreddits = subreddits.filter(subreddit => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        subreddit.name.toLowerCase().includes(query) ||
        subreddit.display_name_prefixed.toLowerCase().includes(query) ||
        subreddit.title?.toLowerCase().includes(query) ||
        subreddit.top_content_type?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }

    return true
  })

  // Get paginated data
  const paginatedSubreddits = pagination.getPaginatedData(filteredSubreddits)

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    pagination.resetPagination() // Reset to first page when searching
  }



  // Keyboard shortcuts configuration
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'h',
      ctrl: true,
      action: () => window.location.href = '/',
      description: 'Go to Dashboard Home',
      category: 'Navigation'
    },
    {
      key: 'c',
      ctrl: true,
      action: () => window.location.href = '/categorization',
      description: 'Go to Categorization',
      category: 'Navigation',
      preventDefault: false // Already on categorization, just refresh
    },
    
    // Search and Filtering
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Focus Search Bar',
      category: 'Search'
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Quick Search',
      category: 'Search'
    },
    
    // Bulk Actions
    {
      key: 'a',
      ctrl: true,
      action: () => setSelectedSubreddits(new Set(paginatedSubreddits.map(sub => sub.id))),
      description: 'Select All on Current Page',
      category: 'Actions'
    },
    {
      key: 'Escape',
      action: () => {
        setSelectedSubreddits(new Set())
        setSearchQuery('')
      },
      description: 'Clear Selection & Search',
      category: 'Actions',
      preventDefault: false
    },

    // Pagination
    {
      key: 'ArrowLeft',
      ctrl: true,
      action: () => {
        if (pagination.currentPage > 1) {
          pagination.handlePageChange(pagination.currentPage - 1)
        }
      },
      description: 'Previous Page',
      category: 'Navigation'
    },
    {
      key: 'ArrowRight',
      ctrl: true,
      action: () => {
        const totalPages = Math.ceil(filteredSubreddits.length / pagination.itemsPerPage)
        if (pagination.currentPage < totalPages) {
          pagination.handlePageChange(pagination.currentPage + 1)
        }
      },
      description: 'Next Page',
      category: 'Navigation'
    },
    
    // System
    {
      key: 'r',
      ctrl: true,
      action: () => {
        fetchSubreddits()
        addToast({
          type: 'info',
          title: 'Refreshing Data',
          description: 'Fetching latest subreddit data...',
          duration: 2000
        })
      },
      description: 'Refresh Data',
      category: 'System'
    },
    {
      key: 'F5',
      action: () => {
        fetchSubreddits()
        addToast({
          type: 'info',
          title: 'Refreshing Data',
          description: 'Fetching latest subreddit data...',
          duration: 2000
        })
      },
      description: 'Refresh Data',
      category: 'System'
    },
    
    // Help
    {
      key: '?',
      action: () => {
        // This will be handled by the KeyboardShortcutsHelp component
      },
      description: 'Show Keyboard Shortcuts',
      category: 'Help'
    }
  ]

  // Enable keyboard shortcuts
  useKeyboardShortcuts(shortcuts, !loading)

  // Fetch subreddits based on current filter
  const fetchSubreddits = async () => {
    setLoading(true)
    
    const result = await handleAsyncOperation(async () => {
      // Build query based on current filter
      let query = supabase
        .from('subreddits')
        .select('*, rules_data')

      switch (currentFilter) {
        case 'uncategorized':
          query = query.is('category', null)
          break
        case 'ok':
          query = query.eq('category', 'Ok')
          break
        case 'no-seller':
          query = query.eq('category', 'No Seller')
          break
        case 'non-related':
          query = query.eq('category', 'Non Related')
          break
        case 'all':
        default:
          // No additional filter for 'all'
          break
      }

      // Apply sorting
      query = query
        .order('subscriber_engagement_ratio', { ascending: false })
        .order('subscribers', { ascending: false })

      const { data: subredditData, error: subredditError } = await query

      if (subredditError) throw new Error(`Failed to fetch subreddits: ${subredditError.message}`)

      // Get category counts for metrics
      const today = new Date().toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format
      
      const countQueries = await Promise.all([
        supabase.from('subreddits').select('*', { count: 'exact', head: true }),
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).is('category', null),
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('category', 'Ok'),
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('category', 'No Seller'),
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('category', 'Non Related'),
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).gte('created_at', today)
      ])

      // Check for any errors in count queries
      countQueries.forEach((result, index) => {
        if (result.error) {
          throw new Error(`Failed to fetch category counts: ${result.error.message}`)
        }
      })

      const [
        { count: totalCount },
        { count: uncategorizedCount },
        { count: okCount },
        { count: noSellerCount },
        { count: nonRelatedCount },
        { count: newTodayCount }
      ] = countQueries

      return {
        subredditData: subredditData || [],
        totalCount: totalCount || 0,
        uncategorizedCount: uncategorizedCount || 0,
        okCount: okCount || 0,
        noSellerCount: noSellerCount || 0,
        nonRelatedCount: nonRelatedCount || 0,
        newTodayCount: newTodayCount || 0
      }
    }, {
      context: 'subreddit_fetch',
      retries: 2,
      onSuccess: (data) => {
        setSubreddits(data.subredditData)
        setTotalSubreddits(data.totalCount)
        setNewTodayCount(data.newTodayCount)
        setCategoryCounts({
          all: data.totalCount,
          uncategorized: data.uncategorizedCount,
          ok: data.okCount,
          noSeller: data.noSellerCount,
          nonRelated: data.nonRelatedCount
        })
        setLastUpdated(new Date())
        
        // Reset pagination when data changes
        pagination.handlePageChange(1)
      },
      onError: (error) => {
        // Error is already handled and toasted by handleAsyncOperation
        // Keep existing data on error to avoid blank screen
      }
    })
    
    setLoading(false)
  }

  // Update category for single subreddit
  const updateCategory = async (id: number, category: 'Ok' | 'No Seller' | 'Non Related') => {
    const subreddit = subreddits.find(sub => sub.id === id)
    
    await handleAsyncOperation(async () => {
      const { error } = await supabase
        .from('subreddits')
        .update({ category })
        .eq('id', id)

      if (error) throw new Error(`Failed to update category: ${error.message}`)

      return { subreddit, category }
    }, {
      context: 'category_update',
      showToast: false, // We'll handle toast manually for better UX
      onSuccess: ({ subreddit, category }) => {
        // Remove from local state (optimistic update)
        setSubreddits(prev => prev.filter(sub => sub.id !== id))
        setSelectedSubreddits(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })

        addToast({
          type: 'success',
          title: 'Category Updated',
          description: `${subreddit?.display_name_prefixed} marked as ${category}`,
          duration: 3000
        })
      },
      onError: (error) => {
        addToast({
          type: 'error',
          title: 'Update Failed',
          description: `Failed to update ${subreddit?.display_name_prefixed}. Please try again.`,
          duration: 5000
        })
        // Refresh data on error to ensure consistency
        fetchSubreddits()
      }
    })
  }

  // Bulk update categories
  const bulkUpdateCategory = async (category: 'Ok' | 'No Seller' | 'Non Related') => {
    if (selectedSubreddits.size === 0) return

    try {
      const ids = Array.from(selectedSubreddits)
      const { error } = await supabase
        .from('subreddits')
        .update({ category })
        .in('id', ids)

      if (error) throw error

      // Remove from local state (optimistic update)
      setSubreddits(prev => prev.filter(sub => !selectedSubreddits.has(sub.id)))
      setSelectedSubreddits(new Set())

      addToast({
        type: 'success',
        title: 'Bulk Update Complete',
        description: `${ids.length} subreddit${ids.length > 1 ? 's' : ''} marked as ${category}`,
        duration: 3000
      })
    } catch (error) {
      console.error('Error bulk updating categories:', error)
      addToast({
        type: 'error',
        title: 'Bulk Update Failed',
        description: 'Failed to update categories. Please try again.',
        duration: 5000
      })
      // Refresh data on error
      fetchSubreddits()
    }
  }

  // Set up real-time subscriptions and refresh timer
  useEffect(() => {
    // Initial fetch
    fetchSubreddits()

    // Set up real-time subscription for subreddit changes
    const channel = supabase
      .channel('subreddit-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subreddits'
        },
        () => {
          // Refresh data when changes occur
          fetchSubreddits()
        }
      )
      .subscribe()

    // Set up 1-minute refresh timer
    const refreshInterval = setInterval(() => {
      fetchSubreddits()
    }, 60000) // 1 minute

    return () => {
      supabase.removeChannel(channel)
      clearInterval(refreshInterval)
    }
  }, [currentFilter]) // Re-run when filter changes

  return (
    <DashboardLayout
      title="Categorization"
      subtitle="Subreddit Management & Review"
      lastUpdated={lastUpdated}
      onRefresh={fetchSubreddits}
      isRefreshing={loading}
    >
        {/* Metrics Cards */}
        <ComponentErrorBoundary componentName="Metrics Cards">
          {loading ? (
            <MetricsCardsSkeleton />
          ) : (
            <MetricsCards 
              totalSubreddits={totalSubreddits}
              uncategorizedCount={categoryCounts.uncategorized}
              newTodayCount={newTodayCount}
              loading={loading}
            />
          )}
        </ComponentErrorBoundary>

        {/* Unified Filter System */}
        <UnifiedFilters
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          categoryCounts={categoryCounts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          loading={loading}
        />

        {/* Main Categorization Interface */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border-0 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {currentFilter === 'uncategorized' && 'Uncategorized Subreddits'}
                  {currentFilter === 'all' && 'All Subreddits'}
                  {currentFilter === 'ok' && 'Ok Subreddits'}
                  {currentFilter === 'no-seller' && 'No Seller Subreddits'}
                  {currentFilter === 'non-related' && 'Non Related Subreddits'}
                </h2>
                <p className="text-gray-600 text-base">
                  {currentFilter === 'uncategorized' 
                    ? 'Review and categorize Reddit communities discovered by the scraper'
                    : 'View and manage categorized Reddit communities'
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-6 pb-6 sm:pb-8">
            {loading ? (
              <TableSkeleton />
            ) : (
              <>
                <ComponentErrorBoundary componentName="Subreddit Table">
                  <SubredditTable
                    subreddits={paginatedSubreddits}
                    selectedSubreddits={selectedSubreddits}
                    setSelectedSubreddits={setSelectedSubreddits}
                    onUpdateCategory={updateCategory}
                    onBulkUpdateCategory={bulkUpdateCategory}
                    loading={loading}
                  />
                </ComponentErrorBoundary>
                
                {/* Pagination */}
                {filteredSubreddits.length > 0 && (
                  <ComponentErrorBoundary componentName="Table Pagination">
                    <TablePagination
                      totalItems={filteredSubreddits.length}
                      itemsPerPage={pagination.itemsPerPage}
                      currentPage={pagination.currentPage}
                      onPageChange={pagination.handlePageChange}
                      onItemsPerPageChange={pagination.handleItemsPerPageChange}
                      disabled={loading}
                    />
                  </ComponentErrorBoundary>
                )}
              </>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </DashboardLayout>
  )
}
