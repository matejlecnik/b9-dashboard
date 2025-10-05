import { publicApi } from '@/lib/api-wrapper'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { isAllowedImageHost } from '@/lib/image-utils'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

export const runtime = 'edge'

export const GET = publicApi(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('url')
    if (!raw) return new Response('Missing url', { status: 400 })

    let target: URL
    try {
      target = new URL(raw)
    } catch (e) {
      logger.error('Invalid URL:', raw, e)
      return new Response('Invalid url', { status: 400 })
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      logger.error('Unsupported protocol:', target.protocol)
      return new Response('Unsupported protocol', { status: 400 })
    }

    // Restrict to known hosts
    if (!isAllowedImageHost(target.toString())) {
      logger.error('Host not allowed:', target.hostname)
      return new Response('Host not allowed', { status: 403 })
    }

    logger.log('Fetching image from:', target.toString())

    const resp = await fetch(target.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      },
    })

    if (!resp.ok) {
      logger.error('Upstream error:', resp.status, resp.statusText)
      return new Response(`Upstream error: ${resp.status}`, { status: resp.status })
    }

    const contentType = resp.headers.get('content-type') || 'image/*'
    const headers = new Headers(resp.headers)
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    headers.set('Referrer-Policy', 'no-referrer')

    return new Response(resp.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    logger.error('Proxy error:', error)
    return new Response(`Proxy error: ${error}`, { status: 500 })
  }
})

