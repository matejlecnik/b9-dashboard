'use client'

import type { ComponentType } from 'react'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { logger } from '@/lib/logger'
/**

 * Dynamic Import Utilities
 * Optimize bundle size by code splitting and lazy loading
 */


/**
 * Loading fallback component
 */
export const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
  </div>
)

/**
 * Error fallback component
 */
export const ErrorFallback = ({ error }: { error?: Error }) => (
  <div className="flex items-center justify-center p-8 text-red-500">
    <div className="text-center">
      <p className="font-semibold">Failed to load component</p>
      {error && <p className="text-sm mt-2">{error.message}</p>}
    </div>
  </div>
)

/**
 * Create a dynamically imported component with loading and error states
 */
export function createDynamicComponent<P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => React.ReactElement
    ssr?: boolean
  }
) {
  return dynamic<P>(importFn as unknown as () => Promise<ComponentType<P>>, {
    loading: options?.loading || (() => <LoadingFallback />),
    ssr: options?.ssr !== false, // Default to true for SSR
  })
}

/**
 * Dynamically imported heavy components
 * These are loaded only when needed to reduce initial bundle size
 */

// Example dynamic imports - uncomment and update paths as needed
/*
// Charts and Data Visualization (Heavy)
export const DynamicChart = createDynamicComponent(
  () => import('@/components/ui/chart').then(mod => ({ default: mod.Chart })),
  { ssr: false } // Charts often need client-side rendering
)

// Rich Text Editor (Heavy)
export const DynamicRichTextEditor = createDynamicComponent(
  () => import('@/components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  { ssr: false }
)

// Data Table (Heavy with all features)
export const DynamicDataTable = createDynamicComponent(
  () => import('@/components/ui/data-table').then(mod => ({ default: mod.DataTable }))
)

// PDF Viewer (Heavy)
export const DynamicPDFViewer = createDynamicComponent(
  () => import('@/components/ui/pdf-viewer').then(mod => ({ default: mod.PDFViewer })),
  { ssr: false }
)

// Code Editor (Heavy)
export const DynamicCodeEditor = createDynamicComponent(
  () => import('@/components/ui/code-editor').then(mod => ({ default: mod.CodeEditor })),
  { ssr: false }
)

// Map Component (Heavy)
export const DynamicMap = createDynamicComponent(
  () => import('@/components/ui/map').then(mod => ({ default: mod.Map })),
  { ssr: false }
)

// Icon Picker (Loads entire icon library)
export const DynamicIconPicker = createDynamicComponent(
  () => import('@/components/ui/icon-picker').then(mod => ({ default: mod.IconPicker })),
  { ssr: false }
)
*/

// These components are commented out due to TypeScript issues with dynamic imports
// They are not currently used in the application


/**
 * Preload a dynamic component
 * Use this to preload components that will likely be needed soon
 */
export function preloadComponent(
  importFn: () => Promise<unknown>
) {
  // Start loading but don't wait for it
  importFn().catch(err => {
    logger.warn('Failed to preload component:', err)
  })
}

/**
 * Batch preload multiple components
 */
export function preloadComponents(
  importFns: Array<() => Promise<unknown>>
) {
  importFns.forEach(preloadComponent)
}

/**
 * Hook to preload components based on user interactions
 */

export function usePreloadComponents() {
  const pathname = usePathname()

  useEffect(() => {
    // Preload components based on current route
    switch (pathname) {
      case '/reddit/subreddit-review':
        // Preload data table for subreddit review
        // preloadComponent(() => import('@/components/ui/data-table'))
        break

      case '/monitor/performance':
        // Preload performance monitoring components
        // preloadComponents([
        //   () => import('@/components/PerformanceMonitor'),
        //   () => import('@/components/DatabasePerformancePanel'),
        //   () => import('@/components/JobQueueDashboard'),
        // ])
        break

      case '/reddit/post-analysis':
        // Preload chart components for analysis
        // preloadComponent(() => import('@/components/ui/chart'))
        break

      default:
        // Preload commonly used components
        // preloadComponent(() => import('@/components/ui/data-table'))
        break
    }
  }, [pathname])
}

/**
 * Route-based code splitting
 * Define which routes should load which chunks
 */
export const ROUTE_CHUNKS = {
  '/reddit': ['reddit-common', 'data-table', 'filters'],
  '/instagram': ['instagram-common', 'media-viewer', 'analytics'],
  '/monitor': ['monitoring', 'charts', 'performance'],
  '/models': ['ai-models', 'code-editor'],
  '/tracking': ['tracking', 'analytics', 'charts'],
} as const

/**
 * Get chunks for a specific route
 */
export function getRouteChunks(pathname: string): string[] {
  for (const [route, chunks] of Object.entries(ROUTE_CHUNKS)) {
    if (pathname.startsWith(route)) {
      return [...chunks] // Convert readonly array to mutable array
    }
  }
  return []
}

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  if (typeof window === 'undefined') return null

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback()
        observer.disconnect()
      }
    })
  }, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  })

  return observer
}