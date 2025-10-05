/**
 * Utilities for image handling and validation
 */

const ALLOWED_IMAGE_HOSTS = [
  'instagram.com',
  'www.instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
  'fna.fbcdn.net', // For instagram.*.fna.fbcdn.net URLs
  'instagram.fbcdn.net',
  'scontent.cdninstagram.com',
  'i.imgur.com',
  'imgur.com',
  'cdn.discordapp.com',
  'pbs.twimg.com',
  'abs.twimg.com',
  'reddit.com',
  'www.reddit.com',
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'styles.redditmedia.com',
  'www.redditstatic.com',
  'b9.agency',
  'www.b9.agency',
  'localhost',
]

/**
 * Check if an image URL is from an allowed host
 */
export function isAllowedImageHost(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Allow any subdomain of allowed hosts
    return ALLOWED_IMAGE_HOSTS.some(allowed => {
      if (hostname === allowed) return true
      if (hostname.endsWith(`.${allowed}`)) return true
      return false
    })
  } catch {
    return false
  }
}

/**
 * Get optimized image URL parameters
 */
export function getOptimizedImageParams(width?: number, quality = 85): URLSearchParams {
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  params.set('q', quality.toString())
  params.set('auto', 'format')
  return params
}

/**
 * Check if URL is an image based on extension
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.ico']
  const parsed = new URL(url)
  const path = parsed.pathname.toLowerCase()
  return imageExtensions.some(ext => path.endsWith(ext))
}