/**
 * React Query Configuration
 * Centralized configuration for data fetching with automatic caching
 */

import { QueryClient } from '@tanstack/react-query'

// Create a singleton query client with enhanced configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dynamic stale time based on query type (should be set per-query, not globally)
      staleTime: 2 * 60 * 1000, // Default 2 minutes

      // Cache time: Keep data in memory for 15 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes

      // Retry configuration
      retry: (failureCount: number, error: unknown) => {
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status: number }).status === 'number' &&
          (error as { status: number }).status >= 400 &&
          (error as { status: number }).status < 500
        ) {
          return false
        }
        return failureCount < 3
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Network mode
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
})

// Query key factory for consistent key generation
export const queryKeys = {
  all: ['data'] as const,

  // Reddit queries
  reddit: {
    all: () => [...queryKeys.all, 'reddit'] as const,
    subreddits: (filters?: unknown) => [...queryKeys.reddit.all(), 'subreddits', filters] as const,
    subreddit: (id: number) => [...queryKeys.reddit.all(), 'subreddit', id] as const,
    posts: (filters?: unknown) => [...queryKeys.reddit.all(), 'posts', filters] as const,
    post: (id: string) => [...queryKeys.reddit.all(), 'post', id] as const,
    users: (filters?: unknown) => [...queryKeys.reddit.all(), 'users', filters] as const,
    user: (id: number) => [...queryKeys.reddit.all(), 'user', id] as const,
    categories: () => [...queryKeys.reddit.all(), 'categories'] as const,
    categoryUsage: (id: string) => [...queryKeys.reddit.all(), 'category-usage', id] as const,
    counts: () => [...queryKeys.reddit.all(), 'counts'] as const,
    filters: () => [...queryKeys.reddit.all(), 'filters'] as const,
    reviews: (filters?: unknown) => [...queryKeys.reddit.all(), 'reviews', filters] as const,
    posting: (filters?: unknown) => [...queryKeys.reddit.all(), 'posting', filters] as const,
    userAnalytics: (userId: number) => [...queryKeys.reddit.all(), 'user-analytics', userId] as const,
  },

  // Instagram queries
  instagram: {
    all: () => [...queryKeys.all, 'instagram'] as const,
    creators: (filters?: unknown) => [...queryKeys.instagram.all(), 'creators', filters] as const,
    creator: (id: number) => [...queryKeys.instagram.all(), 'creator', id] as const,
    creatorAnalytics: (id: number) => [...queryKeys.instagram.all(), 'analytics', id] as const,
    metrics: () => [...queryKeys.instagram.all(), 'metrics'] as const,
    niches: () => [...queryKeys.instagram.all(), 'niches'] as const,
    niche: (id: string) => [...queryKeys.instagram.all(), 'niche', id] as const,
    nichingStats: () => [...queryKeys.instagram.all(), 'niching-stats'] as const,
    nichingCreators: (filters?: unknown) => [...queryKeys.instagram.all(), 'niching-creators', filters] as const,
    aiTaggingStats: () => [...queryKeys.instagram.all(), 'ai-tagging-stats'] as const,
    topCreators: (filters?: unknown, limit?: number) => [...queryKeys.instagram.all(), 'top-creators', filters, limit] as const,
    relatedCreators: (creatorId: number) => [...queryKeys.instagram.all(), 'related', creatorId] as const,
    scraperStatus: () => [...queryKeys.instagram.all(), 'scraper-status'] as const,
  },

  // Models queries
  models: {
    all: () => [...queryKeys.all, 'models'] as const,
    list: (filters?: unknown) => [...queryKeys.models.all(), 'list', filters] as const,
    model: (id: number) => [...queryKeys.models.all(), 'model', id] as const,
    analytics: (id: number) => [...queryKeys.models.all(), 'analytics', id] as const,
    campaigns: (modelId: number) => [...queryKeys.models.all(), 'campaigns', modelId] as const,
    revenue: (modelId: number) => [...queryKeys.models.all(), 'revenue', modelId] as const,
  },

  // Monitor queries
  monitor: {
    all: () => [...queryKeys.all, 'monitor'] as const,
    reddit: {
      status: () => [...queryKeys.monitor.all(), 'reddit', 'status'] as const,
      accounts: () => [...queryKeys.monitor.all(), 'reddit', 'accounts'] as const,
      queue: () => [...queryKeys.monitor.all(), 'reddit', 'queue'] as const,
      metrics: () => [...queryKeys.monitor.all(), 'reddit', 'metrics'] as const,
    },
    instagram: {
      status: () => [...queryKeys.monitor.all(), 'instagram', 'status'] as const,
      scrapers: () => [...queryKeys.monitor.all(), 'instagram', 'scrapers'] as const,
      metrics: () => [...queryKeys.monitor.all(), 'instagram', 'metrics'] as const,
      errors: () => [...queryKeys.monitor.all(), 'instagram', 'errors'] as const,
    },
  },

  // Analytics queries
  analytics: {
    all: () => [...queryKeys.all, 'analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all(), 'dashboard'] as const,
    trends: (period: string) => [...queryKeys.analytics.all(), 'trends', period] as const,
    performance: (entity: string, id: number) => [...queryKeys.analytics.all(), 'performance', entity, id] as const,
    comparisons: (entities: string[]) => [...queryKeys.analytics.all(), 'comparisons', entities] as const,
  },

  // Search queries
  search: {
    all: () => [...queryKeys.all, 'search'] as const,
    global: (query: string) => [...queryKeys.search.all(), 'global', query] as const,
    subreddits: (query: string) => [...queryKeys.search.all(), 'subreddits', query] as const,
    creators: (query: string) => [...queryKeys.search.all(), 'creators', query] as const,
    models: (query: string) => [...queryKeys.search.all(), 'models', query] as const,
  },

  // Filter and UI state queries
  ui: {
    all: () => [...queryKeys.all, 'ui'] as const,
    filters: (page: string) => [...queryKeys.ui.all(), 'filters', page] as const,
    preferences: () => [...queryKeys.ui.all(), 'preferences'] as const,
    savedViews: (userId: string) => [...queryKeys.ui.all(), 'saved-views', userId] as const,
  },
}

// Helper to invalidate related queries
export const invalidateRelated = async (queryKey: readonly unknown[]) => {
  await queryClient.invalidateQueries({ queryKey })
}