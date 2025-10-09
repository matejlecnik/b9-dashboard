'use client'

import React, { memo, useState } from 'react'
import Image from 'next/image'
import { Post } from '@/types/post'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
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

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        "backdrop-blur-xl backdrop-saturate-150",
        "hover:scale-[1.01]",
        className
      )}
      style={{
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        border: '1px solid var(--slate-400-alpha-60)',
        boxShadow: '0 20px 50px var(--black-alpha-12)'
      }}
    >
      {/* Media Preview - 3:4 aspect ratio with cropping */}
      {(mediaUrl && !imageError) ? (
        <div
          className={cn("relative w-full aspect-[3/4] cursor-pointer overflow-hidden group/media", designSystem.background.surface.light)}
          onClick={() => {
            // Open Reddit link when image is clicked
            const redditUrl = `https://www.reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}/`
            window.open(redditUrl, '_blank')
            onPostClick?.(post)
          }}
        >
          {/* Video overlay */}
          {isVideo && !isGif && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className={`bg-black/60 ${designSystem.borders.radius.full} p-3`}>
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
          className="relative w-full aspect-[3/4] flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--gray-100-alpha-90) 0%, var(--slate-100-alpha-85) 100%)'
          }}
          onClick={() => {
            const redditUrl = `https://www.reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}/`
            window.open(redditUrl, '_blank')
            onPostClick?.(post)
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100/30 via-transparent to-slate-200/20 pointer-events-none" />
          <FileText className={cn("h-8 w-8 mb-2 relative z-10", designSystem.typography.color.disabled)} />
          <span className={cn("text-xs relative z-10", designSystem.typography.color.subtle)}>
            {imageError ? 'Image unavailable' : 'Text post'}
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header with subreddit - Fixed height */}
        <div className="flex items-start justify-between gap-2 h-[60px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 h-5">
              <span className={cn("text-xs font-medium", designSystem.typography.color.subtle)}>
                r/{post.subreddit_name}
              </span>
            </div>
            {/* Post Title - Exactly 2 lines, fixed height */}
            <h3 className={cn("font-medium text-sm line-clamp-2 h-10 group-hover:text-primary-hover transition-colors", designSystem.typography.color.primary)}>
              {post.title}
            </h3>
          </div>
        </div>

        {/* Metrics Row - Fixed height */}
        <div className="flex items-center gap-4 text-xs h-6">
          <div className="flex items-center gap-1">
            <TrendingUp className={cn(
              "h-3.5 w-3.5",
              post.score > 1000 ? "text-primary" :
              post.score > 100 ? "text-primary/80" : designSystem.typography.color.disabled
            )} />
            <span className={cn(
              "font-medium",
              post.score > 1000 ? "text-primary-hover" :
              post.score > 100 ? "text-primary" : designSystem.typography.color.tertiary
            )}>
              {formatNumber(post.score)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <MessageCircle className={cn("h-3.5 w-3.5", designSystem.typography.color.disabled)} />
            <span className={cn(designSystem.typography.color.tertiary)}>{formatNumber(post.num_comments)}</span>
          </div>
        </div>

        {/* Footer with author and date - Fixed height */}
        <div className={cn("flex items-center justify-between text-xs h-5", designSystem.typography.color.subtle)}>
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