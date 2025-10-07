'use client'


/**
 * Optimized Image Component
 * Implements lazy loading, blur placeholders, and progressive loading
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { logger } from '@/lib/logger'
import Image from 'next/image'


interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  fallback?: string
  onLoad?: () => void
  onError?: () => void
  className?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  lazy?: boolean
  threshold?: number
  rootMargin?: string
}

/**
 * Optimized Image with Next.js Image component
 * Uses native Next.js optimization when possible
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fallback = '/images/placeholder.png',
  onLoad,
  onError,
  className,
  objectFit = 'cover',
  lazy = true,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
    // performanceMonitor.mark(`image-loaded-${src}`)
  }

  const handleError = () => {
    setError(true)
    onError?.()
    logger.warn(`Failed to load image: ${src}`)
  }

  // Use fallback if error
  const imageSrc = error ? fallback : src

  // For Next.js optimizable images (remote or local)
  if (width && height) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          onLoad={handleLoad}
          onError={handleError}
          style={{ objectFit }}
          {...props}
        />
        {!loaded && !error && (
          <div className={cn("absolute inset-0 animate-pulse", designSystem.background.surface.neutral)} />
        )}
      </div>
    )
  }

  // Fallback to LazyImage for dynamic sizing
  return (
    <LazyImage
      src={imageSrc}
      alt={alt}
      fallback={fallback}
      onLoad={handleLoad}
      onError={handleError}
      className={className}
      lazy={lazy}
      {...props}
    />
  )
}

/**
 * Lazy Loading Image Component
 * Uses Intersection Observer for lazy loading
 */
interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  lazy?: boolean
  threshold?: number
  rootMargin?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(lazy ? '' : src)
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  const [, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src)
      return
    }

    if (!imageRef) return

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load the image
            setImageSrc(src)
            // Stop observing
            if (observerRef.current) {
              observerRef.current.disconnect()
            }
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    // Start observing
    observerRef.current.observe(imageRef)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [imageRef, src, lazy, threshold, rootMargin])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
    // performanceMonitor.mark(`lazy-image-loaded-${src}`)
  }

  const handleError = () => {
    setError(true)
    setImageSrc(fallback)
    onError?.()
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded && (
        <div className={cn("absolute inset-0 animate-pulse", designSystem.background.surface.neutral)} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          designSystem.animation.transition.default,
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  )
}

/**
 * Progressive Image Component
 * Loads a low-quality placeholder first, then the full image
 */
interface ProgressiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  placeholderSrc?: string
  alt: string
  className?: string
}

export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className,
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src)
  const [loading, setLoading] = useState(true)
  const [isLowQuality, setIsLowQuality] = useState(!!placeholderSrc)

  useEffect(() => {
    if (!placeholderSrc || currentSrc === src) return

    // Load full quality image
    const img = new window.Image()
    img.src = src
    
    img.onload = () => {
      setCurrentSrc(src)
      setIsLowQuality(false)
      setLoading(false)
      // performanceMonitor.mark(`progressive-image-loaded-${src}`)
    }

    img.onerror = () => {
      setLoading(false)
      logger.warn(`Failed to load progressive image: ${src}`)
    }
  }, [src, placeholderSrc, currentSrc])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          designSystem.animation.transition.slow,
          isLowQuality ? 'blur-sm scale-105' : 'blur-0 scale-100',
          className
        )}
        {...props}
      />
      {loading && (
        <div className={cn("absolute inset-0 animate-pulse", designSystem.background.surface.neutral)} />
      )}
    </div>
  )
}

/**
 * Avatar Image Component
 * Optimized for small profile images
 */
interface AvatarImageProps {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function AvatarImage({
  src,
  alt,
  size = 'md',
  fallback = '/images/default-avatar.png',
  className
}: AvatarImageProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80
  }

  const dimension = sizeMap[size]

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      fallback={fallback}
      className={cn(
        designSystem.borders.radius.full,
        size === 'sm' && 'w-8 h-8',
        size === 'md' && 'w-10 h-10',
        size === 'lg' && 'w-14 h-14',
        size === 'xl' && 'w-20 h-20',
        className
      )}
      objectFit="cover"
    />
  )
}

/**
 * Subreddit Icon Component
 * Optimized specifically for subreddit icons
 */
interface SubredditIconProps {
  iconUrl?: string | null
  subredditName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onError?: () => void
}

export function SubredditIcon({
  iconUrl,
  subredditName,
  size = 'md',
  className,
  onError
}: SubredditIconProps) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48
  }

  const dimension = sizeMap[size]
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(subredditName)}&size=${dimension}&background=random`

  return (
    <OptimizedImage
      src={iconUrl || fallback}
      alt={`r/${subredditName} icon`}
      width={dimension}
      height={dimension}
      fallback={fallback}
      className={cn(
        designSystem.borders.radius.full,
        'border border-default',
        size === 'sm' && 'w-6 h-6',
        size === 'md' && 'w-8 h-8',
        size === 'lg' && 'w-12 h-12',
        className
      )}
      onError={onError}
      objectFit="cover"
      quality={60} // Lower quality for icons
    />
  )
}

/**
 * Generate blur data URL for placeholder
 * Creates a tiny base64 encoded blurred version
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateBlurDataURL(src: string): Promise<string> {
  // This would typically be done server-side during build
  // For now, return a generic blur placeholder
  // In production, you would use the src parameter to generate a real blur
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
}

/**
 * Preload images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.src = src
    img.onload = () => resolve()
    img.onerror = reject
  })
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(url => preloadImage(url).catch(() => {
    logger.warn(`Failed to preload: ${url}`)
  }))
  await Promise.all(promises)
}