/// <reference types="next" />

declare module 'next/server' {
  import { RequestCookies, ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies'

  export class NextRequest extends Request {
    cookies: RequestCookies
    nextUrl: URL & {
      pathname: string
      searchParams: URLSearchParams
      href: string
      origin: string
    }
    geo?: {
      city?: string
      country?: string
      region?: string
      latitude?: string
      longitude?: string
    }
    ip?: string
    url: string
  }

  export class NextResponse extends Response {
    static json<T = unknown>(body: T, init?: ResponseInit): NextResponse
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse
    static rewrite(url: string | URL): NextResponse
    static next(init?: ResponseInit): NextResponse
    cookies: ResponseCookies
  }

  export type NextMiddleware = (
    request: NextRequest,
    event?: { params?: Record<string, string> }
  ) => Response | NextResponse | Promise<Response | NextResponse> | void | Promise<void>

  export interface NextFetchEvent {
    waitUntil(promise: Promise<unknown>): void
  }
}