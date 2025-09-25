/**
 * CDN Configuration
 * Supports multiple CDN providers for image optimization
 */

export type CDNProvider = 'vercel' | 'cloudflare' | 'cloudinary' | 'imgix' | 'none'

interface CDNConfig {
  provider: CDNProvider
  baseUrl: string
  apiKey?: string
  options?: Record<string, unknown>
}

export type CDNImageOptions = {
  width?: number
  height?: number
  quality?: number
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

/**
 * Get CDN configuration from environment
 */
export function getCDNConfig(): CDNConfig {
  // Check which CDN is configured
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL) {
    return {
      provider: 'cloudflare',
      baseUrl: process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL as string,
      options: {
        accountId: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
      }
    }
  }

  if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    return {
      provider: 'cloudinary',
      baseUrl: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}`,
      options: {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      }
    }
  }

  if (process.env.NEXT_PUBLIC_IMGIX_DOMAIN) {
    return {
      provider: 'imgix',
      baseUrl: `https://${process.env.NEXT_PUBLIC_IMGIX_DOMAIN}`,
      options: {
        domain: process.env.NEXT_PUBLIC_IMGIX_DOMAIN
      }
    }
  }

  // Default to Vercel/Next.js optimization
  return {
    provider: 'vercel',
    baseUrl: '',
    options: {}
  }
}

/**
 * Generate optimized image URL based on CDN provider
 */
export function generateCDNUrl(
  src: string,
  options: CDNImageOptions = {}
): string {
  const config = getCDNConfig()

  switch (config.provider) {
    case 'cloudflare':
      return generateCloudflareUrl(config.baseUrl, src, options)
    
    case 'cloudinary':
      return generateCloudinaryUrl(config.baseUrl, src, options)
    
    case 'imgix':
      return generateImgixUrl(config.baseUrl, src, options)
    
    case 'vercel':
    case 'none':
    default:
      // Use Next.js Image Optimization API
      return src
  }
}

/**
 * Cloudflare Images URL generation
 */
function generateCloudflareUrl(
  baseUrl: string,
  src: string,
  options: CDNImageOptions
): string {
  const params: string[] = []
  
  if (options.width && options.height) {
    params.push(`w=${options.width}`, `h=${options.height}`)
  } else if (options.width) {
    params.push(`w=${options.width}`)
  } else if (options.height) {
    params.push(`h=${options.height}`)
  }
  
  if (options.quality) {
    params.push(`q=${options.quality}`)
  }
  
  if (options.format && options.format !== 'auto') {
    params.push(`f=${options.format}`)
  }
  
  if (options.fit) {
    params.push(`fit=${options.fit}`)
  }

  // Cloudflare Images format: /cdn-cgi/image/{options}/{source-image}
  const optionsString = params.join(',')
  return `${baseUrl}/cdn-cgi/image/${optionsString}/${encodeURIComponent(src)}`
}

/**
 * Cloudinary URL generation
 */
function generateCloudinaryUrl(
  baseUrl: string,
  src: string,
  options: CDNImageOptions
): string {
  const transformations: string[] = []
  
  if (options.width) {
    transformations.push(`w_${options.width}`)
  }
  
  if (options.height) {
    transformations.push(`h_${options.height}`)
  }
  
  if (options.quality) {
    transformations.push(`q_${options.quality}`)
  }
  
  if (options.format && options.format !== 'auto') {
    transformations.push(`f_${options.format}`)
  }
  
  if (options.fit) {
    const fitMap: Record<NonNullable<CDNImageOptions['fit']>, string> = {
      'cover': 'c_fill',
      'contain': 'c_fit',
      'fill': 'c_scale',
      'inside': 'c_limit',
      'outside': 'c_lfill'
    }
    transformations.push(fitMap[options.fit] || 'c_fill')
  }

  // Add auto format and quality if not specified
  if (!options.format) {
    transformations.push('f_auto')
  }
  if (!options.quality) {
    transformations.push('q_auto')
  }

  // Cloudinary format: /image/upload/{transformations}/{public-id}
  const transformString = transformations.join(',')
  return `${baseUrl}/image/upload/${transformString}/${encodeURIComponent(src)}`
}

/**
 * Imgix URL generation
 */
function generateImgixUrl(
  baseUrl: string,
  src: string,
  options: CDNImageOptions
): string {
  const params = new URLSearchParams()
  
  if (options.width) {
    params.set('w', options.width.toString())
  }
  
  if (options.height) {
    params.set('h', options.height.toString())
  }
  
  if (options.quality) {
    params.set('q', options.quality.toString())
  }
  
  if (options.format && options.format !== 'auto') {
    params.set('fm', options.format)
  } else {
    params.set('auto', 'format')
  }
  
  if (options.fit) {
    const fitMap: Record<NonNullable<CDNImageOptions['fit']>, string> = {
      'cover': 'crop',
      'contain': 'fit',
      'fill': 'fill',
      'inside': 'max',
      'outside': 'min'
    }
    params.set('fit', fitMap[options.fit] || 'crop')
  }

  // Add automatic enhancements
  params.set('auto', 'compress,format')
  
  return `${baseUrl}/${encodeURIComponent(src)}?${params.toString()}`
}

/**
 * Helper to check if CDN is configured
 */
export function isCDNConfigured(): boolean {
  const config = getCDNConfig()
  return config.provider !== 'none' && config.provider !== 'vercel'
}

/**
 * Get CDN capabilities
 */
export function getCDNCapabilities() {
  const config = getCDNConfig()
  
  const capabilities = {
    provider: config.provider,
    supportsWebP: true,
    supportsAVIF: false,
    supportsProgressive: true,
    supportsLazyLoad: true,
    supportsBlurPlaceholder: true,
    supportsAutoFormat: true,
    supportsAutoQuality: true,
    maxWidth: 4096,
    maxHeight: 4096
  }

  switch (config.provider) {
    case 'cloudflare':
      capabilities.supportsAVIF = true
      capabilities.maxWidth = 9999
      capabilities.maxHeight = 9999
      break
    
    case 'cloudinary':
      capabilities.supportsAVIF = true
      capabilities.maxWidth = 10000
      capabilities.maxHeight = 10000
      break
    
    case 'imgix':
      capabilities.supportsAVIF = true
      capabilities.maxWidth = 8192
      capabilities.maxHeight = 8192
      break
    
    case 'vercel':
      capabilities.supportsAVIF = true
      capabilities.maxWidth = 4096
      capabilities.maxHeight = 4096
      break
  }

  return capabilities
}

/**
 * Preconnect to CDN for better performance
 */
export function preconnectCDN() {
  const config = getCDNConfig()
  if (config.baseUrl && typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = config.baseUrl
    document.head.appendChild(link)
  }
}