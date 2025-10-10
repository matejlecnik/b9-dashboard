/**
 * Proxy Helper for External API Requests
 * Handles server-to-server communication with the external API
 * Solves CORS issues by proxying requests through Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.b9-dashboard.com'

export interface ProxyOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
}

/**
 * Proxy a request to the external API
 * @param path - The API path (e.g., '/api/instagram/scraper/status')
 * @param options - Request options
 */
export async function proxyToExternalApi(
  path: string,
  options: ProxyOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000
  } = options

  const url = `${API_URL}${path}`

  logger.info(`Proxying ${method} request to external API: ${path}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      logger.warn(`External API returned ${response.status} for ${path}`)
    }

    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if ((error as Error).name === 'AbortError') {
      logger.error(`External API request timeout for ${path}`)
      throw new Error(`External API request timeout (${timeout}ms)`)
    }

    logger.error(`External API request failed for ${path}:`, error)
    throw error
  }
}

/**
 * Create a proxy route handler for GET requests
 * @param extractPath - Function to extract the API path from the request
 */
export function createProxyGetHandler(
  extractPath: (request: NextRequest) => string
) {
  return async function GET(request: NextRequest) {
    try {
      const path = extractPath(request)
      const response = await proxyToExternalApi(path)

      // Try JSON first, fall back to plain text for error messages
      let data
      try {
        data = await response.json()
      } catch {
        const text = await response.text()
        data = { error: text, success: false }
      }

      return NextResponse.json(data, { status: response.status })
    } catch (error) {
      logger.error('Proxy GET handler error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Proxy request failed'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Create a proxy route handler for POST requests
 * @param extractPath - Function to extract the API path from the request
 */
export function createProxyPostHandler(
  extractPath: (request: NextRequest) => string
) {
  return async function POST(request: NextRequest) {
    try {
      const path = extractPath(request)
      const body = await request.json().catch(() => ({}))

      const response = await proxyToExternalApi(path, {
        method: 'POST',
        body
      })

      // Try JSON first, fall back to plain text for error messages
      let data
      try {
        data = await response.json()
      } catch {
        const text = await response.text()
        data = { error: text, success: false }
      }

      return NextResponse.json(data, { status: response.status })
    } catch (error) {
      logger.error('Proxy POST handler error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Proxy request failed'
        },
        { status: 500 }
      )
    }
  }
}
