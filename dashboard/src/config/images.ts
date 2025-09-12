'use client'

// Centralized image configuration and helpers

export const ALLOWED_IMAGE_HOSTS: Set<string> = new Set([
  'b.l3n.co',
  'b.thumbs.redditmedia.com',
  'a.thumbs.redditmedia.com',
  'c.thumbs.redditmedia.com',
  'd.thumbs.redditmedia.com',
  'external-preview.redd.it',
  'preview.redd.it',
  'i.redd.it',
  'styles.redditmedia.com',
  'www.redditstatic.com',
  'emoji.redditmedia.com',
  'thumbs.redditmedia.com',
  'imgur.com',
  'i.imgur.com',
  'm.imgur.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'gyazo.com',
  'i.gyazo.com',
  'postimg.cc',
  'i.postimg.cc',
  'imageupload.io',
  'ibb.co',
  'i.ibb.co',
])

export function sanitizeImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null
  try {
    let url = String(rawUrl).trim()
    // Decode common HTML entities
    url = url.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
    // Ensure protocol
    if (url.startsWith('//')) url = `https:${url}`
    if (!/^https?:\/\//i.test(url)) return null
    // Basic tracker stripping for known patterns
    try {
      const u = new URL(url)
      // Optional: strip utm params
      ;['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => u.searchParams.delete(k))
      // Reddit preview sometimes includes width/height/auto=s params; keep if image host is redd.it but cap width
      if (/\.redd\.it$/.test(u.hostname)) {
        const width = Number(u.searchParams.get('width') || '0')
        if (width > 2000) u.searchParams.set('width', '2000')
      }
      return u.toString()
    } catch {
      return url
    }
  } catch {
    return null
  }
}

export function isAllowedImageHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_IMAGE_HOSTS.has(hostname)
  } catch {
    return false
  }
}

export function isGifUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return pathname.endsWith('.gif')
  } catch {
    return /\.gif($|\?)/i.test(url)
  }
}

// Build a proxied URL through our API route (prevents mixed content / referrer issues)
export function toProxiedImageUrl(url: string | null | undefined): string {
  const safe = url ? String(url) : ''
  return `/api/img?url=${encodeURIComponent(safe)}`
}


