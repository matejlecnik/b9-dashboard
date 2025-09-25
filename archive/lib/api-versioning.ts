
export const API_VERSIONS = {
  v1: '1.0.0',
  // v2: '2.0.0', // Future version
} as const

export type ApiVersion = keyof typeof API_VERSIONS

export const CURRENT_VERSION: ApiVersion = 'v1'
export const DEFAULT_VERSION: ApiVersion = 'v1'
export const DEPRECATED_VERSIONS: ApiVersion[] = []

/**
 * Extract API version from request
 * Supports:
 * - Path-based versioning: /api/v1/resource
 * - Header-based versioning: X-API-Version: v1
 * - Query param versioning: ?api_version=v1
 */
export function getApiVersion(request: NextRequest): ApiVersion {
  const url = new URL(request.url)

  // 1. Check path-based versioning (highest priority)
  const pathMatch = url.pathname.match(/\/api\/(v\d+)\//)
  if (pathMatch && pathMatch[1] in API_VERSIONS) {
    return pathMatch[1] as ApiVersion
  }

  // 2. Check header-based versioning
  const headerVersion = request.headers.get('X-API-Version')
  if (headerVersion && headerVersion in API_VERSIONS) {
    return headerVersion as ApiVersion
  }

  // 3. Check query param versioning
  const queryVersion = url.searchParams.get('api_version')
  if (queryVersion && queryVersion in API_VERSIONS) {
    return queryVersion as ApiVersion
  }

  // Default to current version
  return DEFAULT_VERSION
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: ApiVersion): boolean {
  return DEPRECATED_VERSIONS.includes(version)
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(response: NextResponse, version: ApiVersion): NextResponse {
  response.headers.set('X-API-Version', version)
  response.headers.set('X-API-Version-Status', isVersionDeprecated(version) ? 'deprecated' : 'active')

  if (isVersionDeprecated(version)) {
    response.headers.set('X-API-Deprecation-Date', '2025-12-31') // Example date
    response.headers.set('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT')
    response.headers.set('Link', '</api/version>; rel="deprecation"')
  }

  return response
}

/**
 * Version-aware API wrapper
 */
export function versionedApi<T extends any[], R>(
  handlers: Record<ApiVersion, (request: NextRequest, ...args: T) => Promise<NextResponse | Response>>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse | Response> => {
    const version = getApiVersion(request)

    // Check if handler exists for this version
    if (!(version in handlers)) {
      return NextResponse.json(
        {
          error: 'API version not supported',
          supported_versions: Object.keys(API_VERSIONS),
          requested_version: version
        },
        { status: 400 }
      )
    }

    // Get the appropriate handler
    const handler = handlers[version]
    const response = await handler(request, ...args)

    // Add version headers to response if it's a NextResponse
    if (response instanceof NextResponse) {
      return addVersionHeaders(response, version)
    }

    return response
  }
}

/**
 * Create a deprecated version warning response
 */
export function deprecationWarning(version: ApiVersion, message?: string): Record<string, unknown> {
  return {
    warning: `API version ${version} is deprecated`,
    title: message || `Please migrate to version ${CURRENT_VERSION}`,
    deprecation_date: '2025-12-31',
    migration_guide: 'https://docs.b9-dashboard.com/api/migration'
  }
}