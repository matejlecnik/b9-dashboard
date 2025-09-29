'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tag } from 'lucide-react'
import { logger } from '@/lib/logger'
import { useDebounce } from '@/hooks/useDebounce'
import { normalizeCategoryName, FALLBACK_CATEGORIES } from '@/lib/categories'
import { getCategoryStyles } from '@/lib/categoryColors'

// Enhanced caching with timestamp
interface CachedCategories {
  names: string[]
  timestamp: number
}

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes - increased for better performance

declare global {
  var __b9_categories_cache: CachedCategories | null
  var __b9_categories_promise: Promise<string[]> | null
}

interface CategorySelectorProps {
  subredditId: number
  currentCategory: string | null
  onUpdateCategory: (id: number, categoryText: string) => void
  compact?: boolean
  availableCategories?: string[] // Pre-loaded categories from parent
}

interface ApiCategory {
  name: string
  usage_count?: number
}



export function CategorySelector({ 
  subredditId, 
  currentCategory, 
  onUpdateCategory,
  compact = false,
  availableCategories
}: CategorySelectorProps) {
  const { addToast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [options, setOptions] = useState<string[]>(availableCategories || [])
  const searchTerm = ''
  const debouncedSearch = useDebounce(searchTerm, 250)
  
  // Special token used to represent clearing the selection (cannot use empty string in SelectItem)
  const CLEAR_VALUE = '__UNCATEGORIZED__'
  const selectedValue = currentCategory && currentCategory.length > 0 ? currentCategory : CLEAR_VALUE
  
  // Use provided categories or fetch them
  const shouldFetch = !availableCategories || availableCategories.length === 0

  // Use centralized normalization from categories lib

  // Enhanced caching with timestamp validation
  const getCategories = useCallback(async (): Promise<string[]> => {
    // If we have pre-loaded categories, use them
    if (availableCategories && availableCategories.length > 0) {
      return availableCategories
    }
    
    const now = Date.now()
    const cached = globalThis.__b9_categories_cache
    
    // Return valid cache if available
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.names
    }
    
    // Return in-flight promise if exists
    if (globalThis.__b9_categories_promise) {
      return globalThis.__b9_categories_promise
    }

    const fetchPromise: Promise<string[]> = (async () => {
      try {
        const res = await fetch('/api/reddit/categories?limit=500', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`)
        
        const json = await res.json()
        
        if (!json.success) {
          throw new Error(json.error || 'API returned error')
        }
        
        const raw = json.categories as unknown
        const rawArray = Array.isArray(raw) ? raw : []
        const categories: ApiCategory[] = rawArray
          .filter((c: unknown): c is ApiCategory => {
            if (typeof c !== 'object' || c === null) return false
            const name = (c as { name?: unknown }).name
            return typeof name === 'string' && name.trim().length > 0
          })
          .map((c) => ({
            name: (c as { name: string }).name,
            usage_count: (() => {
              const u = (c as { usage_count?: unknown }).usage_count
              return typeof u === 'number' ? u : undefined
            })(),
          }))

        // Sort by usage_count (desc) then name (asc) to prioritize popular categories
        const sortedCategories = categories
          .sort((a, b) => {
            const usageA = a.usage_count || 0
            const usageB = b.usage_count || 0
            if (usageB !== usageA) return usageB - usageA
            return a.name.localeCompare(b.name)
          })
        
        const sortedNames = sortedCategories.map((c) => c.name)
        
        // Update cache with timestamp
        globalThis.__b9_categories_cache = {
          names: sortedNames,
          timestamp: Date.now()
        }
        
        return sortedNames
      } catch (error) {
        logger.warn('Failed to fetch categories from API, using fallback:', error)
        return [...FALLBACK_CATEGORIES]
      }
    })()

    globalThis.__b9_categories_promise = fetchPromise
    const names = await fetchPromise
    globalThis.__b9_categories_promise = null
    return names
  }, [availableCategories])
  
  // Sync options with availableCategories prop changes
  useEffect(() => {
    if (availableCategories && availableCategories.length > 0) {
      setOptions(availableCategories)
    }
  }, [availableCategories])

  useEffect(() => {
    if (!shouldFetch) return
    
    let isMounted = true
    getCategories().then(names => {
      if (isMounted) setOptions(names)
    })
    return () => { isMounted = false }
  }, [shouldFetch, getCategories])

  // Client-side or server-side search based on available data
  useEffect(() => {
    const q = debouncedSearch.trim()
    
    // If we have pre-loaded categories, use client-side filtering
    if (availableCategories && availableCategories.length > 0) {
      if (!q) {
        setOptions(availableCategories)
        return
      }
      // Client-side search - much faster and no API calls
      const filtered = availableCategories.filter(cat => 
        cat.toLowerCase().includes(q.toLowerCase())
      ).sort()
      setOptions(filtered)
      return
    }
    
    // Fallback to server-side search only if no categories provided
    const run = async () => {
      if (!q) {
        // reset to cached or fallback list when search cleared
        const cached = globalThis.__b9_categories_cache
        if (cached && cached.names?.length) {
          setOptions(cached.names)
          return
        }
        // Load base set (limited) if nothing cached
        try {
          const res = await fetch('/api/reddit/categories?limit=500', { cache: 'no-store' })
          if (!res.ok) return
          const json = await res.json()
          if (!json.success) return
          
          const raw = json.categories as unknown
          const rawArray = Array.isArray(raw) ? raw : []
          const categories: ApiCategory[] = rawArray
            .filter((c: unknown): c is ApiCategory => {
              if (typeof c !== 'object' || c === null) return false
              const name = (c as { name?: unknown }).name
              return typeof name === 'string' && name.trim().length > 0
            })
            .map((c) => ({
              name: (c as { name: string }).name,
              usage_count: (() => {
                const u = (c as { usage_count?: unknown }).usage_count
                return typeof u === 'number' ? u : undefined
              })(),
            }))

          const sortedCategories = categories.sort((a, b) => {
            const usageA = a.usage_count || 0
            const usageB = b.usage_count || 0
            if (usageB !== usageA) return usageB - usageA
            return a.name.localeCompare(b.name)
          })
          
          const names = sortedCategories.map((c) => c.name)
          setOptions(names)
        } catch {}
        return
      }
      try {
        const res = await fetch(`/api/reddit/categories?search=${encodeURIComponent(q)}&limit=500`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!json.success) return
        
        const raw = json.categories as unknown
        const rawArray = Array.isArray(raw) ? raw : []
        const categories: ApiCategory[] = rawArray
          .filter((c: unknown): c is ApiCategory => {
            if (typeof c !== 'object' || c === null) return false
            const name = (c as { name?: unknown }).name
            return typeof name === 'string' && name.trim().length > 0
          })
          .map((c) => ({
            name: (c as { name: string }).name,
            usage_count: (() => {
              const u = (c as { usage_count?: unknown }).usage_count
              return typeof u === 'number' ? u : undefined
            })(),
          }))

        const sortedCategories = categories.sort((a, b) => {
          const usageA = a.usage_count || 0
          const usageB = b.usage_count || 0
          if (usageB !== usageA) return usageB - usageA
          return a.name.localeCompare(b.name)
        })
        
        const names = sortedCategories.map((c) => c.name)
        setOptions(names)
      } catch {
        // ignore search errors
      }
    }
    run()
  }, [debouncedSearch, availableCategories])

  const handleCategorySelect = useCallback(async (value: string) => {

    const nextCategoryTextRaw = value === CLEAR_VALUE ? '' : value
    const nextCategoryText = nextCategoryTextRaw ? normalizeCategoryName(nextCategoryTextRaw) : ''
    if (nextCategoryText === (currentCategory || '')) return

    setIsUpdating(true)
    try {
      await onUpdateCategory(subredditId, nextCategoryText)
    } catch (error) {
      logger.error('Error updating category:', error)
      addToast({
        type: 'error',
        title: 'Update failed',
        description: 'Failed to update category. Please try again.',
        duration: 4000
      })
    } finally {
      setIsUpdating(false)
    }
  }, [subredditId, currentCategory, onUpdateCategory, addToast])
  



  if (isUpdating) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-b9-pink"></div>
        <span className="text-sm text-muted-foreground">Updating...</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Select
          value={selectedValue}
          onValueChange={handleCategorySelect}
        >
          <SelectTrigger className="w-[200px] h-7 border border-gray-200 hover:bg-gray-50 transition-colors text-xs">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {/* Allow clearing category */}
            <SelectItem value={CLEAR_VALUE} className="py-1.5">
              <span className="text-xs text-gray-600">Uncategorized</span>
            </SelectItem>
            {options.map((category) => {
              const styles = getCategoryStyles(category)
              return (
                <SelectItem key={category} value={category} className="py-1.5">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-md transition-all inline-block"
                    style={{
                      backgroundColor: styles.backgroundColor,
                      color: styles.color,
                      border: `1px solid ${styles.borderColor}`
                    }}
                  >
                    {category}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2">
      <Select
        value={selectedValue}
        onValueChange={handleCategorySelect}
      >
        <SelectTrigger className="w-full h-8 border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="max-h-80 w-full">
          {/* Allow clearing category */}
          <SelectItem value={CLEAR_VALUE} className="py-1.5">
            <div className="flex items-center space-x-2">
              <Tag className="w-3 h-3" />
              <span className="text-xs">Uncategorized</span>
            </div>
          </SelectItem>
          {options.map((category) => {
            const styles = getCategoryStyles(category)
            return (
              <SelectItem key={category} value={category} className="py-1.5">
                <span 
                  className="text-xs px-2 py-0.5 rounded-md transition-all inline-block"
                  style={{
                    backgroundColor: styles.backgroundColor,
                    color: styles.color,
                    border: `1px solid ${styles.borderColor}`
                  }}
                >
                  {category}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
