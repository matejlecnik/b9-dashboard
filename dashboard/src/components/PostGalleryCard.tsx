'use client'

import React, { useState, memo, useMemo } from 'react'
import NextImage from 'next/image'
import { sanitizeImageUrl, isAllowedImageHost, isGifUrl, toProxiedImageUrl } from '@/config/images'
import { 
  TrendingUp, 
  MessageCircle, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon,
  Play,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { AnimatedCard } from '@/components/ui/animated-card'

import { Post } from '@/types/post'

interface PostGalleryCardProps {
  post: Post
  onPostClick?: (post: Post) => void
}

// Beautiful animated placeholder component
function PlaceholderContent({ post, getContentIcon }: { post: Post; getContentIcon: () => React.ReactNode }) {
  const getSubredditInitials = (name: string) => {
    const cleanName = name.replace(/^r\//, '')
    return cleanName.substring(0, 2).toUpperCase()
  }

  const getGradientColors = (subredditName: string) => {
    const colors = [
      ['from-pink-400', 'to-pink-600'],
      ['from-pink-400', 'to-pink-600'],
      ['from-gray-400', 'to-gray-700'],
      ['from-gray-500', 'to-gray-700'],
      ['from-pink-400', 'to-pink-600'],
      ['from-gray-300', 'to-gray-500'],
      ['from-pink-500', 'to-gray-900'],
      ['from-pink-300', 'to-pink-500'],
    ]
    
    let hash = 0
    for (let i = 0; i < subredditName.length; i++) {
      hash = subredditName.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colorIndex = Math.abs(hash) % colors.length
    return colors[colorIndex]
  }

  const [fromColor, toColor] = getGradientColors(post.subreddit_name)
  
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-12 translate-y-12 animate-pulse delay-1000" />
      </div>
      
      {/* Main content */}
      <div className="text-center relative z-10">
        <div className="mb-4 text-white/90">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <div className="text-2xl font-bold text-white">
              {getSubredditInitials(post.subreddit_name)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-white/80 text-sm">
          <span className="opacity-60">{getContentIcon()}</span>
          <span className="font-medium opacity-90">
            {post.content_type?.toUpperCase() || 'POST'}
          </span>
        </div>
        
        <div className="mt-2 text-white/60 text-xs">
          r/{post.subreddit_name}
        </div>
      </div>
    </div>
  )
}

function PostGalleryCard({ post, onPostClick }: PostGalleryCardProps) {
  const [imageError, setImageError] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Force all cards to 3:4 aspect ratio as requested
  const getAspectRatio = () => {
    return '3/4'
  }

  // Memoized time calculation to prevent unnecessary recalculations
  const timeAgo = useMemo(() => {
    const now = new Date()
    const postTime = new Date(post.created_utc)
    const diffMs = now.getTime() - postTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays}d`
    } else if (diffHours > 0) {
      return `${diffHours}h`
    } else {
      return 'now'
    }
  }, [post.created_utc])

  // Get the best image URL - prioritize full-size images over thumbnails
  const getImageUrl = () => {
    // Helper function to check if URL is an image
    const isImageUrl = (url: string) => {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
    }

    // First, try the main URL if it's an image (highest quality)
    if (post.url && isImageUrl(post.url) && !imageError) {
      return sanitizeImageUrl(post.url)
    }

    // Try preview_data for gallery images
    if (post.preview_data?.images?.[currentImageIndex]) {
      const image = post.preview_data.images[currentImageIndex]
      if (image.source?.url) {
        return sanitizeImageUrl(image.source.url)
      }
      if (image.resolutions && image.resolutions.length > 0) {
        // Get highest quality resolution available
        const highRes = image.resolutions[image.resolutions.length - 1]
        return sanitizeImageUrl(highRes.url)
      }
    }

    // Fallback to thumbnail (lower quality but better than nothing)
    if (post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && !imageError) {
      return sanitizeImageUrl(post.thumbnail)
    }

    return null
  }

  // Check if domain is a Reddit domain (safe for optimization)
  const isRedditDomain = (url: string) => {
    const redditDomains = [
      'b.thumbs.redditmedia.com',
      'a.thumbs.redditmedia.com', 
      'external-preview.redd.it',
      'preview.redd.it',
      'i.redd.it',
      'styles.redditmedia.com',
      'www.redditstatic.com'
    ]
    
    try {
      const hostname = new URL(url).hostname
      return redditDomains.includes(hostname)
    } catch {
      return false
    }
  }

  // Check if this is a GIF that should autoplay
  const isAutoplayGif = () => {
    if (!post.url) return false
    // Check for common GIF hosting services
    const gifDomains = ['i.imgur.com', 'gfycat.com', 'redgifs.com', 'giphy.com']
    const isGifDomain = gifDomains.some(domain => post.url?.includes(domain))
    const hasGifExtension = /\.gif$/i.test(post.url)
    return isGifDomain || hasGifExtension || post.url.includes('.gifv')
  }

  // Check if post has multiple images
  const hasMultipleImages = post.preview_data?.images && post.preview_data.images.length > 1
  const imageCount = post.preview_data?.images?.length || 1

  // Handle post click
  const handleClick = () => {
    if (onPostClick) {
      onPostClick(post)
    } else {
      window.open(`https://reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}`, '_blank')
    }
  }

  // Navigate gallery
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % imageCount)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount)
  }

  // Get content type icon
  const getContentIcon = () => {
    switch (post.content_type) {
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'text': return <FileText className="h-4 w-4" />
      case 'link': return <LinkIcon className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const imageUrl = getImageUrl()
  const isGif = isAutoplayGif()
  const aspectRatio = getAspectRatio()

  return (
    <AnimatedCard className="relative group overflow-hidden rounded-xl shadow-sm hover:shadow-xl hover:shadow-pink-500/20 transition-all duration-500 bg-white transform hover:scale-[1.02] hover:-translate-y-1">
      {/* Quick Action Buttons - Show on Hover */}
      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <div className="flex flex-col gap-2">
          {/* Open in Reddit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`https://reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}`, '_blank')
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
            title="Open in Reddit"
          >
            <LinkIcon className="h-4 w-4 text-gray-700" />
          </button>
          
          {/* Copy Link Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(`https://reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}`)
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
            title="Copy Link"
          >
            <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Engagement Indicators - Show on Hover */}
      <div className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
        <div className="flex items-center gap-1">
          {/* Hot Post Indicator */}
          {post.score > 1000 && (
            <div className="px-2 py-1 bg-gray-900/90 backdrop-blur-sm rounded-full text-white text-xs font-bold flex items-center gap-1">
              🔥 Hot
            </div>
          )}
          
          {/* High Engagement Indicator */}
          {post.num_comments > 100 && (
            <div className="px-2 py-1 bg-gray-600/90 backdrop-blur-sm rounded-full text-white text-xs font-bold flex items-center gap-1">
              💬 Active
            </div>
          )}
          
          {/* NSFW Indicator */}
          {post.over_18 && (
            <div className="px-2 py-1 bg-gray-600/90 backdrop-blur-sm rounded-full text-white text-xs font-bold">
              18+
            </div>
          )}
        </div>
      </div>

      {/* Media Container */}
      <div 
        className="relative overflow-hidden rounded-t-xl cursor-pointer group-hover:rounded-t-lg transition-all duration-300"
        style={{ aspectRatio }}
        onClick={(e) => {
          // Only handle click if not clicking on navigation buttons
          const target = e.target as HTMLElement
          if (!target.closest('button')) {
            handleClick()
          }
        }}
      >
        {/* Main Content */}
        {imageUrl ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            {(() => {
              const url = imageUrl
              const allowNextImage = !!url && isAllowedImageHost(url) && !isGifUrl(url)
              const shouldOptimize = url && isRedditDomain(url) && !isGifUrl(url)
              
              if (allowNextImage) {
                return (
                  <NextImage 
                    src={url}
                    alt={post.title}
                    fill
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 25vw"
                    quality={shouldOptimize ? 85 : 75}
                    priority={false}
                    unoptimized={!shouldOptimize}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyOiKOhW5gO3I3KOSIg/9k="
                  />
                )
              }
              return (
                <NextImage
                  src={url ? (isAllowedImageHost(url) ? url : toProxiedImageUrl(url)) : ''}
                  alt={post.title}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 25vw"
                  quality={75}
                  priority={false}
                  unoptimized
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              )
            })()}
          </div>
        ) : (
          <PlaceholderContent post={post} getContentIcon={getContentIcon} />
        )}

        {/* Gallery Navigation */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
            
            {/* Image counter */}
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">
                {currentImageIndex + 1}/{imageCount}
              </span>
            </div>
          </>
        )}

        {/* Video/GIF Overlay Indicator */}
        {(post.is_video || post.content_type === 'video') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-3 transition-all duration-300 group-hover:scale-110">
              <Play className="h-6 w-6 text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* GIF Badge */}
        {isGif && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-xs font-bold">GIF</span>
          </div>
        )}
      </div>

      {/* Post Info Section - Enhanced with hover animations */}
      <div 
        className="h-32 bg-gradient-to-b from-white/70 to-gray-100/70 group-hover:from-white/80 group-hover:to-gray-50/80 backdrop-blur-md p-3 rounded-b-xl border-t border-white/20 group-hover:border-pink-200/30 transition-all duration-300 cursor-pointer"
        onClick={handleClick}
        style={{
          backdropFilter: 'blur(10px) saturate(150%)',
          WebkitBackdropFilter: 'blur(10px) saturate(150%)',
        }}
      >
        {/* Subreddit and Age */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 group-hover:text-pink-600 transition-colors duration-200">r/{post.subreddit_name}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600 flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
          
          {/* Category Badge */}
          {post.category_text && (
            <div className="px-2 py-0.5 bg-pink-100/80 text-pink-700 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              {post.category_text}
            </div>
          )}
        </div>

        {/* Engagement Stats with Enhanced Display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs group-hover:scale-105 transition-transform duration-200">
              <TrendingUp className="h-3 w-3 text-gray-600 group-hover:text-gray-700" />
              <span className="font-semibold text-gray-800">{post.score.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center gap-1 text-xs group-hover:scale-105 transition-transform duration-200">
              <MessageCircle className="h-3 w-3 text-gray-600 group-hover:text-gray-700" />
              <span className="font-semibold text-gray-800">{post.num_comments.toLocaleString('en-US')}</span>
            </div>
          </div>
          
          {/* Engagement Ratio */}
          {post.upvote_ratio && (
            <div className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {Math.round((post.upvote_ratio || 0) * 100)}% upvoted
            </div>
          )}
        </div>

        {/* Post Title with Hover Expansion */}
        <div className="text-xs font-medium text-gray-900 leading-tight group-hover:text-gray-800 transition-colors duration-200">
          <div className="line-clamp-2 group-hover:line-clamp-3 transition-all duration-300">
            {post.title}
          </div>
        </div>

        {/* Author Info - Enhanced Floating Effect */}
        {post.author_username && post.author_username !== 'deleted' && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 rotate-1 group-hover:translate-y-0 group-hover:rotate-0">
            <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 rounded-full bg-gradient-to-r from-white/60 to-gray-50/60 backdrop-blur-sm border border-white/20">
              <span>by</span>
              <span className="font-medium text-gray-700 group-hover:text-pink-600 transition-colors duration-300">u/{post.author_username}</span>
            </div>
          </div>
        )}
      </div>
    </AnimatedCard>
  )
}

// Export memoized component with custom comparison
const MemoizedPostGalleryCard = memo(PostGalleryCard, (prevProps, nextProps) => {
  // Only re-render if post ID changes or onPostClick changes
  return prevProps.post.id === nextProps.post.id && 
         prevProps.onPostClick === nextProps.onPostClick
})

MemoizedPostGalleryCard.displayName = 'PostGalleryCard'

export { MemoizedPostGalleryCard as PostGalleryCard }