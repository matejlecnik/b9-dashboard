/**
 * Query keys for React Query
 * Centralized location for all query keys to prevent duplication and ensure consistency
 */

export const queryKeys = {
  // Analytics keys
  analytics: {
    dashboard: () => ['analytics', 'dashboard'] as const,
    trends: (period: string) => ['analytics', 'trends', period] as const,
    topSubreddits: (limit?: number) => ['analytics', 'top-subreddits', limit] as const,
    topCreators: (limit?: number) => ['analytics', 'top-creators', limit] as const,
    performance: () => ['analytics', 'performance'] as const,
    engagement: (platform: string, timeframe: string) => ['analytics', 'engagement', platform, timeframe] as const,
    categoryDistribution: () => ['analytics', 'category-distribution'] as const,
  },

  // Reddit keys
  reddit: {
    all: () => ['reddit'] as const,
    subreddits: (filters?: unknown) => ['reddit', 'subreddits', filters] as const,
    subreddit: (id: number) => ['reddit', 'subreddits', 'detail', id] as const,
    counts: () => ['reddit', 'counts'] as const,
    filters: () => ['reddit', 'filters'] as const,
    users: {
      list: (filters?: unknown) => ['reddit', 'users', 'list', filters] as const,
      detail: (id: number) => ['reddit', 'users', 'detail', id] as const,
      creators: () => ['reddit', 'users', 'creators'] as const,
    },
    posts: {
      list: (filters?: unknown) => ['reddit', 'posts', 'list', filters] as const,
      detail: (id: number) => ['reddit', 'posts', 'detail', id] as const,
      trending: () => ['reddit', 'posts', 'trending'] as const,
    },
  },

  // Instagram keys
  instagram: {
    creators: (filters?: unknown) => ['instagram', 'creators', filters] as const,
    creator: (id: number) => ['instagram', 'creators', 'detail', id] as const,
    metrics: () => ['instagram', 'metrics'] as const,
    posts: {
      list: (filters?: unknown) => ['instagram', 'posts', 'list', filters] as const,
      viral: () => ['instagram', 'posts', 'viral'] as const,
    },
  },

  // Models keys
  models: {
    list: () => ['models', 'list'] as const,
    detail: (id: string) => ['models', 'detail', id] as const,
  },

  // Monitor keys
  monitor: {
    reddit: () => ['monitor', 'reddit'] as const,
    instagram: () => ['monitor', 'instagram'] as const,
    status: () => ['monitor', 'status'] as const,
    logs: (service: string) => ['monitor', 'logs', service] as const,
  },

  // Tracking keys
  tracking: {
    campaigns: () => ['tracking', 'campaigns'] as const,
    metrics: () => ['tracking', 'metrics'] as const,
  },
} as const