
/**
 * Unified API Security Wrapper
 * Combines authentication, rate limiting, and CORS into a single middleware
 */

export interface ApiSecurityOptions {
  requireAuth?: boolean
  rateLimit?: keyof typeof rateLimitConfigs
  cors?: CorsOptions | boolean
  skipForPublicRoutes?: boolean
}

const defaultOptions: ApiSecurityOptions = {
  requireAuth: true,
  rateLimit: 'default',
  cors: true,
  skipForPublicRoutes: true,
}

/**
 * Secure API handler wrapper
 * Applies authentication, rate limiting, and CORS to API routes
 */
export function withApiSecurity<T extends any[], R>(
  handler: (request: NextRequest, user: User | null, ...args: T) => Promise<NextResponse | Response>,
  options: ApiSecurityOptions = {}
) {
  const config = { ...defaultOptions, ...options }

  return async (request: NextRequest, ...args: T): Promise<NextResponse | Response> => {
    try {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 })
        return config.cors ? withCors(request, response, config.cors === true ? undefined : config.cors) : response
      }

      // Check if this is a public route
      const isPublic = isPublicApiRoute(request.nextUrl.pathname)
      
      if (config.skipForPublicRoutes && isPublic) {
        // Skip security for public routes but still apply CORS
        const result = await handler(request, null, ...args)
        if (result instanceof NextResponse && config.cors) {
          return withCors(request, result, config.cors === true ? undefined : config.cors)
        }
        return result
      }

      // Apply rate limiting
      let rateLimitInfo: { limit: number; remaining: number; reset: Date } | null = null
      if (config.rateLimit) {
        const { checkRateLimit } = await import('./rate-limit')
        const rateLimitCheck = await checkRateLimit(request, config.rateLimit)

        if (!rateLimitCheck.success) {
          // Rate limit exceeded
          const { rateLimitExceededResponse } = await import('./rate-limit')
          const rateLimitResult = rateLimitExceededResponse(
            rateLimitCheck.limit,
            rateLimitCheck.remaining,
            rateLimitCheck.reset
          )

          // Add CORS headers to error response
          if (config.cors) {
            return withCors(request, rateLimitResult, config.cors === true ? undefined : config.cors)
          }
          return rateLimitResult
        }

        // Store rate limit info to add to successful response
        rateLimitInfo = {
          limit: rateLimitCheck.limit,
          remaining: rateLimitCheck.remaining,
          reset: rateLimitCheck.reset
        }
      }

      // Verify authentication
      let user: User | null = null
      if (config.requireAuth) {
        user = await verifyApiAuth(request)
        if (!user) {
          const unauthorizedRes = unauthorizedResponse()
          if (config.cors) {
            return withCors(request, unauthorizedRes, config.cors === true ? undefined : config.cors)
          }
          return unauthorizedRes
        }
      }

      // Call the actual handler
      const result = await handler(request, user, ...args)

      // Add rate limit headers if we have the info
      if (rateLimitInfo && result instanceof NextResponse) {
        result.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString())
        result.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
        result.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toISOString())
      }

      // Apply CORS headers to successful response
      if (result instanceof NextResponse && config.cors) {
        return withCors(request, result, config.cors === true ? undefined : config.cors)
      }

      return result
    } catch (error) {
      logger.error('API Security Error:', error)
      
      // Create error response
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          title: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        },
        { status: 500 }
      )

      // Apply CORS to error response
      if (config.cors) {
        return withCors(request, errorResponse, config.cors === true ? undefined : config.cors)
      }

      return errorResponse
    }
  }
}

/**
 * Shorthand wrappers for common configurations
 */

// Public endpoint (no auth, but rate limited and CORS)
export const publicApi = <T extends any[], R>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse | Response>
) => {
  return withApiSecurity<T, R>(
    async (req: NextRequest, user, ...args) => handler(req, ...args),
    { requireAuth: false, rateLimit: 'default', cors: true }
  )
}

// Protected endpoint (auth required, rate limited, CORS)
export const protectedApi = <T extends any[], R>(
  handler: (request: NextRequest, user: User, ...args: T) => Promise<NextResponse | Response>
) => {
  return withApiSecurity<T, R>(
    async (req: NextRequest, user, ...args) => {
      if (!user) throw new Error('Authentication required')
      return handler(req, user, ...args)
    },
    { requireAuth: true, rateLimit: 'default', cors: true }
  )
}

// AI endpoint (stricter rate limiting)
export const aiApi = <T extends any[], R>(
  handler: (request: NextRequest, user: User, ...args: T) => Promise<NextResponse | Response>
) => {
  return withApiSecurity<T, R>(
    async (req: NextRequest, user, ...args) => {
      if (!user) throw new Error('Authentication required')
      return handler(req, user, ...args)
    },
    { requireAuth: true, rateLimit: 'ai', cors: true }
  )
}

// Scraper endpoint (specific rate limiting)
export const scraperApi = <T extends any[], R>(
  handler: (request: NextRequest, user: User, ...args: T) => Promise<NextResponse | Response>
) => {
  return withApiSecurity<T, R>(
    async (req: NextRequest, user, ...args) => {
      if (!user) throw new Error('Authentication required')
      return handler(req, user, ...args)
    },
    { requireAuth: true, rateLimit: 'scraper', cors: true }
  )
}

/**
 * Helper to create JSON responses with security headers
 */
export function secureJsonResponse(
  data: unknown,
  request: NextRequest,
  init?: ResponseInit,
  corsOptions?: CorsOptions
): NextResponse {
  const response = NextResponse.json(data, init)
  return corsResponse(data, request, init, corsOptions)
}