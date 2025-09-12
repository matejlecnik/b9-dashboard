import { NextRequest } from 'next/server'
import { ALLOWED_IMAGE_HOSTS } from '@/config/images'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('url')
    if (!raw) return new Response('Missing url', { status: 400 })

    let target: URL
    try {
      target = new URL(raw)
    } catch {
      return new Response('Invalid url', { status: 400 })
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return new Response('Unsupported protocol', { status: 400 })
    }

    // Restrict to known hosts
    if (!ALLOWED_IMAGE_HOSTS.has(target.hostname)) {
      return new Response('Host not allowed', { status: 403 })
    }

    const resp = await fetch(target.toString(), {
      redirect: 'follow',
      headers: {
        // Mimic a browser UA to avoid some CDNs rejecting
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://'+req.nextUrl.host,
      },
    })

    if (!resp.ok) {
      return new Response('Upstream error', { status: resp.status })
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
  } catch {
    return new Response('Proxy error', { status: 500 })
  }
}


