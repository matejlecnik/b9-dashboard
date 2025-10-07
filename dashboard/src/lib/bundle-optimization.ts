import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'


/**

 * Bundle optimization utilities and configuration
 * Helps reduce bundle size and improve performance
 */

/**
 * Tree-shakeable imports map
 * Use these instead of importing entire libraries
 */
export const OptimizedImports = {
  // Lodash - use individual functions
  debounce: () => import('lodash/debounce'),
  throttle: () => import('lodash/throttle'),
  cloneDeep: () => import('lodash/cloneDeep'),
  isEmpty: () => import('lodash/isEmpty'),
  isEqual: () => import('lodash/isEqual'),
  merge: () => import('lodash/merge'),
  pick: () => import('lodash/pick'),
  omit: () => import('lodash/omit'),

  // Date-fns - use individual functions
  format: () => import('date-fns/format'),
  parseISO: () => import('date-fns/parseISO'),
  addDays: () => import('date-fns/addDays'),
  subDays: () => import('date-fns/subDays'),
  differenceInDays: () => import('date-fns/differenceInDays'),
  startOfDay: () => import('date-fns/startOfDay'),
  endOfDay: () => import('date-fns/endOfDay'),
  isAfter: () => import('date-fns/isAfter'),
  isBefore: () => import('date-fns/isBefore'),
} as const

/**
 * List of heavy components that should be lazy loaded
 * These components are only loaded when they're actually needed
 */
export const LAZY_LOAD_COMPONENTS = [
  'UniversalTable',
  'VirtualizedUniversalTable',
  'InstagramTable',
  'ModelsTable',
  'DiscoveryTable',
  'AICategorizationModal',
  'AddUserModal',
  'AddSubredditModal',
  'ModelFormModal',
  'RelatedCreatorsModal',
  'PostAnalysisTable',
  'UserAnalysisTable',
  'PerformanceMonitor',
  'DatabasePerformancePanel',
  'JobQueueDashboard',
] as const

/**
 * Libraries that should be optimized in next.config.ts
 * These are commonly used libraries that benefit from tree-shaking
 */
export const OPTIMIZE_PACKAGES = [
  '@radix-ui/react-*',
  'lucide-react',
  'date-fns',
  'lodash',
  'recharts',
  '@tanstack/react-table',
  '@tanstack/react-virtual',
  '@tanstack/react-query',
  'framer-motion',
  'react-hook-form',
  '@hookform/resolvers',
  'zod',
] as const

/**
 * Helper function to create a lazy loaded component with proper loading state
 */
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  componentName?: string
) {
  return {
    import: importFn,
    componentName,
    ssr: false,
  }
}

/**
 * Default loading component for lazy loaded components
 */
export const DEFAULT_LOADING_COMPONENT = `animate-pulse h-96 ${designSystem.background.surface.light} rounded-lg`

/**
 * Webpack optimization plugins for better tree-shaking
 */
export const WEBPACK_OPTIMIZATIONS = {
  // Remove unused exports
  sideEffects: false,

  // Optimize module concatenation
  concatenateModules: true,

  // Minimize bundle size
  minimize: true,

  // Split chunks configuration
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Vendor code splitting
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        priority: 10,
        reuseExistingChunk: true,
      },
      // Common components
      common: {
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true,
      },
      // Separate large libraries
      radix: {
        test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
        name: 'radix-ui',
        priority: 20,
      },
      tanstack: {
        test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
        name: 'tanstack',
        priority: 20,
      },
    },
  },
}

/**
 * Components that should always be preloaded
 * These are critical for initial page render
 */
export const PRELOAD_COMPONENTS = [
  'DashboardLayout',
  'StandardToolbar',
  'MetricsCards',
  'Button',
  'Input',
  'Select',
] as const

/**
 * Route-based code splitting configuration
 */
export const ROUTE_CHUNKS = {
  '/reddit': ['UniversalTable', 'VirtualizedUniversalTable', 'StandardToolbar'],
  '/instagram': ['InstagramTable', 'InstagramMetricsCards', 'InstagramSidebar'],
  '/models': ['ModelsTable', 'ModelFormModal', 'ModelsDashboardLayout'],
  '/analytics': ['recharts', 'date-fns'],
} as const

/**
 * Helper to prefetch components based on route
 */
export async function prefetchRouteComponents(route: string) {
  const components = ROUTE_CHUNKS[route as keyof typeof ROUTE_CHUNKS]
  if (components) {
    // Prefetch logic here
    logger.log(`Prefetching components for route: ${route}`, components)
  }
}

/**
 * Bundle size budgets (in KB)
 * Alert when bundles exceed these sizes
 */
export const BUNDLE_SIZE_BUDGETS = {
  'main': 200,           // Main bundle
  'vendor': 500,         // Vendor libraries
  'common': 100,         // Common shared code
  'radix-ui': 150,       // Radix UI components
  'tanstack': 100,       // TanStack libraries
  'page': 50,            // Individual page bundles
} as const

/**
 * Performance metrics thresholds
 */
export const PERFORMANCE_BUDGETS = {
  // Time to Interactive
  TTI: 3000,
  // First Contentful Paint
  FCP: 1000,
  // Largest Contentful Paint
  LCP: 2500,
  // Cumulative Layout Shift
  CLS: 0.1,
  // First Input Delay
  FID: 100,
} as const

/**
 * Lazy load heavy utility functions
 */
export async function loadUtility<T = unknown>(
  utilityName: keyof typeof OptimizedImports
): Promise<T> {
  const mod = await OptimizedImports[utilityName]()
  const value = (mod as Record<string, unknown>).default ?? mod
  return value as T
}

/**
 * Bundle size analyzer
 */
export class BundleSizeAnalyzer {
  private static instance: BundleSizeAnalyzer

  static getInstance(): BundleSizeAnalyzer {
    if (!BundleSizeAnalyzer.instance) {
      BundleSizeAnalyzer.instance = new BundleSizeAnalyzer()
    }
    return BundleSizeAnalyzer.instance
  }

  /**
   * Format bytes to human readable
   */
  formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * Measure the size of a JavaScript string
   */
  measureSize(code: string): {
    raw: number
    gzip: number
    brotli: number
  } {
    const rawSize = new Blob([code]).size

    // Estimate compressed sizes (rough approximation)
    const gzipSize = Math.round(rawSize * 0.3) // ~70% compression
    const brotliSize = Math.round(rawSize * 0.25) // ~75% compression

    return {
      raw: rawSize,
      gzip: gzipSize,
      brotli: brotliSize,
    }
  }
}

/**
 * Prefetch manager for optimizing perceived performance
 */
export class PrefetchManager {
  private prefetched = new Set<string>()

  /**
   * Prefetch a route
   */
  prefetchRoute(route: string) {
    if (this.prefetched.has(route)) return

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.doPrefetch(route)
      })
    } else {
      setTimeout(() => this.doPrefetch(route), 1)
    }

    this.prefetched.add(route)
  }

  private async doPrefetch(route: string) {
    try {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = route
      link.as = 'document'
      document.head.appendChild(link)
    } catch (error) {
      logger.warn(`Failed to prefetch ${route}:`, error)
    }
  }

  /**
   * Prefetch critical resources
   */
  prefetchResources(resources: string[]) {
    resources.forEach(resource => {
      if (this.prefetched.has(resource)) return

      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = resource

      if (resource.endsWith('.js')) {
        link.as = 'script'
      } else if (resource.endsWith('.css')) {
        link.as = 'style'
      } else if (resource.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i)) {
        link.as = 'image'
      } else {
        link.as = 'fetch'
      }

      document.head.appendChild(link)
      this.prefetched.add(resource)
    })
  }
}

export const prefetchManager = new PrefetchManager()
export const bundleSizeAnalyzer = BundleSizeAnalyzer.getInstance()