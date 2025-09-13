import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

// API routes that don't require authentication (very limited)
const PUBLIC_API_ROUTES = ['/api/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('🚀 Middleware executing for:', pathname)
  
  // Always allow access to public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log('✅ Public route allowed:', pathname)
    return NextResponse.next()
  }
  
  // Allow access to specific public API routes only
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('✅ Public API route allowed:', pathname)
    return NextResponse.next()
  }
  
  // TEST: Use hardcoded auth status to test redirect logic
  const userIsAuthenticated = false // TODO: Replace with await isAuthenticated()
  console.log('🔒 Auth status:', userIsAuthenticated)
  
  if (!userIsAuthenticated) {
    console.log('❌ Redirecting to login')
    // Redirect to login for unauthenticated users
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Handle root route - redirect authenticated users to dashboards
  if (pathname === '/') {
    console.log('✅ Redirecting authenticated user to dashboards')
    const dashboardUrl = new URL('/dashboards', request.url)
    return NextResponse.redirect(dashboardUrl)
  }
  
  console.log('✅ User is authenticated, allowing access to:', pathname)
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