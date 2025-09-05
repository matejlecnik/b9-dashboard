'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Subreddit, type Category } from '@/lib/supabase'
import { MetricsCards } from '@/components/MetricsCards'
import { SubredditTable } from '@/components/SubredditTable'
import { DashboardLayout } from '@/components/DashboardLayout'
import { MetricsCardsSkeleton, TableSkeleton } from '@/components/SkeletonLoaders'
import { useToast } from '@/components/ui/toast'
import { useErrorHandler } from '@/lib/errorUtils'
import { UnifiedFilters } from '@/components/UnifiedFilters'

type FilterType = 'uncategorized' | 'all' | string // category ID as string

const PAGE_SIZE = 50 // Load 50 records at a time

export default function CategorizationPage() {
  const { addToast } = useToast()
  const { handleAsyncOperation } = useErrorHandler()
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<number>>(new Set())
  const [totalSubreddits, setTotalSubreddits] = useState(0)
  const [currentFilter, setCurrentFilter] = useState<FilterType>('uncategorized')
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({
    all: 0,
    uncategorized: 0
  })
  const [newTodayCount, setNewTodayCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const observerRef = useRef<HTMLDivElement>(null)

  const filteredSubreddits = subreddits.filter(subreddit => {
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

  const displayedSubreddits = filteredSubreddits

  const handleSearchChange = (query: string) => setSearchQuery(query)

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      } else {
        console.error('Failed to fetch categories:', data.error)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch counts only (fast query)
  const fetchCounts = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    // Build count queries dynamically based on available categories
    const countQueries = [
      supabase.from('subreddits').select('*', { count: 'exact', head: true }),
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).is('category_id', null),
      supabase.from('subreddits').select('*', { count: 'exact', head: true }).gte('created_at', today)
    ]

    // Add count queries for each category
    categories.forEach(category => {
      countQueries.push(
        supabase.from('subreddits').select('*', { count: 'exact', head: true }).eq('category_id', category.id)
      )
    })

    const results = await Promise.all(countQueries)
    results.forEach((result) => { if (result.error) throw new Error(result.error.message) })

    const totalCount = results[0].count || 0
    const uncategorizedCount = results[1].count || 0
    const newTodayCount = results[2].count || 0

    const newCategoryCounts: Record<string, number> = {
      all: totalCount,
      uncategorized: uncategorizedCount
    }

    // Add counts for each category
    categories.forEach((category, index) => {
      newCategoryCounts[category.id.toString()] = results[3 + index].count || 0
    })

    setTotalSubreddits(totalCount)
    setNewTodayCount(newTodayCount)
    setCategoryCounts(newCategoryCounts)
  }

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Fetch paginated subreddits
  const fetchSubreddits = async (page = 0, append = false) => {
    if (page === 0) setLoading(true)
    else setLoadingMore(true)

    await handleAsyncOperation(async () => {
      let query = supabase
        .from('subreddits')
        .select(`
          *, 
          rules_data,
          category:categories(id, name, description, color)
        `)

      // Apply filters based on current selection
      if (currentFilter === 'uncategorized') {
        query = query.is('category_id', null)
      } else if (currentFilter === 'all') {
        // No filter - show all subreddits
      } else if (currentFilter !== 'all') {
        // Filter by specific category ID
        const categoryId = parseInt(currentFilter, 10)
        if (!isNaN(categoryId)) {
          query = query.eq('category_id', categoryId)
        }
      }

      query = query
        .order('avg_upvotes_per_post', { ascending: false })
        .order('subscribers', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data: subredditData, error: subredditError } = await query
      if (subredditError) throw new Error(`Failed to fetch subreddits: ${subredditError.message}`)

      const newData = subredditData || []
      setHasMore(newData.length === PAGE_SIZE)
      
      if (append) {
        setSubreddits(prev => [...prev, ...newData])
      } else {
        setSubreddits(newData)
        setCurrentPage(0)
      }

      // Only fetch counts on initial load
      if (page === 0 && categories.length > 0) {
        await fetchCounts()
      }
    })
    
    if (page === 0) setLoading(false)
    else setLoadingMore(false)
  }

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    await fetchSubreddits(nextPage, true)
  }, [currentPage, loadingMore, hasMore, currentFilter])

  const updateCategory = async (id: number, categoryId: number) => {
    const subreddit = subreddits.find(sub => sub.id === id)
    const category = categories.find(cat => cat.id === categoryId)
    
    await handleAsyncOperation(async () => {
      const { error } = await supabase
        .from('subreddits')
        .update({ category_id: categoryId })
        .eq('id', id)
      if (error) throw new Error(`Failed to update category: ${error.message}`)
      return { subreddit, category }
    }, {
      context: 'category_update',
      showToast: false,
      onSuccess: ({ subreddit, category }) => {
        // Update the subreddit in place instead of removing it
        setSubreddits(prev => prev.map(sub => 
          sub.id === id 
            ? { ...sub, category_id: categoryId, category }
            : sub
        ))
        setSelectedSubreddits(prev => { const s = new Set(prev); s.delete(id); return s })
        addToast({ 
          type: 'success', 
          title: 'Category Updated', 
          description: `${subreddit?.display_name_prefixed} assigned to ${category?.name}`, 
          duration: 3000 
        })
      },
      onError: () => { fetchSubreddits() }
    })
  }

  const bulkUpdateCategory = async (categoryId: number) => {
    if (selectedSubreddits.size === 0) return
    const ids = Array.from(selectedSubreddits)
    const category = categories.find(cat => cat.id === categoryId)
    
    const { error } = await supabase
      .from('subreddits')
      .update({ category_id: categoryId })
      .in('id', ids)
    
    if (error) {
      addToast({ 
        type: 'error', 
        title: 'Bulk Update Failed', 
        description: 'Failed to update categories. Please try again.', 
        duration: 5000 
      })
      fetchSubreddits()
      return
    }
    
    // Update the subreddits in place
    setSubreddits(prev => prev.map(sub => 
      ids.includes(sub.id)
        ? { ...sub, category_id: categoryId, category }
        : sub
    ))
    setSelectedSubreddits(new Set())
    addToast({ 
      type: 'success', 
      title: 'Bulk Update Complete', 
      description: `${ids.length} subreddit${ids.length > 1 ? 's' : ''} assigned to ${category?.name}`, 
      duration: 3000 
    })
  }

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current)
      }
    }
  }, [loadMore, hasMore, loadingMore])

  // Fetch subreddits when categories are loaded or filter changes
  useEffect(() => { 
    if (categories.length > 0) {
      setCurrentPage(0)
      setHasMore(true)
      fetchSubreddits(0, false) 
    }
  }, [currentFilter, categories])

  return (
    <DashboardLayout title="" showSearch={false}>
      {loading ? <MetricsCardsSkeleton /> : (
        <MetricsCards 
          totalSubreddits={totalSubreddits}
          uncategorizedCount={categoryCounts.uncategorized}
          newTodayCount={newTodayCount}
          loading={loading}
        />
      )}

      <UnifiedFilters
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        categoryCounts={categoryCounts}
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        loading={loading}
      />

      <div 
        className="rounded-2xl sm:rounded-3xl border-0 overflow-hidden shadow-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="px-4 sm:px-6 pb-6 sm:pb-8">
          {loading ? <TableSkeleton /> : (
            <>
              <SubredditTable
                subreddits={displayedSubreddits}
                selectedSubreddits={selectedSubreddits}
                setSelectedSubreddits={setSelectedSubreddits}
                onUpdateCategory={updateCategory}
                onBulkUpdateCategory={bulkUpdateCategory}
                loading={loading}
              />
              
              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={observerRef} className="flex items-center justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-b9-pink"></div>
                      <span className="text-sm text-gray-600">Loading more subreddits...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Scroll to load more</div>
                  )}
                </div>
              )}
              
              {/* End of results */}
              {!hasMore && subreddits.length > 0 && (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500">
                    Showing all {subreddits.length} results
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}


