'use client'

import React, { memo, useState } from 'react'
import Image from 'next/image'
import { Post } from '@/types/post'
import { Badge } from '@/components/ui/badge'
import { cn, formatNumber } from '@/lib/utils'
import {
  TrendingUp,
  MessageCircle,
  Calendar,
  User,
  Play,
  FileText
} from 'lucide-react'

interface StandardPostCardProps {
  post: Post & { viralScore?: number }
  onPostClick?: (post: Post) => void
  className?: string
}

export const StandardPostCard = memo(function StandardPostCard({
  post,
  onPostClick,
  className = ''
}: StandardPostCardProps) {
  const [imageError, setImageError] = useState(false)
  const getContentTypeBadge = () => {
    // Use content_type field which exists in the data
    switch (post.content_type) {
      case 'image':
        return <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">Image</Badge>
      case 'video':
        return <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">Video</Badge>
      case 'text':
        return <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200">Text</Badge>
      case 'link':
        return <Badge variant="outline" className="text-xs bg-green-50 border-green-200">Link</Badge>
      default:
        // Fallback to checking other fields
        if (post.is_video) return <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">Video</Badge>
        if (post.is_self) return <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200">Text</Badge>
        return <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">Media</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  // Calculate engagement rate (comments to upvotes ratio)
  const engagementRate = post.score > 0 ? (post.num_comments / post.score * 100) : 0

  // Determine media type and URL
  const getMediaInfo = () => {
    // Check for GIFs (including .gif files)
    if (post.url && /\.gif$/i.test(post.url)) {
      return { url: post.url, type: 'gif' }
    }

    // Check for direct image URLs
    if (post.url && /\.(jpg|jpeg|png|webp)$/i.test(post.url)) {
      return { url: post.url, type: 'image' }
    }

    // Check for direct video files
    if (post.url && /\.(mp4|webm|gifv)$/i.test(post.url)) {
      // For .gifv, convert to .mp4 (imgur convention)
      const videoUrl = post.url.replace(/\.gifv$/i, '.mp4')
      return { url: videoUrl, type: 'video' }
    }

    // Check for external video platforms (use thumbnail)
    if (post.domain && (
      post.domain.includes('redgifs.com') ||
      post.domain.includes('gfycat.com') ||
      post.domain.includes('v3.redgifs.com')
    )) {
      // These need special handling - for now use thumbnail
      if (post.thumbnail && post.thumbnail.startsWith('http')) {
        return { url: post.thumbnail, type: 'external-video' }
      }
    }

    // Reddit hosted videos (use thumbnail)
    if (post.is_video || post.domain === 'v.redd.it') {
      if (post.thumbnail &&
          post.thumbnail !== 'self' &&
          post.thumbnail !== 'default' &&
          post.thumbnail !== 'spoiler' &&
          post.thumbnail !== 'nsfw' &&
          post.thumbnail.startsWith('http')) {
        return { url: post.thumbnail, type: 'reddit-video' }
      }
    }

    // Fallback to thumbnail if valid
    if (post.thumbnail &&
        post.thumbnail !== 'self' &&
        post.thumbnail !== 'default' &&
        post.thumbnail !== 'spoiler' &&
        post.thumbnail !== 'nsfw' &&
        post.thumbnail.startsWith('http')) {
      return { url: post.thumbnail, type: 'thumbnail' }
    }

    return { url: null, type: null }
  }

  const mediaInfo = getMediaInfo()
  const mediaUrl = mediaInfo.url
  const isVideo = mediaInfo.type === 'video' ||
                  mediaInfo.type === 'reddit-video' ||
                  mediaInfo.type === 'external-video'
  const isGif = mediaInfo.type === 'gif'
  const isNSFW = post.over_18 || post.sub_over18

  return (
    <div
      className={cn(
        "group relative bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200",
        "shadow-sm hover:shadow-md transition-all duration-200",
        "hover:border-pink-200 overflow-hidden",
        className
      )}
    >
      {/* Media Preview - 3:4 aspect ratio with cropping */}
      {(mediaUrl && !imageError) ? (
        <div
          className="relative w-full aspect-[3/4] bg-gray-100 cursor-pointer overflow-hidden group/media"
          onClick={() => {
            // Open Reddit link when image is clicked
            const redditUrl = `https://www.reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}/`
            window.open(redditUrl, '_blank')
            onPostClick?.(post)
          }}
        >
          {/* NSFW Badge - No blur */}
          {isNSFW && (
            <Badge variant="destructive" className="absolute top-2 right-2 text-xs z-30">
              NSFW
            </Badge>
          )}

          {/* Video overlay */}
          {isVideo && !isGif && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-black/60 rounded-full p-3">
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          )}

          {/* GIF badge */}
          {isGif && (
            <Badge variant="secondary" className="absolute top-2 left-2 text-xs z-30 bg-white/90">
              GIF
            </Badge>
          )}

          {/* For MP4/WebM videos, use video tag */}
          {mediaInfo.type === 'video' ? (
            <video
              src={mediaUrl}
              poster={post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' ? post.thumbnail : undefined}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={post.title}
              width={500}
              height={667}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
              unoptimized
              onError={() => {
                setImageError(true)
              }}
            />
          )}
        </div>
      ) : null}

      {/* Fallback for text posts, no media, or failed images - 3:4 aspect ratio */}
      {(!mediaUrl || imageError) && (
        <div
          className="w-full aspect-[3/4] bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => {
            const redditUrl = `https://www.reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}/`
            window.open(redditUrl, '_blank')
            onPostClick?.(post)
          }}
        >
          <FileText className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-xs text-gray-500">
            {imageError ? 'Image unavailable' : 'Text post'}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header with content type and subreddit */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getContentTypeBadge()}
              <span className="text-xs text-gray-500">
                r/{post.subreddit_name}
              </span>
            </div>
            {/* Post Title */}
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-pink-600 transition-colors">
              {post.title}
            </h3>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className={cn(
              "h-3.5 w-3.5",
              post.score > 1000 ? "text-pink-500" :
              post.score > 100 ? "text-pink-400" : "text-gray-400"
            )} />
            <span className={cn(
              "font-medium",
              post.score > 1000 ? "text-pink-600" :
              post.score > 100 ? "text-pink-500" : "text-gray-600"
            )}>
              {formatNumber(post.score)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-600">{formatNumber(post.num_comments)}</span>
          </div>

          {/* Engagement Rate */}
          <div className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium",
            engagementRate > 15 ? "bg-green-50 text-green-700" :
            engagementRate > 5 ? "bg-pink-50 text-pink-700" :
            "bg-gray-50 text-gray-600"
          )}>
            {engagementRate.toFixed(1)}% eng
          </div>
        </div>

        {/* Footer with author and date */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>u/{post.author_username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(post.created_utc)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})