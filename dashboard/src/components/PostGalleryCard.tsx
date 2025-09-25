'use client'

import { useState, useMemo, memo } from 'react'
import Image from 'next/image'
import { Post } from '@/types/post'
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


interface PostGalleryCardProps {
  post: Post
  onPostClick?: (post: Post) => void
}

// Beautiful animated placeholder component
function PostPlaceholderContent({ post, getContentIcon }: { post: Post; getContentIcon: () => React.ReactNode }) {
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

  // Format numbers for better display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
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

  // Get the best image URL - prioritize based on content type
  const getImageUrl = () => {
    // Helper function to check if URL is an image
    const isImageUrl = (url: string) => {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
    }

    // Helper to check if thumbnail is valid
    const isValidThumbnail = (thumb: string | null | undefined) => {
      if (!thumb) return false
      const invalidValues = ['self', 'default', 'nsfw', 'spoiler', 'image', '']
      return !invalidValues.includes(thumb)
    }

    // For videos, prioritize thumbnail for preview
    if (post.is_video || post.content_type === 'video') {
      // Try thumbnail first for videos
      if (isValidThumbnail(post.thumbnail) && !imageError) {
        return sanitizeImageUrl(post.thumbnail)
      }

      // Try preview_data as fallback
      if (post.preview_data?.images?.[0]) {
        const image = post.preview_data.images[0]
        if (image.source?.url) {
          return sanitizeImageUrl(image.source.url)
        }
        if (image.resolutions && image.resolutions.length > 0) {
          const highRes = image.resolutions[image.resolutions.length - 1]
          return sanitizeImageUrl(highRes.url)
        }
      }

      // No thumbnail available for video
      return null
    }

    // For regular images (non-video content)
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
    if (isValidThumbnail(post.thumbnail) && !imageError) {
      return sanitizeImageUrl(post.thumbnail)
    }

    return null
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
    <div className="relative group overflow-hidden rounded-xl shadow-sm hover:shadow-xl hover:shadow-gray-400/20 transition-all duration-500 bg-gradient-to-br from-gray-100/50 via-gray-50/40 to-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/40 transform hover:scale-[1.02] hover:-translate-y-1">
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
        className="relative overflow-hidden cursor-pointer"
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

              if (allowNextImage) {
                return (
                  <Image
                    src={url}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    quality={75}
                    loading="lazy"
                    onError={() => setImageError(true)}
                  />
                )
              }
              return (
                <Image
                  src={url ? (isAllowedImageHost(url) ? url : toProxiedImageUrl(url)) : ''}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  quality={75}
                  loading="lazy"
                  unoptimized={!isAllowedImageHost(url || '')}
                  onError={() => setImageError(true)}
                />
              )
            })()}
          </div>
        ) : (
          <PostPlaceholderContent post={post} getContentIcon={getContentIcon} />
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

      {/* Post Info Section - Glassmorphism */}
      <div
        className="h-28 bg-gradient-to-b from-gray-50/40 to-gray-100/50 backdrop-blur-xl p-2 border-t border-gray-200/20 transition-all duration-300 cursor-pointer flex flex-col"
        onClick={handleClick}
      >
        {/* Post Title - First */}
        <div className="text-sm font-medium text-gray-900 leading-snug mb-1.5">
          <div className="line-clamp-2">
            {post.title}
          </div>
        </div>

        {/* Subreddit */}
        <div className="flex items-center gap-1.5 text-xs mb-1.5">
          <span className="font-semibold text-gray-800 group-hover:text-pink-600 transition-colors">r/{post.subreddit_name}</span>
        </div>

        {/* Engagement Stats with Age */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-semibold text-gray-700">{formatNumber(post.score)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-semibold text-gray-700">{formatNumber(post.num_comments)}</span>
          </div>
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5 ml-auto" suppressHydrationWarning>
            <Calendar className="h-2.5 w-2.5" />
            {timeAgo}
          </span>
        </div>

        {/* Author Info - Always at bottom */}
        <div className="text-[10px] text-gray-500 mt-auto">
          {post.author_username && post.author_username !== 'deleted' ? (
            <>by <span className="font-medium text-gray-600 group-hover:text-pink-600 transition-colors">u/{post.author_username}</span></>
          ) : (
            <span className="invisible">placeholder</span>
          )}
        </div>
      </div>
    </div>
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