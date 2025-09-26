import { NextResponse } from 'next/server'

export type CacheStrategy = 'no-cache' | 'private' | 'public' | 'immutable'

export interface CacheOptions {
  strategy?: CacheStrategy
  maxAge?: number // seconds
  sMaxAge?: number // CDN cache seconds
  staleWhileRevalidate?: number // seconds
  mustRevalidate?: boolean
  noStore?: boolean
  noTransform?: boolean
  tags?: string[] // Cache tags for invalidation
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  strategy: 'private',
  maxAge: 0,
  noStore: true, // Default to no caching for dynamic data
}

/**
 * Add cache control headers to response
 */
export function addCacheHeaders(response: NextResponse, options: CacheOptions = {}): NextResponse {
  const config = { ...DEFAULT_CACHE_OPTIONS, ...options }

  // Build Cache-Control header
  const directives: string[] = []

  // Cache strategy
  if (config.strategy === 'no-cache') {
    directives.push('no-cache')
  } else if (config.strategy === 'private') {
    directives.push('private')
  } else if (config.strategy === 'public') {
    directives.push('public')
  } else if (config.strategy === 'immutable') {
    directives.push('public', 'immutable')
  }

  // Max age
  if (config.maxAge !== undefined && config.maxAge > 0) {
    directives.push(`max-age=${config.maxAge}`)
  }

  // CDN cache (s-maxage)
  if (config.sMaxAge !== undefined && config.sMaxAge > 0) {
    directives.push(`s-maxage=${config.sMaxAge}`)
  }

  // Stale while revalidate
  if (config.staleWhileRevalidate !== undefined && config.staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`)
  }

  // Other directives
  if (config.mustRevalidate) {
    directives.push('must-revalidate')
  }
  if (config.noStore) {
    directives.push('no-store')
  }
  if (config.noTransform) {
    directives.push('no-transform')
  }

  // Set Cache-Control header
  if (directives.length > 0) {
    response.headers.set('Cache-Control', directives.join(', '))
  }

  // Set cache tags for Vercel/CDN invalidation
  if (config.tags && config.tags.length > 0) {
    response.headers.set('Cache-Tag', config.tags.join(', '))
  }

  // Add ETag for conditional requests (based on response body hash)
  // Note: In production, you might want to generate this based on actual content
  const etag = `W/"${Date.now()}"`
  response.headers.set('ETag', etag)

  // Add Last-Modified header
  response.headers.set('Last-Modified', new Date().toUTCString())

  return response
}

/**
 * Cache configurations for different types of data
 */
export const CACHE_CONFIGS = {
  // No caching - for real-time data
  REALTIME: {
    strategy: 'no-cache' as CacheStrategy,
    noStore: true,
    maxAge: 0,
  },

  // Cache for 1 minute - for frequently changing data
  DYNAMIC: {
    strategy: 'private' as CacheStrategy,
    maxAge: 60,
    staleWhileRevalidate: 30,
  },

  // Cache for 5 minutes - for semi-static data
  SEMI_STATIC: {
    strategy: 'private' as CacheStrategy,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60,
  },

  // Cache for 1 hour - for relatively static data
  STATIC: {
    strategy: 'public' as CacheStrategy,
    maxAge: 3600, // 1 hour
    sMaxAge: 3600,
    staleWhileRevalidate: 86400, // 1 day
  },

  // Cache for 1 day - for very static data
  LONG_CACHE: {
    strategy: 'public' as CacheStrategy,
    maxAge: 86400, // 1 day
    sMaxAge: 86400,
    staleWhileRevalidate: 604800, // 1 week
  },

  // Immutable content - for versioned assets
  IMMUTABLE: {
    strategy: 'immutable' as CacheStrategy,
    maxAge: 31536000, // 1 year
    sMaxAge: 31536000,
  },
}

/**
 * Helper to create cached JSON response
 */
export function cachedJsonResponse(
  data: any,
  cacheOptions: CacheOptions = {},
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(data, init)
  return addCacheHeaders(response, cacheOptions)
}

/**
 * Check if request has valid cache
 */
export function checkConditionalRequest(
  request: Request,
  etag: string,
  lastModified: Date
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match')
  const ifModifiedSince = request.headers.get('If-Modified-Since')

  // Check ETag
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true // Not modified
  }

  // Check Last-Modified
  if (ifModifiedSince) {
    const clientDate = new Date(ifModifiedSince)
    if (clientDate >= lastModified) {
      return true // Not modified
    }
  }

  return false // Modified, send full response
}