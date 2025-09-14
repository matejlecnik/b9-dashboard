import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Auth is handled via Supabase (GitHub provider). We detect session cookies.

// API routes that don't require authentication (very limited)
const PUBLIC_API_ROUTES = ['/api/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // If visiting /login and already authenticated, redirect to /dashboards
  if (pathname === '/login') {
    const hasAuthCookie = ['sb-access-token','sb-refresh-token','supabase-auth-token','supabase.auth.token']
      .some((name) => request.cookies.has(name))
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
  
  // Detect Supabase session (GitHub auth) by presence of Supabase auth cookies
  const userIsAuthenticated = ['sb-access-token','sb-refresh-token','supabase-auth-token','supabase.auth.token']
    .some((name) => request.cookies.has(name))
  
  if (!userIsAuthenticated) {
    // Redirect to login for unauthenticated users
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Handle root route - redirect authenticated users to dashboards
  if (pathname === '/') {
    const target = userIsAuthenticated ? '/dashboards' : '/login'
    const url = new URL(target, request.url)
    return NextResponse.redirect(url)
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