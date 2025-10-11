'use client'

import React, { memo, useState } from 'react'
import Image from 'next/image'
import { InstagramReel } from '@/hooks/queries/useInstagramReels'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/formatters'
import { designSystem } from '@/lib/design-system'
import {
  Eye,
  Heart,
  MessageCircle,
  Clock,
  Calendar,
  Play
} from 'lucide-react'

interface StandardReelCardProps {
  reel: InstagramReel
  onReelClick?: (reel: InstagramReel) => void
  className?: string
}

export const StandardReelCard = memo(function StandardReelCard({
  reel,
  onReelClick: _onReelClick,
  className = ''
}: StandardReelCardProps) {
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Determine engagement color
  const getEngagementColor = (rate?: number) => {
    if (!rate) return designSystem.typography.color.disabled
    if (rate >= 5) return 'text-green-600' // High engagement
    if (rate >= 2) return 'text-yellow-600' // Medium engagement
    return designSystem.typography.color.tertiary // Low engagement
  }

  // Get thumbnail URL (prefer cover_url, fallback to thumbnail_url)
  const thumbnailUrl = reel.cover_url || reel.thumbnail_url
  const videoUrl = reel.video_url

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
      {/* Video Player - 3:4 aspect ratio */}
      {videoUrl ? (
        <div className={cn("relative w-full aspect-[3/4] overflow-hidden", designSystem.background.surface.light)}>
          <video
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            poster={thumbnailUrl}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      ) : (thumbnailUrl && !imageError) ? (
        <div className={cn("relative w-full aspect-[3/4] overflow-hidden", designSystem.background.surface.light)}>
          <Image
            src={thumbnailUrl}
            alt={reel.caption_text || 'Instagram Reel'}
            width={400}
            height={533}
            className="w-full h-full object-cover"
            unoptimized
            onError={() => {
              setImageError(true)
            }}
          />
        </div>
      ) : (
        <div
          className="relative w-full aspect-[3/4] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--gray-100-alpha-90) 0%, var(--slate-100-alpha-85) 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100/30 via-transparent to-slate-200/20 pointer-events-none" />
          <Play className={cn("h-10 w-10 mb-2 relative z-10", designSystem.typography.color.disabled)} />
          <span className={cn("text-xs relative z-10", designSystem.typography.color.subtle)}>
            No video available
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header with creator - Fixed height */}
        <div className="flex items-start justify-between gap-2 h-[60px]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 h-5">
              <span className={cn("text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent")}>
                @{reel.creator_username || 'unknown'}
              </span>
              {reel.creator_niche && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-pink-50 text-pink-700 border-pink-200">
                  {reel.creator_niche}
                </Badge>
              )}
            </div>
            {/* Caption - Exactly 2 lines, fixed height */}
            <p className={cn("text-sm line-clamp-2 h-10", designSystem.typography.color.secondary)}>
              {reel.caption_text || 'No caption'}
            </p>
          </div>
        </div>

        {/* Metrics Row - Fixed height */}
        <div className="flex items-center gap-3 text-xs h-6">
          <div className="flex items-center gap-1">
            <Eye className={cn("h-3.5 w-3.5",
              reel.play_count > 100000 ? "text-pink-600" :
              reel.play_count > 10000 ? "text-pink-500" : designSystem.typography.color.disabled
            )} />
            <span className={cn(
              "font-medium",
              reel.play_count > 100000 ? "text-pink-700" :
              reel.play_count > 10000 ? "text-pink-600" : designSystem.typography.color.tertiary
            )}>
              {formatNumber(reel.play_count)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Heart className={cn("h-3.5 w-3.5", designSystem.typography.color.disabled)} />
            <span className={cn(designSystem.typography.color.tertiary)}>{formatNumber(reel.like_count)}</span>
          </div>

          <div className="flex items-center gap-1">
            <MessageCircle className={cn("h-3.5 w-3.5", designSystem.typography.color.disabled)} />
            <span className={cn(designSystem.typography.color.tertiary)}>{formatNumber(reel.comment_count)}</span>
          </div>

          {reel.engagement_rate !== undefined && reel.engagement_rate !== null && (
            <div className="flex items-center gap-1 ml-auto">
              <span className={cn("font-semibold", getEngagementColor(reel.engagement_rate))}>
                {reel.engagement_rate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Footer with duration and date - Fixed height */}
        <div className={cn("flex items-center justify-between text-xs h-5", designSystem.typography.color.subtle)}>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(reel.video_duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(reel.taken_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
