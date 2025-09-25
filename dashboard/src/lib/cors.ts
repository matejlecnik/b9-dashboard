import { NextRequest, NextResponse } from 'next/server'
/**
 * CORS Configuration
 * Handles Cross-Origin Resource Sharing for API routes
 */

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS

  // Default allowed origins
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://b9-dashboard.vercel.app',
  ]

  // Add environment-specific origins
  if (envOrigins) {
    const additionalOrigins = envOrigins.split(',').map(origin => origin.trim())
    return [...defaultOrigins, ...additionalOrigins]
  }

  // In production, be more restrictive
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://b9.agency',
      'https://dashboard.b9.agency',
      'https://b9-dashboard.vercel.app',
      // Add your production domains here
    ]
  }

  return defaultOrigins
}

/**
 * CORS configuration options
 */
export interface CorsOptions {
  origins?: string[]
  methods?: string[]
  headers?: string[]
  credentials?: boolean
  maxAge?: number
}

/**
 * Default CORS options
 */
const defaultCorsOptions: CorsOptions = {
  origins: getAllowedOrigins(),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false

  // Check for exact match
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Check for wildcard subdomain match (e.g., *.b9.agency)
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain)
    }
    return false
  })
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions = defaultCorsOptions
): NextResponse {
  const origin = request.headers.get('origin')
  const { origins, methods, headers, credentials, maxAge } = {
    ...defaultCorsOptions,
    ...options,
  }

  // Check if origin is allowed
  if (origin && origins && isOriginAllowed(origin, origins)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow all origins
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  }

  // Set other CORS headers
  if (methods) {
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
  }

  if (headers) {
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '))
  }

  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  if (maxAge) {
    response.headers.set('Access-Control-Max-Age', maxAge.toString())
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

/**
 * Handle preflight requests
 */
export function handlePreflightRequest(
  request: NextRequest,
  options: CorsOptions = defaultCorsOptions
): NextResponse {
  const response = new NextResponse(null, { status: 204 })
  return addCorsHeaders(request, response, options)
}

/**
 * CORS middleware
 */
export function withCors(
  request: NextRequest,
  response: NextResponse,
  options?: CorsOptions
): NextResponse {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handlePreflightRequest(request, options)
  }

  // Add CORS headers to regular responses
  return addCorsHeaders(request, response, options)
}

/**
 * Create a CORS-enabled response
 */
export function corsResponse(
  body: unknown,
  request: NextRequest,
  init?: ResponseInit,
  options?: CorsOptions
): NextResponse {
  const response = NextResponse.json(body, init)
  return addCorsHeaders(request, response, options)
}