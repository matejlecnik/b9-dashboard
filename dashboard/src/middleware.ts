import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create response object
  let response = NextResponse.next()

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public paths that don't require authentication
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/')

  // Root path handling
  if (pathname === '/') {
    if (user) {
      // Authenticated user on root → redirect to dashboards
      return NextResponse.redirect(new URL('/dashboards', request.url))
    } else {
      // Unauthenticated user on root → redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // If user is on login page and already authenticated → redirect to dashboards
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboards', request.url))
  }

  // Protected paths - require authentication
  if (!isPublicPath && !user) {
    // User trying to access protected route without authentication → redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

// Configure which paths to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
