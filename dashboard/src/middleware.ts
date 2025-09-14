import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Authentication is handled exclusively via Supabase
// We detect session by checking for Supabase auth cookies
// Set BYPASS_AUTH=true in development to skip authentication

// API routes that don't require authentication (very limited)
const PUBLIC_API_ROUTES = ['/api/health']

// Supabase auth cookie patterns to check
const SUPABASE_AUTH_COOKIES = [
  'sb-access-token',
  'sb-refresh-token',
  'supabase-auth-token',
  'supabase.auth.token'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if authentication bypass is enabled (for local development)
  const bypassAuth = process.env.BYPASS_AUTH === 'true'

  if (bypassAuth) {
    // In development mode with auth bypass:
    // - Skip login page and redirect to dashboards
    // - Allow access to all routes without authentication

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

  // Check if user has any Supabase auth cookies
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

  // Handle root route - redirect authenticated users to dashboards
  if (pathname === '/') {
    const dashboardUrl = new URL('/dashboards', request.url)
    return NextResponse.redirect(dashboardUrl)
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