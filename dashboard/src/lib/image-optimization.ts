import { useCallback, useEffect, useRef, useState } from 'react'
import { getCDNConfig, generateCDNUrl } from '@/lib/cdn-config'
import { logger } from '@/lib/logger'
/**

 * Image Optimization Utilities
 * Configuration and helpers for optimized image loading
 */


/**
 * Image optimization configuration
 */
export const IMAGE_CONFIG = {
  // Quality settings
  quality: {
    thumbnail: 40,
    icon: 60,
    standard: 75,
    high: 90
  },

  // Size breakpoints
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  },

  // Lazy loading settings
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1
  },

  // Image CDN configuration (if using external CDN)
  cdn: {
    enabled: false,
    baseUrl: process.env.NEXT_PUBLIC_IMAGE_CDN_URL || '',
    transforms: {
      resize: 'rs',
      quality: 'q',
      format: 'f'
    }
  },

  // Supported formats
  formats: ['webp', 'avif', 'jpeg', 'png'] as const,

  // Placeholder settings
  placeholder: {
    blur: true,
    color: '#f3f4f6' // gray-100
  }
}

/**
 * Image size presets
 */
export const IMAGE_SIZES = {
  avatar: {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 56, height: 56 },
    xl: { width: 80, height: 80 }
  },
  icon: {
    xs: { width: 16, height: 16 },
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 }
  },
  thumbnail: {
    sm: { width: 80, height: 80 },
    md: { width: 120, height: 120 },
    lg: { width: 200, height: 200 }
  },
  cover: {
    sm: { width: 320, height: 180 },
    md: { width: 640, height: 360 },
    lg: { width: 1280, height: 720 }
  }
} as const

/**
 * Generate optimized image URL
 */
export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png'
  } = {}
): string {
  // Use CDN configuration to generate optimized URL
  const cdnConfig = getCDNConfig()

  // If we have a CDN configured, use it
  if (cdnConfig.provider !== 'none') {
    return generateCDNUrl(src, {
      width: options.width,
      height: options.height,
      quality: options.quality || IMAGE_CONFIG.quality.standard,
      format: options.format || 'auto',
      fit: 'cover'
    })
  }

  // Fallback to original URL
  return src
}

/**
 * Generate srcSet for responsive images
 */
export function generateSrcSet(
  src: string,
  sizes: number[],
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
): string {
  return sizes
    .map(size => {
      const url = getOptimizedImageUrl(src, { width: size, format })
      return `${url} ${size}w`
    })
    .join(', ')
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(): string {
  const { breakpoints } = IMAGE_CONFIG
  return `
    (max-width: ${breakpoints.mobile}px) 100vw,
    (max-width: ${breakpoints.tablet}px) 80vw,
    (max-width: ${breakpoints.desktop}px) 60vw,
    50vw
  `.trim()
}

/**
 * Check if image format is supported
 */
export function isFormatSupported(format: string): boolean {
  if (typeof window === 'undefined') return true

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  
  const formats: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif'
  }

  const mimeType = formats[format]
  if (!mimeType) return true // Assume supported if unknown

  return canvas.toDataURL(mimeType).indexOf(mimeType) > -1
}

/**
 * Get best supported format
 */
export function getBestFormat(): 'webp' | 'avif' | 'jpeg' | 'png' {
  if (isFormatSupported('avif')) return 'avif'
  if (isFormatSupported('webp')) return 'webp'
  return 'jpeg'
}

/**
 * Create a low-quality image placeholder (LQIP)
 */
export function createLQIP(src: string, width = 20, height = 20): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve('') // Return empty string on server
      return
    }

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Draw scaled down image
        ctx.filter = 'blur(2px)'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64
        const dataURL = canvas.toDataURL('image/jpeg', 0.3)
        resolve(dataURL)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = reject
    img.src = src
  })
}

/**
 * Image loading priority manager
 */
class ImagePriorityManager {
  private queue: Map<string, () => Promise<void>> = new Map()
  private loading = new Set<string>()
  private maxConcurrent = 3

  async load(src: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    // If already loading or loaded, skip
    if (this.loading.has(src)) {
      return
    }

    // Add to queue based on priority
    const loadFn = () => this.loadImage(src)

    if (priority === 'high') {
      // Load immediately for high priority
      return this.loadImage(src)
    }

    // Queue for loading
    this.queue.set(src, loadFn)
    this.processQueue()
  }

  private async loadImage(src: string): Promise<void> {
    this.loading.add(src)
    
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => resolve()
        img.onerror = reject
        img.src = src
      })
      
    } finally {
      this.loading.delete(src)
      this.queue.delete(src)
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.loading.size >= this.maxConcurrent) {
      return
    }

    const next = this.queue.entries().next().value
    if (!next) return

    const [src, loadFn] = next
    this.queue.delete(src)
    await loadFn()
  }
}

export const imagePriorityManager = new ImagePriorityManager()

/**
 * React hook for image optimization
 */

interface UseOptimizedImageOptions {
  src: string
  lazy?: boolean
  priority?: 'high' | 'normal' | 'low'
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function useOptimizedImage({
  src,
  lazy = true,
  priority = 'normal',
  placeholder,
  onLoad,
  onError
}: UseOptimizedImageOptions) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  const loadImage = useCallback(async () => {
    setLoading(true)
    
    try {
      await imagePriorityManager.load(src, priority)
      setImageSrc(src)
      setLoading(false)
      onLoad?.()
    } catch {
      setError(true)
      setLoading(false)
      onError?.()
    }
  }, [src, priority, onLoad, onError])

  useEffect(() => {
    if (!lazy) {
      // Load immediately
      loadImage()
      return
    }

    // Setup intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadImage()
          observer.disconnect()
        }
      },
      {
        rootMargin: IMAGE_CONFIG.lazyLoading.rootMargin,
        threshold: IMAGE_CONFIG.lazyLoading.threshold
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [src, lazy, loadImage])

  return {
    imageSrc,
    loading,
    error,
    elementRef
  }
}

/**
 * Image cache manager
 */
class ImageCacheManager {
  private cache = new Map<string, string>()
  private maxSize = 50 // Max number of cached images

  async getOrLoad(src: string): Promise<string> {
    // Check cache
    if (this.cache.has(src)) {
      return this.cache.get(src)!
    }

    // Load and cache
    try {
      const blob = await this.loadImageAsBlob(src)
      const objectURL = URL.createObjectURL(blob)
      
      // Add to cache with LRU eviction
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) {
          const oldURL = this.cache.get(firstKey)
          if (oldURL) URL.revokeObjectURL(oldURL)
          this.cache.delete(firstKey)
        }
      }
      
      this.cache.set(src, objectURL)
      return objectURL
    } catch (error) {
      logger.error('Failed to cache image:', error)
      return src
    }
  }

  private async loadImageAsBlob(src: string): Promise<Blob> {
    const response = await fetch(src)
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.status}`)
    }
    return response.blob()
  }

  clear() {
    // Revoke all object URLs
    this.cache.forEach(url => URL.revokeObjectURL(url))
    this.cache.clear()
  }
}

export const imageCacheManager = new ImageCacheManager()