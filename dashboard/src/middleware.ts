
import { NextRequest, NextResponse } from 'next/server'

// Authentication is handled exclusively via Supabase
// We detect session by checking for Supabase auth cookies
// Set BYPASS_AUTH=true in development to skip authentication

// API routes that don't require authentication (very limited)
const PUBLIC_API_ROUTES = ['/api/health']

// Routes that are coming soon and should be blocked in production
const COMING_SOON_ROUTES = ['/reddit/user-analysis']

// Supabase auth cookie patterns to check
const SUPABASE_AUTH_COOKIES = [
  'sb-access-token',
  'sb-refresh-token',
  'supabase-auth-token',
  'supabase.auth.token'
]

// Protected dashboards that require specific permissions
const PROTECTED_DASHBOARDS = {
  '/reddit': 'reddit',
  '/instagram': 'instagram',
  '/models': 'models',
  '/monitor': 'monitor',
  '/tracking': 'tracking'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if authentication bypass is enabled (for local development)
  const bypassAuth = process.env.BYPASS_AUTH === 'true'

  if (bypassAuth) {
    // In development mode with auth bypass:
    // - Skip login page and redirect to dashboards
    // - Allow access to all routes without authentication
    // - Skip permission checks

    if (pathname === '/login') {
      const dashboardUrl = new URL('/dashboards', request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    if (pathname === '/') {
      const dashboardUrl = new URL('/dashboards', request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Allow all other requests through without auth check
    return NextResponse.next()
  }

  // Production mode: Enforce authentication

  // Check if user has unknown Supabase auth cookies
  const hasAuthCookie = SUPABASE_AUTH_COOKIES.some(name =>
    request.cookies.has(name) ||
    // Also check for project-specific cookie patterns
    Array.from(request.cookies.getAll()).some(cookie =>
      cookie.name.startsWith('sb-') &&
      (cookie.name.includes('auth-token') || cookie.name.includes('refresh-token'))
    )
  )

  // If visiting /login and already authenticated, redirect to /dashboards
  if (pathname === '/login') {
    if (hasAuthCookie) {
      const dashboardUrl = new URL('/dashboards', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    return NextResponse.next()
  }

  // Allow access to specific public API routes only
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (!hasAuthCookie) {
    // Redirect to login for unauthenticated users
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Block "Coming Soon" routes in production (after auth check)
  if (COMING_SOON_ROUTES.some(route => pathname.startsWith(route))) {
    // Redirect to dashboards page with a message
    const dashboardUrl = new URL('/dashboards', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Handle root route - redirect authenticated users to dashboards
  if (pathname === '/') {
    const dashboardUrl = new URL('/dashboards', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Check dashboard-specific permissions
  // Note: Detailed permission checks are performed in page components
  // This is just a basic path-based check for the middleware layer
  const dashboardPath = Object.keys(PROTECTED_DASHBOARDS).find(path => pathname.startsWith(path))
  if (dashboardPath) {
    // For now, we allow access if authenticated
    // The actual permission check happens in the page component
    // This is because middleware doesn't have access to Supabase client
    // and we don't want to make async DB calls in middleware for performance
    return NextResponse.next()
  }

  // User is authenticated, allow access to other routes
  return NextResponse.next()
}

// Apply middleware to all routes except static files and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (logo, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp).*)',
  ],
}