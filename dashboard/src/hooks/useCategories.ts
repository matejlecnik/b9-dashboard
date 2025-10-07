
import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

interface Category {
  id: string
  name: string
  description?: string | null
  color?: string
  usage_count?: number
  created_at?: string
  updated_at?: string
}

// Fallback categories if API is unavailable
const FALLBACK_CATEGORIES: string[] = [
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
]

/**
 * Custom hook for fetching and caching categories
 * Uses React Query for automatic caching, background updates, and error handling
 */
export function useCategories() {
  const { data: categories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/reddit/categories', { cache: 'no-store' })
        
        if (!res.ok) {
          throw new Error('Failed to load categories')
        }
        
        const json = await res.json()
        const categoryList: Category[] = json?.categories || []
        
        // Extract and sort category names
        const names = categoryList
          .map(c => c?.name)
          .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        
        return Array.from(new Set(names)).sort()
      } catch (error) {
        logger.warn('Failed to fetch categories, using fallback:', error)
        return FALLBACK_CATEGORIES
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    categories,
    isLoading,
    error,
    refetch,
    FALLBACK_CATEGORIES
  }
}

// Category colors for enhanced visual experience
export const CATEGORY_COLORS: Record<string, string> = {
  'Ass & Booty': 'bg-gradient-to-r from-primary to-rose-500 text-white',
  'Boobs & Chest': 'bg-gradient-to-r from-primary to-primary text-white',
  'Feet & Foot Fetish': 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
  'Lingerie & Underwear': 'bg-gradient-to-r from-violet-500 to-secondary text-white',
  'Cosplay & Fantasy': 'bg-gradient-to-r from-gray-600 to-secondary text-white',
  'Gym & Fitness': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
  'Selfie & Amateur': 'bg-gradient-to-r from-primary to-emerald-500 text-white',
  'OnlyFans Promotion': 'bg-gradient-to-r from-blue-600 to-gray-700 text-white',
  'Goth & Alternative': 'bg-gradient-to-r from-gray-800 to-gray-900 text-white',
  'Body Types & Features': 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  'Age Demographics': 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white',
  'Ethnic & Cultural': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
  'Clothed & Dressed': 'bg-gradient-to-r from-slate-500 to-gray-600 text-white',
  'Interactive & Personalized': 'bg-gradient-to-r from-fuchsia-500 to-primary text-white',
  'Lifestyle & Themes': 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
  'Full Body & Nude': 'bg-gradient-to-r from-gray-800 to-primary text-white',
  'Specific Body Parts': 'bg-gradient-to-r from-lime-500 to-green-500 text-white'
}